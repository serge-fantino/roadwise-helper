# RoadWise Helper - Technical Notes on Curve Analysis and Speed Assistance

## 1. Introduction

This document provides a detailed explanation of the theoretical background behind the curve analysis and speed assistance calculations used in the RoadWise Helper application. It explains the formulas and logic implemented in the `CurveDetector`, `CurveAssistanceCalculator`, and related utilities.

## 2. Curve Analysis

### 2.1 Objective

The primary goal of curve analysis is to identify and characterize road curves (turns) to provide relevant driving assistance. This involves detecting the beginning and end of a turn, determining the apex (point of maximum curvature), the length of the curve, and its radius of curvature.

### 2.2 Smoothing Path

#### Concept
Before analyzing the curves, it is essential to smooth the path to eliminate noise from small variations in the path. This is done by applying a moving average filter to the road points.

#### Implementation
The `smoothPath` method in `CurveDetector.ts` applies a moving average of a defined window size(`SMOOTHING_WINDOW`)
```typescript
  smoothPath(routePoints: [number, number][]): Point[] {
      const smoothedPath: Point[] = [];
        if (routePoints.length < 2) {
            return smoothedPath;
        }
       for(let i = 0; i < routePoints.length; i++) {
         const lat = routePoints[i][0];
          const lon = routePoints[i][1];
          smoothedPath.push({
                lat: lat,
                lon: lon
          });
        }
      
        // Apply a moving average to the positions
        const smoothedPathWithAverage: Point[] = [];
        for (let i = 0; i < smoothedPath.length; i++) {
             let sumLat = 0;
            let sumLon = 0;
            let count = 0;
            for (let j = Math.max(0, i - this.SMOOTHING_WINDOW); j <= Math.min(smoothedPath.length - 1, i + this.SMOOTHING_WINDOW); j++) {
              sumLat += smoothedPath[j].lat;
              sumLon += smoothedPath[j].lon;
              count++;
            }
            smoothedPathWithAverage.push({
                lat: sumLat / count,
                lon: sumLon / count
            });
        }
      return smoothedPathWithAverage
  }
```

## 2.3 Curve Detection
Concept
The curve detection involves the following steps : detection of the start, the end and the apex of a turn.

