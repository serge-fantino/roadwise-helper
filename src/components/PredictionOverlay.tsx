import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead } from '../utils/mapUtils';
import { getCurrentRoadSegment } from '../utils/osmUtils';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
}

const PredictionOverlay = ({ position, speed }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const [roadSegment, setRoadSegment] = useState<[number, number][]>([]);
  const vehicle = (window as any).globalVehicle;
  
  useEffect(() => {
    const heading = vehicle ? vehicle.heading : 0;
    const path = predictRoadAhead(position, speed, heading);
    setPredictionPath(path);

    // Récupérer le segment de route
    const fetchRoadSegment = async () => {
      const segment = await getCurrentRoadSegment(position[0], position[1]);
      setRoadSegment(segment);
    };

    fetchRoadSegment();
  }, [position, speed, vehicle]);

  return (
    <>
      <Polyline
        positions={predictionPath}
        pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.6 }}
      />
      <Polyline
        positions={roadSegment}
        pathOptions={{ color: '#10B981', weight: 4, opacity: 0.8 }}
      />
    </>
  );
};

export default PredictionOverlay;