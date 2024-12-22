import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead, calculateBearing, calculateAngleDifference, calculateDistance } from '../utils/mapUtils';
import { getCurrentRoadSegment } from '../utils/osmUtils';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
  routePoints?: [number, number][];
}

const getColorFromAngle = (angleDiff: number): string => {
  // Use absolute value for color calculation
  const absAngle = Math.abs(angleDiff);
  
  if (absAngle <= 45) {
    // Interpolate between bright green and vivid red (0° to 45°)
    const ratio = absAngle / 45;
    return `#${Math.round((1 - ratio) * 0x10 + ratio * 0xea).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0xB9 + ratio * 0x38).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x81 + ratio * 0x4c).toString(16).padStart(2, '0')}`;
  } else {
    // Interpolate between vivid red and ocean blue (45° to 180°)
    const ratio = (absAngle - 45) / 135;
    return `#${Math.round((1 - ratio) * 0xea + ratio * 0x0E).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x38 + ratio * 0xA5).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x4c + ratio * 0xE9).toString(16).padStart(2, '0')}`;
  }
};

const PredictionOverlay = ({ position, speed, routePoints }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const [roadSegment, setRoadSegment] = useState<[number, number][]>([]);
  const [predictionColor, setPredictionColor] = useState('#F2FCE2');
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
        
        // Mettre à jour la couleur en fonction de l'angle
        const color = getColorFromAngle(angleDiff);
        setPredictionColor(color);
        
        console.log('Analyse de trajectoire:', {
          predictionBearing,
          roadBearing,
          angleDifference: angleDiff,
          color,
          isGoodTrajectory: Math.abs(angleDiff) <= 45
        });
      }
    };

    analyzePrediction();
  }, [position, speed, vehicle, routePoints]);

  return (
    <>
      <Polyline
        positions={predictionPath}
        pathOptions={{ color: predictionColor, weight: 4, opacity: 0.6 }}
      />
      <Polyline
        positions={roadSegment}
        pathOptions={{ color: '#10B981', weight: 4, opacity: 0.8 }}
      />
    </>
  );
};

export default PredictionOverlay;