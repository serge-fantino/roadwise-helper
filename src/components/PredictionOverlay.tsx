import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead, calculateBearing, calculateAngleDifference } from '../utils/mapUtils';
import { getCurrentRoadSegment } from '../utils/osmUtils';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
  routePoints?: [number, number][];
}

const PredictionOverlay = ({ position, speed, routePoints }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const [roadSegment, setRoadSegment] = useState<[number, number][]>([]);
  const vehicle = (window as any).globalVehicle;
  
  useEffect(() => {
    const heading = vehicle ? vehicle.heading : 0;
    const path = predictRoadAhead(position, speed, heading);
    setPredictionPath(path);

    const analyzePrediction = async () => {
      let referenceSegment: [number, number][];
      
      // Si on a une route planifiée, on l'utilise
      if (routePoints && routePoints.length > 1) {
        // Trouver le segment de route le plus proche de la position actuelle
        let minDistance = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < routePoints.length - 1; i++) {
          const d = calculateDistance(position, routePoints[i]);
          if (d < minDistance) {
            minDistance = d;
            closestIndex = i;
          }
        }
        
        referenceSegment = [routePoints[closestIndex], routePoints[closestIndex + 1]];
      } else {
        // Sinon on utilise OSM
        const segment = await getCurrentRoadSegment(position[0], position[1]);
        referenceSegment = segment;
        setRoadSegment(segment);
      }

      if (referenceSegment && referenceSegment.length > 1 && path.length > 1) {
        // Calculer l'angle de la prédiction
        const predictionBearing = calculateBearing(path[0], path[1]);
        
        // Calculer l'angle de la route
        const roadBearing = calculateBearing(referenceSegment[0], referenceSegment[1]);
        
        // Calculer la différence d'angle
        const angleDiff = calculateAngleDifference(predictionBearing, roadBearing);
        
        console.log('Analyse de trajectoire:', {
          predictionBearing,
          roadBearing,
          angleDifference: angleDiff,
          isGoodTrajectory: angleDiff <= 45
        });
      }
    };

    analyzePrediction();
  }, [position, speed, vehicle, routePoints]);

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