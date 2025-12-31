/**
 * Filtre de Kalman 1D pour lisser les trajectoires GPS
 * Gère les mises à jour GPS à 1Hz et fournit des positions interpolées à 60 FPS
 */
class KalmanFilter1D {
  // État : [position, vitesse]
  private x: number; // position
  private v: number; // vitesse
  
  // Matrice de covariance 2x2
  private P: number[][]; // [[P_xx, P_xv], [P_vx, P_vv]]
  
  // Paramètres du filtre
  private Q: number; // bruit du modèle (variance accélération)
  private R: number; // incertitude GPS en mètres²
  
  constructor(initialPosition: number, Q = 0.1, R = 5.0) {
    this.x = initialPosition;
    this.v = 0;
    this.P = [[10, 0], [0, 1]]; // Incertitude initiale
    this.Q = Q;
    this.R = R;
  }
  
  /**
   * Prédiction : avance l'état selon le modèle
   * @param dt Delta temps en secondes
   */
  predict(dt: number): number {
    // Prédiction de l'état
    const x_pred = this.x + this.v * dt;
    const v_pred = this.v;
    
    // Prédiction de la covariance
    // P_pred = F * P * F^T + Q
    const dt2 = dt * dt;
    const P_pred = [
      [this.P[0][0] + 2 * dt * this.P[0][1] + dt2 * this.P[1][1] + this.Q * dt2 / 2, 
       this.P[0][1] + dt * this.P[1][1]],
      [this.P[1][0] + dt * this.P[1][1], 
       this.P[1][1] + this.Q * dt2]
    ];
    
    this.x = x_pred;
    this.v = v_pred;
    this.P = P_pred;
    
    return this.x;
  }
  
  /**
   * Correction : met à jour l'état avec une mesure GPS
   * @param measurement Position GPS mesurée
   */
  update(measurement: number): void {
    // Innovation (différence mesure - prédiction)
    const innovation = measurement - this.x;
    
    // Variance de l'innovation
    const S = this.P[0][0] + this.R;
    
    // Gain de Kalman
    const K = [
      this.P[0][0] / S,  // K_x
      this.P[1][0] / S   // K_v
    ];
    
    // Mise à jour de l'état
    this.x = this.x + K[0] * innovation;
    this.v = this.v + K[1] * innovation;
    
    // Mise à jour de la covariance
    // P = (I - K*H) * P
    const K0 = K[0];
    const K1 = K[1];
    this.P = [
      [(1 - K0) * this.P[0][0], (1 - K0) * this.P[0][1]],
      [this.P[1][0] - K1 * this.P[0][0], this.P[1][1] - K1 * this.P[0][1]]
    ];
  }
  
  getPosition(): number {
    return this.x;
  }
  
  getVelocity(): number {
    return this.v;
  }
  
  setVelocity(v: number): void {
    this.v = v;
  }
}

/**
 * Tracker GPS avec lissage pour animation fluide
 * Combine filtre de Kalman 1D pour chaque axe (x, y, z)
 */
export class SmoothGPSTracker {
  // Filtres de Kalman pour chaque axe
  private kalman_x: KalmanFilter1D;
  private kalman_y: KalmanFilter1D;
  private kalman_z: KalmanFilter1D;
  
  // Dernière mesure GPS
  private lastGPSPos: [number, number, number] | null = null;
  private lastGPSTime: number = 0;
  
  // Mode de fonctionnement
  private useKalman: boolean;
  
  // Pour mode simple : correction progressive
  private correctionResidual: [number, number, number] = [0, 0, 0];
  private framesRemainingCorrection: number = 0;
  private simpleVelocity: [number, number, number] = [0, 0, 0];
  private simplePosition: [number, number, number] = [0, 0, 0];
  
  constructor(
    initialPosition: [number, number, number],
    useKalman = true,
    Q = 0.1,
    R = 5.0
  ) {
    this.useKalman = useKalman;
    
    if (useKalman) {
      this.kalman_x = new KalmanFilter1D(initialPosition[0], Q, R);
      this.kalman_y = new KalmanFilter1D(initialPosition[1], Q, R);
      this.kalman_z = new KalmanFilter1D(initialPosition[2], Q, R);
    } else {
      this.simplePosition = [...initialPosition];
    }
    
    this.lastGPSPos = initialPosition;
    this.lastGPSTime = performance.now();
  }
  
