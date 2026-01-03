import { calculateAngleDifference, calculateBearing } from '../../utils/mapUtils';
import { CurveAnalysisResult } from './CurveAnalyzer';
import { EnhancedRoutePoint } from '../route/RoutePlannerTypes';

export type TurnClassification =
  | 'intersection'
  | 'uturn'
  | 'hairpin'
  | 'tight'
  | 'wide'
  | 'curve';

export interface TurnClassificationResult {
  classification: TurnClassification;
  /** Signed delta heading in degrees (positive/negative depending on convention). */
  deltaHeadingDeg: number;
  absDeltaHeadingDeg: number;
  direction: 'left' | 'right' | 'unknown';
}

function directionFromDelta(deltaHeadingDeg: number): 'left' | 'right' | 'unknown' {
  if (!Number.isFinite(deltaHeadingDeg) || Math.abs(deltaHeadingDeg) < 1) return 'unknown';
  // NOTE: sign convention depends on calculateAngleDifference usage. We only need stable left/right.
  return deltaHeadingDeg > 0 ? 'left' : 'right';
}

/**
 * Classifies a turn based on the global direction change (bearing start->end) and turn length.
 * This is more robust for city intersections (≈ 90°) where the "radius" is often meaningless.
 */
export function classifyTurn(
  enhancedPoints: EnhancedRoutePoint[],
  curve: CurveAnalysisResult
): TurnClassificationResult {
  // Use route headings just before/after the curve when possible.
  const startIdx = curve.startIndex;
  const endIdx = curve.endIndex;

  const startPrev = enhancedPoints[Math.max(0, startIdx - 1)]?.position ?? curve.startPoint;
  const start = enhancedPoints[startIdx]?.position ?? curve.startPoint;
  const end = enhancedPoints[endIdx]?.position ?? curve.endPoint;
  const endNext = enhancedPoints[Math.min(enhancedPoints.length - 1, endIdx + 1)]?.position ?? curve.endPoint;

  const startBearing = calculateBearing(startPrev, start);
  const endBearing = calculateBearing(end, endNext);

  // We want "end - start" shortest signed delta in [-180, 180]
  const deltaHeadingDeg = calculateAngleDifference(endBearing, startBearing);
  const absDeltaHeadingDeg = Math.abs(deltaHeadingDeg);

  // Heuristics (can be tuned later, but already robust for urban intersections)
  const lengthM = curve.length;
  const radiusM = curve.radius;

  let classification: TurnClassification = 'curve';

  // U-turn / return
  if (absDeltaHeadingDeg >= 165) {
    classification = 'uturn';
  } else if (absDeltaHeadingDeg >= 115 && absDeltaHeadingDeg < 165) {
    // Hairpin tends to be large direction change with small radius
    classification = radiusM > 0 && radiusM < 35 ? 'hairpin' : 'tight';
  } else if (absDeltaHeadingDeg >= 70 && absDeltaHeadingDeg <= 110) {
    // City intersection: near 90° and short-ish length
    classification = lengthM <= 90 ? 'intersection' : 'tight';
  } else if (absDeltaHeadingDeg >= 35) {
    classification = radiusM > 0 && radiusM >= 120 ? 'wide' : 'tight';
  } else {
    classification = 'curve';
  }

  return {
    classification,
    deltaHeadingDeg,
    absDeltaHeadingDeg,
    direction: directionFromDelta(deltaHeadingDeg),
  };
}


