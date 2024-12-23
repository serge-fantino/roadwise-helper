import { Settings } from '../SettingsService';

export class SpeedCalculator {
  calculateOptimalSpeed(angle: number, speedLimit: number | null, settings: Settings): number {
    const baseSpeed = speedLimit || settings.defaultSpeed;
    const absAngle = Math.abs(angle);
    
    if (absAngle >= settings.maxTurnAngle) {
      return settings.minTurnSpeed;
    } else {
      const ratio = absAngle / settings.maxTurnAngle;
      return baseSpeed - (ratio * (baseSpeed - settings.minTurnSpeed));
    }
  }
}