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
    
    const { speed: newSpeed, acceleration } = this.speedController.updateSpeed(
      timeStep, // Utiliser le temps écoulé réel
      optimalSpeed,
      requiredDeceleration
    );
    
    const distanceToTravel = newSpeed * timeStep; // Distance = vitesse × temps
    
    console.log('[SimulationUpdateManager] Speed and distance:', {
      newSpeed: (newSpeed * 3.6).toFixed(1) + ' km/h',
      distanceToTravel: distanceToTravel.toFixed(2) + ' m',
      timeStep: timeStep.toFixed(3) + ' s'
    });
    const targetIndex = this.routeManager.findNextValidTarget(currentPosition, distanceToTravel);
    const nextPosition = this.routeManager.getRoutePoint(targetIndex);
    
    if (!nextPosition) {
      console.error('[SimulationUpdateManager] No valid next position found');
      return false;
    }

    console.log('[SimulationUpdateManager] Current state:', {
      currentRouteIndex: this.routeManager.getCurrentIndex(),
      targetIndex,
      currentPosition,
      nextPosition,
      currentSpeed: newSpeed * 3.6,
      acceleration,
      distanceToTravel
    });

    // Calculer le heading basé sur la tangente de la route (pas la direction vers nextPosition)
    // Utiliser les points de route avant et après la position actuelle pour avoir la tangente
    const currentRouteIndex = this.routeManager.getCurrentIndex();
    const currentRoutePoint = this.routeManager.getRoutePoint(currentRouteIndex);
    const nextRoutePoint = this.routeManager.getRoutePoint(Math.min(currentRouteIndex + 1, this.routeManager.getRouteLength() - 1));
    
    let routeHeading;
    if (currentRoutePoint && nextRoutePoint) {
      // Heading = tangente de la route (direction entre deux points de route consécutifs)
      routeHeading = this.navigationCalculator.calculateHeading(currentRoutePoint, nextRoutePoint);
    } else {
      // Fallback
      routeHeading = this.navigationCalculator.calculateHeading(currentPosition, nextPosition);
    }
    
    const newPosition = this.navigationCalculator.calculateNextPosition(currentPosition, routeHeading, distanceToTravel);

    if (targetIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationUpdateManager] Updating route index from', this.routeManager.getCurrentIndex(), 'to', targetIndex);
      this.routeManager.updateCurrentIndex(targetIndex);
    }

    const headingAngle = this.navigationCalculator.calculateHeadingAngle(routeHeading);
    console.log('[SimulationUpdateManager] Heading:', {
      currentRouteIndex,
      headingAngle: headingAngle.toFixed(1) + '°',
      routePoints: [currentRoutePoint, nextRoutePoint]
    });

    // Mise à jour de l'état via le gestionnaire
    vehicleStateManager.updateState({
      position: newPosition,
      speed: newSpeed,
      acceleration: acceleration,
      heading: headingAngle
    });

    return true;
  }
}