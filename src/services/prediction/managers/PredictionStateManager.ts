import { RoadPrediction, TurnPrediction } from '../PredictionTypes';
import { TurnPredictionManager } from '../TurnPredictionManager';
import { DecelerationCalculator } from '../DecelerationCalculator';
import { Settings } from '../../SettingsService';

export class PredictionStateManager {
  private currentPrediction: RoadPrediction | null = null;
  private turnPredictionManager: TurnPredictionManager;
  private decelerationCalculator: DecelerationCalculator;
  private currentRouteIndex: number = 0;

  constructor() {
    this.turnPredictionManager = new TurnPredictionManager();
    this.decelerationCalculator = new DecelerationCalculator();
  }

  async updatePredictions(
    currentPosition: [number, number],
    currentSpeed: number,
    routePoints: [number, number][],
    settings: Settings,
    speedLimit: number | null
  ) {
    // Trouver l'index actuel sur la route
    this.currentRouteIndex = this.findClosestRouteIndex(currentPosition, routePoints);
    console.log('Current route index:', this.currentRouteIndex);

    await this.turnPredictionManager.updateTurnDistances(currentPosition);
    
    // Supprimer les virages passés en utilisant l'index
    this.turnPredictionManager.removePastTurns(this.currentRouteIndex);

    const turns = this.turnPredictionManager.getTurns();
    const lastTurnIndex = turns.length > 0 
      ? Math.max(...turns.map(t => t.index))
      : this.currentRouteIndex;

    await this.turnPredictionManager.findNewTurns(
      routePoints,
      lastTurnIndex,
      currentPosition,
      settings,
      speedLimit
    );

    this.turnPredictionManager.sortTurns();
    
    // Réinitialiser complètement si aucun virage n'est devant
    const remainingTurns = this.getTurns();
    if (remainingTurns.length === 0) {
      console.log('No more turns ahead, resetting current prediction');
      this.currentPrediction = null;
      this.turnPredictionManager = new TurnPredictionManager();
    } else {
      this.updateCurrentPrediction(currentSpeed);
    }
  }

  private findClosestRouteIndex(position: [number, number], routePoints: [number, number][]): number {
    let minDistance = Infinity;
    let closestIndex = 0;

    routePoints.forEach((point, index) => {
      const distance = this.calculateDistance(position, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const R = 6371e3; // Rayon de la terre en mètres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private updateCurrentPrediction(currentSpeed: number) {
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
    }
  }

  getCurrentPrediction(): RoadPrediction | null {
    return this.currentPrediction;
  }

  getTurns(): TurnPrediction[] {
    // Ne retourner que les virages dont l'index est supérieur à l'index actuel
    return this.turnPredictionManager.getTurns()
      .filter(turn => turn.index > this.currentRouteIndex);
  }

  reset() {
    this.turnPredictionManager = new TurnPredictionManager();
    this.currentPrediction = null;
    this.currentRouteIndex = 0;
  }
}