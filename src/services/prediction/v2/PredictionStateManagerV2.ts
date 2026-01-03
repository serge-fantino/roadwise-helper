import { TurnPrediction } from '../PredictionTypes';
import { Settings } from '../../SettingsService';
import { RouteTracker } from '../../RouteTracker';
import { calculateDistance } from '../../../utils/mapUtils';
import { DecelerationCalculator } from '../DecelerationCalculator';
import { detectTurnsV2, TurnDetectionV2Config } from './TurnDetectorV2';

type WindowState = {
  routeHash: string;
  baseDistanceM: number; // distance along route at which window starts (approx)
  windowEndDistanceM: number;
  turns: TurnPrediction[];
};

function routeHash(points: [number, number][]): string {
  if (points.length === 0) return 'empty';
  const a = points[0];
  const b = points[points.length - 1];
  return `${points.length}:${a[0].toFixed(6)},${a[1].toFixed(6)}:${b[0].toFixed(6)},${b[1].toFixed(6)}`;
}

function buildCumulativeDistances(routePoints: [number, number][]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < routePoints.length; i++) {
    cum[i] = cum[i - 1] + calculateDistance(routePoints[i - 1], routePoints[i]);
  }
  return cum;
}

export class PredictionStateManagerV2 {
  private currentPrediction: TurnPrediction | null = null;
  private routeTracker: RouteTracker;
  private decelerationCalculator: DecelerationCalculator;
  private window: WindowState | null = null;

  constructor() {
    this.routeTracker = new RouteTracker();
    this.decelerationCalculator = new DecelerationCalculator();
  }

  async updatePredictions(
    currentPosition: [number, number],
    currentSpeedKmh: number,
    routePoints: [number, number][],
    settings: Settings,
    speedLimitKmh: number | null
  ): Promise<void> {
    if (!routePoints || routePoints.length < 3) {
      this.currentPrediction = null;
      this.window = null;
      return;
    }

    const { index: currentIndex, distance: deviationDistance } =
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    if (this.routeTracker.isOffRoute(deviationDistance, settings)) {
      this.currentPrediction = null;
      return;
    }

    const cum = buildCumulativeDistances(routePoints);
    const currentDistanceAlongRouteM = cum[currentIndex] + calculateDistance(routePoints[currentIndex], currentPosition);

    const cfg: TurnDetectionV2Config = {
      sampleStepM: 1,
      lookAheadM: 1000,
      rebuildEveryM: 500,
      wheelTrackM: 1.8,
      // Driving style could map to this later; start conservative
      maxLateralAccel: 3.5,
      diffOn: 0.012,
      diffOff: 0.006,
      minTurnLengthM: 12,
      smoothWindowM: 5,
    };

    const h = routeHash(routePoints);
    const needsRebuild =
      !this.window ||
      this.window.routeHash !== h ||
      currentDistanceAlongRouteM >= this.window.baseDistanceM + cfg.rebuildEveryM ||
      currentDistanceAlongRouteM >= this.window.windowEndDistanceM - 50;

    if (needsRebuild) {
      const v2Turns = detectTurnsV2({
        routePoints,
        currentIndex,
        currentDistanceAlongRouteM,
        config: cfg,
        speedLimitKmh,
        defaultSpeedKmh: settings.defaultSpeed,
        minTurnSpeedKmh: settings.minTurnSpeed,
      });

      const turns: TurnPrediction[] = v2Turns.map((t) => {
        const angle = t.curveInfo.deltaHeadingDeg;
        return {
          distance: t.distanceToStartM,
          angle,
          position: t.curveInfo.startPoint,
          index: t.curveInfo.startIndex,
          speedLimit: speedLimitKmh ?? undefined,
          optimalSpeed: t.suggestedSpeedKmh,
          requiredDeceleration: null,
          classification: t.curveInfo.classification,
          curveInfo: {
            startPoint: t.curveInfo.startPoint,
            startIndex: t.curveInfo.startIndex,
            endPoint: t.curveInfo.endPoint,
            endIndex: t.curveInfo.endIndex,
            apex: t.curveInfo.apex,
            apexIndex: t.curveInfo.apexIndex,
            length: t.curveInfo.length,
            radius: t.curveInfo.radius,
            startAngle: 0,
            endAngle: 0,
            apexAngle: angle,
            curvePoints: [],
            classification: t.curveInfo.classification,
            deltaHeadingDeg: t.curveInfo.deltaHeadingDeg,
          },
        };
      });

      this.window = {
        routeHash: h,
        baseDistanceM: currentDistanceAlongRouteM,
        windowEndDistanceM: currentDistanceAlongRouteM + cfg.lookAheadM,
        turns,
      };
    } else {
      // Update distances without rebuilding.
      for (const t of this.window.turns) {
        // distance recompute: use cum index estimate
        const startIdx = t.curveInfo.startIndex;
        const startDist = cum[Math.max(0, Math.min(cum.length - 1, startIdx))];
        t.distance = startDist - currentDistanceAlongRouteM;
      }
    }

    const turnsNow = (this.window?.turns ?? [])
      .filter(t => t.distance > -5 && t.distance < 10000) // small margin
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // Compute required deceleration for next turn only (like V1)
    const next = turnsNow[0] ?? null;
    if (!next) {
      this.currentPrediction = null;
      this.window!.turns = turnsNow;
      return;
    }

    const requiredDeceleration =
      currentSpeedKmh <= (next.optimalSpeed || 0)
        ? null
        : this.decelerationCalculator.calculateRequiredDeceleration(
            currentSpeedKmh,
            next.optimalSpeed || 0,
            next.distance
          );

    this.currentPrediction = { ...next, requiredDeceleration };
    this.window!.turns = turnsNow;
  }

  getCurrentPrediction(): TurnPrediction | null {
    return this.currentPrediction;
  }

  getTurns(): TurnPrediction[] {
    return this.window?.turns ?? [];
  }

  reset(): void {
    this.window = null;
    this.currentPrediction = null;
  }
}


