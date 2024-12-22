import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead, calculateAngleBetweenVectors, calculateRecommendedSpeedFromAngle } from '../utils/mapUtils';
import { getCurrentRoadSegment } from '../utils/osmUtils';
import { predictionService } from '../services/PredictionService';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
  routePoints?: [number, number][];
}

const PredictionOverlay = ({ position, speed, routePoints }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const [roadSegment, setRoadSegment] = useState<[number, number][]>([]);
  const [angle, setAngle] = useState<number>(0);
  const vehicle = (window as any).globalVehicle;
  
  useEffect(() => {
    const heading = vehicle ? vehicle.heading : 0;
    const path = predictRoadAhead(position, speed, heading);
    setPredictionPath(path);

    // Récupérer le segment de route ou utiliser les points de l'itinéraire
    const fetchRoadSegment = async () => {
      let segment: [number, number][] = [];
      
      if (routePoints && routePoints.length >= 2) {
        // Si on a un itinéraire, prendre les deux premiers points
        segment = [routePoints[0], routePoints[1]];
      } else {
        // Sinon utiliser OSM
        segment = await getCurrentRoadSegment(position[0], position[1]);
      }
      
      setRoadSegment(segment);

      // Calculer l'angle si on a un segment et une prédiction
      if (segment.length >= 2 && path.length >= 2) {
        const predictionVector = [
          path[0][0], path[0][1],
          path[1][0], path[1][1]
        ];
        
        const roadVector = [
          segment[0][0], segment[0][1],
          segment[1][0], segment[1][1]
        ];
        
        const newAngle = calculateAngleBetweenVectors(
          predictionVector as [number, number, number, number],
          roadVector as [number, number, number, number]
        );
        
        setAngle(newAngle);
        console.log('Calculated angle:', newAngle);
        
        // Mettre à jour le service de prédiction avec la nouvelle vitesse recommandée
        const recommendedSpeed = calculateRecommendedSpeedFromAngle(speed, newAngle);
        predictionService.updateSpeedLimit(recommendedSpeed);
      }
    };

    fetchRoadSegment();
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