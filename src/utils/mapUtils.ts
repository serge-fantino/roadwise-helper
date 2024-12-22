// Simple road prediction based on current position and bearing
export const predictRoadAhead = (position: [number, number], speed: number): [number, number][] => {
  // This is a simplified prediction - in a real app, this would use actual map data
  // and road geometry to predict the path ahead
  const points: [number, number][] = [];
  const predictionDistance = Math.min(speed * 10, 100); // Predict 10 seconds ahead, max 100 meters
  
  // For now, just create a straight line ahead
  for (let i = 0; i < 10; i++) {
    const factor = i / 10;
    points.push([
      position[0] + (0.0001 * factor), // Roughly north
      position[1]
    ]);
  }
  
  return points;
};