import { NavigationCalculator } from './NavigationCalculator';

export class RouteManager {
  private routePoints: [number, number][] = [];
  private currentRouteIndex = 0;
  private navigationCalculator: NavigationCalculator;

  constructor(navigationCalculator: NavigationCalculator) {
    this.navigationCalculator = navigationCalculator;
  }

  setRoutePoints(points: [number, number][]) {
    this.routePoints = points;
    this.currentRouteIndex = 0;
  }

  getCurrentIndex(): number {
    return this.currentRouteIndex;
  }

  findNextValidTarget(
    currentPosition: [number, number],
    distanceToTravel: number
  ): number {
    let targetIndex = this.currentRouteIndex;
    const accumulatedDistance = 0; // Réassigné dans la boucle

    console.log('[RouteManager] Finding next target:', {
      currentPosition,
      distanceToTravel,
      currentIndex: this.currentRouteIndex,
      totalPoints: this.routePoints.length
    });

    while (targetIndex < this.routePoints.length - 1 && targetIndex < this.currentRouteIndex +3) {
      const currentTarget = this.routePoints[targetIndex];
      
      // Calculate distance to next point
      const nextDistance = this.navigationCalculator.calculateDistance(
        currentPosition,
        currentTarget
      );

      console.log('[RouteManager] Checking point:', {
        distanceToTravel, 
        targetIndex,
        nextDistance,
        currentTarget
      });

      // If we can't reach the next point, this is our target
      if (nextDistance > distanceToTravel) {
        console.log('[RouteManager] Found target point:', {
          targetIndex,
          distance: nextDistance,
          distanceToTravel
        });
        return targetIndex;
      }

      // Move to next point
      targetIndex++;
    }

    // If we've reached the end of the route
    if (targetIndex >= this.routePoints.length - 1) {
      console.log('[RouteManager] Reached end of route');
      return this.routePoints.length - 1;
    }

    return targetIndex;
  }

  getRoutePoint(index: number): [number, number] | null {
    return this.routePoints[index] || null;
  }

  updateCurrentIndex(index: number) {
    this.currentRouteIndex = index;
  }

  hasReachedEnd(): boolean {
    return this.currentRouteIndex >= this.routePoints.length - 1;
  }
}