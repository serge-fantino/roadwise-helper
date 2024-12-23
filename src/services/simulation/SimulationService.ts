import { Vehicle } from '../../models/Vehicle';
import { calculateDistance } from '../../utils/mapUtils';

export class SimulationService {
  private intervalId: NodeJS.Timeout | null = null;
  private currentRouteIndex = 0;
  private routePoints: [number, number][] = [];
  private vehicle: Vehicle;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routePoints = routePoints;
    this.currentRouteIndex = 0;

    if (routePoints.length > 0) {
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        const nextIndex = this.currentRouteIndex + 1;
        
        if (nextIndex >= this.routePoints.length) {
          this.stopSimulation();
          return;
        }

        const currentPosition = this.routePoints[this.currentRouteIndex];
        const nextPosition = this.routePoints[nextIndex];
        const distance = calculateDistance(currentPosition, nextPosition);
        // Vitesse en m/s, ajustée pour l'intervalle d'1 seconde
        const speed = distance;

        this.vehicle.update(nextPosition, speed);
        this.currentRouteIndex = nextIndex;
      }, 1000); // Mise à jour toutes les secondes
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    if (this.routePoints.length > 0) {
      this.vehicle.reset(this.routePoints[0]);
    }
  }
}

export const createSimulationService = (vehicle: Vehicle) => {
  return new SimulationService(vehicle);
};