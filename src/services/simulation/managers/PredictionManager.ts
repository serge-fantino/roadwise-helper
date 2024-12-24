interface PredictionState {
  optimalSpeed: number;
  requiredDeceleration: number | null;
}

export class PredictionManager {
  getLatestPrediction(): PredictionState {
    const roadPredictor = (window as any).roadPredictor;
    const prediction = roadPredictor?.getCurrentPrediction();
    
    console.log('PredictionManager received prediction:', prediction);

    if (!prediction) {
      console.log('No prediction available, using default values');
      return {
        optimalSpeed: 90,
        requiredDeceleration: null
      };
    }

    // La vitesse optimale est en km/h dans le predictor
    const optimalSpeed = prediction.optimalSpeed || 90;
    
    console.log('PredictionManager returning:', {
      optimalSpeed,
      requiredDeceleration: prediction.requiredDeceleration
    });

    return {
      optimalSpeed,
      requiredDeceleration: prediction.requiredDeceleration
    };
  }
}