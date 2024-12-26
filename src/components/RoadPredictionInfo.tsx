import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';

interface RoadPredictionInfoProps {
  routePoints: [number, number][];
  onRouteRecalculation?: (from: [number, number], to: [number, number]) => Promise<void>;
}

const RoadPredictionInfo = ({ routePoints, onRouteRecalculation }: RoadPredictionInfoProps) => {
  const [prediction, setPrediction] = useState<{
    distance: number;
    angle: number;
    position: [number, number];
  } | null>(null);

  useEffect(() => {
    const observer = (newPrediction: typeof prediction) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);
    roadPredictor.startUpdates(); // Removed routePoints argument

    return () => {
      roadPredictor.removeObserver(observer);
      roadPredictor.stopUpdates();
    };
  }, [routePoints]);

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
        <div>Angle : {Math.abs(Math.round(prediction.angle))}°</div>
      </div>
    </div>
  );
};

export default RoadPredictionInfo;