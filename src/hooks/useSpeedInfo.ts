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
    console.log('[useSpeedInfo] Setting up prediction observer');
    const predictionObserver = (prediction: RoadPrediction | null) => {
      console.log('[useSpeedInfo] Received prediction update:', prediction);
      if (prediction) {
        setSpeedInfo(prev => ({
          ...prev,
          optimalSpeed: prediction.optimalSpeed ? Math.round(prediction.optimalSpeed) : null,
          prediction
        }));
      }
    };

    roadPredictor.addObserver(predictionObserver);
    return () => {
      console.log('[useSpeedInfo] Cleaning up prediction observer');
      roadPredictor.removeObserver(predictionObserver);
    };
  }, []);

  // Observer pour les informations routières
  useEffect(() => {
    console.log('[useSpeedInfo] Setting up road info observer');
    const roadInfoObserver = (roadInfo: { speedLimit: number | null }) => {
      console.log('[useSpeedInfo] Received road info update:', roadInfo);
      setSpeedInfo(prev => ({
        ...prev,
        speedLimit: roadInfo.speedLimit
      }));
    };

    roadInfoManager.addObserver(roadInfoObserver);
    return () => {
      console.log('[useSpeedInfo] Cleaning up road info observer');
      roadInfoManager.removeObserver(roadInfoObserver);
    };
  }, []);

  useEffect(() => {
    console.log('[useSpeedInfo] Speed updated:', currentSpeed);
    setSpeedInfo(prev => ({
      ...prev,
      displaySpeed: currentSpeed
    }));
  }, [currentSpeed]);

  return speedInfo;
};