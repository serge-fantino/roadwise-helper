import { Bug } from 'lucide-react';
import { Toggle } from './ui/toggle';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  isOnRoad: boolean;
  speed: number;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const StatusBar = ({ isOnRoad, speed: initialSpeed, isDebugMode, onDebugModeChange }: StatusBarProps) => {
  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const speedObserver = (_: [number, number], speed: number) => {
        setCurrentSpeed(speed);
      };
      
      vehicle.addObserver(speedObserver);
      return () => {
        vehicle.removeObserver(speedObserver);
      };
    }
  }, []);

  return (
    <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
      {/* Left side - Status information */}
      <div className="text-white text-sm px-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isOnRoad ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span>{isOnRoad ? 'On road' : 'Off road'}</span>
        <span>•</span>
        <span>{Math.round(currentSpeed * 3.6)} km/h</span>
      </div>

      {/* Right side - Debug toggle */}
      {onDebugModeChange && (
        <div className="px-4">
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="bg-gray-800 hover:bg-gray-700 text-white data-[state=on]:bg-green-600 data-[state=on]:text-white h-8"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Toggle>
        </div>
      )}
    </div>
  );
};

export default StatusBar;