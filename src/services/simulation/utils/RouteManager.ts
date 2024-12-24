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
    let targetIndex = this.currentRouteIndex + 1;

    if (targetIndex >= this.routePoints.length) {
      return this.currentRouteIndex;
    }

    let accumulatedDistance = 0;
    let nextPoint = this.routePoints[targetIndex];
    let nextDistance = this.navigationCalculator.calculateDistance(currentPosition, nextPoint);

    while (nextDistance < distanceToTravel && targetIndex < this.routePoints.length - 1) {
      targetIndex++;
      nextPoint = this.routePoints[targetIndex];
      nextDistance = this.navigationCalculator.calculateDistance(currentPosition, nextPoint);
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