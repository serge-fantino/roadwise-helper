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

function updateTurnDistanceFields(
  turn: TurnPrediction,
  cum: number[],
  currentDistanceAlongRouteM: number
): void {
  const startIdx = turn.curveInfo.startIndex;
  const endIdx = turn.curveInfo.endIndex;
  const startDist = cum[Math.max(0, Math.min(cum.length - 1, startIdx))];
  const endDist = cum[Math.max(0, Math.min(cum.length - 1, endIdx))];

  if (currentDistanceAlongRouteM > endDist) {
    turn.distance = -999999;
    turn.distanceToExit = undefined;
  } else if (currentDistanceAlongRouteM >= startDist) {
    turn.distance = 0;
    turn.distanceToExit = Math.max(0, endDist - currentDistanceAlongRouteM);
  } else {
    turn.distance = startDist - currentDistanceAlongRouteM;
    turn.distanceToExit = undefined;
  }
}

function isActiveTurn(turn: TurnPrediction): boolean {
  return turn.distance === 0 && typeof turn.distanceToExit === 'number';
}

function isExitedTurn(turn: TurnPrediction): boolean {
  return turn.distance <= -100000;
}

function clampIndex(i: number, maxExclusive: number): number {
  return Math.max(0, Math.min(maxExclusive - 1, i));
}

function tryMatchTurn(
  active: TurnPrediction,
  candidates: TurnPrediction[]
): TurnPrediction | null {
  // Match by segment overlap / proximity of endIndex (robust across slight start shifts)
  const aStart = active.curveInfo.startIndex;
  const aEnd = active.curveInfo.endIndex;
  const aApex = active.curveInfo.apexIndex;

  let best: { t: TurnPrediction; score: number } | null = null;

  for (const c of candidates) {
    const cStart = c.curveInfo.startIndex;
    const cEnd = c.curveInfo.endIndex;
    const cApex = c.curveInfo.apexIndex;

    const overlap = Math.max(0, Math.min(aEnd, cEnd) - Math.max(aStart, cStart));
    const union = Math.max(1, Math.max(aEnd, cEnd) - Math.min(aStart, cStart));
    const overlapRatio = overlap / union; // 0..1

    const dEnd = Math.abs(cEnd - aEnd);
    const dApex = Math.abs(cApex - aApex);

    // Higher is better.
    const score = overlapRatio * 1000 - dEnd * 2 - dApex;

    if (!best || score > best.score) best = { t: c, score };
  }

  // Require either decent overlap or close end index
  if (!best) return null;
  const c = best.t;
  const overlap = Math.max(0, Math.min(aEnd, c.curveInfo.endIndex) - Math.max(aStart, c.curveInfo.startIndex));
  const union = Math.max(1, Math.max(aEnd, c.curveInfo.endIndex) - Math.min(aStart, c.curveInfo.startIndex));
  const overlapRatio = overlap / union;
  const dEnd = Math.abs(c.curveInfo.endIndex - aEnd);

  if (overlapRatio >= 0.2 || dEnd <= 30) return c;
  return null;
}

export class PredictionStateManagerV2 {
  private currentPrediction: TurnPrediction | null = null;
  private routeTracker: RouteTracker;
  private decelerationCalculator: DecelerationCalculator;
  private window: WindowState | null = null;
  // Sticky turn so the warning doesn't disappear during window rebuilds while still inside.
  private stickyActiveTurn: TurnPrediction | null = null;

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
      lookBehindM: 200,
      rebuildEveryM: 500,
      wheelTrackM: 1.8,
      // Driving style could map to this later; start conservative
      maxLateralAccel: 3.5,
      diffOn: 0.012,
      diffOff: 0.006,
      minTurnLengthM: 12,
      smoothWindowM: 5,
      entryPaddingM: 10,
    };

    const h = routeHash(routePoints);

    // Refresh distances on previous window turns so we can detect active turn before rebuilding.
    if (this.window?.routeHash === h) {
      for (const t of this.window.turns) {
        updateTurnDistanceFields(t, cum, currentDistanceAlongRouteM);
      }
      // Keep stickyActiveTurn in sync if it still exists in window
      const activeNow = this.window.turns.find(isActiveTurn) ?? null;
      this.stickyActiveTurn = activeNow ?? this.stickyActiveTurn;
      if (this.stickyActiveTurn) {
        updateTurnDistanceFields(this.stickyActiveTurn, cum, currentDistanceAlongRouteM);
        if (isExitedTurn(this.stickyActiveTurn)) this.stickyActiveTurn = null;
      }
    } else {
      // Route changed: drop sticky
      this.stickyActiveTurn = null;
    }

    const needsRebuild =
      !this.window ||
      this.window.routeHash !== h ||
      currentDistanceAlongRouteM >= this.window.baseDistanceM + cfg.rebuildEveryM ||
      currentDistanceAlongRouteM >= this.window.windowEndDistanceM - 50;

    if (needsRebuild) {
      const prevActive = this.stickyActiveTurn;
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
        const turn: TurnPrediction = {
          distance: t.distanceToStartM,
          distanceToExit: undefined,
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
            curvePoints: t.curveInfo.curvePoints,
            classification: t.curveInfo.classification,
            deltaHeadingDeg: t.curveInfo.deltaHeadingDeg,
          },
        };
        // Ensure active turns (started before currentDistance) remain visible immediately after rebuild.
        updateTurnDistanceFields(turn, cum, currentDistanceAlongRouteM);
        return turn;
      });

      // After rebuild, try to match the previous active turn (if any) to the newly detected ones.
      let mergedTurns = turns;
      if (prevActive && !isExitedTurn(prevActive)) {
        // Update with current distances (ensures distance=0 + distanceToExit).
        updateTurnDistanceFields(prevActive, cum, currentDistanceAlongRouteM);

        const matched = tryMatchTurn(prevActive, turns);
        if (matched) {
          this.stickyActiveTurn = matched;
        } else {
          // Re-inject previous active turn so the warning stays visible until exit.
          this.stickyActiveTurn = prevActive;
          mergedTurns = [prevActive, ...turns];
        }
      }

      // De-duplicate by startIndex (keep the first occurrence, which favors the sticky active turn)
      const seenStart = new Set<number>();
      mergedTurns = mergedTurns.filter(t => {
        const k = t.curveInfo.startIndex;
        if (seenStart.has(k)) return false;
        seenStart.add(k);
        return true;
      });

      this.window = {
        routeHash: h,
        baseDistanceM: currentDistanceAlongRouteM,
        // Effective end of sampling window is (current - behind + ahead)
        windowEndDistanceM: currentDistanceAlongRouteM + (cfg.lookAheadM - cfg.lookBehindM),
        turns: mergedTurns,
      };
    } else {
      // Update distances without rebuilding.
      for (const t of this.window.turns) {
        updateTurnDistanceFields(t, cum, currentDistanceAlongRouteM);
      }
    }

    const turnsNow = (this.window?.turns ?? [])
      // Remove only once we've exited the turn (we mark those with a very negative distance)
      .filter(t => t.distance > -100000 && t.distance < 10000)
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


