import { Settings } from '../../SettingsService';
import { RouteTracker } from '../../RouteTracker';

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
    const { index: closestIndex, distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    console.log('[RouteDeviationManager] Checking deviation:', {
      deviationDistance,
      maxDeviation: settings.maxRouteDeviation,
      closestIndex,
      totalPoints: routePoints.length
    });

    // Si la distance au point le plus proche est inférieure à la limite, pas besoin de recalculer
    if (deviationDistance <= settings.maxRouteDeviation) {
      return false;
    }

    // Vérifier le point suivant s'il existe
    if (closestIndex < routePoints.length - 1) {
      const nextPoint = routePoints[closestIndex + 1];
      const distanceToNextPoint = this.routeTracker.calculateDistance(currentPosition, nextPoint);

      console.log('[RouteDeviationManager] Checking next point:', {
        distanceToNextPoint,
        maxDeviation: settings.maxRouteDeviation
      });

      // Si la distance au point suivant est inférieure à la limite, pas besoin de recalculer
      if (distanceToNextPoint <= settings.maxRouteDeviation) {
        return false;
      }
    }

    // Si on arrive ici, c'est qu'on est trop loin des deux points
    console.log('[RouteDeviationManager] Route deviation detected, should recalculate');
    return true;
  }

  markRecalculationTime() {
    this.lastRecalculationTime = Date.now();
  }

  reset() {
    this.lastRecalculationTime = 0;
  }
}