import { useEffect } from 'react';
import { useSpeedInfo } from '../hooks/useSpeedInfo';
import SpeedDisplay from './SpeedDisplay';
import TurnWarning from './TurnWarning';

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
  const { displaySpeed, speedLimit, optimalSpeed, prediction } = useSpeedInfo(currentSpeed, isOnRoad);

  useEffect(() => {
    console.log('[SpeedPanel] Speed update received:', {
      currentSpeed,
      displaySpeed,
      recommendedSpeed,
      speedLimit,
      optimalSpeed
    });
  }, [currentSpeed, displaySpeed, recommendedSpeed, speedLimit, optimalSpeed]);

  const kmhSpeed = Math.round(displaySpeed * 3.6); // Conversion m/s to km/h
  const kmhRecommended = optimalSpeed || speedLimit || Math.round(recommendedSpeed * 3.6);
  
  return (
    <div className="bg-gray-900/90 text-white w-full">
      <div className="flex flex-col items-center justify-center px-0 py-0 space-y-0">
        <SpeedDisplay 
          currentSpeed={kmhSpeed}
          recommendedSpeed={kmhRecommended}
          deceleration={prediction?.requiredDeceleration}
        />
        {prediction && (
          <TurnWarning 
            distance={prediction.distance}
            angle={prediction.angle}
          />
        )}
      </div>
    </div>
  );
};

export default SpeedPanel;