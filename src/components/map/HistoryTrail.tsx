import { Polyline } from 'react-leaflet';
import { useMemo } from 'react';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  const validPositions = useMemo(() => {
    // Filtrer les positions invalides et les doublons
    const filtered = positions.filter((pos, index) => {
      if (!Array.isArray(pos) || 
          pos.length !== 2 || 
          typeof pos[0] !== 'number' || 
          typeof pos[1] !== 'number' ||
          isNaN(pos[0]) || 
          isNaN(pos[1])) {
        return false;
      }
      
      // Vérifier si cette position est un doublon de la précédente
      if (index > 0) {
        const prevPos = positions[index - 1];
        if (pos[0] === prevPos[0] && pos[1] === prevPos[1]) {
          return false;
        }
      }
      
      return true;
    });

    console.log('Filtered trail positions:', filtered);
    return filtered;
  }, [positions]);

  if (validPositions.length < 2) {
    return null;
  }

  return (
    <Polyline
      positions={validPositions}
      color="#3B82F6"
      weight={3}
      opacity={0.7}
      smoothFactor={1}
    />
  );
};

export default HistoryTrail;