import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead } from '../utils/mapUtils';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
}

const PredictionOverlay = ({ position, speed }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  
  useEffect(() => {
    const path = predictRoadAhead(position, speed);
    setPredictionPath(path);
  }, [position, speed]);

  return (
    <Polyline
      positions={predictionPath}
      pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.6 }}
    />
  );
};

export default PredictionOverlay;