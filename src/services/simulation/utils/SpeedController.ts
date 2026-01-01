import { vehicleStateManager } from "@/services/VehicleStateManager";

export class SpeedController {
  private currentSpeed: number = 0;
  private currentAcceleration: number = 0;
  private readonly MAX_SPEED = 36.11; // 130 km/h en m/s
  private readonly MIN_SPEED = 10 / 3.6; // 10 km/h minimum en m/s

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getCurrentAcceleration(): number {
    return this.currentAcceleration;
  }

  setCurrentSpeed(speed: number) {
    this.currentSpeed = speed;
    // Mettre à jour l'état global du véhicule
    vehicleStateManager.updateState({
      speed: speed,
      acceleration: this.currentAcceleration
    });
  }

  updateSpeed(
    timeStep: number, 
    optimalSpeed: number, 
    requiredDeceleration: number | null
  ): { speed: number; acceleration: number } {
    // Convertir la vitesse optimale de km/h en m/s
    const optimalSpeedMS = optimalSpeed / 3.6;
    const GRAVITY = 9.81;
    const ACCELERATION_FACTOR = 0.2;
    const DECELERATION_FACTOR = 0.3;
    const MAX_DECELERATION = 0.5;
    
    let acceleration = 0;
    const speedDiff = optimalSpeedMS - this.currentSpeed;

    console.log('SpeedController update:', {
      currentSpeed: this.currentSpeed * 3.6,
      optimalSpeed,
      requiredDeceleration,
      speedDiff: speedDiff * 3.6
    });

    // Si une décélération est requise, l'appliquer en priorité
    if (requiredDeceleration !== null) {
      acceleration = -GRAVITY * Math.min(Math.abs(requiredDeceleration), MAX_DECELERATION);
      console.log('Applying required deceleration:', acceleration);
    }
    // Sinon, ajuster la vitesse en fonction de la vitesse optimale
    else if (Math.abs(speedDiff) > 0.5) { // Seuil de 0.5 m/s pour éviter les oscillations
      if (speedDiff > 0) {
        acceleration = GRAVITY * ACCELERATION_FACTOR;
        console.log('Accelerating to reach optimal speed:', acceleration);
      } else {
        acceleration = -GRAVITY * DECELERATION_FACTOR;
        console.log('Decelerating to reach optimal speed:', acceleration);
      }
    }

    // Mise à jour de la vitesse avec le pas de temps
    let newSpeed = this.currentSpeed + acceleration * timeStep;

    // Limites de vitesse
    newSpeed = Math.max(this.MIN_SPEED, Math.min(newSpeed, this.MAX_SPEED));
    
    // Ne pas dépasser la vitesse optimale lors de l'accélération
    if (acceleration > 0) {
      newSpeed = Math.min(newSpeed, optimalSpeedMS);
    }

    this.currentSpeed = newSpeed;
    this.currentAcceleration = acceleration / GRAVITY; // Stockage en g

    console.log('Speed updated:', {
      newSpeed: this.currentSpeed * 3.6,
      acceleration: this.currentAcceleration,
      optimalSpeedMS: optimalSpeedMS * 3.6
    });
    
    return { 
      speed: this.currentSpeed,
      acceleration: this.currentAcceleration
    };
  }
}