import { calculateDistance } from '../../../utils/mapUtils';
import { SceneCoordinateSystem } from '../../../utils/SceneCoordinateSystem';
import { TurnClassification } from '../TurnClassifier';

export interface TurnDetectionV2Config {
  /** meters */
  sampleStepM: number; // 1m
  /** meters */
  lookAheadM: number; // 1000m
  /** meters */
  rebuildEveryM: number; // 500m
  /** meters - wheel track width */
  wheelTrackM: number; // 1.8m
  /** m/s², lateral accel limit used to convert curvature to speed */
  maxLateralAccel: number; // e.g. 3.0..5.0
  /** thresholds on diffMetric = wheelTrack * |curvature| (dimensionless) */
  diffOn: number;
  diffOff: number;
  /** meters */
  minTurnLengthM: number;
  /** meters, smoothing window size along samples */
  smoothWindowM: number;
}

export interface V2CurveInfo {
  startPoint: [number, number];
  startIndex: number; // index in original routePoints
  endPoint: [number, number];
  endIndex: number; // index in original routePoints
  apex: [number, number];
  apexIndex: number; // index in original routePoints
  length: number; // meters
  /** Radius estimate (meters). Infinity for very small curvature. */
  radius: number;
  /** Signed total heading delta across the curve (degrees, [-180,180]). */
  deltaHeadingDeg: number;
  classification: TurnClassification;
  /** Maximum diff metric within the segment */
  diffMax: number;
}

export interface V2Turn {
  curveInfo: V2CurveInfo;
  /** Distance from current position to start of turn along the route (meters) */
  distanceToStartM: number;
  /** Suggested speed through the turn (km/h), already clamped to speedLimit/defaultSpeed/minSpeed by caller if desired */
  suggestedSpeedKmh: number;
}

type Cartesian = { x: number; y: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function wrapPi(rad: number): number {
  while (rad > Math.PI) rad -= 2 * Math.PI;
  while (rad < -Math.PI) rad += 2 * Math.PI;
  return rad;
}

function classifyFromDeltaAndLength(deltaDegAbs: number, lengthM: number, radiusM: number): TurnClassification {
  if (deltaDegAbs >= 165) return 'uturn';
  if (deltaDegAbs >= 115 && deltaDegAbs < 165) return radiusM > 0 && radiusM < 35 ? 'hairpin' : 'tight';
  if (deltaDegAbs >= 70 && deltaDegAbs <= 110) return lengthM <= 90 ? 'intersection' : 'tight';
  if (deltaDegAbs >= 35) return radiusM > 0 && radiusM >= 120 ? 'wide' : 'tight';
  return 'curve';
}

function buildCumulativeDistances(points: [number, number][]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum[i] = cum[i - 1] + calculateDistance(points[i - 1], points[i]);
  }
  return cum;
}

