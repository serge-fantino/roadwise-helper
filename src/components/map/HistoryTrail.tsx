import { Polyline } from 'react-leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  if (positions.length < 2) return null;
  
  return (
    <Polyline
      positions={positions}
      color="#3B82F6"
      weight={3}
      opacity={0.7}
    />
  );
};

export default HistoryTrail;