  /**
   * Met à jour la position interpolée (appelé à chaque frame ~60 FPS)
   * @param dt Delta temps en secondes depuis dernière frame
   * @returns Position lissée [x, y, z]
   */
  updateFrame(dt: number): [number, number, number] {
    if (this.useKalman) {
      // Mode Kalman : prédiction pour chaque axe
      const x = this.kalman_x.predict(dt);
      const y = this.kalman_y.predict(dt);
      const z = this.kalman_z.predict(dt);
      return [x, y, z];
    } else {
      // Mode simple : avancement + correction progressive
      this.simplePosition[0] += this.simpleVelocity[0] * dt;
      this.simplePosition[1] += this.simpleVelocity[1] * dt;
      this.simplePosition[2] += this.simpleVelocity[2] * dt;
      
      // Correction progressive si active
      if (this.framesRemainingCorrection > 0) {
        this.simplePosition[0] += this.correctionResidual[0];
        this.simplePosition[1] += this.correctionResidual[1];
        this.simplePosition[2] += this.correctionResidual[2];
        this.framesRemainingCorrection--;
      }
      
      return [...this.simplePosition];
    }
  }
  
  /**
   * Intègre une nouvelle mesure GPS (appelé à ~1 Hz)
   * @param gpsPosition Nouvelle position GPS [x, y, z]
   * @param currentSpeed Vitesse actuelle du véhicule (m/s)
   * @param bearing Direction du véhicule (degrés)
   */
  updateGPSMeasurement(
    gpsPosition: [number, number, number],
    currentSpeed: number,
    bearing: number
  ): void {
    const currentTime = performance.now();
    const dt_gps = (currentTime - this.lastGPSTime) / 1000; // secondes
    
    if (this.useKalman) {
      // Mode Kalman : correction avec mesure GPS
      this.kalman_x.update(gpsPosition[0]);
      this.kalman_y.update(gpsPosition[1]);
      this.kalman_z.update(gpsPosition[2]);
      
      // Ajuster les vitesses selon le bearing et la vitesse actuelle
      const bearingRad = bearing * Math.PI / 180;
      const vx = currentSpeed * Math.sin(bearingRad);
      const vy = currentSpeed * Math.cos(bearingRad);
      
      // Combiner vitesse mesurée et vitesse Kalman (pondération)
      const alpha = 0.3;
      this.kalman_x.setVelocity(
        alpha * vx + (1 - alpha) * this.kalman_x.getVelocity()
      );
      this.kalman_y.setVelocity(
        alpha * vy + (1 - alpha) * this.kalman_y.getVelocity()
      );
      
    } else {
      // Mode simple : calcul erreur et correction progressive
      const currentPos = this.simplePosition;
      const error: [number, number, number] = [
        gpsPosition[0] - currentPos[0],
        gpsPosition[1] - currentPos[1],
        gpsPosition[2] - currentPos[2]
      ];
      
      // Correction lissée sur N frames
      const N_lissage = 30; // 0.5 seconde à 60 FPS
      this.correctionResidual = [
        error[0] / N_lissage,
        error[1] / N_lissage,
        error[2] / N_lissage
      ];
      this.framesRemainingCorrection = N_lissage;
      
      // Mise à jour vitesse (moyenne glissante)
      if (this.lastGPSPos && dt_gps > 0) {
        const measuredVel: [number, number, number] = [
          (gpsPosition[0] - this.lastGPSPos[0]) / dt_gps,
          (gpsPosition[1] - this.lastGPSPos[1]) / dt_gps,
          (gpsPosition[2] - this.lastGPSPos[2]) / dt_gps
        ];
        
        const alpha = 0.3;
        this.simpleVelocity[0] = alpha * measuredVel[0] + (1 - alpha) * this.simpleVelocity[0];
        this.simpleVelocity[1] = alpha * measuredVel[1] + (1 - alpha) * this.simpleVelocity[1];
        this.simpleVelocity[2] = alpha * measuredVel[2] + (1 - alpha) * this.simpleVelocity[2];
      }
    }
    
    this.lastGPSPos = gpsPosition;
    this.lastGPSTime = currentTime;
  }
  
  /**
   * Obtient la position courante lissée
   */
  getCurrentPosition(): [number, number, number] {
    if (this.useKalman) {
      return [
        this.kalman_x.getPosition(),
        this.kalman_y.getPosition(),
        this.kalman_z.getPosition()
      ];
    } else {
      return [...this.simplePosition];
    }
  }
  
  /**
   * Obtient la vitesse courante estimée
   */
  getCurrentVelocity(): [number, number, number] {
    if (this.useKalman) {
      return [
        this.kalman_x.getVelocity(),
        this.kalman_y.getVelocity(),
        this.kalman_z.getVelocity()
      ];
    } else {
      return [...this.simpleVelocity];
    }
  }
  
  /**
   * Réinitialise le tracker avec une nouvelle position
   */
  reset(position: [number, number, number]): void {
    if (this.useKalman) {
      this.kalman_x = new KalmanFilter1D(position[0], 0.1, 5.0);
      this.kalman_y = new KalmanFilter1D(position[1], 0.1, 5.0);
      this.kalman_z = new KalmanFilter1D(position[2], 0.1, 5.0);
    } else {
      this.simplePosition = [...position];
      this.simpleVelocity = [0, 0, 0];
    }
    
    this.lastGPSPos = position;
    this.lastGPSTime = performance.now();
    this.framesRemainingCorrection = 0;
  }
}

