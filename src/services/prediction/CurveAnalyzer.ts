import { Settings } from '../SettingsService';
import { calculateCurveRadius, calculateCurveLength } from './CurveAnalyzerUtils';
import { EnhancedRoutePoint } from '../route/RoutePlannerTypes';

export interface CurveAnalysisResult {
    startPoint: [number,number];
    startIndex: number;
    endPoint: [number,number];
    endIndex: number;
    apex: [number,number];
    apexIndex: number;
    length: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    apexAngle: number;
    curvePoints: [number,number][];
}

export class CurveDetector {
    analyzeCurve(
        enhancedPoints: EnhancedRoutePoint[],
        startIndex: number,
        settings: Settings
    ): CurveAnalysisResult | null {
        if (enhancedPoints.length < 3 || startIndex >= enhancedPoints.length - 2) {
            return null;
        }
    
        let turnStart: EnhancedRoutePoint | null = null;
        let turnEnd: EnhancedRoutePoint | null = null;
        let turnApex: EnhancedRoutePoint | null = null;
        let startPointIndex = 0;
        let endPointIndex = 0;
        let apexIndex = 0;
    
        // Détection du début de virage
        for (let i = startIndex; i < enhancedPoints.length - 1; i++) {
            if (Math.abs(enhancedPoints[i].angleSmooth) > settings.minTurnAngle) {
                turnStart = enhancedPoints[i];
                startPointIndex = i;
                break;
            }
        }

        if (!turnStart) return null;
           
        // Détection de la fin de virage
        for (let i = startPointIndex + 1; i < enhancedPoints.length - 1; i++) {
            const currentAngle = enhancedPoints[i].angleSmooth;
            if (Math.abs(currentAngle) <= settings.minTurnAngle || 
                Math.sign(currentAngle) !== Math.sign(turnStart.angleSmooth)) {
                turnEnd = enhancedPoints[i];
                endPointIndex = i;
                break;
            }
        }

        if (!turnEnd) {
            turnEnd = turnStart;
            endPointIndex = startPointIndex;
        }
    
        // Recherche de l'apex
        let maxAngleDiff = 0;
        for (let i = startPointIndex; i <= endPointIndex; i++) {
            const currentAngleDiff = Math.abs(enhancedPoints[i].angleSmooth);
            if (currentAngleDiff > maxAngleDiff) {
                maxAngleDiff = currentAngleDiff;
                turnApex = enhancedPoints[i];
                apexIndex = i;
            }
        }

        if (!turnStart || !turnEnd || !turnApex) return null;

        // Extraire les points non lissés du virage
        const curvePoints = enhancedPoints
            .slice(startPointIndex, endPointIndex + 1)
            .map(point => point.position);

        return {
            startPoint: turnStart.position,
            startIndex: startPointIndex,
            endPoint: turnEnd.position,
            endIndex: endPointIndex,
            apex: turnApex.position,
            apexIndex,
            length: calculateCurveLength(
                enhancedPoints.slice(startPointIndex, endPointIndex + 1)
                    .map(p => ({ lat: p.position[0], lon: p.position[1] })),
                0,
                endPointIndex - startPointIndex
            ),
            radius: calculateCurveRadius(
                enhancedPoints.slice(startPointIndex - 1, endPointIndex + 2)
                    .map(p => ({ lat: p.position[0], lon: p.position[1] })),
                apexIndex - startPointIndex + 1
            ),
            startAngle: turnStart.angleSmooth,
            endAngle: turnEnd.angleSmooth,
            apexAngle: turnApex.angleSmooth,
            curvePoints
        };
    }
}