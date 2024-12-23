import { Bug } from 'lucide-react';
import { Toggle } from './ui/toggle';

interface StatusBarProps {
  isOnRoad: boolean;
  speed: number;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const StatusBar = ({ isOnRoad, speed, isDebugMode, onDebugModeChange }: StatusBarProps) => {
  return (
    <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
      <div className="text-white text-sm px-4">
        {isOnRoad ? 'On road' : 'Off road'} • {Math.round(speed * 3.6)} km/h
      </div>
      {onDebugModeChange && (
        <div className="px-4 z-10">
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="data-[state=on]:bg-green-500 h-8 relative"
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