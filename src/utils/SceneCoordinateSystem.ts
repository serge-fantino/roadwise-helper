/**
 * Système de coordonnées pour la scène 3D
 * Gère la conversion GPS (lat/lon) → Cartésien (x,y) → Three.js (x,y,z)
 */
export class SceneCoordinateSystem {
  private origin: [number, number]; // [lat, lon] origine GPS
  private cosLat: number; // facteur de zoom basé sur la latitude
  private scale: number = 111000; // mètres par degré

  constructor(origin: [number, number]) {
    this.origin = origin;
    this.cosLat = Math.cos((origin[0] * Math.PI) / 180);
  }

  /**
   * Convertir une position GPS en coordonnées cartésiennes (mètres)
   */
  gpsToCartesian(gpsPosition: [number, number]): { x: number; y: number } {
    return {
      x: (gpsPosition[1] - this.origin[1]) * this.scale * this.cosLat, // longitude → x (Est/Ouest)
      y: (gpsPosition[0] - this.origin[0]) * this.scale                 // latitude → y (Nord/Sud)
    };
  }

  /**
   * Convertir des coordonnées cartésiennes en position Three.js
   * Three.js: x = Est/Ouest, z = -Nord/Sud (inversé), y = hauteur
   */
  cartesianToThreeJS(cartesian: { x: number; y: number }, height: number = 0): { x: number; y: number; z: number } {
    return {
      x: cartesian.x,
      y: height,
      z: -cartesian.y // Inverser Y pour Three.js
    };
  }

  /**
   * Conversion directe GPS → Three.js
   */
  gpsToThreeJS(gpsPosition: [number, number], height: number = 0): { x: number; y: number; z: number } {
    const cartesian = this.gpsToCartesian(gpsPosition);
    return this.cartesianToThreeJS(cartesian, height);
  }

  /**
   * Obtenir l'origine GPS
   */
  getOrigin(): [number, number] {
    return this.origin;
  }

  /**
   * Obtenir le facteur cosLat
   */
  getCosLat(): number {
    return this.cosLat;
  }
}

