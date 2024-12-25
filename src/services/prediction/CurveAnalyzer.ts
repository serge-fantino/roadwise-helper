import { calculateBearing, calculateDistance, calculateAngleDifference } from '../../utils/mapUtils';
import { smoothPath, calculateCurveRadius, calculateCurveLength, calculateAngleBetweenPoints } from './CurveAnalyzerUtils';

export interface CurveAnalysisResult {
    startPoint: [number,number];
    endPoint: [number,number];
    apex: [number,number];
    length: number;
    radius: number;
    startAngle: number,
    endAngle: number,
    apexAngle:number
}

interface Point {
    lat: number;
    lon: number;
}

export class CurveDetector {
    private readonly SMOOTHING_WINDOW = 3; 
    private readonly TURN_THRESHOLD = 10;
    private readonly APEX_LOOKAHEAD = 10;
  
    analyzeCurve(
        routePoints: [number, number][],
        startIndex: number
    ): CurveAnalysisResult | null {
        if (routePoints.length < 3 || startIndex >= routePoints.length - 2) {
            return null;
        }

        const smoothedPath = smoothPath(
            routePoints.slice(startIndex, startIndex + this.APEX_LOOKAHEAD * 2),
            this.SMOOTHING_WINDOW
        );
        
        if (smoothedPath.length < 3) {
            return null;
        }
    
        let turnStart: [number, number] | null = null;
        let turnEnd: [number, number] | null = null;
        let turnApex: [number, number] | null = null;

        let startAngle = 0;
        let endAngle = 0;
        let apexAngle = 0;

        let startPointIndex: number = 0;
        let apexIndex: number = 0;
        let endPointIndex: number = 0;
    
        // Détection du début de virage
        for (let i = 1; i < smoothedPath.length - 1; i++) {
            const { bearing1, angleDiff } = calculateAngleBetweenPoints(
                smoothedPath[i-1],
                smoothedPath[i],
                smoothedPath[i+1]
            );
           
            if (Math.abs(angleDiff) > this.TURN_THRESHOLD) {
                turnStart = [smoothedPath[i].lat, smoothedPath[i].lon];
                startAngle = bearing1;
                startPointIndex = i;
                console.log('detected turn start at index:', startPointIndex);
                break;
            }
        }
           
        // Détection de la fin de virage
        if(turnStart) {
            for (let i = startPointIndex + 1; i < smoothedPath.length - 1; i++) {
                const { bearing2, angleDiff } = calculateAngleBetweenPoints(
                    smoothedPath[i-1],
                    smoothedPath[i],
                    smoothedPath[i+1]
                );
                   
                if(Math.abs(angleDiff) <= this.TURN_THRESHOLD) {
                    turnEnd = [smoothedPath[i].lat, smoothedPath[i].lon];
                    endAngle = bearing2;
                    endPointIndex = i;
                    console.log('detected turn end at index:', endPointIndex);
                    break;
                }
            }
        }
    
        // Détection de l'apex
        if(turnStart && turnEnd) {
            let maxAngleDiff = 0;
            for (let i = startPointIndex + 1; i < endPointIndex; i++) {
                const { angleDiff } = calculateAngleBetweenPoints(
                    smoothedPath[i-1],
                    smoothedPath[i],
                    smoothedPath[i+1]
                );
                
                if(Math.abs(angleDiff) > maxAngleDiff) {
                    maxAngleDiff = Math.abs(angleDiff);
                    turnApex = [smoothedPath[i].lat, smoothedPath[i].lon];
                    apexAngle = angleDiff;
                    apexIndex = i;
                }
            }
        }
        if (!turnApex) {
            console.log('No apex detected !!!');
        } else {
            console.log('Apex detected at index:', apexIndex);
        }
          
        if (!turnStart || !turnEnd || !turnApex) {
            return null;
        }

        const curveLength = calculateCurveLength(smoothedPath, startPointIndex, endPointIndex);
        const curveRadius = calculateCurveRadius(smoothedPath, apexIndex);

        return {
            startPoint: [smoothedPath[startPointIndex].lat, smoothedPath[startPointIndex].lon],
            endPoint: [smoothedPath[endPointIndex].lat, smoothedPath[endPointIndex].lon],
            apex: turnApex,
            length: curveLength,
            radius: curveRadius,
            startAngle,
            endAngle,
            apexAngle
        };
    }
}