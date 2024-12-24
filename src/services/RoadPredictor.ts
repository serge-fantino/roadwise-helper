import { settingsService } from './SettingsService';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './prediction/PredictionTypes';
import { RouteTracker } from './RouteTracker';
import { roadInfoManager } from './roadInfo/RoadInfoManager';
import { RouteDeviationManager } from './prediction/managers/RouteDeviationManager';
import { PredictionStateManager } from './prediction/managers/PredictionStateManager';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private routeTracker: RouteTracker;
  private updateInterval: NodeJS.Timeout | null = null;
  private destination: [number, number] | null = null;
  private deviationManager: RouteDeviationManager;
  private predictionManager: PredictionStateManager;

  constructor() {
    this.routeTracker = new RouteTracker();
    this.deviationManager = new RouteDeviationManager(this.routeTracker);
    this.predictionManager = new PredictionStateManager();

    roadInfoManager.addObserver((roadInfo) => {
      const currentPrediction = this.predictionManager.getCurrentPrediction();
      if (currentPrediction) {
        currentPrediction.speedLimit = roadInfo.speedLimit;
      }
    });
  }

  public addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    const currentPrediction = this.predictionManager.getCurrentPrediction();
    const turns = this.predictionManager.getTurns();
    this.observers.forEach(observer => observer(currentPrediction, turns));
  }

  private async updatePrediction(routePoints: [number, number][]) {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle || !routePoints || routePoints.length < 2) {
      this.notifyObservers();
      return;
    }

    const currentPosition = vehicle.position;
    const currentSpeed = vehicle.speed * 3.6;
    const settings = settingsService.getSettings();
    const roadInfo = roadInfoManager.getCurrentInfo();
    const speedLimit = roadInfo?.speedLimit ?? null;
    const isOnRoad = roadInfo?.isOnRoad ?? false;

    // Vérifier si on doit recalculer l'itinéraire
    if (this.deviationManager.shouldRecalculateRoute(
      currentPosition,
      routePoints,
      this.destination,
      settings,
      isOnRoad,
      currentSpeed
    )) {
      console.log('Vehicle is off route, recalculating...', {
        currentPosition,
        destination: this.destination,
        isOnRoad,
        currentSpeed
      });
      
      const event = new CustomEvent('recalculateRoute', {
        detail: {
          from: currentPosition,
          to: this.destination
        }
      });
      window.dispatchEvent(event);
      this.deviationManager.markRecalculationTime();
      return;
    }

    await roadInfoManager.updateRoadInfo(currentPosition);
    await this.predictionManager.updatePredictions(
      currentPosition,
      currentSpeed,
      routePoints,
      settings,
      speedLimit
    );

    this.notifyObservers();
  }

  public startUpdates(routePoints: [number, number][], destination?: [number, number]) {
    this.predictionManager.reset();
    this.deviationManager.reset();
    
    if (destination) {
      this.destination = destination;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePrediction(routePoints);
    }, 1000);

    this.updatePrediction(routePoints);
  }

  public stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.destination = null;
    this.predictionManager.reset();
    this.notifyObservers();
  }
}

export const roadPredictor = new RoadPredictor();