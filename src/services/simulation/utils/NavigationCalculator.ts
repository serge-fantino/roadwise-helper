const METERS_PER_DEGREE_LAT = 111111;

export class NavigationCalculator {

  calculateHeading(from: [number, number], to: [number, number]): [number, number] {
    const deltaLat = (to[0] - from[0]) * METERS_PER_DEGREE_LAT;
    const deltaLon = (to[1] - from[1]) * METERS_PER_DEGREE_LAT * Math.cos(from[0] * Math.PI / 180);
    
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
    
    if (distance === 0) return [0, 0];
    
    return [deltaLat / distance, deltaLon / distance];
  }

  calculateHeadingAngle(heading: [number, number]): number {
    return Math.atan2(heading[0], heading[1]) * 180 / Math.PI;
  }

  calculateNextPosition(currentPosition: [number, number], heading: [number, number], distance: number): [number, number] {
    const deltaLat = (heading[0] * distance) / METERS_PER_DEGREE_LAT;
    const deltaLon = (heading[1] * distance) / (METERS_PER_DEGREE_LAT * Math.cos(currentPosition[0] * Math.PI / 180));
    
    return [
      currentPosition[0] + deltaLat,
      currentPosition[1] + deltaLon
    ];
  }

  calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}