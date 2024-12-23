import { useEffect, useState } from 'react';
import { predictionService } from '../services/PredictionService';
import { roadPredictor } from '../services/RoadPredictor';
import { roadInfoService } from '../services/roadInfo';

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
  const [optimalSpeed, setOptimalSpeed] = useState<number | null>(null);
  
  useEffect(() => {
    // Observer pour les mises à jour de vitesse limite
    const updateSpeedLimit = async () => {
      if (isOnRoad) {
        const vehicle = (window as any).globalVehicle;
        if (vehicle && vehicle.position) {
          const [lat, lon] = vehicle.position;
          const limit = await roadInfoService.getSpeedLimit(lat, lon);
          setSpeedLimit(limit);
        }
      }
    };
    
    updateSpeedLimit();

    // Observer pour les prédictions de virage
    const predictionObserver = (prediction: any) => {
      if (prediction && prediction.optimalSpeed) {
        setOptimalSpeed(Math.round(prediction.optimalSpeed));
      } else {
        setOptimalSpeed(null);
      }
    };

    roadPredictor.addObserver(predictionObserver);
    
    // Observer pour les mises à jour de vitesse
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const speedObserver = (_: [number, number], speed: number) => {
        setDisplaySpeed(speed);
      };
      
      vehicle.addObserver(speedObserver);
      return () => {
        vehicle.removeObserver(speedObserver);
        predictionService.removeObserver(predictionObserver);
      };
    }
  }, [currentSpeed, isOnRoad]);

  const kmhSpeed = Math.round(displaySpeed * 3.6);
  const kmhRecommended = optimalSpeed || speedLimit || Math.round(recommendedSpeed * 3.6);
  const isOverSpeed = kmhSpeed > kmhRecommended;
  
  return (
    <div className="bg-gray-900/90 text-white w-full">
      <div className="flex items-center justify-center px-4 py-2">
        <div className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
          {kmhSpeed}/{kmhRecommended}
          <span className="text-sm ml-2 text-gray-400">km/h</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedPanel;