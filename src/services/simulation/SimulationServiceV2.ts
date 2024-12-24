import { Vehicle } from '../../models/Vehicle';
import { calculateDistance, calculateBearing } from '../../utils/mapUtils';

const GRAVITY = 9.81; // m/s²
const ACCELERATION_FACTOR = 0.2; // 0.2g
const DECELERATION_FACTOR = 0.1; // 0.1g
const TIME_STEP = 1; // 1 seconde
const METERS_PER_DEGREE_LAT = 111111; // Approximation à l'équateur

export class SimulationServiceV2 {
  private intervalId: NodeJS.Timeout | null = null;
  private currentRouteIndex = 0;
  private routePoints: [number, number][] = [];
  private vehicle: Vehicle;
  private lastUpdateTime: number = 0;
  private currentSpeed: number = 0; // m/s
  private isIdle: boolean = true;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
  }

  private calculateHeading(from: [number, number], to: [number, number]): [number, number] {
    // Conversion approximative en mètres (système cartésien local)
    const deltaLat = (to[0] - from[0]) * METERS_PER_DEGREE_LAT;
    const deltaLon = (to[1] - from[1]) * METERS_PER_DEGREE_LAT * Math.cos(from[0] * Math.PI / 180);
    
    // Calcul de la distance totale pour normaliser
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
    
    if (distance === 0) return [0, 0];
    
    // Vecteur direction normalisé
    const direction: [number, number] = [deltaLat / distance, deltaLon / distance];
    
    console.log('[SimulationV2] Heading calculation:', {
      from,
      to,
      deltaLat,
      deltaLon,
      distance,
      direction
    });
    
    return direction;
  }

  private calculateNextPosition(currentPosition: [number, number], heading: [number, number], distance: number): [number, number] {
    // Conversion de la distance en degrés
    const deltaLat = (heading[0] * distance) / METERS_PER_DEGREE_LAT;
    const deltaLon = (heading[1] * distance) / (METERS_PER_DEGREE_LAT * Math.cos(currentPosition[0] * Math.PI / 180));
    
    return [
      currentPosition[0] + deltaLat,
      currentPosition[1] + deltaLon
    ];
  }

  private findNextValidTarget(currentPosition: [number, number], distanceToTravel: number): number {
    let accumulatedDistance = 0;
    let targetIndex = this.currentRouteIndex + 1;

    while (targetIndex < this.routePoints.length) {
      const nextPoint = this.routePoints[targetIndex];
      accumulatedDistance += calculateDistance(
        targetIndex === this.currentRouteIndex + 1 ? currentPosition : this.routePoints[targetIndex - 1],
        nextPoint
      );

      if (accumulatedDistance > distanceToTravel) {
        break;
      }
      targetIndex++;
    }

    // S'assurer qu'on ne dépasse pas la fin du trajet
    return Math.min(targetIndex, this.routePoints.length - 1);
  }

  private updateVehicleState() {
    // Si le véhicule est idle et la vitesse est nulle, on ne fait rien
    if (this.isIdle && this.currentSpeed === 0) {
      return;
    }

    if (this.currentRouteIndex >= this.routePoints.length - 1) {
      console.log('[SimulationV2] End of route reached');
      this.stopSimulation();
      return;
    }

    const currentPosition = this.vehicle.position;
    const distanceToTravel = this.currentSpeed * TIME_STEP;
    
    // Trouver le prochain point cible valide en fonction de la distance à parcourir
    const targetIndex = this.findNextValidTarget(currentPosition, distanceToTravel);
    const nextPosition = this.routePoints[targetIndex];
    
    console.log('[SimulationV2] Current state:', {
      currentRouteIndex: this.currentRouteIndex,
      targetIndex,
      currentPosition,
      nextPosition,
      currentSpeed: this.currentSpeed,
      distanceToTravel
    });

    const heading = this.calculateHeading(currentPosition, nextPosition);

    // Obtenir la vitesse optimale et la décélération requise du RoadPredictor seulement si on n'est pas idle
    let optimalSpeed = 90; // 90 km/h par défaut
    let requiredDeceleration = null;

    if (!this.isIdle) {
      const prediction = (window as any).roadPredictor?.getCurrentPrediction();
      optimalSpeed = prediction?.optimalSpeed || 90;
      requiredDeceleration = prediction?.requiredDeceleration || null;
    }

    // Convertir la vitesse optimale de km/h en m/s
    const optimalSpeedMS = optimalSpeed / 3.6;

    // Calculer l'accélération
    let acceleration = 0;
    if (this.currentSpeed < optimalSpeedMS) {
      // Accélération
      acceleration = GRAVITY * ACCELERATION_FACTOR;
    } else if (this.currentSpeed > optimalSpeedMS) {
      // Décélération
      const baseDeceleration = GRAVITY * DECELERATION_FACTOR;
      const predictionDeceleration = requiredDeceleration ? GRAVITY * Math.abs(requiredDeceleration) : 0;
      acceleration = -Math.max(baseDeceleration, predictionDeceleration);
    }

    // Mettre à jour la vitesse
    this.currentSpeed = Math.max(0, this.currentSpeed + acceleration * TIME_STEP);

    // Calculer la nouvelle position
    const newPosition = this.calculateNextPosition(currentPosition, heading, distanceToTravel);

    console.log('[SimulationV2] Movement update:', {
      heading,
      acceleration,
      distanceToTravel,
      newPosition,
      newSpeed: this.currentSpeed
    });

    // Mettre à jour l'index de route si nécessaire
    if (targetIndex > this.currentRouteIndex) {
      console.log('[SimulationV2] Skipping points, updating route index from', this.currentRouteIndex, 'to', targetIndex);
      this.currentRouteIndex = targetIndex;
    }

    // Mettre à jour le véhicule
    this.vehicle.update(newPosition, this.currentSpeed);
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routePoints = routePoints;
    this.currentRouteIndex = 0;
    this.lastUpdateTime = Date.now();
    this.currentSpeed = 0;
    this.isIdle = false;

    console.log('[SimulationV2] Starting simulation with route points:', routePoints);

    if (routePoints.length > 0) {
      // Initialisation avec la première position
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        this.updateVehicleState();
      }, 1000); // Mise à jour toutes les secondes
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Reset speed to 0 when stopping
    if (this.vehicle) {
      this.vehicle.update(this.vehicle.position, 0);
    }
    this.isIdle = true;
    console.log('[SimulationV2] Simulation stopped');
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    this.currentSpeed = 0;
    this.isIdle = true;
    if (this.routePoints.length > 0) {
      this.vehicle.reset(this.routePoints[0]);
    }
    console.log('[SimulationV2] Simulation reset');
  }
}

export const createSimulationServiceV2 = (vehicle: Vehicle) => {
  return new SimulationServiceV2(vehicle);
};