import { Vehicle } from '../models/Vehicle';
import { TurnPredictionManager } from './prediction/TurnPredictionManager';
import { Settings } from './SettingsService';
import { RoadPrediction } from './prediction/PredictionTypes';

type PredictionObserver = (prediction: RoadPrediction | null) => void;

class PredictionService {
  private observers: PredictionObserver[] = [];
  private turnPredictionManager: TurnPredictionManager;
  private currentPrediction: RoadPrediction | null = null;
  private vehicle: Vehicle;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.turnPredictionManager = new TurnPredictionManager();
  }

  addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.currentPrediction));
    console.log('Road prediction updated:', {
      prediction: this.currentPrediction,
      turns: this.turnPredictionManager.getTurns()
    });
  }

  async updatePredictions(
    routePoints: [number, number][],
    settings: Settings,
    speedLimit: number | null = null
  ) {
    if (!routePoints || routePoints.length < 2) {
      console.log('Stopping road predictor updates - no route points');
      this.currentPrediction = null;
      this.notifyObservers();
      return;
    }

    const currentPosition = this.vehicle.position;
    const currentSpeed = this.vehicle.speed;

    // Mettre à jour les distances des virages existants
    await this.turnPredictionManager.updateTurnDistances(currentPosition);

    // Trouver l'index actuel sur la route
    const currentIndex = this.findClosestRouteIndex(currentPosition, routePoints);

    // Supprimer les virages passés
    this.turnPredictionManager.removePastTurns(currentIndex);

    const turns = this.turnPredictionManager.getTurns();
    const lastTurnIndex = turns.length > 0 
      ? Math.max(...turns.map(t => t.index))
      : currentIndex;

    // Chercher de nouveaux virages
    await this.turnPredictionManager.findNewTurns(
      routePoints,
      lastTurnIndex,
      currentPosition,
      settings,
      currentSpeed,
      speedLimit
    );

    // Trier les virages par distance
    this.turnPredictionManager.sortTurns();

    // Mettre à jour la prédiction actuelle
    this.updateCurrentPrediction();
    this.notifyObservers();
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

  private updateCurrentPrediction() {
    const nextTurn = this.turnPredictionManager.getNextTurn();
    
    if (nextTurn) {
      const requiredDeceleration = this.vehicle.speed > (nextTurn.optimalSpeed || 0)
        ? (this.vehicle.speed - nextTurn.optimalSpeed) / (nextTurn.distance || 1)
        : null;

      this.currentPrediction = {
        ...nextTurn,
        requiredDeceleration
      };
    }
  }
}

// Create and export the singleton instance
const vehicle = (window as any).globalVehicle;
export const predictionService = vehicle ? new PredictionService(vehicle) : null;
