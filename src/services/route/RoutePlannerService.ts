import { getRoute } from '../../utils/routingUtils';
import { toast } from '../../components/ui/use-toast';
import { EnhancedRoutePoint, RouteState, RouteObserver } from './RoutePlannerTypes';
import { smoothPath, calculateAngleBetweenPoints } from '../prediction/CurveAnalyzerUtils';
import { roadPredictor } from '../prediction/RoadPredictor';
import { vehicleStateManager } from '../VehicleStateManager';

class RoutePlannerService {
  private state: RouteState = {
    origin: null,
    destination: null,
    routePoints: [],
    enhancedPoints: [],
    routeColor: '#3B82F6'
  };
  private observers: RouteObserver[] = [];
  private readonly SMOOTHING_WINDOW = 1;

  private static instance: RoutePlannerService;
  public static getInstance(): RoutePlannerService {
    if (!RoutePlannerService.instance) {
      RoutePlannerService.instance = new RoutePlannerService();
    }
    return RoutePlannerService.instance;
  }

  private constructor() {}

  public addObserver(observer: RouteObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: RouteObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    const newState = { ...this.state };
    this.observers.forEach(observer => observer(newState));
  }

  public getState(): RouteState {
    return { ...this.state };
  }

  private enhanceRoutePoints(routePoints: [number, number][]): EnhancedRoutePoint[] {
    if (routePoints.length < 2) return [];

    const smoothedPath = smoothPath(routePoints, this.SMOOTHING_WINDOW, Infinity);

    const enhanced: EnhancedRoutePoint[] = new Array(routePoints.length);

    enhanced[0] = {
      position: routePoints[0],
      smoothPosition: [smoothedPath[0].lat, smoothedPath[0].lon],
      angleReal: 0,
      angleSmooth: 0
    };

    for (let i = 1; i < routePoints.length - 1; i++) {
      const realAngles = calculateAngleBetweenPoints(
        { lat: routePoints[i-1][0], lon: routePoints[i-1][1] },
        { lat: routePoints[i][0], lon: routePoints[i][1] },
        { lat: routePoints[i+1][0], lon: routePoints[i+1][1] }
      );

      const smoothAngles = calculateAngleBetweenPoints(
        smoothedPath[i-1],
        smoothedPath[i],
        smoothedPath[i+1]
      );

      enhanced[i] = {
        position: routePoints[i],
        smoothPosition: [smoothedPath[i].lat, smoothedPath[i].lon],
        angleReal: realAngles.angleDiff,
        angleSmooth: smoothAngles.angleDiff
      };
    }

    const lastIdx = routePoints.length - 1;
    enhanced[lastIdx] = {
      position: routePoints[lastIdx],
      smoothPosition: [smoothedPath[lastIdx].lat, smoothedPath[lastIdx].lon],
      angleReal: 0,
      angleSmooth: 0
    };

    return enhanced;
  }

  public async calculateRoute(destination: [number, number]) {
    const origin = vehicleStateManager.getState().position;
    console.log('[RoutePlannerService] Calculating route:', { origin, destination });
    
    try {
      const route = await getRoute(origin, destination);
      console.log("[RoutePlannerService] new route", route);
      if (route.length < 2) {
        console.error('[RoutePlannerService] Invalid route calculated:', route);
        toast({
          title: "Erreur",
          description: "L'itinéraire calculé est invalide",
          variant: "destructive"
        });
        return;
      }

      this.state.routePoints = route;
      this.state.enhancedPoints = this.enhanceRoutePoints(route);
      this.notifyObservers();
      
      toast({
        title: "Itinéraire calculé",
        description: "L'itinéraire a été calculé avec succès",
      });
    } catch (error) {
      console.error('[RoutePlannerService] Error calculating route:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer l'itinéraire",
        variant: "destructive"
      });
    }
  }

  public setDestination(location: [number, number], address: string) {
    console.log('[RoutePlannerService] Setting destination:', { location, address });
    this.state.destination = { location, address };
    this.calculateRoute(location);
    this.notifyObservers();
  }

  public async recalculateRoute() {
    if (!this.state.destination) {
      console.log('[RoutePlannerService] Cannot recalculate route: missing destination');
      return;
    }

    await this.calculateRoute(this.state.destination.location);
  }

  public reset() {
    console.log('[RoutePlannerService] Resetting state');
    this.state = {
      origin: null,
      destination: null,
      routePoints: [],
      enhancedPoints: [],
      routeColor: '#3B82F6'
    };
    this.notifyObservers();
  }

  public getRouteColor(): string {
    return this.state.routeColor;
  }
}

export const routePlannerService = RoutePlannerService.getInstance();