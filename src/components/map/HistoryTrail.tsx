import { Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  // Important: We reverse the positions array to start from the most recent position
  // This ensures the color gradient starts from the vehicle's current position
  const reversedPositions = positions.slice().reverse();
  
  // Create segments between each consecutive pair of points
  const segments = reversedPositions.reduce<Array<[[number, number], [number, number]]>>((acc, pos, index) => {
    if (index < reversedPositions.length - 1) {
      acc.push([pos, reversedPositions[index + 1]]);
    }
    return acc;
  }, []);

  console.log('Creating segments from positions:', positions);
  console.log('Number of segments created:', segments.length);

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
      colors.length - 1
    );
    
    console.log(`Segment ${index}/${segments.length - 1}: position=${position.toFixed(2)}, colorIndex=${colorIndex}, color=${colors[colorIndex]}`);
    
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