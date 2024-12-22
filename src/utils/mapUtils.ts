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

  return R * c; // Returns distance in meters
};

export const calculateAngleDifference = (angle1: number, angle2: number): number => {
  // Normalize angles to be between 0 and 360
  angle1 = ((angle1 % 360) + 360) % 360;
  angle2 = ((angle2 % 360) + 360) % 360;

  // Calculate the shortest angle difference
  let diff = angle1 - angle2;
  
  // Normalize the difference to be between -180 and 180
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  return diff;
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
  return [position, endPoint];
};