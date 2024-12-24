import { Vehicle } from '../../models/Vehicle';
import { NavigationCalculator } from './utils/NavigationCalculator';
import { SpeedController } from './utils/SpeedController';
import { RouteManager } from './utils/RouteManager';
import { SimulationStateManager } from './managers/SimulationStateManager';
import { PredictionManager } from './managers/PredictionManager';
import { SimulationUpdateManager } from './managers/SimulationUpdateManager';

export class SimulationServiceV2 {
  private intervalId: NodeJS.Timeout | null = null;
  private stateManager: SimulationStateManager;
  private predictionManager: PredictionManager;
  private updateManager: SimulationUpdateManager;
  private routeManager: RouteManager;
  private speedController: SpeedController;

  constructor(private vehicle: Vehicle) {
    const navigationCalculator = new NavigationCalculator();
    this.speedController = new SpeedController();
    this.routeManager = new RouteManager(navigationCalculator);
    this.stateManager = new SimulationStateManager();
    this.predictionManager = new PredictionManager();
    this.updateManager = new SimulationUpdateManager(
      vehicle,
      navigationCalculator,
      this.speedController,
      this.routeManager
    );
  }

  private updateSimulation() {
    if (this.stateManager.isSimulationIdle() && this.speedController.getCurrentSpeed() === 0) {
      return;
    }

    if (this.routeManager.hasReachedEnd()) {
      console.log('[SimulationV2] End of route reached');
      this.stopSimulation();
      return;
    }

    const { optimalSpeed, requiredDeceleration } = this.predictionManager.getLatestPrediction();
    
    if (!this.stateManager.isSimulationIdle()) {
      console.log('[SimulationV2] Current prediction:', {
        optimalSpeed,
        requiredDeceleration
      });
    }

    this.updateManager.updateVehicleState(optimalSpeed, requiredDeceleration);
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routeManager.setRoutePoints(routePoints);
    this.speedController.setCurrentSpeed(0);
    this.stateManager.setIdle(false);

    console.log('[SimulationV2] Starting simulation with route points:', routePoints);

    if (routePoints.length > 0) {
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        this.updateSimulation();
      }, 1000);
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.vehicle) {
      this.vehicle.update(this.vehicle.position, 0, 0);
    }
    this.stateManager.setIdle(true);
    console.log('[SimulationV2] Simulation stopped');
  }

  reset() {
    this.stopSimulation();
    this.routeManager.updateCurrentIndex(0);
    this.speedController.setCurrentSpeed(0);
    this.stateManager.setIdle(true);
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