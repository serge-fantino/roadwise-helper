export interface TripState {
  positions: Array<[number, number]>;
  metrics: {
    distance?: number;
    time?: number;
    speed?: number;
    acceleration?: number;
  };
}

class TripService {
  private static instance: TripService;
  private state: TripState;
  private maxLength: number = 60;
  private observers: ((state: TripState) => void)[] = [];
  private lastUpdateTime?: number;

  private constructor() {
    this.state = {
      positions: [],
      metrics: {}
    };
  }

  public static getInstance(): TripService {
    if (!TripService.instance) {
      TripService.instance = new TripService();
    }
    return TripService.instance;
  }

  public addPosition(position: [number, number]): void {
    // Ne pas ajouter si identique au dernier point
    if (this.state.positions.length > 0) {
      const lastPos = this.state.positions[0];
      if (lastPos[0] === position[0] && lastPos[1] === position[1]) {
        return;
      }
    }

    // Ajouter la nouvelle position en début de tableau
    this.state.positions.unshift(position);

    // Limiter la taille du tableau
    if (this.state.positions.length > this.maxLength) {
      this.state.positions = this.state.positions.slice(0, this.maxLength);
    }

    // Calculer les métriques
    this.updateMetrics(position);
    this.notifyObservers();
  }

  private updateMetrics(newPosition: [number, number]): void {
    const now = Date.now();
    
    if (this.state.positions.length >= 2) {
      const prevPosition = this.state.positions[1];
      
      // Calculer la distance
      const distance = this.calculateDistance(prevPosition, newPosition);
      this.state.metrics.distance = distance;

      // Calculer le temps écoulé
      if (this.lastUpdateTime) {
        const timeElapsed = (now - this.lastUpdateTime) / 1000; // en secondes
        this.state.metrics.time = timeElapsed;

        // Calculer la vitesse
        const speed = distance / timeElapsed; // m/s
        const prevSpeed = this.state.metrics.speed || 0;
        this.state.metrics.speed = speed;

        // Calculer l'accélération
        this.state.metrics.acceleration = (speed - prevSpeed) / timeElapsed;
      }
    }

    this.lastUpdateTime = now;
  }

  private calculateDistance(pos1: [number, number], pos2: [number, number]): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = pos1[0] * Math.PI/180;
    const φ2 = pos2[0] * Math.PI/180;
    const Δφ = (pos2[0]-pos1[0]) * Math.PI/180;
    const Δλ = (pos2[1]-pos1[1]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  public reset(initialPosition: [number, number]): void {
    this.state = {
      positions: [initialPosition],
      metrics: {}
    };
    this.lastUpdateTime = undefined;
    this.notifyObservers();
  }

  public getState(): TripState {
    return {
      positions: [...this.state.positions],
      metrics: { ...this.state.metrics }
    };
  }

  public addObserver(observer: (state: TripState) => void): void {
    this.observers.push(observer);
  }

  public removeObserver(observer: (state: TripState) => void): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers(): void {
    const stateCopy = this.getState();
    this.observers.forEach(observer => observer(stateCopy));
  }
}

export const tripService = TripService.getInstance(); 