function findIndexAtDistance(cum: number[], target: number): number {
  // returns smallest i such that cum[i] >= target
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (cum[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateGpsOnRoute(
  routePoints: [number, number][],
  cum: number[],
  distanceFromStart: number
): { point: [number, number]; baseIndex: number } {
  if (routePoints.length === 0) return { point: [0, 0], baseIndex: 0 };
  if (distanceFromStart <= 0) return { point: routePoints[0], baseIndex: 0 };
  const total = cum[cum.length - 1];
  if (distanceFromStart >= total) return { point: routePoints[routePoints.length - 1], baseIndex: routePoints.length - 1 };

  const i = Math.max(0, findIndexAtDistance(cum, distanceFromStart) - 1);
  const d1 = cum[i];
  const d2 = cum[i + 1];
  const seg = d2 - d1;
  const t = seg > 0 ? (distanceFromStart - d1) / seg : 0;
  const p1 = routePoints[i];
  const p2 = routePoints[i + 1];
  return {
    point: [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)],
    baseIndex: i,
  };
}

function movingAverageAbs(values: number[], window: number): number[] {
  if (window <= 1) return values.map(v => Math.abs(v));
  const out: number[] = new Array(values.length);
  let sum = 0;
  const absVals = values.map(v => Math.abs(v));
  for (let i = 0; i < absVals.length; i++) {
    sum += absVals[i];
    if (i >= window) sum -= absVals[i - window];
    const denom = Math.min(i + 1, window);
    out[i] = sum / denom;
  }
  return out;
}

/**
 * V2 turn detector based on a "wheel differential" proxy:
 * diffMetric ≈ wheelTrack * |curvature|, where curvature is computed from heading change per meter.
 */
export function detectTurnsV2(params: {
  routePoints: [number, number][];
  currentIndex: number;
  currentDistanceAlongRouteM: number;
  config: TurnDetectionV2Config;
  /** optional clamp */
  speedLimitKmh: number | null;
  defaultSpeedKmh: number;
  minTurnSpeedKmh: number;
}): V2Turn[] {
  const {
    routePoints,
    currentIndex,
    currentDistanceAlongRouteM,
    config,
    speedLimitKmh,
    defaultSpeedKmh,
    minTurnSpeedKmh,
  } = params;

  if (routePoints.length < 3) return [];

  const cum = buildCumulativeDistances(routePoints);
  const total = cum[cum.length - 1];
  const windowStart = clamp(currentDistanceAlongRouteM, 0, total);
  const windowEnd = clamp(windowStart + config.lookAheadM, 0, total);
  if (windowEnd - windowStart < 20) return [];

  // Resample at 1m (or sampleStepM) along the window, in GPS then cartesian.
  const originGps = routePoints[Math.max(0, Math.min(routePoints.length - 1, currentIndex))];
  const cs = new SceneCoordinateSystem(originGps);

  const step = Math.max(0.5, config.sampleStepM);
  const n = Math.max(3, Math.floor((windowEnd - windowStart) / step) + 1);
  const gpsSamples: [number, number][] = [];
  const cart: Cartesian[] = [];
  const sampleRouteIndex: number[] = [];

  for (let i = 0; i < n; i++) {
    const d = windowStart + i * step;
    const { point, baseIndex } = interpolateGpsOnRoute(routePoints, cum, d);
    gpsSamples.push(point);
    sampleRouteIndex.push(baseIndex);
    cart.push(cs.gpsToCartesian(point));
  }

  // Headings between samples
  const headings: number[] = new Array(cart.length).fill(0);
  for (let i = 1; i < cart.length; i++) {
    const dx = cart[i].x - cart[i - 1].x;
    const dy = cart[i].y - cart[i - 1].y;
    headings[i] = Math.atan2(dy, dx);
  }

  // Signed dtheta per step
  const dtheta: number[] = new Array(cart.length).fill(0);
  for (let i = 2; i < cart.length; i++) {
    dtheta[i] = wrapPi(headings[i] - headings[i - 1]);
  }

  // curvature ≈ dtheta/ds, ds = step
  const curvature: number[] = dtheta.map(v => v / step);
  const diffMetric: number[] = curvature.map(k => Math.abs(k) * config.wheelTrackM);

  // Smooth (in meters)
  const smoothWindow = Math.max(1, Math.round(config.smoothWindowM / step));
  const diffSmooth = movingAverageAbs(curvature.map(k => k * config.wheelTrackM), smoothWindow);

  // Detect segments with hysteresis
  const turns: V2Turn[] = [];
  let inTurn = false;
  let startIdx = 0;
  let belowCount = 0;
  const offHold = Math.max(1, Math.round(10 / step)); // require ~10m below off to end

  for (let i = 0; i < diffSmooth.length; i++) {
    const d = diffSmooth[i];
    if (!inTurn) {
      if (d >= config.diffOn) {
        inTurn = true;
        startIdx = i;
        belowCount = 0;
      }
    } else {
      if (d <= config.diffOff) {
        belowCount++;
        if (belowCount >= offHold) {
          const endIdx = i - belowCount;
          const lengthM = Math.max(0, (endIdx - startIdx) * step);
          if (lengthM >= config.minTurnLengthM) {
            turns.push(buildTurn({
              routePoints,
              cum,
              windowStart,
              gpsSamples,
              sampleRouteIndex,
              curvature,
              diffMetric,
              startIdx,
              endIdx,
              step,
              config,
              speedLimitKmh,
              defaultSpeedKmh,
              minTurnSpeedKmh,
              currentDistanceAlongRouteM,
            }));
          }
          inTurn = false;
        }
      } else {
        belowCount = 0;
      }
    }
    if (turns.length >= 5) break;
  }

  return turns.filter(t => Number.isFinite(t.distanceToStartM)).sort((a, b) => a.distanceToStartM - b.distanceToStartM);
}

function buildTurn(args: {
  routePoints: [number, number][];
  cum: number[];
  windowStart: number;
  gpsSamples: [number, number][];
  sampleRouteIndex: number[];
  curvature: number[];
  diffMetric: number[];
  startIdx: number;
  endIdx: number;
  step: number;
  config: TurnDetectionV2Config;
  speedLimitKmh: number | null;
  defaultSpeedKmh: number;
  minTurnSpeedKmh: number;
  currentDistanceAlongRouteM: number;
}): V2Turn {
  const {
    routePoints,
    cum,
    windowStart,
    gpsSamples,
    sampleRouteIndex,
    curvature,
    diffMetric,
    startIdx,
    endIdx,
    step,
    config,
    speedLimitKmh,
    defaultSpeedKmh,
    minTurnSpeedKmh,
    currentDistanceAlongRouteM,
  } = args;

  let deltaRad = 0;
  let diffMax = 0;
  let apexIdx = startIdx;
  for (let i = startIdx; i <= endIdx; i++) {
    deltaRad += curvature[i] * step;
    if (diffMetric[i] > diffMax) {
      diffMax = diffMetric[i];
      apexIdx = i;
    }
  }

  const deltaDeg = (deltaRad * 180) / Math.PI;
  const lengthM = Math.max(0, (endIdx - startIdx) * step);

  // Radius estimate from peak diff: diff ≈ wheelTrack / R  => R ≈ wheelTrack / diff
  const radius = diffMax > 1e-6 ? config.wheelTrackM / diffMax : Infinity;
  const classification = classifyFromDeltaAndLength(Math.abs(deltaDeg), lengthM, radius);

  // Suggested speed from lateral accel: v = sqrt(a * R)
  const aLat = config.maxLateralAccel;
  const vMs = Number.isFinite(radius) ? Math.sqrt(Math.max(0, aLat * radius)) : 999;
  const vKmhRaw = vMs * 3.6;
  const base = speedLimitKmh ?? defaultSpeedKmh;
  const suggestedSpeedKmh = clamp(vKmhRaw, minTurnSpeedKmh, base);

  // Map sample positions back to original route indices (approximate by cumulative distance)
  const startDistanceAlongRoute = windowStart + startIdx * step;
  const endDistanceAlongRoute = windowStart + endIdx * step;
  const apexDistanceAlongRoute = windowStart + apexIdx * step;

  const startIndex = sampleRouteIndex[startIdx] ?? findIndexAtDistance(cum, startDistanceAlongRoute);
  const endIndex = sampleRouteIndex[endIdx] ?? findIndexAtDistance(cum, endDistanceAlongRoute);
  const apexIndex = sampleRouteIndex[apexIdx] ?? findIndexAtDistance(cum, apexDistanceAlongRoute);

  const startPoint = gpsSamples[startIdx] ?? routePoints[startIndex] ?? routePoints[0];
  const endPoint = gpsSamples[endIdx] ?? routePoints[endIndex] ?? routePoints[routePoints.length - 1];
  const apexPoint = gpsSamples[apexIdx] ?? routePoints[apexIndex] ?? apexPointFallback(routePoints, apexIndex);

  const distanceToStartM = startDistanceAlongRoute - currentDistanceAlongRouteM;

  return {
    distanceToStartM,
    suggestedSpeedKmh,
    curveInfo: {
      startPoint,
      startIndex,
      endPoint,
      endIndex,
      apex: apexPoint,
      apexIndex,
      length: lengthM,
      radius,
      deltaHeadingDeg: deltaDeg,
      classification,
      diffMax,
    },
  };
}

function apexPointFallback(routePoints: [number, number][], idx: number): [number, number] {
  if (routePoints.length === 0) return [0, 0];
  return routePoints[Math.max(0, Math.min(routePoints.length - 1, idx))];
}


