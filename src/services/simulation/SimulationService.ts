import { calculateDistance } from '../../utils/mapUtils';
import { vehicleStateManager } from '../VehicleStateManager';
import { NavigationCalculator } from './utils/NavigationCalculator';

export class SimulationService {
  private intervalId: NodeJS.Timeout | null = null;
  private currentRouteIndex = 0;
  private routePoints: [number, number][] = [];
  private lastUpdateTime: number = 0;
  private lastPosition: [number, number] | null = null;
  private navigationCalculator: NavigationCalculator;

  constructor() {
    // Plus besoin de Vehicle en paramètre
    this.navigationCalculator = new NavigationCalculator();
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routePoints = routePoints;
    this.currentRouteIndex = 0;
    this.lastUpdateTime = Date.now();

    if (routePoints.length > 1) {
      // Initialisation avec la première position
      this.lastPosition = routePoints[0];
      const nextPosition = routePoints[1];
      const heading = this.navigationCalculator.calculateHeadingAngle(this.navigationCalculator.calculateHeading(this.lastPosition, nextPosition));
      vehicleStateManager.updateState({
        position: routePoints[0],
        speed: 0,
        acceleration: 0,
        heading: heading
      });
      
      this.intervalId = setInterval(() => {
        // Avancer de 10 points à chaque fois pour compenser la fréquence 10x plus élevée
        const nextIndex = this.currentRouteIndex + 10;
        
        if (nextIndex >= this.routePoints.length) {
          this.stopSimulation();
          return;
        }

        const currentPosition = this.routePoints[this.currentRouteIndex];
        const nextPosition = this.routePoints[nextIndex];
        
        // Calcul de la distance en mètres (sur 10 points)
        let distance = 0;
        for (let i = this.currentRouteIndex; i < nextIndex && i < this.routePoints.length - 1; i++) {
          distance += calculateDistance(this.routePoints[i], this.routePoints[i + 1]);
        }
        
        // Calcul du temps écoulé en secondes
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.lastUpdateTime) / 1000;
        
        // Calcul de la vitesse en m/s
        const speed = distance / Math.max(elapsedTime, 0.1);
        
        console.log('Simulation update:', {
          distance,
          elapsedTime,
          speed,
          currentPosition,
          nextPosition
        });

        // Calculer le heading entre la position actuelle et la suivante
        const deltaLat = nextPosition[0] - currentPosition[0];
        const deltaLon = nextPosition[1] - currentPosition[1];
        const heading = Math.atan2(deltaLon, deltaLat) * 180 / Math.PI;
        const normalizedHeading = (heading + 360) % 360;

        // Mise à jour de l'état via le gestionnaire
        vehicleStateManager.updateState({
          position: nextPosition,
          speed: speed,
          heading: normalizedHeading
        });
        
        // Mise à jour des variables pour le prochain calcul
        this.lastPosition = nextPosition;
        this.lastUpdateTime = currentTime;
        this.currentRouteIndex = nextIndex;
      }, 100); // 100ms = 10 FPS au lieu de 1 FPS
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Reset speed to 0
    const currentState = vehicleStateManager.getState();
    vehicleStateManager.updateState({
      ...currentState,
      speed: 0,
      acceleration: 0
    });
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    this.lastPosition = null;
    if (this.routePoints.length > 0) {
      vehicleStateManager.updateState({
        position: this.routePoints[0],
        speed: 0,
        acceleration: 0
      });
    }
  }
}

export const createSimulationService = () => {
  return new SimulationService();
};