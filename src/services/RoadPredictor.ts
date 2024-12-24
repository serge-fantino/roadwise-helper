import { settingsService, Settings } from './SettingsService';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './prediction/PredictionTypes';
import { RouteTracker } from './RouteTracker';
import { TurnPredictionManager } from './prediction/TurnPredictionManager';
import { DecelerationCalculator } from './prediction/DecelerationCalculator';
import { roadInfoService } from './roadInfo';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private currentPrediction: RoadPrediction | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private routeTracker: RouteTracker;
  private turnPredictionManager: TurnPredictionManager;
  private decelerationCalculator: DecelerationCalculator;
  private destination: [number, number] | null = null;

  constructor() {
    this.routeTracker = new RouteTracker();
    this.turnPredictionManager = new TurnPredictionManager();
    this.decelerationCalculator = new DecelerationCalculator();
  }

  addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    const turns = this.turnPredictionManager.getTurns();
    this.observers.forEach(observer => observer(this.currentPrediction, turns));
  }

  startUpdates(routePoints: [number, number][]) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePrediction(routePoints);
    }, 1000);

    this.updatePrediction(routePoints);
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentPrediction = null;
    this.notifyObservers();
  }

  setDestination(destination: [number, number]) {
    this.destination = destination;
  }

  private async updatePrediction(routePoints: [number, number][]) {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle || !routePoints || routePoints.length < 2) {
      this.currentPrediction = null;
      this.notifyObservers();
      return;
    }

    const currentPosition = vehicle.position;
    const currentSpeed = vehicle.speed * 3.6;
    const settings = settingsService.getSettings();

    // Récupérer la limite de vitesse actuelle
    let speedLimit = null;
    try {
      speedLimit = await roadInfoService.getSpeedLimit(currentPosition[0], currentPosition[1]);
      console.log('Speed limit for prediction:', speedLimit);
    } catch (error) {
      console.error('Error getting speed limit for prediction:', error);
    }

    const { index: closestPointIndex, distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    if (this.routeTracker.isOffRoute(deviationDistance, settings) && this.destination) {
      const event = new CustomEvent('recalculateRoute', {
        detail: {
          from: currentPosition,
          to: this.destination
        }
      });
      window.dispatchEvent(event);
      return;
    }

    // Mise à jour des distances pour les virages existants
    await this.turnPredictionManager.updateTurnDistances(currentPosition);

    // Suppression des virages dépassés
    this.turnPredictionManager.removePastTurns();

    // Recherche de nouveaux virages si nécessaire
    const turns = this.turnPredictionManager.getTurns();
    const lastTurnIndex = turns.length > 0 
      ? Math.max(...turns.map(t => t.index))
      : closestPointIndex;

    await this.turnPredictionManager.findNewTurns(
      routePoints,
      lastTurnIndex,
      currentPosition,
      settings,
      speedLimit // Passer la limite de vitesse au gestionnaire de virages
    );

    // Tri des virages par distance
    this.turnPredictionManager.sortTurns();

    // Mise à jour de la prédiction courante avec le virage le plus proche
    const nextTurn = this.turnPredictionManager.getNextTurn();
    if (nextTurn) {
      const requiredDeceleration = currentSpeed > (nextTurn.optimalSpeed || 0)
        ? this.decelerationCalculator.calculateRequiredDeceleration(
            currentSpeed,
            nextTurn.optimalSpeed || 0,
            nextTurn.distance
          )
        : null;

      this.currentPrediction = {
        ...nextTurn,
        requiredDeceleration
      };
    } else {
      this.currentPrediction = null;
    }

    console.log('Road prediction updated:', { 
      currentPrediction: this.currentPrediction,
      allTurns: this.turnPredictionManager.getTurns(),
      speedLimit
    });
    this.notifyObservers();
  }
}

export const roadPredictor = new RoadPredictor();