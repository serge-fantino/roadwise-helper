export const calculateBearing = (start: [number, number], end: [number, number]): number => {
  const startLat = start[0] * Math.PI / 180;
  const startLng = start[1] * Math.PI / 180;
  const endLat = end[0] * Math.PI / 180;
  const endLng = end[1] * Math.PI / 180;

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
           Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  if (bearing < 0) {
    bearing += 360;
  }
  
  return bearing;
};

export const predictRoadAhead = (position: [number, number], speed: number, heading: number = 0): [number, number][] => {
  // Convert speed from m/s to km/h and calculate prediction distance
  const speedKmh = speed * 3.6;
  const predictionDistance = speedKmh / 10; // 1/10th of speed in kilometers

  // Convert heading to radians
  const headingRad = heading * Math.PI / 180;

  // Calculate end point using heading
  const R = 6371; // Earth's radius in km
  const d = predictionDistance;
  
  const lat1 = position[0] * Math.PI / 180;
  const lon1 = position[1] * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d/R) +
    Math.cos(lat1) * Math.sin(d/R) * Math.cos(headingRad)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(headingRad) * Math.sin(d/R) * Math.cos(lat1),
    Math.cos(d/R) - Math.sin(lat1) * Math.sin(lat2)
  );

  const endPoint: [number, number] = [
    lat2 * 180 / Math.PI,
    lon2 * 180 / Math.PI
  ];

  return [position, endPoint];
};
