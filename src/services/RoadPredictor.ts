import { getSpeedLimit } from '../utils/osmUtils';
import { settingsService } from './SettingsService';
import { TurnAnalyzer } from './prediction/TurnAnalyzer';
import { SpeedCalculator } from './prediction/SpeedCalculator';
import { RoadPrediction, PredictionObserver } from './prediction/PredictionTypes';
import { calculateDistance } from '../utils/mapUtils';
import { SpeedLimitCache } from './SpeedLimitCache';
import { RouteTracker } from './RouteTracker';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private currentPrediction: RoadPrediction | null = null;
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
    this.observers.forEach(observer => observer(this.currentPrediction));
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

  private calculateRequiredDeceleration(currentSpeed: number, optimalSpeed: number, distance: number): number {
    // Conversion km/h -> m/s
    const vx = currentSpeed / 3.6;
    const v0 = optimalSpeed / 3.6;
    
    // Calcul de la décélération en g
    return (v0 * v0 - vx * vx) / (2 * distance * 9.81);
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

    // Trouver le point le plus proche sur la route
    const { index: closestPointIndex, distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    // Vérifier si on est trop loin de la route
    if (this.routeTracker.isOffRoute(deviationDistance, settings) && this.destination) {
      // Émettre un événement pour demander un recalcul d'itinéraire
      const event = new CustomEvent('recalculateRoute', {
        detail: {
          from: currentPosition,
          to: this.destination
        }
      });
      window.dispatchEvent(event);
      return;
    }

    // Continuer avec l'analyse des virages...
    const turnInfo = this.turnAnalyzer.analyze(routePoints, closestPointIndex, settings);

    if (turnInfo) {
      const speedLimit = await this.speedLimitCache.getSpeedLimit(
        turnInfo.position[0], 
        turnInfo.position[1]
      );
      const optimalSpeed = this.speedCalculator.calculateOptimalSpeed(
        turnInfo.angle, 
        speedLimit, 
        settings
      );

      const requiredDeceleration = currentSpeed > optimalSpeed 
        ? this.calculateRequiredDeceleration(currentSpeed, optimalSpeed, turnInfo.distance)
        : null;

      this.currentPrediction = {
        ...turnInfo,
        speedLimit,
        optimalSpeed,
        requiredDeceleration
      };
    } else {
      this.currentPrediction = null;
    }

    console.log('Road prediction updated:', this.currentPrediction);
    this.notifyObservers();
  }
}

export const roadPredictor = new RoadPredictor();