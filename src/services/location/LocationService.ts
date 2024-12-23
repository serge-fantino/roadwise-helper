import { Vehicle } from '../../models/Vehicle';
import { createSimulationService } from '../simulation/SimulationService';

type LocationMode = 'gps' | 'simulation';
type LocationObserver = (position: [number, number], speed: number) => void;

export class LocationService {
  private static instance: LocationService | null = null;
  private mode: LocationMode = 'gps';
  private observers: LocationObserver[] = [];
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private simulationService: ReturnType<typeof createSimulationService>;
  private vehicle: Vehicle;

  private constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.simulationService = createSimulationService(vehicle);
  }

  public static getInstance(vehicle?: Vehicle): LocationService {
    if (!LocationService.instance && vehicle) {
      LocationService.instance = new LocationService(vehicle);
    }
    return LocationService.instance!;
  }

  public addObserver(observer: LocationObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: LocationObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers(position: [number, number], speed: number) {
    console.log('[LocationService] Speed update:', { position, speed, mode: this.mode });
    this.observers.forEach(observer => observer(position, speed));
  }

  public setMode(mode: LocationMode) {
    if (this.mode === mode) return;
    
    console.log('[LocationService] Switching location mode to:', mode);
    this.stopUpdates();
    this.mode = mode;
    this.startUpdates();
  }

  public startUpdates(routePoints?: [number, number][]) {
    if (this.mode === 'gps') {
      this.startGPSUpdates();
    } else {
      this.startSimulationUpdates(routePoints);
    }
  }

  public stopUpdates() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.simulationService.stopSimulation();
  }

  private startGPSUpdates() {
    if (!('geolocation' in navigator)) {
      console.error('[LocationService] Geolocation is not supported');
      return;
    }

    const handlePosition = (pos: GeolocationPosition) => {
      const position: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      const speed = pos.coords.speed || 0;
      console.log('[LocationService] GPS update:', { position, speed });
      this.vehicle.update(position, speed);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('[LocationService] GPS Error:', error.message);
    };

    this.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  private startSimulationUpdates(routePoints?: [number, number][]) {
    if (!routePoints || routePoints.length < 2) {
      console.error('[LocationService] Cannot start simulation without route points');
      return;
    }

    this.simulationService.startSimulation(routePoints);
  }
}