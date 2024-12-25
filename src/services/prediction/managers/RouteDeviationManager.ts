import { Settings } from '../../SettingsService';
import { RouteTracker } from '../../RouteTracker';
import { calculateDistanceToSegment } from '../../../utils/mapUtils';
import { routePlannerService } from '../../RoutePlannerService';

export class RouteDeviationManager {
  private lastRecalculationTime: number = 0;
  private static RECALCULATION_COOLDOWN = 10000; // 10 secondes minimum entre les recalculs
  private static MINIMUM_SPEED_FOR_RECALCULATION = 5; // 5 m/s minimum (18 km/h)
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
    const routeState = routePlannerService.getState();
    
    // Vérifier si on a une destination active
    if (!routeState.destination || !isOnRoad) {
      console.log('[RouteDeviationManager] No active destination or not on road');
      return false;
    }

    // Vérifier si la vitesse est suffisante
    if (currentSpeed < RouteDeviationManager.MINIMUM_SPEED_FOR_RECALCULATION) {
      console.log('[RouteDeviationManager] Speed too low for recalculation:', currentSpeed);
      return false;
    }

    // Vérifier si assez de temps s'est écoulé depuis le dernier recalcul
    const cooldownElapsed = Date.now() - this.lastRecalculationTime > RouteDeviationManager.RECALCULATION_COOLDOWN;
    if (!cooldownElapsed) {
      console.log('[RouteDeviationManager] Cooldown not elapsed');
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

    const shouldRecalculate = minDistance > settings.maxRouteDeviation;

    console.log('[RouteDeviationManager] Deviation check:', {
      minDistance,
      maxDeviation: settings.maxRouteDeviation,
      shouldRecalculate,
      currentSpeed,
      position: currentPosition
    });

    return shouldRecalculate;
  }

  markRecalculationTime() {
    this.lastRecalculationTime = Date.now();
  }

  reset() {
    this.lastRecalculationTime = 0;
  }
}