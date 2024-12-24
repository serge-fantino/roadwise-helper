import { Vehicle } from '../../models/Vehicle';
import { NavigationCalculator } from './utils/NavigationCalculator';
import { SpeedController } from './utils/SpeedController';
import { RouteManager } from './utils/RouteManager';

const TIME_STEP = 1;

export class SimulationServiceV2 {
  private intervalId: NodeJS.Timeout | null = null;
  private vehicle: Vehicle;
  private navigationCalculator: NavigationCalculator;
  private speedController: SpeedController;
  private routeManager: RouteManager;
  private isIdle: boolean = true;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.navigationCalculator = new NavigationCalculator();
    this.speedController = new SpeedController();
    this.routeManager = new RouteManager(this.navigationCalculator);
  }

  private updateVehicleState() {
    if (this.isIdle && this.speedController.getCurrentSpeed() === 0) {
      return;
    }

    if (this.routeManager.hasReachedEnd()) {
      console.log('[SimulationV2] End of route reached');
      this.stopSimulation();
      return;
    }

    const currentPosition = this.vehicle.position;
    const distanceToTravel = this.speedController.getCurrentSpeed() * TIME_STEP;
    
    const targetIndex = this.routeManager.findNextValidTarget(currentPosition, distanceToTravel);
    const nextPosition = this.routeManager.getRoutePoint(targetIndex);
    
    if (!nextPosition) {
      console.error('[SimulationV2] No valid next position found');
      return;
    }

    console.log('[SimulationV2] Current state:', {
      currentRouteIndex: this.routeManager.getCurrentIndex(),
      targetIndex,
      currentPosition,
      nextPosition,
      currentSpeed: this.speedController.getCurrentSpeed(),
      distanceToTravel
    });

    const heading = this.navigationCalculator.calculateHeading(currentPosition, nextPosition);

    // Obtenir la vitesse optimale et la décélération requise du RoadPredictor
    let optimalSpeed = 90;
    let requiredDeceleration = null;

    if (!this.isIdle) {
      const prediction = (window as any).roadPredictor?.getCurrentPrediction();
      optimalSpeed = prediction?.optimalSpeed || 90;
      requiredDeceleration = prediction?.requiredDeceleration || null;
    }

    // Mettre à jour la vitesse
    const newSpeed = this.speedController.updateSpeed(TIME_STEP, optimalSpeed, requiredDeceleration);

    // Calculer la nouvelle position
    const newPosition = this.navigationCalculator.calculateNextPosition(currentPosition, heading, distanceToTravel);

    // Mettre à jour l'index de route si nécessaire
    if (targetIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationV2] Updating route index from', this.routeManager.getCurrentIndex(), 'to', targetIndex);
      this.routeManager.updateCurrentIndex(targetIndex);
    }

    // Mettre à jour le véhicule
    this.vehicle.update(newPosition, newSpeed);
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routeManager.setRoutePoints(routePoints);
    this.speedController.setCurrentSpeed(0);
    this.isIdle = false;

    console.log('[SimulationV2] Starting simulation with route points:', routePoints);

    if (routePoints.length > 0) {
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        this.updateVehicleState();
      }, 1000);
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.vehicle) {
      this.vehicle.update(this.vehicle.position, 0);
    }
    this.isIdle = true;
    console.log('[SimulationV2] Simulation stopped');
  }

  reset() {
    this.stopSimulation();
    this.routeManager.updateCurrentIndex(0);
    this.speedController.setCurrentSpeed(0);
    this.isIdle = true;
    const firstPoint = this.routeManager.getRoutePoint(0);
    if (firstPoint) {
      this.vehicle.reset(firstPoint);
    }
    console.log('[SimulationV2] Simulation reset');
  }
}

export const createSimulationServiceV2 = (vehicle: Vehicle) => {
  return new SimulationServiceV2(vehicle);
};