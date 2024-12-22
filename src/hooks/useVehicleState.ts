import { useState, useCallback, useEffect } from 'react';

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
    console.log('Vehicle update received:', newPosition, newSpeed);
    
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const history = vehicle.positionHistory;
      console.log('Current vehicle history:', history);
      
      setState(prev => ({
        ...prev,
        position: newPosition,
        speed: newSpeed,
        history
      }));
    }
  }, []);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      console.log('Subscribing to vehicle updates');
      vehicle.addObserver(handleVehicleUpdate);
      setState(prev => ({ ...prev, history: vehicle.positionHistory }));
      
      return () => {
        console.log('Unsubscribing from vehicle updates');
        vehicle.removeObserver(handleVehicleUpdate);
      };
    }
  }, [handleVehicleUpdate]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      position: initialPosition,
      speed: initialSpeed,
      history: initialHistory
    }));
  }, [initialPosition, initialSpeed, initialHistory]);

  const handleRoadStatusChange = (status: boolean) => {
    setState(prev => ({ ...prev, isOnRoad: status }));
    onRoadStatusChange(status);
  };

  return {
    ...state,
    handleRoadStatusChange
  };
};