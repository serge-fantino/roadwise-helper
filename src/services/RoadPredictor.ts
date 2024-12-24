import { getSpeedLimit } from '../utils/osmUtils';
import { settingsService } from './SettingsService';
import { TurnAnalyzer } from './prediction/TurnAnalyzer';
import { SpeedCalculator } from './prediction/SpeedCalculator';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './prediction/PredictionTypes';
import { calculateDistance } from '../utils/mapUtils';
import { SpeedLimitCache } from './SpeedLimitCache';
import { RouteTracker } from './RouteTracker';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private currentPrediction: RoadPrediction | null = null;
  private turns: TurnPrediction[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private turnAnalyzer: TurnAnalyzer;
  private speedCalculator: SpeedCalculator;
  private speedLimitCache: SpeedLimitCache;
  private routeTracker: RouteTracker;
  private destination: [number, number] | null = null;

  constructor() {
    this.turnAnalyzer = new TurnAnalyzer();
    this.speedCalculator = new SpeedCalculator();
    this.speedLimitCache = new SpeedLimitCache();
    this.routeTracker = new RouteTracker();
  }

  addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.currentPrediction, this.turns));
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
    this.turns = [];
    this.notifyObservers();
  }

  private calculateRequiredDeceleration(currentSpeed: number, optimalSpeed: number, distance: number): number {
    const vx = currentSpeed / 3.6;
    const v0 = optimalSpeed / 3.6;
    return (v0 * v0 - vx * vx) / (2 * distance * 9.81);
  }

  setDestination(destination: [number, number]) {
    this.destination = destination;
  }

  private async updateTurnDistances(currentPosition: [number, number]) {
    this.turns = await Promise.all(
      this.turns.map(async (turn) => {
        const distance = calculateDistance(currentPosition, turn.position);
        return { ...turn, distance };
      })
    );
  }

  private async findNewTurns(
    routePoints: [number, number][], 
    startIndex: number, 
    currentPosition: [number, number],
    settings: Settings
  ) {
    const turnInfo = this.turnAnalyzer.analyze(routePoints, startIndex, settings);
    if (!turnInfo) return;

    const distance = calculateDistance(currentPosition, turnInfo.position);
    if (distance <= settings.predictionDistance) {
      const speedLimit = await this.speedLimitCache.getSpeedLimit(
        turnInfo.position[0],
        turnInfo.position[1]
      );
      const optimalSpeed = this.speedCalculator.calculateOptimalSpeed(
        turnInfo.angle,
        speedLimit,
        settings
      );

      this.turns.push({
        ...turnInfo,
        speedLimit,
        optimalSpeed,
        distance
      });
    }
  }

  private async updatePrediction(routePoints: [number, number][]) {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle || !routePoints || routePoints.length < 2) {
      this.currentPrediction = null;
      this.turns = [];
      this.notifyObservers();
      return;
    }

    const currentPosition = vehicle.position;
    const currentSpeed = vehicle.speed * 3.6;
    const settings = settingsService.getSettings();

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
    await this.updateTurnDistances(currentPosition);

    // Suppression des virages dépassés
    this.turns = this.turns.filter(turn => turn.distance > 0);

    // Recherche de nouveaux virages si nécessaire
    const lastTurnIndex = this.turns.length > 0 
      ? Math.max(...this.turns.map(t => t.index))
      : closestPointIndex;

    await this.findNewTurns(routePoints, lastTurnIndex, currentPosition, settings);

    // Tri des virages par distance
    this.turns.sort((a, b) => a.distance - b.distance);

    // Mise à jour de la prédiction courante avec le virage le plus proche
    if (this.turns.length > 0) {
      const nextTurn = this.turns[0];
      const requiredDeceleration = currentSpeed > (nextTurn.optimalSpeed || 0)
        ? this.calculateRequiredDeceleration(currentSpeed, nextTurn.optimalSpeed || 0, nextTurn.distance)
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
      allTurns: this.turns 
    });
    this.notifyObservers();
  }
}

export const roadPredictor = new RoadPredictor();