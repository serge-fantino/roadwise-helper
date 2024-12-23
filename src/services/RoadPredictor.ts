import { calculateBearing, calculateDistance, calculateAngleDifference } from '../utils/mapUtils';
import { getSpeedLimit } from '../utils/osmUtils';
import { settingsService } from './SettingsService';

interface RoadPrediction {
  distance: number;  // Distance jusqu'au prochain virage en mètres
  angle: number;     // Angle du virage en degrés
  position: [number, number]; // Position du virage
  speedLimit?: number; // Vitesse limite en km/h
  optimalSpeed?: number; // Vitesse optimale en km/h
}

type PredictionObserver = (prediction: RoadPrediction | null) => void;

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private currentPrediction: RoadPrediction | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.currentPrediction));
  }

  private calculateOptimalSpeed(angle: number, speedLimit: number | null): number {
    const settings = settingsService.getSettings();
    const baseSpeed = speedLimit || settings.defaultSpeed;
    
    // Angle absolu pour le calcul
    const absAngle = Math.abs(angle);
    
    if (absAngle >= settings.maxTurnAngle) {
      return settings.minTurnSpeed;
    } else {
      // Interpolation linéaire entre la vitesse max et la vitesse min
      const ratio = absAngle / settings.maxTurnAngle;
      return baseSpeed - (ratio * (baseSpeed - settings.minTurnSpeed));
    }
  }

  startUpdates(routePoints: [number, number][]) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePrediction(routePoints);
    }, 1000);

    // Initial update
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

    const currentPosition = vehicle.position;
    const currentHeading = vehicle.heading;
    const settings = settingsService.getSettings();

    // Trouver le point le plus proche sur la route
    let closestPointIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < routePoints.length; i++) {
      const distance = calculateDistance(currentPosition, routePoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }

    // Chercher le prochain virage
    let totalDistance = 0;
    let curveFound = false;
    let curvePosition: [number, number] = routePoints[closestPointIndex];
    let curveAngle = 0;

    for (let i = closestPointIndex; i < routePoints.length - 1 && !curveFound; i++) {
      const segmentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(currentHeading, segmentBearing);
      
      totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);

      if (Math.abs(angleDiff) > settings.minTurnAngle || totalDistance > 800) {
        curveFound = true;
        curvePosition = routePoints[i + 1];
        curveAngle = angleDiff;
      }
    }

    if (curveFound) {
      // Obtenir la vitesse limite
      const speedLimit = await getSpeedLimit(curvePosition[0], curvePosition[1]);
      
      // Calculer la vitesse optimale
      const optimalSpeed = this.calculateOptimalSpeed(curveAngle, speedLimit);

      // Mettre à jour la prédiction
      this.currentPrediction = {
        distance: totalDistance,
        angle: curveAngle,
        position: curvePosition,
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

// Créer une instance singleton
export const roadPredictor = new RoadPredictor();