import { useEffect, useState } from 'react';
import { useSpeedInfo } from '../hooks/useSpeedInfo';
import SpeedDisplay from './SpeedDisplay';
import TurnWarning from './TurnWarning';
import { vehicleStateManager } from '../services/VehicleStateManager';
import { VehicleState } from '../services/VehicleStateManager';
import { TurnPrediction } from '@/services/prediction/PredictionTypes';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface SpeedPanelProps {
  currentSpeed: number;
  speedLimit?: number;
  optimalSpeed?: number;
  prediction?: TurnPrediction;
  isDebugMode?: boolean;
}

const SpeedPanel = ({ 
  currentSpeed,
  speedLimit: propSpeedLimit,
  optimalSpeed: propOptimalSpeed,
  prediction: propPrediction,
  isDebugMode
}: SpeedPanelProps) => {
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleStateManager.getState());
  const [isOnRoad, setIsOnRoad] = useState(true);
  
  // Récupérer isOnRoad depuis roadInfoManager
  useEffect(() => {
    const roadInfo = roadInfoManager.getCurrentInfo();
    if (roadInfo) {
      setIsOnRoad(roadInfo.isOnRoad);
    }

    const observer = (roadInfo: { isOnRoad: boolean }) => {
      setIsOnRoad(roadInfo.isOnRoad);
    };

    roadInfoManager.addObserver(observer);
    return () => roadInfoManager.removeObserver(observer);
  }, []);

  const { displaySpeed, speedLimit: hookSpeedLimit, optimalSpeed: hookOptimalSpeed, prediction: hookPrediction } = useSpeedInfo(currentSpeed, isOnRoad);

  useEffect(() => {
    const handleVehicleUpdate = (state: VehicleState) => {
      setVehicleState(state);
    };

    vehicleStateManager.addObserver(handleVehicleUpdate);

    return () => {
      vehicleStateManager.removeObserver(handleVehicleUpdate);
    };
  }, []);

  // Utiliser les props en priorité, sinon les valeurs du hook
  const finalSpeedLimit = propSpeedLimit ?? hookSpeedLimit ?? null;
  const finalOptimalSpeed = propOptimalSpeed ?? hookOptimalSpeed ?? null;
  const finalPrediction = propPrediction ?? hookPrediction;

  useEffect(() => {
    console.log('[SpeedPanel] Speed update received:', {
      currentSpeed,
      displaySpeed,
      speedLimit: finalSpeedLimit,
      optimalSpeed: finalOptimalSpeed,
      prediction: finalPrediction,
      acceleration: vehicleState.acceleration
    });
  }, [currentSpeed, displaySpeed, finalSpeedLimit, finalOptimalSpeed, finalPrediction, vehicleState.acceleration]);

  const kmhSpeed = Math.round(displaySpeed * 3.6); // Conversion m/s to km/h
  const kmhRecommended = finalOptimalSpeed ?? finalSpeedLimit ?? kmhSpeed;

  // Calcul du pourcentage de remplissage de la barre de progression
  const getProgressStyle = () => {
    if (!finalPrediction || finalPrediction.angle === null) {
      return {};
    }

    const distance = finalPrediction.distance;
    const maxDistance = 300; // Distance maximale en mètres pour commencer à afficher la progression
    const progress = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
    
    // Détermine si le virage est à gauche ou à droite
    const isLeftTurn = finalPrediction.angle < 0;
    
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
          speedLimit={finalSpeedLimit}
          deceleration={finalPrediction?.requiredDeceleration}
          acceleration={vehicleState.acceleration}
        />
        {finalPrediction && (
          <TurnWarning 
            distance={finalPrediction.distance}
            angle={finalPrediction.angle}
          />
        )}
      </div>
    </div>
  );
};

export default SpeedPanel;