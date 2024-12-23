import { Bug, Settings } from 'lucide-react';
import { Toggle } from './ui/toggle';
import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/RoadPredictor';
import { useNavigate } from 'react-router-dom';

interface StatusBarProps {
  isOnRoad: boolean;
  speed: number;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const StatusBar = ({ isOnRoad, speed, isDebugMode, onDebugModeChange }: StatusBarProps) => {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<{
    distance: number;
    angle: number;
    position: [number, number];
    optimalSpeed?: number;
  } | null>(null);

  useEffect(() => {
    const observer = (newPrediction: typeof prediction) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);
    return () => {
      roadPredictor.removeObserver(observer);
    };
  }, []);

  const isIdle = speed === 0;

  return (
    <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
      {/* Left side - Status information */}
      <div className="text-white text-sm px-4 flex items-center gap-6">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded text-sm font-medium ${isOnRoad ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {isOnRoad ? 'ON ROAD' : 'OFF ROAD'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${isIdle ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {isIdle ? 'IDLE' : 'MOVING'}
          </span>
        </div>
      </div>

      {/* Right side - Debug toggle and Settings */}
      <div className="px-4 flex items-center gap-2">
        {onDebugModeChange && (
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="bg-gray-800 hover:bg-gray-700 text-white data-[state=on]:bg-green-600 data-[state=on]:text-white h-8"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Toggle>
        )}
        <Toggle
          onPressedChange={() => navigate('/settings')}
          className="bg-gray-800 hover:bg-gray-700 text-white h-8"
        >
          <Settings className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};

export default StatusBar;