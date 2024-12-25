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
  private currentPosition: [number, number] | null = null;
  private routePoints: [number, number][] = [];

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

  public getCurrentPrediction(): RoadPrediction | null {
    return this.predictionManager.getCurrentPrediction();
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
    console.log('Notifying observers with prediction:', { currentPrediction, turns });
    this.observers.forEach(observer => observer(currentPrediction, turns));
  }

  private async updatePrediction() {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle || !this.currentPosition || this.routePoints.length < 2) {
      console.log('Skipping prediction update - missing data:', {
        hasVehicle: !!vehicle,
        hasPosition: !!this.currentPosition,
        routePointsLength: this.routePoints.length
      });
      this.notifyObservers();
      return;
    }

    const currentSpeed = vehicle.speed * 3.6;
    const settings = settingsService.getSettings();
    const roadInfo = roadInfoManager.getCurrentInfo();
    const speedLimit = roadInfo?.speedLimit ?? null;
    const isOnRoad = roadInfo?.isOnRoad ?? false;

    // Vérifier si on doit recalculer l'itinéraire
    if (this.deviationManager.shouldRecalculateRoute(
      this.currentPosition,
      this.routePoints,
      this.destination,
      settings,
      isOnRoad,
      currentSpeed
    )) {
      console.log('Vehicle is off route, recalculating...', {
        currentPosition: this.currentPosition,
        destination: this.destination,
        isOnRoad,
        currentSpeed
      });
      
      const event = new CustomEvent('recalculateRoute', {
        detail: {
          from: this.currentPosition,
          to: this.destination
        }
      });
      window.dispatchEvent(event);
      this.deviationManager.markRecalculationTime();
      return;
    }

    await roadInfoManager.updateRoadInfo(this.currentPosition);
    await this.predictionManager.updatePredictions(
      this.currentPosition,
      currentSpeed,
      this.routePoints,
      settings,
      speedLimit
    );

    this.notifyObservers();
  }

  public startUpdates(routePoints: [number, number][], destination?: [number, number]) {
    console.log('Starting road predictor updates with:', {
      routePointsLength: routePoints.length,
      destination
    });
    
    this.predictionManager.reset();
    this.deviationManager.reset();
    this.routePoints = routePoints;
    
    if (destination) {
      this.destination = destination;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePrediction();
    }, 1000);

    this.updatePrediction();
  }

  public stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.destination = null;
    this.currentPosition = null;
    this.routePoints = [];
    this.predictionManager.reset();
    this.notifyObservers();
  }

  public updatePosition(position: [number, number]) {
    this.currentPosition = position;
    this.updatePrediction();
  }
}

export const roadPredictor = new RoadPredictor();