import { getSpeedLimit } from '../utils/osmUtils';
import { settingsService } from './SettingsService';
import { TurnAnalyzer } from './prediction/TurnAnalyzer';
import { SpeedCalculator } from './prediction/SpeedCalculator';
import { RoadPrediction, PredictionObserver } from './prediction/PredictionTypes';
import { calculateDistance } from '../utils/mapUtils';

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private currentPrediction: RoadPrediction | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private turnAnalyzer: TurnAnalyzer;
  private speedCalculator: SpeedCalculator;

  constructor() {
    this.turnAnalyzer = new TurnAnalyzer();
    this.speedCalculator = new SpeedCalculator();
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

  private async updatePrediction(routePoints: [number, number][]) {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle || !routePoints || routePoints.length < 2) {
      this.currentPrediction = null;
      this.notifyObservers();
      return;
    }

    // Trouver le point le plus proche sur la route
    let closestPointIndex = 0;
    let minDistance = Infinity;
    const currentPosition = vehicle.position;
    
    for (let i = 0; i < routePoints.length; i++) {
      const distance = calculateDistance(currentPosition, routePoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }

    const settings = settingsService.getSettings();
    const turnInfo = this.turnAnalyzer.analyze(routePoints, closestPointIndex, settings);

    if (turnInfo) {
      const speedLimit = await getSpeedLimit(turnInfo.position[0], turnInfo.position[1]);
      const optimalSpeed = this.speedCalculator.calculateOptimalSpeed(turnInfo.angle, speedLimit, settings);

      this.currentPrediction = {
        ...turnInfo,
        speedLimit,
        optimalSpeed
      };
    } else {
      this.currentPrediction = null;
    }

    console.log('Road prediction updated:', this.currentPrediction);
    this.notifyObservers();
  }
}

export const roadPredictor = new RoadPredictor();