Implementation
The analyzeCurve method in CurveDetector.ts performs the analysis:
```typescript
analyzeCurve(
    routePoints: [number, number][],
    startIndex: number
  ): CurveAnalysisResult | null {
    if (routePoints.length < 3 || startIndex >= routePoints.length - 2) {
      return null;
    }

    const smoothedPath = this.smoothPath(routePoints.slice(startIndex, startIndex + this.APEX_LOOKAHEAD * 2))
     if (smoothedPath.length < 3) {
        return null;
    }
    
    let turnStart: [number, number] | null = null;
    let turnEnd: [number, number] | null = null;
    let turnApex: [number, number] | null = null;

    let startAngle = 0;
    let endAngle = 0;
    let apexAngle = 0;

    let startPointIndex: number = 0
    let apexIndex: number = 0
    let endPointIndex: number = 0
    
     // Détection du début de virage
     for (let i = 1; i < smoothedPath.length - 1; i++) {
        const prevPoint = smoothedPath[i-1];
        const currentPoint = smoothedPath[i];
        const nextPoint = smoothedPath[i+1];
       
         const bearing1 = calculateBearing(
            [prevPoint.lat, prevPoint.lon],
            [currentPoint.lat, currentPoint.lon],
         );

         const bearing2 = calculateBearing(
            [currentPoint.lat, currentPoint.lon],
            [nextPoint.lat, nextPoint.lon],
          );
        const angleDiff = calculateAngleDifference(bearing1, bearing2);
       
         if (Math.abs(angleDiff) > this.TURN_THRESHOLD) {
           turnStart = [currentPoint.lat, currentPoint.lon];
            startAngle = bearing1;
            startPointIndex = i;
           break
         }
     }
       
     // Détection de la fin de virage
     if(turnStart){
          for (let i = startPointIndex + 1; i < smoothedPath.length - 1; i++) {
               const prevPoint = smoothedPath[i-1];
               const currentPoint = smoothedPath[i];
               const nextPoint = smoothedPath[i+1];
               
              const bearing1 = calculateBearing(
                   [prevPoint.lat, prevPoint.lon],
                   [currentPoint.lat, currentPoint.lon],
               );
               
             const bearing2 = calculateBearing(
                   [currentPoint.lat, currentPoint.lon],
                    [nextPoint.lat, nextPoint.lon],
               );
               
              const angleDiff = calculateAngleDifference(bearing1, bearing2);
               
              if(Math.abs(angleDiff) <= this.TURN_THRESHOLD){
                turnEnd = [currentPoint.lat, currentPoint.lon];
                  endAngle = bearing2;
                   endPointIndex = i
                break;
              }
           }
     }
    
      // Détection de l'apex
    if(turnStart && turnEnd) {
      let maxAngleDiff = 0;
       for (let i = startPointIndex + 1; i < endPointIndex; i++) {
         const prevPoint = smoothedPath[i-1];
           const currentPoint = smoothedPath[i];
        const nextPoint = smoothedPath[i+1];
        
       
            const bearing1 = calculateBearing(
                [prevPoint.lat, prevPoint.lon],
               [currentPoint.lat, currentPoint.lon],
           );

            const bearing2 = calculateBearing(
                [currentPoint.lat, currentPoint.lon],
                [nextPoint.lat, nextPoint.lon],
            );
            const angleDiff = calculateAngleDifference(bearing1, bearing2);
        if(Math.abs(angleDiff) > maxAngleDiff){
              maxAngleDiff = Math.abs(angleDiff);
                turnApex = [currentPoint.lat, currentPoint.lon]
              apexAngle = angleDiff
             apexIndex = i;
           }
       }
    }
      
        if (!turnStart || !turnEnd || !turnApex) {
              return null
          }

       const curveLength = this.calculateCurveLength(smoothedPath, startPointIndex, endPointIndex);
          const curveRadius = this.calculateCurveRadius(smoothedPath, apexIndex);

          return {
              startPoint: [smoothedPath[startPointIndex].lat, smoothedPath[startPointIndex].lon],
              endPoint: [smoothedPath[endPointIndex].lat,smoothedPath[endPointIndex].lon],
              apex: turnApex,
              length: curveLength,
             radius: curveRadius,
             startAngle: startAngle,
             endAngle: endAngle,
             apexAngle: apexAngle
          };
  }
```

*  The process iterates through the smoothed path
Use code with caution.
The TURN_THRESHOLD parameter is used to determine the beginning and the end of the turn.
* The apex of the curve is detected by the segment with the highest angle difference.
* if any of the previous steps fails to detect the data the curve analysiz will return null.

### 2.4 Calculate Curve Radius
Concept
The radius of curvature is a critical parameter to calculate how sharp the turn is. It is based on the 3 points around the apex of the turn.

Implementation
The calculateCurveRadius method in CurveDetector.ts performs the calculation:
```typescript
private calculateCurveRadius(smoothedPath: Point[], apexIndex: number): number {
    if (smoothedPath.length < 3 || apexIndex < 1 || apexIndex >= smoothedPath.length -1) {
      return Infinity;
    }

    const startPoint = smoothedPath[apexIndex - 1];
    const apexPoint = smoothedPath[apexIndex];
      const endPoint = smoothedPath[apexIndex + 1];
     
        const a = calculateDistance(
             [startPoint.lat, startPoint.lon], 
            [apexPoint.lat, apexPoint.lon]
        );
        const b = calculateDistance(
             [apexPoint.lat, apexPoint.lon],
            [endPoint.lat, endPoint.lon]
        );
        const c = calculateDistance(
             [startPoint.lat, startPoint.lon],
            [endPoint.lat, endPoint.lon]
        );

       const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    if(area === 0) return Infinity;
      return (a * b * c) / (4 * area);
  }
```

Calculates the distance between the apex and the previous and the next point

Uses the Heron's formula to calculate the area of the triangle

Calculates the radius of the circle that contains all the points of the triangle

If the area of the triangle is equal to 0 then the radius returned will be Infinity

### 2.5 Calculate Curve Length
Concept
The length of the curve is the distance along the route from the start of the turn to the end of the turn

