import { RoadPrediction, TurnPrediction } from '../PredictionTypes';
import { TurnPredictionManager } from '../TurnPredictionManager';
import { DecelerationCalculator } from '../DecelerationCalculator';
import { RouteTracker } from '../../RouteTracker';
import { Settings } from '../../SettingsService';

export class PredictionStateManager {
  private currentPrediction: RoadPrediction | null = null;
  private turnPredictionManager: TurnPredictionManager;
  private decelerationCalculator: DecelerationCalculator;
  private routeTracker: RouteTracker;

  constructor() {
    this.turnPredictionManager = new TurnPredictionManager();
    this.decelerationCalculator = new DecelerationCalculator();
    this.routeTracker = new RouteTracker();
  }

  async updatePredictions(
    currentPosition: [number, number],
    currentSpeed: number,
    routePoints: [number, number][],
    settings: Settings,
    speedLimit: number | null
  ): Promise<void> {
    if (!routePoints || routePoints.length < 2) {
      this.currentPrediction = null;
      return;
    }

    // Trouver l'index actuel sur la route
    const { index: currentIndex, distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    // Vérifier si on est trop loin de la route
    if (this.routeTracker.isOffRoute(deviationDistance, settings)) {
      this.currentPrediction = null;
      return;
    }

    // Mettre à jour les virages existants
    await this.turnPredictionManager.updateTurnDistances(currentPosition);
    this.turnPredictionManager.removePastTurns(currentIndex);

    // Chercher de nouveaux virages si nécessaire
    const turns = this.turnPredictionManager.getTurns();
    const lastTurnIndex = turns.length > 0 
      ? Math.max(...turns.map(t => t.index))
      : currentIndex;

    await this.turnPredictionManager.findNewTurns(
      routePoints,
      lastTurnIndex,
      currentPosition,
      settings,
      currentSpeed,
      speedLimit
    );

    this.turnPredictionManager.sortTurns();
    this.updateCurrentPrediction(currentSpeed);
  }

  private updateCurrentPrediction(currentSpeed: number): void {
    const nextTurn = this.turnPredictionManager.getNextTurn();
    
    if (!nextTurn) {
      // Créer une prédiction "ligne droite"
      this.currentPrediction = this.createStraightLinePrediction();
      return;
    }

    const requiredDeceleration = this.calculateDeceleration(currentSpeed, nextTurn);
    this.currentPrediction = { ...nextTurn, requiredDeceleration };
  }

  private calculateDeceleration(currentSpeed: number, turn: TurnPrediction): number | null {
    if (currentSpeed <= (turn.optimalSpeed || 0)) {
      return null;
    }
    return this.decelerationCalculator.calculateRequiredDeceleration(
      currentSpeed,
      turn.optimalSpeed || 0,
      turn.distance
    );
  }

  private createStraightLinePrediction(): RoadPrediction {
    return {
      distance: 1000,
      angle: null,
      position: [0, 0], // Sera mis à jour par le service
      index: 0,
      speedLimit: null,
      optimalSpeed: 130,
      requiredDeceleration: null,
      curvePoints: []
    };
  }

  getCurrentPrediction(): RoadPrediction | null {
    return this.currentPrediction;
  }

  getTurns(): TurnPrediction[] {
    return this.turnPredictionManager.getTurns();
  }

  reset(): void {
    this.turnPredictionManager = new TurnPredictionManager();
    this.currentPrediction = null;
  }
}