import { calculateBearing, calculateDistance, calculateAngleDifference } from '../../utils/mapUtils';
import { Settings } from '../SettingsService';
import { RoadPrediction } from './PredictionTypes';

export class TurnAnalyzer {
  analyze(
    routePoints: [number, number][], 
    closestPointIndex: number,
    settings: Settings
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    // First, look for any dangerous turn (>45°) on the entire route
    let dangerousTurn = this.findDangerousTurn(routePoints, closestPointIndex);
    if (dangerousTurn) {
      return dangerousTurn;
    }

    // If no dangerous turn found, look for the sharpest turn within prediction distance
    return this.findSharpestTurnWithinDistance(routePoints, closestPointIndex, settings.predictionDistance);
  }

  private findDangerousTurn(
    routePoints: [number, number][], 
    startIndex: number
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    let totalDistance = 0;
    let totalAngle = 0;
    let previousBearing = calculateBearing(
      routePoints[startIndex], 
      routePoints[startIndex + 1] || routePoints[startIndex]
    );

    for (let i = startIndex; i < routePoints.length - 1 && totalDistance < 1000; i++) {
      const currentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(previousBearing, currentBearing);
      totalAngle += angleDiff;
      
      totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);

      // Si on trouve un virage de plus de 45°, on le retourne immédiatement
      if (Math.abs(angleDiff) > 45 || Math.abs(totalAngle) > 45) {
        return {
          distance: totalDistance,
          angle: angleDiff,
          position: routePoints[i + 1],
        };
      }

      previousBearing = currentBearing;
    }

    return null;
  }

  private findSharpestTurnWithinDistance(
    routePoints: [number, number][], 
    startIndex: number,
    maxDistance: number
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    let sharpestTurn = {
      angle: 0,
      position: routePoints[startIndex],
      distance: 0
    };
    
    let totalDistance = 0;
    let previousBearing = calculateBearing(
      routePoints[startIndex], 
      routePoints[startIndex + 1] || routePoints[startIndex]
    );

    for (let i = startIndex; i < routePoints.length - 1; i++) {
      const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
      totalDistance += segmentDistance;

      if (totalDistance > maxDistance) {
        break;
      }

      const currentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(previousBearing, currentBearing);
      
      if (Math.abs(angleDiff) > Math.abs(sharpestTurn.angle)) {
        sharpestTurn = {
          angle: angleDiff,
          position: routePoints[i + 1],
          distance: totalDistance
        };
      }

      previousBearing = currentBearing;
    }

    if (Math.abs(sharpestTurn.angle) > 15) { // On garde le seuil minimum de 15°
      return {
        distance: sharpestTurn.distance,
        angle: sharpestTurn.angle,
        position: sharpestTurn.position,
      };
    }

    return null;
  }
}