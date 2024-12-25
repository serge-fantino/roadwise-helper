import { calculateAngleDifference, calculateBearing, calculateDistance } from '../../utils/mapUtils';

interface Point {
  lat: number;
  lon: number;
}

export function smoothPath(routePoints: [number, number][], smoothingWindow: number, maxDistance: number): Point[] {
  const smoothedPath: Point[] = [];
  
  if (routePoints.length < 2) {
    return smoothedPath;
  }

  let totalDistance = 0;
  let startPoint = null;

  // Conversion initiale en Points
  for(let i = 0; i < routePoints.length; i++) {
    smoothedPath.push({
      lat: routePoints[i][0],
      lon: routePoints[i][1]
    });
    if(startPoint === null) {
      startPoint = routePoints[i];
    } else {
      totalDistance += calculateDistance(startPoint, routePoints[i]);
      startPoint = routePoints[i];
    }
    if (totalDistance > maxDistance) {
      break;
    }
  }
  
  // Application de la moyenne mobile
  const smoothedPathWithAverage: Point[] = [];
  for (let i = 0; i < smoothedPath.length; i++) {
    let sumLat = 0;
    let sumLon = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(smoothedPath.length - 1, i + smoothingWindow); j++) {
      sumLat += smoothedPath[j].lat;
      sumLon += smoothedPath[j].lon;
      count++;
    }
    
    smoothedPathWithAverage.push({
      lat: sumLat / count,
      lon: sumLon / count
    });
  }
  
  return smoothedPathWithAverage;
}

export function calculateCurveRadius(smoothedPath: Point[], apexIndex: number): number {
  if (smoothedPath.length < 3 || apexIndex < 1 || apexIndex >= smoothedPath.length - 1) {
    return Infinity;
  }

  const startPoint = smoothedPath[apexIndex - 1];
  const apexPoint = smoothedPath[apexIndex];
  const endPoint = smoothedPath[apexIndex + 1];
  
  const a = calculateDistance(
    [startPoint.lat, startPoint.lon],
    [apexPoint.lat, apexPoint.lon]
  );
  const b = calculateDistance(
    [apexPoint.lat, apexPoint.lon],
    [endPoint.lat, endPoint.lon]
  );
  const c = calculateDistance(
    [startPoint.lat, startPoint.lon],
    [endPoint.lat, endPoint.lon]
  );

  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  
  if(area === 0) return Infinity;
  return (a * b * c) / (4 * area);
}

export function calculateCurveLength(smoothedPath: Point[], start: number, end: number): number {
  let totalDistance = 0;
  for(let i = start; i < end; i++) {
    const currentPoint = smoothedPath[i];
    const nextPoint = smoothedPath[i+1];
    totalDistance += calculateDistance(
      [currentPoint.lat, currentPoint.lon],
      [nextPoint.lat, nextPoint.lon]
    );
  }
  return totalDistance;
} 

export function  calculateAngleBetweenPoints(
    prevPoint: Point,
    currentPoint: Point,
    nextPoint: Point
): { bearing1: number; bearing2: number; angleDiff: number } {
    const bearing1 = calculateBearing(
        [prevPoint.lat, prevPoint.lon],
        [currentPoint.lat, currentPoint.lon]
    );
    
    const bearing2 = calculateBearing(
        [currentPoint.lat, currentPoint.lon],
        [nextPoint.lat, nextPoint.lon]
    );
    
    return {
        bearing1,
        bearing2,
        angleDiff: calculateAngleDifference(bearing1, bearing2)
    };
}