export const calculateBearing = (start: [number, number], end: [number, number]): number => {
  if (!start || !end || !Array.isArray(start) || !Array.isArray(end) || start.length < 2 || end.length < 2) {
    return 0;
  }

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
  if (!point1 || !point2 || !Array.isArray(point1) || !Array.isArray(point2) || point1.length < 2 || point2.length < 2) {
    return 0;
  }

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

export const predictRoadAhead = (position: [number, number], speed: number, heading: number = 0, positionHistory?: [number, number][]): [number, number][] => {
  // Utiliser l'historique passé en paramètre ou récupérer depuis tripService
  let positions = positionHistory;
  
  if (!positions) {
    // Import dynamique pour éviter les dépendances circulaires si nécessaire
    try {
      const { tripService } = require('../services/TripService');
      positions = tripService.getState().positions;
    } catch (e) {
      // Si l'import échoue, on utilise juste la position actuelle
      return [position, position];
    }
  }
  
  if (!positions || positions.length < 2) {
    return [position, position];
  }

  // Get the last two positions (positions are stored in reverse order, newest first)
  // Si l'historique est passé en paramètre, il peut être dans l'ordre normal ou inversé
  const currentPos = positions[0];
  const prevPos = positions[1];

  if (!currentPos || !prevPos) {
    return [position, position];
  }

  // Calculate the difference in latitude and longitude
  const deltaLat = currentPos[0] - prevPos[0];
  const deltaLon = currentPos[1] - prevPos[1];

  // Multiply by 3 to get 3 seconds prediction
  const predictedLat = currentPos[0] + (deltaLat * 3);
  const predictedLon = currentPos[1] + (deltaLon * 3);

  const endPoint: [number, number] = [predictedLat, predictedLon];
  return [position, endPoint];
};

export function calculateDistanceToSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}