import { EnhancedRoutePoint } from "../services/route/RoutePlannerTypes";
import { generateBorders, CartesianPoint } from "../services/route/RouteProjectionService";

export interface DriveViewState {
  path: CartesianPoint[];
  leftBorder: CartesianPoint[];
  rightBorder: CartesianPoint[];
  currentIndex: number;
  bearing: number;
  origin: [number, number]; // Position GPS utilisée comme origine pour la conversion
  cosLat: number; // cosinus de la latitude pour la conversion
}

export class DriveViewModel {
  private state: DriveViewState = {
    path: [],
    leftBorder: [],
    rightBorder: [],
    currentIndex: 0,
    bearing: 0,
    origin: [0, 0],
    cosLat: 1
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

  // Convertir une position GPS en coordonnées cartésiennes en utilisant l'origine de la scène
  public gpsToCartesian(gpsPosition: [number, number]): CartesianPoint {
    return this.toCartesianPoint(gpsPosition, this.state.origin, this.state.cosLat);
  }

  public updateFromPosition(position: [number, number], enhancedPoints: EnhancedRoutePoint[]) {
    if (enhancedPoints.length < 2) return;
    const cosLat = Math.cos((position[0] * Math.PI) / 180);
    
    // Stocker l'origine et cosLat pour conversion ultérieure
    this.state.origin = position;
    this.state.cosLat = cosLat;
    
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
    
    // DEBUG: vérifier si les points progressent dans le bon sens
    if (visiblePath.length > 10) {
      const before = visiblePath[Math.max(0, this.state.currentIndex - 5)];
      const current = visiblePath[this.state.currentIndex];
      const after = visiblePath[Math.min(visiblePath.length - 1, this.state.currentIndex + 5)];
      console.log('[DriveViewModel] Path direction check:', {
        originGPS: position,
        beforeIdx: Math.max(0, this.state.currentIndex - 5),
        before: { x: before.x.toFixed(1), y: before.y.toFixed(1) },
        currentIdx: this.state.currentIndex,
        current: { x: current.x.toFixed(1), y: current.y.toFixed(1) },
        afterIdx: Math.min(visiblePath.length - 1, this.state.currentIndex + 5),
        after: { x: after.x.toFixed(1), y: after.y.toFixed(1) },
        directionForward: after.y > current.y ? 'Nord' : after.y < current.y ? 'Sud' : 'E/O'
      });
    }
    
    // Calculer le bearing
    if (visiblePath.length >= 2 && this.state.currentIndex + 1 < visiblePath.length) {
      const currentPoint = visiblePath[this.state.currentIndex];
      const nextPoint = visiblePath[this.state.currentIndex + 1];
      this.state.bearing = Math.atan2(nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y) * 180 / Math.PI;
    }
  }
} 