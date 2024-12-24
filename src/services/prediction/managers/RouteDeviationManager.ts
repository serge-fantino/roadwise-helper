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

    const { distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    const isOffRoute = this.routeTracker.isOffRoute(deviationDistance, settings);
    const cooldownElapsed = Date.now() - this.lastRecalculationTime > RouteDeviationManager.RECALCULATION_COOLDOWN;

    return isOffRoute && cooldownElapsed;
  }

  markRecalculationTime() {
    this.lastRecalculationTime = Date.now();
  }

  reset() {
    this.lastRecalculationTime = 0;
  }
}