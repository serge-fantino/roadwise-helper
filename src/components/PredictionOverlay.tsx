import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead } from '../utils/mapUtils';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
}

const PredictionOverlay = ({ position, speed }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const vehicle = (window as any).globalVehicle;
  
  useEffect(() => {
    const heading = vehicle ? vehicle.heading : 0;
    const path = predictRoadAhead(position, speed, heading);
    setPredictionPath(path);
  }, [position, speed, vehicle]);

  return (
    <Polyline
      positions={predictionPath}
      pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.6 }}
    />
  );
};

export default PredictionOverlay;