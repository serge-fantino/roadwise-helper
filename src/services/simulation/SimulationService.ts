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
  private readonly UPDATE_INTERVAL = 100; // ms (10 FPS)
  private readonly TARGET_SPEED = 50 / 3.6; // 50 km/h en m/s = 13.9 m/s

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
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.lastUpdateTime) / 1000; // en secondes
        this.lastUpdateTime = currentTime;

        // Distance à parcourir en fonction du temps écoulé et de la vitesse cible
        const distanceToTravel = this.TARGET_SPEED * elapsedTime;
        
        // Trouver la nouvelle position en avançant sur la route
        let remainingDistance = distanceToTravel;
        let newIndex = this.currentRouteIndex;
        let newPosition = this.routePoints[newIndex];

        while (remainingDistance > 0 && newIndex < this.routePoints.length - 1) {
          const currentPos = this.routePoints[newIndex];
          const nextPos = this.routePoints[newIndex + 1];
          const segmentDistance = calculateDistance(currentPos, nextPos);

          if (remainingDistance >= segmentDistance) {
            // On peut avancer au point suivant
            remainingDistance -= segmentDistance;
            newIndex++;
            newPosition = this.routePoints[newIndex];
          } else {
            // On s'arrête au milieu du segment (interpolation)
            const ratio = remainingDistance / segmentDistance;
            newPosition = [
              currentPos[0] + (nextPos[0] - currentPos[0]) * ratio,
              currentPos[1] + (nextPos[1] - currentPos[1]) * ratio
            ];
            break;
          }
        }

        if (newIndex >= this.routePoints.length - 1) {
          this.stopSimulation();
          return;
        }

        // Calculer le heading vers le prochain point
        const nextRoutePoint = this.routePoints[Math.min(newIndex + 1, this.routePoints.length - 1)];
        const deltaLat = nextRoutePoint[0] - newPosition[0];
        const deltaLon = nextRoutePoint[1] - newPosition[1];
        const heading = Math.atan2(deltaLon, deltaLat) * 180 / Math.PI;
        const normalizedHeading = (heading + 360) % 360;

        console.log('Simulation update:', {
          elapsedTime: elapsedTime.toFixed(3),
          distanceToTravel: distanceToTravel.toFixed(2),
          speed: this.TARGET_SPEED.toFixed(2),
          speedKmh: (this.TARGET_SPEED * 3.6).toFixed(1),
          newIndex,
          currentIndex: this.currentRouteIndex
        });

        // Mise à jour de l'état
        vehicleStateManager.updateState({
          position: newPosition,
          speed: this.TARGET_SPEED,
          heading: normalizedHeading
        });
        
        this.currentRouteIndex = newIndex;
        this.lastPosition = newPosition;
      }, this.UPDATE_INTERVAL);
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