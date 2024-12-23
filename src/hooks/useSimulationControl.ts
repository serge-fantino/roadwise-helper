import { useEffect } from 'react';
import { Vehicle } from '../models/Vehicle';
import { createSimulationService } from '../services/simulation/SimulationService';

export const useSimulationControl = (
  vehicle: Vehicle,
  isDebugMode: boolean,
  routePoints: [number, number][]
) => {
  useEffect(() => {
    if (isDebugMode && routePoints.length > 1) {
      console.log('Starting simulation with route points:', routePoints);
      const simulationService = createSimulationService(vehicle);
      simulationService.startSimulation(routePoints);

      return () => {
        simulationService.stopSimulation();
      };
    }
  }, [isDebugMode, routePoints, vehicle]);
};