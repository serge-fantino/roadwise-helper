import { Vehicle } from '../models/Vehicle';
import { PredictionStateManager } from './prediction/managers/PredictionStateManager';
import { Settings } from './SettingsService';
import { RoadPrediction } from './prediction/PredictionTypes';

type PredictionObserver = (prediction: RoadPrediction | null) => void;

export class PredictionService {
  private observers: PredictionObserver[] = [];
  private stateManager: PredictionStateManager;
  private updateInterval: NodeJS.Timeout | null = null;
  private routePoints: [number, number][] | null = null;
  private settings: Settings;
  private speedLimit: number | null = null;
  private currentPosition: [number, number] | null = null;

  constructor(
    private vehicle: Vehicle,
    settings: Settings
  ) {
    this.stateManager = new PredictionStateManager();
    this.settings = settings;
  }

  setRoutePoints(points: [number, number][]): void {
    this.routePoints = points;
  }

  setSpeedLimit(limit: number | null): void {
    this.speedLimit = limit;
  }

  addObserver(observer: PredictionObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: PredictionObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  startUpdates(position: [number, number]): void {
    if (this.updateInterval) {
      this.stopUpdates();
    }

    this.currentPosition = position;
    this.updatePrediction();
    this.updateInterval = setInterval(() => {
      this.updatePrediction();
    }, 1000);
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updatePrediction(): Promise<void> {
    if (!this.routePoints || !this.currentPosition) {
      this.notifyObservers(null);
      return;
    }

    await this.stateManager.updatePredictions(
      this.currentPosition,
      this.vehicle.speed,
      this.routePoints,
      this.settings,
      this.speedLimit
    );

    this.notifyObservers(this.stateManager.getCurrentPrediction());
  }

  private notifyObservers(prediction: RoadPrediction | null): void {
    this.observers.forEach(observer => observer(prediction));
  }

  reset(): void {
    this.stateManager.reset();
    this.routePoints = null;
    this.speedLimit = null;
    this.currentPosition = null;
    this.notifyObservers(null);
  }
}

// Création de l'instance singleton
const vehicle = (window as any).globalVehicle;
const settings = (window as any).globalSettings;
export const predictionService = vehicle ? new PredictionService(vehicle, settings) : null;