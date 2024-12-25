import { TurnPrediction } from './PredictionTypes';
import { SpeedLimitCache } from '../SpeedLimitCache';
import { Settings } from '../SettingsService';
import { calculateDistance } from '../../utils/mapUtils';
import { CurveDetector } from './CurveAnalyzer';
import { CurveAssistanceCalculator } from './CurveAssistant';

export class TurnPredictionManager {
  private turns: TurnPrediction[] = [];
  private speedLimitCache: SpeedLimitCache;
  private curveDetector: CurveDetector;
  private curveAssistant: CurveAssistanceCalculator;

  constructor() {
    this.speedLimitCache = new SpeedLimitCache();
    this.curveDetector = new CurveDetector();
    this.curveAssistant = new CurveAssistanceCalculator();
  }

  async updateTurnDistances(currentPosition: [number, number]): Promise<void> {
    this.turns = await Promise.all(
      this.turns.map(async (turn) => {
        const distance = calculateDistance(currentPosition, turn.position);
        return { ...turn, distance };
      })
    );
  }

  removePastTurns(currentIndex: number): void {
    this.turns = this.turns.filter(turn => turn.index > currentIndex);
    console.log('Turns after removing past turns:', this.turns.length);
  }

  async findNewTurns(
    routePoints: [number, number][],
    startIndex: number,
    currentPosition: [number, number],
    settings: Settings,
    currentSpeedLimit: number | null = null
  ): Promise<void> {
    // Analyser la courbe à partir du point de départ
    const curveAnalysis = this.curveDetector.analyzeCurve(routePoints, startIndex);
    
    if (!curveAnalysis) {
      console.log('No curve detected at index:', startIndex);
      return;
    }

    const distance = calculateDistance(currentPosition, curveAnalysis.apex);
    
    // Ne traiter que les virages dans la distance de prédiction
    if (distance <= settings.predictionDistance) {
      const speedLimit = currentSpeedLimit || await this.speedLimitCache.getSpeedLimit(
        curveAnalysis.apex[0],
        curveAnalysis.apex[1]
      );

      // Calculer les vitesses et points de freinage avec CurveAssistant
      const curveCalculations = this.curveAssistant.calculateAll(
        settings.currentSpeed || 0,
        distance,
        curveAnalysis,
        speedLimit,
        settings.drivingStyle || 'prudent'
      );

      // Créer une nouvelle prédiction de virage
      const turnPrediction: TurnPrediction = {
        distance,
        angle: curveAnalysis.apexAngle,
        position: curveAnalysis.apex,
        index: startIndex,
        speedLimit,
        optimalSpeed: curveCalculations.optimalCurveSpeed,
        requiredDeceleration: distance > curveCalculations.brakingPoint ? null : 
          (curveCalculations.optimalCurveSpeed - (settings.currentSpeed || 0)) / (distance || 1)
      };

      console.log('New turn prediction:', {
        distance,
        angle: curveAnalysis.apexAngle,
        optimalSpeed: curveCalculations.optimalCurveSpeed,
        brakingPoint: curveCalculations.brakingPoint
      });

      this.turns.push(turnPrediction);
    }
  }

  sortTurns(): void {
    this.turns.sort((a, b) => a.distance - b.distance);
  }

  getTurns(): TurnPrediction[] {
    return this.turns;
  }

  getNextTurn(): TurnPrediction | null {
    return this.turns.length > 0 ? this.turns[0] : null;
  }
}