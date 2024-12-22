import { getSpeedLimit } from '../utils/osmUtils';

type PredictionObserver = (speedLimit: number | null) => void;

class PredictionService {
  private static instance: PredictionService;
  private observers: PredictionObserver[] = [];
  private currentSpeedLimit: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Singleton
  }

  public static getInstance(): PredictionService {
    if (!PredictionService.instance) {
      PredictionService.instance = new PredictionService();
    }
    return PredictionService.instance;
  }

  public addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.currentSpeedLimit));
  }

  public async updatePrediction(position: [number, number]) {
    try {
      const [lat, lon] = position;
      const speedLimit = await getSpeedLimit(lat, lon);
      
      if (speedLimit !== this.currentSpeedLimit) {
        this.currentSpeedLimit = speedLimit;
        this.notifyObservers();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la prédiction:', error);
    }
  }

  public getCurrentSpeedLimit(): number | null {
    return this.currentSpeedLimit;
  }

  public startUpdates(position: [number, number]) {
    this.updatePrediction(position);
    
    // Mettre à jour toutes les 10 secondes
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.updatePrediction(position);
      }, 10000);
    }
  }

  public stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const predictionService = PredictionService.getInstance();