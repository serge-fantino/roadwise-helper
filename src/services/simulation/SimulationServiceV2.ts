import { Vehicle } from '../../models/Vehicle';
import { calculateDistance, calculateBearing } from '../../utils/mapUtils';

const GRAVITY = 9.81; // m/s²
const ACCELERATION_FACTOR = 0.2; // 0.2g
const DECELERATION_FACTOR = 0.1; // 0.1g
const TIME_STEP = 1; // 1 seconde

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
    const bearing = calculateBearing(from, to);
    const radians = (bearing * Math.PI) / 180;
    // Retourne un vecteur unitaire dans la direction du cap
    return [Math.sin(radians), Math.cos(radians)];
  }

  private updateVehicleState() {
    if (this.currentRouteIndex >= this.routePoints.length - 1) {
      this.stopSimulation();
      return;
    }

    const currentPosition = this.vehicle.position;
    const nextPosition = this.routePoints[this.currentRouteIndex + 1];
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
    const distance = this.currentSpeed * TIME_STEP;
    const newLat = currentPosition[0] + heading[0] * distance / 111111; // Conversion approximative en degrés
    const newLon = currentPosition[1] + heading[1] * distance / (111111 * Math.cos(currentPosition[0] * Math.PI / 180));
    const newPosition: [number, number] = [newLat, newLon];

    // Vérifier si on a dépassé le prochain point
    if (calculateDistance(newPosition, nextPosition) < 10) { // 10 mètres de tolérance
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
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    this.currentSpeed = 0;
    if (this.routePoints.length > 0) {
      this.vehicle.reset(this.routePoints[0]);
    }
  }
}

export const createSimulationServiceV2 = (vehicle: Vehicle) => {
  return new SimulationServiceV2(vehicle);
};