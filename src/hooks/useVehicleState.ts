import { useState, useCallback, useEffect } from 'react';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface VehicleState {
  position: [number, number];
  speed: number;
  history: [number, number][];
  isOnRoad: boolean;
}

export const useVehicleState = (
  initialPosition: [number, number],
  initialSpeed: number,
  initialHistory: [number, number][],
  onRoadStatusChange: (status: boolean) => void
) => {
  const [state, setState] = useState<VehicleState>({
    position: initialPosition,
    speed: initialSpeed,
    history: initialHistory,
    isOnRoad: true
  });

  const handleVehicleUpdate = useCallback((newPosition: [number, number], newSpeed: number) => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      setState(prev => ({
        ...prev,
        position: newPosition,
        speed: newSpeed,
        history: vehicle.positionHistory
      }));
    }
  }, []);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      vehicle.addObserver(handleVehicleUpdate);
      setState(prev => ({ 
        ...prev, 
        history: vehicle.positionHistory,
        position: vehicle.position,
        speed: vehicle.speed
      }));
      
      return () => {
        vehicle.removeObserver(handleVehicleUpdate);
      };
    }
  }, [handleVehicleUpdate]);

  // S'abonner aux mises à jour des informations routières
  useEffect(() => {
    const observer = (roadInfo: { isOnRoad: boolean }) => {
      setState(prev => ({ ...prev, isOnRoad: roadInfo.isOnRoad }));
      onRoadStatusChange(roadInfo.isOnRoad);
    };

    roadInfoManager.addObserver(observer);
    return () => roadInfoManager.removeObserver(observer);
  }, [onRoadStatusChange]);

  return {
    ...state,
    handleRoadStatusChange: (status: boolean) => {
      setState(prev => ({ ...prev, isOnRoad: status }));
      onRoadStatusChange(status);
    }
  };
};