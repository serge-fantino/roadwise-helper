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
    currentSpeed: number,
    currentSpeedLimit: number | null = null
  ): Promise<void> {

    let distance = 0;
    let turnCount = 0;
    let nextIndex = startIndex

    while (distance <= 2000 && turnCount < 10) {
      // Analyser la courbe à partir du point de départ
      const curveAnalysis = this.curveDetector.analyzeCurve(routePoints, nextIndex, settings);
      
      if (!curveAnalysis) {
        console.log('No curve detected after index:', nextIndex);
        return;
      }

      distance = calculateDistance(currentPosition, curveAnalysis.startPoint);
    
      const speedLimit = currentSpeedLimit || await this.speedLimitCache.getSpeedLimit(
        curveAnalysis.apex[0],
        curveAnalysis.apex[1]
      );

      // Calculer les vitesses et points de freinage avec CurveAssistant
      const curveCalculations = this.curveAssistant.calculateAll(
        currentSpeed,
        distance,
        curveAnalysis,
        speedLimit,
        settings.drivingStyle
      );

      // Créer une nouvelle prédiction de virage
      const turnPrediction: TurnPrediction = {
        distance,
        angle: curveAnalysis.apexAngle,
        position: curveAnalysis.startPoint,
        index: curveAnalysis.startIndex,
        speedLimit,
        optimalSpeed: curveCalculations.optimalCurveSpeed,
        requiredDeceleration: distance > curveCalculations.brakingPoint ? null : 
          (curveCalculations.optimalCurveSpeed - currentSpeed) / (distance || 1),
        curveInfo: curveAnalysis
      };

      console.log('New turn prediction:', {
        distance,
        angle: curveAnalysis.apexAngle,
        optimalSpeed: curveCalculations.optimalCurveSpeed,
        brakingPoint: curveCalculations.brakingPoint
      });

      this.turns.push(turnPrediction);
      turnCount++;
      nextIndex = curveAnalysis.endIndex+1;
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