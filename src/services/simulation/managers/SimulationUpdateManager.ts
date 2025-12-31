import { NavigationCalculator } from '../utils/NavigationCalculator';
import { RouteManager } from '../utils/RouteManager';
import { SpeedController } from '../utils/SpeedController';
import { vehicleStateManager } from '../../VehicleStateManager';

export class SimulationUpdateManager {
  constructor(
    private navigationCalculator: NavigationCalculator,
    private speedController: SpeedController,
    private routeManager: RouteManager
  ) {}

  updateVehicleState(optimalSpeed: number, requiredDeceleration: number | null): boolean {
    const currentState = vehicleStateManager.getState();
    const currentPosition = currentState.position;
    
    const { speed: newSpeed, acceleration } = this.speedController.updateSpeed(
      1, // TIME_STEP
      optimalSpeed,
      requiredDeceleration
    );
    
    const distanceToTravel = newSpeed * 1; // TIME_STEP
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

    const heading = this.navigationCalculator.calculateHeading(currentPosition, nextPosition);
    const newPosition = this.navigationCalculator.calculateNextPosition(currentPosition, heading, distanceToTravel);

    if (targetIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationUpdateManager] Updating route index from', this.routeManager.getCurrentIndex(), 'to', targetIndex);
      this.routeManager.updateCurrentIndex(targetIndex);
    }

    // Mise à jour de l'état via le gestionnaire
    vehicleStateManager.updateState({
      position: newPosition,
      speed: newSpeed,
      acceleration: acceleration,
      heading: this.navigationCalculator.calculateHeadingAngle(heading)
    });

    return true;
  }
}