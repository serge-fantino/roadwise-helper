import { Toggle } from './ui/toggle';
import { Bug } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SpeedPanelProps {
  currentSpeed: number;
  recommendedSpeed: number;
  isOnRoad?: boolean;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const SpeedPanel = ({ 
  currentSpeed, 
  recommendedSpeed, 
  isOnRoad,
  isDebugMode,
  onDebugModeChange 
}: SpeedPanelProps) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  
  useEffect(() => {
    // Mise à jour de la vitesse affichée quand currentSpeed change
    setDisplaySpeed(currentSpeed);
    
    // Observer pour les mises à jour de vitesse
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const speedObserver = (_: [number, number], speed: number) => {
        setDisplaySpeed(speed);
      };
      
      vehicle.addObserver(speedObserver);
      return () => {
        vehicle.removeObserver(speedObserver);
      };
    }
  }, [currentSpeed]);

  const kmhSpeed = Math.round(displaySpeed * 3.6);
  const kmhRecommended = Math.round(recommendedSpeed * 3.6);
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
            <span className="text-sm text-gray-400">recommandé</span>
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
      
      {onDebugModeChange && (
        <div className="flex justify-end p-1">
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="data-[state=on]:bg-green-500 h-8"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Toggle>
        </div>
      )}
    </div>
  );
};

export default SpeedPanel;