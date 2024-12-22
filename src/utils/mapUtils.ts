export const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

export const predictRoadAhead = (position: [number, number], speed: number): [number, number][] => {
  // Simple prediction: project a straight line ahead based on current position and speed
  const [lat, lon] = position;
  const distance = speed * 5; // Project 5 seconds ahead
  
  // Convert distance to rough lat/lon offset (very simplified)
  const latOffset = distance / 111111; // 1 degree lat ≈ 111111 meters
  const lonOffset = distance / (111111 * Math.cos(lat * Math.PI/180));
  
  // Return array of points forming prediction line
  return [
    position,
    [lat + latOffset, lon + lonOffset]
  ];
};