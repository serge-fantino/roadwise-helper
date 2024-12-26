import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';

interface RoadPredictionInfoProps {
  onRouteRecalculation?: (from: [number, number], to: [number, number]) => Promise<void>;
}

const RoadPredictionInfo = ({ onRouteRecalculation }: RoadPredictionInfoProps) => {
  const [prediction, setPrediction] = useState<RoadPrediction | null>(null);

  useEffect(() => {
    const observer = (newPrediction: RoadPrediction | null) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);

    return () => {
      roadPredictor.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    if (!onRouteRecalculation) return;

    const handleRouteRecalculation = async (event: CustomEvent) => {
      const { from, to } = event.detail;
      await onRouteRecalculation(from, to);
    };

    window.addEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
    
    return () => {
      window.removeEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
    };
  }, [onRouteRecalculation]);

  if (!prediction) return null;

  const turnDirection = prediction.angle > 0 ? 'droite' : 'gauche';

  return (
    <div className="absolute bottom-20 left-4 bg-gray-900/90 text-white p-2 rounded-lg shadow-lg">
      <div className="text-sm space-y-1">
        <div>Distance : {Math.round(prediction.distance)}m</div>
        <div>Direction : {turnDirection}</div>
        <div>Angle : {Math.abs(Math.round(prediction.angle || 0))}°</div>
      </div>
    </div>
  );
};

export default RoadPredictionInfo;