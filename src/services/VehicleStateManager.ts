export interface VehicleState {
  position: [number, number];
  speed: number;
  acceleration: number;
  heading: number;
}

class VehicleStateManager {
  private static instance: VehicleStateManager;
  private state: VehicleState;
  private observers: ((state: VehicleState) => void)[] = [];

  private constructor() {
    this.state = {
      position: [48.8566, 2.3522],
      speed: 0,
      acceleration: 0,
      heading: 0
    };
  }

  public static getInstance(): VehicleStateManager {
    if (!VehicleStateManager.instance) {
      VehicleStateManager.instance = new VehicleStateManager();
    }
    return VehicleStateManager.instance;
  }

  public updateState(newState: Partial<VehicleState>): void {
    console.log('[VehicleStateManager] updateState', newState);
    this.state = { ...this.state, ...newState };
    this.notifyObservers();
  }

  public getState(): VehicleState {
    return { ...this.state };
  }

  public addObserver(observer: (state: VehicleState) => void): void {
    this.observers.push(observer);
  }

  public removeObserver(observer: (state: VehicleState) => void): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers(): void {
    const stateCopy = this.getState();
    this.observers.forEach(observer => observer(stateCopy));
  }
}

export const vehicleStateManager = VehicleStateManager.getInstance(); 