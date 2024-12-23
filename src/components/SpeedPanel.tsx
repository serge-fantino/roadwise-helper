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

const getTurnType = (angle: number): {
  type: string;
  color: string;
} => {
  const absAngle = Math.abs(angle);
  if (absAngle <= 20) {
    return { type: "rapide", color: "text-green-500" };
  } else if (absAngle <= 45) {
    return { type: "lent", color: "text-blue-500" };
  } else if (absAngle <= 90) {
    return { type: "séré", color: "text-orange-500" };
  } else {
    return { type: "lacet", color: "text-red-500" };
  }
};

const SpeedPanel = ({ 
  currentSpeed, 
  recommendedSpeed, 
  isOnRoad,
  isDebugMode
}: SpeedPanelProps) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [optimalSpeed, setOptimalSpeed] = useState<number | null>(null);
  const [turnInfo, setTurnInfo] = useState<{
    distance: number;
    angle: number;
  } | null>(null);
  
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
      if (prediction) {
        if (prediction.optimalSpeed) {
          setOptimalSpeed(Math.round(prediction.optimalSpeed));
        } else {
          setOptimalSpeed(null);
        }
        if (prediction.distance && prediction.angle) {
          setTurnInfo({
            distance: prediction.distance,
            angle: prediction.angle
          });
        }
      } else {
        setOptimalSpeed(null);
        setTurnInfo(null);
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
  
  const turnDirection = turnInfo?.angle && turnInfo.angle < 0 ? "droite" : "gauche";
  const { type: turnType, color: turnColor } = turnInfo ? getTurnType(turnInfo.angle) : { type: "", color: "" };
  
  return (
    <div className="bg-gray-900/90 text-white w-full">
      <div className="flex flex-col items-center justify-center px-4 py-3 space-y-3">
        <div className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
          {kmhSpeed}/{kmhRecommended}
          <span className="text-sm ml-2 text-gray-400">km/h</span>
        </div>
        {turnInfo && turnInfo.distance <= 500 ? (
          <div className={`text-lg ${turnColor}`}>
            virage {turnType} à {turnDirection} dans {Math.round(turnInfo.distance)}m
          </div>
        ) : (
          <div className="text-lg text-green-500">
            belle ligne droite devant
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeedPanel;