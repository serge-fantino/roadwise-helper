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

  return R * c;
};

export const calculateAngleBetweenVectors = (
  vector1: [number, number, number, number],
  vector2: [number, number, number, number]
): number => {
  // Convert coordinates to vectors (dx, dy)
  const dx1 = vector1[2] - vector1[0];
  const dy1 = vector1[3] - vector1[1];
  const dx2 = vector2[2] - vector2[0];
  const dy2 = vector2[3] - vector2[1];
  
  // Calculate angle between vectors
  const dotProduct = dx1 * dx2 + dy1 * dy2;
  const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  
  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  // Ensure cosAngle is in [-1, 1] to avoid rounding errors
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  
  // Convert to degrees
  return Math.acos(clampedCosAngle) * (180 / Math.PI);
};

export const predictRoadAhead = (position: [number, number], speed: number, heading: number = 0): [number, number][] => {
  const vehicle = (window as any).globalVehicle;
  if (!vehicle || vehicle.positionHistory.length < 2) {
    return [position, position];
  }

  // Get the last two positions
  const currentPos = vehicle.positionHistory[0];
  const prevPos = vehicle.positionHistory[1];

  // Calculate the difference in latitude and longitude
  const deltaLat = currentPos[0] - prevPos[0];
  const deltaLon = currentPos[1] - prevPos[1];

  // Multiply by 3 to get 3 seconds prediction
  const predictedLat = currentPos[0] + (deltaLat * 3);
  const predictedLon = currentPos[1] + (deltaLon * 3);

  const endPoint: [number, number] = [predictedLat, predictedLon];
  console.log('Predicted path:', [position, endPoint]);

  return [position, endPoint];
};

export const calculateRecommendedSpeedFromAngle = (
  currentSpeed: number,
  angle: number,
  maxSpeed: number = 130
): number => {
  // If angle is greater than 45°, recommend very low speed
  if (angle > 45) return 20;
  
  // Otherwise, adjust speed based on angle
  // The larger the angle, the more we reduce speed
  const angleRatio = 1 - (angle / 45);
  const recommendedSpeed = maxSpeed * angleRatio;
  
  console.log(`Angle: ${angle}°, Speed adjustment ratio: ${angleRatio}, Recommended speed: ${recommendedSpeed} km/h`);
  
  return recommendedSpeed;
};
