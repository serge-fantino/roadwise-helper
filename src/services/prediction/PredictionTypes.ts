export interface RoadPrediction {
  distance: number;  // Distance jusqu'au prochain virage en mètres
  angle: number;     // Angle du virage en degrés
  position: [number, number]; // Position du virage
  speedLimit?: number; // Vitesse limite en km/h
  optimalSpeed?: number; // Vitesse optimale en km/h
  requiredDeceleration?: number | null; // Décélération requise en g
}

export type PredictionObserver = (prediction: RoadPrediction | null) => void;