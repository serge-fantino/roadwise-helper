import { Polyline } from 'react-leaflet';
import { useMemo } from 'react';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  const validPositions = useMemo(() => {
    return positions.filter(pos => 
      Array.isArray(pos) && 
      pos.length === 2 && 
      typeof pos[0] === 'number' && 
      typeof pos[1] === 'number' &&
      !isNaN(pos[0]) && 
      !isNaN(pos[1])
    );
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