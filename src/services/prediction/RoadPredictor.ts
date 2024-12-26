import { settingsService } from '../SettingsService';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './PredictionTypes';
import { RouteTracker } from '../RouteTracker';
import { roadInfoManager } from '../roadInfo/RoadInfoManager';
import { RouteDeviationManager } from './managers/RouteDeviationManager';
import { PredictionStateManager } from './managers/PredictionStateManager';
import { routePlannerService } from '../route/RoutePlannerService';

type StateObserver = (isActive: boolean) => void;

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private stateObservers: StateObserver[] = [];
  private routeTracker: RouteTracker;
  private updateInterval: NodeJS.Timeout | null = null;
  private deviationManager: RouteDeviationManager;
  private predictionManager: PredictionStateManager;
  private currentPosition: [number, number] | null = null;
  private _isActive: boolean = false;

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

    routePlannerService.addObserver((state) => {
      if (state.routePoints.length > 1) {
        this.startUpdates();
      } else {
        this.stopUpdates();
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

  public addStateObserver(observer: StateObserver) {
    this.stateObservers.push(observer);
    // Notify the new observer of the current state immediately
    observer(this._isActive);
  }

  public removeStateObserver(observer: StateObserver) {
    this.stateObservers = this.stateObservers.filter(obs => obs !== observer);
  }

  private notifyStateObservers() {
    console.log('Notifying state observers, active:', this._isActive);
    this.stateObservers.forEach(observer => observer(this._isActive));
  }

  private notifyObservers() {
    const currentPrediction = this.predictionManager.getCurrentPrediction();
    const turns = this.predictionManager.getTurns();
    console.log('Notifying observers with prediction:', { currentPrediction, turns });
    this.observers.forEach(observer => observer(currentPrediction, turns));
  }

  public isActive(): boolean {
    return this._isActive;
  }

  private async updatePrediction() {
    const vehicle = (window as any).globalVehicle;
    const routeState = routePlannerService.getState();
    const settings = settingsService.getSettings();
    
    if (!vehicle || !this.currentPosition || routeState.routePoints.length < 2) {
      console.log('Skipping prediction update - missing data:', {
        hasVehicle: !!vehicle,
        hasPosition: !!this.currentPosition,
        routePointsLength: routeState.routePoints.length,
        currentPosition: this.currentPosition
      });
      this.notifyObservers();
      return;
    }

    const currentSpeed = vehicle.speed * 3.6;
    const roadInfo = roadInfoManager.getCurrentInfo();
    const speedLimit = roadInfo?.speedLimit ?? null;
    const isOnRoad = roadInfo?.isOnRoad ?? false;

    if (settings.enableAutoRecalculate && this.deviationManager.shouldRecalculateRoute(
      this.currentPosition,
      routeState.routePoints,
      routeState.destination?.location,
      settings,
      isOnRoad,
      currentSpeed
    )) {
      console.log('Vehicle is off route, recalculating...', {
        currentPosition: this.currentPosition,
        destination: routeState.destination?.location,
        isOnRoad,
        currentSpeed,
        autoRecalculateEnabled: settings.enableAutoRecalculate
      });
      
      await routePlannerService.recalculateRoute();
      this.deviationManager.markRecalculationTime();
      return;
    }

    await roadInfoManager.updateRoadInfo(this.currentPosition);
    await this.predictionManager.updatePredictions(
      this.currentPosition,
      currentSpeed,
      routeState.routePoints,
      routeState.enhancedPoints,
      settings,
      speedLimit
    );

    this.notifyObservers();
  }

  public startUpdates() {
    console.log('Starting road predictor updates');
    
    this.predictionManager.reset();
    this.deviationManager.reset();
    this._isActive = true;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Force an immediate first update
    this.updatePrediction();

    this.updateInterval = setInterval(() => {
      this.updatePrediction();
    }, 1000);

    this.notifyStateObservers();
  }

  public stopUpdates() {
    console.log('Stopping road predictor updates');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentPosition = null;
    this._isActive = false;
    this.predictionManager.reset();
    this.notifyObservers();
    this.notifyStateObservers();
  }

  public updatePosition(position: [number, number]) {
    console.log('Updating position in RoadPredictor:', position);
    this.currentPosition = position;
    if (this._isActive) {
      this.updatePrediction();
    }
  }
}

export const roadPredictor = new RoadPredictor();
