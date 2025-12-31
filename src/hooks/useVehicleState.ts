import { useState, useEffect } from 'react';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';
import { vehicleStateManager, VehicleState } from '../services/VehicleStateManager';
import { tripService, TripState } from '../services/TripService';

interface UseVehicleStateReturn {
  position: [number, number];
  speed: number;
  history: [number, number][];
  isOnRoad: boolean;
  handleRoadStatusChange: (status: boolean) => void;
}

/**
 * Hook pour accéder à l'état du véhicule via VehicleStateManager et TripService
 * @param initialPosition Position initiale (optionnel, utilisé pour compatibilité)
 * @param initialSpeed Vitesse initiale (optionnel, utilisé pour compatibilité)
 * @param initialHistory Historique initial (optionnel, utilisé pour compatibilité)
 * @param onRoadStatusChange Callback appelé quand le statut "sur route" change
 * @returns État du véhicule avec position, vitesse, historique et statut "sur route"
 */
export const useVehicleState = (
  initialPosition?: [number, number],
  initialSpeed?: number,
  initialHistory?: [number, number][],
  onRoadStatusChange?: (status: boolean) => void
): UseVehicleStateReturn => {
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleStateManager.getState());
  const [tripState, setTripState] = useState<TripState>(tripService.getState());
  const [isOnRoad, setIsOnRoad] = useState(true);

  // Observer pour VehicleStateManager
  useEffect(() => {
    const handleVehicleUpdate = (state: VehicleState) => {
      setVehicleState(state);
    };

    vehicleStateManager.addObserver(handleVehicleUpdate);
    return () => vehicleStateManager.removeObserver(handleVehicleUpdate);
  }, []);

  // Observer pour TripService
  useEffect(() => {
    const handleTripUpdate = (state: TripState) => {
      setTripState(state);
    };

    tripService.addObserver(handleTripUpdate);
    return () => tripService.removeObserver(handleTripUpdate);
  }, []);

  // Observer pour roadInfoManager
  useEffect(() => {
    const observer = (roadInfo: { isOnRoad: boolean }) => {
      setIsOnRoad(roadInfo.isOnRoad);
      if (onRoadStatusChange) {
        onRoadStatusChange(roadInfo.isOnRoad);
      }
    };

    roadInfoManager.addObserver(observer);
    return () => roadInfoManager.removeObserver(observer);
  }, [onRoadStatusChange]);

  return {
    position: vehicleState.position,
    speed: vehicleState.speed,
    history: tripState.positions,
    isOnRoad,
    handleRoadStatusChange: (status: boolean) => {
      setIsOnRoad(status);
      if (onRoadStatusChange) {
        onRoadStatusChange(status);
      }
    }
  };
};