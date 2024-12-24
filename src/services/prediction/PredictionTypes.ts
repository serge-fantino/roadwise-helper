export interface TurnPrediction {
  distance: number;  // Distance jusqu'au prochain virage en mètres
  angle: number;     // Angle du virage en degrés
  position: [number, number]; // Position du virage
  index: number; // Index du point dans la route
  speedLimit?: number; // Vitesse limite en km/h
  optimalSpeed?: number; // Vitesse optimale en km/h
  requiredDeceleration?: number | null; // Décélération requise en g
}

export type RoadPrediction = TurnPrediction;

export type PredictionObserver = (prediction: RoadPrediction | null, allTurns: TurnPrediction[]) => void;