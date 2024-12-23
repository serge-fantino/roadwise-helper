import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';

interface SpeedInfo {
  displaySpeed: number;
  speedLimit: number | null;
  optimalSpeed: number | null;
  prediction: RoadPrediction | null;
}

export const useSpeedInfo = (currentSpeed: number, isOnRoad?: boolean): SpeedInfo => {
  const [speedInfo, setSpeedInfo] = useState<SpeedInfo>({
    displaySpeed: 0,
    speedLimit: null,
    optimalSpeed: null,
    prediction: null
  });

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
    
    return () => {
      roadPredictor.removeObserver(predictionObserver);
    };
  }, []);

  useEffect(() => {
    setSpeedInfo(prev => ({
      ...prev,
      displaySpeed: currentSpeed
    }));
  }, [currentSpeed]);

  return speedInfo;
};