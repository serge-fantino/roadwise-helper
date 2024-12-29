import { EnhancedRoutePoint } from "../services/route/RoutePlannerTypes";
import { generateBorders, CartesianPoint } from "../services/route/RouteProjectionService";

export interface DriveViewState {
  path: CartesianPoint[];
  leftBorder: CartesianPoint[];
  rightBorder: CartesianPoint[];
  currentIndex: number;
  bearing: number;
}

export class DriveViewModel {
  private state: DriveViewState = {
    path: [],
    leftBorder: [],
    rightBorder: [],
    currentIndex: 0,
    bearing: 0
  };

  private toCartesianPoint(point: [number, number], origin: [number, number], cosLat: number): CartesianPoint {
    const scale = 111000; // mètres par degré
    return {
      x: (point[1] - origin[1]) * scale * cosLat,
      y: (point[0] - origin[0]) * scale
    };
  }

  public getState(): DriveViewState {
    return { ...this.state };
  }

  public updateFromPosition(position: [number, number], enhancedPoints: EnhancedRoutePoint[]) {
    if (enhancedPoints.length < 2) return;
    const cosLat = Math.cos((position[0] * Math.PI) / 180);
    
    // Convertir les points en coordonnées cartésiennes
    const cartesianPath: CartesianPoint[] = enhancedPoints.map(point => 
      this.toCartesianPoint(point.position, position, cosLat)
    );

    // Trouver le point le plus proche
    let minDist = Infinity;
    let closestIdx = 0;
    cartesianPath.forEach((point, idx) => {
      const dist = Math.sqrt(point.x * point.x + point.y * point.y);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    // Extraire le segment de route à afficher
    const startIdx = Math.max(0, closestIdx - 10);
    const endIdx = Math.min(cartesianPath.length, closestIdx + 50);
    const visiblePath = cartesianPath.slice(startIdx, endIdx);

    // Générer les bordures
    const { leftBorder, rightBorder } = generateBorders(visiblePath);

    // Mettre à jour l'état
    this.state.path = visiblePath;
    this.state.leftBorder = leftBorder;
    this.state.rightBorder = rightBorder;
    this.state.currentIndex = closestIdx - startIdx;
    
    // Calculer le bearing
    if (visiblePath.length >= 2 && this.state.currentIndex + 1 < visiblePath.length) {
      const currentPoint = visiblePath[this.state.currentIndex];
      const nextPoint = visiblePath[this.state.currentIndex + 1];
      this.state.bearing = Math.atan2(nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y) * 180 / Math.PI;
    }
  }
} 