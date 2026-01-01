import { NavigationCalculator } from '../utils/NavigationCalculator';
import { RouteManager } from '../utils/RouteManager';
import { SpeedController } from '../utils/SpeedController';
import { vehicleStateManager } from '../../VehicleStateManager';

export class SimulationUpdateManager {
  private lastUpdateTime: number = 0; // Sera initialisé au premier appel

  constructor(
    private navigationCalculator: NavigationCalculator,
    private speedController: SpeedController,
    private routeManager: RouteManager
  ) {}

  updateVehicleState(optimalSpeed: number, requiredDeceleration: number | null): boolean {
    const currentState = vehicleStateManager.getState();
    const currentPosition = currentState.position;
    
    // Calculer le temps écoulé réel
    const currentTime = Date.now();
    let timeStep = 0.1; // Défaut 100ms
    
    if (this.lastUpdateTime > 0) {
      timeStep = (currentTime - this.lastUpdateTime) / 1000; // en secondes
      // Limiter timeStep pour éviter les sauts
      timeStep = Math.min(timeStep, 0.5); // Max 500ms
    }
    this.lastUpdateTime = currentTime;
    
    console.log('[SimulationUpdateManager] timeStep:', timeStep.toFixed(3), 's');
    
    // Calculer la nouvelle vitesse avec le SpeedController
    const { speed: newSpeed, acceleration } = this.speedController.updateSpeed(
      timeStep, // Utiliser le temps écoulé réel
      optimalSpeed,
      requiredDeceleration
    );
    
    // Distance à parcourir = vitesse × temps
    const distanceToTravel = newSpeed * timeStep;
    
    console.log('[SimulationUpdateManager] Speed and distance:', {
      newSpeed: (newSpeed * 3.6).toFixed(1) + ' km/h',
      distanceToTravel: distanceToTravel.toFixed(2) + ' m',
      timeStep: timeStep.toFixed(3) + ' s'
    });

    // MODE DEBUG : Le véhicule suit la route comme un train sur des rails
    // Avancer le long de la route en parcourant les segments
    let remainingDistance = distanceToTravel;
    let newRouteIndex = this.routeManager.getCurrentIndex();
    let newPosition: [number, number] = currentPosition;
    let segmentHeading = 0;

    while (remainingDistance > 0 && newRouteIndex < this.routeManager.getRouteLength() - 1) {
      const currentRoutePoint = this.routeManager.getRoutePoint(newRouteIndex);
      const nextRoutePoint = this.routeManager.getRoutePoint(newRouteIndex + 1);

      if (!currentRoutePoint || !nextRoutePoint) break;

      const segmentDistance = this.navigationCalculator.calculateDistance(currentRoutePoint, nextRoutePoint);
      
      // Calculer le heading du segment
      const heading = this.navigationCalculator.calculateHeading(currentRoutePoint, nextRoutePoint);
      segmentHeading = this.navigationCalculator.calculateHeadingAngle(heading);

      if (remainingDistance >= segmentDistance) {
        // On peut atteindre le point suivant
        remainingDistance -= segmentDistance;
        newRouteIndex++;
        newPosition = nextRoutePoint;
      } else {
        // On s'arrête au milieu du segment (interpolation)
        const ratio = remainingDistance / segmentDistance;
        newPosition = [
          currentRoutePoint[0] + (nextRoutePoint[0] - currentRoutePoint[0]) * ratio,
          currentRoutePoint[1] + (nextRoutePoint[1] - currentRoutePoint[1]) * ratio
        ];
        remainingDistance = 0;
      }
    }

    // Mettre à jour l'index de la route
    if (newRouteIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationUpdateManager] Updating route index from', this.routeManager.getCurrentIndex(), 'to', newRouteIndex);
      this.routeManager.updateCurrentIndex(newRouteIndex);
    }

    console.log('[SimulationUpdateManager] Position update:', {
      oldIndex: this.routeManager.getCurrentIndex(),
      newIndex: newRouteIndex,
      heading: segmentHeading.toFixed(1) + '°',
      distance: distanceToTravel.toFixed(2) + 'm'
    });

    // Mise à jour de l'état via le gestionnaire
    vehicleStateManager.updateState({
      position: newPosition,
      speed: newSpeed,
      acceleration: acceleration,
      heading: segmentHeading
    });

    return true;
  }
}