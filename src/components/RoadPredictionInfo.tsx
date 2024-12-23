import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/RoadPredictor';

interface RoadPredictionInfoProps {
  routePoints: [number, number][];
}

const RoadPredictionInfo = ({ routePoints }: RoadPredictionInfoProps) => {
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
    roadPredictor.startUpdates(routePoints);

    return () => {
      roadPredictor.removeObserver(observer);
      roadPredictor.stopUpdates();
    };
  }, [routePoints]);

  if (!prediction) return null;

  return (
    <div className="absolute bottom-20 left-4 bg-gray-900/90 text-white p-2 rounded-lg shadow-lg">
      <div className="text-sm">
        <div>Distance au virage: {Math.round(prediction.distance)}m</div>
        <div>Angle: {Math.round(prediction.angle)}°</div>
      </div>
    </div>
  );
};

export default RoadPredictionInfo;