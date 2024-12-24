import { calculateDistance } from '../utils/mapUtils';
import { Settings } from './SettingsService';

export class RouteTracker {
  findClosestPointOnRoute(
    currentPosition: [number, number],
    routePoints: [number, number][]
  ): { index: number; distance: number } {
    let closestPointIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < routePoints.length; i++) {
      const distance = calculateDistance(currentPosition, routePoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }

    return {
      index: closestPointIndex,
      distance: minDistance
    };
  }

  calculateDistance(point1: [number, number], point2: [number, number]): number {
    return calculateDistance(point1, point2);
  }

  isOffRoute(distance: number, settings: Settings): boolean {
    return distance > settings.maxRouteDeviation;
  }
}