import { useEffect, useState } from 'react';
import { predictionService } from '../services/PredictionService';

interface SpeedPanelProps {
  currentSpeed: number;
  recommendedSpeed: number;
  isOnRoad?: boolean;
  isDebugMode?: boolean;
}

const SpeedPanel = ({ 
  currentSpeed, 
  recommendedSpeed, 
  isOnRoad,
  isDebugMode
}: SpeedPanelProps) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  
  useEffect(() => {
    // Observer pour les mises à jour de vitesse limite
    const speedLimitObserver = (newSpeedLimit: number | null) => {
      setSpeedLimit(newSpeedLimit);
    };
    
    predictionService.addObserver(speedLimitObserver);
    
    // Observer pour les mises à jour de vitesse
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const speedObserver = (_: [number, number], speed: number) => {
        setDisplaySpeed(speed);
      };
      
      vehicle.addObserver(speedObserver);
      return () => {
        vehicle.removeObserver(speedObserver);
        predictionService.removeObserver(speedLimitObserver);
      };
    }
  }, [currentSpeed]);

  const kmhSpeed = Math.round(displaySpeed * 3.6);
  const kmhRecommended = speedLimit || Math.round(recommendedSpeed * 3.6);
  const isIdle = displaySpeed === 0;
  
  return (
    <div className="bg-gray-900/90 text-white w-full">
      <div className="grid grid-cols-2 gap-1">
        <div className="flex items-center justify-between col-span-2 px-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{kmhSpeed}</span>
            <span className="text-sm text-gray-400">km/h</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${kmhSpeed > kmhRecommended ? 'text-red-500' : 'text-green-500'}`}>
              {kmhRecommended}
            </span>
            <span className="text-sm text-gray-400">
              {speedLimit ? 'limite' : 'recommandé'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center bg-gray-800/50 p-0.5">
          <span className={`text-lg font-semibold ${isOnRoad ? 'text-green-500' : 'text-red-500'}`}>
            {isOnRoad ? 'ON ROAD' : 'OFF ROAD'}
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center bg-gray-800/50 p-0.5">
          <span className={`text-lg font-semibold ${isIdle ? 'text-yellow-500' : 'text-blue-500'}`}>
            {isIdle ? 'IDLE' : 'MOVING'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpeedPanel;