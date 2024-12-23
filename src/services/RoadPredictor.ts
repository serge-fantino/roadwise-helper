import { calculateBearing, calculateDistance, calculateAngleDifference } from '../utils/mapUtils';
import { getSpeedLimit } from '../utils/osmUtils';

interface RoadPrediction {
  distance: number;  // Distance jusqu'au prochain virage en mètres
  angle: number;     // Angle du virage en degrés
  position: [number, number]; // Position du virage
  speedLimit?: number; // Vitesse limite en km/h
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
      
      // Ajouter la distance du segment
      totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);

      // Si l'angle est supérieur à 10 degrés ou si on a dépassé 800m
      if (Math.abs(angleDiff) > 10 || totalDistance > 800) {
        curveFound = true;
        curvePosition = routePoints[i + 1];
        curveAngle = angleDiff;
      }
    }

    // Obtenir la vitesse limite
    const speedLimit = await getSpeedLimit(curvePosition[0], curvePosition[1]);

    // Mettre à jour la prédiction
    this.currentPrediction = curveFound ? {
      distance: totalDistance,
      angle: curveAngle,
      position: curvePosition,
      speedLimit: speedLimit
    } : null;

    console.log('Road prediction updated:', {
      distance: totalDistance,
      angle: curveAngle,
      position: curvePosition,
      speedLimit,
      found: curveFound
    });

    this.notifyObservers();
  }
}

// Créer une instance singleton
export const roadPredictor = new RoadPredictor();