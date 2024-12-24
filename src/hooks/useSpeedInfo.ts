import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';
import { roadInfoService } from '../services/roadInfo';

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

  // Nouvel effet pour récupérer la limite de vitesse
  useEffect(() => {
    const updateSpeedLimit = async () => {
      if (!isOnRoad) return;
      
      try {
        const vehicle = (window as any).globalVehicle;
        if (!vehicle?.position) return;
        
        const [lat, lon] = vehicle.position;
        console.log('Fetching speed limit for position:', { lat, lon });
        
        const limit = await roadInfoService.getSpeedLimit(lat, lon);
        console.log('Speed limit received:', limit);
        
        setSpeedInfo(prev => ({
          ...prev,
          speedLimit: limit
        }));
      } catch (error) {
        console.error('Error fetching speed limit:', error);
      }
    };

    // Mettre à jour la limite de vitesse toutes les 10 secondes
    updateSpeedLimit();
    const interval = setInterval(updateSpeedLimit, 10000);

    return () => clearInterval(interval);
  }, [isOnRoad]);

  useEffect(() => {
    console.log('Speed updated in useSpeedInfo:', currentSpeed);
    setSpeedInfo(prev => ({
      ...prev,
      displaySpeed: currentSpeed
    }));
  }, [currentSpeed]);

  return speedInfo;
};