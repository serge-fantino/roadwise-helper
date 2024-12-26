import { useEffect, useState } from 'react';
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
  const [acceleration, setAcceleration] = useState(0);
  const { displaySpeed, speedLimit, optimalSpeed, prediction } = useSpeedInfo(currentSpeed, isOnRoad);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle) {
      console.warn('[SpeedPanel] No vehicle found');
      return;
    }

    console.log('[SpeedPanel] Setting up vehicle observer');
    const observer = (_position: [number, number], _speed: number, currentAcceleration: number) => {
      setAcceleration(currentAcceleration);
    };

    vehicle.addObserver(observer);
    return () => {
      console.log('[SpeedPanel] Cleaning up vehicle observer');
      vehicle.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    console.log('[SpeedPanel] Speed update received:', {
      currentSpeed,
      displaySpeed,
      recommendedSpeed,
      speedLimit,
      optimalSpeed,
      prediction,
      acceleration
    });
  }, [currentSpeed, displaySpeed, recommendedSpeed, speedLimit, optimalSpeed, prediction, acceleration]);

  const kmhSpeed = Math.round(displaySpeed * 3.6); // Conversion m/s to km/h
  const kmhRecommended = optimalSpeed || speedLimit || Math.round(recommendedSpeed * 3.6);

  // Calcul du pourcentage de remplissage de la barre de progression
  const getProgressStyle = () => {
    if (!prediction || prediction.angle === null) {
      return {};
    }

    const distance = prediction.distance;
    const maxDistance = 200; // Distance maximale en mètres pour commencer à afficher la progression
    const progress = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
    
    // Détermine si le virage est à gauche ou à droite
    const isLeftTurn = prediction.angle < 0;
    
    return {
      background: `linear-gradient(to ${isLeftTurn ? 'right' : 'left'}, 
        #8E9196 ${progress}%, 
        #111827 ${progress}%)`
    };
  };
  
  return (
    <div 
      className="bg-gray-900/90 text-white w-full transition-all duration-300 ease-in-out"
      style={getProgressStyle()}
    >
      <div className="flex flex-col items-center justify-center px-0 py-0 space-y-0">
        <SpeedDisplay 
          currentSpeed={kmhSpeed}
          recommendedSpeed={kmhRecommended}
          speedLimit={speedLimit}
          deceleration={prediction?.requiredDeceleration}
          acceleration={acceleration}
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