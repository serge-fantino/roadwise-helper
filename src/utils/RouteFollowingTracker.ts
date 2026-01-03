/**
 * Tracker qui suit la route de manière contrainte
 * La caméra reste toujours sur la route et se déplace selon la distance curviligne
 */

import { CartesianPoint } from '../services/route/RouteProjectionService';

/**
 * Projette un point GPS sur la route et trouve le point le plus proche
 */
function projectOnRoute(
  gpsPoint: [number, number],
  routePoints: CartesianPoint[]
): { point: CartesianPoint; index: number; distance: number } | null {
  if (routePoints.length === 0) return null;

  let minDistance = Infinity;
  let closestPoint: CartesianPoint = routePoints[0];
  let closestIndex = 0;

  // Chercher le point le plus proche sur la route
  for (let i = 0; i < routePoints.length; i++) {
    const rp = routePoints[i];
    const dx = gpsPoint[0] - rp.x;
    const dy = gpsPoint[1] - rp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = rp;
      closestIndex = i;
    }
  }

  return { point: closestPoint, index: closestIndex, distance: minDistance };
}

/**
 * Calcule la distance cumulée le long de la route
 */
function calculateCumulativeDistances(routePoints: CartesianPoint[]): number[] {
  const distances = [0];
  let cumulative = 0;

  for (let i = 1; i < routePoints.length; i++) {
    const p1 = routePoints[i - 1];
    const p2 = routePoints[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    cumulative += dist;
    distances.push(cumulative);
  }

  return distances;
}

/**
 * Interpole une position sur la route à partir d'une distance curviligne
 */
function interpolateOnRoute(
  distance: number,
  routePoints: CartesianPoint[],
  cumulativeDistances: number[]
): { point: CartesianPoint; index: number } {
  if (routePoints.length === 0) {
    return { point: { x: 0, y: 0 }, index: 0 };
  }

  // Si distance négative, rester au début
  if (distance <= 0) {
    return { point: routePoints[0], index: 0 };
  }

  // Si distance au-delà de la fin, rester à la fin
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  if (distance >= totalDistance) {
    return {
      point: routePoints[routePoints.length - 1],
      index: routePoints.length - 1
    };
  }

  // Trouver le segment qui contient cette distance
  for (let i = 0; i < cumulativeDistances.length - 1; i++) {
    const d1 = cumulativeDistances[i];
    const d2 = cumulativeDistances[i + 1];

    if (distance >= d1 && distance <= d2) {
      // Interpoler dans ce segment
      const segmentLength = d2 - d1;
      const t = segmentLength > 0 ? (distance - d1) / segmentLength : 0;

      const p1 = routePoints[i];
      const p2 = routePoints[i + 1];

      return {
        point: {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        },
        index: i
      };
    }
  }

  // Fallback
  return { point: routePoints[0], index: 0 };
}

/**
 * Tracker qui suit la route de manière contrainte
 * Utilise une coordonnée curviligne (distance le long de la route)
 */
export class RouteFollowingTracker {
  private routePoints: CartesianPoint[];
  private cumulativeDistances: number[];
  
  // État : distance curviligne le long de la route
  private currentDistance: number;
  private velocity: number; // vitesse le long de la route (m/s)
  
  // Convergence
  private targetDistance: number | null = null;
  private convergenceRate: number = 0.3; // 30% par seconde
  
  // Seuil de recalage instantané
  private readonly INSTANT_RECALIBRATION_THRESHOLD = 20; // mètres
  
  constructor(
    routePoints: CartesianPoint[],
    initialDistance: number = 0
  ) {
    this.routePoints = routePoints;
    this.cumulativeDistances = calculateCumulativeDistances(routePoints);
    this.currentDistance = initialDistance;
    this.velocity = 0;
  }
  
  /**
   * Met à jour la route (si elle change)
   */
  updateRoute(routePoints: CartesianPoint[]): void {
    this.routePoints = routePoints;
    this.cumulativeDistances = calculateCumulativeDistances(routePoints);
    
    // Limiter la distance courante à la longueur de la route
    const totalDistance = this.cumulativeDistances[this.cumulativeDistances.length - 1];
    this.currentDistance = Math.min(this.currentDistance, totalDistance);
  }
  
  /**
   * Met à jour avec une nouvelle mesure GPS
   * @param gpsPosition Position GPS [x, y]
   * @param speed Vitesse du véhicule (m/s)
   */
  updateGPSMeasurement(gpsPosition: [number, number], speed: number): void {
    // Projeter le GPS sur la route
    const projection = projectOnRoute(gpsPosition, this.routePoints);
    
    if (!projection) return;
    
    const { distance, index } = projection;
    const targetDistance = this.cumulativeDistances[index];
    
    // Mettre à jour la vitesse (moyenne glissante)
    const alpha = 0.3;
    this.velocity = alpha * speed + (1 - alpha) * this.velocity;
    
    // Si la distance est trop importante, recalage instantané
    if (distance > this.INSTANT_RECALIBRATION_THRESHOLD) {
      console.log('[RouteFollowingTracker] Recalage instantané:', {
        distance,
        from: this.currentDistance,
        to: targetDistance
      });
      this.currentDistance = targetDistance;
      this.targetDistance = null;
    } else {
      // Sinon, convergence progressive
      this.targetDistance = targetDistance;
    }
  }
  
  /**
   * Met à jour la position interpolée (appelé à chaque frame)
   * @param dt Delta temps en secondes
   * @returns Position cartésienne interpolée
   */
  updateFrame(dt: number): { point: CartesianPoint; lookAhead: CartesianPoint } {
    // Avancer selon la vitesse
    this.currentDistance += this.velocity * dt;
    
    // Converger vers la cible si elle existe
    if (this.targetDistance !== null) {
      const error = this.targetDistance - this.currentDistance;
      const correction = error * this.convergenceRate * dt;
      this.currentDistance += correction;
      
      // Si on est assez proche, arrêter la convergence
      if (Math.abs(error) < 0.1) {
        this.targetDistance = null;
      }
    }
    
    // Limiter à la longueur de la route
    const totalDistance = this.cumulativeDistances[this.cumulativeDistances.length - 1];
    this.currentDistance = Math.max(0, Math.min(this.currentDistance, totalDistance));
    
    // Interpoler la position sur la route
    const interpolated = interpolateOnRoute(
      this.currentDistance,
      this.routePoints,
      this.cumulativeDistances
    );
    
    // Calculer le point de visée (regarder devant)
    const lookAheadDistance = Math.max(10, this.velocity * 2); // au moins 10m
    const lookAheadInterpolated = interpolateOnRoute(
      this.currentDistance + lookAheadDistance,
      this.routePoints,
      this.cumulativeDistances
    );
    
    return {
      point: interpolated.point,
      lookAhead: lookAheadInterpolated.point
    };
  }
  
  /**
   * Obtient la distance curviligne actuelle
   */
  getCurrentDistance(): number {
    return this.currentDistance;
  }
  
  /**
   * Obtient la vitesse estimée
   */
  getVelocity(): number {
    return this.velocity;
  }
  
  /**
   * Réinitialise le tracker
   */
  reset(distance: number = 0): void {
    this.currentDistance = distance;
    this.velocity = 0;
    this.targetDistance = null;
  }
}

