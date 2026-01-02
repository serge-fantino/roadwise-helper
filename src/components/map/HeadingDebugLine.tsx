import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface HeadingDebugLineProps {
  position: [number, number];
  heading: number;
}

const HeadingDebugLine: React.FC<HeadingDebugLineProps> = ({ position, heading }) => {
  const map = useMap();

  useEffect(() => {
    // Convention géographique : 0°=Nord, 90°=Est
    const headingRad = heading * Math.PI / 180;
    const lookDistance = 50; // 50m pour la visualisation
    
    const METERS_PER_DEGREE_LAT = 111111;
    const deltaLat = Math.cos(headingRad) * lookDistance / METERS_PER_DEGREE_LAT;
    const deltaLon = Math.sin(headingRad) * lookDistance / (METERS_PER_DEGREE_LAT * Math.cos(position[0] * Math.PI / 180));
    
    const lookAtPoint: [number, number] = [
      position[0] + deltaLat,
      position[1] + deltaLon
    ];

    // Créer la ligne jaune
    const directionLine = L.polyline([position, lookAtPoint], {
      color: '#ffff00',
      weight: 4,
      opacity: 0.9,
      className: 'heading-debug-line'
    }).addTo(map);

    console.log('[MapView] Heading debug line:', {
      headingGeo: heading.toFixed(1) + '° (0°=Nord)',
      from: position,
      to: lookAtPoint,
      deltaLat: deltaLat.toFixed(6),
      deltaLon: deltaLon.toFixed(6)
    });

    // Cleanup
    return () => {
      directionLine.remove();
    };
  }, [map, position, heading]);

  return null;
};

export default HeadingDebugLine;

