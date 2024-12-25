import { Settings } from '../../SettingsService';
import { RouteTracker } from '../../RouteTracker';
import { calculateDistanceToSegment } from '../../../utils/mapUtils';

export class RouteDeviationManager {
  private lastRecalculationTime: number = 0;
  private static RECALCULATION_COOLDOWN = 10000; // 10 secondes minimum entre les recalculs
  private routeTracker: RouteTracker;

  constructor(routeTracker: RouteTracker) {
    this.routeTracker = routeTracker;
  }

  shouldRecalculateRoute(
    currentPosition: [number, number],
    routePoints: [number, number][],
    destination: [number, number] | null,
    settings: Settings,
    isOnRoad: boolean,
    currentSpeed: number
  ): boolean {
    if (!destination || !isOnRoad || currentSpeed === 0) {
      return false;
    }

    // Vérifier si assez de temps s'est écoulé depuis le dernier recalcul
    const cooldownElapsed = Date.now() - this.lastRecalculationTime > RouteDeviationManager.RECALCULATION_COOLDOWN;
    if (!cooldownElapsed) {
      return false;
    }

    // Trouver le point le plus proche sur la route
    const { index } = this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    // Calculer la distance minimale aux segments adjacents
    let minDistance = Infinity;

    // Vérifier le segment précédent si il existe
    if (index > 0) {
      const distToPrevSegment = calculateDistanceToSegment(
        currentPosition,
        routePoints[index - 1],
        routePoints[index]
      );
      minDistance = Math.min(minDistance, distToPrevSegment);
    }

    // Vérifier le segment suivant si il existe
    if (index < routePoints.length - 1) {
      const distToNextSegment = calculateDistanceToSegment(
        currentPosition,
        routePoints[index],
        routePoints[index + 1]
      );
      minDistance = Math.min(minDistance, distToNextSegment);
    }

    console.log('[RouteDeviationManager] Checking deviation:', {
      minDistance,
      maxDeviation: settings.maxRouteDeviation
    });

    return minDistance > settings.maxRouteDeviation;
  }

  markRecalculationTime() {
    this.lastRecalculationTime = Date.now();
  }

  reset() {
    this.lastRecalculationTime = 0;
  }
}