import { settingsService } from '../SettingsService';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './PredictionTypes';
import { RouteTracker } from '../RouteTracker';
import { roadInfoManager } from '../roadInfo/RoadInfoManager';
import { RouteDeviationManager } from './managers/RouteDeviationManager';
import { PredictionStateManager } from './managers/PredictionStateManager';
import { routePlannerService } from '../route/RoutePlannerService';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private routeTracker: RouteTracker;
  private updateInterval: NodeJS.Timeout | null = null;
  private deviationManager: RouteDeviationManager;
  private predictionManager: PredictionStateManager;
  private currentPosition: [number, number] | null = null;

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


    // Observer le RoutePlannerService
    routePlannerService.addObserver((state) => {
      // Démarrer/arrêter les prédictions automatiquement
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

  private notifyObservers() {
    const currentPrediction = this.predictionManager.getCurrentPrediction();
    const turns = this.predictionManager.getTurns();
    console.log('Notifying observers with prediction:', { currentPrediction, turns });
    this.observers.forEach(observer => observer(currentPrediction, turns));
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

    // Vérifier si on doit recalculer l'itinéraire seulement si la fonctionnalité est activée
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
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Forcer une première mise à jour immédiate
    this.updatePrediction();

    this.updateInterval = setInterval(() => {
      this.updatePrediction();
    }, 1000);
  }

  public stopUpdates() {
    console.log('Stopping road predictor updates');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentPosition = null;
    this.predictionManager.reset();
    this.notifyObservers();
  }

  public updatePosition(position: [number, number]) {
    console.log('Updating position in RoadPredictor:', position);
    this.currentPosition = position;
    this.updatePrediction();
  }
}

export const roadPredictor = new RoadPredictor();