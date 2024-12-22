import { Polyline } from 'react-leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  console.log('HistoryTrail rendering with positions:', positions);
  
  if (positions.length < 2) {
    console.log('Not enough positions to draw trail');
    return null;
  }
  
  // Ensure we're using valid positions (filter out any potential circular references)
  const validPositions = positions.filter(pos => 
    Array.isArray(pos) && 
    pos.length === 2 && 
    typeof pos[0] === 'number' && 
    typeof pos[1] === 'number'
  );

  console.log('Valid positions for trail:', validPositions);
  
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