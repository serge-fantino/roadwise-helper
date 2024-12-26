import { EnhancedRoutePoint } from "../services/route/RoutePlannerTypes";

export interface DriveViewState {
  routeSegment: [number, number][];
  currentIndex: number;
  bearing: number;
}

export class DriveViewModel {
  private state: DriveViewState = {
    routeSegment: [],
    currentIndex: 0,
    bearing: 0
  };

  // Conversion des coordonnées GPS en coordonnées cartésiennes locales
  private toLocalCoordinates(point: [number, number], origin: [number, number], cosLat: number): [number, number] {
    const scale = 111000; // mètres par degré
    
    return [
      (point[1] - origin[1]) * scale * cosLat,
      (point[0] - origin[0]) * scale
    ];
  }

  public getState(): DriveViewState {
    return { ...this.state };
  }

  public updateFromPosition(position: [number, number], enhancedPoints: EnhancedRoutePoint[]) {
    if (enhancedPoints.length < 2) return;
    const cosLat = Math.cos((position[0] * Math.PI) / 180);
    
    // Trouver le point de route le plus proche
    let minDist = Infinity;
    let closestIdx = 0;
    console.log(enhancedPoints);
    enhancedPoints.forEach((point, idx) => {
      const localPoint = this.toLocalCoordinates(point.position, position, cosLat);
      const dist = Math.sqrt(localPoint[0] * localPoint[0] + localPoint[1] * localPoint[1]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    // Extraire le segment de route à afficher
    const segment: [number, number][] = [];
    const startIdx = Math.max(0, closestIdx - 10);
    const endIdx = Math.min(enhancedPoints.length, closestIdx + 50);
    
    let currentIndex = 0;
    for (let i = startIdx; i < endIdx; i++) {
      segment.push(this.toLocalCoordinates(enhancedPoints[i].position, position, cosLat));
      if (i <= closestIdx) {
        currentIndex++;
      }
    }

    this.state.routeSegment = segment;
    this.state.currentIndex = currentIndex;
    
    // Calculer le bearing
    if (segment.length >= 2 && currentIndex+1< segment.length-1) {
      const currentPoint = segment[currentIndex];
      const nextPoint = segment[currentIndex + 1];
      this.state.bearing = Math.atan2(nextPoint[0] - currentPoint[0], nextPoint[1] - currentPoint[1]) * 180 / Math.PI;
    }
  }
} 