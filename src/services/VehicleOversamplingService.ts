import { vehicleStateManager, VehicleState } from "./VehicleStateManager";

/**
 * Service intermédiaire qui sur-échantillonne les données véhicule à 10Hz.
 * - Mesures: updates "réels" (GPS) via VehicleStateManager
 * - Entre deux mesures: prédiction (Kalman vitesse constante)
 * - À chaque mesure: correction + hard reset si divergence
 *
 * Convention: heading géographique (0°=Nord, 90°=Est), speed en m/s, acceleration en m/s²
 */
export class VehicleOversamplingService {
  private static instance: VehicleOversamplingService | null = null;

  private observers: Array<(state: VehicleState) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Config
  private readonly OUTPUT_HZ = 10;
  private readonly HARD_RESET_THRESHOLD_M = 20; // divergence -> reset
  private readonly MIN_HEADING_SPEED_MPS = 0.5; // en-dessous, heading peu fiable
  private readonly RECENTER_ORIGIN_THRESHOLD_M = 10000; // rebase l'origine pour limiter l'erreur de projection plane

  // Local projection origin
  private origin: [number, number] | null = null; // [lat, lon]
  private cosLat = 1;
  private readonly METERS_PER_DEGREE_LAT = 111000;

  // Kalman state: [x, y, vx, vy] where x=east(m), y=north(m)
  private x = [0, 0, 0, 0];
  private P = [
    [1000, 0, 0, 0],
    [0, 1000, 0, 0],
    [0, 0, 100, 0],
    [0, 0, 0, 100],
  ];

  // Noise parameters
  private readonly SIGMA_POS_M = 6; // measurement noise (m)
  private readonly SIGMA_ACCEL_MPS2 = 2.0; // process noise (m/s^2)

  private lastTickMs: number | null = null;
  private lastPublishedSpeed = 0;
  private lastPublishedSpeedMs: number | null = null;

  private constructor() {
    // Subscribe to raw vehicle updates (GPS/simulation)
    vehicleStateManager.addObserver((s) => this.onMeasurement(s));
    // Start 10Hz output loop
    this.intervalId = setInterval(() => this.tick(), 1000 / this.OUTPUT_HZ);
  }

  public static getInstance(): VehicleOversamplingService {
    if (!VehicleOversamplingService.instance) {
      VehicleOversamplingService.instance = new VehicleOversamplingService();
    }
    return VehicleOversamplingService.instance;
  }

  public addObserver(observer: (state: VehicleState) => void) {
    this.observers.push(observer);
  }

