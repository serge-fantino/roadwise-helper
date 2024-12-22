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

export const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1[0] * Math.PI / 180;
  const φ2 = point2[0] * Math.PI / 180;
  const Δφ = (point2[0] - point1[0]) * Math.PI / 180;
  const Δλ = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};
