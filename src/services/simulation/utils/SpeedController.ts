const GRAVITY = 9.81;
const ACCELERATION_FACTOR = 0.2;
const DECELERATION_FACTOR = 0.3;
const MAX_DECELERATION = 0.5; // 0.5g maximum

export class SpeedController {
  private currentSpeed: number = 0;
  private currentAcceleration: number = 0;

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getCurrentAcceleration(): number {
    return this.currentAcceleration;
  }

  setCurrentSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  updateSpeed(
    timeStep: number, 
    optimalSpeed: number, 
    requiredDeceleration: number | null
  ): { speed: number; acceleration: number } {
    // Convertir la vitesse optimale de km/h en m/s
    const optimalSpeedMS = optimalSpeed / 3.6;
    let acceleration = 0;

    // Log des valeurs pour debug
    console.log('SpeedController update:', {
      currentSpeed: this.currentSpeed * 3.6,
      optimalSpeed,
      requiredDeceleration,
      timeStep
    });

    if (this.currentSpeed < optimalSpeedMS) {
      // Accélération normale
      acceleration = GRAVITY * ACCELERATION_FACTOR;
      console.log('Accelerating:', acceleration);
    } else if (this.currentSpeed > optimalSpeedMS) {
      // Calcul de la décélération
      let deceleration;
      
      if (requiredDeceleration !== null) {
        // Utiliser la décélération requise si elle est fournie
        deceleration = Math.min(Math.abs(requiredDeceleration), MAX_DECELERATION);
        console.log('Using required deceleration:', deceleration);
      } else {
        // Utiliser la décélération par défaut
        deceleration = DECELERATION_FACTOR;
        console.log('Using default deceleration:', deceleration);
      }

      acceleration = -GRAVITY * deceleration;
    }

    // Mise à jour de la vitesse avec le pas de temps
    const newSpeed = Math.max(0, this.currentSpeed + acceleration * timeStep);
    
    // Ne pas dépasser la vitesse optimale lors de l'accélération
    this.currentSpeed = Math.min(newSpeed, optimalSpeedMS);
    this.currentAcceleration = acceleration / GRAVITY; // Store acceleration in g

    console.log('New speed:', this.currentSpeed * 3.6, 'km/h');
    console.log('Acceleration:', this.currentAcceleration, 'g');
    
    return { 
      speed: this.currentSpeed,
      acceleration: this.currentAcceleration
    };
  }
}