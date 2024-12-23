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

const StatusBar = ({ isDebugMode, onDebugModeChange }: StatusBarProps) => {
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

  const getTurnDirection = () => {
    if (!prediction) return '';
    return prediction.angle > 0 ? 'gauche' : 'droite';
  };

  return (
    <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
      {/* Left side - Turn information */}
      <div className="text-white text-sm px-4 flex items-center gap-2">
        {prediction ? (
          <span>
            Virage {getTurnDirection()} dans {Math.round(prediction.distance)}m ({Math.abs(Math.round(prediction.angle))}°)
            {prediction.optimalSpeed && (
              <> • {Math.round(prediction.optimalSpeed)} km/h recommandés</>
            )}
          </span>
        ) : (
          <span>Pas de virage détecté</span>
        )}
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