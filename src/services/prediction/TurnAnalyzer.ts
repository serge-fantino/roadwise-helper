import { calculateBearing, calculateDistance, calculateAngleDifference } from '../../utils/mapUtils';
import { Settings } from '../SettingsService';
import { RoadPrediction } from './PredictionTypes';

export class TurnAnalyzer {
  analyze(
    routePoints: [number, number][], 
    closestPointIndex: number,
    settings: Settings
  ): Omit<RoadPrediction, 'speedLimit' | 'optimalSpeed'> | null {
    let sharpestTurn = {
      angle: 0,
      position: routePoints[closestPointIndex],
      distance: 0
    };
    
    let totalDistance = 0;
    let previousBearing = calculateBearing(
      routePoints[closestPointIndex], 
      routePoints[closestPointIndex + 1] || routePoints[closestPointIndex]
    );

    for (let i = closestPointIndex; i < routePoints.length - 1; i++) {
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
          distance: totalDistance
        };
      }

      previousBearing = currentBearing;
    }

    if (Math.abs(sharpestTurn.angle) > settings.minTurnAngle) {
      return {
        distance: sharpestTurn.distance,
        angle: sharpestTurn.angle,
        position: sharpestTurn.position,
      };
    }

    return null;
  }
}