import { Vehicle } from '../../../models/Vehicle';
import { NavigationCalculator } from '../utils/NavigationCalculator';
import { RouteManager } from '../utils/RouteManager';
import { SpeedController } from '../utils/SpeedController';

export class SimulationUpdateManager {
  constructor(
    private vehicle: Vehicle,
    private navigationCalculator: NavigationCalculator,
    private speedController: SpeedController,
    private routeManager: RouteManager
  ) {}

  updateVehicleState(optimalSpeed: number, requiredDeceleration: number | null): boolean {
    const currentPosition = this.vehicle.position;
    
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

    this.vehicle.update(newPosition, newSpeed, acceleration);
    return true;
  }
}