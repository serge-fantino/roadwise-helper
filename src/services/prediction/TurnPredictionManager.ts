import { TurnPrediction } from './PredictionTypes';
import { TurnAnalyzer } from './TurnAnalyzer';
import { SpeedCalculator } from './SpeedCalculator';
import { SpeedLimitCache } from '../SpeedLimitCache';
import { Settings } from '../SettingsService';
import { calculateDistance } from '../../utils/mapUtils';

export class TurnPredictionManager {
  private turns: TurnPrediction[] = [];
  private turnAnalyzer: TurnAnalyzer;
  private speedCalculator: SpeedCalculator;
  private speedLimitCache: SpeedLimitCache;

  constructor() {
    this.turnAnalyzer = new TurnAnalyzer();
    this.speedCalculator = new SpeedCalculator();
    this.speedLimitCache = new SpeedLimitCache();
  }

  async updateTurnDistances(currentPosition: [number, number]): Promise<void> {
    this.turns = await Promise.all(
      this.turns.map(async (turn) => {
        const distance = calculateDistance(currentPosition, turn.position);
        return { ...turn, distance };
      })
    );
  }

  removePastTurns(): void {
    this.turns = this.turns.filter(turn => turn.distance > 0);
  }

  async findNewTurns(
    routePoints: [number, number][],
    startIndex: number,
    currentPosition: [number, number],
    settings: Settings,
    currentSpeedLimit: number | null = null
  ): Promise<void> {
    const turnInfo = this.turnAnalyzer.analyze(routePoints, startIndex, settings);
    if (!turnInfo) return;

    const distance = calculateDistance(currentPosition, turnInfo.position);
    if (distance <= settings.predictionDistance) {
      // Utiliser la limite de vitesse fournie si disponible
      const speedLimit = currentSpeedLimit || await this.speedLimitCache.getSpeedLimit(
        turnInfo.position[0],
        turnInfo.position[1]
      );
      
      console.log('Turn speed calculation:', {
        turnAngle: turnInfo.angle,
        speedLimit,
        position: turnInfo.position
      });

      const optimalSpeed = this.speedCalculator.calculateOptimalSpeed(
        turnInfo.angle,
        speedLimit,
        settings
      );

      this.turns.push({
        ...turnInfo,
        speedLimit,
        optimalSpeed,
        distance
      });
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