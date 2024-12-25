import { getRoute } from '../utils/routingUtils';
import { toast } from '../components/ui/use-toast';
import { RouteState, RouteObserver } from './route/RoutePlannerTypes';

class RoutePlannerService {
  private state: RouteState = {
    origin: null,
    destination: null,
    routePoints: [],
    routeColor: '#3B82F6' // Default blue color
  };
  private observers: RouteObserver[] = [];

  // Singleton instance
  private static instance: RoutePlannerService;
  public static getInstance(): RoutePlannerService {
    if (!RoutePlannerService.instance) {
      RoutePlannerService.instance = new RoutePlannerService();
    }
    return RoutePlannerService.instance;
  }

  private constructor() {}

  // Observer pattern
  public addObserver(observer: RouteObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: RouteObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    console.log('[RoutePlannerService] Notifying observers with state:', this.state);
    this.observers.forEach(observer => observer({ ...this.state }));
  }

  // State management
  public getState(): RouteState {
    return { ...this.state };
  }

  public setOrigin(origin: [number, number]) {
    console.log('[RoutePlannerService] Setting origin:', origin);
    this.state.origin = origin;
    if (this.state.destination) {
      this.calculateRoute();
    }
    this.notifyObservers();
  }

  public setDestination(location: [number, number], address: string) {
    console.log('[RoutePlannerService] Setting destination:', { location, address });
    this.state.destination = { location, address };
    if (this.state.origin) {
      this.calculateRoute();
    }
    this.notifyObservers();
  }

  public async calculateRoute() {
    if (!this.state.origin || !this.state.destination) {
      console.log('[RoutePlannerService] Cannot calculate route: missing origin or destination');
      return;
    }

    try {
      console.log('[RoutePlannerService] Calculating route from', this.state.origin, 'to', this.state.destination.location);
      const route = await getRoute(this.state.origin, this.state.destination.location);
      
      if (route.length < 2) {
        console.error('[RoutePlannerService] Invalid route calculated:', route);
        toast({
          title: "Erreur",
          description: "L'itinéraire calculé est invalide",
          variant: "destructive"
        });
        return;
      }

      console.log('[RoutePlannerService] Route calculated successfully:', route);
      this.state.routePoints = route;
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

  public async recalculateRoute() {
    console.log('[RoutePlannerService] Recalculating route...');
    await this.calculateRoute();
  }

  public reset() {
    console.log('[RoutePlannerService] Resetting state');
    this.state = {
      origin: null,
      destination: null,
      routePoints: [],
      routeColor: '#3B82F6'
    };
    this.notifyObservers();
  }

  public getRouteColor(): string {
    return this.state.routeColor;
  }
}

// Export singleton instance
export const routePlannerService = RoutePlannerService.getInstance();