Implementation
The calculateCurveLength method in CurveDetector.ts performs the calculation:
```typescript
private calculateCurveLength(smoothedPath: Point[], start: number, end: number): number {
      let totalDistance = 0;
       for(let i = start; i < end; i++){
           const currentPoint = smoothedPath[i];
         const nextPoint = smoothedPath[i+1];
         totalDistance += calculateDistance(
             [currentPoint.lat, currentPoint.lon],
                [nextPoint.lat, nextPoint.lon]
         );
       }
       return totalDistance
   }
```

The process sums up the distances between every segment

## 3. Speed Assistance Calculations
### 3.1 Maximum Curve Speed (Vmax)
Formula
The maximum safe speed at which a vehicle can negotiate a curve is calculated using the following formula:

Vmax = sqrt(radius * g * coefficient_adherence)

Where:

Vmax is the maximum speed in meters per second (m/s).

radius is the radius of curvature of the turn (in meters).

g is the gravitational acceleration (9.81 m/s²).

coefficient_adherence is a dimensionless coefficient representing the grip between the tires and the road (typically 0.7 for normal road tires).

Implementation
The calculateMaxCurveSpeed method in CurveAssistanceCalculator.ts implements this calculation:
```typescript
calculateMaxCurveSpeed(radius: number): number {
        // Convert speed from m/s to km/h.
        return Math.min(Math.sqrt(radius * this.GRAVITY * this.ADHESION_COEF) * 3.6, 180);
    }
```

The method calculates Vmax in m/s, then convert it to km/h and returns the minimum between the calculated value and a maximum speed of 180 km/h (to take account of high speed car)

### 3.2 Optimal Curve Speed (Vopt)
Concept
The optimal curve speed is a reduced speed from the maximum curve speed depending on the driving style.

Implementation
The calculateOptimalCurveSpeed method in CurveAssistanceCalculator.ts implements this calculation:
```typescript
calculateOptimalCurveSpeed(maxCurveSpeed: number, drivingStyle: DrivingStyle): number {
        let coeficient_conduite = 0.7;
         if (drivingStyle === 'normal') {
            coeficient_conduite = 0.8
          }else if (drivingStyle === 'sportif') {
             coeficient_conduite = 0.9;
         }

        return maxCurveSpeed * coeficient_conduite;
    }
```

The coefficient of the driving style is used as a multiplier to reduce the speed by different margins.

### 3.3 Braking Distance
Concept
If the current speed is too high, we calculate the distance required to reach the optimal speed before entering the turn.

Formula
The braking distance is calculated using the formula:

D = (V_initiale^2 - V_finale^2) / (2 * deceleration)

Where:

D is the braking distance in meters (m).

V_initiale is the current speed of the vehicle in meters per second (m/s).

V_finale is the optimal speed at which the turn should be entered in m/s.

deceleration is the vehicle's maximum deceleration rate (5 m/s² by default).

Implementation
The calculateBrakingDistance method in CurveAssistanceCalculator.ts implements this calculation:
```typescript
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
```

It will return 0 if the current speed is lower or equal than the optimal speed

It converts from km/h to m/s for the calculation

### 3.4 Braking Point
Concept
We calculate at what distance from the begining of the turn, the driver should start braking in order to be at the optimal speed in the turn.

Implementation
The calculateBrakingPoint method in CurveAssistanceCalculator.ts implements this calculation:
```typescript
calculateBrakingPoint(
      currentSpeed: number,
        optimalSpeed: number,
        distanceToTurnStart:number
        ): number {
           const brakingDistance = this.calculateBrakingDistance(currentSpeed, optimalSpeed);

            return  Math.max(0, distanceToTurnStart - brakingDistance);
      }
```

If the braking point is negative, it's better to return 0.

### 3.5 Overall Calculation
The calculateAll combines all the previous calculations:
```typescript
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
```

## 4. Code Location
src/utils/curveDetector.ts: Implements the CurveDetector class.

src/utils/mapUtils.ts: Contains the functions for calculating distance, bearing, and angle difference.

src/utils/speedUtils.ts: Contains the method for calculating the recommended speed, based on the CurveAssistanceCalculator methods.

## 5. Future Improvements
Implement dynamic adaptation of the coefficient of adhesion based on environmental conditions.

Consider more complex braking models with other parameters such as wind resistance.

Take account of car settings (braking, suspension)

This documentation should give you a clear understanding of the theoretical and implementational aspects of the curve analysis and speed assistance in your project. Let me know if you have other questions!