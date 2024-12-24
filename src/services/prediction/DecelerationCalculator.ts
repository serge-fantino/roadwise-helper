export class DecelerationCalculator {
  calculateRequiredDeceleration(
    currentSpeed: number,
    targetSpeed: number,
    distance: number
  ): number | null {
    if (currentSpeed <= targetSpeed) return null;

    const vx = currentSpeed / 3.6;
    const v0 = targetSpeed / 3.6;
    return (v0 * v0 - vx * vx) / (2 * distance * 9.81);
  }
}