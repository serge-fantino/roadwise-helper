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

  private updateVehicleState() {
    if (this.currentRouteIndex >= this.routePoints.length - 1) {
      console.log('[SimulationV2] End of route reached');
      this.stopSimulation();
      return;
    }

    const currentPosition = this.vehicle.position;
    const nextPosition = this.routePoints[this.currentRouteIndex + 1];
    
    console.log('[SimulationV2] Current state:', {
      currentRouteIndex: this.currentRouteIndex,
      currentPosition,
      nextPosition,
      currentSpeed: this.currentSpeed
    });

    const heading = this.calculateHeading(currentPosition, nextPosition);

    // Obtenir la vitesse optimale et la décélération requise du RoadPredictor
    const prediction = (window as any).roadPredictor?.getCurrentPrediction();
    const optimalSpeed = prediction?.optimalSpeed || 90; // 90 km/h par défaut
    const requiredDeceleration = prediction?.requiredDeceleration || null;

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
    // Conversion des mètres en degrés pour la latitude et longitude
    const distanceM = this.currentSpeed * TIME_STEP;
    const newLat = currentPosition[0] + (heading[0] * distanceM) / METERS_PER_DEGREE_LAT;
    const newLon = currentPosition[1] + (heading[1] * distanceM) / (METERS_PER_DEGREE_LAT * Math.cos(currentPosition[0] * Math.PI / 180));
    const newPosition: [number, number] = [newLat, newLon];

    console.log('[SimulationV2] Movement update:', {
      heading,
      acceleration,
      distanceM,
      newPosition,
      newSpeed: this.currentSpeed
    });

    // Vérifier si on a dépassé le prochain point
    if (calculateDistance(newPosition, nextPosition) < 10) { // 10 mètres de tolérance
      console.log('[SimulationV2] Reached next route point, incrementing index');
      this.currentRouteIndex++;
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
    console.log('[SimulationV2] Simulation stopped');
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    this.currentSpeed = 0;
    if (this.routePoints.length > 0) {
      this.vehicle.reset(this.routePoints[0]);
    }
    console.log('[SimulationV2] Simulation reset');
  }
}

export const createSimulationServiceV2 = (vehicle: Vehicle) => {
  return new SimulationServiceV2(vehicle);
};