import { TurnPrediction } from './PredictionTypes';
import { SpeedLimitCache } from '../SpeedLimitCache';
import { Settings } from '../SettingsService';
import { calculateDistance } from '../../utils/mapUtils';
import { CurveDetector } from './CurveAnalyzer';
import { CurveAssistanceCalculator } from './CurveAssistant';
import { EnhancedRoutePoint } from '../route/RoutePlannerTypes';

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

  updateTurnDistances(
    currentPosition: [number, number], 
    currentIndex: number,
    routePoints: [number, number][]
  ): void {
    for (const turn of this.turns) {
        turn.distance = this.calculateRoadDistanceToIndex(
            currentPosition, 
            currentIndex, 
            turn.curveInfo.startIndex, 
            routePoints
        );
    }
  }

  calculateRoadDistanceToIndex(
    currentPosition: [number, number], 
    startIndex: number, 
    endIndex: number,
    routePoints: [number, number][]
  ): number {
    let distance = calculateDistance(currentPosition, routePoints[startIndex]);
    for (let i = startIndex+1; i <= endIndex; i++) {
      distance += calculateDistance(routePoints[i-1], routePoints[i]);
    }
    return distance;
  }

  removePastTurns(currentIndex: number): void {
    // Supprimer les virages dont on a déjà dépassé la fin
    // On garde un peu de marge pour éviter de supprimer trop tôt
    const margin = 5; // indices de marge
    this.turns = this.turns.filter(turn => turn.curveInfo.endIndex + margin >= currentIndex);
  }

  async recalculateTurnSpeeds(
    currentSpeed: number,
    currentSpeedLimit: number | null,
    settings: Settings
  ): Promise<void> {
    // Recalculer les vitesses optimales et décélérations pour tous les virages existants
    for (const turn of this.turns) {
      const speedLimit = turn.speedLimit || currentSpeedLimit || 
        await this.speedLimitCache.getSpeedLimit(turn.position[0], turn.position[1]);
      
      const curveCalculations = this.curveAssistant.calculateAll(
        currentSpeed,
        turn.distance,
        turn.curveInfo,
        speedLimit,
        settings.drivingStyle
      );

      turn.optimalSpeed = curveCalculations.optimalCurveSpeed;
      turn.speedLimit = speedLimit;
      turn.requiredDeceleration = turn.distance > curveCalculations.brakingPoint ? null : 
        (curveCalculations.optimalCurveSpeed - currentSpeed) / (turn.distance || 1);
    }
  }

  async findNewTurns(
    enhancedPoints: EnhancedRoutePoint[],
    startIndex: number,
    currentPosition: [number, number],
    currentIndex: number, // Index actuel sur la route
    settings: Settings,
    currentSpeed: number,
    currentSpeedLimit: number | null = null
  ): Promise<void> {

    // Commencer à chercher à partir de startIndex, mais ignorer les virages qui sont déjà passés
    let nextIndex = Math.max(startIndex, currentIndex - 10); // Commencer un peu avant la position actuelle
    const MAX_DISTANCE = 10000; // 10km en mètres
    const MAX_TURNS = 5; // Maximum 5 virages
    
    console.log('[TurnPredictionManager] Start detecting curves from index:', nextIndex, 'currentIndex:', currentIndex);
    
    while (this.turns.length < MAX_TURNS && nextIndex < enhancedPoints.length - 2) {
      const curveAnalysis = this.curveDetector.analyzeCurve(
        enhancedPoints,
        nextIndex,
        settings
      );
      
      if (!curveAnalysis) {
        // Pas de virage détecté, avancer un peu et continuer
        nextIndex += 5;
        if (nextIndex >= enhancedPoints.length - 2) break;
        continue;
      }
      
      // Vérifier que le virage est devant nous (son début doit être après currentIndex - marge)
      // On accepte un petit chevauchement pour les virages qui commencent juste avant
      const MARGIN_BEFORE = 10; // indices de marge avant la position actuelle
      if (curveAnalysis.startIndex < currentIndex - MARGIN_BEFORE) {
        // Ce virage est trop en arrière, passer au suivant
        nextIndex = curveAnalysis.endIndex + 1;
        continue;
      }
      
      // Calculer la distance depuis la position actuelle jusqu'au début du virage
      // Si le virage commence avant currentIndex, on calcule depuis currentIndex
      // Si le virage commence après currentIndex, on calcule depuis currentPosition jusqu'au début
      let distance = 0;
      
      if (curveAnalysis.startIndex <= currentIndex) {
        // Le virage a déjà commencé, calculer la distance depuis currentIndex jusqu'à la fin
        // Mais pour l'affichage, on veut la distance jusqu'au début (qui est négative ou nulle)
        // On calcule plutôt la distance jusqu'à l'apex ou la fin
        distance = 0; // Le virage est déjà commencé, distance = 0
        for (let i = currentIndex; i < curveAnalysis.endIndex; i++) {
          distance += calculateDistance(enhancedPoints[i].position, enhancedPoints[i + 1].position);
        }
      } else {
        // Le virage est devant nous, calculer la distance normale
        distance = calculateDistance(currentPosition, enhancedPoints[currentIndex].position);
        for (let i = currentIndex + 1; i <= curveAnalysis.startIndex; i++) {
          distance += calculateDistance(enhancedPoints[i-1].position, enhancedPoints[i].position);
        }
      }
      
      // Ne garder que les virages à moins de MAX_DISTANCE
      if (distance > MAX_DISTANCE) {
        break; // Les virages suivants seront encore plus loin
      }
    
      const speedLimit = currentSpeedLimit || await this.speedLimitCache.getSpeedLimit(
        curveAnalysis.startPoint[0],
        curveAnalysis.startPoint[1]
      );

      // Calculer les vitesses et points de freinage avec CurveAssistant
      let curveCalculations = this.curveAssistant.calculateAll(
        currentSpeed,
        distance,
        curveAnalysis,
        speedLimit,
        settings.drivingStyle
      );

      // Intersections: le rayon est souvent peu représentatif (angle cassé).
      // On force une vitesse cible plus conservatrice basée sur la config.
      if (curveAnalysis.classification === 'intersection') {
        const base = speedLimit || settings.defaultSpeed;
        const intersectionTarget = Math.min(base, settings.minTurnSpeed);
        const brakingPoint = this.curveAssistant.calculateBrakingPoint(currentSpeed, intersectionTarget, distance);
        curveCalculations = {
          ...curveCalculations,
          optimalCurveSpeed: intersectionTarget,
          brakingPoint,
        };
      }

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
        curveInfo: curveAnalysis,
        classification: curveAnalysis.classification
      };
      /*
      console.log('[TurnPredictionManager] New turn prediction:', {
        distance,
        angle: curveAnalysis.apexAngle,
        optimalSpeed: curveCalculations.optimalCurveSpeed,
        brakingPoint: curveCalculations.brakingPoint
      });
      */

      this.turns.push(turnPrediction);

      for (let i = curveAnalysis.startIndex+1; i <= curveAnalysis.endIndex; i++) {
        distance += calculateDistance(enhancedPoints[i-1].position, enhancedPoints[i].position);
      }

      nextIndex = curveAnalysis.endIndex+1;
    }
    console.log('[TurnPredictionManager] End detecting curves:', this.turns.length);
  }

  /**
   * Fusionne les virages proches qui font partie du même virage
   */
  private mergeNearbyTurns(): void {
    const MERGE_DISTANCE_THRESHOLD = 30; // mètres - distance max entre deux virages pour les fusionner
    const MERGE_INDEX_THRESHOLD = 10; // indices - si les virages sont très proches en indices
    
    if (this.turns.length < 2) return;
    
    // Trier par index de début
    this.turns.sort((a, b) => a.curveInfo.startIndex - b.curveInfo.startIndex);
    
    const merged: TurnPrediction[] = [];
    
    for (let i = 0; i < this.turns.length; i++) {
      const currentTurn = this.turns[i];
      
      // Chercher si on peut fusionner avec le virage précédent
      if (merged.length > 0) {
        const lastTurn = merged[merged.length - 1];
        const indexGap = currentTurn.curveInfo.startIndex - lastTurn.curveInfo.endIndex;
        const distanceGap = currentTurn.distance - (lastTurn.distance + lastTurn.curveInfo.length);
        
        // Si les virages sont très proches (en indices ou en distance)
        // et dans la même direction, on les fusionne
        const sameDirection = Math.sign(currentTurn.angle) === Math.sign(lastTurn.angle);
        const shouldMerge = (indexGap < MERGE_INDEX_THRESHOLD || Math.abs(distanceGap) < MERGE_DISTANCE_THRESHOLD) 
          && sameDirection;
        
        if (shouldMerge) {
          // Fusionner : prendre le début du premier et la fin du dernier
          // L'apex est celui avec l'angle le plus important
          const useCurrentApex = Math.abs(currentTurn.curveInfo.apexAngle) > Math.abs(lastTurn.curveInfo.apexAngle);
          
          // Fusionner les curvePoints en évitant les doublons
          const lastEndPoint = lastTurn.curveInfo.endPoint;
          const currentStartPoint = currentTurn.curveInfo.startPoint;
          
          // Trouver où commencer dans les curvePoints du virage actuel
          let currentStartIdx = 0;
          for (let j = 0; j < currentTurn.curveInfo.curvePoints.length; j++) {
            const p = currentTurn.curveInfo.curvePoints[j];
            if (Math.abs(p[0] - currentStartPoint[0]) < 0.0001 && 
                Math.abs(p[1] - currentStartPoint[1]) < 0.0001) {
              currentStartIdx = j;
              break;
            }
          }
          
          // Fusionner les points en évitant les doublons à la jonction
          const mergedCurvePoints = [...lastTurn.curveInfo.curvePoints];
          const pointsToAdd = currentTurn.curveInfo.curvePoints.slice(currentStartIdx + 1);
          mergedCurvePoints.push(...pointsToAdd);
          
          const mergedCurveInfo = {
            ...lastTurn.curveInfo,
            endIndex: currentTurn.curveInfo.endIndex,
            endPoint: currentTurn.curveInfo.endPoint,
            apex: useCurrentApex ? currentTurn.curveInfo.apex : lastTurn.curveInfo.apex,
            apexIndex: useCurrentApex ? currentTurn.curveInfo.apexIndex : lastTurn.curveInfo.apexIndex,
            apexAngle: useCurrentApex ? currentTurn.curveInfo.apexAngle : lastTurn.curveInfo.apexAngle,
            // Recalculer la longueur et le rayon (approximation)
            length: lastTurn.curveInfo.length + currentTurn.curveInfo.length,
            radius: Math.min(lastTurn.curveInfo.radius, currentTurn.curveInfo.radius), // Prendre le plus serré
            curvePoints: mergedCurvePoints,
          };
          
          // Mettre à jour le dernier virage fusionné
          merged[merged.length - 1] = {
            ...lastTurn,
            curveInfo: mergedCurveInfo,
            angle: mergedCurveInfo.apexAngle,
            // Utiliser la distance du virage le plus proche
            distance: Math.min(lastTurn.distance, currentTurn.distance),
          };
          continue;
        }
      }
      
      // Pas de fusion possible, ajouter le virage tel quel
      merged.push(currentTurn);
    }
    
    this.turns = merged;
  }

  sortTurns(): void {
    // Trier par distance
    this.turns.sort((a, b) => a.distance - b.distance);
    
    // Fusionner les virages proches
    this.mergeNearbyTurns();
    
    // Supprimer les doublons basés sur l'index de début du virage
    const seen = new Set<number>();
    this.turns = this.turns.filter(turn => {
      if (seen.has(turn.index)) {
        return false;
      }
      seen.add(turn.index);
      return true;
    });
  }

  getTurns(): TurnPrediction[] {
    return this.turns;
  }

  getNextTurn(): TurnPrediction | null {
    return this.turns.length > 0 ? this.turns[0] : null;
  }
}