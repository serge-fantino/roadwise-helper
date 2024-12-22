import { Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  // Create segments between each consecutive pair of points
  const segments = positions.slice(0, -1).map((pos, index) => {
    return [pos, positions[index + 1]];
  });

  // Colors for the gradient from blue to red
  const colors = [
    '#0EA5E9', // Ocean Blue
    '#33C3F0', // Sky Blue
    '#8B5CF6', // Vivid Purple
    '#9b87f5', // Primary Purple
    '#D946EF', // Magenta Pink
    '#ea384c'  // Red
  ];

  // Calculate color for each segment based on its position in the trail
  const getSegmentColor = (index: number) => {
    if (segments.length <= 1) return colors[0];
    
    // Calculate position in the gradient (0 to 1)
    const position = index / (segments.length - 1);
    
    // Calculate which color pair to use
    const colorIndex = Math.min(
      Math.floor(position * (colors.length - 1)),
      colors.length - 2
    );
    
    console.log(`Segment ${index}: position=${position}, color=${colors[colorIndex]}`);
    
    return colors[colorIndex];
  };

  return (
    <>
      {segments.map((segment, index) => (
        <Polyline
          key={`segment-${index}`}
          positions={segment as LatLngExpression[]}
          color={getSegmentColor(index)}
          weight={3}
          opacity={0.8}
        />
      ))}
    </>
  );
};

export default HistoryTrail;