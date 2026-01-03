import { Settings } from '../SettingsService';
import { calculateCurveRadius, calculateCurveLength } from './CurveAnalyzerUtils';
import { EnhancedRoutePoint } from '../route/RoutePlannerTypes';
import { classifyTurn, TurnClassification } from './TurnClassifier';

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
    /** High-level classification (intersection, hairpin, …). */
    classification?: TurnClassification;
    /** Signed heading delta across the curve, degrees. */
    deltaHeadingDeg?: number;
}

export class CurveDetector {
    /**
     * Détecte le début d'un virage en cherchant une transition progressive
     * Utilise une fenêtre glissante pour être plus robuste aux variations
     */
    private findTurnStart(
        enhancedPoints: EnhancedRoutePoint[],
        startIndex: number,
        settings: Settings
    ): number | null {
        const WINDOW_SIZE = 3; // Nombre de points à considérer
        const THRESHOLD_FACTOR = 0.7; // Seuil réduit pour détecter plus tôt
        
        for (let i = startIndex; i < enhancedPoints.length - WINDOW_SIZE; i++) {
            // Calculer la moyenne des angles dans la fenêtre
            let sumAngles = 0;
            let count = 0;
            for (let j = 0; j < WINDOW_SIZE && i + j < enhancedPoints.length; j++) {
                sumAngles += Math.abs(enhancedPoints[i + j].angleSmooth);
                count++;
            }
            const avgAngle = sumAngles / count;
            
            // Si la moyenne dépasse le seuil, on considère qu'on est dans un virage
            if (avgAngle > settings.minTurnAngle * THRESHOLD_FACTOR) {
                // Remonter un peu pour trouver le vrai début (transition)
                for (let k = Math.max(startIndex, i - 2); k < i; k++) {
                    if (Math.abs(enhancedPoints[k].angleSmooth) < settings.minTurnAngle * 0.5) {
                        return k;
                    }
                }
                return i;
            }
        }
        return null;
    }

    /**
     * Détecte la fin d'un virage de manière plus robuste
     * Continue même si l'angle oscille légèrement
     */
    private findTurnEnd(
        enhancedPoints: EnhancedRoutePoint[],
        startIndex: number,
        initialAngleSign: number,
        settings: Settings
    ): number {
        const WINDOW_SIZE = 5; // Fenêtre plus large pour la fin
        const MIN_STRAIGHT_LENGTH = 3; // Nombre minimum de points droits pour considérer la fin
        
        let straightCount = 0;
        let lastCurveIndex = startIndex;
        
        for (let i = startIndex + 1; i < enhancedPoints.length - 1; i++) {
            const currentAngle = enhancedPoints[i].angleSmooth;
            const absAngle = Math.abs(currentAngle);
            const angleSign = Math.sign(currentAngle);
            
            // Si l'angle est faible OU change de signe (virage opposé)
            if (absAngle <= settings.minTurnAngle * 0.6 || 
                (angleSign !== 0 && initialAngleSign !== 0 && angleSign !== initialAngleSign)) {
                straightCount++;
                
                // Si on a assez de points droits, on considère que le virage est fini
                if (straightCount >= MIN_STRAIGHT_LENGTH) {
                    return lastCurveIndex;
                }
            } else {
                // On est encore dans le virage
                straightCount = 0;
                lastCurveIndex = i;
            }
        }
        
        return lastCurveIndex;
    }

    /**
     * Trouve l'apex en utilisant à la fois l'angle et la courbure locale
     */
    private findApex(
        enhancedPoints: EnhancedRoutePoint[],
        startIndex: number,
        endIndex: number
    ): number {
        let maxScore = 0;
        let apexIndex = startIndex;
        
        for (let i = startIndex; i <= endIndex; i++) {
            const angleScore = Math.abs(enhancedPoints[i].angleSmooth);
            
            // Calculer la courbure locale (variation d'angle autour du point)
            let curvatureScore = 0;
            if (i > startIndex && i < endIndex) {
                const prevAngle = Math.abs(enhancedPoints[i - 1].angleSmooth);
                const nextAngle = Math.abs(enhancedPoints[i + 1].angleSmooth);
                const currentAngle = Math.abs(enhancedPoints[i].angleSmooth);
                // La courbure est maximale quand l'angle au point est plus grand que ses voisins
                curvatureScore = currentAngle - (prevAngle + nextAngle) / 2;
            }
            
            // Score combiné : angle principal + bonus pour la courbure locale
            const combinedScore = angleScore + Math.max(0, curvatureScore) * 0.5;
            
            if (combinedScore > maxScore) {
                maxScore = combinedScore;
                apexIndex = i;
            }
        }
        
        return apexIndex;
    }

    analyzeCurve(
        enhancedPoints: EnhancedRoutePoint[],
        startIndex: number,
        settings: Settings
    ): CurveAnalysisResult | null {
        if (enhancedPoints.length < 3 || startIndex >= enhancedPoints.length - 2) {
            return null;
        }
    
        // Détection améliorée du début
        const detectedStartIndex = this.findTurnStart(enhancedPoints, startIndex, settings);
        if (detectedStartIndex === null) return null;
        
        const startPointIndex = detectedStartIndex;
        const turnStart = enhancedPoints[startPointIndex];
        const initialAngleSign = Math.sign(turnStart.angleSmooth);
        
        // Détection améliorée de la fin
        const endPointIndex = this.findTurnEnd(
            enhancedPoints,
            startPointIndex,
            initialAngleSign,
            settings
        );
        
        if (endPointIndex <= startPointIndex) {
            return null; // Virage invalide
        }
        
        const turnEnd = enhancedPoints[endPointIndex];
    
        // Recherche améliorée de l'apex
        const apexIndex = this.findApex(enhancedPoints, startPointIndex, endPointIndex);
        const turnApex = enhancedPoints[apexIndex];

        if (!turnStart || !turnEnd || !turnApex) return null;

        // Extraire les points non lissés du virage
        const curvePoints = enhancedPoints
            .slice(startPointIndex, endPointIndex + 1)
            .map(point => point.position);

        const baseResult: CurveAnalysisResult = {
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

        const classified = classifyTurn(enhancedPoints, baseResult);
        baseResult.classification = classified.classification;
        baseResult.deltaHeadingDeg = classified.deltaHeadingDeg;

        return baseResult;
    }
}