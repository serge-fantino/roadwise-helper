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

    // Analyser le trajet sur la distance configurée
    let sharpestTurn = {
      angle: 0,
      position: routePoints[closestPointIndex],
      distance: 0
    };
    
    let totalDistance = 0;
    let previousBearing = calculateBearing(
      routePoints[closestPointIndex], 
      routePoints[closestPointIndex + 1] || routePoints[closestPointIndex]
    );

    for (let i = closestPointIndex; i < routePoints.length - 1; i++) {
      const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
      totalDistance += segmentDistance;

      // Arrêter si on dépasse la distance de prédiction configurée
      if (totalDistance > settings.predictionDistance) {
        break;
      }

      const currentBearing = calculateBearing(routePoints[i], routePoints[i + 1]);
      const angleDiff = calculateAngleDifference(previousBearing, currentBearing);
      
      // Si c'est le virage le plus serré jusqu'à présent, on le garde
      if (Math.abs(angleDiff) > Math.abs(sharpestTurn.angle)) {
        sharpestTurn = {
          angle: angleDiff,
          position: routePoints[i + 1],
          distance: totalDistance
        };
      }

      previousBearing = currentBearing;
    }

    // Si on a trouvé un virage significatif
    if (Math.abs(sharpestTurn.angle) > settings.minTurnAngle) {
      // Obtenir la vitesse limite
      const speedLimit = await getSpeedLimit(sharpestTurn.position[0], sharpestTurn.position[1]);
      
      // Calculer la vitesse optimale
      const optimalSpeed = this.calculateOptimalSpeed(sharpestTurn.angle, speedLimit);

      // Mettre à jour la prédiction
      this.currentPrediction = {
        distance: sharpestTurn.distance,
        angle: sharpestTurn.angle,
        position: sharpestTurn.position,
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