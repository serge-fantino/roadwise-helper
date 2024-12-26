import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface SpeedInfo {
  displaySpeed: number;
  speedLimit: number | null;
  optimalSpeed: number | null;
  prediction: RoadPrediction | null;
}

export const useSpeedInfo = (currentSpeed: number, isOnRoad?: boolean): SpeedInfo => {
  const [speedInfo, setSpeedInfo] = useState<SpeedInfo>({
    displaySpeed: currentSpeed,
    speedLimit: null,
    optimalSpeed: null,
    prediction: null
  });

  // Observer pour les prédictions
  useEffect(() => {
    const predictionObserver = (prediction: RoadPrediction | null) => {
      if (prediction) {
        setSpeedInfo(prev => ({
          ...prev,
          optimalSpeed: prediction.optimalSpeed ? Math.round(prediction.optimalSpeed) : null,
          prediction
        }));
      }
    };

    roadPredictor.addObserver(predictionObserver);
    return () => roadPredictor.removeObserver(predictionObserver);
  }, []);

  // Observer pour les informations routières
  useEffect(() => {
    const roadInfoObserver = (roadInfo: { speedLimit: number | null }) => {
      setSpeedInfo(prev => ({
        ...prev,
        speedLimit: roadInfo.speedLimit
      }));
    };

    roadInfoManager.addObserver(roadInfoObserver);
    return () => roadInfoManager.removeObserver(roadInfoObserver);
  }, []);

  useEffect(() => {
    console.log('Speed updated in useSpeedInfo:', currentSpeed);
    setSpeedInfo(prev => ({
      ...prev,
      displaySpeed: currentSpeed
    }));
  }, [currentSpeed]);

  return speedInfo;
};