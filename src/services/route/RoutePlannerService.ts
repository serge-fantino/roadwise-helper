import { getRoute } from '../../utils/routingUtils';
import { toast } from '../../components/ui/use-toast';
import { RouteState, RouteObserver } from './RoutePlannerTypes';

class RoutePlannerService {
  private state: RouteState = {
    origin: null,
    destination: null,
    routePoints: [],
    routeColor: '#3B82F6'
  };
  private observers: RouteObserver[] = [];

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
    console.log('[RoutePlannerService] Notifying observers with state:', this.state);
    this.observers.forEach(observer => observer({ ...this.state }));
  }

  public getState(): RouteState {
    return { ...this.state };
  }

  public async calculateRoute(origin: [number, number], destination: [number, number]) {
    console.log('[RoutePlannerService] Calculating route:', { origin, destination });
    
    try {
      const route = await getRoute(origin, destination);
      
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
    this.notifyObservers();
  }

  public async recalculateRoute() {
    if (!this.state.origin || !this.state.destination) {
      console.log('[RoutePlannerService] Cannot recalculate route: missing origin or destination');
      return;
    }

    await this.calculateRoute(this.state.origin, this.state.destination.location);
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
}

export const routePlannerService = RoutePlannerService.getInstance();