import { Polyline } from 'react-leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  console.log('HistoryTrail rendering with raw positions:', positions);
  
  // Filtrer les positions invalides et les références circulaires
  const validPositions = positions.filter(pos => 
    Array.isArray(pos) && 
    pos.length === 2 && 
    typeof pos[0] === 'number' && 
    typeof pos[1] === 'number' &&
    !Object.prototype.hasOwnProperty.call(pos, 'message')  // Exclure les références circulaires
  );

  console.log('HistoryTrail filtered positions:', validPositions);
  
  if (validPositions.length < 2) {
    console.log('Not enough valid positions to draw trail');
    return null;
  }
  
  return (
    <Polyline
      positions={validPositions}
      color="#3B82F6"
      weight={3}
      opacity={0.7}
    />
  );
};

export default HistoryTrail;