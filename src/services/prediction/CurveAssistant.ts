import { CurveAnalysisResult } from './CurveAnalyzer';

type DrivingStyle = 'prudent' | 'normal' | 'sportif';

export class CurveAssistanceCalculator {
    private readonly GRAVITY = 9.81;
    private readonly ADHESION_COEF = 0.7;
   private readonly MAX_SPEED_MS = 180/3.6; // 180km/h en m/s;
    private readonly MAX_DECELERATION = 5;

    calculateMaxCurveSpeed(radius: number): number {
        // Convert speed from m/s to km/h.
        return Math.min(Math.sqrt(radius * this.GRAVITY * this.ADHESION_COEF) * 3.6, 180);
    }

    calculateOptimalCurveSpeed(maxCurveSpeed: number, drivingStyle: DrivingStyle): number {
        let coeficient_conduite = 0.7;
         if (drivingStyle === 'normal') {
            coeficient_conduite = 0.8
          }else if (drivingStyle === 'sportif') {
             coeficient_conduite = 0.9;
         }

        return maxCurveSpeed * coeficient_conduite;
    }

    calculateBrakingDistance(
        currentSpeed: number,
        optimalSpeed: number
    ): number {
    if (currentSpeed <= optimalSpeed) {
         return 0;
      }
        const currentSpeedMS = currentSpeed / 3.6;
        const optimalSpeedMS = optimalSpeed / 3.6;

      return (currentSpeedMS * currentSpeedMS - optimalSpeedMS * optimalSpeedMS) / (2 * this.MAX_DECELERATION);
    }

    calculateBrakingPoint(
      currentSpeed: number,
        optimalSpeed: number,
        distanceToTurnStart:number
        ): number {
           const brakingDistance = this.calculateBrakingDistance(currentSpeed, optimalSpeed);

            return  Math.max(0, distanceToTurnStart - brakingDistance);
      }
      
     calculateAll(
      currentSpeed: number,
      distanceToTurnStart:number,
      curveAnalysis: CurveAnalysisResult,
        speedLimit: number | null,
        drivingStyle : DrivingStyle = 'prudent'
      ) : {maxCurveSpeed:number; optimalCurveSpeed:number; brakingPoint:number} {
          const radius = curveAnalysis.radius;
          
        const maxCurveSpeed = this.calculateMaxCurveSpeed(radius)
        const optimalCurveSpeed = this.calculateOptimalCurveSpeed(maxCurveSpeed,drivingStyle);

          const brakingPoint = this.calculateBrakingPoint(currentSpeed, optimalCurveSpeed, distanceToTurnStart);
          
        console.log('Curve analysis:', {
            maxCurveSpeed,
            optimalCurveSpeed,
            brakingPoint,
            radius,
             currentSpeed,
          distanceToTurnStart
        })
          return {
              maxCurveSpeed,
              optimalCurveSpeed,
              brakingPoint
          }
      }
}