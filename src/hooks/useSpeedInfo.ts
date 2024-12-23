import { useEffect, useState } from 'react';
import { predictionService } from '../services/PredictionService';
import { roadPredictor } from '../services/RoadPredictor';
import { roadInfoService } from '../services/roadInfo';
import { RoadPrediction } from '../services/prediction/PredictionTypes';

interface SpeedInfo {
  displaySpeed: number;
  speedLimit: number | null;
  optimalSpeed: number | null;
  prediction: RoadPrediction | null;
}

export const useSpeedInfo = (currentSpeed: number, isOnRoad?: boolean) => {
  const [speedInfo, setSpeedInfo] = useState<SpeedInfo>({
    displaySpeed: 0,
    speedLimit: null,
    optimalSpeed: null,
    prediction: null
  });

  useEffect(() => {
    const updateSpeedLimit = async () => {
      if (isOnRoad) {
        const vehicle = (window as any).globalVehicle;
        if (vehicle && vehicle.position) {
          const [lat, lon] = vehicle.position;
          const limit = await roadInfoService.getSpeedLimit(lat, lon);
          setSpeedInfo(prev => ({ ...prev, speedLimit: limit }));
        }
      }
    };
    
    updateSpeedLimit();

    const predictionObserver = (prediction: RoadPrediction | null) => {
      if (prediction) {
        setSpeedInfo(prev => ({
          ...prev,
          optimalSpeed: prediction.optimalSpeed ? Math.round(prediction.optimalSpeed) : null,
          prediction
        }));
      } else {
        setSpeedInfo(prev => ({
          ...prev,
          optimalSpeed: null,
          prediction: null
        }));
      }
    };

    roadPredictor.addObserver(predictionObserver);
    
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const speedObserver = (_: [number, number], speed: number) => {
        setSpeedInfo(prev => ({ ...prev, displaySpeed: speed }));
      };
      
      vehicle.addObserver(speedObserver);
      return () => {
        vehicle.removeObserver(speedObserver);
        roadPredictor.removeObserver(predictionObserver);
      };
    }
  }, [currentSpeed, isOnRoad]);

  return speedInfo;
};