  public removeObserver(observer: (state: VehicleState) => void) {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  public getState(): VehicleState {
    // Reconstituer depuis état filtre
    const position = this.origin ? this.metersToGps(this.x[0], this.x[1]) : vehicleStateManager.getState().position;
    const speed = Math.sqrt(this.x[2] * this.x[2] + this.x[3] * this.x[3]);
    const heading = speed >= this.MIN_HEADING_SPEED_MPS ? this.velToHeading(this.x[2], this.x[3]) : vehicleStateManager.getState().heading;
    return {
      position,
      speed,
      acceleration: vehicleStateManager.getState().acceleration,
      heading,
    };
  }

  private notify(state: VehicleState) {
    this.observers.forEach((o) => o(state));
  }

  private setOriginIfNeeded(gps: [number, number]) {
    if (this.origin) return;
    this.origin = gps;
    this.cosLat = Math.cos((gps[0] * Math.PI) / 180);
  }

  private gpsToMeters(gps: [number, number]): { x: number; y: number } {
    if (!this.origin) this.setOriginIfNeeded(gps);
    const [lat0, lon0] = this.origin!;
    const x = (gps[1] - lon0) * this.METERS_PER_DEGREE_LAT * this.cosLat;
    const y = (gps[0] - lat0) * this.METERS_PER_DEGREE_LAT;
    return { x, y };
  }

  private metersToGps(x: number, y: number): [number, number] {
    if (!this.origin) return vehicleStateManager.getState().position;
    const [lat0, lon0] = this.origin;
    const lat = lat0 + y / this.METERS_PER_DEGREE_LAT;
    const lon = lon0 + x / (this.METERS_PER_DEGREE_LAT * this.cosLat);
    return [lat, lon];
  }

  private distanceFromOriginMeters(): number {
    const dx = this.x[0];
    const dy = this.x[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  private rebaseOriginToCurrent() {
    if (!this.origin) return;
    const currentGps = this.metersToGps(this.x[0], this.x[1]);
    // Rebase: new origin at current GPS, set position state to (0,0), keep velocity
    this.origin = currentGps;
    this.cosLat = Math.cos((currentGps[0] * Math.PI) / 180);
    this.x[0] = 0;
    this.x[1] = 0;
  }

  private velToHeading(vx: number, vy: number): number {
    // heading geo: 0=N (vy>0), 90=E (vx>0)
    let h = (Math.atan2(vx, vy) * 180) / Math.PI;
    h = (h + 360) % 360;
    return h;
  }

  private onMeasurement(meas: VehicleState) {
    // measurement in meters
    const now = Date.now();
    const { x: mx, y: my } = this.gpsToMeters(meas.position);

    // init filter if first fix
    if (this.lastTickMs === null) {
      this.x = [mx, my, 0, 0];
      this.lastTickMs = now;
      return;
    }

    // divergence check
    const dx = mx - this.x[0];
    const dy = my - this.x[1];
    const err = Math.sqrt(dx * dx + dy * dy);
    if (err > this.HARD_RESET_THRESHOLD_M) {
      this.x[0] = mx;
      this.x[1] = my;
      // keep velocity if speed is known and heading seems valid
      const speed = meas.speed;
      if (speed > this.MIN_HEADING_SPEED_MPS) {
        const rad = (meas.heading * Math.PI) / 180;
        // heading geo: vx=sin, vy=cos
        this.x[2] = Math.sin(rad) * speed;
        this.x[3] = Math.cos(rad) * speed;
      } else {
        this.x[2] = 0;
        this.x[3] = 0;
      }
      // reset covariance smaller on position, larger on velocity
      this.P = [
        [25, 0, 0, 0],
        [0, 25, 0, 0],
        [0, 0, 100, 0],
        [0, 0, 0, 100],
      ];
      return;
    }

    // Apply correction using a Kalman update at dt based on time since last tick
    const dt = Math.max(0.001, Math.min((now - this.lastTickMs) / 1000, 1));
    this.kalmanPredict(dt);
    this.kalmanUpdate(mx, my);
    this.lastTickMs = now;

    // keep origin bounded
    if (this.distanceFromOriginMeters() > this.RECENTER_ORIGIN_THRESHOLD_M) {
      this.rebaseOriginToCurrent();
    }
  }

  private kalmanPredict(dt: number) {
    // x = F x
    this.x = [
      this.x[0] + this.x[2] * dt,
      this.x[1] + this.x[3] * dt,
      this.x[2],
      this.x[3],
    ];

    // Q for constant acceleration model
    const sa2 = this.SIGMA_ACCEL_MPS2 * this.SIGMA_ACCEL_MPS2;
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const dt4 = dt2 * dt2;
    const q11 = (dt4 / 4) * sa2;
    const q13 = (dt3 / 2) * sa2;
    const q33 = dt2 * sa2;

    // P = F P F^T + Q
    const P = this.P;
    // Expand manually for F
    const P00 = P[0][0] + dt * (P[2][0] + P[0][2]) + dt2 * P[2][2] + q11;
    const P01 = P[0][1] + dt * (P[2][1] + P[0][3]) + dt2 * P[2][3];
    const P02 = P[0][2] + dt * P[2][2] + q13;
    const P03 = P[0][3] + dt * P[2][3];

    const P10 = P[1][0] + dt * (P[3][0] + P[1][2]) + dt2 * P[3][2];
    const P11 = P[1][1] + dt * (P[3][1] + P[1][3]) + dt2 * P[3][3] + q11;
    const P12 = P[1][2] + dt * P[3][2];
    const P13 = P[1][3] + dt * P[3][3] + q13;

    const P20 = P[2][0] + dt * P[2][2] + q13;
    const P21 = P[2][1] + dt * P[2][3];
    const P22 = P[2][2] + q33;
    const P23 = P[2][3];

    const P30 = P[3][0] + dt * P[3][2];
    const P31 = P[3][1] + dt * P[3][3] + q13;
    const P32 = P[3][2];
    const P33 = P[3][3] + q33;

    this.P = [
      [P00, P01, P02, P03],
      [P10, P11, P12, P13],
      [P20, P21, P22, P23],
      [P30, P31, P32, P33],
    ];
  }

  private kalmanUpdate(mx: number, my: number) {
    // H selects x,y -> z
    const R = this.SIGMA_POS_M * this.SIGMA_POS_M;
    const P = this.P;

    // innovation y = z - Hx
    const y0 = mx - this.x[0];
    const y1 = my - this.x[1];

    // S = HPH^T + R -> 2x2
    const S00 = P[0][0] + R;
    const S01 = P[0][1];
    const S10 = P[1][0];
    const S11 = P[1][1] + R;

    const det = S00 * S11 - S01 * S10;
    if (Math.abs(det) < 1e-9) return;
    const invS00 = S11 / det;
    const invS01 = -S01 / det;
    const invS10 = -S10 / det;
    const invS11 = S00 / det;

    // K = P H^T inv(S) -> 4x2
    const K00 = P[0][0] * invS00 + P[0][1] * invS10;
    const K01 = P[0][0] * invS01 + P[0][1] * invS11;
    const K10 = P[1][0] * invS00 + P[1][1] * invS10;
    const K11 = P[1][0] * invS01 + P[1][1] * invS11;
    const K20 = P[2][0] * invS00 + P[2][1] * invS10;
    const K21 = P[2][0] * invS01 + P[2][1] * invS11;
    const K30 = P[3][0] * invS00 + P[3][1] * invS10;
    const K31 = P[3][0] * invS01 + P[3][1] * invS11;

    // x = x + K y
    this.x[0] += K00 * y0 + K01 * y1;
    this.x[1] += K10 * y0 + K11 * y1;
    this.x[2] += K20 * y0 + K21 * y1;
    this.x[3] += K30 * y0 + K31 * y1;

    // P = (I - K H) P
    const I_KH = [
      [1 - K00, -K01, 0, 0],
      [-K10, 1 - K11, 0, 0],
      [-K20, -K21, 1, 0],
      [-K30, -K31, 0, 1],
    ];
    const newP: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        newP[r][c] =
          I_KH[r][0] * P[0][c] +
          I_KH[r][1] * P[1][c] +
          I_KH[r][2] * P[2][c] +
          I_KH[r][3] * P[3][c];
      }
    }
    this.P = newP as any;
  }

  private tick() {
    const now = Date.now();
    if (this.lastTickMs === null) {
      // Not initialized yet: forward raw state at low rate
      this.notify(vehicleStateManager.getState());
      return;
    }

    const dt = Math.max(0.001, Math.min((now - this.lastTickMs) / 1000, 0.5));
    this.kalmanPredict(dt);
    this.lastTickMs = now;

    if (this.origin && this.distanceFromOriginMeters() > this.RECENTER_ORIGIN_THRESHOLD_M) {
      this.rebaseOriginToCurrent();
    }

    const position = this.metersToGps(this.x[0], this.x[1]);
    const speed = Math.sqrt(this.x[2] * this.x[2] + this.x[3] * this.x[3]);
    const heading = speed >= this.MIN_HEADING_SPEED_MPS ? this.velToHeading(this.x[2], this.x[3]) : vehicleStateManager.getState().heading;

    // simple accel estimate from speed derivative (smoothed)
    let accel = vehicleStateManager.getState().acceleration;
    if (this.lastPublishedSpeedMs !== null) {
      const dts = Math.max(0.001, (now - this.lastPublishedSpeedMs) / 1000);
      const a = (speed - this.lastPublishedSpeed) / dts;
      accel = 0.6 * accel + 0.4 * a;
    }
    this.lastPublishedSpeed = speed;
    this.lastPublishedSpeedMs = now;

    this.notify({ position, speed, acceleration: accel, heading });
  }
}

export const vehicleOversamplingService = VehicleOversamplingService.getInstance();


