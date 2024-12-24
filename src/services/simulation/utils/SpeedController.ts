const GRAVITY = 9.81;
const ACCELERATION_FACTOR = 0.2;
const DECELERATION_FACTOR = 0.3;

export class SpeedController {
  private currentSpeed: number = 0;

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  setCurrentSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  updateSpeed(
    timeStep: number, 
    optimalSpeed: number, 
    requiredDeceleration: number | null
  ): number {
    let acceleration = 0;
    const optimalSpeedMS = optimalSpeed / 3.6;

    if (this.currentSpeed < optimalSpeedMS) {
      acceleration = GRAVITY * ACCELERATION_FACTOR;
    } else if (this.currentSpeed > optimalSpeedMS) {
      const baseDeceleration = GRAVITY * DECELERATION_FACTOR;
      const predictionDeceleration = requiredDeceleration ? GRAVITY * Math.abs(requiredDeceleration) : 0;
      acceleration = -Math.max(baseDeceleration, predictionDeceleration);
    }

    this.currentSpeed = Math.max(0, this.currentSpeed + acceleration * timeStep);
    return this.currentSpeed;
  }
}