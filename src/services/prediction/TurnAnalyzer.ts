import { calculateBearing, calculateDistance, calculateAngleDifference } from '../../utils/mapUtils';
import { Settings } from '../SettingsService';
import { RoadPrediction } from './PredictionTypes';

/**
 * this is the original version for turn detection using a very basic logic. This has been replaced by CurveAnalyzer.
 */
export class TurnAnalyzer {
  analyze(
    routePoints: [number, number][], 
    closestPointIndex: number,
    settings: Settings
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    if (!routePoints || !Array.isArray(routePoints) || routePoints.length < 2 || closestPointIndex >= routePoints.length) {
      return null;
    }

    // First, look for any dangerous turn (>45°) on the entire route
    let dangerousTurn = this.findDangerousTurn(routePoints, closestPointIndex, settings);
    if (dangerousTurn) {
      return dangerousTurn;
    }
    // If no dangerous turn found, look for the sharpest turn within prediction distance
    return this.findSharpestTurnWithinDistance(routePoints, closestPointIndex, settings);
  }

  private findDangerousTurn(
    routePoints: [number, number][], 
    startIndex: number,
    settings: Settings
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    if (startIndex >= routePoints.length - 1) {
      return null;
    }

    let totalDistance = 0;
    let totalAngle = 0;
    let previousBearing = calculateBearing(
      routePoints[startIndex], 
      routePoints[startIndex + 1] || routePoints[startIndex]
    );

    for (let i = startIndex; i < routePoints.length - 1 && totalDistance < settings.predictionDistance; i++) {
      const currentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(previousBearing, currentBearing);
      totalAngle += angleDiff;
      
      totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);

      // Si on trouve un virage de plus de 45°, on le retourne immédiatement
      if (Math.abs(angleDiff) > 45) {
        return {
          distance: totalDistance,
          angle: angleDiff,
          position: routePoints[i + 1],
          index: i + 1
        };
      }
      if (Math.abs(totalAngle) > 45) {
        return {
          distance: totalDistance,
          angle: totalAngle,
          position: routePoints[i + 1],
          index: i + 1
        };
      }

      previousBearing = currentBearing;
    }

    return null;
  }

  private findSharpestTurnWithinDistance(
    routePoints: [number, number][], 
    startIndex: number,
    settings: Settings
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    if (startIndex >= routePoints.length - 1) {
      return null;
    }

    let sharpestTurn = {
      angle: 0,
      position: routePoints[startIndex],
      distance: 0,
      index: startIndex
    };
    
    let totalDistance = 0;
    let previousBearing = calculateBearing(
      routePoints[startIndex], 
      routePoints[startIndex + 1] || routePoints[startIndex]
    );

    for (let i = startIndex; i < routePoints.length - 1; i++) {
      const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
      totalDistance += segmentDistance;

      if (totalDistance > settings.predictionDistance) {
        break;
      }

      const currentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(previousBearing, currentBearing);
      
      if (Math.abs(angleDiff) > Math.abs(sharpestTurn.angle)) {
        sharpestTurn = {
          angle: angleDiff,
          position: routePoints[i + 1],
          distance: totalDistance,
          index: i + 1
        };
      }

      previousBearing = currentBearing;
    }

    if (Math.abs(sharpestTurn.angle) > settings.minTurnAngle) { 
      return {
        distance: sharpestTurn.distance,
        angle: sharpestTurn.angle,
        position: sharpestTurn.position,
        index: sharpestTurn.index
      };
    }

    return null;
  }
}