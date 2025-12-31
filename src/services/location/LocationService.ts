import { createSimulationService } from '../simulation/SimulationService';
import { createSimulationServiceV2 } from '../simulation/SimulationServiceV2';
import { settingsService } from '../SettingsService';
import { vehicleStateManager } from '../VehicleStateManager';
import { tripService } from '../TripService';

type LocationMode = 'gps' | 'simulation';
type LocationObserver = (position: [number, number], speed: number, accelerationInG: number) => void;

export class LocationService {
  private static instance: LocationService | null = null;
  private mode: LocationMode = 'gps';
  private observers: LocationObserver[] = [];
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private simulationService: ReturnType<typeof createSimulationService>;
  private simulationServiceV2: ReturnType<typeof createSimulationServiceV2>;
  private lastSpeed: number = 0;
  private lastSpeedUpdateTime: number = null;
  private lastAccelerationInG: number = 0;

  private constructor() {
    // Initialiser les services de simulation avec le nouveau gestionnaire d'état
    this.simulationService = createSimulationService();
    this.simulationServiceV2 = createSimulationServiceV2();
    this.startUpdates();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public addObserver(observer: LocationObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: LocationObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers(position: [number, number], speed: number, accelerationInG: number) {
    console.log('[LocationService] Speed update:', { position, speed, mode: this.mode });
    this.observers.forEach(observer => observer(position, speed, accelerationInG));
  }

  private calculateAccelerationInG(currentSpeed: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastSpeedUpdateTime) / 1000; // Convert to seconds
    
    // Si le delta temps est trop petit, on évite de calculer pour éviter les erreurs
    if (deltaTime < 0.1) {
      return 0;
    }

    // Calcul de l'accélération en m/s²
    const acceleration = (currentSpeed - this.lastSpeed) / deltaTime;
    
    // Conversion en g (1g = 9.81 m/s²)
    const accelerationInG = (this.lastAccelerationInG + acceleration / 9.81) / 2; // Moyenne des deux dernières valeurs pour lisser les données

    console.log('[LocationService] Acceleration calculated:', {
      currentSpeed,
      lastSpeed: this.lastSpeed,
      deltaTime,
      accelerationInG
    });

    // Mise à jour des valeurs pour le prochain calcul
    this.lastSpeed = currentSpeed;
    this.lastSpeedUpdateTime = currentTime;
    this.lastAccelerationInG = accelerationInG;

    return accelerationInG;
  }

  private handlePositionUpdate(position: [number, number], speed: number, accelerationInG: number) {
    // Mettre à jour l'état du véhicule via le gestionnaire
    vehicleStateManager.updateState({
      position,
      speed,
      acceleration: accelerationInG * 9.81 // Convertir g en m/s²
    });
    
    // Ajouter la position à l'historique
    tripService.addPosition(position);
    
    // Notifier les observateurs existants
    this.notifyObservers(position, speed, accelerationInG);
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
    this.simulationServiceV2.stopSimulation();
  }

  private startSimulationUpdates(routePoints?: [number, number][]) {
    if (!routePoints || routePoints.length < 2) {
      console.error('[LocationService] Cannot start simulation without route points');
      return;
    }

    const settings = settingsService.getSettings();
    if (settings.simulatorVersion === 'v2') {
      this.simulationServiceV2.startSimulation(routePoints);
    } else {
      this.simulationService.startSimulation(routePoints);
    }
  }

  private startGPSUpdates() {
    if (!('geolocation' in navigator)) {
      console.error('[LocationService] Geolocation is not supported');
      return;
    }

    const handlePosition = (pos: GeolocationPosition) => {
      console.log('[LocationService] GPS Position:', pos);
      const position: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      const speed = pos.coords.speed || 0;
      const accelerationInG = this.calculateAccelerationInG(speed);
      this.handlePositionUpdate(position, speed, accelerationInG);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('[LocationService] GPS Error:', error.message);
    };

    this.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  }
}