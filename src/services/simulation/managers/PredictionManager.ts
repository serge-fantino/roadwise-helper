interface PredictionState {
  optimalSpeed: number;
  requiredDeceleration: number | null;
}

export class PredictionManager {
  getLatestPrediction(): PredictionState {
    const prediction = (window as any).roadPredictor?.getCurrentPrediction();
    
    return {
      optimalSpeed: prediction?.optimalSpeed || 90,
      requiredDeceleration: prediction?.requiredDeceleration || null
    };
  }
}