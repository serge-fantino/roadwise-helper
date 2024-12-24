export class SimulationStateManager {
  private isIdle: boolean = true;

  setIdle(value: boolean) {
    this.isIdle = value;
  }

  isSimulationIdle(): boolean {
    return this.isIdle;
  }
}