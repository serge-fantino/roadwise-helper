import { NavigationCalculator } from '../utils/NavigationCalculator';
import { RouteManager } from '../utils/RouteManager';
import { SpeedController } from '../utils/SpeedController';
import { vehicleStateManager } from '../../VehicleStateManager';

export class SimulationUpdateManager {
  private lastUpdateTime: number = 0; // Sera initialisé au premier appel

  constructor(
    private navigationCalculator: NavigationCalculator,
    private speedController: SpeedController,
    private routeManager: RouteManager
  ) {}

  updateVehicleState(optimalSpeed: number, requiredDeceleration: number | null): boolean {
    const currentState = vehicleStateManager.getState();
    const currentPosition = currentState.position;
    
    // Calculer le temps écoulé réel
    const currentTime = Date.now();
    let timeStep = 0.1; // Défaut 100ms
    
    if (this.lastUpdateTime > 0) {
      timeStep = (currentTime - this.lastUpdateTime) / 1000; // en secondes
      // Limiter timeStep pour éviter les sauts
      timeStep = Math.min(timeStep, 0.5); // Max 500ms
    }
    this.lastUpdateTime = currentTime;
    
    console.log('[SimulationUpdateManager] timeStep:', timeStep.toFixed(3), 's');
    
    // Calculer la nouvelle vitesse avec le SpeedController
    const { speed: newSpeed, acceleration } = this.speedController.updateSpeed(
      timeStep, // Utiliser le temps écoulé réel
      optimalSpeed,
      requiredDeceleration
    );
    
    // Distance à parcourir = vitesse × temps
    const distanceToTravel = newSpeed * timeStep;
    
    console.log('[SimulationUpdateManager] Speed and distance:', {
      newSpeed: (newSpeed * 3.6).toFixed(1) + ' km/h',
      distanceToTravel: distanceToTravel.toFixed(2) + ' m',
      timeStep: timeStep.toFixed(3) + ' s'
    });

    // MODE DEBUG : Le véhicule suit la route comme un train sur des rails
    // Avancer le long de la route en parcourant les segments
    let remainingDistance = distanceToTravel;
    let newRouteIndex = this.routeManager.getCurrentIndex();
    let newPosition: [number, number] = currentPosition;
    let segmentHeading = 0;
    let segmentRatio = 0; // Position sur le segment (0 à 1)

    while (remainingDistance > 0 && newRouteIndex < this.routeManager.getRouteLength() - 1) {
      // Partir de la position actuelle pour le premier segment, puis des points de route
      const startPoint = (newRouteIndex === this.routeManager.getCurrentIndex()) ? currentPosition : this.routeManager.getRoutePoint(newRouteIndex);
      const nextRoutePoint = this.routeManager.getRoutePoint(newRouteIndex + 1);

      if (!startPoint || !nextRoutePoint) break;

      const segmentDistance = this.navigationCalculator.calculateDistance(startPoint, nextRoutePoint);

      if (remainingDistance >= segmentDistance) {
        // On peut atteindre le point suivant
        remainingDistance -= segmentDistance;
        newRouteIndex++;
        newPosition = nextRoutePoint;
        segmentRatio = 1.0; // À la fin du segment
      } else {
        // On s'arrête au milieu du segment (interpolation linéaire)
        segmentRatio = remainingDistance / segmentDistance;
        newPosition = [
          startPoint[0] + (nextRoutePoint[0] - startPoint[0]) * segmentRatio,
          startPoint[1] + (nextRoutePoint[1] - startPoint[1]) * segmentRatio
        ];
        remainingDistance = 0;
      }
    }

    // Calculer le heading interpolé sur le segment
    // Direction d'entrée = tronçon N-1 (ou N si N-1 n'existe pas)
    const prevRoutePoint = this.routeManager.getRoutePoint(Math.max(0, newRouteIndex - 1));
    const currentRoutePoint = this.routeManager.getRoutePoint(newRouteIndex);
    const nextRoutePoint = this.routeManager.getRoutePoint(Math.min(newRouteIndex + 1, this.routeManager.getRouteLength() - 1));
    const nextNextRoutePoint = this.routeManager.getRoutePoint(Math.min(newRouteIndex + 2, this.routeManager.getRouteLength() - 1));

    if (prevRoutePoint && currentRoutePoint && nextRoutePoint) {
      // Direction d'entrée du segment
      let entryHeading;
      if (newRouteIndex > 0) {
        const h = this.navigationCalculator.calculateHeading(prevRoutePoint, currentRoutePoint);
        entryHeading = this.navigationCalculator.calculateHeadingAngle(h);
      } else {
        const h = this.navigationCalculator.calculateHeading(currentRoutePoint, nextRoutePoint);
        entryHeading = this.navigationCalculator.calculateHeadingAngle(h);
      }

      // Direction de sortie du segment
      let exitHeading;
      if (newRouteIndex < this.routeManager.getRouteLength() - 2) {
        const h = this.navigationCalculator.calculateHeading(nextRoutePoint, nextNextRoutePoint);
        exitHeading = this.navigationCalculator.calculateHeadingAngle(h);
      } else {
        const h = this.navigationCalculator.calculateHeading(currentRoutePoint, nextRoutePoint);
        exitHeading = this.navigationCalculator.calculateHeadingAngle(h);
      }

      // Interpolation linéaire du heading (gérer le cas 0°/360°)
      let headingDiff = exitHeading - entryHeading;
      if (headingDiff > 180) headingDiff -= 360;
      if (headingDiff < -180) headingDiff += 360;
      
      segmentHeading = entryHeading + segmentRatio * headingDiff;
      segmentHeading = (segmentHeading + 360) % 360; // Normaliser 0-360
    }

    // Mettre à jour l'index de la route
    if (newRouteIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationUpdateManager] Updating route index from', this.routeManager.getCurrentIndex(), 'to', newRouteIndex);
      this.routeManager.updateCurrentIndex(newRouteIndex);
    }

    console.log('[SimulationUpdateManager] Position update:', {
      oldIndex: this.routeManager.getCurrentIndex(),
      newIndex: newRouteIndex,
      heading: segmentHeading.toFixed(1) + '°',
      distance: distanceToTravel.toFixed(2) + 'm'
    });

    // Mise à jour de l'état via le gestionnaire
    vehicleStateManager.updateState({
      position: newPosition,
      speed: newSpeed,
      acceleration: acceleration,
      heading: segmentHeading
    });

    return true;
  }
}