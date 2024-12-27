# Project Structure

```
docs/
  curve-assist-notes.md
  tech-overview.md
public/
  manifest.json
  placeholder.svg
  sw.js
src/
  assets/
  components/
    layout/
      DriveView.tsx
      MapArea.tsx
      SearchArea.tsx
      TopPanel.tsx
    map/
      DestinationMarker.tsx
      HistoryTrail.tsx
      MapEventHandlers.tsx
      RouteOverlay.tsx
      TurnCurveOverlay.tsx
      TurnWarningMarker.tsx
      VehicleMarker.tsx
    ui/
      accordion.tsx
      alert-dialog.tsx
      alert.tsx
      aspect-ratio.tsx
      avatar.tsx
      badge.tsx
      breadcrumb.tsx
      button.tsx
      calendar.tsx
      card.tsx
      carousel.tsx
      chart.tsx
      checkbox.tsx
      collapsible.tsx
      command.tsx
      context-menu.tsx
      dialog.tsx
      drawer.tsx
      dropdown-menu.tsx
      form.tsx
      hover-card.tsx
      input-otp.tsx
      input.tsx
      label.tsx
      menubar.tsx
      navigation-menu.tsx
      pagination.tsx
      popover.tsx
      progress.tsx
      radio-group.tsx
      resizable.tsx
      scroll-area.tsx
      select.tsx
      separator.tsx
      sheet.tsx
      sidebar.tsx
      skeleton.tsx
      slider.tsx
      sonner.tsx
      switch.tsx
      table.tsx
      tabs.tsx
      textarea.tsx
      toast.tsx
      toaster.tsx
      toggle-group.tsx
      toggle.tsx
      tooltip.tsx
      use-toast.ts
    AddressSearch.tsx
    DestinationPanel.tsx
    LoadingScreen.tsx
    MainLayout.tsx
    MapView.tsx
    PredictionOverlay.tsx
    RoadPredictionInfo.tsx
    SearchBar.tsx
    SearchResults.tsx
    SettingsView.tsx
    SpeedDisplay.tsx
    SpeedPanel.tsx
    SplashScreen.tsx
    StatusBar.tsx
    TurnWarning.tsx
  hooks/
    use-mobile.tsx
    use-toast.ts
    useAddressSearch.ts
    useRouting.ts
    useSimulation.ts
    useSimulationControl.ts
    useSpeedInfo.ts
    useVehicle.ts
    useVehicleState.ts
  lib/
    utils.ts
  models/
    DriveViewModel.ts
    Snake.ts
    Vehicle.ts
  pages/
    Index.tsx
  services/
    location/
      LocationService.ts
    prediction/
      managers/
        PredictionStateManager.ts
        RouteDeviationManager.ts
      CurveAnalyzer.ts
      CurveAnalyzerUtils.ts
      CurveAssistant.ts
      DecelerationCalculator.ts
      PredictionTypes.ts
      RoadPredictor.ts
      SpeedCalculator.ts
      TurnPredictionManager.ts
    roadInfo/
      overpass/
        CityDetector.ts
        OverpassAPI.ts
        OverpassRoadInfoService.ts
        SpeedLimitEstimator.ts
      index.ts
      MapboxRoadInfoService.ts
      NominatimRoadInfoService.ts
      RoadInfoManager.ts
      RoadInfoService.ts
      types.ts
    route/
      RoutePlannerService.ts
      RoutePlannerTypes.ts
    simulation/
      managers/
        PredictionManager.ts
        SimulationStateManager.ts
        SimulationUpdateManager.ts
      utils/
        NavigationCalculator.ts
        RouteManager.ts
        SpeedController.ts
      SimulationService.ts
      SimulationServiceV2.ts
    RouteTracker.ts
    SettingsService.ts
    SpeedLimitCache.ts
  styles/
    matrix.css
  utils/
    api/
      fetchWithRetry.ts
    cache/
      osmCache.ts
    DriveViewRenderer.ts
    mapUtils.ts
    osmUtils.ts
    routingUtils.ts
    speedUtils.ts
    turnUtils.ts
  App.css
  App.tsx
  index.css
  main.tsx
  vite-env.d.ts
.export-ignore
.gitignore
components.json
eslint.config.js
export.md
index.html
package-lock.json
package.json
postcss.config.js
README.md
tailwind.config.ts
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```


## docs/curve-assist-notes.md

```md
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
```


## docs/tech-overview.md

```md
# RoadWise Helper - Technical Documentation

## 1. Introduction

RoadWise Helper is an intelligent driving assistant application designed to provide real-time information and assistance to drivers. It includes features such as destination setting, position and speed tracking, curve detection, and optimal speed recommendations. This document outlines the technical architecture, components, and services used in the project.

## 2. Architecture

The application follows a modular architecture, separating concerns into distinct layers for better maintainability and scalability. The core components are:

*   **UI Components:** Reusable UI elements built with `shadcn-ui` and styled with Tailwind CSS.
*   **Layout Components:** High-level components that structure the main views of the application.
*   **Map Components:** Components related to the map display and interactions, using `react-leaflet`.
*   **Services:** Modules that provide specific business logic and external API interactions.
*   **Models:** Data structures used to represent the application state and entities.
*   **Hooks:** Custom React Hooks encapsulating reusable logic.
*   **Utils:** Helper functions for various tasks, including calculations and API interactions.

## 3. Core Components

### 3.1 UI Components (`src/components/ui`)

These components are built using `shadcn-ui` and styled with Tailwind CSS. They include:

*   `Accordion.tsx`: A component for expandable sections of content.
*   `Alert.tsx`, `AlertDialog.tsx`: Components for displaying informative or critical messages.
*   `Avatar.tsx`: Displays a user's profile picture.
*   `Badge.tsx`: Used for displaying status or category labels.
*   `Button.tsx`: Interactive buttons with multiple styles.
*   `Card.tsx`: Versatile container component for grouping related content.
*   `Carousel.tsx`: Displays multiple content sections in a carousel.
*   `Checkbox.tsx`: Input for boolean values.
*   `Collapsible.tsx`:  A component for toggling visibility of content.
*   `Command.tsx`: A component for keyboard-driven selection.
*    `ContextMenu.tsx`: Displays a list of actions when a right click occur
*   `Dialog.tsx`:  A component for modals.
*   `Drawer.tsx`: A panel that can slide from an edge of the screen
*   `DropdownMenu.tsx`: Displays a list of actions when a click occurs
*   `Form.tsx`:  Components to handle form logic.
*   `HoverCard.tsx`:  A component for displaying content on hover.
*   `Input.tsx`, `InputOTP.tsx`: Text input components.
*   `Label.tsx`:  Labels for form inputs.
*   `Menubar.tsx`: Component for a menu bar.
*    `NavigationMenu.tsx`:  A component for navigating through sections
*   `Pagination.tsx`:  For navigating through lists
*   `Popover.tsx`:  A component that displays content on click
*   `Progress.tsx`: Visualizes the progression of a process.
*   `RadioGroup.tsx`: Input for selecting one item out of a list.
*   `Resizable.tsx`: Makes element resizable.
*   `ScrollArea.tsx`: Scrollable container.
*   `Select.tsx`: Input for selecting one item out of a list using dropdown.
*   `Separator.tsx`:  A component for visual separation.
*    `Sheet.tsx`:  A component for modals.
*   `Skeleton.tsx`:  Placeholder for content that is loading.
*   `Slider.tsx`:  Input for numeric values.
*   `Sonner.tsx`: Provides toast notifications.
*   `Switch.tsx`:  A switch component.
*   `Table.tsx`:  Components to display tabular data.
*   `Tabs.tsx`:  Tabs component.
*   `Textarea.tsx`: Multiline text input component.
*    `Toggle.tsx`, `ToggleGroup.tsx`: Switch components.
*   `Tooltip.tsx`: Displays information on hover.
*   `use-toast.ts`: A custom hook for displaying toast notifications.

### 3.2 Layout Components (`src/components/layout`)

These components structure the main application layouts:

*   `MapArea.tsx`: Renders the map and handles map-related events, using Leaflet.
*   `SearchArea.tsx`: Provides a search interface for finding locations.
*   `TopPanel.tsx`: A component used as a top panel and containing a `SpeedPanel` and `DestinationPanel`.

### 3.3 Map Components (`src/components/map`)

Components specific to the map display:

*   `DestinationMarker.tsx`: Displays the destination on the map.
*   `HistoryTrail.tsx`: Renders a trail of the vehicle's past positions.
*    `MapEventHandlers.tsx`: Listens to map events (clicks, moves etc.) and send info to services.
*   `RouteOverlay.tsx`: Displays the calculated route on the map.
*   `TurnWarningMarker.tsx`: Displays a turn warning on the map.
*   `VehicleMarker.tsx`: Represents the vehicle's position and direction on the map.

### 3.4 Core Components (`src/components`)

Core components for main features and views:

*   `AddressSearch.tsx`:  Provides a search input with autocompletion for addresses.
*   `DestinationPanel.tsx`: Displays the current destination and allows changes.
*   `LoadingScreen.tsx`:  Display a loading animation.
*   `MainLayout.tsx`: The main layout component that arranges the other components.
*   `MapView.tsx`:  Manages the rendering of the map.
*   `PredictionOverlay.tsx`:  Used for displaying prediction on the map.
*  `RoadPredictionInfo.tsx`: Used for displaying debugging road prediction info.
*  `SearchBar.tsx`: A reusable search component
*  `SearchResults.tsx`: A list of search results.
*   `SettingsView.tsx`:  Provides the settings panel for the application.
*   `SpeedDisplay.tsx`: Displays the current speed with recommendation.
*   `SpeedPanel.tsx`: Displays the current speed and the next turn.
*   `StatusBar.tsx`: Displays the status and debug controls.
*    `TurnWarning.tsx`: Displays turn warnings.

### 3.5 Hooks (`src/hooks`)

Custom hooks used for logic encapsulation:

*   `use-mobile.tsx`: Detects if the user is on a mobile device.
*  `use-toast.ts`: Custom hook for managing toast notifications
*   `useAddressSearch.ts`: Handles the logic of address search.
*   `useRouting.ts`: Manages route calculation.
*   `useSimulation.ts`: Provides basic simulation functionalities.
*    `useSimulationControl.ts`: Provides simulation logic.
*   `useSpeedInfo.ts`: Handles the logic of speed information.
*   `useVehicle.ts`: Handles the logic of vehicle position.
*   `useVehicleState.ts`: Manages the state of the vehicle.

### 3.6 Services (`src/services`)

Services that handle the core logic:

*   `location/LocationService.ts`: Manages the vehicle's location using either GPS or simulation.
*  `prediction/managers/PredictionStateManager.ts`: Manages road predictions
*   `prediction/managers/RouteDeviationManager.ts`: Detects if the car has deviated from the current route and triggers recalculation.
*   `prediction/DecelerationCalculator.ts`: Calculates required deceleration
*   `prediction/PredictionTypes.ts`: Defines the types for prediction data.
*    `prediction/SpeedCalculator.ts`: Calculates the speed based on the turn angle.
*   `prediction/TurnAnalyzer.ts`: Analyzes the road to detect turns.
*   `prediction/TurnPredictionManager.ts`: Manages the collection of turn predictions.
*  `roadInfo/index.ts`: Exposes road info API services.
*    `roadInfo/overpass/CityDetector.ts`: Detects if a location is in a city based on overpass
*    `roadInfo/overpass/OverpassAPI.ts`: Service for querying Overpass API.
*    `roadInfo/overpass/OverpassRoadInfoService.ts`: Service for getting road info with overpass
*   `roadInfo/overpass/SpeedLimitEstimator.ts`: Estimates the speed limit based on road type and city.
*    `roadInfo/MapboxRoadInfoService.ts`: Service for getting road info using Mapbox API.
*    `roadInfo/NominatimRoadInfoService.ts`: Service for getting road info using Nominatim API.
*  `roadInfo/RoadInfoManager.ts`:  Handles access to road info.
*   `roadInfo/types.ts`: Defines types for road information.
*   `simulation/managers/PredictionManager.ts`:  Manages the prediction state for the simulation.
*   `simulation/managers/SimulationStateManager.ts`: Manages the simulation state.
*    `simulation/managers/SimulationUpdateManager.ts`: Manages the update of simulation state.
*   `simulation/utils/NavigationCalculator.ts`: Handles the calculation of navigation data.
*    `simulation/utils/RouteManager.ts`:  Manages a route and calculate the next position.
*   `simulation/utils/SpeedController.ts`:  Handles the update of vehicle speed.
*   `simulation/SimulationService.ts`: Provides basic simulation of the vehicle.
*   `simulation/SimulationServiceV2.ts`: Provides simulation of the vehicle with a physics approach.
*   `PredictionService.ts`: Provides speed limit prediction.
*  `RoadPredictor.ts`: High-level manager that handles road information prediction
*   `RouteTracker.ts`:  Tracks the car position on the route.
*   `SettingsService.ts`: Manages application settings.
*   `SpeedLimitCache.ts`:  Caches speed limit data.

### 3.7 Models (`src/models`)

Data models used by the application:

*   `Snake.ts`: Manages the vehicle's position history.
*   `Vehicle.ts`: Represents the vehicle's state and behavior.

### 3.8 Utils (`src/utils`)

Helper functions:

*   `api/fetchWithRetry.ts`: Handles API calls with retry logic.
*   `cache/osmCache.ts`: Handles caching for OSM API responses.
*   `mapUtils.ts`: Contains map-related utilities for calculations (distance, bearing, etc)
*   `osmUtils.ts`: Contains utilities for querying OSM services (Overpass etc.)
*   `routingUtils.ts`: Provides functions for calculating routes using OSRM.
*   `speedUtils.ts`: Provides functions for speed calculations.
*   `turnUtils.ts`: Provides function to analyze turn types.
*  `utils.ts`: Contains general purpose utilities.

## 4. Data Flow

1.  **User Interaction:** The user sets a destination or interacts with the map.
2.  **Address Search:** The `AddressSearch` component queries the Nominatim service to find the coordinates of the address.
3.  **Route Calculation:** The `useRouting` hook uses the OSRM service to calculate a route.
4.  **Vehicle Update:** The `LocationService` updates the vehicle position using GPS or simulation data.
5.  **Prediction Updates:** The `roadPredictor` uses the route points and vehicle position to predict upcoming turns.
6.  **Speed Calculation:** The `useSpeedInfo` hook computes the optimal speed based on the prediction and the speed limit.
7.  **UI Update:** The UI components receive the calculated data and update the view accordingly.
8.  **Road Info Update:** The `roadInfoManager` uses the Overpass, Mapbox, or Nominatim services to get road information and speed limit.

## 5.  Technology Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, shadcn-ui
*   **Mapping:** react-leaflet
*   **State Management:** React Context, Custom Hooks
*   **Data Fetching:** TanStack Query
*   **Routing:** react-router-dom
*  **Animations:** tailwindcss-animate
*   **Code Formatting:** Prettier, ESLint
*  **Build Tool:** Vite

## 6. Code Structure

*   **`src/`** Main directory for all source code
    *   **`components/`**: Reusable UI components
        * **`ui/`**:  General UI components.
         * **`layout/`**:  Layout components.
         * **`map/`**: Map related UI components.
    *   **`hooks/`**:  Reusable hooks
    *   **`models/`**: Data Models
    *   **`services/`**: Services related to core logic
        * **`location/`**: location management services
        * **`prediction/`**: Prediction management services.
        * **`roadInfo/`**: Road Information services.
        * **`simulation/`**: Vehicle simulation services.
    *   **`utils/`**: Utility modules.
         * **`api/`**:  Api utilities.
         * **`cache/`**: Caching utilities.
    *   **`pages/`**: Main Views of the application
    *   **`App.tsx`**: Main entrypoint of the application.
    *   **`main.tsx`**: Render the `App.tsx`
    *   **`index.css`**: Global CSS file.
*   **`public/`**: Static assets (images, fonts, manifest etc.)
*  **`.export-ignore`**: File for git ignore generated documentation.
*  **`.gitignore`**: File used for gitignore.
* **`components.json`**: File with shadow-ui configuration.
* **`eslint.config.js`**: ESLint configuration file.
* **`export.md`**: Generated documentation.
*  **`index.html`**: Html root file.
*  **`package-lock.json`**: Package manager configuration file.
* **`package.json`**: Package manager configuration file.
*  **`postcss.config.js`**: Postcss configuration file.
* **`README.md`**: Project documentation.
* **`tailwind.config.ts`**: Tailwind css configuration file.
*  **`tsconfig.app.json`**: Typescript configuration file.
*  **`tsconfig.json`**: Typescript configuration file.
*  **`tsconfig.node.json`**: Typescript configuration file.
*   **`vite.config.ts`**:  Vite configuration file.

## 7.  API Usage

The application interacts with several external APIs:

*   **Nominatim:** For reverse geocoding (address to coordinates) and getting road information
    `https://nominatim.openstreetmap.org/`
*   **OSRM (Open Source Routing Machine):** For route calculation
    `https://router.project-osrm.org/`
*   **Overpass API:** For extracting road information such as speed limit
    `https://overpass-api.de/api/interpreter`
*   **Mapbox API :** To extract road information (premium API, requieres API key)
 `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/`

## 8.  Future Improvements

*   Implement unit and integration tests.
*   Optimize performance of the prediction service and road info queries.
*   Centralize error handling.
*   Add more advanced navigation features.
*   Improve UI/UX.
*   Add a better documentation

## 9. License

This project is under the [MIT License](LICENSE).
```


## public/manifest.json

```json
{
  "name": "RoadWise Helper",
  "short_name": "RoadWise",
  "description": "Your intelligent driving assistant",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1f2937",
  "theme_color": "#1f2937",
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```


## public/placeholder.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" fill="none"><rect width="1200" height="1200" fill="#EAEAEA" rx="3"/><g opacity=".5"><g opacity=".5"><path fill="#FAFAFA" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/><path stroke="#C9C9C9" stroke-width="2.418" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/></g><path stroke="url(#a)" stroke-width="2.418" d="M0-1.209h553.581" transform="scale(1 -1) rotate(45 1163.11 91.165)"/><path stroke="url(#b)" stroke-width="2.418" d="M404.846 598.671h391.726"/><path stroke="url(#c)" stroke-width="2.418" d="M599.5 795.742V404.017"/><path stroke="url(#d)" stroke-width="2.418" d="m795.717 796.597-391.441-391.44"/><path fill="#fff" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/><g clip-path="url(#e)"><path fill="#666" fill-rule="evenodd" d="M616.426 586.58h-31.434v16.176l3.553-3.554.531-.531h9.068l.074-.074 8.463-8.463h2.565l7.18 7.181V586.58Zm-15.715 14.654 3.698 3.699 1.283 1.282-2.565 2.565-1.282-1.283-5.2-5.199h-6.066l-5.514 5.514-.073.073v2.876a2.418 2.418 0 0 0 2.418 2.418h26.598a2.418 2.418 0 0 0 2.418-2.418v-8.317l-8.463-8.463-7.181 7.181-.071.072Zm-19.347 5.442v4.085a6.045 6.045 0 0 0 6.046 6.045h26.598a6.044 6.044 0 0 0 6.045-6.045v-7.108l1.356-1.355-1.282-1.283-.074-.073v-17.989h-38.689v23.43l-.146.146.146.147Z" clip-rule="evenodd"/></g><path stroke="#C9C9C9" stroke-width="2.418" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/></g><defs><linearGradient id="a" x1="554.061" x2="-.48" y1=".083" y2=".087" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="b" x1="796.912" x2="404.507" y1="599.963" y2="599.965" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="c" x1="600.792" x2="600.794" y1="403.677" y2="796.082" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="d" x1="404.85" x2="796.972" y1="403.903" y2="796.02" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><clipPath id="e"><path fill="#fff" d="M581.364 580.535h38.689v38.689h-38.689z"/></clipPath></defs></svg>
```


## public/sw.js

```js
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `roadwise-${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Installation du service worker
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  // Force le remplacement de l'ancien service worker
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prend le contrôle immédiatement
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ne met en cache que les requêtes réussies
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // En cas d'échec, on essaie de récupérer depuis le cache
        return caches.match(event.request);
      })
  );
});
```


## src/components/layout/DriveView.tsx

```tsx
import { useEffect, useRef } from 'react';
import { DriveViewModel } from '../../models/DriveViewModel';
import { DriveViewRenderer } from '../../utils/DriveViewRenderer';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface DriveViewProps {
  position: [number, number];
  routePoints: [number, number][];
}

const DriveView = ({ position, routePoints }: DriveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewModel = useRef(new DriveViewModel());

  // Mise à jour du modèle
  useEffect(() => {
    const routeState = routePlannerService.getState();
    viewModel.current.updateFromPosition(position, routeState.enhancedPoints);
  }, [position]);

  // Rendu de la vue
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      DriveViewRenderer.render(ctx, viewModel.current.getState(), canvas.width, canvas.height);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default DriveView;
```


## src/components/layout/MapArea.tsx

```tsx
import MapView from '../MapView';
import DriveView from './DriveView';

interface MapAreaProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
  routePoints: [number, number][];
  onMapClick: (location: [number, number], address: string) => void;
  positionHistory: [number, number][];
  viewMode: 'map' | 'drive';
}

const MapArea = ({
  position,
  speed,
  onRoadStatusChange,
  destination,
  routePoints,
  onMapClick,
  positionHistory,
  viewMode
}: MapAreaProps) => {
  return (
    <div className="flex-1 w-full h-full relative">
      {viewMode === 'map' ? (
        <MapView 
          position={position} 
          speed={speed} 
          onRoadStatusChange={onRoadStatusChange}
          destination={destination}
          routePoints={routePoints}
          onMapClick={onMapClick}
          positionHistory={positionHistory}
        />
      ) : (
        <DriveView 
          position={position}
          routePoints={routePoints}
        />
      )}
    </div>
  );
};

export default MapArea;
```


## src/components/layout/SearchArea.tsx

```tsx
import AddressSearch from '../AddressSearch';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface SearchAreaProps {
  onLocationSelect: (location: [number, number], address: string) => void;
}

const SearchArea = ({ onLocationSelect }: SearchAreaProps) => {
  const handleLocationSelect = (location: [number, number], address: string) => {
    console.log('[SearchArea] Location selected:', { location, address });
    routePlannerService.setDestination(location, address);
    onLocationSelect(location, address);
  };

  return (
    <div className="flex-1 bg-gray-900 p-2">
      <div className="max-w-xl mx-auto">
        <AddressSearch 
          onLocationSelect={handleLocationSelect}
          fullScreen
        />
      </div>
    </div>
  );
};

export default SearchArea;
```


## src/components/layout/TopPanel.tsx

```tsx
import DestinationPanel from '../DestinationPanel';
import SpeedPanel from '../SpeedPanel';

interface TopPanelProps {
  speed: number;
  recommendedSpeed: number;
  isOnRoad: boolean;
  isDebugMode?: boolean;
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  isSearchMode: boolean;
  onViewModeChange: (mode: 'map' | 'drive') => void;
  viewMode: 'map' | 'drive';
}

const TopPanel = ({
  speed,
  recommendedSpeed,
  isOnRoad,
  isDebugMode,
  destination,
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  isSearchMode,
  onViewModeChange,
  viewMode
}: TopPanelProps) => {
  return (
    <div className="relative z-10 bg-gray-900 shadow-lg">
      <div className="container mx-auto py-4 px-4">
        <div className="flex flex-col gap-4">
          <SpeedPanel
            currentSpeed={speed}
            recommendedSpeed={recommendedSpeed}
            isOnRoad={isOnRoad}
            isDebugMode={isDebugMode}
          />
          <DestinationPanel
            destination={destination}
            onDestinationSelect={onDestinationSelect}
            onDestinationClick={onDestinationClick}
            onSearchModeChange={onSearchModeChange}
            isSearchMode={isSearchMode}
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};

export default TopPanel;
```


## src/components/map/DestinationMarker.tsx

```tsx
import { Marker } from 'react-leaflet';
import L from 'leaflet';

// Custom destination icon
const destinationIcon = L.divIcon({
  html: '📍',
  className: 'destination-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

interface DestinationMarkerProps {
  position: [number, number];
}

const DestinationMarker = ({ position }: DestinationMarkerProps) => {
  return (
    <Marker 
      position={position}
      icon={destinationIcon}
    />
  );
};

export default DestinationMarker;
```


## src/components/map/HistoryTrail.tsx

```tsx
import { Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  // Important: We reverse the positions array to start from the most recent position
  // This ensures the color gradient starts from the vehicle's current position
  const reversedPositions = [...positions].reverse();
  
  // Create segments between each consecutive pair of points
  const segments: Array<[[number, number], [number, number]]> = [];
  
  // We iterate through positions except the last one
  for (let i = 0; i < reversedPositions.length - 1; i++) {
    const currentPos = reversedPositions[i];
    const nextPos = reversedPositions[i + 1];
    segments.push([currentPos, nextPos]);
  }

  // Colors for the gradient from blue to red
  const colors = [
    '#0EA5E9', // Ocean Blue
    '#33C3F0', // Sky Blue
    '#8B5CF6', // Vivid Purple
    '#9b87f5', // Primary Purple
    '#D946EF', // Magenta Pink
    '#ea384c'  // Red
  ];

  // Calculate color for each segment based on its position in the trail
  const getSegmentColor = (index: number) => {
    if (segments.length <= 1) return colors[0];
    
    // Calculate position in the gradient (0 to 1)
    const position = index / (segments.length - 1);
    
    // Calculate which color pair to use
    const colorIndex = Math.min(
      Math.floor(position * (colors.length - 1)),
      colors.length - 1
    );
    
    return colors[colorIndex];
  };

  return (
    <>
      {segments.map((segment, index) => (
        <Polyline
          key={`segment-${index}`}
          positions={segment as LatLngExpression[]}
          color={getSegmentColor(index)}
          weight={3}
          opacity={0.8}
        />
      ))}
    </>
  );
};

export default HistoryTrail;
```


## src/components/map/MapEventHandlers.tsx

```tsx
import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { roadPredictor } from '../../services/prediction/RoadPredictor';
import { toast } from '../../components/ui/use-toast';
import { roadInfoManager } from '../../services/roadInfo/RoadInfoManager';

interface MapEventHandlersProps {
  position: [number, number];
  onRoadStatusChange: (status: boolean) => void;
  onMapClick: (location: [number, number], address: string) => void;
}

const MapEventHandlers = ({ position, onRoadStatusChange, onMapClick }: MapEventHandlersProps) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  // Écouter les mises à jour du RoadInfoManager
  useEffect(() => {
    const handleRoadInfo = (info: { isOnRoad: boolean }) => {
      onRoadStatusChange(info.isOnRoad);
    };

    roadInfoManager.addObserver(handleRoadInfo);
    roadInfoManager.updateRoadInfo(position);

    return () => {
      roadInfoManager.removeObserver(handleRoadInfo);
    };
  }, [position, onRoadStatusChange]);

  useEffect(() => {
    const handleZoomToDestination = (e: CustomEvent) => {
      const { location } = e.detail;
      map.setView(location, 15);
    };

    const mapElement = map.getContainer();
    mapElement.addEventListener('zoomToDestination', handleZoomToDestination as EventListener);

    return () => {
      mapElement.removeEventListener('zoomToDestination', handleZoomToDestination as EventListener);
    };
  }, [map]);

  // Handle map clicks and reverse geocoding
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer l'adresse",
        variant: "destructive"
      });
      return "Adresse inconnue";
    }
  };

  useMapEvents({
    click: async (e) => {
      const location: [number, number] = [e.latlng.lat, e.latlng.lng];
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      onMapClick(location, address);
    },
  });

  return null;
};

export default MapEventHandlers;
```


## src/components/map/RouteOverlay.tsx

```tsx
import { Polyline } from 'react-leaflet';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface RouteOverlayProps {
  routePoints: [number, number][];
}

const RouteOverlay = ({ routePoints }: RouteOverlayProps) => {
  if (routePoints.length === 0) return null;

  return (
    <Polyline
      positions={routePoints}
      color={routePlannerService.getRouteColor()}
      weight={4}
      opacity={0.8}
      dashArray="10, 10"
    />
  );
};

export default RouteOverlay;
```


## src/components/map/TurnCurveOverlay.tsx

```tsx
import { Polyline } from 'react-leaflet';
import { TurnPrediction } from '../../services/prediction/PredictionTypes';

interface TurnCurveOverlayProps {
  turns: TurnPrediction[];
}

const getTurnColor = (radius: number): string => {
  // Les seuils sont en mètres
  if (radius > 100) {
    return '#F2FCE2'; // Vert doux pour les virages larges
  } else if (radius > 50) {
    return '#FEF7CD'; // Jaune doux pour les virages moyens
  } else if (radius > 25) {
    return '#FEC6A1'; // Orange doux pour les virages serrés
  } else if (radius > 10) {
    return '#F97316'; // Orange vif pour les virages très serrés
  } else {
    return '#ea384c'; // Rouge pour les virages dangereux
  }
};

const TurnCurveOverlay = ({ turns }: TurnCurveOverlayProps) => {
  return (
    <>
      {turns.map((turn, index) => (
        <Polyline
          key={`curve-${index}`}
          positions={turn.curveInfo.curvePoints}
          pathOptions={{
            color: getTurnColor(turn.curveInfo.radius),
            weight: 10,
            opacity: 0.9,
            dashArray: undefined
          }}
        />
      ))}
    </>
  );
};

export default TurnCurveOverlay;
```


## src/components/map/TurnWarningMarker.tsx

```tsx
import { Marker } from 'react-leaflet';
import { TriangleAlert } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

interface TurnWarningMarkerProps {
  position: [number, number];
  angle: number;
  isNextTurn?: boolean;
}

const TurnWarningMarker = ({ position, angle, isNextTurn = false }: TurnWarningMarkerProps) => {
  const iconHtml = renderToString(
    <div className={isNextTurn ? "text-blue-500" : "text-blue-400"}>
      <TriangleAlert size={24} />
    </div>
  );

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'turn-warning-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });

  return (
    <Marker position={position} icon={customIcon} />
  );
};

export default TurnWarningMarker;
```


## src/components/map/VehicleMarker.tsx

```tsx
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDownRight,
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft
} from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface VehicleMarkerProps {
  position: [number, number];
  isOnRoad: boolean;
  heading?: number;
}

const VehicleMarker = ({ position, isOnRoad, heading = 0 }: VehicleMarkerProps) => {
  const getDirectionIcon = (heading: number) => {
    // Normalize heading to 0-360
    const normalizedHeading = ((heading % 360) + 360) % 360;
    
    // Define direction ranges (45 degree segments)
    if (normalizedHeading >= 337.5 || normalizedHeading < 22.5) return ArrowUp;
    if (normalizedHeading >= 22.5 && normalizedHeading < 67.5) return ArrowUpRight;
    if (normalizedHeading >= 67.5 && normalizedHeading < 112.5) return ArrowRight;
    if (normalizedHeading >= 112.5 && normalizedHeading < 157.5) return ArrowDownRight;
    if (normalizedHeading >= 157.5 && normalizedHeading < 202.5) return ArrowDown;
    if (normalizedHeading >= 202.5 && normalizedHeading < 247.5) return ArrowDownLeft;
    if (normalizedHeading >= 247.5 && normalizedHeading < 292.5) return ArrowLeft;
    return ArrowUpLeft;
  };

  const DirectionIcon = getDirectionIcon(heading);
  
  const vehicleIcon = L.divIcon({
    html: isOnRoad ? renderToString(
      <DirectionIcon 
        size={24}
        color="#2563eb"
        strokeWidth={3}
      />
    ) : '📍',
    className: 'vehicle-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Marker 
      position={position} 
      icon={vehicleIcon}
    />
  );
};

export default VehicleMarker;
```


## src/components/ui/accordion.tsx

```tsx
import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```


## src/components/ui/alert-dialog.tsx

```tsx
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
```


## src/components/ui/alert.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
```


## src/components/ui/aspect-ratio.tsx

```tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }
```


## src/components/ui/avatar.tsx

```tsx
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
```


## src/components/ui/badge.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```


## src/components/ui/breadcrumb.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
```


## src/components/ui/button.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```


## src/components/ui/calendar.tsx

```tsx
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
```


## src/components/ui/card.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```


## src/components/ui/carousel.tsx

```tsx
import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)

      return () => {
        api?.off("select", onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute  h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
```


## src/components/ui/chart.tsx

```tsx
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
```


## src/components/ui/checkbox.tsx

```tsx
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
```


## src/components/ui/collapsible.tsx

```tsx
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```


## src/components/ui/command.tsx

```tsx
import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
```


## src/components/ui/context-menu.tsx

```tsx
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
```


## src/components/ui/dialog.tsx

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```


## src/components/ui/drawer.tsx

```tsx
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
```


## src/components/ui/dropdown-menu.tsx

```tsx
import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
```


## src/components/ui/form.tsx

```tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
```


## src/components/ui/hover-card.tsx

```tsx
import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
```


## src/components/ui/input-otp.tsx

```tsx
import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Dot } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Dot />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
```


## src/components/ui/input.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```


## src/components/ui/label.tsx

```tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```


## src/components/ui/menubar.tsx

```tsx
import * as React from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const MenubarMenu = MenubarPrimitive.Menu

const MenubarGroup = MenubarPrimitive.Group

const MenubarPortal = MenubarPrimitive.Portal

const MenubarSub = MenubarPrimitive.Sub

const MenubarRadioGroup = MenubarPrimitive.RadioGroup

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-10 items-center space-x-1 rounded-md border bg-background p-1",
      className
    )}
    {...props}
  />
))
Menubar.displayName = MenubarPrimitive.Root.displayName

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className
    )}
    {...props}
  />
))
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
))
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(
  (
    { className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
    ref
  ) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={ref}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
)
MenubarContent.displayName = MenubarPrimitive.Content.displayName

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarItem.displayName = MenubarPrimitive.Item.displayName

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
))
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
))
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarLabel.displayName = MenubarPrimitive.Label.displayName

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
MenubarShortcut.displayname = "MenubarShortcut"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
}
```


## src/components/ui/navigation-menu.tsx

```tsx
import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}
```


## src/components/ui/pagination.tsx

```tsx
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
```


## src/components/ui/popover.tsx

```tsx
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
```


## src/components/ui/progress.tsx

```tsx
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
```


## src/components/ui/radio-group.tsx

```tsx
import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
```


## src/components/ui/resizable.tsx

```tsx
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
```


## src/components/ui/scroll-area.tsx

```tsx
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
```


## src/components/ui/select.tsx

```tsx
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
```


## src/components/ui/separator.tsx

```tsx
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
```


## src/components/ui/sheet.tsx

```tsx
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> { }

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet, SheetClose,
  SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger
}
```


## src/components/ui/sidebar.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    // This is the internal state of the sidebar.
    // We use openProp and setOpenProp for control from outside the component.
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        // This sets the cookie to keep the sidebar state.
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div
        ref={ref}
        className="group peer hidden md:block text-sidebar-foreground"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          className={cn(
            "duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
              : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
          )}
        />
        <div
          className={cn(
            "duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-linear md:flex",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
              : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
            className
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
```


## src/components/ui/skeleton.tsx

```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```


## src/components/ui/slider.tsx

```tsx
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
```


## src/components/ui/sonner.tsx

```tsx
import { Toaster as Sonner } from "sonner"
import { useTheme } from "next-themes"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = () => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  )
}

export { Toaster }
```


## src/components/ui/switch.tsx

```tsx
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```


## src/components/ui/table.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```


## src/components/ui/tabs.tsx

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```


## src/components/ui/textarea.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```


## src/components/ui/toast.tsx

```tsx
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
```


## src/components/ui/toaster.tsx

```tsx
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="fixed bottom-0 z-[9999] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  )
}
```


## src/components/ui/toggle-group.tsx

```tsx
import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
```


## src/components/ui/toggle.tsx

```tsx
import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
```


## src/components/ui/tooltip.tsx

```tsx
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```


## src/components/ui/use-toast.ts

```ts
import { useToast, toast } from "@/hooks/use-toast";

export { useToast, toast };
```


## src/components/AddressSearch.tsx

```tsx
import { Input } from './ui/input';
import { useAddressSearch } from '../hooks/useAddressSearch';
import { Loader2 } from 'lucide-react';

interface AddressSearchProps {
  onLocationSelect: (location: [number, number], address: string) => void;
  fullScreen?: boolean;
}

const AddressSearch = ({ onLocationSelect, fullScreen }: AddressSearchProps) => {
  const {
    query,
    results,
    isSearching,
    handleInputChange,
    handleResultClick,
    handleKeyPress,
  } = useAddressSearch(onLocationSelect);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          placeholder="Rechercher une adresse..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className="w-full bg-gray-800 text-white border-gray-700 focus:border-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 bg-gray-800 rounded-md shadow-lg ${fullScreen ? 'max-h-[calc(100vh-12rem)]' : 'max-h-60'} overflow-auto`}>
          <ul className="py-1">
            {results.map((result) => (
              <li key={result.display_name}>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
                  onClick={() => handleResultClick(result)}
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
```


## src/components/DestinationPanel.tsx

```tsx
import { Button } from './ui/button';
import { Search, MapPin, X, Play, Square, Map, Car } from 'lucide-react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useState, useEffect } from 'react';
import { Toggle } from './ui/toggle';

interface DestinationPanelProps {
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  onViewModeChange: (mode: 'map' | 'drive') => void;
  isSearchMode: boolean;
  viewMode: 'map' | 'drive';
}

const DestinationPanel = ({ 
  destination, 
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  onViewModeChange,
  isSearchMode,
  viewMode
}: DestinationPanelProps) => {
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    const updatePredictionState = (isActive: boolean) => {
      console.log('Prediction state updated:', isActive);
      setIsPredicting(isActive);
    };

    // Initial state
    setIsPredicting(roadPredictor.getIsActive());

    // Subscribe to state changes
    roadPredictor.addStateObserver(updatePredictionState);
    return () => roadPredictor.removeStateObserver(updatePredictionState);
  }, []);

  const handleSearchClick = () => {
    console.log('Search mode activated');
    onSearchModeChange(true);
  };

  const handleCloseClick = () => {
    console.log('Search mode deactivated');
    onSearchModeChange(false);
  };

  const handlePredictionToggle = () => {
    console.log('Toggling prediction state, current state:', isPredicting);
    if (isPredicting) {
      roadPredictor.stopUpdates();
    } else {
      roadPredictor.startUpdates();
    }
  };

  const handlePositionClick = () => {
    if (!destination) {
      handleSearchClick();
    } else {
      onDestinationClick();
    }
  };

  const handleViewModeToggle = () => {
    onViewModeChange(viewMode === 'map' ? 'drive' : 'map');
  };

  if (isSearchMode) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-4">
        <span className="text-lg font-semibold">Search destination</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 ml-2 flex-shrink-0"
          onClick={handleCloseClick}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="h-5 w-5 flex-shrink-0" />
        <button
          className="hover:text-blue-400 transition-colors text-left truncate"
          onClick={handlePositionClick}
        >
          {destination ? destination.address : <span className="text-gray-400">Free ride mode</span>}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 flex-shrink-0"
          onClick={handleSearchClick}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 flex-shrink-0"
          onClick={handlePredictionToggle}
        >
          {isPredicting ? (
            <Play className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </Button>
        <Toggle
          pressed={viewMode === 'drive'}
          onPressedChange={() => handleViewModeToggle()}
          className="text-white hover:text-white hover:bg-gray-800"
        >
          {viewMode === 'map' ? (
            <Car className="h-5 w-5" />
          ) : (
            <Map className="h-5 w-5" />
          )}
        </Toggle>
      </div>
    </div>
  );
};

export default DestinationPanel;
```


## src/components/LoadingScreen.tsx

```tsx
const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Initializing Driver Assistant</h2>
        <p>Please enable location services...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
```


## src/components/MainLayout.tsx

```tsx
import TopPanel from './layout/TopPanel';
import MapArea from './layout/MapArea';
import StatusBar from './StatusBar';
import SearchArea from './layout/SearchArea';
import { useState } from 'react';

interface MainLayoutProps {
  position: [number, number];
  speed: number;
  recommendedSpeed: number;
  isOnRoad: boolean;
  destination: { address: string; location: [number, number] } | null;
  routePoints: [number, number][];
  onDestinationSelect: (location: [number, number], address: string) => void;
  onRoadStatusChange: (status: boolean) => void;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
  positionHistory: [number, number][];
}

const MainLayout = ({
  position,
  speed,
  recommendedSpeed,
  isOnRoad,
  destination,
  routePoints,
  onDestinationSelect,
  onRoadStatusChange,
  isDebugMode,
  onDebugModeChange,
  positionHistory
}: MainLayoutProps) => {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'drive'>('map');

  const handleDestinationSelect = (location: [number, number], address: string) => {
    console.log('[MainLayout] New destination selected:', { location, address });
    onDestinationSelect(location, address);
    setIsSearchMode(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopPanel
        speed={speed}
        recommendedSpeed={recommendedSpeed}
        isOnRoad={isOnRoad}
        isDebugMode={isDebugMode}
        destination={destination}
        onDestinationSelect={handleDestinationSelect}
        onDestinationClick={() => setIsSearchMode(true)}
        onSearchModeChange={setIsSearchMode}
        isSearchMode={isSearchMode}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />
      <div className="flex-1 relative">
        {isSearchMode ? (
          <SearchArea onLocationSelect={handleDestinationSelect} />
        ) : (
          <MapArea
            position={position}
            speed={speed}
            onRoadStatusChange={onRoadStatusChange}
            destination={destination?.location}
            routePoints={routePoints}
            onMapClick={handleDestinationSelect}
            positionHistory={positionHistory}
            viewMode={viewMode}
          />
        )}
      </div>
      <StatusBar 
        isOnRoad={isOnRoad} 
        speed={speed} 
        isDebugMode={isDebugMode} 
        onDebugModeChange={onDebugModeChange}
        position={position}
      />
    </div>
  );
};

export default MainLayout;
```


## src/components/MapView.tsx

```tsx
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './map/RouteOverlay';
import VehicleMarker from './map/VehicleMarker';
import DestinationMarker from './map/DestinationMarker';
import HistoryTrail from './map/HistoryTrail';
import MapEventHandlers from './map/MapEventHandlers';
import TurnWarningMarker from './map/TurnWarningMarker';
import TurnCurveOverlay from './map/TurnCurveOverlay';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useVehicleState } from '../hooks/useVehicleState';
import { TurnPrediction } from '../services/prediction/PredictionTypes';
import { routePlannerService } from '../services/route/RoutePlannerService';
import { toast } from './ui/use-toast';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
  routePoints: [number, number][];
  onMapClick: (location: [number, number], address: string) => void;
  positionHistory: [number, number][];
}

const MapView = ({ 
  position, 
  speed, 
  onRoadStatusChange, 
  destination,
  routePoints,
  onMapClick,
  positionHistory
}: MapViewProps) => {
  const {
    position: currentPosition,
    speed: currentSpeed,
    history: currentHistory,
    isOnRoad,
    handleRoadStatusChange
  } = useVehicleState(position, speed, positionHistory, onRoadStatusChange);

  const [nextTurn, setNextTurn] = useState<TurnPrediction | null>(null);
  const [allTurns, setAllTurns] = useState<TurnPrediction[]>([]);

  // Log des mises à jour des points de route
  useEffect(() => {
    console.log('[MapView] Route points updated:', {
      length: routePoints?.length,
      points: routePoints,
      destination
    });
  }, [routePoints, destination]);

  // Mettre à jour la position dans le RoadPredictor
  useEffect(() => {
    roadPredictor.updatePosition(currentPosition);
  }, [currentPosition]);

  useEffect(() => {
    const observer = (prediction: TurnPrediction | null, turns: TurnPrediction[]) => {
      console.log('[MapView] Road prediction updated:', { prediction, turns });
      setNextTurn(prediction);
      setAllTurns(turns);
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  // Gérer l'événement de recalcul d'itinéraire
  useEffect(() => {
    const handleRouteRecalculation = async () => {
      console.log('Recalculating route...');
      try {
        await routePlannerService.recalculateRoute();
      } catch (error) {
        console.error('Failed to recalculate route:', error);
        toast({
          title: "Erreur",
          description: "Impossible de recalculer l'itinéraire",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('recalculateRoute', handleRouteRecalculation);
    return () => {
      window.removeEventListener('recalculateRoute', handleRouteRecalculation);
    };
  }, []);

  const heading = (window as any).globalVehicle?.heading || 0;

  return (
    <MapContainer
      center={currentPosition}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapEventHandlers 
        position={currentPosition}
        onRoadStatusChange={handleRoadStatusChange}
        onMapClick={onMapClick}
      />
      <HistoryTrail positions={currentHistory} />
      <PredictionOverlay position={currentPosition} speed={currentSpeed} routePoints={routePoints} />
      <VehicleMarker position={currentPosition} isOnRoad={isOnRoad} heading={heading} />
      {destination && <DestinationMarker position={destination} />}
      {allTurns.map((turn, index) => (
        <TurnWarningMarker 
          key={`${turn.position[0]}-${turn.position[1]}-${index}`}
          position={turn.position} 
          angle={turn.angle}
          isNextTurn={index === 0}
        />
      ))}
      <TurnCurveOverlay turns={allTurns} />
      <RouteOverlay routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;
```


## src/components/PredictionOverlay.tsx

```tsx
import { useEffect, useState } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { predictRoadAhead, calculateBearing, calculateAngleDifference, calculateDistance } from '../utils/mapUtils';
import { roadInfoService } from '../services/roadInfo';

interface PredictionOverlayProps {
  position: [number, number];
  speed: number;
  routePoints?: [number, number][];
}

const getColorFromAngle = (angleDiff: number): string => {
  // Use absolute value for color calculation
  const absAngle = Math.abs(angleDiff);
  
  if (absAngle <= 45) {
    // Interpolate between bright green and vivid red (0° to 45°)
    const ratio = absAngle / 45;
    return `#${Math.round((1 - ratio) * 0x10 + ratio * 0xea).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0xB9 + ratio * 0x38).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x81 + ratio * 0x4c).toString(16).padStart(2, '0')}`;
  } else {
    // Interpolate between vivid red and ocean blue (45° to 180°)
    const ratio = (absAngle - 45) / 135;
    return `#${Math.round((1 - ratio) * 0xea + ratio * 0x0E).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x38 + ratio * 0xA5).toString(16).padStart(2, '0')}${
      Math.round((1 - ratio) * 0x4c + ratio * 0xE9).toString(16).padStart(2, '0')}`;
  }
};

const PredictionOverlay = ({ position, speed, routePoints }: PredictionOverlayProps) => {
  const [predictionPath, setPredictionPath] = useState<[number, number][]>([]);
  const [roadSegment, setRoadSegment] = useState<[number, number][]>([]);
  const [predictionColor, setPredictionColor] = useState('#F2FCE2');
  const vehicle = (window as any).globalVehicle;
  
  useEffect(() => {
    const heading = vehicle ? vehicle.heading : 0;
    const path = predictRoadAhead(position, speed, heading);
    setPredictionPath(path);

    const analyzePrediction = async () => {
      let referenceSegment: [number, number][];
      
      // Si on a une route planifiée, on l'utilise
      if (routePoints && routePoints.length > 1) {
        let minDistance = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < routePoints.length - 1; i++) {
          const d = calculateDistance(position, routePoints[i]);
          if (d < minDistance) {
            minDistance = d;
            closestIndex = i;
          }
        }
        
        referenceSegment = [routePoints[closestIndex], routePoints[closestIndex + 1]];
      } else {
        // Sinon on utilise le service de route
        const segment = await roadInfoService.getCurrentRoadSegment(position[0], position[1]);
        referenceSegment = segment;
        setRoadSegment(segment);
      }

      if (referenceSegment && referenceSegment.length > 1 && path.length > 1) {
        // Calculer l'angle de la prédiction
        const predictionBearing = calculateBearing(path[0], path[1]);
        
        // Calculer l'angle de la route
        const roadBearing = calculateBearing(referenceSegment[0], referenceSegment[1]);
        
        // Calculer la différence d'angle
        const angleDiff = calculateAngleDifference(predictionBearing, roadBearing);
        
        // Mettre à jour la couleur en fonction de l'angle
        const color = getColorFromAngle(angleDiff);
        setPredictionColor(color);
        
        console.log('Analyse de trajectoire:', {
          predictionBearing,
          roadBearing,
          angleDifference: angleDiff,
          color,
          isGoodTrajectory: Math.abs(angleDiff) <= 45
        });
      }
    };

    analyzePrediction();
  }, [position, speed, vehicle, routePoints]);

  return (
    <>
      <Polyline
        positions={predictionPath}
        pathOptions={{ color: predictionColor, weight: 4, opacity: 0.6 }}
      />
      <Polyline
        positions={roadSegment}
        pathOptions={{ color: '#10B981', weight: 4, opacity: 0.8 }}
      />
    </>
  );
};

export default PredictionOverlay;
```


## src/components/RoadPredictionInfo.tsx

```tsx
import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';

interface RoadPredictionInfoProps {
  onRouteRecalculation?: (from: [number, number], to: [number, number]) => Promise<void>;
}

const RoadPredictionInfo = ({ onRouteRecalculation }: RoadPredictionInfoProps) => {
  const [prediction, setPrediction] = useState<RoadPrediction | null>(null);

  useEffect(() => {
    const observer = (newPrediction: RoadPrediction | null) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);

    return () => {
      roadPredictor.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    if (!onRouteRecalculation) return;

    const handleRouteRecalculation = async (event: CustomEvent) => {
      const { from, to } = event.detail;
      await onRouteRecalculation(from, to);
    };

    window.addEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
    
    return () => {
      window.removeEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
    };
  }, [onRouteRecalculation]);

  if (!prediction) return null;

  const turnDirection = prediction.angle > 0 ? 'droite' : 'gauche';

  return (
    <div className="absolute bottom-20 left-4 bg-gray-900/90 text-white p-2 rounded-lg shadow-lg">
      <div className="text-sm space-y-1">
        <div>Distance : {Math.round(prediction.distance)}m</div>
        <div>Direction : {turnDirection}</div>
        <div>Angle : {Math.abs(Math.round(prediction.angle || 0))}°</div>
      </div>
    </div>
  );
};

export default RoadPredictionInfo;
```


## src/components/SearchBar.tsx

```tsx
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  isSearching: boolean;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchClick: () => void;
}

const SearchBar = ({
  query,
  isSearching,
  onQueryChange,
  onKeyPress,
  onSearchClick
}: SearchBarProps) => {
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="Rechercher une adresse..."
        value={query}
        onChange={onQueryChange}
        onKeyPress={onKeyPress}
        className="flex-1"
      />
      <Button 
        variant="default"
        onClick={onSearchClick}
        disabled={isSearching || query.length < 3}
        className="px-4"
      >
        <Search className="h-4 w-4 mr-2" />
        Rechercher
      </Button>
    </div>
  );
};

export default SearchBar;
```


## src/components/SearchResults.tsx

```tsx
interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  fullScreen?: boolean;
}

const SearchResults = ({ results, onResultClick, fullScreen = false }: SearchResultsProps) => {
  if (results.length === 0) return null;

  return (
    <div className={`${fullScreen ? 'mt-4' : 'absolute z-50 mt-1'} w-full bg-white rounded-md shadow-lg border border-gray-200`}>
      <ul className={`py-1 text-sm ${fullScreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-60'} overflow-auto`}>
        {results.map((result, index) => (
          <li
            key={index}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-left"
            onClick={() => onResultClick(result)}
          >
            {result.display_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;
```


## src/components/SettingsView.tsx

```tsx
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Settings, settingsService, RoadInfoProvider } from "../services/SettingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "./ui/use-toast";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import SplashScreen from "./SplashScreen";

const SettingsView = () => {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);
  const [settings, setSettings] = useState<Settings>(settingsService.getSettings());

  useEffect(() => {
    const observer = (newSettings: Settings) => {
      setSettings(newSettings);
    };
    settingsService.addObserver(observer);
    return () => settingsService.removeObserver(observer);
  }, []);

  const handleSettingChange = (key: keyof Settings, value: string | number | boolean) => {
    if (typeof value === 'string' && [
      'minTurnAngle', 
      'minTurnSpeed', 
      'maxTurnAngle', 
      'defaultSpeed', 
      'predictionDistance',
      'maxTurnDistance',
      'minTurnDistance',
      'updateInterval'
    ].includes(key)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        settingsService.updateSettings({ [key]: numValue });
      }
    } else {
      settingsService.updateSettings({ [key]: value });
    }
  };

  const handleProviderChange = (value: RoadInfoProvider) => {
    if (value === 'mapbox' && !settings.mapboxToken) {
      toast({
        title: "Token Mapbox requis",
        description: "Veuillez configurer votre token Mapbox pour utiliser ce service.",
        variant: "destructive",
      });
      return;
    }
    handleSettingChange('roadInfoProvider', value);
  };

  return (
    <>
      {showAbout && <SplashScreen onComplete={() => setShowAbout(false)} />}
      
      <div className="h-screen flex flex-col">
        <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-gray-800"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Button
            variant="ghost"
            className="text-white hover:bg-gray-800"
            onClick={() => setShowAbout(true)}
          >
            <Info className="h-4 w-4 mr-2" />
            About
          </Button>
        </div>
        
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-6">Réglages</h1>
          
          <Tabs defaultValue="curves" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="curves">Virages</TabsTrigger>
              <TabsTrigger value="providers">Services</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="navigation">Navigation</TabsTrigger>
            </TabsList>

            <TabsContent value="curves" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minTurnAngle">Angle minimal pour définir un virage (degrés)</Label>
                  <Input
                    id="minTurnAngle"
                    type="number"
                    value={settings.minTurnAngle}
                    onChange={(e) => handleSettingChange('minTurnAngle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTurnAngle">Angle maximal pour un virage (degrés)</Label>
                  <Input
                    id="maxTurnAngle"
                    type="number"
                    value={settings.maxTurnAngle}
                    onChange={(e) => handleSettingChange('maxTurnAngle', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minTurnSpeed">Vitesse minimale en virage serré (km/h)</Label>
                  <Input
                    id="minTurnSpeed"
                    type="number"
                    value={settings.minTurnSpeed}
                    onChange={(e) => handleSettingChange('minTurnSpeed', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minTurnDistance">Distance minimale d'un virage (mètres)</Label>
                  <Input
                    id="minTurnDistance"
                    type="number"
                    value={settings.minTurnDistance}
                    onChange={(e) => handleSettingChange('minTurnDistance', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTurnDistance">Distance maximale d'un virage (mètres)</Label>
                  <Input
                    id="maxTurnDistance"
                    type="number"
                    value={settings.maxTurnDistance}
                    onChange={(e) => handleSettingChange('maxTurnDistance', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="predictionDistance">Distance d'analyse des virages (mètres)</Label>
                  <Input
                    id="predictionDistance"
                    type="number"
                    value={settings.predictionDistance}
                    onChange={(e) => handleSettingChange('predictionDistance', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-6">
              <div className="space-y-2">
                <Label>Fournisseur actif</Label>
                <Select 
                  value={settings.roadInfoProvider} 
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overpass">OpenStreetMap (Overpass)</SelectItem>
                    <SelectItem value="nominatim">OpenStreetMap (Nominatim)</SelectItem>
                    <SelectItem value="mapbox">Mapbox (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="disable-overpass"
                  checked={settings.disableOverpass}
                  onCheckedChange={(checked) => handleSettingChange('disableOverpass', checked)}
                />
                <Label htmlFor="disable-overpass">Désactiver les appels à Overpass API</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapboxToken">Token Mapbox</Label>
                <Input
                  id="mapboxToken"
                  type="password"
                  value={settings.mapboxToken}
                  onChange={(e) => handleSettingChange('mapboxToken', e.target.value)}
                  placeholder="pk.eyJ1Ijoi..."
                />
                <p className="text-sm text-gray-500">
                  Requis uniquement pour utiliser le service Mapbox Premium. Obtenez votre token sur{" "}
                  <a 
                    href="https://account.mapbox.com/access-tokens/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    mapbox.com
                  </a>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="simulation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Version du simulateur</Label>
                  <Select 
                    value={settings.simulatorVersion} 
                    onValueChange={(value: 'v1' | 'v2') => handleSettingChange('simulatorVersion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">Version 1 (Simple)</SelectItem>
                      <SelectItem value="v2">Version 2 (Physique)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateInterval">Intervalle de mise à jour (ms)</Label>
                  <Input
                    id="updateInterval"
                    type="number"
                    value={settings.updateInterval}
                    onChange={(e) => handleSettingChange('updateInterval', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style de conduite</Label>
                  <Select 
                    value={settings.drivingStyle} 
                    onValueChange={(value: 'prudent' | 'normal' | 'sportif') => handleSettingChange('drivingStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prudent">Prudent</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="sportif">Sportif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="navigation" className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-recalculate"
                  checked={settings.enableAutoRecalculate}
                  onCheckedChange={(checked) => handleSettingChange('enableAutoRecalculate', checked)}
                />
                <Label htmlFor="auto-recalculate">Recalcul automatique de l'itinéraire</Label>
              </div>
              <p className="text-sm text-gray-500">
                Lorsque cette option est activée, l'itinéraire sera automatiquement recalculé si le véhicule s'écarte trop du trajet prévu.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default SettingsView;
```


## src/components/SpeedDisplay.tsx

```tsx
interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  speedLimit?: number | null;
  deceleration?: number | null;
  acceleration?: number;
}

const SpeedDisplay = ({ 
  currentSpeed, 
  recommendedSpeed, 
  speedLimit, 
  deceleration,
  acceleration = 0 
}: SpeedDisplayProps) => {
  const isOverSpeed = speedLimit ? currentSpeed > speedLimit : currentSpeed > recommendedSpeed;
  
  const getAccelerationDisplay = () => {
    if (Math.abs(acceleration) < 0.01) {
      return (
        <span className="text-sm text-gray-400 ml-4 px-2 py-1 rounded">
          STEADY
        </span>
      );
    }
    
    if (acceleration > 0) {
      return (
        <span className="text-sm text-white ml-4 px-2 py-1 rounded bg-green-600">
          ACCEL ({acceleration.toFixed(2)}g)
        </span>
      );
    }
    
    return (
      <span className="text-sm text-white ml-4 px-2 py-1 rounded bg-red-600">
        BRAKE ({Math.abs(acceleration).toFixed(2)}g)
      </span>
    );
  };
  
  return (
    <div className="flex items-center space-x-2">
      {/* Vitesse actuelle */}
      <span className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
        {currentSpeed}
      </span>

      {/* Séparateur */}
      <span className="text-4xl text-gray-400">/</span>

      {/* Vitesse recommandée */}
      <span className="text-4xl font-bold text-green-500">
        {speedLimit || recommendedSpeed}
      </span>

      {/* Unité et limite de vitesse */}
      <span className="text-sm text-gray-400">
        km/h {speedLimit ? `(${speedLimit} km/h)` : ''}
      </span>

      {/* Indicateur d'accélération */}
      {getAccelerationDisplay()}

      {/* Décélération requise */}
      {deceleration && deceleration < 0 && (
        <span className="text-sm text-yellow-500 ml-4">
          {Math.abs(deceleration).toFixed(1)}g req
        </span>
      )}
    </div>
  );
};

export default SpeedDisplay;
```


## src/components/SpeedPanel.tsx

```tsx
import { useEffect, useState } from 'react';
import { useSpeedInfo } from '../hooks/useSpeedInfo';
import SpeedDisplay from './SpeedDisplay';
import TurnWarning from './TurnWarning';

interface SpeedPanelProps {
  currentSpeed: number;
  recommendedSpeed: number;
  isOnRoad?: boolean;
  isDebugMode?: boolean;
}

const SpeedPanel = ({ 
  currentSpeed, 
  recommendedSpeed,
  isOnRoad,
  isDebugMode
}: SpeedPanelProps) => {
  const [acceleration, setAcceleration] = useState(0);
  const { displaySpeed, speedLimit, optimalSpeed, prediction } = useSpeedInfo(currentSpeed, isOnRoad);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (!vehicle) {
      console.warn('[SpeedPanel] No vehicle found');
      return;
    }

    console.log('[SpeedPanel] Setting up vehicle observer');
    const observer = (_position: [number, number], _speed: number, currentAcceleration: number) => {
      setAcceleration(currentAcceleration);
    };

    vehicle.addObserver(observer);
    return () => {
      console.log('[SpeedPanel] Cleaning up vehicle observer');
      vehicle.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    console.log('[SpeedPanel] Speed update received:', {
      currentSpeed,
      displaySpeed,
      recommendedSpeed,
      speedLimit,
      optimalSpeed,
      prediction,
      acceleration
    });
  }, [currentSpeed, displaySpeed, recommendedSpeed, speedLimit, optimalSpeed, prediction, acceleration]);

  const kmhSpeed = Math.round(displaySpeed * 3.6); // Conversion m/s to km/h
  const kmhRecommended = optimalSpeed || speedLimit || Math.round(recommendedSpeed * 3.6);

  // Calcul du pourcentage de remplissage de la barre de progression
  const getProgressStyle = () => {
    if (!prediction || prediction.angle === null) {
      return {};
    }

    const distance = prediction.distance;
    const maxDistance = 200; // Distance maximale en mètres pour commencer à afficher la progression
    const progress = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
    
    // Détermine si le virage est à gauche ou à droite
    const isLeftTurn = prediction.angle < 0;
    
    return {
      background: `linear-gradient(to ${isLeftTurn ? 'right' : 'left'}, 
        #8E9196 ${progress}%, 
        #111827 ${progress}%)`
    };
  };
  
  return (
    <div 
      className="bg-gray-900/90 text-white w-full transition-all duration-300 ease-in-out"
      style={getProgressStyle()}
    >
      <div className="flex flex-col items-center justify-center px-0 py-0 space-y-0">
        <SpeedDisplay 
          currentSpeed={kmhSpeed}
          recommendedSpeed={kmhRecommended}
          speedLimit={speedLimit}
          deceleration={prediction?.requiredDeceleration}
          acceleration={acceleration}
        />
        {prediction && (
          <TurnWarning 
            distance={prediction.distance}
            angle={prediction.angle}
          />
        )}
      </div>
    </div>
  );
};

export default SpeedPanel;
```


## src/components/SplashScreen.tsx

```tsx
import { useEffect, useState } from 'react';
import roadBackground from '../assets/splashscreen.jpg';
import '../styles/matrix.css';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="fixed inset-0 bg-[#222222] flex flex-col items-center justify-center overflow-hidden">
      {/* Route arc-en-ciel avec image de base */}
      <div className="absolute inset-0 w-full h-full">
        {/* Image de base de la route */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full"
          style={{
            backgroundImage: `url(${roadBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
          }}
        />
        {/* Superposition arc-en-ciel */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full"
          style={{
            background: `linear-gradient(180deg, 
              #F97316 0%,
              #D946EF 20%,
              #8B5CF6 40%,
              #0EA5E9 60%,
              #33C3F0 80%,
              #F2FCE2 100%
            )`,
            opacity: 0.6,
            mixBlendMode: 'overlay',
            animation: "colorPulse 2s infinite alternate"
          }}
        />
      </div>

      {/* Contenu texte au premier plan */}
      <div className="relative z-10 flex flex-col items-center">
        <h1 
          className="text-6xl font-bold mb-8 tracking-wider crt-text rainbow-text"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            animation: "textShadowPulse 2s infinite"
          }}
        >
          ROADWISE
        </h1>
        <div 
          className="matrix-text text-center space-y-4 mb-8"
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            color: '#00ff00',
            textShadow: '0 0 5px #00ff00'
          }}
        >
          <div className="text-2xl mb-6">Advanced Driver Assistance System</div>
          
          <div className="text-xl opacity-80">
            <p className="mb-4">Project Information:</p>
            <p>Original Concept & Design: Serge Fantino</p>
            <p className="mb-4">AI-Powered Development Stack:</p>
            <ul className="list-none space-y-2">
              <li>» Core Application: Lovable AI</li>
              <li>» Code Optimization: Claude & Cursor AI</li>
              <li>» Algorithm Design: Gemini 2 AI</li>
            </ul>
            <p className="mt-4 text-orange-400">
              Human Intelligence: Essential for Integration & Refinement
            </p>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-4 px-8 py-3 bg-green-500 text-black rounded-full text-xl font-mono
                   hover:bg-green-400 transition-colors duration-300 
                   shadow-lg hover:shadow-xl transform hover:scale-105
                   border-2 border-green-300"
          style={{
            textShadow: "0 0 5px rgba(0,255,0,0.5)"
          }}
        >
          INITIALIZE SYSTEM
        </button>
      </div>

      <style>
        {`
          @keyframes colorPulse {
            from { opacity: 0.6; }
            to { opacity: 0.8; }
          }

          .matrix-text {
            animation: textFlicker 0.1s infinite;
          }

          @keyframes textFlicker {
            0% { opacity: 0.95; }
            50% { opacity: 1; }
            100% { opacity: 0.95; }
          }

          .rainbow-text {
            background: linear-gradient(
              to right,
              #F97316,
              #D946EF,
              #8B5CF6,
              #0EA5E9,
              #33C3F0,
              #F2FCE2
            );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: rainbow-move 8s linear infinite;
          }

          .crt-text {
            text-shadow: 
              0.1px 0 1px rgba(0,255,0,0.7),
              -0.1px 0 1px rgba(255,0,0,0.7),
              0 0 3px rgba(255,255,255,0.3);
            animation: textDistort 0.05s infinite;
          }

          @keyframes rainbow-move {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          @keyframes textDistort {
            0% { transform: skew(0deg); }
            25% { transform: skew(-0.5deg); }
            75% { transform: skew(0.5deg); }
            100% { transform: skew(0deg); }
          }

          @keyframes textShadowPulse {
            0% { text-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3); }
            50% { text-shadow: 0 0 4px rgba(255,255,255,0.3), 0 0 5px rgba(255,255,255,0.2); }
            100% { text-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3); }
          }

          /* Effet de scanlines */
          .crt-text::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              0deg,
              rgba(0,0,0,0.1),
              rgba(0,0,0,0.1) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
          }
        `}
      </style>
    </div>
  );
};

export default SplashScreen;
```


## src/components/StatusBar.tsx

```tsx
import { Bug, Settings, RefreshCw } from 'lucide-react';
import { Toggle } from './ui/toggle';
import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useNavigate } from 'react-router-dom';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface StatusBarProps {
  isOnRoad: boolean;
  speed: number;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
  position: [number, number];
}

const StatusBar = ({ isOnRoad, speed, isDebugMode, onDebugModeChange, position }: StatusBarProps) => {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<{
    distance: number;
    angle: number;
    position: [number, number];
    optimalSpeed?: number;
  } | null>(null);
  const [roadType, setRoadType] = useState<string>('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const observer = (newPrediction: typeof prediction) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);
    return () => {
      roadPredictor.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    const handleRoadInfo = (info: { roadType: string }) => {
      setRoadType(info.roadType);
    };

    roadInfoManager.addObserver(handleRoadInfo);
    return () => {
      roadInfoManager.removeObserver(handleRoadInfo);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await roadInfoManager.forceUpdate(position);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getRoadTypeColor = () => {
    switch (roadType) {
      case 'highway':
        return 'bg-blue-500/20 text-blue-500';
      case 'speed_road':
        return 'bg-blue-500/20 text-blue-500';
      case 'city':
        return 'bg-blue-500/20 text-blue-500';
      case 'road':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  const isIdle = speed === 0;

  return (
    <div className="h-12 bg-gray-900 flex items-center justify-between">
      {/* Left side - Status information */}
      <div className="text-white text-sm flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-sm font-medium ${isOnRoad ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {isOnRoad ? 'ON ROAD' : 'OFF ROAD'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${isIdle ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {isIdle ? 'IDLE' : 'MOVING'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${getRoadTypeColor()}`}>
            {roadType.replace('_', ' ').toUpperCase()}
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-gray-800 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Right side - Debug toggle and Settings */}
      <div className="flex items-center gap-2">
        {onDebugModeChange && (
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="bg-gray-800 hover:bg-gray-700 text-white data-[state=on]:bg-green-600 data-[state=on]:text-white h-8"
          >
            <Bug className="h-4 w-4" />
          </Toggle>
        )}
        <Toggle
          onPressedChange={() => navigate('/settings')}
          className="bg-gray-800 hover:bg-gray-700 text-white h-8"
        >
          <Settings className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};

export default StatusBar;
```


## src/components/TurnWarning.tsx

```tsx
import { getTurnType } from '../utils/turnUtils';

interface TurnWarningProps {
  distance: number;
  angle: number | null;
}

const TurnWarning = ({ distance, angle }: TurnWarningProps) => {
  // Si l'angle est null, c'est une ligne droite
  if (angle === null) {
    return (
      <div className="text-lg text-green-500">
        belle ligne droite devant
      </div>
    );
  }

  const turnDirection = angle < 0 ? "droite" : "gauche";
  const { type: turnType, color: turnColor } = getTurnType(angle);

  return (
    <div className={`text-lg ${turnColor}`}>
      <span>virage {turnType} à {turnDirection} dans <span className="text-xl font-bold">{Math.round(distance)}</span> m</span>
    </div>
  );
};

export default TurnWarning;
```


## src/hooks/use-mobile.tsx

```tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```


## src/hooks/use-toast.ts

```ts
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
```


## src/hooks/useAddressSearch.ts

```ts
import { useState, useRef } from 'react';
import debounce from 'lodash/debounce';
import { toast } from '../components/ui/use-toast';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const useAddressSearch = (onLocationSelect: (location: [number, number], address: string) => void) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const currentRequest = useRef<AbortController | null>(null);
  const pendingQuery = useRef<string | null>(null);

  const searchAddress = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    // Si une requête est en cours, on la stocke pour plus tard
    if (isSearching) {
      pendingQuery.current = searchQuery;
      return;
    }

    try {
      // Annuler toute requête précédente
      if (currentRequest.current) {
        currentRequest.current.abort();
      }

      // Créer un nouveau controller pour cette requête
      currentRequest.current = new AbortController();
      setIsSearching(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
          signal: currentRequest.current.signal
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);

      // Vérifier s'il y a une requête en attente
      if (pendingQuery.current && pendingQuery.current !== searchQuery) {
        const nextQuery = pendingQuery.current;
        pendingQuery.current = null;
        searchAddress(nextQuery);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error('Search error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher l'adresse. Veuillez réessayer.",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setIsSearching(false);
      currentRequest.current = null;
    }
  };

  // Augmenter le délai à 1000ms (1 seconde)
  const debouncedSearch = debounce(searchAddress, 1000);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleResultClick = (result: SearchResult) => {
    onLocationSelect([parseFloat(result.lat), parseFloat(result.lon)], result.display_name);
    setQuery(result.display_name);
    setResults([]);
  };

  const handleSearchClick = () => {
    if (query.length >= 3) {
      searchAddress(query);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  return {
    query,
    results,
    isSearching,
    handleInputChange,
    handleResultClick,
    handleSearchClick,
    handleKeyPress,
  };
};
```


## src/hooks/useRouting.ts

```ts
import { useState } from 'react';
import { getRoute } from '../utils/routingUtils';
import { toast } from '../components/ui/use-toast';

export const useRouting = () => {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const calculateRoute = async (start: [number, number], end: [number, number]) => {
    try {
      console.log('Calculating route from', start, 'to', end);
      const route = await getRoute(start, end);
      console.log('Route calculated with', route.length, 'points:', route);
      
      if (route.length < 2) {
        toast({
          title: "Erreur",
          description: "L'itinéraire calculé est invalide",
          variant: "destructive"
        });
        return [];
      }

      setRoutePoints(route);
      toast({
        title: "Itinéraire calculé (Old)",
        description: "L'itinéraire a été calculé avec succès",
      });
      return route;
    } catch (error) {
      console.error('Error calculating route:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer l'itinéraire",
        variant: "destructive"
      });
      return [];
    }
  };

  return {
    routePoints,
    calculateRoute
  };
};
```


## src/hooks/useSimulation.ts

```ts
import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/mapUtils';

export const useSimulation = (
  routePoints: [number, number][],
  isDebugMode: boolean,
  onPositionChange: (position: [number, number]) => void,
  onSpeedChange: (speed: number) => void
) => {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const previousPosition = useRef<[number, number] | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing simulation when debug mode changes
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }

    // Only start simulation if in debug mode and we have route points
    if (isDebugMode && routePoints.length > 1) {
      // Reset to start of route when entering debug mode
      setCurrentPointIndex(0);
      if (routePoints[0]) {
        onPositionChange(routePoints[0]);
        previousPosition.current = routePoints[0];
      }

      simulationInterval.current = setInterval(() => {
        setCurrentPointIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          
          // If we've reached the end of the route, stop simulation
          if (nextIndex >= routePoints.length) {
            if (simulationInterval.current) {
              clearInterval(simulationInterval.current);
              simulationInterval.current = null;
            }
            return prevIndex;
          }

          const nextPosition = routePoints[nextIndex];
          onPositionChange(nextPosition);

          // Calculate speed (distance in meters / time in seconds)
          if (previousPosition.current) {
            const distance = calculateDistance(previousPosition.current, nextPosition);
            const speed = distance / 10; // 10 seconds interval
            onSpeedChange(speed);
          }

          previousPosition.current = nextPosition;
          return nextIndex;
        });
      }, 10000); // 10 seconds interval
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    };
  }, [isDebugMode, routePoints, onPositionChange, onSpeedChange]);

  const resetSimulation = () => {
    setCurrentPointIndex(0);
    previousPosition.current = null;
    if (routePoints.length > 0) {
      onPositionChange(routePoints[0]);
      onSpeedChange(0);
    }
  };

  return { resetSimulation };
};
```


## src/hooks/useSimulationControl.ts

```ts
import { useEffect } from 'react';
import { Vehicle } from '../models/Vehicle';
import { createSimulationService } from '../services/simulation/SimulationService';

export const useSimulationControl = (
  vehicle: Vehicle,
  isDebugMode: boolean,
  routePoints: [number, number][]
) => {
  useEffect(() => {
    if (isDebugMode && routePoints.length > 1) {
      console.log('Starting simulation with route points:', routePoints);
      const simulationService = createSimulationService(vehicle);
      simulationService.startSimulation(routePoints);

      return () => {
        simulationService.stopSimulation();
      };
    }
  }, [isDebugMode, routePoints, vehicle]);
};
```


## src/hooks/useSpeedInfo.ts

```ts
import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { RoadPrediction } from '../services/prediction/PredictionTypes';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface SpeedInfo {
  displaySpeed: number;
  speedLimit: number | null;
  optimalSpeed: number | null;
  prediction: RoadPrediction | null;
}

export const useSpeedInfo = (currentSpeed: number, isOnRoad?: boolean): SpeedInfo => {
  const [speedInfo, setSpeedInfo] = useState<SpeedInfo>({
    displaySpeed: currentSpeed,
    speedLimit: null,
    optimalSpeed: null,
    prediction: null
  });

  // Observer pour les prédictions
  useEffect(() => {
    console.log('[useSpeedInfo] Setting up prediction observer');
    const predictionObserver = (prediction: RoadPrediction | null) => {
      console.log('[useSpeedInfo] Received prediction update:', prediction);
      if (prediction) {
        setSpeedInfo(prev => ({
          ...prev,
          optimalSpeed: prediction.optimalSpeed ? Math.round(prediction.optimalSpeed) : null,
          prediction
        }));
      }
    };

    roadPredictor.addObserver(predictionObserver);
    return () => {
      console.log('[useSpeedInfo] Cleaning up prediction observer');
      roadPredictor.removeObserver(predictionObserver);
    };
  }, []);

  // Observer pour les informations routières
  useEffect(() => {
    console.log('[useSpeedInfo] Setting up road info observer');
    const roadInfoObserver = (roadInfo: { speedLimit: number | null }) => {
      console.log('[useSpeedInfo] Received road info update:', roadInfo);
      setSpeedInfo(prev => ({
        ...prev,
        speedLimit: roadInfo.speedLimit
      }));
    };

    roadInfoManager.addObserver(roadInfoObserver);
    return () => {
      console.log('[useSpeedInfo] Cleaning up road info observer');
      roadInfoManager.removeObserver(roadInfoObserver);
    };
  }, []);

  useEffect(() => {
    console.log('[useSpeedInfo] Speed updated:', currentSpeed);
    setSpeedInfo(prev => ({
      ...prev,
      displaySpeed: currentSpeed
    }));
  }, [currentSpeed]);

  return speedInfo;
};
```


## src/hooks/useVehicle.ts

```ts
import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { LocationService } from '../services/location/LocationService';

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const globalVehicle = new Vehicle(PARIS_CENTER);
(window as any).globalVehicle = globalVehicle;

export const useVehicle = (
  isDebugMode: boolean,
  routePoints: [number, number][],
  initialPosition: [number, number]
) => {
  const [vehicle] = useState<Vehicle>(() => globalVehicle);
  const locationService = useRef<LocationService>(LocationService.getInstance(vehicle));

  useEffect(() => {
    // Mettre à jour le mode en fonction de isDebugMode
    locationService.current.setMode(isDebugMode ? 'simulation' : 'gps');
    
    // Démarrer les mises à jour avec les points de route si nécessaire
    locationService.current.startUpdates(routePoints);

    return () => {
      locationService.current.stopUpdates();
    };
  }, [isDebugMode, routePoints]);

  return vehicle;
};
```


## src/hooks/useVehicleState.ts

```ts
import { useState, useCallback, useEffect } from 'react';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';

interface VehicleState {
  position: [number, number];
  speed: number;
  history: [number, number][];
  isOnRoad: boolean;
}

export const useVehicleState = (
  initialPosition: [number, number],
  initialSpeed: number,
  initialHistory: [number, number][],
  onRoadStatusChange: (status: boolean) => void
) => {
  const [state, setState] = useState<VehicleState>({
    position: initialPosition,
    speed: initialSpeed,
    history: initialHistory,
    isOnRoad: true
  });

  const handleVehicleUpdate = useCallback((newPosition: [number, number], newSpeed: number) => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      setState(prev => ({
        ...prev,
        position: newPosition,
        speed: newSpeed,
        history: vehicle.positionHistory
      }));
    }
  }, []);

  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      vehicle.addObserver(handleVehicleUpdate);
      setState(prev => ({ 
        ...prev, 
        history: vehicle.positionHistory,
        position: vehicle.position,
        speed: vehicle.speed
      }));
      
      return () => {
        vehicle.removeObserver(handleVehicleUpdate);
      };
    }
  }, [handleVehicleUpdate]);

  // S'abonner aux mises à jour des informations routières
  useEffect(() => {
    const observer = (roadInfo: { isOnRoad: boolean }) => {
      setState(prev => ({ ...prev, isOnRoad: roadInfo.isOnRoad }));
      onRoadStatusChange(roadInfo.isOnRoad);
    };

    roadInfoManager.addObserver(observer);
    return () => roadInfoManager.removeObserver(observer);
  }, [onRoadStatusChange]);

  return {
    ...state,
    handleRoadStatusChange: (status: boolean) => {
      setState(prev => ({ ...prev, isOnRoad: status }));
      onRoadStatusChange(status);
    }
  };
};
```


## src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```


## src/models/DriveViewModel.ts

```ts
import { EnhancedRoutePoint } from "../services/route/RoutePlannerTypes";

export interface DriveViewState {
  routeSegment: [number, number][];
  currentIndex: number;
  bearing: number;
}

export class DriveViewModel {
  private state: DriveViewState = {
    routeSegment: [],
    currentIndex: 0,
    bearing: 0
  };

  // Conversion des coordonnées GPS en coordonnées cartésiennes locales
  private toLocalCoordinates(point: [number, number], origin: [number, number], cosLat: number): [number, number] {
    const scale = 111000; // mètres par degré
    
    return [
      (point[1] - origin[1]) * scale * cosLat,
      (point[0] - origin[0]) * scale
    ];
  }

  public getState(): DriveViewState {
    return { ...this.state };
  }

  public updateFromPosition(position: [number, number], enhancedPoints: EnhancedRoutePoint[]) {
    if (enhancedPoints.length < 2) return;
    const cosLat = Math.cos((position[0] * Math.PI) / 180);
    
    // Trouver le point de route le plus proche
    let minDist = Infinity;
    let closestIdx = 0;
    console.log(enhancedPoints);
    enhancedPoints.forEach((point, idx) => {
      const localPoint = this.toLocalCoordinates(point.position, position, cosLat);
      const dist = Math.sqrt(localPoint[0] * localPoint[0] + localPoint[1] * localPoint[1]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    // Extraire le segment de route à afficher
    const segment: [number, number][] = [];
    const startIdx = Math.max(0, closestIdx - 10);
    const endIdx = Math.min(enhancedPoints.length, closestIdx + 50);
    
    let currentIndex = 0;
    for (let i = startIdx; i < endIdx; i++) {
      segment.push(this.toLocalCoordinates(enhancedPoints[i].position, position, cosLat));
      if (i <= closestIdx) {
        currentIndex++;
      }
    }

    this.state.routeSegment = segment;
    this.state.currentIndex = currentIndex;
    
    // Calculer le bearing
    if (segment.length >= 2 && currentIndex+1< segment.length-1) {
      const currentPoint = segment[currentIndex];
      const nextPoint = segment[currentIndex + 1];
      this.state.bearing = Math.atan2(nextPoint[0] - currentPoint[0], nextPoint[1] - currentPoint[1]) * 180 / Math.PI;
    }
  }
}
```


## src/models/Snake.ts

```ts
type TimestampedPosition = {
  position: [number, number];
  timestamp: number;
};

export class Snake {
  private _positions: Array<TimestampedPosition> = [];
  private readonly maxLength: number;
  private readonly maxAge: number = 60000; // 60 secondes en millisecondes

  constructor(initialPosition: [number, number], maxLength: number = 60) {
    this._positions = initialPosition ? [{
      position: [...initialPosition],
      timestamp: Date.now()
    }] : [];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): Array<[number, number]> {
    this.cleanOldPositions();
    return this._positions.map(tp => [...tp.position]);
  }

  private cleanOldPositions() {
    const now = Date.now();
    this._positions = this._positions.filter(tp => {
      return (now - tp.timestamp) <= this.maxAge;
    });
  }

  addPosition(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid position format:', position);
      return;
    }

    // Ne pas ajouter si la position est identique à la dernière
    if (this._positions.length > 0) {
      const lastPos = this._positions[0].position;
      if (lastPos[0] === position[0] && lastPos[1] === position[1]) {
        return;
      }
    }

    this._positions.unshift({
      position: [...position],
      timestamp: Date.now()
    });
    
    this.cleanOldPositions();
    
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }

    console.log('Snake positions updated:', this._positions.map(tp => tp.position));
  }

  reset(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid reset position:', position);
      return;
    }
    this._positions = [{
      position: [...position],
      timestamp: Date.now()
    }];
    console.log('Snake reset to position:', position);
  }

  private isValidPosition(position: any): position is [number, number] {
    return Array.isArray(position) && 
           position.length === 2 && 
           typeof position[0] === 'number' && 
           typeof position[1] === 'number' &&
           !isNaN(position[0]) && 
           !isNaN(position[1]);
  }
}
```


## src/models/Vehicle.ts

```ts
import { Snake } from './Snake';
import { calculateBearing } from '../utils/mapUtils';

type VehicleObserver = (position: [number, number], speed: number, acceleration: number) => void;

export class Vehicle {
  private _position: [number, number];
  private _speed: number;
  private _acceleration: number;
  private _snake: Snake;
  private _observers: VehicleObserver[] = [];
  private _heading: number = 0;

  constructor(initialPosition: [number, number]) {
    this._position = initialPosition;
    this._speed = 0;
    this._acceleration = 0;
    this._snake = new Snake(initialPosition);
    console.log('[Vehicle] Initialized:', this.getDebugState());
  }

  get position(): [number, number] {
    return this._position;
  }

  get speed(): number {
    return this._speed;
  }

  get acceleration(): number {
    return this._acceleration;
  }

  get heading(): number {
    return this._heading;
  }

  get positionHistory(): [number, number][] {
    return this._snake.positions;
  }

  private getDebugState() {
    return {
      position: this._position,
      speed: this._speed,
      speedKmh: this._speed * 3.6,
      acceleration: this._acceleration,
      heading: this._heading,
      historyLength: this._snake.positions.length,
      observersCount: this._observers.length
    };
  }

  addObserver(observer: VehicleObserver) {
    this._observers.push(observer);
    console.log('[Vehicle] Observer added:', this.getDebugState());
  }

  removeObserver(observer: VehicleObserver) {
    this._observers = this._observers.filter(obs => obs !== observer);
    console.log('[Vehicle] Observer removed:', this.getDebugState());
  }

  private notifyObservers() {
    console.log('[Vehicle] Notifying observers:', this.getDebugState());
    this._observers.forEach(observer => {
      observer(this._position, this._speed, this._acceleration);
    });
  }

  private updateHeading() {
    const positions = this._snake.positions;
    if (positions.length >= 2) {
      const lastPos = positions[0];
      const prevPos = positions[1];
      this._heading = calculateBearing(prevPos, lastPos);
      console.log('[Vehicle] Heading updated:', this.getDebugState());
    }
  }

  update(newPosition: [number, number], newSpeed: number, acceleration: number = 0) {
    console.log('[Vehicle] Updating vehicle - Before:', this.getDebugState());
    console.log('[Vehicle] Update params:', { newPosition, newSpeed, acceleration });
    
    this._position = newPosition;
    this._speed = newSpeed;
    this._acceleration = acceleration;
    this._snake.addPosition(newPosition);
    this.updateHeading();
    
    console.log('[Vehicle] Vehicle updated - After:', this.getDebugState());
    
    this.notifyObservers();
  }

  reset(position: [number, number]) {
    console.log('[Vehicle] Resetting vehicle - Before:', this.getDebugState());
    
    this._position = position;
    this._speed = 0;
    this._acceleration = 0;
    this._snake.reset(position);
    this._heading = 0;
    
    console.log('[Vehicle] Vehicle reset - After:', this.getDebugState());
    
    this.notifyObservers();
  }
}
```


## src/pages/Index.tsx

```tsx
import { useState, useEffect } from 'react';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';
import LoadingScreen from '../components/LoadingScreen';
import MainLayout from '../components/MainLayout';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleState } from '../hooks/useVehicleState';
import { routePlannerService } from '../services/route/RoutePlannerService';

const Index = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);
  const [destination, setDestination] = useState<{ address: string; location: [number, number] } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  
  // Position initiale par défaut (Paris)
  const defaultPosition: [number, number] = [48.8566, 2.3522];
  const vehicle = useVehicle(isDebugMode, routePoints, defaultPosition);

  const { speed, position, history, handleRoadStatusChange } = useVehicleState(
    defaultPosition,
    0,
    [],
    setIsOnRoad
  );

  // Observer pour les mises à jour de la route
  useEffect(() => {
    const observer = (state: { routePoints: [number, number][] }) => {
      setRoutePoints(state.routePoints);
    };

    routePlannerService.addObserver(observer);
    return () => routePlannerService.removeObserver(observer);
  }, []);

  // Calcul d'itinéraire uniquement lors d'un changement de destination
  useEffect(() => {
    if (destination) {
      console.log('[Index] Starting route calculation:', {
        from: position,
        to: destination.location
      });
      
      routePlannerService.calculateRoute(position, destination.location);
      routePlannerService.setDestination(destination.location, destination.address);
    }
  }, [destination]);

  if (!vehicle) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout
      position={position}
      speed={speed}
      recommendedSpeed={calculateRecommendedSpeed(speed)}
      isOnRoad={isOnRoad}
      destination={destination}
      routePoints={routePoints}
      onDestinationSelect={(location, address) => {
        console.log('[Index] New destination selected:', { location, address });
        setDestination({ location, address });
      }}
      onRoadStatusChange={handleRoadStatusChange}
      isDebugMode={isDebugMode}
      onDebugModeChange={setIsDebugMode}
      positionHistory={history}
    />
  );
};

export default Index;
```


## src/services/location/LocationService.ts

```ts
import { Vehicle } from '../../models/Vehicle';
import { createSimulationService } from '../simulation/SimulationService';
import { createSimulationServiceV2 } from '../simulation/SimulationServiceV2';
import { settingsService } from '../SettingsService';

type LocationMode = 'gps' | 'simulation';
type LocationObserver = (position: [number, number], speed: number, accelerationInG: number) => void;

export class LocationService {
  private static instance: LocationService | null = null;
  private mode: LocationMode = 'gps';
  private observers: LocationObserver[] = [];
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private simulationService: ReturnType<typeof createSimulationService>;
  private simulationServiceV2: ReturnType<typeof createSimulationServiceV2>;
  private vehicle: Vehicle;
  private lastSpeed: number = 0; // en m/s
  private lastSpeedUpdateTime: number = null;
  private lastAccelerationInG: number = 0; // en g

  private constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.simulationService = createSimulationService(vehicle);
    this.simulationServiceV2 = createSimulationServiceV2(vehicle);
  }

  public static getInstance(vehicle?: Vehicle): LocationService {
    if (!LocationService.instance && vehicle) {
      LocationService.instance = new LocationService(vehicle);
    }
    return LocationService.instance!;
  }

  public addObserver(observer: LocationObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: LocationObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers(position: [number, number], speed: number, accelerationInG: number) {
    console.log('[LocationService] Speed update:', { position, speed, mode: this.mode });
    this.observers.forEach(observer => observer(position, speed, accelerationInG));
  }

  private calculateAccelerationInG(currentSpeed: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastSpeedUpdateTime) / 1000; // Convert to seconds
    
    // Si le delta temps est trop petit, on évite de calculer pour éviter les erreurs
    if (deltaTime < 0.1) {
      return 0;
    }

    // Calcul de l'accélération en m/s²
    const acceleration = (currentSpeed - this.lastSpeed) / deltaTime;
    
    // Conversion en g (1g = 9.81 m/s²)
    const accelerationInG = (this.lastAccelerationInG + acceleration / 9.81) / 2; // Moyenne des deux dernières valeurs pour lisser les données

    console.log('[LocationService] Acceleration calculated:', {
      currentSpeed,
      lastSpeed: this.lastSpeed,
      deltaTime,
      accelerationInG
    });

    // Mise à jour des valeurs pour le prochain calcul
    this.lastSpeed = currentSpeed;
    this.lastSpeedUpdateTime = currentTime;
    this.lastAccelerationInG = accelerationInG;

    return accelerationInG;
  }

  public setMode(mode: LocationMode) {
    if (this.mode === mode) return;
    
    console.log('[LocationService] Switching location mode to:', mode);
    this.stopUpdates();
    this.mode = mode;
    this.startUpdates();
  }

  public startUpdates(routePoints?: [number, number][]) {
    if (this.mode === 'gps') {
      this.startGPSUpdates();
    } else {
      this.startSimulationUpdates(routePoints);
    }
  }

  public stopUpdates() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.simulationService.stopSimulation();
    this.simulationServiceV2.stopSimulation();
  }

  private startSimulationUpdates(routePoints?: [number, number][]) {
    if (!routePoints || routePoints.length < 2) {
      console.error('[LocationService] Cannot start simulation without route points');
      return;
    }

    const settings = settingsService.getSettings();
    if (settings.simulatorVersion === 'v2') {
      this.simulationServiceV2.startSimulation(routePoints);
    } else {
      this.simulationService.startSimulation(routePoints);
    }
  }

  private startGPSUpdates() {
    if (!('geolocation' in navigator)) {
      console.error('[LocationService] Geolocation is not supported');
      return;
    }

    const handlePosition = (pos: GeolocationPosition) => {
      const position: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      const speed = pos.coords.speed || 0;
      const accelerationInG = this.calculateAccelerationInG(speed);
      console.log('[LocationService] GPS update:', { position, speed, accelerationInG });
      this.vehicle.update(position, speed, accelerationInG);
      this.notifyObservers(position, speed, accelerationInG);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('[LocationService] GPS Error:', error.message);
    };

    this.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  }
}
```


## src/services/prediction/managers/PredictionStateManager.ts

```ts
import { RoadPrediction, TurnPrediction } from '../PredictionTypes';
import { TurnPredictionManager } from '../TurnPredictionManager';
import { DecelerationCalculator } from '../DecelerationCalculator';
import { RouteTracker } from '../../RouteTracker';
import { Settings } from '../../SettingsService';
import { EnhancedRoutePoint } from '../../route/RoutePlannerTypes';

export class PredictionStateManager {
  private currentPrediction: RoadPrediction | null = null;
  private turnPredictionManager: TurnPredictionManager;
  private decelerationCalculator: DecelerationCalculator;
  private routeTracker: RouteTracker;

  constructor() {
    this.turnPredictionManager = new TurnPredictionManager();
    this.decelerationCalculator = new DecelerationCalculator();
    this.routeTracker = new RouteTracker();
  }

  async updatePredictions(
    currentPosition: [number, number],
    currentSpeed: number,
    routePoints: [number, number][],
    enhancedPoints: EnhancedRoutePoint[],
    settings: Settings,
    speedLimit: number | null
  ): Promise<void> {

    if (!enhancedPoints || enhancedPoints.length < 2) {
      this.currentPrediction = null;
      return;
    }

    // Trouver l'index actuel sur la route
    const { index: currentIndex, distance: deviationDistance } = 
      this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    // Vérifier si on est trop loin de la route
    if (this.routeTracker.isOffRoute(deviationDistance, settings)) {
      this.currentPrediction = null;
      return;
    }

    // Mettre à jour les virages existants
    this.turnPredictionManager.removePastTurns(currentIndex);
    this.turnPredictionManager.updateTurnDistances(currentPosition, currentIndex, routePoints);

    // Chercher de nouveaux virages si nécessaire
    const turns = this.turnPredictionManager.getTurns();
    const lastTurnIndex = turns.length > 0 
      ? Math.max(...turns.map(t => t.curveInfo.endIndex))
      : currentIndex;

    if (turns.length <10) {
      await this.turnPredictionManager.findNewTurns(
        enhancedPoints,
        lastTurnIndex,
        currentPosition,
        settings,
        currentSpeed,
        speedLimit
      );
    }

    this.turnPredictionManager.sortTurns();
    console.log('Turns ahead:', this.turnPredictionManager.getTurns().length);
    this.updateCurrentPrediction(currentSpeed);
  }

  private updateCurrentPrediction(currentSpeed: number): void {
    const nextTurn = this.turnPredictionManager.getNextTurn();
    
    if (!nextTurn) {
      // Créer une prédiction "ligne droite"
      this.currentPrediction = this.createStraightLinePrediction();
      return;
    }

    const requiredDeceleration = this.calculateDeceleration(currentSpeed, nextTurn);
    this.currentPrediction = { ...nextTurn, requiredDeceleration };
  }

  private calculateDeceleration(currentSpeed: number, turn: TurnPrediction): number | null {
    if (currentSpeed <= (turn.optimalSpeed || 0)) {
      return null;
    }
    return this.decelerationCalculator.calculateRequiredDeceleration(
      currentSpeed,
      turn.optimalSpeed || 0,
      turn.distance
    );
  }

  private createStraightLinePrediction(): RoadPrediction {
    return {
      distance: 1000,
      angle: null,
      position: [0, 0], // Sera mis à jour par le service
      index: 0,
      speedLimit: null,
      optimalSpeed: 130,
      requiredDeceleration: null,
      curveInfo: null
    };
  }

  getCurrentPrediction(): RoadPrediction | null {
    return this.currentPrediction;
  }

  getTurns(): TurnPrediction[] {
    return this.turnPredictionManager.getTurns();
  }

  reset(): void {
    this.turnPredictionManager = new TurnPredictionManager();
    this.currentPrediction = null;
  }
}
```


## src/services/prediction/managers/RouteDeviationManager.ts

```ts
import { Settings } from '../../SettingsService';
import { RouteTracker } from '../../RouteTracker';
import { calculateDistanceToSegment } from '../../../utils/mapUtils';
import { routePlannerService } from '../../route/RoutePlannerService';

export class RouteDeviationManager {
  private lastRecalculationTime: number = 0;
  private static RECALCULATION_COOLDOWN = 10000; // 10 secondes minimum entre les recalculs
  private static MINIMUM_SPEED_FOR_RECALCULATION = 5; // 5 m/s minimum (18 km/h)
  private routeTracker: RouteTracker;

  constructor(routeTracker: RouteTracker) {
    this.routeTracker = routeTracker;
  }

  shouldRecalculateRoute(
    currentPosition: [number, number],
    routePoints: [number, number][],
    destination: [number, number] | null,
    settings: Settings,
    isOnRoad: boolean,
    currentSpeed: number
  ): boolean {
    const routeState = routePlannerService.getState();
    
    // Vérifier si on a une destination active
    if (!routeState.destination || !isOnRoad) {
      console.log('[RouteDeviationManager] No active destination or not on road');
      return false;
    }

    // Vérifier si la vitesse est suffisante
    if (currentSpeed < RouteDeviationManager.MINIMUM_SPEED_FOR_RECALCULATION) {
      console.log('[RouteDeviationManager] Speed too low for recalculation:', currentSpeed);
      return false;
    }

    // Vérifier si assez de temps s'est écoulé depuis le dernier recalcul
    const cooldownElapsed = Date.now() - this.lastRecalculationTime > RouteDeviationManager.RECALCULATION_COOLDOWN;
    if (!cooldownElapsed) {
      console.log('[RouteDeviationManager] Cooldown not elapsed');
      return false;
    }

    // Trouver le point le plus proche sur la route
    const { index } = this.routeTracker.findClosestPointOnRoute(currentPosition, routePoints);

    // Calculer la distance minimale aux segments adjacents
    let minDistance = Infinity;

    // Vérifier le segment précédent si il existe
    if (index > 0) {
      const distToPrevSegment = calculateDistanceToSegment(
        currentPosition,
        routePoints[index - 1],
        routePoints[index]
      );
      minDistance = Math.min(minDistance, distToPrevSegment);
    }

    // Vérifier le segment suivant si il existe
    if (index < routePoints.length - 1) {
      const distToNextSegment = calculateDistanceToSegment(
        currentPosition,
        routePoints[index],
        routePoints[index + 1]
      );
      minDistance = Math.min(minDistance, distToNextSegment);
    }

    const shouldRecalculate = minDistance > settings.maxRouteDeviation;

    console.log('[RouteDeviationManager] Deviation check:', {
      minDistance,
      maxDeviation: settings.maxRouteDeviation,
      shouldRecalculate,
      currentSpeed,
      position: currentPosition
    });

    return shouldRecalculate;
  }

  markRecalculationTime() {
    this.lastRecalculationTime = Date.now();
  }

  reset() {
    this.lastRecalculationTime = 0;
  }
}
```


## src/services/prediction/CurveAnalyzer.ts

```ts
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
```


## src/services/prediction/CurveAnalyzerUtils.ts

```ts
import { calculateAngleDifference, calculateBearing, calculateDistance } from '../../utils/mapUtils';

interface Point {
  lat: number;
  lon: number;
}

export function smoothPath(routePoints: [number, number][], smoothingWindow: number, maxDistance: number): Point[] {
  const smoothedPath: Point[] = [];
  
  if (routePoints.length < 2) {
    return smoothedPath;
  }

  let totalDistance = 0;
  let startPoint = null;

  // Conversion initiale en Points
  for(let i = 0; i < routePoints.length; i++) {
    smoothedPath.push({
      lat: routePoints[i][0],
      lon: routePoints[i][1]
    });
    if(startPoint === null) {
      startPoint = routePoints[i];
    } else {
      totalDistance += calculateDistance(startPoint, routePoints[i]);
      startPoint = routePoints[i];
    }
    if (totalDistance > maxDistance) {
      break;
    }
  }
  
  // Application de la moyenne mobile
  const smoothedPathWithAverage: Point[] = [];
  for (let i = 0; i < smoothedPath.length; i++) {
    let sumLat = 0;
    let sumLon = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(smoothedPath.length - 1, i + smoothingWindow); j++) {
      sumLat += smoothedPath[j].lat;
      sumLon += smoothedPath[j].lon;
      count++;
    }
    
    smoothedPathWithAverage.push({
      lat: sumLat / count,
      lon: sumLon / count
    });
  }
  
  return smoothedPathWithAverage;
}

export function calculateCurveRadius(smoothedPath: Point[], apexIndex: number): number {
  if (smoothedPath.length < 3 || apexIndex < 1 || apexIndex >= smoothedPath.length - 1) {
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

export function calculateCurveLength(smoothedPath: Point[], start: number, end: number): number {
  let totalDistance = 0;
  for(let i = start; i < end; i++) {
    const currentPoint = smoothedPath[i];
    const nextPoint = smoothedPath[i+1];
    totalDistance += calculateDistance(
      [currentPoint.lat, currentPoint.lon],
      [nextPoint.lat, nextPoint.lon]
    );
  }
  return totalDistance;
} 

export function  calculateAngleBetweenPoints(
    prevPoint: Point,
    currentPoint: Point,
    nextPoint: Point
): { bearing1: number; bearing2: number; angleDiff: number } {
    const bearing1 = calculateBearing(
        [prevPoint.lat, prevPoint.lon],
        [currentPoint.lat, currentPoint.lon]
    );
    
    const bearing2 = calculateBearing(
        [currentPoint.lat, currentPoint.lon],
        [nextPoint.lat, nextPoint.lon]
    );
    
    return {
        bearing1,
        bearing2,
        angleDiff: calculateAngleDifference(bearing1, bearing2)
    };
}
```


## src/services/prediction/CurveAssistant.ts

```ts
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
```


## src/services/prediction/DecelerationCalculator.ts

```ts
export class DecelerationCalculator {
  calculateRequiredDeceleration(
    currentSpeed: number,
    targetSpeed: number,
    distance: number
  ): number | null {
    if (currentSpeed <= targetSpeed) return null;

    const vx = currentSpeed / 3.6;
    const v0 = targetSpeed / 3.6;
    return (v0 * v0 - vx * vx) / (2 * distance * 9.81);
  }
}
```


## src/services/prediction/PredictionTypes.ts

```ts
import { CurveAnalysisResult } from "./CurveAnalyzer";

export interface TurnPrediction {
  distance: number;  // Distance jusqu'au prochain virage en mètres
  angle: number;     // Angle du virage en degrés
  position: [number, number]; // Position du virage
  index: number; // Index du point dans la route
  speedLimit?: number; // Vitesse limite en km/h
  optimalSpeed?: number; // Vitesse optimale en km/h
  requiredDeceleration?: number | null; // Décélération requise en g
  curveInfo: CurveAnalysisResult; // détail du virage
}

export type RoadPrediction = TurnPrediction;

export type PredictionObserver = (prediction: RoadPrediction | null, allTurns: TurnPrediction[]) => void;
```


## src/services/prediction/RoadPredictor.ts

```ts
import { settingsService } from '../SettingsService';
import { TurnPrediction, RoadPrediction, PredictionObserver } from './PredictionTypes';
import { RouteTracker } from '../RouteTracker';
import { roadInfoManager } from '../roadInfo/RoadInfoManager';
import { RouteDeviationManager } from './managers/RouteDeviationManager';
import { PredictionStateManager } from './managers/PredictionStateManager';
import { routePlannerService } from '../route/RoutePlannerService';

type StateObserver = (isActive: boolean) => void;

class RoadPredictor {
  private observers: PredictionObserver[] = [];
  private stateObservers: StateObserver[] = [];
  private routeTracker: RouteTracker;
  private updateInterval: NodeJS.Timeout | null = null;
  private deviationManager: RouteDeviationManager;
  private predictionManager: PredictionStateManager;
  private currentPosition: [number, number] | null = null;
  private _active: boolean = false;

  constructor() {
    this.routeTracker = new RouteTracker();
    this.deviationManager = new RouteDeviationManager(this.routeTracker);
    this.predictionManager = new PredictionStateManager();

    roadInfoManager.addObserver((roadInfo) => {
      const currentPrediction = this.predictionManager.getCurrentPrediction();
      if (currentPrediction) {
        currentPrediction.speedLimit = roadInfo.speedLimit;
      }
    });

    routePlannerService.addObserver((state) => {
      if (state.routePoints.length > 1) {
        this.startUpdates();
      } else {
        this.stopUpdates();
      }
    });
  }

  public getCurrentPrediction(): RoadPrediction | null {
    return this.predictionManager.getCurrentPrediction();
  }

  public addObserver(observer: PredictionObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: PredictionObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  public addStateObserver(observer: StateObserver) {
    this.stateObservers.push(observer);
    // Notify the new observer of the current state immediately
    observer(this._active);
  }

  public removeStateObserver(observer: StateObserver) {
    this.stateObservers = this.stateObservers.filter(obs => obs !== observer);
  }

  private notifyStateObservers() {
    console.log('Notifying state observers, active:', this._active);
    this.stateObservers.forEach(observer => observer(this._active));
  }

  private notifyObservers() {
    const currentPrediction = this.predictionManager.getCurrentPrediction();
    const turns = this.predictionManager.getTurns();
    console.log('Notifying observers with prediction:', { currentPrediction, turns });
    this.observers.forEach(observer => observer(currentPrediction, turns));
  }

  public getIsActive(): boolean {
    return this._active;
  }

  private async updatePrediction() {
    const vehicle = (window as any).globalVehicle;
    const routeState = routePlannerService.getState();
    const settings = settingsService.getSettings();
    
    if (!vehicle || !this.currentPosition || routeState.routePoints.length < 2) {
      console.log('Skipping prediction update - missing data:', {
        hasVehicle: !!vehicle,
        hasPosition: !!this.currentPosition,
        routePointsLength: routeState.routePoints.length,
        currentPosition: this.currentPosition
      });
      this.notifyObservers();
      return;
    }

    const currentSpeed = vehicle.speed * 3.6;
    const roadInfo = roadInfoManager.getCurrentInfo();
    const speedLimit = roadInfo?.speedLimit ?? null;
    const isOnRoad = roadInfo?.isOnRoad ?? false;

    if (settings.enableAutoRecalculate && this.deviationManager.shouldRecalculateRoute(
      this.currentPosition,
      routeState.routePoints,
      routeState.destination?.location,
      settings,
      isOnRoad,
      currentSpeed
    )) {
      console.log('Vehicle is off route, recalculating...', {
        currentPosition: this.currentPosition,
        destination: routeState.destination?.location,
        isOnRoad,
        currentSpeed,
        autoRecalculateEnabled: settings.enableAutoRecalculate
      });
      
      await routePlannerService.recalculateRoute();
      this.deviationManager.markRecalculationTime();
      return;
    }

    await roadInfoManager.updateRoadInfo(this.currentPosition);
    await this.predictionManager.updatePredictions(
      this.currentPosition,
      currentSpeed,
      routeState.routePoints,
      routeState.enhancedPoints,
      settings,
      speedLimit
    );

    this.notifyObservers();
  }

  public startUpdates() {
    console.log('Starting road predictor updates');
    
    this.predictionManager.reset();
    this.deviationManager.reset();
    this._active = true;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Force an immediate first update
    this.updatePrediction();

    this.updateInterval = setInterval(() => {
      this.updatePrediction();
    }, 1000);

    this.notifyStateObservers();
  }

  public stopUpdates() {
    console.log('Stopping road predictor updates');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentPosition = null;
    this._active = false;
    this.predictionManager.reset();
    this.notifyObservers();
    this.notifyStateObservers();
  }

  public updatePosition(position: [number, number]) {
    console.log('Updating position in RoadPredictor:', position);
    this.currentPosition = position;
    if (this._active) {
      this.updatePrediction();
    }
  }
}

export const roadPredictor = new RoadPredictor();
```


## src/services/prediction/SpeedCalculator.ts

```ts
import { Settings } from '../SettingsService';

export class SpeedCalculator {
  calculateOptimalSpeed(angle: number, speedLimit: number | null, settings: Settings): number {
    const baseSpeed = speedLimit || settings.defaultSpeed;
    const absAngle = Math.abs(angle);
    
    if (absAngle >= settings.maxTurnAngle) {
      return settings.minTurnSpeed;
    } else {
      const ratio = absAngle / settings.maxTurnAngle;
      return (1-ratio) * baseSpeed + ratio * settings.minTurnSpeed;
    }
  }
}
```


## src/services/prediction/TurnPredictionManager.ts

```ts
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
    for (let turn of this.turns) {
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
    this.turns = this.turns.filter(turn => turn.curveInfo.endIndex >= currentIndex);
  }

  async findNewTurns(
    enhancedPoints: EnhancedRoutePoint[],
    startIndex: number,
    currentPosition: [number, number],
    settings: Settings,
    currentSpeed: number,
    currentSpeedLimit: number | null = null
  ): Promise<void> {

    let nextIndex = startIndex;
    let distance = calculateDistance(currentPosition, enhancedPoints[nextIndex].position);
    console.log('[TurnPredictionManager] Start detecting curves from index at distance:', nextIndex, distance, settings.predictionDistance);
    while (distance <= settings.predictionDistance && this.turns.length < 10) {
      const curveAnalysis = this.curveDetector.analyzeCurve(
        enhancedPoints,
        nextIndex,
        settings
      );
      
      if (!curveAnalysis) {
        console.log('[TurnPredictionManager] No curve detected after index:', nextIndex);
        return;
      } else {
        //console.log('[TurnPredictionManager] Curve detected:', curveAnalysis);
      }

      for (let i = nextIndex+1; i <= curveAnalysis.startIndex; i++) {
        distance += calculateDistance(enhancedPoints[i-1].position, enhancedPoints[i].position);
      }
    
      const speedLimit = currentSpeedLimit || await this.speedLimitCache.getSpeedLimit(
        curveAnalysis.startPoint[0],
        curveAnalysis.startPoint[1]
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
```


## src/services/roadInfo/overpass/CityDetector.ts

```ts
export class CityDetector {
  async isInCity(lat: number, lon: number): Promise<boolean> {
    console.log('[CityDetector] Checking if location is in city:', { lat, lon });
    
    const query = `
      [out:json];
      (
        node(around:1000,${lat},${lon})["traffic_sign"="city_limit"];
        way(around:100,${lat},${lon})["landuse"="residential"];
        way(around:100,${lat},${lon})["place"~"city|town|village"];
        relation(around:100,${lat},${lon})["place"~"city|town|village"];
      );
      out body;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const isInCity = data.elements.length > 0;
      
      console.log('[CityDetector] Result:', {
        isInCity,
        elementsFound: data.elements.length,
        elements: data.elements
      });
      
      return isInCity;
    } catch (error) {
      console.error('[CityDetector] Error:', error);
      return false;
    }
  }
}
```


## src/services/roadInfo/overpass/OverpassAPI.ts

```ts
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const FALLBACK_API = 'https://overpass.kumi.systems/api/interpreter';

export class OverpassAPI {
  async queryNearbyRoads(lat: number, lon: number): Promise<any> {
    const query = `
      [out:json];
      way(around:50,${lat},${lon})["highway"];
      (._;>;);
      out body;
    `;
    
    return this.queryOverpass(query);
  }

  private async queryOverpass(query: string): Promise<any> {
    console.log('[OverpassAPI] Sending query:', query);
    
    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'DriverAssistant/1.0',
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        console.error('[OverpassAPI] HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[OverpassAPI] Response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[OverpassAPI] Query error:', error);
      
      // If it's a CORS error or network error, try the fallback endpoint
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('[OverpassAPI] Trying fallback endpoint...');
        return this.queryOverpassFallback(query);
      }
      
      throw error;
    }
  }

  private async queryOverpassFallback(query: string): Promise<any> {
    const response = await fetch(FALLBACK_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'DriverAssistant/1.0',
        'Origin': window.location.origin
      },
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Fallback HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}
```


## src/services/roadInfo/overpass/OverpassRoadInfoService.ts

```ts
import { RoadInfoAPIService } from '../types';
import { OverpassAPI } from './OverpassAPI';
import { SpeedLimitEstimator } from './SpeedLimitEstimator';
import { CityDetector } from './CityDetector';

export class OverpassRoadInfoService implements RoadInfoAPIService {
  private static instance: OverpassRoadInfoService;
  private api: OverpassAPI;
  private speedLimitEstimator: SpeedLimitEstimator;
  private cityDetector: CityDetector;

  private constructor() {
    this.api = new OverpassAPI();
    this.speedLimitEstimator = new SpeedLimitEstimator();
    this.cityDetector = new CityDetector();
  }

  public static getInstance(): OverpassRoadInfoService {
    if (!OverpassRoadInfoService.instance) {
      OverpassRoadInfoService.instance = new OverpassRoadInfoService();
    }
    return OverpassRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    return data.elements.length > 0;
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    if (data.elements.length === 0) return null;

    const road = data.elements[0];
    const isInCity = await this.cityDetector.isInCity(lat, lon);
    
    return this.speedLimitEstimator.estimateSpeedLimit(road.tags, isInCity);
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    if (data.elements.length === 0) return [];

    const road = data.elements[0];
    if (!road.geometry) return [[lat, lon]];

    return road.geometry.map((node: any) => [node.lat, node.lon]);
  }

  async getRoadData(lat: number, lon: number): Promise<any> {
    return this.api.queryNearbyRoads(lat, lon);
  }
}
```


## src/services/roadInfo/overpass/SpeedLimitEstimator.ts

```ts
export class SpeedLimitEstimator {
  async estimateSpeedLimit(tags: Record<string, string>, isInCity: boolean): Promise<number | null> {
    console.log('[SpeedLimitEstimator] Analyzing tags:', tags);
    
    const highway = tags.highway;
    const maxspeedTag = tags.maxspeed;
    
    // Si une limite de vitesse explicite existe
    if (maxspeedTag) {
      const speedNumber = parseInt(maxspeedTag.replace(/[^0-9]/g, ''));
      if (!isNaN(speedNumber)) {
        console.log('[SpeedLimitEstimator] Found explicit speed limit:', speedNumber);
        return speedNumber;
      }
    }

    let estimatedLimit: number | null = null;
    
    switch (highway) {
      case 'motorway':
        estimatedLimit = 130;
        break;
      case 'trunk':
        estimatedLimit = 110;
        break;
      case 'primary':
      case 'secondary':
      case 'tertiary':
        if (tags.ref?.startsWith('D')) {
          estimatedLimit = isInCity ? 50 : 80;
        } else {
          estimatedLimit = isInCity ? 50 : 80;
        }
        break;
      case 'residential':
      case 'living_street':
        estimatedLimit = 30;
        break;
      default:
        estimatedLimit = null;
    }

    console.log('[SpeedLimitEstimator] Estimated speed limit:', {
      estimatedLimit,
      isInCity,
      highway,
      ref: tags.ref
    });

    return estimatedLimit;
  }
}
```


## src/services/roadInfo/index.ts

```ts
import { RoadInfoAPIService } from './types';
import { NominatimRoadInfoService } from './NominatimRoadInfoService';
import { MapboxRoadInfoService } from './MapboxRoadInfoService';
import { OverpassRoadInfoService } from './overpass/OverpassRoadInfoService';

class RoadInfoService {
  private static instance: RoadInfoService;
  private currentService: RoadInfoAPIService;
  private mapboxToken?: string;

  private constructor() {
    // Par défaut on utilise le service Nominatim
    this.currentService = NominatimRoadInfoService.getInstance();
  }

  public static getInstance(): RoadInfoService {
    if (!RoadInfoService.instance) {
      RoadInfoService.instance = new RoadInfoService();
    }
    return RoadInfoService.instance;
  }

  public setMapboxToken(token: string) {
    this.mapboxToken = token;
    if (token) {
      this.currentService = MapboxRoadInfoService.getInstance();
    } else {
      this.currentService = NominatimRoadInfoService.getInstance();
    }
  }

  public useNominatim() {
    this.currentService = NominatimRoadInfoService.getInstance();
  }

  public useOverpass() {
    this.currentService = OverpassRoadInfoService.getInstance();
  }

  public async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    return this.currentService.getCurrentRoadSegment(lat, lon);
  }

  public async getRoadData(lat: number, lon: number): Promise<any> {
    return this.currentService.getRoadData(lat, lon);
  }
}

export const roadInfoService = RoadInfoService.getInstance();
```


## src/services/roadInfo/MapboxRoadInfoService.ts

```ts
import { RoadInfoAPIService } from './types';
import { settingsService } from '../SettingsService';

export class MapboxRoadInfoService implements RoadInfoAPIService {
  private static instance: MapboxRoadInfoService;
  private readonly MAPBOX_API = 'https://api.mapbox.com/v4';

  private constructor() {}

  public static getInstance(): MapboxRoadInfoService {
    if (!MapboxRoadInfoService.instance) {
      MapboxRoadInfoService.instance = new MapboxRoadInfoService();
    }
    return MapboxRoadInfoService.instance;
  }

  private get accessToken(): string {
    return settingsService.getSettings().mapboxToken;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.features.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return null;

      const speedLimit = data.features[0].properties.maxspeed;
      if (!speedLimit) return null;

      return speedLimit.includes('mph') 
        ? Math.round(parseInt(speedLimit) * 1.60934) 
        : parseInt(speedLimit);
    } catch (error) {
      throw error;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=20&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return [];

      const geometry = data.features[0].geometry;
      if (!geometry || !geometry.coordinates) return [];

      return geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    } catch (error) {
      throw error;
    }
  }

  async getRoadData(lat: number, lon: number): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        elements: data.features.map((feature: any) => ({
          tags: {
            highway: feature.properties.class,
            maxspeed: feature.properties.maxspeed
          },
          geometry: feature.geometry.coordinates.map((coord: [number, number]) => ({
            lat: coord[1],
            lon: coord[0]
          }))
        }))
      };
    } catch (error) {
      throw error;
    }
  }
}
```


## src/services/roadInfo/NominatimRoadInfoService.ts

```ts
import { RoadInfoAPIService } from './types';
import { fetchWithRetry } from '../../utils/api/fetchWithRetry';

export class NominatimRoadInfoService implements RoadInfoAPIService {
  private static instance: NominatimRoadInfoService;
  private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org';

  private constructor() {}

  public static getInstance(): NominatimRoadInfoService {
    if (!NominatimRoadInfoService.instance) {
      NominatimRoadInfoService.instance = new NominatimRoadInfoService();
    }
    return NominatimRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      const data = await response.json();
      return data.address && (
        data.address.road || 
        data.address.highway || 
        data.address.street
      );
    } catch (error) {
      console.error('Nominatim error:', error);
      return false;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Nominatim');
      }

      const data = await response.json();
      
      // Nominatim ne fournit pas directement les limites de vitesse
      // On utilise une estimation basée sur le type de route
      if (data.address) {
        if (data.address.highway === 'motorway') return 130;
        if (data.address.highway === 'trunk') return 110;
        if (data.address.highway === 'primary') return 90;
        if (data.address.highway === 'secondary') return 80;
        if (data.address.highway === 'residential') return 50;
      }
      
      return null;
    } catch (error) {
      console.error('Nominatim error:', error);
      return null;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    // Nominatim ne fournit pas directement la géométrie des routes
    // On retourne juste le point actuel comme segment
    return [[lat, lon]];
  }

  async getRoadData(lat: number, lon: number): Promise<any> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Nominatim');
      }

      const data = await response.json();
      
      return {
        elements: data.address ? [{
          tags: {
            highway: data.address.highway || data.address.road_type,
            maxspeed: null
          },
          geometry: [{
            lat: lat,
            lon: lon
          }]
        }] : []
      };
    } catch (error) {
      console.error('Nominatim error:', error);
      return { elements: [] };
    }
  }
}
```


## src/services/roadInfo/RoadInfoManager.ts

```ts
import { roadInfoService } from './index';
import { calculateDistance } from '../../utils/mapUtils';

export interface RoadInfo {
  isOnRoad: boolean;
  speedLimit: number | null;
  currentSegment: [number, number][];
  isInCity: boolean;
  lastPosition: [number, number];
  roadType: string;
}

type RoadInfoObserver = (info: RoadInfo) => void;

class RoadInfoManager {
  private static instance: RoadInfoManager;
  private observers: RoadInfoObserver[] = [];
  private currentInfo: RoadInfo | null = null;
  private readonly MIN_UPDATE_DISTANCE = 10;
  private readonly MIN_UPDATE_INTERVAL = 5000;
  private lastUpdateTime: number = 0;
  private updateTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): RoadInfoManager {
    if (!RoadInfoManager.instance) {
      RoadInfoManager.instance = new RoadInfoManager();
    }
    return RoadInfoManager.instance;
  }

  public addObserver(observer: RoadInfoObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: RoadInfoObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    if (this.currentInfo) {
      this.observers.forEach(observer => observer(this.currentInfo!));
    }
  }

  private shouldUpdate(newPosition: [number, number]): boolean {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate < this.MIN_UPDATE_INTERVAL) {
      console.log('Skipping road info update - too soon since last update:', 
        timeSinceLastUpdate, 'ms');
      return false;
    }

    if (!this.currentInfo) return true;

    const distance = calculateDistance(newPosition, this.currentInfo.lastPosition);
    console.log('Distance since last road info update:', distance, 'm');

    return distance >= this.MIN_UPDATE_DISTANCE;
  }

  private getRoadType(tags: any): string {
    if (!tags || !tags.highway) return 'unknown';
    
    switch (tags.highway) {
      case 'motorway':
      case 'motorway_link':
        return 'highway';
      case 'trunk':
      case 'trunk_link':
      case 'primary':
        return 'speed_road';
      case 'secondary':
      case 'tertiary':
        return 'road';
      case 'residential':
      case 'living_street':
        return 'city';
      default:
        return 'road';
    }
  }

  public async forceUpdate(position: [number, number]) {
    console.log('Forcing road info update for position:', position);
    await this.updateRoadInfo(position, true);
  }

  public async updateRoadInfo(position: [number, number], force: boolean = false) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(async () => {
      if (!force && !this.shouldUpdate(position)) {
        return;
      }

      console.log('Updating road info for position:', position);

      try {
        const roadData = await roadInfoService.getRoadData(position[0], position[1]);
        const isOnRoad = roadData.elements.length > 0;
        const tags = roadData.elements[0]?.tags || {};
        const roadType = this.getRoadType(tags);
        const speedLimit = tags.maxspeed ? parseInt(tags.maxspeed) : null;
        const currentSegment = roadData.elements[0]?.geometry?.map((node: any) => [node.lat, node.lon]) || [];
        const isInCity = speedLimit ? speedLimit <= 50 : false;

        this.currentInfo = {
          isOnRoad,
          speedLimit,
          currentSegment,
          isInCity,
          lastPosition: position,
          roadType
        };

        this.lastUpdateTime = Date.now();
        console.log('Road info updated:', this.currentInfo);
        this.notifyObservers();
      } catch (error) {
        console.error('Error updating road info:', error);
      }
    }, 100);
  }

  public getCurrentInfo(): RoadInfo | null {
    return this.currentInfo;
  }
}

export const roadInfoManager = RoadInfoManager.getInstance();
```


## src/services/roadInfo/RoadInfoService.ts

```ts
import { RoadInfoAPIService } from './types';
import { settingsService } from '../SettingsService';

export class RoadInfoService implements RoadInfoAPIService {
  private provider: RoadInfoAPIService;

  constructor(provider: RoadInfoAPIService) {
    this.provider = provider;
  }

  private isDisabled(): boolean {
    const settings = settingsService.getSettings();
    return settings.disableOverpass;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return true; // On suppose que le point est sur la route par défaut
    }
    return this.provider.isPointOnRoad(lat, lon);
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return null;
    }
    return this.provider.getSpeedLimit(lat, lon);
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return [];
    }
    return this.provider.getCurrentRoadSegment(lat, lon);
  }

  async getRoadData(lat: number, lon: number): Promise<any> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return { elements: [] };
    }
    return this.provider.getRoadData(lat, lon);
  }
}
```


## src/services/roadInfo/types.ts

```ts
export interface RoadInfoAPIService {
  isPointOnRoad(lat: number, lon: number): Promise<boolean>;
  getSpeedLimit(lat: number, lon: number): Promise<number | null>;
  getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]>;
  getRoadData(lat: number, lon: number): Promise<any>;
}
```


## src/services/route/RoutePlannerService.ts

```ts
import { getRoute } from '../../utils/routingUtils';
import { toast } from '../../components/ui/use-toast';
import { EnhancedRoutePoint, RouteState, RouteObserver } from './RoutePlannerTypes';
import { smoothPath, calculateAngleBetweenPoints } from '../prediction/CurveAnalyzerUtils';
import { roadPredictor } from '../prediction/RoadPredictor';

class RoutePlannerService {
  private state: RouteState = {
    origin: null,
    destination: null,
    routePoints: [],
    enhancedPoints: [],
    routeColor: '#3B82F6'
  };
  private observers: RouteObserver[] = [];
  private readonly SMOOTHING_WINDOW = 1;

  private static instance: RoutePlannerService;
  public static getInstance(): RoutePlannerService {
    if (!RoutePlannerService.instance) {
      RoutePlannerService.instance = new RoutePlannerService();
    }
    return RoutePlannerService.instance;
  }

  private constructor() {}

  public addObserver(observer: RouteObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: RouteObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    const newState = { ...this.state };
    this.observers.forEach(observer => observer(newState));
  }

  public getState(): RouteState {
    return { ...this.state };
  }

  private enhanceRoutePoints(routePoints: [number, number][]): EnhancedRoutePoint[] {
    if (routePoints.length < 2) return [];

    const smoothedPath = smoothPath(routePoints, this.SMOOTHING_WINDOW, Infinity);

    const enhanced: EnhancedRoutePoint[] = new Array(routePoints.length);

    enhanced[0] = {
      position: routePoints[0],
      smoothPosition: [smoothedPath[0].lat, smoothedPath[0].lon],
      angleReal: 0,
      angleSmooth: 0
    };

    for (let i = 1; i < routePoints.length - 1; i++) {
      const realAngles = calculateAngleBetweenPoints(
        { lat: routePoints[i-1][0], lon: routePoints[i-1][1] },
        { lat: routePoints[i][0], lon: routePoints[i][1] },
        { lat: routePoints[i+1][0], lon: routePoints[i+1][1] }
      );

      const smoothAngles = calculateAngleBetweenPoints(
        smoothedPath[i-1],
        smoothedPath[i],
        smoothedPath[i+1]
      );

      enhanced[i] = {
        position: routePoints[i],
        smoothPosition: [smoothedPath[i].lat, smoothedPath[i].lon],
        angleReal: realAngles.angleDiff,
        angleSmooth: smoothAngles.angleDiff
      };
    }

    const lastIdx = routePoints.length - 1;
    enhanced[lastIdx] = {
      position: routePoints[lastIdx],
      smoothPosition: [smoothedPath[lastIdx].lat, smoothedPath[lastIdx].lon],
      angleReal: 0,
      angleSmooth: 0
    };

    return enhanced;
  }

  public async calculateRoute(origin: [number, number], destination: [number, number]) {
    console.log('[RoutePlannerService] Calculating route:', { origin, destination });
    
    try {
      const route = await getRoute(origin, destination);
      
      if (route.length < 2) {
        console.error('[RoutePlannerService] Invalid route calculated:', route);
        toast({
          title: "Erreur",
          description: "L'itinéraire calculé est invalide",
          variant: "destructive"
        });
        return;
      }

      this.state.routePoints = route;
      this.state.enhancedPoints = this.enhanceRoutePoints(route);
      this.notifyObservers();
      
      toast({
        title: "Itinéraire calculé (OK)",
        description: "L'itinéraire a été calculé avec succès",
      });
    } catch (error) {
      console.error('[RoutePlannerService] Error calculating route:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer l'itinéraire",
        variant: "destructive"
      });
    }
  }

  public setDestination(location: [number, number], address: string) {
    console.log('[RoutePlannerService] Setting destination:', { location, address });
    this.state.destination = { location, address };
    this.notifyObservers();
  }

  public async recalculateRoute() {
    if (!this.state.origin || !this.state.destination) {
      console.log('[RoutePlannerService] Cannot recalculate route: missing origin or destination');
      return;
    }

    await this.calculateRoute(this.state.origin, this.state.destination.location);
  }

  public reset() {
    console.log('[RoutePlannerService] Resetting state');
    this.state = {
      origin: null,
      destination: null,
      routePoints: [],
      enhancedPoints: [],
      routeColor: '#3B82F6'
    };
    this.notifyObservers();
  }

  public getRouteColor(): string {
    return this.state.routeColor;
  }
}

export const routePlannerService = RoutePlannerService.getInstance();
```


## src/services/route/RoutePlannerTypes.ts

```ts
export interface EnhancedRoutePoint {
  position: [number, number];
  smoothPosition: [number, number];
  angleReal: number;
  angleSmooth: number;
}

export type RouteState = {
  origin: [number, number] | null;
  destination: { location: [number, number]; address: string } | null;
  routePoints: [number, number][];
  enhancedPoints: EnhancedRoutePoint[];
  routeColor: string;
};

export type RouteObserver = (state: RouteState) => void;
```


## src/services/simulation/managers/PredictionManager.ts

```ts
import { roadPredictor } from '../../prediction/RoadPredictor';

interface PredictionState {
  optimalSpeed: number;
  requiredDeceleration: number | null;
}

export class PredictionManager {
  getLatestPrediction(): PredictionState {
    const prediction = roadPredictor.getCurrentPrediction();
    
    console.log('PredictionManager received prediction:', prediction);

    if (!prediction) {
      console.log('No prediction available, using default values');
      return {
        optimalSpeed: 90,
        requiredDeceleration: null
      };
    }

    // La vitesse optimale est en km/h dans le predictor
    const optimalSpeed = prediction.optimalSpeed || 90;
    
    console.log('PredictionManager returning:', {
      optimalSpeed,
      requiredDeceleration: prediction.requiredDeceleration
    });

    return {
      optimalSpeed,
      requiredDeceleration: prediction.requiredDeceleration
    };
  }
}
```


## src/services/simulation/managers/SimulationStateManager.ts

```ts
export class SimulationStateManager {
  private isIdle: boolean = true;

  setIdle(value: boolean) {
    this.isIdle = value;
  }

  isSimulationIdle(): boolean {
    return this.isIdle;
  }
}
```


## src/services/simulation/managers/SimulationUpdateManager.ts

```ts
import { Vehicle } from '../../../models/Vehicle';
import { NavigationCalculator } from '../utils/NavigationCalculator';
import { RouteManager } from '../utils/RouteManager';
import { SpeedController } from '../utils/SpeedController';

export class SimulationUpdateManager {
  constructor(
    private vehicle: Vehicle,
    private navigationCalculator: NavigationCalculator,
    private speedController: SpeedController,
    private routeManager: RouteManager
  ) {}

  updateVehicleState(optimalSpeed: number, requiredDeceleration: number | null): boolean {
    const currentPosition = this.vehicle.position;
    
    const { speed: newSpeed, acceleration } = this.speedController.updateSpeed(
      1, // TIME_STEP
      optimalSpeed,
      requiredDeceleration
    );
    
    const distanceToTravel = newSpeed * 1; // TIME_STEP
    const targetIndex = this.routeManager.findNextValidTarget(currentPosition, distanceToTravel);
    const nextPosition = this.routeManager.getRoutePoint(targetIndex);
    
    if (!nextPosition) {
      console.error('[SimulationUpdateManager] No valid next position found');
      return false;
    }

    console.log('[SimulationUpdateManager] Current state:', {
      currentRouteIndex: this.routeManager.getCurrentIndex(),
      targetIndex,
      currentPosition,
      nextPosition,
      currentSpeed: newSpeed * 3.6,
      acceleration,
      distanceToTravel
    });

    const heading = this.navigationCalculator.calculateHeading(currentPosition, nextPosition);
    const newPosition = this.navigationCalculator.calculateNextPosition(currentPosition, heading, distanceToTravel);

    if (targetIndex > this.routeManager.getCurrentIndex()) {
      console.log('[SimulationUpdateManager] Updating route index from', this.routeManager.getCurrentIndex(), 'to', targetIndex);
      this.routeManager.updateCurrentIndex(targetIndex);
    }

    this.vehicle.update(newPosition, newSpeed, acceleration);
    return true;
  }
}
```


## src/services/simulation/utils/NavigationCalculator.ts

```ts
const METERS_PER_DEGREE_LAT = 111111;

export class NavigationCalculator {
  calculateHeading(from: [number, number], to: [number, number]): [number, number] {
    const deltaLat = (to[0] - from[0]) * METERS_PER_DEGREE_LAT;
    const deltaLon = (to[1] - from[1]) * METERS_PER_DEGREE_LAT * Math.cos(from[0] * Math.PI / 180);
    
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
    
    if (distance === 0) return [0, 0];
    
    return [deltaLat / distance, deltaLon / distance];
  }

  calculateNextPosition(currentPosition: [number, number], heading: [number, number], distance: number): [number, number] {
    const deltaLat = (heading[0] * distance) / METERS_PER_DEGREE_LAT;
    const deltaLon = (heading[1] * distance) / (METERS_PER_DEGREE_LAT * Math.cos(currentPosition[0] * Math.PI / 180));
    
    return [
      currentPosition[0] + deltaLat,
      currentPosition[1] + deltaLon
    ];
  }

  calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}
```


## src/services/simulation/utils/RouteManager.ts

```ts
import { NavigationCalculator } from './NavigationCalculator';

export class RouteManager {
  private routePoints: [number, number][] = [];
  private currentRouteIndex = 0;
  private navigationCalculator: NavigationCalculator;

  constructor(navigationCalculator: NavigationCalculator) {
    this.navigationCalculator = navigationCalculator;
  }

  setRoutePoints(points: [number, number][]) {
    this.routePoints = points;
    this.currentRouteIndex = 0;
  }

  getCurrentIndex(): number {
    return this.currentRouteIndex;
  }

  findNextValidTarget(
    currentPosition: [number, number],
    distanceToTravel: number
  ): number {
    let targetIndex = this.currentRouteIndex;
    let accumulatedDistance = 0;

    console.log('[RouteManager] Finding next target:', {
      currentPosition,
      distanceToTravel,
      currentIndex: this.currentRouteIndex,
      totalPoints: this.routePoints.length
    });

    while (targetIndex < this.routePoints.length - 1 && targetIndex < this.currentRouteIndex +3) {
      const currentTarget = this.routePoints[targetIndex];
      
      // Calculate distance to next point
      const nextDistance = this.navigationCalculator.calculateDistance(
        currentPosition,
        currentTarget
      );

      console.log('[RouteManager] Checking point:', {
        distanceToTravel, 
        targetIndex,
        nextDistance,
        currentTarget
      });

      // If we can't reach the next point, this is our target
      if (nextDistance > distanceToTravel) {
        console.log('[RouteManager] Found target point:', {
          targetIndex,
          distance: nextDistance,
          distanceToTravel
        });
        return targetIndex;
      }

      // Move to next point
      targetIndex++;
    }

    // If we've reached the end of the route
    if (targetIndex >= this.routePoints.length - 1) {
      console.log('[RouteManager] Reached end of route');
      return this.routePoints.length - 1;
    }

    return targetIndex;
  }

  getRoutePoint(index: number): [number, number] | null {
    return this.routePoints[index] || null;
  }

  updateCurrentIndex(index: number) {
    this.currentRouteIndex = index;
  }

  hasReachedEnd(): boolean {
    return this.currentRouteIndex >= this.routePoints.length - 1;
  }
}
```


## src/services/simulation/utils/SpeedController.ts

```ts
export class SpeedController {
  private currentSpeed: number = 0;
  private currentAcceleration: number = 0;
  private readonly MAX_SPEED = 36.11; // 130 km/h en m/s
  private readonly MIN_SPEED = 0;

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getCurrentAcceleration(): number {
    return this.currentAcceleration;
  }

  setCurrentSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  updateSpeed(
    timeStep: number, 
    optimalSpeed: number, 
    requiredDeceleration: number | null
  ): { speed: number; acceleration: number } {
    // Convertir la vitesse optimale de km/h en m/s
    const optimalSpeedMS = optimalSpeed / 3.6;
    const GRAVITY = 9.81;
    const ACCELERATION_FACTOR = 0.2;
    const DECELERATION_FACTOR = 0.3;
    const MAX_DECELERATION = 0.5;
    
    let acceleration = 0;
    const speedDiff = optimalSpeedMS - this.currentSpeed;

    console.log('SpeedController update:', {
      currentSpeed: this.currentSpeed * 3.6,
      optimalSpeed,
      requiredDeceleration,
      speedDiff: speedDiff * 3.6
    });

    // Si une décélération est requise, l'appliquer en priorité
    if (requiredDeceleration !== null) {
      acceleration = -GRAVITY * Math.min(Math.abs(requiredDeceleration), MAX_DECELERATION);
      console.log('Applying required deceleration:', acceleration);
    }
    // Sinon, ajuster la vitesse en fonction de la vitesse optimale
    else if (Math.abs(speedDiff) > 0.5) { // Seuil de 0.5 m/s pour éviter les oscillations
      if (speedDiff > 0) {
        acceleration = GRAVITY * ACCELERATION_FACTOR;
        console.log('Accelerating to reach optimal speed:', acceleration);
      } else {
        acceleration = -GRAVITY * DECELERATION_FACTOR;
        console.log('Decelerating to reach optimal speed:', acceleration);
      }
    }

    // Mise à jour de la vitesse avec le pas de temps
    let newSpeed = this.currentSpeed + acceleration * timeStep;

    // Limites de vitesse
    newSpeed = Math.max(this.MIN_SPEED, Math.min(newSpeed, this.MAX_SPEED));
    
    // Ne pas dépasser la vitesse optimale lors de l'accélération
    if (acceleration > 0) {
      newSpeed = Math.min(newSpeed, optimalSpeedMS);
    }

    this.currentSpeed = newSpeed;
    this.currentAcceleration = acceleration / GRAVITY; // Stockage en g

    console.log('Speed updated:', {
      newSpeed: this.currentSpeed * 3.6,
      acceleration: this.currentAcceleration,
      optimalSpeedMS: optimalSpeedMS * 3.6
    });
    
    return { 
      speed: this.currentSpeed,
      acceleration: this.currentAcceleration
    };
  }
}
```


## src/services/simulation/SimulationService.ts

```ts
import { Vehicle } from '../../models/Vehicle';
import { calculateDistance } from '../../utils/mapUtils';

export class SimulationService {
  private intervalId: NodeJS.Timeout | null = null;
  private currentRouteIndex = 0;
  private routePoints: [number, number][] = [];
  private vehicle: Vehicle;
  private lastUpdateTime: number = 0;
  private lastPosition: [number, number] | null = null;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routePoints = routePoints;
    this.currentRouteIndex = 0;
    this.lastUpdateTime = Date.now();

    if (routePoints.length > 0) {
      // Initialisation avec la première position
      this.lastPosition = routePoints[0];
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        const nextIndex = this.currentRouteIndex + 1;
        
        if (nextIndex >= this.routePoints.length) {
          this.stopSimulation();
          return;
        }

        const currentPosition = this.routePoints[this.currentRouteIndex];
        const nextPosition = this.routePoints[nextIndex];
        
        // Calcul de la distance en mètres
        const distance = calculateDistance(currentPosition, nextPosition);
        
        // Calcul du temps écoulé en secondes
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.lastUpdateTime) / 1000;
        
        // Calcul de la vitesse en m/s (avec un minimum de 0.1 seconde pour éviter division par 0)
        const speed = distance / Math.max(elapsedTime, 0.1);
        
        console.log('Simulation update:', {
          distance,
          elapsedTime,
          speed,
          currentPosition: currentPosition,
          nextPosition: nextPosition
        });

        // Mise à jour du véhicule avec la nouvelle position ET la vitesse
        this.vehicle.update(nextPosition, speed);
        
        // Mise à jour des variables pour le prochain calcul
        this.lastPosition = nextPosition;
        this.lastUpdateTime = currentTime;
        this.currentRouteIndex = nextIndex;
      }, 1000); // Mise à jour toutes les secondes
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Reset speed to 0 when stopping
    if (this.vehicle) {
      this.vehicle.update(this.vehicle.position, 0);
    }
  }

  reset() {
    this.stopSimulation();
    this.currentRouteIndex = 0;
    this.lastPosition = null;
    if (this.routePoints.length > 0) {
      this.vehicle.reset(this.routePoints[0]);
    }
  }
}

export const createSimulationService = (vehicle: Vehicle) => {
  return new SimulationService(vehicle);
};
```


## src/services/simulation/SimulationServiceV2.ts

```ts
import { Vehicle } from '../../models/Vehicle';
import { NavigationCalculator } from './utils/NavigationCalculator';
import { SpeedController } from './utils/SpeedController';
import { RouteManager } from './utils/RouteManager';
import { SimulationStateManager } from './managers/SimulationStateManager';
import { PredictionManager } from './managers/PredictionManager';
import { SimulationUpdateManager } from './managers/SimulationUpdateManager';

export class SimulationServiceV2 {
  private intervalId: NodeJS.Timeout | null = null;
  private stateManager: SimulationStateManager;
  private predictionManager: PredictionManager;
  private updateManager: SimulationUpdateManager;
  private routeManager: RouteManager;
  private speedController: SpeedController;

  constructor(private vehicle: Vehicle) {
    const navigationCalculator = new NavigationCalculator();
    this.speedController = new SpeedController();
    this.routeManager = new RouteManager(navigationCalculator);
    this.stateManager = new SimulationStateManager();
    this.predictionManager = new PredictionManager();
    this.updateManager = new SimulationUpdateManager(
      vehicle,
      navigationCalculator,
      this.speedController,
      this.routeManager
    );
  }

  private updateSimulation() {
    if (this.stateManager.isSimulationIdle() && this.speedController.getCurrentSpeed() === 0) {
      return;
    }

    if (this.routeManager.hasReachedEnd()) {
      console.log('[SimulationV2] End of route reached');
      this.stopSimulation();
      return;
    }

    const { optimalSpeed, requiredDeceleration } = this.predictionManager.getLatestPrediction();
    
    if (!this.stateManager.isSimulationIdle()) {
      console.log('[SimulationV2] Current prediction:', {
        optimalSpeed,
        requiredDeceleration
      });
    }

    this.updateManager.updateVehicleState(optimalSpeed, requiredDeceleration);
  }

  startSimulation(routePoints: [number, number][]) {
    this.stopSimulation();
    this.routeManager.setRoutePoints(routePoints);
    this.speedController.setCurrentSpeed(0);
    this.stateManager.setIdle(false);

    console.log('[SimulationV2] Starting simulation with route points:', routePoints);

    if (routePoints.length > 0) {
      this.vehicle.reset(routePoints[0]);
      
      this.intervalId = setInterval(() => {
        this.updateSimulation();
      }, 1000);
    }
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.vehicle) {
      this.vehicle.update(this.vehicle.position, 0, 0);
    }
    this.stateManager.setIdle(true);
    console.log('[SimulationV2] Simulation stopped');
  }

  reset() {
    this.stopSimulation();
    this.routeManager.updateCurrentIndex(0);
    this.speedController.setCurrentSpeed(0);
    this.stateManager.setIdle(true);
    const firstPoint = this.routeManager.getRoutePoint(0);
    if (firstPoint) {
      this.vehicle.reset(firstPoint);
    }
    console.log('[SimulationV2] Simulation reset');
  }
}

export const createSimulationServiceV2 = (vehicle: Vehicle) => {
  return new SimulationServiceV2(vehicle);
};
```


## src/services/RouteTracker.ts

```ts
import { calculateDistance } from '../utils/mapUtils';
import { Settings } from './SettingsService';

export class RouteTracker {
  findClosestPointOnRoute(
    currentPosition: [number, number],
    routePoints: [number, number][]
  ): { index: number; distance: number } {
    let closestPointIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < routePoints.length; i++) {
      const distance = calculateDistance(currentPosition, routePoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
      }
    }

    return {
      index: closestPointIndex,
      distance: minDistance
    };
  }

  calculateDistance(point1: [number, number], point2: [number, number]): number {
    return calculateDistance(point1, point2);
  }

  isOffRoute(distance: number, settings: Settings): boolean {
    return distance > settings.maxRouteDeviation;
  }
}
```


## src/services/SettingsService.ts

```ts
export type RoadInfoProvider = 'overpass' | 'mapbox' | 'nominatim';
export type SimulatorVersion = 'v1' | 'v2';
export type DrivingStyle = 'prudent' | 'normal' | 'sportif';

export interface Settings {
  defaultSpeed: number;
  predictionDistance: number;
  minTurnAngle: number;
  maxTurnAngle: number;
  maxTurnDistance: number;
  minTurnDistance: number;
  minTurnSpeed: number;
  updateInterval: number;
  roadInfoProvider: RoadInfoProvider;
  maxRouteDeviation: number;
  disableOverpass: boolean;
  simulatorVersion: SimulatorVersion;
  drivingStyle: DrivingStyle;
  mapboxToken: string;
  enableAutoRecalculate: boolean; // New setting
}

type SettingsObserver = (settings: Settings) => void;

class SettingsService {
  private settings: Settings;
  private observers: SettingsObserver[] = [];

  constructor() {
    const savedSettings = localStorage.getItem('app_settings');
    
    // Valeurs par défaut
    this.settings = {
      defaultSpeed: 50,
      predictionDistance: 500,
      minTurnAngle: 30,
      maxTurnAngle: 90,
      maxTurnDistance: 200,
      minTurnDistance: 20,
      minTurnSpeed: 30,
      updateInterval: 2000,
      roadInfoProvider: 'nominatim',
      maxRouteDeviation: 50,
      disableOverpass: false,
      simulatorVersion: 'v1',
      drivingStyle: 'prudent',
      mapboxToken: '',
      enableAutoRecalculate: true // Default value
    };

    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('app_settings', JSON.stringify(this.settings));
    this.notifyObservers();
  }

  addObserver(observer: SettingsObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: SettingsObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.settings));
  }
}

export const settingsService = new SettingsService();
```


## src/services/SpeedLimitCache.ts

```ts
import { getSpeedLimit } from '../utils/osmUtils';

type CachedSpeedLimit = {
  value: number;
  timestamp: number;
};

export class SpeedLimitCache {
  private cache: Map<string, CachedSpeedLimit> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 secondes en millisecondes

  private generateKey(lat: number, lon: number): string {
    // Arrondir à 5 décimales pour regrouper les points proches
    return `${lat.toFixed(5)},${lon.toFixed(5)}`;
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number> {
    const key = this.generateKey(lat, lon);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.value;
    }

    const speedLimit = await getSpeedLimit(lat, lon);
    this.cache.set(key, {
      value: speedLimit,
      timestamp: Date.now()
    });

    // Nettoyage périodique du cache
    this.cleanCache();

    return speedLimit;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}
```


## src/styles/matrix.css

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.matrix-text li {
  position: relative;
  padding-left: 1.5em;
}

.matrix-text li::before {
  content: '>';
  position: absolute;
  left: 0;
  color: #00ff00;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```


## src/utils/api/fetchWithRetry.ts

```ts
const TIMEOUT = 30000; // Increased to 30 seconds for slower connections
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { timeout = TIMEOUT, signal: existingSignal, ...fetchOptions } = options;
  
  // Create a new AbortController that will be used for timeout
  const timeoutController = new AbortController();
  const { signal: timeoutSignal } = timeoutController;

  // Create a combined signal if there's an existing one
  const combinedSignal = existingSignal
    ? new AbortController().signal
    : timeoutSignal;

  if (existingSignal) {
    existingSignal.addEventListener('abort', () => timeoutController.abort());
  }

  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    console.log(`Attempting request to ${url} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    const response = await fetchWithTimeout(url, options);
    
    if (!response.ok) {
      // Handle rate limiting specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY;
        throw new Error(`Rate limited. Retry after ${delay}ms`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      // If it's the main Overpass endpoint and it failed, try the fallback
      if (url === 'https://overpass-api.de/api/interpreter' && retries === MAX_RETRIES) {
        console.log('Main Overpass endpoint failed, trying fallback...');
        return fetchWithRetry('https://overpass.kumi.systems/api/interpreter', options, retries - 1);
      }

      const delay = Math.min(
        Math.pow(2, MAX_RETRIES - retries) * INITIAL_DELAY,
        30000 // Max 30 seconds delay
      );
      
      console.log(
        `Request failed (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}), ` +
        `retrying in ${delay}ms...`,
        error
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    console.error('All retry attempts failed:', error);
    throw error;
  }
}
```


## src/utils/cache/osmCache.ts

```ts
// Cache implementation for OSM requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export const getCacheKey = (lat: number, lon: number, queryType: string) => {
  return `${queryType}-${lat.toFixed(6)}-${lon.toFixed(6)}`;
};

export const getFromCache = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

export const setInCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```


## src/utils/DriveViewRenderer.ts

```ts
import { DriveViewState } from "../models/DriveViewModel";

export class DriveViewRenderer {
  static render(ctx: CanvasRenderingContext2D, state: DriveViewState, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);
    
    // Transformer le contexte pour centrer et orienter la vue
    ctx.save();
    ctx.translate(width / 2, height * 0.7);
    const rotationAngle = (-state.bearing) * Math.PI / 180;
    ctx.rotate(rotationAngle);

    // Dessiner la route
    ctx.beginPath();
    state.routeSegment.forEach((localPoint, index) => {
      const distance = Math.sqrt(localPoint[0] * localPoint[0] + localPoint[1] * localPoint[1]);
      const alpha = Math.max(0.1, 1 - (distance / 500));
      
      const color = index < state.currentIndex ? 'rgba(128, 128, 128, ' : 
        (index === state.currentIndex ? 'rgba(128, 0, 0, ' : 'rgba(59, 130, 246, ');
      ctx.strokeStyle = color + alpha + ')';
      ctx.lineWidth = Math.max(10, 50 * (1 - distance / 1000));
      
      if (index === 0) {
        ctx.moveTo(localPoint[0], -localPoint[1]);
      } else {
        ctx.lineTo(localPoint[0], -localPoint[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(localPoint[0], -localPoint[1]);
      }
    });

    // Dessiner le point rouge à l'origine
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Afficher le bearing en haut à gauche
    ctx.save();
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(`Bearing: ${Math.round(state.bearing)}°`, 10, 30);
    ctx.restore();
  }
}
```


## src/utils/mapUtils.ts

```ts
export const calculateBearing = (start: [number, number], end: [number, number]): number => {
  if (!start || !end || !Array.isArray(start) || !Array.isArray(end) || start.length < 2 || end.length < 2) {
    return 0;
  }

  const startLat = start[0] * Math.PI / 180;
  const startLng = start[1] * Math.PI / 180;
  const endLat = end[0] * Math.PI / 180;
  const endLng = end[1] * Math.PI / 180;

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
           Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  if (bearing < 0) {
    bearing += 360;
  }
  
  return bearing;
};

export const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  if (!point1 || !point2 || !Array.isArray(point1) || !Array.isArray(point2) || point1.length < 2 || point2.length < 2) {
    return 0;
  }

  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1[0] * Math.PI / 180;
  const φ2 = point2[0] * Math.PI / 180;
  const Δφ = (point2[0] - point1[0]) * Math.PI / 180;
  const Δλ = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Returns distance in meters
};

export const calculateAngleDifference = (angle1: number, angle2: number): number => {
  // Normalize angles to be between 0 and 360
  angle1 = ((angle1 % 360) + 360) % 360;
  angle2 = ((angle2 % 360) + 360) % 360;

  // Calculate the shortest angle difference
  let diff = angle1 - angle2;
  
  // Normalize the difference to be between -180 and 180
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  return diff;
};

export const predictRoadAhead = (position: [number, number], speed: number, heading: number = 0): [number, number][] => {
  const vehicle = (window as any).globalVehicle;
  if (!vehicle || !vehicle.positionHistory || vehicle.positionHistory.length < 2) {
    return [position, position];
  }

  // Get the last two positions
  const currentPos = vehicle.positionHistory[0];
  const prevPos = vehicle.positionHistory[1];

  if (!currentPos || !prevPos) {
    return [position, position];
  }

  // Calculate the difference in latitude and longitude
  const deltaLat = currentPos[0] - prevPos[0];
  const deltaLon = currentPos[1] - prevPos[1];

  // Multiply by 3 to get 3 seconds prediction
  const predictedLat = currentPos[0] + (deltaLat * 3);
  const predictedLon = currentPos[1] + (deltaLon * 3);

  const endPoint: [number, number] = [predictedLat, predictedLon];
  return [position, endPoint];
};

export function calculateDistanceToSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}
```


## src/utils/osmUtils.ts

```ts
import { fetchWithRetry } from './api/fetchWithRetry';
import { getCacheKey, getFromCache, setInCache } from './cache/osmCache';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export const isPointOnRoad = async (lat: number, lon: number): Promise<boolean> => {
  const cacheKey = getCacheKey(lat, lon, 'isPointOnRoad');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    const result = data.elements.length > 0;
    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error checking position:', error);
    return false;
  }
};

export const getSpeedLimit = async (lat: number, lon: number): Promise<number | null> => {
  const cacheKey = getCacheKey(lat, lon, 'getSpeedLimit');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"]["maxspeed"];
    out body;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    let result = null;

    if (data.elements.length > 0) {
      const maxspeed = data.elements[0].tags.maxspeed;
      if (maxspeed) {
        const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
        if (!isNaN(speedNumber)) {
          result = maxspeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
        }
      }
    }

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting speed limit:', error);
    return null;
  }
};

export const getCurrentRoadSegment = async (lat: number, lon: number): Promise<[number, number][]> => {
  const cacheKey = getCacheKey(lat, lon, 'getCurrentRoadSegment');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:20,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    let result: [number, number][] = [];
    
    if (data.elements.length > 0) {
      const way = data.elements[0];
      if (way.geometry) {
        result = way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
      }
    }

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting road segment:', error);
    return [];
  }
};
```


## src/utils/routingUtils.ts

```ts
export async function getRoute(start: [number, number], end: [number, number]): Promise<[number, number][]> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error('Unable to find route');
    }
    
    // OSRM returns coordinates in [longitude, latitude] format, we need to swap them
    return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}
```


## src/utils/speedUtils.ts

```ts
export const calculateRecommendedSpeed = (currentSpeed: number): number => {
  // This is a simplified calculation - in a real app, this would consider:
  // - Road type and conditions
  // - Weather
  // - Traffic
  // - Upcoming turns and obstacles
  
  // For now, we'll just recommend slightly lower than current speed if above 50 km/h
  const speedKmh = currentSpeed * 3.6;
  if (speedKmh > 50) {
    return (speedKmh - 5) / 3.6;
  }
  return currentSpeed;
};

export const calculateBrakingDistance = (speed: number): number => {
  // Simple braking distance calculation
  // Real calculation would consider:
  // - Road conditions
  // - Tire condition
  // - Weather
  return (speed * speed) / (2 * 9.81 * 0.8); // Simple physics formula with 0.8 friction coefficient
};
```


## src/utils/turnUtils.ts

```ts
export const getTurnType = (angle: number): {
  type: string;
  color: string;
} => {
  const absAngle = Math.abs(angle);
  if (absAngle <= 20) {
    return { type: "rapide", color: "text-green-500" };
  } else if (absAngle <= 45) {
    return { type: "lent", color: "text-blue-500" };
  } else if (absAngle <= 90) {
    return { type: "séré", color: "text-orange-500" };
  } else {
    return { type: "lacet", color: "text-red-500" };
  }
};
```


## src/App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
```


## src/App.tsx

```tsx
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SettingsView from "./components/SettingsView";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
```


## src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes roadPulse {
  from {
    opacity: 0.5;
    transform: translateX(-50%) scaleX(0.8);
  }
  to {
    opacity: 0.8;
    transform: translateX(-50%) scaleX(1);
  }
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
```


## src/main.tsx

```tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
```


## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />
```


## .export-ignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
node_modules
dist
dist-ssr
*.local
# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.png
*.ico
*.lockb
*.jpg
```


## .gitignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
package-lock.json
```


## components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```


## eslint.config.js

```js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
```


## export.md

File is too large to process (2891525 bytes)


## index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>RoadWise Helper</title>
    <meta name="description" content="Your intelligent driving assistant" />
    <meta name="theme-color" content="#1f2937" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="RoadWise" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/pwa-192x192.png" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then(registration => {
              console.log('ServiceWorker registration successful');
              // Vérifie les mises à jour toutes les heures
              setInterval(() => {
                registration.update();
                console.log('Checking for SW update');
              }, 3600000);
            })
            .catch(err => {
              console.log('ServiceWorker registration failed: ', err);
            });

          // Écoute les nouveaux service workers
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker activated, reloading for fresh content');
            window.location.reload();
          });
        });
      }
    </script>
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```


## package-lock.json

```json
{
  "name": "vite_react_shadcn_ts",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "vite_react_shadcn_ts",
      "version": "0.0.0",
      "dependencies": {
        "@hookform/resolvers": "^3.9.0",
        "@radix-ui/react-accordion": "^1.2.0",
        "@radix-ui/react-alert-dialog": "^1.1.1",
        "@radix-ui/react-aspect-ratio": "^1.1.0",
        "@radix-ui/react-avatar": "^1.1.0",
        "@radix-ui/react-checkbox": "^1.1.1",
        "@radix-ui/react-collapsible": "^1.1.0",
        "@radix-ui/react-context-menu": "^2.2.1",
        "@radix-ui/react-dialog": "^1.1.2",
        "@radix-ui/react-dropdown-menu": "^2.1.1",
        "@radix-ui/react-hover-card": "^1.1.1",
        "@radix-ui/react-label": "^2.1.0",
        "@radix-ui/react-menubar": "^1.1.1",
        "@radix-ui/react-navigation-menu": "^1.2.0",
        "@radix-ui/react-popover": "^1.1.1",
        "@radix-ui/react-progress": "^1.1.0",
        "@radix-ui/react-radio-group": "^1.2.0",
        "@radix-ui/react-scroll-area": "^1.1.0",
        "@radix-ui/react-select": "^2.1.1",
        "@radix-ui/react-separator": "^1.1.0",
        "@radix-ui/react-slider": "^1.2.0",
        "@radix-ui/react-slot": "^1.1.0",
        "@radix-ui/react-switch": "^1.1.0",
        "@radix-ui/react-tabs": "^1.1.0",
        "@radix-ui/react-toast": "^1.2.1",
        "@radix-ui/react-toggle": "^1.1.0",
        "@radix-ui/react-toggle-group": "^1.1.0",
        "@radix-ui/react-tooltip": "^1.1.4",
        "@tanstack/react-query": "^5.56.2",
        "@types/leaflet": "^1.9.8",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "cmdk": "^1.0.0",
        "date-fns": "^3.6.0",
        "embla-carousel-react": "^8.3.0",
        "input-otp": "^1.2.4",
        "leaflet": "^1.9.4",
        "lodash": "^4.17.21",
        "lucide-react": "^0.462.0",
        "next-themes": "^0.3.0",
        "react": "^18.3.1",
        "react-day-picker": "^8.10.1",
        "react-dom": "^18.3.1",
        "react-hook-form": "^7.53.0",
        "react-leaflet": "^4.2.1",
        "react-resizable-panels": "^2.1.3",
        "react-router-dom": "^6.26.2",
        "recharts": "^2.12.7",
        "sonner": "^1.5.0",
        "tailwind-merge": "^2.5.2",
        "tailwindcss-animate": "^1.0.7",
        "vaul": "^0.9.3",
        "zod": "^3.23.8"
      },
      "devDependencies": {
        "@eslint/js": "^9.9.0",
        "@tailwindcss/typography": "^0.5.15",
        "@types/node": "^22.5.5",
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react-swc": "^3.5.0",
        "autoprefixer": "^10.4.20",
        "eslint": "^9.9.0",
        "eslint-plugin-react-hooks": "^5.1.0-rc.0",
        "eslint-plugin-react-refresh": "^0.4.9",
        "globals": "^15.9.0",
        "lovable-tagger": "^1.0.19",
        "postcss": "^8.4.47",
        "tailwindcss": "^3.4.11",
        "typescript": "^5.5.3",
        "typescript-eslint": "^8.0.1",
        "vite": "^5.4.1"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.25.9",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.25.9.tgz",
      "integrity": "sha512-4A/SCr/2KLd5jrtOMFzaKjVtAei3+2r/NChoBNoZ3EyP/+GlhoaEGoWOZUmFmoITP7zOJyHIMm+DYRd8o3PvHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.25.9",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.25.9.tgz",
      "integrity": "sha512-Ed61U6XJc3CVRfkERJWDz4dJwKe7iLmmJsbOGu9wSloNSFttHV0I8g6UAgb7qnK5ly5bGLPd4oXZlxCdANBOWQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.25.9",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.25.9.tgz",
      "integrity": "sha512-aI3jjAAO1fh7vY/pBGsn1i9LDbRP43+asrRlkPuTXW5yHXtd1NgTEMudbBoDDxrf1daEEfPJqR+JBMakzrR4Dg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.25.9"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/runtime": {
      "version": "7.25.9",
      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.25.9.tgz",
      "integrity": "sha512-4zpTHZ9Cm6L9L+uIqghQX8ZXg8HKFcjYO3qHoO8zTmRm6HQUJ8SSJ+KRvbMBZn0EGVlT4DRYeQ/6hjlyXBh+Kg==",
      "license": "MIT",
      "dependencies": {
        "regenerator-runtime": "^0.14.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.25.9",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.25.9.tgz",
      "integrity": "sha512-OwS2CM5KocvQ/k7dFJa8i5bNGJP0hXWfVCfDkqRFP1IreH1JDC7wG6eCYCi0+McbfT8OR/kNqsI0UU0xP9H6PQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.25.9",
        "@babel/helper-validator-identifier": "^7.25.9"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.21.5.tgz",
      "integrity": "sha512-1SDgH6ZSPTlggy1yI6+Dbkiz8xzpHJEVAlF/AM1tHPLsf5STom9rwtjE4hKAF20FfXXNTFqEYXyJNWh1GiZedQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.21.5.tgz",
      "integrity": "sha512-vCPvzSjpPHEi1siZdlvAlsPxXl7WbOVUBBAowWug4rJHb68Ox8KualB+1ocNvT5fjv6wpkX6o/iEpbDrf68zcg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.21.5.tgz",
      "integrity": "sha512-c0uX9VAUBQ7dTDCjq+wdyGLowMdtR/GoC2U5IYk/7D1H1JYC0qseD7+11iMP2mRLN9RcCMRcjC4YMclCzGwS/A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.21.5.tgz",
      "integrity": "sha512-D7aPRUUNHRBwHxzxRvp856rjUHRFW1SdQATKXH2hqA0kAZb1hKmi02OpYRacl0TxIGz/ZmXWlbZgjwWYaCakTA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.21.5.tgz",
      "integrity": "sha512-DwqXqZyuk5AiWWf3UfLiRDJ5EDd49zg6O9wclZ7kUMv2WRFr4HKjXp/5t8JZ11QbQfUS6/cRCKGwYhtNAY88kQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.21.5.tgz",
      "integrity": "sha512-se/JjF8NlmKVG4kNIuyWMV/22ZaerB+qaSi5MdrXtd6R08kvs2qCN4C09miupktDitvh8jRFflwGFBQcxZRjbw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.21.5.tgz",
      "integrity": "sha512-5JcRxxRDUJLX8JXp/wcBCy3pENnCgBR9bN6JsY4OmhfUtIHe3ZW0mawA7+RDAcMLrMIZaf03NlQiX9DGyB8h4g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.21.5.tgz",
      "integrity": "sha512-J95kNBj1zkbMXtHVH29bBriQygMXqoVQOQYA+ISs0/2l3T9/kj42ow2mpqerRBxDJnmkUDCaQT/dfNXWX/ZZCQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.21.5.tgz",
      "integrity": "sha512-bPb5AHZtbeNGjCKVZ9UGqGwo8EUu4cLq68E95A53KlxAPRmUyYv2D6F0uUI65XisGOL1hBP5mTronbgo+0bFcA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.21.5.tgz",
      "integrity": "sha512-ibKvmyYzKsBeX8d8I7MH/TMfWDXBF3db4qM6sy+7re0YXya+K1cem3on9XgdT2EQGMu4hQyZhan7TeQ8XkGp4Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.21.5.tgz",
      "integrity": "sha512-YvjXDqLRqPDl2dvRODYmmhz4rPeVKYvppfGYKSNGdyZkA01046pLWyRKKI3ax8fbJoK5QbxblURkwK/MWY18Tg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.21.5.tgz",
      "integrity": "sha512-uHf1BmMG8qEvzdrzAqg2SIG/02+4/DHB6a9Kbya0XDvwDEKCoC8ZRWI5JJvNdUjtciBGFQ5PuBlpEOXQj+JQSg==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.21.5.tgz",
      "integrity": "sha512-IajOmO+KJK23bj52dFSNCMsz1QP1DqM6cwLUv3W1QwyxkyIWecfafnI555fvSGqEKwjMXVLokcV5ygHW5b3Jbg==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.21.5.tgz",
      "integrity": "sha512-1hHV/Z4OEfMwpLO8rp7CvlhBDnjsC3CttJXIhBi+5Aj5r+MBvy4egg7wCbe//hSsT+RvDAG7s81tAvpL2XAE4w==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.21.5.tgz",
      "integrity": "sha512-2HdXDMd9GMgTGrPWnJzP2ALSokE/0O5HhTUvWIbD3YdjME8JwvSCnNGBnTThKGEB91OZhzrJ4qIIxk/SBmyDDA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.21.5.tgz",
      "integrity": "sha512-zus5sxzqBJD3eXxwvjN1yQkRepANgxE9lgOW2qLnmr8ikMTphkjgXu1HR01K4FJg8h1kEEDAqDcZQtbrRnB41A==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.21.5.tgz",
      "integrity": "sha512-1rYdTpyv03iycF1+BhzrzQJCdOuAOtaqHTWJZCWvijKD2N5Xu0TtVC8/+1faWqcP9iBCWOmjmhoH94dH82BxPQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.21.5.tgz",
      "integrity": "sha512-Woi2MXzXjMULccIwMnLciyZH4nCIMpWQAs049KEeMvOcNADVxo0UBIQPfSmxB3CWKedngg7sWZdLvLczpe0tLg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.21.5.tgz",
      "integrity": "sha512-HLNNw99xsvx12lFBUwoT8EVCsSvRNDVxNpjZ7bPn947b8gJPzeHWyNVhFsaerc0n3TsbOINvRP2byTZ5LKezow==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.21.5.tgz",
      "integrity": "sha512-6+gjmFpfy0BHU5Tpptkuh8+uw3mnrvgs+dSPQXQOv3ekbordwnzTVEb4qnIvQcYXq6gzkyTnoZ9dZG+D4garKg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.21.5.tgz",
      "integrity": "sha512-Z0gOTd75VvXqyq7nsl93zwahcTROgqvuAcYDUr+vOv8uHhNSKROyU961kgtCD1e95IqPKSQKH7tBTslnS3tA8A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.21.5.tgz",
      "integrity": "sha512-SWXFF1CL2RVNMaVs+BBClwtfZSvDgtL//G/smwAc5oVK/UPu2Gu9tIaRgFmYFFKrmg3SyAjSrElf0TiJ1v8fYA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.21.5.tgz",
      "integrity": "sha512-tQd/1efJuzPC6rCFwEvLtci/xNFcTZknmXs98FYDfGE4wP9ClFV98nyKrzJKVPMhdDnjzLhdUyMX4PsQAPjwIw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.4.0",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.4.0.tgz",
      "integrity": "sha512-1/sA4dwrzBAyeUoQ6oxahHKmrZvsnLCg4RfxW3ZFGGmQkSNQPFNLV9CUEFQP1x9EYXHTo5p6xdhZM1Ne9p/AfA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.3.0"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.11.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.11.1.tgz",
      "integrity": "sha512-m4DVN9ZqskZoLU5GlWZadwDnYo3vAEydiUayB9widCl9ffWx2IvPnp6n3on5rJmziJSw9Bv+Z3ChDVdMwXCY8Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.18.0",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.18.0.tgz",
      "integrity": "sha512-fTxvnS1sRMu3+JjXwJG0j/i4RT9u4qJ+lqS/yCGap4lH4zZGzQ7tu+xZqQmcMZq5OBZDL4QRxQzRjkWcGt8IVw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.4",
        "debug": "^4.3.1",
        "minimatch": "^3.1.2"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.7.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.7.0.tgz",
      "integrity": "sha512-xp5Jirz5DyPYlPiKat8jaq0EmYvDXKKpzTbxXMpT9eqlRJkRKIz9AGMdlvYjih+im+QlhWrpvVjl8IPC/lHlUw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.1.0.tgz",
      "integrity": "sha512-4Bfj15dVJdoy3RfZmmo86RK1Fwzn6SstsvK9JS+BaVKqC6QQQQyXekNaC+g+LKNgkQ+2VhGAzm6hO40AhMR3zQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.12.4",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.1.0",
        "minimatch": "^3.1.2",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.13.0",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.13.0.tgz",
      "integrity": "sha512-IFLyoY4d72Z5y/6o/BazFBezupzI/taV8sGumxTAVw3lXG9A6md1Dc34T9s1FoD/an9pJH8RHbAxsaEbBed9lA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.4.tgz",
      "integrity": "sha512-BsWiH1yFGjXXS2yvrf5LyuoSIIbPrGUWob917o+BTKuZ7qJdxX8aJLRxs1fS9n6r7vESrq1OUqb68dANcFXuQQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.2.3.tgz",
      "integrity": "sha512-2b/g5hRmpbb1o4GnTZax9N9m0FXzz9OV42ZzI4rDDMDuHUqigAiQCEWChBWCY4ztAGVRjoWT19v0yMmc5/L5kA==",
      "dev": true,
      "dependencies": {
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@floating-ui/core": {
      "version": "1.6.8",
      "resolved": "https://registry.npmjs.org/@floating-ui/core/-/core-1.6.8.tgz",
      "integrity": "sha512-7XJ9cPU+yI2QeLS+FCSlqNFZJq8arvswefkZrYI1yQBbftw6FyrZOxYSh+9S7z7TpeWlRt9zJ5IhM1WIL334jA==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/utils": "^0.2.8"
      }
    },
    "node_modules/@floating-ui/dom": {
      "version": "1.6.11",
      "resolved": "https://registry.npmjs.org/@floating-ui/dom/-/dom-1.6.11.tgz",
      "integrity": "sha512-qkMCxSR24v2vGkhYDo/UzxfJN3D4syqSjyuTFz6C7XcpU1pASPRieNI0Kj5VP3/503mOfYiGY891ugBX1GlABQ==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/core": "^1.6.0",
        "@floating-ui/utils": "^0.2.8"
      }
    },
    "node_modules/@floating-ui/react-dom": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/@floating-ui/react-dom/-/react-dom-2.1.2.tgz",
      "integrity": "sha512-06okr5cgPzMNBy+Ycse2A6udMi4bqwW/zgBF/rwjcNqWkyr82Mcg8b0vjX8OJpZFy/FKjJmw6wV7t44kK6kW7A==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/dom": "^1.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8.0",
        "react-dom": ">=16.8.0"
      }
    },
    "node_modules/@floating-ui/utils": {
      "version": "0.2.8",
      "resolved": "https://registry.npmjs.org/@floating-ui/utils/-/utils-0.2.8.tgz",
      "integrity": "sha512-kym7SodPp8/wloecOpcmSnWJsK7M0E5Wg8UcFA+uO4B9s5d0ywXOEro/8HM9x0rW+TljRzul/14UYz3TleT3ig==",
      "license": "MIT"
    },
    "node_modules/@hookform/resolvers": {
      "version": "3.9.0",
      "resolved": "https://registry.npmjs.org/@hookform/resolvers/-/resolvers-3.9.0.tgz",
      "integrity": "sha512-bU0Gr4EepJ/EQsH/IwEzYLsT/PEj5C0ynLQ4m+GSHS+xKH4TfSelhluTgOaoc4kA5s7eCsQbM4wvZLzELmWzUg==",
      "license": "MIT",
      "peerDependencies": {
        "react-hook-form": "^7.0.0"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.0",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.0.tgz",
      "integrity": "sha512-2cbWIHbZVEweE853g8jymffCA+NCMiuqeECeBBLm8dg2oFdjuGJhgN4UAbI+6v0CKbbhvtXA4qV8YR5Ji86nmw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.5",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.5.tgz",
      "integrity": "sha512-KSPA4umqSG4LHYRodq31VDwKAvaTF4xmVlzM8Aeh4PlU1JQ3IG0wiA8C25d3RQ9nJyM3mBHyI53K06VVL/oFFg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.0",
        "@humanwhocodes/retry": "^0.3.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.3.1.tgz",
      "integrity": "sha512-JBxkERygn7Bv/GbN5Rv8Ul6LVknS+5Bp6RgDC/O8gEBU/yeH5Ui5C/OlWrTb6qct7LjjfT6Re2NxB0ln0yYybA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@isaacs/cliui": {
      "version": "8.0.2",
      "resolved": "https://registry.npmjs.org/@isaacs/cliui/-/cliui-8.0.2.tgz",
      "integrity": "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "string-width": "^5.1.2",
        "string-width-cjs": "npm:string-width@^4.2.0",
        "strip-ansi": "^7.0.1",
        "strip-ansi-cjs": "npm:strip-ansi@^6.0.1",
        "wrap-ansi": "^8.1.0",
        "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.5.tgz",
      "integrity": "sha512-IzL8ZoEDIBRWEzlCcRhOaCupYyN5gdIK+Q6fbFdPDg6HqX6jpkItn7DFIpW9LQzXG6Df9sA7+OKnq0qlz/GaQg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/set-array": "^1.2.1",
        "@jridgewell/sourcemap-codec": "^1.4.10",
        "@jridgewell/trace-mapping": "^0.3.24"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/set-array": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@jridgewell/set-array/-/set-array-1.2.1.tgz",
      "integrity": "sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.0.tgz",
      "integrity": "sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.25",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.25.tgz",
      "integrity": "sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@pkgjs/parseargs": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/@pkgjs/parseargs/-/parseargs-0.11.0.tgz",
      "integrity": "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/@radix-ui/number": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/number/-/number-1.1.0.tgz",
      "integrity": "sha512-V3gRzhVNU1ldS5XhAPTom1fOIo4ccrjjJgmE+LI2h/WaFpHmx0MQApT+KZHnx8abG6Avtfcz4WoEciMnpFT3HQ==",
      "license": "MIT"
    },
    "node_modules/@radix-ui/primitive": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/primitive/-/primitive-1.1.0.tgz",
      "integrity": "sha512-4Z8dn6Upk0qk4P74xBhZ6Hd/w0mPEzOOLxy4xiPXOXqjF7jZS0VAKk7/x/H6FyY2zCkYJqePf1G5KmkmNJ4RBA==",
      "license": "MIT"
    },
    "node_modules/@radix-ui/react-accordion": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-accordion/-/react-accordion-1.2.1.tgz",
      "integrity": "sha512-bg/l7l5QzUjgsh8kjwDFommzAshnUsuVMV5NM56QVCm+7ZckYdd9P/ExR8xG/Oup0OajVxNLaHJ1tb8mXk+nzQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collapsible": "1.1.1",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-alert-dialog": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-alert-dialog/-/react-alert-dialog-1.1.2.tgz",
      "integrity": "sha512-eGSlLzPhKO+TErxkiGcCZGuvbVMnLA1MTnyBksGOeGRGkxHiiJUujsjmNTdWTm4iHVSRaUao9/4Ur671auMghQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dialog": "1.1.2",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-arrow": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-arrow/-/react-arrow-1.1.0.tgz",
      "integrity": "sha512-FmlW1rCg7hBpEBwFbjHwCW6AmWLQM6g/v0Sn8XbP9NvmSZ2San1FpQeyPtufzOMSIx7Y4dzjlHoifhp+7NkZhw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-aspect-ratio": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-aspect-ratio/-/react-aspect-ratio-1.1.0.tgz",
      "integrity": "sha512-dP87DM/Y7jFlPgUZTlhx6FF5CEzOiaxp2rBCKlaXlpH5Ip/9Fg5zZ9lDOQ5o/MOfUlf36eak14zoWYpgcgGoOg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-avatar": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-avatar/-/react-avatar-1.1.1.tgz",
      "integrity": "sha512-eoOtThOmxeoizxpX6RiEsQZ2wj5r4+zoeqAwO0cBaFQGjJwIH3dIX0OCxNrCyrrdxG+vBweMETh3VziQG7c1kw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-checkbox": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-checkbox/-/react-checkbox-1.1.2.tgz",
      "integrity": "sha512-/i0fl686zaJbDQLNKrkCbMyDm6FQMt4jg323k7HuqitoANm9sE23Ql8yOK3Wusk34HSLKDChhMux05FnP6KUkw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-use-size": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-collapsible": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-collapsible/-/react-collapsible-1.1.1.tgz",
      "integrity": "sha512-1///SnrfQHJEofLokyczERxQbWfCGQlQ2XsCZMucVs6it+lq9iw4vXy+uDn1edlb58cOZOWSldnfPAYcT4O/Yg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-collection": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-collection/-/react-collection-1.1.0.tgz",
      "integrity": "sha512-GZsZslMJEyo1VKm5L1ZJY8tGDxZNPAoUeQUIbKeJfoi7Q4kmig5AsgLMYYuyYbfjd8fBmFORAIwYAkXMnXZgZw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-collection/node_modules/@radix-ui/react-context": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.0.tgz",
      "integrity": "sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-compose-refs": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-compose-refs/-/react-compose-refs-1.1.0.tgz",
      "integrity": "sha512-b4inOtiaOnYf9KWyO3jAeeCG6FeyfY6ldiEPanbUjWd+xIk5wZeHa8yVwmrJ2vderhu/BQvzCrJI0lHd+wIiqw==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-context": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.1.tgz",
      "integrity": "sha512-UASk9zi+crv9WteK/NU4PLvOoL3OuE6BWVKNF6hPRBtYBDXQ2u5iu3O59zUlJiTVvkyuycnqrztsHVJwcK9K+Q==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-context-menu": {
      "version": "2.2.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context-menu/-/react-context-menu-2.2.2.tgz",
      "integrity": "sha512-99EatSTpW+hRYHt7m8wdDlLtkmTovEe8Z/hnxUPV+SKuuNL5HWNhQI4QSdjZqNSgXHay2z4M3Dym73j9p2Gx5Q==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-menu": "2.1.2",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dialog": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dialog/-/react-dialog-1.1.2.tgz",
      "integrity": "sha512-Yj4dZtqa2o+kG61fzB0H2qUvmwBA2oyQroGLyNtBj1beo1khoQ3q1a2AO8rrQYjd8256CO9+N8L9tvsS+bnIyA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-focus-guards": "1.1.1",
        "@radix-ui/react-focus-scope": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "aria-hidden": "^1.1.1",
        "react-remove-scroll": "2.6.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-direction": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-direction/-/react-direction-1.1.0.tgz",
      "integrity": "sha512-BUuBvgThEiAXh2DWu93XsT+a3aWrGqolGlqqw5VU1kG7p/ZH2cuDlM1sRLNnY3QcBS69UIz2mcKhMxDsdewhjg==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dismissable-layer": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dismissable-layer/-/react-dismissable-layer-1.1.1.tgz",
      "integrity": "sha512-QSxg29lfr/xcev6kSz7MAlmDnzbP1eI/Dwn3Tp1ip0KT5CUELsxkekFEMVBEoykI3oV39hKT4TKZzBNMbcTZYQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-escape-keydown": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-dropdown-menu": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dropdown-menu/-/react-dropdown-menu-2.1.2.tgz",
      "integrity": "sha512-GVZMR+eqK8/Kes0a36Qrv+i20bAPXSn8rCBTHx30w+3ECnR5o3xixAlqcVaYvLeyKUsm0aqyhWfmUcqufM8nYA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-menu": "2.1.2",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-focus-guards": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-guards/-/react-focus-guards-1.1.1.tgz",
      "integrity": "sha512-pSIwfrT1a6sIoDASCSpFwOasEwKTZWDw/iBdtnqKO7v6FeOzYJ7U53cPzYFVR3geGGXgVHaH+CdngrrAzqUGxg==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-focus-scope": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-scope/-/react-focus-scope-1.1.0.tgz",
      "integrity": "sha512-200UD8zylvEyL8Bx+z76RJnASR2gRMuxlgFCPAe/Q/679a/r0eK3MBVYMb7vZODZcffZBdob1EGnky78xmVvcA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-hover-card": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-hover-card/-/react-hover-card-1.1.2.tgz",
      "integrity": "sha512-Y5w0qGhysvmqsIy6nQxaPa6mXNKznfoGjOfBgzOjocLxr2XlSjqBMYQQL+FfyogsMuX+m8cZyQGYhJxvxUzO4w==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-popper": "1.2.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-id": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-id/-/react-id-1.1.0.tgz",
      "integrity": "sha512-EJUrI8yYh7WOjNOqpoJaf1jlFIH2LvtgAl+YcFqNCa+4hj64ZXmPkAKOFs/ukjz3byN6bdb/AVUqHkI8/uWWMA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-label": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-label/-/react-label-2.1.0.tgz",
      "integrity": "sha512-peLblDlFw/ngk3UWq0VnYaOLy6agTZZ+MUO/WhVfm14vJGML+xH4FAl2XQGLqdefjNb7ApRg6Yn7U42ZhmYXdw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-menu": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-menu/-/react-menu-2.1.2.tgz",
      "integrity": "sha512-lZ0R4qR2Al6fZ4yCCZzu/ReTFrylHFxIqy7OezIpWF4bL0o9biKo0pFIvkaew3TyZ9Fy5gYVrR5zCGZBVbO1zg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-focus-guards": "1.1.1",
        "@radix-ui/react-focus-scope": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-popper": "1.2.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-roving-focus": "1.1.0",
        "@radix-ui/react-slot": "1.1.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "aria-hidden": "^1.1.1",
        "react-remove-scroll": "2.6.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-menubar": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-menubar/-/react-menubar-1.1.2.tgz",
      "integrity": "sha512-cKmj5Gte7LVyuz+8gXinxZAZECQU+N7aq5pw7kUPpx3xjnDXDbsdzHtCCD2W72bwzy74AvrqdYnKYS42ueskUQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-menu": "2.1.2",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-roving-focus": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-navigation-menu": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-navigation-menu/-/react-navigation-menu-1.2.1.tgz",
      "integrity": "sha512-egDo0yJD2IK8L17gC82vptkvW1jLeni1VuqCyzY727dSJdk5cDjINomouLoNk8RVF7g2aNIfENKWL4UzeU9c8Q==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-visually-hidden": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-popover": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-popover/-/react-popover-1.1.2.tgz",
      "integrity": "sha512-u2HRUyWW+lOiA2g0Le0tMmT55FGOEWHwPFt1EPfbLly7uXQExFo5duNKqG2DzmFXIdqOeNd+TpE8baHWJCyP9w==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-focus-guards": "1.1.1",
        "@radix-ui/react-focus-scope": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-popper": "1.2.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "aria-hidden": "^1.1.1",
        "react-remove-scroll": "2.6.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-popper": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-popper/-/react-popper-1.2.0.tgz",
      "integrity": "sha512-ZnRMshKF43aBxVWPWvbj21+7TQCvhuULWJ4gNIKYpRlQt5xGRhLx66tMp8pya2UkGHTSlhpXwmjqltDYHhw7Vg==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/react-dom": "^2.0.0",
        "@radix-ui/react-arrow": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0",
        "@radix-ui/react-use-rect": "1.1.0",
        "@radix-ui/react-use-size": "1.1.0",
        "@radix-ui/rect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-popper/node_modules/@radix-ui/react-context": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.0.tgz",
      "integrity": "sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-portal": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-portal/-/react-portal-1.1.2.tgz",
      "integrity": "sha512-WeDYLGPxJb/5EGBoedyJbT0MpoULmwnIPMJMSldkuiMsBAv7N1cRdsTWZWht9vpPOiN3qyiGAtbK2is47/uMFg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-presence": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-presence/-/react-presence-1.1.1.tgz",
      "integrity": "sha512-IeFXVi4YS1K0wVZzXNrbaaUvIJ3qdY+/Ih4eHFhWA9SwGR9UDX7Ck8abvL57C4cv3wwMvUE0OG69Qc3NCcTe/A==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-primitive": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-primitive/-/react-primitive-2.0.0.tgz",
      "integrity": "sha512-ZSpFm0/uHa8zTvKBDjLFWLo8dkr4MBsiDLz0g3gMUwqgLHz9rTaRRGYDgvZPtBJgYCBKXkS9fzmoySgr8CO6Cw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-slot": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-progress": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-progress/-/react-progress-1.1.0.tgz",
      "integrity": "sha512-aSzvnYpP725CROcxAOEBVZZSIQVQdHgBr2QQFKySsaD14u8dNT0batuXI+AAGDdAHfXH8rbnHmjYFqVJ21KkRg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-context": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-progress/node_modules/@radix-ui/react-context": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.0.tgz",
      "integrity": "sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-radio-group": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-radio-group/-/react-radio-group-1.2.1.tgz",
      "integrity": "sha512-kdbv54g4vfRjja9DNWPMxKvXblzqbpEC8kspEkZ6dVP7kQksGCn+iZHkcCz2nb00+lPdRvxrqy4WrvvV1cNqrQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-roving-focus": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-use-size": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-roving-focus": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-roving-focus/-/react-roving-focus-1.1.0.tgz",
      "integrity": "sha512-EA6AMGeq9AEeQDeSH0aZgG198qkfHSbvWTf1HvoDmOB5bBG/qTxjYMWUKMnYiV6J/iP/J8MEFSuB2zRU2n7ODA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.0",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-roving-focus/node_modules/@radix-ui/react-context": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.0.tgz",
      "integrity": "sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-scroll-area": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-scroll-area/-/react-scroll-area-1.2.0.tgz",
      "integrity": "sha512-q2jMBdsJ9zB7QG6ngQNzNwlvxLQqONyL58QbEGwuyRZZb/ARQwk3uQVbCF7GvQVOtV6EU/pDxAw3zRzJZI3rpQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/number": "1.1.0",
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-select": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-select/-/react-select-2.1.2.tgz",
      "integrity": "sha512-rZJtWmorC7dFRi0owDmoijm6nSJH1tVw64QGiNIZ9PNLyBDtG+iAq+XGsya052At4BfarzY/Dhv9wrrUr6IMZA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/number": "1.1.0",
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-focus-guards": "1.1.1",
        "@radix-ui/react-focus-scope": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-popper": "1.2.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-visually-hidden": "1.1.0",
        "aria-hidden": "^1.1.1",
        "react-remove-scroll": "2.6.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-separator": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-separator/-/react-separator-1.1.0.tgz",
      "integrity": "sha512-3uBAs+egzvJBDZAzvb/n4NxxOYpnspmWxO2u5NbZ8Y6FM/NdrGSF9bop3Cf6F6C71z1rTSn8KV0Fo2ZVd79lGA==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-slider": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slider/-/react-slider-1.2.1.tgz",
      "integrity": "sha512-bEzQoDW0XP+h/oGbutF5VMWJPAl/UU8IJjr7h02SOHDIIIxq+cep8nItVNoBV+OMmahCdqdF38FTpmXoqQUGvw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/number": "1.1.0",
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-use-size": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-slot": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.1.0.tgz",
      "integrity": "sha512-FUCf5XMfmW4dtYl69pdS4DbxKy8nj4M7SafBgPllysxmdachynNflAdp/gCsnYWNDnge6tI9onzMp5ARYc1KNw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-compose-refs": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-switch": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-switch/-/react-switch-1.1.1.tgz",
      "integrity": "sha512-diPqDDoBcZPSicYoMWdWx+bCPuTRH4QSp9J+65IvtdS0Kuzt67bI6n32vCj8q6NZmYW/ah+2orOtMwcX5eQwIg==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-previous": "1.1.0",
        "@radix-ui/react-use-size": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-tabs": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-tabs/-/react-tabs-1.1.1.tgz",
      "integrity": "sha512-3GBUDmP2DvzmtYLMsHmpA1GtR46ZDZ+OreXM/N+kkQJOPIgytFWWTfDQmBQKBvaFS0Vno0FktdbVzN28KGrMdw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-roving-focus": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-toast": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-toast/-/react-toast-1.2.2.tgz",
      "integrity": "sha512-Z6pqSzmAP/bFJoqMAston4eSNa+ud44NSZTiZUmUen+IOZ5nBY8kzuU5WDBVyFXPtcW6yUalOHsxM/BP6Sv8ww==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-collection": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-callback-ref": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-use-layout-effect": "1.1.0",
        "@radix-ui/react-visually-hidden": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-toggle": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-toggle/-/react-toggle-1.1.0.tgz",
      "integrity": "sha512-gwoxaKZ0oJ4vIgzsfESBuSgJNdc0rv12VhHgcqN0TEJmmZixXG/2XpsLK8kzNWYcnaoRIEEQc0bEi3dIvdUpjw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-toggle-group": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-toggle-group/-/react-toggle-group-1.1.0.tgz",
      "integrity": "sha512-PpTJV68dZU2oqqgq75Uzto5o/XfOVgkrJ9rulVmfTKxWp3HfUjHE6CP/WLRR4AzPX9HWxw7vFow2me85Yu+Naw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-context": "1.1.0",
        "@radix-ui/react-direction": "1.1.0",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-roving-focus": "1.1.0",
        "@radix-ui/react-toggle": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-toggle-group/node_modules/@radix-ui/react-context": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.1.0.tgz",
      "integrity": "sha512-OKrckBy+sMEgYM/sMmqmErVn0kZqrHPJze+Ql3DzYsDDp0hl0L62nx/2122/Bvps1qz645jlcu2tD9lrRSdf8A==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-tooltip": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-tooltip/-/react-tooltip-1.1.4.tgz",
      "integrity": "sha512-QpObUH/ZlpaO4YgHSaYzrLO2VuO+ZBFFgGzjMUPwtiYnAzzNNDPJeEGRrT7qNOrWm/Jr08M1vlp+vTHtnSQ0Uw==",
      "dependencies": {
        "@radix-ui/primitive": "1.1.0",
        "@radix-ui/react-compose-refs": "1.1.0",
        "@radix-ui/react-context": "1.1.1",
        "@radix-ui/react-dismissable-layer": "1.1.1",
        "@radix-ui/react-id": "1.1.0",
        "@radix-ui/react-popper": "1.2.0",
        "@radix-ui/react-portal": "1.1.2",
        "@radix-ui/react-presence": "1.1.1",
        "@radix-ui/react-primitive": "2.0.0",
        "@radix-ui/react-slot": "1.1.0",
        "@radix-ui/react-use-controllable-state": "1.1.0",
        "@radix-ui/react-visually-hidden": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-callback-ref": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-callback-ref/-/react-use-callback-ref-1.1.0.tgz",
      "integrity": "sha512-CasTfvsy+frcFkbXtSJ2Zu9JHpN8TYKxkgJGWbjiZhFivxaeW7rMeZt7QELGVLaYVfFMsKHjb7Ak0nMEe+2Vfw==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-controllable-state": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-controllable-state/-/react-use-controllable-state-1.1.0.tgz",
      "integrity": "sha512-MtfMVJiSr2NjzS0Aa90NPTnvTSg6C/JLCV7ma0W6+OMV78vd8OyRpID+Ng9LxzsPbLeuBnWBA1Nq30AtBIDChw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-callback-ref": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-escape-keydown": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-escape-keydown/-/react-use-escape-keydown-1.1.0.tgz",
      "integrity": "sha512-L7vwWlR1kTTQ3oh7g1O0CBF3YCyyTj8NmhLR+phShpyA50HCfBFKVJTpshm9PzLiKmehsrQzTYTpX9HvmC9rhw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-callback-ref": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-layout-effect": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-layout-effect/-/react-use-layout-effect-1.1.0.tgz",
      "integrity": "sha512-+FPE0rOdziWSrH9athwI1R0HDVbWlEhd+FR+aSDk4uWGmSJ9Z54sdZVDQPZAinJhJXwfT+qnj969mCsT2gfm5w==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-previous": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-previous/-/react-use-previous-1.1.0.tgz",
      "integrity": "sha512-Z/e78qg2YFnnXcW88A4JmTtm4ADckLno6F7OXotmkQfeuCVaKuYzqAATPhVzl3delXE7CxIV8shofPn3jPc5Og==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-rect": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-rect/-/react-use-rect-1.1.0.tgz",
      "integrity": "sha512-0Fmkebhr6PiseyZlYAOtLS+nb7jLmpqTrJyv61Pe68MKYW6OWdRE2kI70TaYY27u7H0lajqM3hSMMLFq18Z7nQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/rect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-use-size": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-size/-/react-use-size-1.1.0.tgz",
      "integrity": "sha512-XW3/vWuIXHa+2Uwcc2ABSfcCledmXhhQPlGbfcRXbiUQI5Icjcg19BGCZVKKInYbvUCut/ufbbLLPFC5cbb1hw==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-use-layout-effect": "1.1.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/react-visually-hidden": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-visually-hidden/-/react-visually-hidden-1.1.0.tgz",
      "integrity": "sha512-N8MDZqtgCgG5S3aV60INAB475osJousYpZ4cTJ2cFbMpdHS5Y6loLTH8LPtkj2QN0x93J30HT/M3qJXM0+lyeQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-primitive": "2.0.0"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc",
        "react-dom": "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@radix-ui/rect": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@radix-ui/rect/-/rect-1.1.0.tgz",
      "integrity": "sha512-A9+lCBZoaMJlVKcRBz2YByCG+Cp2t6nAnMnNba+XiWxnj6r4JUFqfsgwocMBZU9LPtdxC6wB56ySYpc7LQIoJg==",
      "license": "MIT"
    },
    "node_modules/@react-leaflet/core": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@react-leaflet/core/-/core-2.1.0.tgz",
      "integrity": "sha512-Qk7Pfu8BSarKGqILj4x7bCSZ1pjuAPZ+qmRwH5S7mDS91VSbVVsJSrW4qA+GPrro8t69gFYVMWb1Zc4yFmPiVg==",
      "license": "Hippocratic-2.1",
      "peerDependencies": {
        "leaflet": "^1.9.0",
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    },
    "node_modules/@remix-run/router": {
      "version": "1.20.0",
      "resolved": "https://registry.npmjs.org/@remix-run/router/-/router-1.20.0.tgz",
      "integrity": "sha512-mUnk8rPJBI9loFDZ+YzPGdeniYK+FTmRD1TMCz7ev2SNIozyKKpnGgsxO34u6Z4z/t0ITuu7voi/AshfsGsgFg==",
      "license": "MIT",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.24.0.tgz",
      "integrity": "sha512-Q6HJd7Y6xdB48x8ZNVDOqsbh2uByBhgK8PiQgPhwkIw/HC/YX5Ghq2mQY5sRMZWHb3VsFkWooUVOZHKr7DmDIA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.24.0.tgz",
      "integrity": "sha512-ijLnS1qFId8xhKjT81uBHuuJp2lU4x2yxa4ctFPtG+MqEE6+C5f/+X/bStmxapgmwLwiL3ih122xv8kVARNAZA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.24.0.tgz",
      "integrity": "sha512-bIv+X9xeSs1XCk6DVvkO+S/z8/2AMt/2lMqdQbMrmVpgFvXlmde9mLcbQpztXm1tajC3raFDqegsH18HQPMYtA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.24.0.tgz",
      "integrity": "sha512-X6/nOwoFN7RT2svEQWUsW/5C/fYMBe4fnLK9DQk4SX4mgVBiTA9h64kjUYPvGQ0F/9xwJ5U5UfTbl6BEjaQdBQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.24.0.tgz",
      "integrity": "sha512-0KXvIJQMOImLCVCz9uvvdPgfyWo93aHHp8ui3FrtOP57svqrF/roSSR5pjqL2hcMp0ljeGlU4q9o/rQaAQ3AYA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.24.0.tgz",
      "integrity": "sha512-it2BW6kKFVh8xk/BnHfakEeoLPv8STIISekpoF+nBgWM4d55CZKc7T4Dx1pEbTnYm/xEKMgy1MNtYuoA8RFIWw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.24.0.tgz",
      "integrity": "sha512-i0xTLXjqap2eRfulFVlSnM5dEbTVque/3Pi4g2y7cxrs7+a9De42z4XxKLYJ7+OhE3IgxvfQM7vQc43bwTgPwA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.24.0.tgz",
      "integrity": "sha512-9E6MKUJhDuDh604Qco5yP/3qn3y7SLXYuiC0Rpr89aMScS2UAmK1wHP2b7KAa1nSjWJc/f/Lc0Wl1L47qjiyQw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-powerpc64le-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-powerpc64le-gnu/-/rollup-linux-powerpc64le-gnu-4.24.0.tgz",
      "integrity": "sha512-2XFFPJ2XMEiF5Zi2EBf4h73oR1V/lycirxZxHZNc93SqDN/IWhYYSYj8I9381ikUFXZrz2v7r2tOVk2NBwxrWw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.24.0.tgz",
      "integrity": "sha512-M3Dg4hlwuntUCdzU7KjYqbbd+BLq3JMAOhCKdBE3TcMGMZbKkDdJ5ivNdehOssMCIokNHFOsv7DO4rlEOfyKpg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.24.0.tgz",
      "integrity": "sha512-mjBaoo4ocxJppTorZVKWFpy1bfFj9FeCMJqzlMQGjpNPY9JwQi7OuS1axzNIk0nMX6jSgy6ZURDZ2w0QW6D56g==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.24.0.tgz",
      "integrity": "sha512-ZXFk7M72R0YYFN5q13niV0B7G8/5dcQ9JDp8keJSfr3GoZeXEoMHP/HlvqROA3OMbMdfr19IjCeNAnPUG93b6A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.24.0.tgz",
      "integrity": "sha512-w1i+L7kAXZNdYl+vFvzSZy8Y1arS7vMgIy8wusXJzRrPyof5LAb02KGr1PD2EkRcl73kHulIID0M501lN+vobQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.24.0.tgz",
      "integrity": "sha512-VXBrnPWgBpVDCVY6XF3LEW0pOU51KbaHhccHw6AS6vBWIC60eqsH19DAeeObl+g8nKAz04QFdl/Cefta0xQtUQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.24.0.tgz",
      "integrity": "sha512-xrNcGDU0OxVcPTH/8n/ShH4UevZxKIO6HJFK0e15XItZP2UcaiLFd5kiX7hJnqCbSztUF8Qot+JWBC/QXRPYWQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.24.0.tgz",
      "integrity": "sha512-fbMkAF7fufku0N2dE5TBXcNlg0pt0cJue4xBRE2Qc5Vqikxr4VCgKj/ht6SMdFcOacVA9rqF70APJ8RN/4vMJw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@swc/core": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core/-/core-1.7.39.tgz",
      "integrity": "sha512-jns6VFeOT49uoTKLWIEfiQqJAlyqldNAt80kAr8f7a5YjX0zgnG3RBiLMpksx4Ka4SlK4O6TJ/lumIM3Trp82g==",
      "dev": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@swc/counter": "^0.1.3",
        "@swc/types": "^0.1.13"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/swc"
      },
      "optionalDependencies": {
        "@swc/core-darwin-arm64": "1.7.39",
        "@swc/core-darwin-x64": "1.7.39",
        "@swc/core-linux-arm-gnueabihf": "1.7.39",
        "@swc/core-linux-arm64-gnu": "1.7.39",
        "@swc/core-linux-arm64-musl": "1.7.39",
        "@swc/core-linux-x64-gnu": "1.7.39",
        "@swc/core-linux-x64-musl": "1.7.39",
        "@swc/core-win32-arm64-msvc": "1.7.39",
        "@swc/core-win32-ia32-msvc": "1.7.39",
        "@swc/core-win32-x64-msvc": "1.7.39"
      },
      "peerDependencies": {
        "@swc/helpers": "*"
      },
      "peerDependenciesMeta": {
        "@swc/helpers": {
          "optional": true
        }
      }
    },
    "node_modules/@swc/core-darwin-arm64": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-darwin-arm64/-/core-darwin-arm64-1.7.39.tgz",
      "integrity": "sha512-o2nbEL6scMBMCTvY9OnbyVXtepLuNbdblV9oNJEFia5v5eGj9WMrnRQiylH3Wp/G2NYkW7V1/ZVW+kfvIeYe9A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-darwin-x64": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-darwin-x64/-/core-darwin-x64-1.7.39.tgz",
      "integrity": "sha512-qMlv3XPgtPi/Fe11VhiPDHSLiYYk2dFYl747oGsHZPq+6tIdDQjIhijXPcsUHIXYDyG7lNpODPL8cP/X1sc9MA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-linux-arm-gnueabihf": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-linux-arm-gnueabihf/-/core-linux-arm-gnueabihf-1.7.39.tgz",
      "integrity": "sha512-NP+JIkBs1ZKnpa3Lk2W1kBJMwHfNOxCUJXuTa2ckjFsuZ8OUu2gwdeLFkTHbR43dxGwH5UzSmuGocXeMowra/Q==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-linux-arm64-gnu": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-linux-arm64-gnu/-/core-linux-arm64-gnu-1.7.39.tgz",
      "integrity": "sha512-cPc+/HehyHyHcvAsk3ML/9wYcpWVIWax3YBaA+ScecJpSE04l/oBHPfdqKUPslqZ+Gcw0OWnIBGJT/fBZW2ayw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-linux-arm64-musl": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-linux-arm64-musl/-/core-linux-arm64-musl-1.7.39.tgz",
      "integrity": "sha512-8RxgBC6ubFem66bk9XJ0vclu3exJ6eD7x7CwDhp5AD/tulZslTYXM7oNPjEtje3xxabXuj/bEUMNvHZhQRFdqA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-linux-x64-gnu": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-linux-x64-gnu/-/core-linux-x64-gnu-1.7.39.tgz",
      "integrity": "sha512-3gtCPEJuXLQEolo9xsXtuPDocmXQx12vewEyFFSMSjOfakuPOBmOQMa0sVL8Wwius8C1eZVeD1fgk0omMqeC+Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-linux-x64-musl": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-linux-x64-musl/-/core-linux-x64-musl-1.7.39.tgz",
      "integrity": "sha512-mg39pW5x/eqqpZDdtjZJxrUvQNSvJF4O8wCl37fbuFUqOtXs4TxsjZ0aolt876HXxxhsQl7rS+N4KioEMSgTZw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-win32-arm64-msvc": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-win32-arm64-msvc/-/core-win32-arm64-msvc-1.7.39.tgz",
      "integrity": "sha512-NZwuS0mNJowH3e9bMttr7B1fB8bW5svW/yyySigv9qmV5VcQRNz1kMlCvrCLYRsa93JnARuiaBI6FazSeG8mpA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-win32-ia32-msvc": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-win32-ia32-msvc/-/core-win32-ia32-msvc-1.7.39.tgz",
      "integrity": "sha512-qFmvv5UExbJPXhhvCVDBnjK5Duqxr048dlVB6ZCgGzbRxuarOlawCzzLK4N172230pzlAWGLgn9CWl3+N6zfHA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/core-win32-x64-msvc": {
      "version": "1.7.39",
      "resolved": "https://registry.npmjs.org/@swc/core-win32-x64-msvc/-/core-win32-x64-msvc-1.7.39.tgz",
      "integrity": "sha512-o+5IMqgOtj9+BEOp16atTfBgCogVak9svhBpwsbcJQp67bQbxGYhAPPDW/hZ2rpSSF7UdzbY9wudoX9G4trcuQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "Apache-2.0 AND MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@swc/counter": {
      "version": "0.1.3",
      "resolved": "https://registry.npmjs.org/@swc/counter/-/counter-0.1.3.tgz",
      "integrity": "sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/@swc/types": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/@swc/types/-/types-0.1.13.tgz",
      "integrity": "sha512-JL7eeCk6zWCbiYQg2xQSdLXQJl8Qoc9rXmG2cEKvHe3CKwMHwHGpfOb8frzNLmbycOo6I51qxnLnn9ESf4I20Q==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@swc/counter": "^0.1.3"
      }
    },
    "node_modules/@tailwindcss/typography": {
      "version": "0.5.15",
      "resolved": "https://registry.npmjs.org/@tailwindcss/typography/-/typography-0.5.15.tgz",
      "integrity": "sha512-AqhlCXl+8grUz8uqExv5OTtgpjuVIwFTSXTrh8y9/pw6q2ek7fJ+Y8ZEVw7EB2DCcuCOtEjf9w3+J3rzts01uA==",
      "dev": true,
      "dependencies": {
        "lodash.castarray": "^4.4.0",
        "lodash.isplainobject": "^4.0.6",
        "lodash.merge": "^4.6.2",
        "postcss-selector-parser": "6.0.10"
      },
      "peerDependencies": {
        "tailwindcss": ">=3.0.0 || insiders || >=4.0.0-alpha.20"
      }
    },
    "node_modules/@tailwindcss/typography/node_modules/postcss-selector-parser": {
      "version": "6.0.10",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-6.0.10.tgz",
      "integrity": "sha512-IQ7TZdoaqbT+LCpShg46jnZVlhWD2w6iQYAcYXfHARZ7X1t/UGhhceQDs5X0cGqKvYlHNOuv7Oa1xmb0oQuA3w==",
      "dev": true,
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/@tanstack/query-core": {
      "version": "5.59.16",
      "resolved": "https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.59.16.tgz",
      "integrity": "sha512-crHn+G3ltqb5JG0oUv6q+PMz1m1YkjpASrXTU+sYWW9pLk0t2GybUHNRqYPZWhxgjPaVGC4yp92gSFEJgYEsPw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/tannerlinsley"
      }
    },
    "node_modules/@tanstack/react-query": {
      "version": "5.59.16",
      "resolved": "https://registry.npmjs.org/@tanstack/react-query/-/react-query-5.59.16.tgz",
      "integrity": "sha512-MuyWheG47h6ERd4PKQ6V8gDyBu3ThNG22e1fRVwvq6ap3EqsFhyuxCAwhNP/03m/mLg+DAb0upgbPaX6VB+CkQ==",
      "license": "MIT",
      "dependencies": {
        "@tanstack/query-core": "5.59.16"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/tannerlinsley"
      },
      "peerDependencies": {
        "react": "^18 || ^19"
      }
    },
    "node_modules/@types/d3-array": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/@types/d3-array/-/d3-array-3.2.1.tgz",
      "integrity": "sha512-Y2Jn2idRrLzUfAKV2LyRImR+y4oa2AntrgID95SHJxuMUrkNXmanDSed71sRNZysveJVt1hLLemQZIady0FpEg==",
      "license": "MIT"
    },
    "node_modules/@types/d3-color": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/@types/d3-color/-/d3-color-3.1.3.tgz",
      "integrity": "sha512-iO90scth9WAbmgv7ogoq57O9YpKmFBbmoEoCHDB2xMBY0+/KVrqAaCDyCE16dUspeOvIxFFRI+0sEtqDqy2b4A==",
      "license": "MIT"
    },
    "node_modules/@types/d3-ease": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@types/d3-ease/-/d3-ease-3.0.2.tgz",
      "integrity": "sha512-NcV1JjO5oDzoK26oMzbILE6HW7uVXOHLQvHshBUW4UMdZGfiY6v5BeQwh9a9tCzv+CeefZQHJt5SRgK154RtiA==",
      "license": "MIT"
    },
    "node_modules/@types/d3-interpolate": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@types/d3-interpolate/-/d3-interpolate-3.0.4.tgz",
      "integrity": "sha512-mgLPETlrpVV1YRJIglr4Ez47g7Yxjl1lj7YKsiMCb27VJH9W8NVM6Bb9d8kkpG/uAQS5AmbA48q2IAolKKo1MA==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-color": "*"
      }
    },
    "node_modules/@types/d3-path": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/@types/d3-path/-/d3-path-3.1.0.tgz",
      "integrity": "sha512-P2dlU/q51fkOc/Gfl3Ul9kicV7l+ra934qBFXCFhrZMOL6du1TM0pm1ThYvENukyOn5h9v+yMJ9Fn5JK4QozrQ==",
      "license": "MIT"
    },
    "node_modules/@types/d3-scale": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/@types/d3-scale/-/d3-scale-4.0.8.tgz",
      "integrity": "sha512-gkK1VVTr5iNiYJ7vWDI+yUFFlszhNMtVeneJ6lUTKPjprsvLLI9/tgEGiXJOnlINJA8FyA88gfnQsHbybVZrYQ==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-time": "*"
      }
    },
    "node_modules/@types/d3-shape": {
      "version": "3.1.6",
      "resolved": "https://registry.npmjs.org/@types/d3-shape/-/d3-shape-3.1.6.tgz",
      "integrity": "sha512-5KKk5aKGu2I+O6SONMYSNflgiP0WfZIQvVUMan50wHsLG1G94JlxEVnCpQARfTtzytuY0p/9PXXZb3I7giofIA==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-path": "*"
      }
    },
    "node_modules/@types/d3-time": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/@types/d3-time/-/d3-time-3.0.3.tgz",
      "integrity": "sha512-2p6olUZ4w3s+07q3Tm2dbiMZy5pCDfYwtLXXHUnVzXgQlZ/OyPtUz6OL382BkOuGlLXqfT+wqv8Fw2v8/0geBw==",
      "license": "MIT"
    },
    "node_modules/@types/d3-timer": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@types/d3-timer/-/d3-timer-3.0.2.tgz",
      "integrity": "sha512-Ps3T8E8dZDam6fUyNiMkekK3XUsaUEik+idO9/YjPtfj2qruF8tFBXS7XhtE4iIXBLxhmLjP3SXpLhVf21I9Lw==",
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.6.tgz",
      "integrity": "sha512-AYnb1nQyY49te+VRAVgmzfcgjYS91mY5P0TKUDCLEM+gNnA+3T6rWITXRLYCpahpqSQbN5cE+gHpnPyXjHWxcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/geojson": {
      "version": "7946.0.15",
      "resolved": "https://registry.npmjs.org/@types/geojson/-/geojson-7946.0.15.tgz",
      "integrity": "sha512-9oSxFzDCT2Rj6DfcHF8G++jxBKS7mBqXl5xrRW+Kbvjry6Uduya2iiwqHPhVXpasAVMBYKkEPGgKhd3+/HZ6xA==",
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/leaflet": {
      "version": "1.9.8",
      "resolved": "https://registry.npmjs.org/@types/leaflet/-/leaflet-1.9.8.tgz",
      "integrity": "sha512-EXdsL4EhoUtGm2GC2ZYtXn+Fzc6pluVgagvo2VC1RHWToLGlTRwVYoDpqS/7QXa01rmDyBjJk3Catpf60VMkwg==",
      "license": "MIT",
      "dependencies": {
        "@types/geojson": "*"
      }
    },
    "node_modules/@types/node": {
      "version": "22.7.9",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.7.9.tgz",
      "integrity": "sha512-jrTfRC7FM6nChvU7X2KqcrgquofrWLFDeYC1hKfwNWomVvrn7JIksqf344WN2X/y8xrgqBd2dJATZV4GbatBfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.19.2"
      }
    },
    "node_modules/@types/prop-types": {
      "version": "15.7.13",
      "resolved": "https://registry.npmjs.org/@types/prop-types/-/prop-types-15.7.13.tgz",
      "integrity": "sha512-hCZTSvwbzWGvhqxp/RqVqwU999pBf2vp7hzIjiYOsl8wqOmUxkQ6ddw1cV3l8811+kdUFus/q4d1Y3E3SyEifA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "18.3.12",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-18.3.12.tgz",
      "integrity": "sha512-D2wOSq/d6Agt28q7rSI3jhU7G6aiuzljDGZ2hTZHIkrTLUI+AF3WMeKkEZ9nN2fkBAlcktT6vcZjDFiIhMYEQw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/prop-types": "*",
        "csstype": "^3.0.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-18.3.1.tgz",
      "integrity": "sha512-qW1Mfv8taImTthu4KoXgDfLuk4bydU6Q/TkADnDWWHwi4NX4BR+LWfTp2sVmTqRrsHvyDDTelgelxJ+SsejKKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/react": "*"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.11.0.tgz",
      "integrity": "sha512-KhGn2LjW1PJT2A/GfDpiyOfS4a8xHQv2myUagTM5+zsormOmBlYsnQ6pobJ8XxJmh6hnHwa2Mbe3fPrDJoDhbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/regexpp": "^4.10.0",
        "@typescript-eslint/scope-manager": "8.11.0",
        "@typescript-eslint/type-utils": "8.11.0",
        "@typescript-eslint/utils": "8.11.0",
        "@typescript-eslint/visitor-keys": "8.11.0",
        "graphemer": "^1.4.0",
        "ignore": "^5.3.1",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.0.0 || ^8.0.0-alpha.0",
        "eslint": "^8.57.0 || ^9.0.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.11.0.tgz",
      "integrity": "sha512-lmt73NeHdy1Q/2ul295Qy3uninSqi6wQI18XwSpm8w0ZbQXUpjCAWP1Vlv/obudoBiIjJVjlztjQ+d/Md98Yxg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.11.0",
        "@typescript-eslint/types": "8.11.0",
        "@typescript-eslint/typescript-estree": "8.11.0",
        "@typescript-eslint/visitor-keys": "8.11.0",
        "debug": "^4.3.4"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.11.0.tgz",
      "integrity": "sha512-Uholz7tWhXmA4r6epo+vaeV7yjdKy5QFCERMjs1kMVsLRKIrSdM6o21W2He9ftp5PP6aWOVpD5zvrvuHZC0bMQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.11.0",
        "@typescript-eslint/visitor-keys": "8.11.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.11.0.tgz",
      "integrity": "sha512-ItiMfJS6pQU0NIKAaybBKkuVzo6IdnAhPFZA/2Mba/uBjuPQPet/8+zh5GtLHwmuFRShZx+8lhIs7/QeDHflOg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/typescript-estree": "8.11.0",
        "@typescript-eslint/utils": "8.11.0",
        "debug": "^4.3.4",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.11.0.tgz",
      "integrity": "sha512-tn6sNMHf6EBAYMvmPUaKaVeYvhUsrE6x+bXQTxjQRp360h1giATU0WvgeEys1spbvb5R+VpNOZ+XJmjD8wOUHw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.11.0.tgz",
      "integrity": "sha512-yHC3s1z1RCHoCz5t06gf7jH24rr3vns08XXhfEqzYpd6Hll3z/3g23JRi0jM8A47UFKNc3u/y5KIMx8Ynbjohg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "@typescript-eslint/types": "8.11.0",
        "@typescript-eslint/visitor-keys": "8.11.0",
        "debug": "^4.3.4",
        "fast-glob": "^3.3.2",
        "is-glob": "^4.0.3",
        "minimatch": "^9.0.4",
        "semver": "^7.6.0",
        "ts-api-utils": "^1.3.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.1.tgz",
      "integrity": "sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.5.tgz",
      "integrity": "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.11.0.tgz",
      "integrity": "sha512-CYiX6WZcbXNJV7UNB4PLDIBtSdRmRI/nb0FMyqHPTQD1rMjA0foPLaPUV39C/MxkTd/QKSeX+Gb34PPsDVC35g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.4.0",
        "@typescript-eslint/scope-manager": "8.11.0",
        "@typescript-eslint/types": "8.11.0",
        "@typescript-eslint/typescript-estree": "8.11.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.11.0.tgz",
      "integrity": "sha512-EaewX6lxSjRJnc+99+dqzTeoDZUfyrA52d2/HRrkI830kgovWsmIiTfmr0NZorzqic7ga+1bS60lRBUgR3n/Bw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.11.0",
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@vitejs/plugin-react-swc": {
      "version": "3.7.1",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react-swc/-/plugin-react-swc-3.7.1.tgz",
      "integrity": "sha512-vgWOY0i1EROUK0Ctg1hwhtC3SdcDjZcdit4Ups4aPkDcB1jYhmo+RMYWY87cmXMhvtD5uf8lV89j2w16vkdSVg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@swc/core": "^1.7.26"
      },
      "peerDependencies": {
        "vite": "^4 || ^5"
      }
    },
    "node_modules/acorn": {
      "version": "8.13.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.13.0.tgz",
      "integrity": "sha512-8zSiw54Oxrdym50NlZ9sUusyO1Z1ZchgRLWRaK6c86XJFClyCgFKetdowBg5bKxyp/u+CDBJG4Mpp0m3HLZl9w==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.12.6",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.12.6.tgz",
      "integrity": "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-regex": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.1.0.tgz",
      "integrity": "sha512-7HSX4QQb4CspciLpVFwyRe79O3xsIZDDLER21kERQ71oaPodF8jL725AgJMFAYbooIqolJoRLuM81SpeUkpkvA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/any-promise": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/any-promise/-/any-promise-1.3.0.tgz",
      "integrity": "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/aria-hidden": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/aria-hidden/-/aria-hidden-1.2.4.tgz",
      "integrity": "sha512-y+CcFFwelSXpLZk/7fMB2mUbGtX9lKycf1MWJ7CaTIERyitVlyQx6C+sxcROU2BAJ24OiZyK+8wj2i8AlBoS3A==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/autoprefixer": {
      "version": "10.4.20",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.4.20.tgz",
      "integrity": "sha512-XY25y5xSv/wEoqzDyXXME4AFfkZI0P23z6Fs3YgymDnKJkCGOnkL0iTxCa85UTqaSgfcqyf3UA6+c7wUvx/16g==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.23.3",
        "caniuse-lite": "^1.0.30001646",
        "fraction.js": "^4.3.7",
        "normalize-range": "^0.1.2",
        "picocolors": "^1.0.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.11",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.11.tgz",
      "integrity": "sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.24.2",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.24.2.tgz",
      "integrity": "sha512-ZIc+Q62revdMcqC6aChtW4jz3My3klmCO1fEmINZY/8J3EpBg5/A/D0AKmBveUh6pgoeycoMkVMko84tuYS+Gg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "caniuse-lite": "^1.0.30001669",
        "electron-to-chromium": "^1.5.41",
        "node-releases": "^2.0.18",
        "update-browserslist-db": "^1.1.1"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/camelcase-css": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/camelcase-css/-/camelcase-css-2.0.1.tgz",
      "integrity": "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001669",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001669.tgz",
      "integrity": "sha512-DlWzFDJqstqtIVx1zeSpIMLjunf5SmwOw0N2Ck/QSQdS8PLS4+9HrLaYei4w8BIAL7IB/UEDu889d8vhCTPA0w==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/class-variance-authority": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/class-variance-authority/-/class-variance-authority-0.7.1.tgz",
      "integrity": "sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==",
      "dependencies": {
        "clsx": "^2.1.1"
      },
      "funding": {
        "url": "https://polar.sh/cva"
      }
    },
    "node_modules/clsx": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/cmdk": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/cmdk/-/cmdk-1.0.0.tgz",
      "integrity": "sha512-gDzVf0a09TvoJ5jnuPvygTB77+XdOSwEmJ88L6XPFPlv7T3RxbP9jgenfylrAMD0+Le1aO0nVjQUzl2g+vjz5Q==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-dialog": "1.0.5",
        "@radix-ui/react-primitive": "1.0.3"
      },
      "peerDependencies": {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/primitive": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/primitive/-/primitive-1.0.1.tgz",
      "integrity": "sha512-yQ8oGX2GVsEYMWGxcovu1uGWPCxV5BFfeeYxqPmuAzUyLT9qmaMXSAhXpb0WrspIeqYzdJpkh2vHModJPgRIaw==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-compose-refs": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-compose-refs/-/react-compose-refs-1.0.1.tgz",
      "integrity": "sha512-fDSBgd44FKHa1FRMU59qBMPFcl2PZE+2nmqunj+BWFyYYjnhIDWL2ItDs3rrbJDQOtzt5nIebLCQc4QRfz6LJw==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-context": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-context/-/react-context-1.0.1.tgz",
      "integrity": "sha512-ebbrdFoYTcuZ0v4wG5tedGnp9tzcV8awzsxYph7gXUyvnNLuTIcCk1q17JEbnVhXAKG9oX3KtchwiMIAYp9NLg==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-dialog": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dialog/-/react-dialog-1.0.5.tgz",
      "integrity": "sha512-GjWJX/AUpB703eEBanuBnIWdIXg6NvJFCXcNlSZk4xdszCdhrJgBoUd1cGk67vFO+WdA2pfI/plOpqz/5GUP6Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/primitive": "1.0.1",
        "@radix-ui/react-compose-refs": "1.0.1",
        "@radix-ui/react-context": "1.0.1",
        "@radix-ui/react-dismissable-layer": "1.0.5",
        "@radix-ui/react-focus-guards": "1.0.1",
        "@radix-ui/react-focus-scope": "1.0.4",
        "@radix-ui/react-id": "1.0.1",
        "@radix-ui/react-portal": "1.0.4",
        "@radix-ui/react-presence": "1.0.1",
        "@radix-ui/react-primitive": "1.0.3",
        "@radix-ui/react-slot": "1.0.2",
        "@radix-ui/react-use-controllable-state": "1.0.1",
        "aria-hidden": "^1.1.1",
        "react-remove-scroll": "2.5.5"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-dismissable-layer": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-dismissable-layer/-/react-dismissable-layer-1.0.5.tgz",
      "integrity": "sha512-aJeDjQhywg9LBu2t/At58hCvr7pEm0o2Ke1x33B+MhjNmmZ17sy4KImo0KPLgsnc/zN7GPdce8Cnn0SWvwZO7g==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/primitive": "1.0.1",
        "@radix-ui/react-compose-refs": "1.0.1",
        "@radix-ui/react-primitive": "1.0.3",
        "@radix-ui/react-use-callback-ref": "1.0.1",
        "@radix-ui/react-use-escape-keydown": "1.0.3"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-focus-guards": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-guards/-/react-focus-guards-1.0.1.tgz",
      "integrity": "sha512-Rect2dWbQ8waGzhMavsIbmSVCgYxkXLxxR3ZvCX79JOglzdEy4JXMb98lq4hPxUbLr77nP0UOGf4rcMU+s1pUA==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-focus-scope": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-focus-scope/-/react-focus-scope-1.0.4.tgz",
      "integrity": "sha512-sL04Mgvf+FmyvZeYfNu1EPAaaxD+aw7cYeIB9L9Fvq8+urhltTRaEo5ysKOpHuKPclsZcSUMKlN05x4u+CINpA==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-compose-refs": "1.0.1",
        "@radix-ui/react-primitive": "1.0.3",
        "@radix-ui/react-use-callback-ref": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-id": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-id/-/react-id-1.0.1.tgz",
      "integrity": "sha512-tI7sT/kqYp8p96yGWY1OAnLHrqDgzHefRBKQ2YAkBS5ja7QLcZ9Z/uY7bEjPUatf8RomoXM8/1sMj1IJaE5UzQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-use-layout-effect": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-portal": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-portal/-/react-portal-1.0.4.tgz",
      "integrity": "sha512-Qki+C/EuGUVCQTOTD5vzJzJuMUlewbzuKyUy+/iHM2uwGiru9gZeBJtHAPKAEkB5KWGi9mP/CHKcY0wt1aW45Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-primitive": "1.0.3"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-presence": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-presence/-/react-presence-1.0.1.tgz",
      "integrity": "sha512-UXLW4UAbIY5ZjcvzjfRFo5gxva8QirC9hF7wRE4U5gz+TP0DbRk+//qyuAQ1McDxBt1xNMBTaciFGvEmJvAZCg==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-compose-refs": "1.0.1",
        "@radix-ui/react-use-layout-effect": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-primitive": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-primitive/-/react-primitive-1.0.3.tgz",
      "integrity": "sha512-yi58uVyoAcK/Nq1inRY56ZSjKypBNKTa/1mcL8qdl6oJeEaDbOldlzrGn7P6Q3Id5d+SYNGc5AJgc4vGhjs5+g==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-slot": "1.0.2"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-slot": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-slot/-/react-slot-1.0.2.tgz",
      "integrity": "sha512-YeTpuq4deV+6DusvVUW4ivBgnkHwECUu0BiN43L5UCDFgdhsRUWAghhTF5MbvNTPzmiFOx90asDSUjWuCNapwg==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-compose-refs": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-use-callback-ref": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-callback-ref/-/react-use-callback-ref-1.0.1.tgz",
      "integrity": "sha512-D94LjX4Sp0xJFVaoQOd3OO9k7tpBYNOXdVhkltUbGv2Qb9OXdrg/CpsjlZv7ia14Sylv398LswWBVVu5nqKzAQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-use-controllable-state": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-controllable-state/-/react-use-controllable-state-1.0.1.tgz",
      "integrity": "sha512-Svl5GY5FQeN758fWKrjM6Qb7asvXeiZltlT4U2gVfl8Gx5UAv2sMR0LWo8yhsIZh2oQ0eFdZ59aoOOMV7b47VA==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-use-callback-ref": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-use-escape-keydown": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-escape-keydown/-/react-use-escape-keydown-1.0.3.tgz",
      "integrity": "sha512-vyL82j40hcFicA+M4Ex7hVkB9vHgSse1ZWomAqV2Je3RleKGO5iM8KMOEtfoSB0PnIelMd2lATjTGMYqN5ylTg==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10",
        "@radix-ui/react-use-callback-ref": "1.0.1"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/@radix-ui/react-use-layout-effect": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@radix-ui/react-use-layout-effect/-/react-use-layout-effect-1.0.1.tgz",
      "integrity": "sha512-v/5RegiJWYdoCvMnITBkNNx6bCj20fiaJnWtRkU18yITptraXjffz5Qbn05uOiQnOvi+dbkznkoaMltz1GnszQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.13.10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "react": "^16.8 || ^17.0 || ^18.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/cmdk/node_modules/react-remove-scroll": {
      "version": "2.5.5",
      "resolved": "https://registry.npmjs.org/react-remove-scroll/-/react-remove-scroll-2.5.5.tgz",
      "integrity": "sha512-ImKhrzJJsyXJfBZ4bzu8Bwpka14c/fQt0k+cyFp/PBhTfyDnU5hjOtM4AG/0AMyy8oKzOTR0lDgJIM7pYXI0kw==",
      "license": "MIT",
      "dependencies": {
        "react-remove-scroll-bar": "^2.3.3",
        "react-style-singleton": "^2.2.1",
        "tslib": "^2.1.0",
        "use-callback-ref": "^1.3.0",
        "use-sidecar": "^1.1.2"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/commander/-/commander-4.1.1.tgz",
      "integrity": "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/cssesc": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/cssesc/-/cssesc-3.0.0.tgz",
      "integrity": "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "cssesc": "bin/cssesc"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/csstype": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.1.3.tgz",
      "integrity": "sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==",
      "license": "MIT"
    },
    "node_modules/d3-array": {
      "version": "3.2.4",
      "resolved": "https://registry.npmjs.org/d3-array/-/d3-array-3.2.4.tgz",
      "integrity": "sha512-tdQAmyA18i4J7wprpYq8ClcxZy3SC31QMeByyCFyRt7BVHdREQZ5lpzoe5mFEYZUWe+oq8HBvk9JjpibyEV4Jg==",
      "license": "ISC",
      "dependencies": {
        "internmap": "1 - 2"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-color": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-color/-/d3-color-3.1.0.tgz",
      "integrity": "sha512-zg/chbXyeBtMQ1LbD/WSoW2DpC3I0mpmPdW+ynRTj/x2DAWYrIY7qeZIHidozwV24m4iavr15lNwIwLxRmOxhA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-ease": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-ease/-/d3-ease-3.0.1.tgz",
      "integrity": "sha512-wR/XK3D3XcLIZwpbvQwQ5fK+8Ykds1ip7A2Txe0yxncXSdq1L9skcG7blcedkOX+ZcgxGAmLX1FrRGbADwzi0w==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-format": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-format/-/d3-format-3.1.0.tgz",
      "integrity": "sha512-YyUI6AEuY/Wpt8KWLgZHsIU86atmikuoOmCfommt0LYHiQSPjvX2AcFc38PX0CBpr2RCyZhjex+NS/LPOv6YqA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-interpolate": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-interpolate/-/d3-interpolate-3.0.1.tgz",
      "integrity": "sha512-3bYs1rOD33uo8aqJfKP3JWPAibgw8Zm2+L9vBKEHJ2Rg+viTR7o5Mmv5mZcieN+FRYaAOWX5SJATX6k1PWz72g==",
      "license": "ISC",
      "dependencies": {
        "d3-color": "1 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-path": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-path/-/d3-path-3.1.0.tgz",
      "integrity": "sha512-p3KP5HCf/bvjBSSKuXid6Zqijx7wIfNW+J/maPs+iwR35at5JCbLUT0LzF1cnjbCHWhqzQTIN2Jpe8pRebIEFQ==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-scale": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/d3-scale/-/d3-scale-4.0.2.tgz",
      "integrity": "sha512-GZW464g1SH7ag3Y7hXjf8RoUuAFIqklOAq3MRl4OaWabTFJY9PN/E1YklhXLh+OQ3fM9yS2nOkCoS+WLZ6kvxQ==",
      "license": "ISC",
      "dependencies": {
        "d3-array": "2.10.0 - 3",
        "d3-format": "1 - 3",
        "d3-interpolate": "1.2.0 - 3",
        "d3-time": "2.1.1 - 3",
        "d3-time-format": "2 - 4"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-shape": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/d3-shape/-/d3-shape-3.2.0.tgz",
      "integrity": "sha512-SaLBuwGm3MOViRq2ABk3eLoxwZELpH6zhl3FbAoJ7Vm1gofKx6El1Ib5z23NUEhF9AsGl7y+dzLe5Cw2AArGTA==",
      "license": "ISC",
      "dependencies": {
        "d3-path": "^3.1.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-time": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/d3-time/-/d3-time-3.1.0.tgz",
      "integrity": "sha512-VqKjzBLejbSMT4IgbmVgDjpkYrNWUYJnbCGo874u7MMKIWsILRX+OpX/gTk8MqjpT1A/c6HY2dCA77ZN0lkQ2Q==",
      "license": "ISC",
      "dependencies": {
        "d3-array": "2 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-time-format": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/d3-time-format/-/d3-time-format-4.1.0.tgz",
      "integrity": "sha512-dJxPBlzC7NugB2PDLwo9Q8JiTR3M3e4/XANkreKSUxF8vvXKqm1Yfq4Q5dl8budlunRVlUUaDUgFt7eA8D6NLg==",
      "license": "ISC",
      "dependencies": {
        "d3-time": "1 - 3"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/d3-timer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/d3-timer/-/d3-timer-3.0.1.tgz",
      "integrity": "sha512-ndfJ/JxxMd3nw31uyKoY2naivF+r29V+Lc0svZxe1JvvIRmi8hUsrMvdOwgS1o6uBHmiz91geQ0ylPP0aj1VUA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/date-fns": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/date-fns/-/date-fns-3.6.0.tgz",
      "integrity": "sha512-fRHTG8g/Gif+kSh50gaGEdToemgfj74aRX3swtiouboip5JDLAyDE9F11nHMIcvOaXeOC6D7SpNhi7uFyB7Uww==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/kossnocorp"
      }
    },
    "node_modules/debug": {
      "version": "4.3.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.3.7.tgz",
      "integrity": "sha512-Er2nc/H7RrMXZBFCEim6TCmMk02Z8vLC2Rbi1KEBggpo0fS6l0S1nnapwmIi3yW/+GOJap1Krg4w0Hg80oCqgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decimal.js-light": {
      "version": "2.5.1",
      "resolved": "https://registry.npmjs.org/decimal.js-light/-/decimal.js-light-2.5.1.tgz",
      "integrity": "sha512-qIMFpTMZmny+MMIitAB6D7iVPEorVw6YQRWkvarTkT4tBeSLLiHzcwj6q0MmYSFCiVpiqPJTJEYIrpcPzVEIvg==",
      "license": "MIT"
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/detect-node-es": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/detect-node-es/-/detect-node-es-1.1.0.tgz",
      "integrity": "sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==",
      "license": "MIT"
    },
    "node_modules/didyoumean": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/didyoumean/-/didyoumean-1.2.2.tgz",
      "integrity": "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/dlv": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/dlv/-/dlv-1.1.3.tgz",
      "integrity": "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/dom-helpers": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/dom-helpers/-/dom-helpers-5.2.1.tgz",
      "integrity": "sha512-nRCa7CK3VTrM2NmGkIy4cbK7IZlgBE/PYMn55rrXefr5xXDP0LdtfPnblFDoVdcAfslJ7or6iqAUnx0CCGIWQA==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.8.7",
        "csstype": "^3.0.2"
      }
    },
    "node_modules/eastasianwidth": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/eastasianwidth/-/eastasianwidth-0.2.0.tgz",
      "integrity": "sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.45",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.45.tgz",
      "integrity": "sha512-vOzZS6uZwhhbkZbcRyiy99Wg+pYFV5hk+5YaECvx0+Z31NR3Tt5zS6dze2OepT6PCTzVzT0dIJItti+uAW5zmw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/embla-carousel": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/embla-carousel/-/embla-carousel-8.3.0.tgz",
      "integrity": "sha512-Ve8dhI4w28qBqR8J+aMtv7rLK89r1ZA5HocwFz6uMB/i5EiC7bGI7y+AM80yAVUJw3qqaZYK7clmZMUR8kM3UA==",
      "license": "MIT"
    },
    "node_modules/embla-carousel-react": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/embla-carousel-react/-/embla-carousel-react-8.3.0.tgz",
      "integrity": "sha512-P1FlinFDcIvggcErRjNuVqnUR8anyo8vLMIH8Rthgofw7Nj8qTguCa2QjFAbzxAUTQTPNNjNL7yt0BGGinVdFw==",
      "license": "MIT",
      "dependencies": {
        "embla-carousel": "8.3.0",
        "embla-carousel-reactive-utils": "8.3.0"
      },
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.1 || ^18.0.0"
      }
    },
    "node_modules/embla-carousel-reactive-utils": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/embla-carousel-reactive-utils/-/embla-carousel-reactive-utils-8.3.0.tgz",
      "integrity": "sha512-EYdhhJ302SC4Lmkx8GRsp0sjUhEN4WyFXPOk0kGu9OXZSRMmcBlRgTvHcq8eKJE1bXWBsOi1T83B+BSSVZSmwQ==",
      "license": "MIT",
      "peerDependencies": {
        "embla-carousel": "8.3.0"
      }
    },
    "node_modules/emoji-regex": {
      "version": "9.2.2",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-9.2.2.tgz",
      "integrity": "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/esbuild": {
      "version": "0.21.5",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.21.5.tgz",
      "integrity": "sha512-mg3OPMV4hXywwpoDxu3Qda5xCKQi+vCTZq8S9J/EpkhB2HzKXq4SNFZE3+NK93JYxc8VMSep+lOUSC/RVKaBqw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=12"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.21.5",
        "@esbuild/android-arm": "0.21.5",
        "@esbuild/android-arm64": "0.21.5",
        "@esbuild/android-x64": "0.21.5",
        "@esbuild/darwin-arm64": "0.21.5",
        "@esbuild/darwin-x64": "0.21.5",
        "@esbuild/freebsd-arm64": "0.21.5",
        "@esbuild/freebsd-x64": "0.21.5",
        "@esbuild/linux-arm": "0.21.5",
        "@esbuild/linux-arm64": "0.21.5",
        "@esbuild/linux-ia32": "0.21.5",
        "@esbuild/linux-loong64": "0.21.5",
        "@esbuild/linux-mips64el": "0.21.5",
        "@esbuild/linux-ppc64": "0.21.5",
        "@esbuild/linux-riscv64": "0.21.5",
        "@esbuild/linux-s390x": "0.21.5",
        "@esbuild/linux-x64": "0.21.5",
        "@esbuild/netbsd-x64": "0.21.5",
        "@esbuild/openbsd-x64": "0.21.5",
        "@esbuild/sunos-x64": "0.21.5",
        "@esbuild/win32-arm64": "0.21.5",
        "@esbuild/win32-ia32": "0.21.5",
        "@esbuild/win32-x64": "0.21.5"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.13.0",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.13.0.tgz",
      "integrity": "sha512-EYZK6SX6zjFHST/HRytOdA/zE72Cq/bfw45LSyuwrdvcclb/gqV8RRQxywOBEWO2+WDpva6UZa4CcDeJKzUCFA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.2.0",
        "@eslint-community/regexpp": "^4.11.0",
        "@eslint/config-array": "^0.18.0",
        "@eslint/core": "^0.7.0",
        "@eslint/eslintrc": "^3.1.0",
        "@eslint/js": "9.13.0",
        "@eslint/plugin-kit": "^0.2.0",
        "@humanfs/node": "^0.16.5",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.3.1",
        "@types/estree": "^1.0.6",
        "@types/json-schema": "^7.0.15",
        "ajv": "^6.12.4",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.2",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.1.0",
        "eslint-visitor-keys": "^4.1.0",
        "espree": "^10.2.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.2",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3",
        "text-table": "^0.2.0"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "5.1.0-rc-fb9a90fa48-20240614",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-5.1.0-rc-fb9a90fa48-20240614.tgz",
      "integrity": "sha512-xsiRwaDNF5wWNC4ZHLut+x/YcAxksUd9Rizt7LaEn3bV8VyYRpXnRJQlLOfYaVy9esk4DFP4zPPnoNVjq5Gc0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react-refresh": {
      "version": "0.4.14",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.4.14.tgz",
      "integrity": "sha512-aXvzCTK7ZBv1e7fahFuR3Z/fyQQSIQ711yPgYRj+Oj64tyTgO4iQIDmYXDBqvSWQ/FA4OSCsXOStlF+noU0/NA==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "eslint": ">=7"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.1.0.tgz",
      "integrity": "sha512-14dSvlhaVhKKsa9Fx1l8A17s7ah7Ef7wCakJ10LYk6+GYmP9yDti2oq2SEwcyndt6knfcZyhyxwY3i9yL78EQw==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.1.0.tgz",
      "integrity": "sha512-Q7lok0mqMUSf5a/AdAZkA5a/gHcO6snwQClVNNvFKCAVlxXucdU8pKydU5ZVZjBx5xr37vGbFFWtLQYreLzrZg==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "10.2.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.2.0.tgz",
      "integrity": "sha512-upbkBJbckcCNBDBDXEbuhjbP68n+scUd3k/U2EkyM9nw+I/jPiL4cLF/Al06CF96wRltFda16sxDFrxsI1v0/g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.12.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.1.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.6.0.tgz",
      "integrity": "sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estree-walker": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-3.0.3.tgz",
      "integrity": "sha512-7RUKfXgSMMkzt6ZuXmqapOurLGPPfgj6l9uRZ7lRGolvk0y2yocc35LdcxKC5PQZdn2DMqioAQ2NoWcrTKmm6g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "^1.0.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/eventemitter3": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/eventemitter3/-/eventemitter3-4.0.7.tgz",
      "integrity": "sha512-8guHBZCwKnFhYdHr2ysuRWErTwhoN2X8XELRlrRwpmfeY2jjuUN4taQMsULKUVo1K4DvZl+0pgfyoysHxvmvEw==",
      "license": "MIT"
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-equals": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/fast-equals/-/fast-equals-5.0.1.tgz",
      "integrity": "sha512-WF1Wi8PwwSY7/6Kx0vKXtw8RwuSGoM1bvDaJbu7MxDlR1vovZjIAKrnzyrThgAjm6JDTu0fVgWXDlMGspodfoQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/fast-glob": {
      "version": "3.3.2",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.2.tgz",
      "integrity": "sha512-oX2ruAFQwf/Orj8m737Y5adxDQO0LAB7/S5MnxCdTNDd4p6BsyIVsv9JQsATbTSq8KHRpLwIHbVlUNatxd+1Ow==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.4"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fastq": {
      "version": "1.17.1",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.17.1.tgz",
      "integrity": "sha512-sRVD3lWVIXWg6By68ZN7vho9a1pQcN/WBFaAAsDDFzlJjvoGx0P8z7V1t72grFJfJhu3YPZBuu25f7Kaw2jN1w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.3.1.tgz",
      "integrity": "sha512-X8cqMLLie7KsNUDSdzeN8FYK9rEt4Dt67OsG/DNGnYTSDBG4uFAJFBnUeiV+zCVAvwFy56IjM9sH51jVaEhNxw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/foreground-child": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/foreground-child/-/foreground-child-3.3.0.tgz",
      "integrity": "sha512-Ld2g8rrAyMYFXBhEqMz8ZAHBi4J4uS1i/CxGMDnjyFWddMXLVcDp051DZfu+t7+ab7Wv6SMqpWmyFIj5UbfFvg==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "cross-spawn": "^7.0.0",
        "signal-exit": "^4.0.1"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/fraction.js": {
      "version": "4.3.7",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-4.3.7.tgz",
      "integrity": "sha512-ZsDfxO51wGAXREY55a7la9LScWpwv9RxIrYABrlvOFBlH/ShPnrtsXeuUIfXKKOVicNxQ+o8JTbJvjS4M89yew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "patreon",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-nonce": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-nonce/-/get-nonce-1.0.1.tgz",
      "integrity": "sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/glob": {
      "version": "10.4.5",
      "resolved": "https://registry.npmjs.org/glob/-/glob-10.4.5.tgz",
      "integrity": "sha512-7Bv8RF0k6xjo7d4A/PxYLbUCfb6c+Vpd2/mB2yRDlew7Jb5hEXiCD9ibfO7wpk8i4sevK6DFny9h7EYbM3/sHg==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "foreground-child": "^3.1.0",
        "jackspeak": "^3.1.2",
        "minimatch": "^9.0.4",
        "minipass": "^7.1.2",
        "package-json-from-dist": "^1.0.0",
        "path-scurry": "^1.11.1"
      },
      "bin": {
        "glob": "dist/esm/bin.mjs"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/glob/node_modules/brace-expansion": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.1.tgz",
      "integrity": "sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/glob/node_modules/minimatch": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.5.tgz",
      "integrity": "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/globals": {
      "version": "15.11.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-15.11.0.tgz",
      "integrity": "sha512-yeyNSjdbyVaWurlwCpcA6XNBrHTMIeDdj0/hnvX/OLJ9ekOXYbLsLinH/MucQyGvNnXhidTdNhTtJaffL2sMfw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/graphemer": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/graphemer/-/graphemer-1.4.0.tgz",
      "integrity": "sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.0.tgz",
      "integrity": "sha512-veYYhQa+D1QBKznvhUHxb8faxlrwUnxseDAbAp457E0wLNio2bOSKnjYDhMj+YiAq61xrMGhQk9iXVk5FzgQMw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/input-otp": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/input-otp/-/input-otp-1.2.4.tgz",
      "integrity": "sha512-md6rhmD+zmMnUh5crQNSQxq3keBRYvE3odbr4Qb9g2NWzQv9azi+t1a3X4TBTbh98fsGHgEEJlzbe1q860uGCA==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      }
    },
    "node_modules/internmap": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/internmap/-/internmap-2.0.3.tgz",
      "integrity": "sha512-5Hh7Y1wQbvY5ooGgPbDaL5iYLAPzMTUrjMulskHLH6wnv/A+1q5rgEaiuqEjB+oxGXIVZs1FF+R/KPN3ZSQYYg==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/invariant": {
      "version": "2.2.4",
      "resolved": "https://registry.npmjs.org/invariant/-/invariant-2.2.4.tgz",
      "integrity": "sha512-phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns//LaXl6wGYtUBY83nWS6Rf9tXm2e8VaK60JEjYldbPif/A2B1C2gNA==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.0.0"
      }
    },
    "node_modules/is-binary-path": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-binary-path/-/is-binary-path-2.1.0.tgz",
      "integrity": "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "binary-extensions": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.15.1",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.15.1.tgz",
      "integrity": "sha512-z0vtXSwucUJtANQWldhbtbt7BnL0vxiFjIdDLAatwhDYty2bad6s+rijD6Ri4YuYJubLzIJLUidCh09e1djEVQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/jackspeak": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/jackspeak/-/jackspeak-3.4.3.tgz",
      "integrity": "sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "@isaacs/cliui": "^8.0.2"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      },
      "optionalDependencies": {
        "@pkgjs/parseargs": "^0.11.0"
      }
    },
    "node_modules/jiti": {
      "version": "1.21.6",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-1.21.6.tgz",
      "integrity": "sha512-2yTgeWTWzMWkHu6Jp9NKgePDaYHbntiwvYuuJLbbN9vl7DC9DvXKOB2BC3ZZ92D3cvV/aflH0osDfwpHepQ53w==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "bin/jiti.js"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.0.tgz",
      "integrity": "sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/leaflet": {
      "version": "1.9.4",
      "resolved": "https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz",
      "integrity": "sha512-nxS1ynzJOmOlHp+iL3FyWqK89GtNL8U8rvlMOsQdTTssxZwCXh8N2NB3GDQOL+YR3XnWyZAxwQixURb+FA74PA==",
      "license": "BSD-2-Clause"
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lilconfig": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-2.1.0.tgz",
      "integrity": "sha512-utWOt/GHzuUxnLKxB6dk81RoOeoNeHgbrXiuGk4yyF5qlRz+iIVWu56E2fqGHFrXz0QNUhLB/8nKqvRH66JKGQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/lines-and-columns": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/lines-and-columns/-/lines-and-columns-1.2.4.tgz",
      "integrity": "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==",
      "license": "MIT"
    },
    "node_modules/lodash.castarray": {
      "version": "4.4.0",
      "resolved": "https://registry.npmjs.org/lodash.castarray/-/lodash.castarray-4.4.0.tgz",
      "integrity": "sha512-aVx8ztPv7/2ULbArGJ2Y42bG1mEQ5mGjpdvrbJcJFU3TbYybe+QlLS4pst9zV52ymy2in1KpFPiZnAOATxD4+Q==",
      "dev": true
    },
    "node_modules/lodash.isplainobject": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz",
      "integrity": "sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==",
      "dev": true
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lovable-tagger": {
      "version": "1.0.19",
      "resolved": "https://registry.npmjs.org/lovable-tagger/-/lovable-tagger-1.0.19.tgz",
      "integrity": "sha512-G2Oa2QItJ8X+7hMQcdWL3r4faKBE5DU/aQZEwpVJyVfOs/4gBi4ScGhqVxm7abRrMHj7pf7h+8VQfxBLTiLbLQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.25.9",
        "@babel/types": "^7.25.8",
        "estree-walker": "^3.0.3",
        "magic-string": "^0.30.12"
      },
      "peerDependencies": {
        "vite": "^5.0.0"
      }
    },
    "node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/lucide-react": {
      "version": "0.462.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-0.462.0.tgz",
      "integrity": "sha512-NTL7EbAao9IFtuSivSZgrAh4fZd09Lr+6MTkqIxuHaH2nnYiYIzXPo06cOxHg9wKLdj6LL8TByG4qpePqwgx/g==",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0-rc"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.12",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.12.tgz",
      "integrity": "sha512-Ea8I3sQMVXr8JhN4z+H/d8zwo+tYDgHE9+5G4Wnrwhs0gaK9fXTKx0Tw5Xwsd/bCPTTZNRAdpyzvoeORe9LYpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0"
      }
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.2",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.2.tgz",
      "integrity": "sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/mz": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/mz/-/mz-2.7.0.tgz",
      "integrity": "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0",
        "object-assign": "^4.0.1",
        "thenify-all": "^1.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.7",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.7.tgz",
      "integrity": "sha512-eSRppjcPIatRIMC1U6UngP8XFcz8MQWGQdt1MTBQ7NaAmvXDfvNxbvWV3x2y6CdEUciCSsDHDQZbhYaB8QEo2g==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/next-themes": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/next-themes/-/next-themes-0.3.0.tgz",
      "integrity": "sha512-/QHIrsYpd6Kfk7xakK4svpDI5mmXP0gfvCoJdGpZQ2TOrQZmsW0QxjaiLn8wbIKjtm4BTSqLoix4lxYYOnLJ/w==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8 || ^17 || ^18",
        "react-dom": "^16.8 || ^17 || ^18"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.18",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.18.tgz",
      "integrity": "sha512-d9VeXT4SJ7ZeOqGX6R5EM022wpL+eWPooLI+5UpWn2jCT1aosUQEhQP214x33Wkwx3JQMvIm+tIoVOdodFS40g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/normalize-range": {
      "version": "0.1.2",
      "resolved": "https://registry.npmjs.org/normalize-range/-/normalize-range-0.1.2.tgz",
      "integrity": "sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-hash": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/object-hash/-/object-hash-3.0.0.tgz",
      "integrity": "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/package-json-from-dist": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/package-json-from-dist/-/package-json-from-dist-1.0.1.tgz",
      "integrity": "sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==",
      "dev": true,
      "license": "BlueOak-1.0.0"
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/path-scurry": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-1.11.1.tgz",
      "integrity": "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "lru-cache": "^10.2.0",
        "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0"
      },
      "engines": {
        "node": ">=16 || 14 >=14.18"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.1.tgz",
      "integrity": "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pify": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/pify/-/pify-2.3.0.tgz",
      "integrity": "sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/pirates": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/pirates/-/pirates-4.0.6.tgz",
      "integrity": "sha512-saLsH7WeYYPiD25LDuLRRY/i+6HaPYr6G1OUlN39otzkSTxKnubR9RTxS3/Kk50s1g2JTgFwWQDQyplC5/SHZg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/postcss": {
      "version": "8.4.47",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.4.47.tgz",
      "integrity": "sha512-56rxCq7G/XfB4EkXq9Egn5GCqugWvDFjafDOThIdMBsI15iqPqR5r15TfSr1YPYeEI19YeaXMCbY6u88Y76GLQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.7",
        "picocolors": "^1.1.0",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-import": {
      "version": "15.1.0",
      "resolved": "https://registry.npmjs.org/postcss-import/-/postcss-import-15.1.0.tgz",
      "integrity": "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "postcss-value-parser": "^4.0.0",
        "read-cache": "^1.0.0",
        "resolve": "^1.1.7"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "postcss": "^8.0.0"
      }
    },
    "node_modules/postcss-js": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/postcss-js/-/postcss-js-4.0.1.tgz",
      "integrity": "sha512-dDLF8pEO191hJMtlHFPRa8xsizHaM82MLfNkUHdUtVEV3tgTp5oj+8qbEqYM57SLfc74KSbw//4SeJma2LRVIw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "camelcase-css": "^2.0.1"
      },
      "engines": {
        "node": "^12 || ^14 || >= 16"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/postcss/"
      },
      "peerDependencies": {
        "postcss": "^8.4.21"
      }
    },
    "node_modules/postcss-load-config": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/postcss-load-config/-/postcss-load-config-4.0.2.tgz",
      "integrity": "sha512-bSVhyJGL00wMVoPUzAVAnbEoWyqRxkjv64tUl427SKnPrENtq6hJwUojroMz2VB+Q1edmi4IfrAPpami5VVgMQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "lilconfig": "^3.0.0",
        "yaml": "^2.3.4"
      },
      "engines": {
        "node": ">= 14"
      },
      "peerDependencies": {
        "postcss": ">=8.0.9",
        "ts-node": ">=9.0.0"
      },
      "peerDependenciesMeta": {
        "postcss": {
          "optional": true
        },
        "ts-node": {
          "optional": true
        }
      }
    },
    "node_modules/postcss-load-config/node_modules/lilconfig": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-3.1.2.tgz",
      "integrity": "sha512-eop+wDAvpItUys0FWkHIKeC9ybYrTGbU41U5K7+bttZZeohvnY7M9dZ5kB21GNWiFT2q1OoPTvncPCgSOVO5ow==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/antonk52"
      }
    },
    "node_modules/postcss-nested": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/postcss-nested/-/postcss-nested-6.2.0.tgz",
      "integrity": "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "postcss-selector-parser": "^6.1.1"
      },
      "engines": {
        "node": ">=12.0"
      },
      "peerDependencies": {
        "postcss": "^8.2.14"
      }
    },
    "node_modules/postcss-selector-parser": {
      "version": "6.1.2",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-6.1.2.tgz",
      "integrity": "sha512-Q8qQfPiZ+THO/3ZrOrO0cJJKfpYCagtMUkXbnEfmgUjwXg6z/WBeOyS9APBBPCTSiDV+s4SwQGu8yFsiMRIudg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/prop-types": {
      "version": "15.8.1",
      "resolved": "https://registry.npmjs.org/prop-types/-/prop-types-15.8.1.tgz",
      "integrity": "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.4.0",
        "object-assign": "^4.1.1",
        "react-is": "^16.13.1"
      }
    },
    "node_modules/prop-types/node_modules/react-is": {
      "version": "16.13.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz",
      "integrity": "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==",
      "license": "MIT"
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/react": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react/-/react-18.3.1.tgz",
      "integrity": "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-day-picker": {
      "version": "8.10.1",
      "resolved": "https://registry.npmjs.org/react-day-picker/-/react-day-picker-8.10.1.tgz",
      "integrity": "sha512-TMx7fNbhLk15eqcMt+7Z7S2KF7mfTId/XJDjKE8f+IUcFn0l08/kI4FiYTL/0yuOLmEcbR4Fwe3GJf/NiiMnPA==",
      "license": "MIT",
      "funding": {
        "type": "individual",
        "url": "https://github.com/sponsors/gpbl"
      },
      "peerDependencies": {
        "date-fns": "^2.28.0 || ^3.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/react-dom": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-18.3.1.tgz",
      "integrity": "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0",
        "scheduler": "^0.23.2"
      },
      "peerDependencies": {
        "react": "^18.3.1"
      }
    },
    "node_modules/react-hook-form": {
      "version": "7.53.1",
      "resolved": "https://registry.npmjs.org/react-hook-form/-/react-hook-form-7.53.1.tgz",
      "integrity": "sha512-6aiQeBda4zjcuaugWvim9WsGqisoUk+etmFEsSUMm451/Ic8L/UAb7sRtMj3V+Hdzm6mMjU1VhiSzYUZeBm0Vg==",
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/react-hook-form"
      },
      "peerDependencies": {
        "react": "^16.8.0 || ^17 || ^18 || ^19"
      }
    },
    "node_modules/react-is": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-18.3.1.tgz",
      "integrity": "sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==",
      "license": "MIT"
    },
    "node_modules/react-leaflet": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/react-leaflet/-/react-leaflet-4.2.1.tgz",
      "integrity": "sha512-p9chkvhcKrWn/H/1FFeVSqLdReGwn2qmiobOQGO3BifX+/vV/39qhY8dGqbdcPh1e6jxh/QHriLXr7a4eLFK4Q==",
      "license": "Hippocratic-2.1",
      "dependencies": {
        "@react-leaflet/core": "^2.1.0"
      },
      "peerDependencies": {
        "leaflet": "^1.9.0",
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    },
    "node_modules/react-remove-scroll": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/react-remove-scroll/-/react-remove-scroll-2.6.0.tgz",
      "integrity": "sha512-I2U4JVEsQenxDAKaVa3VZ/JeJZe0/2DxPWL8Tj8yLKctQJQiZM52pn/GWFpSp8dftjM3pSAHVJZscAnC/y+ySQ==",
      "license": "MIT",
      "dependencies": {
        "react-remove-scroll-bar": "^2.3.6",
        "react-style-singleton": "^2.2.1",
        "tslib": "^2.1.0",
        "use-callback-ref": "^1.3.0",
        "use-sidecar": "^1.1.2"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-remove-scroll-bar": {
      "version": "2.3.6",
      "resolved": "https://registry.npmjs.org/react-remove-scroll-bar/-/react-remove-scroll-bar-2.3.6.tgz",
      "integrity": "sha512-DtSYaao4mBmX+HDo5YWYdBWQwYIQQshUV/dVxFxK+KM26Wjwp1gZ6rv6OC3oujI6Bfu6Xyg3TwK533AQutsn/g==",
      "license": "MIT",
      "dependencies": {
        "react-style-singleton": "^2.2.1",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-resizable-panels": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/react-resizable-panels/-/react-resizable-panels-2.1.5.tgz",
      "integrity": "sha512-JMSe18rYupmx+dzYcdfWYZ93ZdxqQmLum3xWDVSUMI0UVwl9bB9gUaFmPbxYoO4G+m5sqgdXQCYQxnOysytfnw==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc",
        "react-dom": "^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc"
      }
    },
    "node_modules/react-router": {
      "version": "6.27.0",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-6.27.0.tgz",
      "integrity": "sha512-YA+HGZXz4jaAkVoYBE98VQl+nVzI+cVI2Oj/06F5ZM+0u3TgedN9Y9kmMRo2mnkSK2nCpNQn0DVob4HCsY/WLw==",
      "license": "MIT",
      "dependencies": {
        "@remix-run/router": "1.20.0"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8"
      }
    },
    "node_modules/react-router-dom": {
      "version": "6.27.0",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-6.27.0.tgz",
      "integrity": "sha512-+bvtFWMC0DgAFrfKXKG9Fc+BcXWRUO1aJIihbB79xaeq0v5UzfvnM5houGUm1Y461WVRcgAQ+Clh5rdb1eCx4g==",
      "license": "MIT",
      "dependencies": {
        "@remix-run/router": "1.20.0",
        "react-router": "6.27.0"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "react": ">=16.8",
        "react-dom": ">=16.8"
      }
    },
    "node_modules/react-smooth": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/react-smooth/-/react-smooth-4.0.1.tgz",
      "integrity": "sha512-OE4hm7XqR0jNOq3Qmk9mFLyd6p2+j6bvbPJ7qlB7+oo0eNcL2l7WQzG6MBnT3EXY6xzkLMUBec3AfewJdA0J8w==",
      "license": "MIT",
      "dependencies": {
        "fast-equals": "^5.0.1",
        "prop-types": "^15.8.1",
        "react-transition-group": "^4.4.5"
      },
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react-dom": "^16.8.0 || ^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/react-style-singleton": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/react-style-singleton/-/react-style-singleton-2.2.1.tgz",
      "integrity": "sha512-ZWj0fHEMyWkHzKYUr2Bs/4zU6XLmq9HsgBURm7g5pAVfyn49DgUiNgY2d4lXRlYSiCif9YBGpQleewkcqddc7g==",
      "license": "MIT",
      "dependencies": {
        "get-nonce": "^1.0.0",
        "invariant": "^2.2.4",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-transition-group": {
      "version": "4.4.5",
      "resolved": "https://registry.npmjs.org/react-transition-group/-/react-transition-group-4.4.5.tgz",
      "integrity": "sha512-pZcd1MCJoiKiBR2NRxeCRg13uCXbydPnmB4EOeRrY7480qNWO8IIgQG6zlDkm6uRMsURXPuKq0GWtiM59a5Q6g==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@babel/runtime": "^7.5.5",
        "dom-helpers": "^5.0.1",
        "loose-envify": "^1.4.0",
        "prop-types": "^15.6.2"
      },
      "peerDependencies": {
        "react": ">=16.6.0",
        "react-dom": ">=16.6.0"
      }
    },
    "node_modules/read-cache": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/read-cache/-/read-cache-1.0.0.tgz",
      "integrity": "sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "pify": "^2.3.0"
      }
    },
    "node_modules/readdirp": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-3.6.0.tgz",
      "integrity": "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "picomatch": "^2.2.1"
      },
      "engines": {
        "node": ">=8.10.0"
      }
    },
    "node_modules/recharts": {
      "version": "2.13.0",
      "resolved": "https://registry.npmjs.org/recharts/-/recharts-2.13.0.tgz",
      "integrity": "sha512-sbfxjWQ+oLWSZEWmvbq/DFVdeRLqqA6d0CDjKx2PkxVVdoXo16jvENCE+u/x7HxOO+/fwx//nYRwb8p8X6s/lQ==",
      "license": "MIT",
      "dependencies": {
        "clsx": "^2.0.0",
        "eventemitter3": "^4.0.1",
        "lodash": "^4.17.21",
        "react-is": "^18.3.1",
        "react-smooth": "^4.0.0",
        "recharts-scale": "^0.4.4",
        "tiny-invariant": "^1.3.1",
        "victory-vendor": "^36.6.8"
      },
      "engines": {
        "node": ">=14"
      },
      "peerDependencies": {
        "react": "^16.0.0 || ^17.0.0 || ^18.0.0",
        "react-dom": "^16.0.0 || ^17.0.0 || ^18.0.0"
      }
    },
    "node_modules/recharts-scale": {
      "version": "0.4.5",
      "resolved": "https://registry.npmjs.org/recharts-scale/-/recharts-scale-0.4.5.tgz",
      "integrity": "sha512-kivNFO+0OcUNu7jQquLXAxz1FIwZj8nrj+YkOKc5694NbjCvcT6aSZiIzNzd2Kul4o4rTto8QVR9lMNtxD4G1w==",
      "license": "MIT",
      "dependencies": {
        "decimal.js-light": "^2.4.1"
      }
    },
    "node_modules/regenerator-runtime": {
      "version": "0.14.1",
      "resolved": "https://registry.npmjs.org/regenerator-runtime/-/regenerator-runtime-0.14.1.tgz",
      "integrity": "sha512-dYnhHh0nJoMfnkZs6GmmhFknAGRrLznOu5nc9ML+EJxGvrx6H7teuevqVqCuPcPK//3eDrrjQhehXVx9cnkGdw==",
      "license": "MIT"
    },
    "node_modules/resolve": {
      "version": "1.22.8",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.8.tgz",
      "integrity": "sha512-oKWePCxqpd6FlLvGV1VU0x7bkPmmCNolxzjMf4NczoDnQcIWrAF+cPtZn5i6n+RfD2d9i0tzpKnG6Yk168yIyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-core-module": "^2.13.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/reusify": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.0.4.tgz",
      "integrity": "sha512-U9nH88a3fc/ekCF1l0/UP1IosiuIjyTh7hBvXVMHYgVcfGvt897Xguj2UOLDeI5BG2m7/uwyaLVT6fbtCwTyzw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rollup": {
      "version": "4.24.0",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.24.0.tgz",
      "integrity": "sha512-DOmrlGSXNk1DM0ljiQA+i+o0rSLhtii1je5wgk60j49d1jHT5YYttBv1iWOnYSTG+fZZESUOSNiAl89SIet+Cg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.6"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.24.0",
        "@rollup/rollup-android-arm64": "4.24.0",
        "@rollup/rollup-darwin-arm64": "4.24.0",
        "@rollup/rollup-darwin-x64": "4.24.0",
        "@rollup/rollup-linux-arm-gnueabihf": "4.24.0",
        "@rollup/rollup-linux-arm-musleabihf": "4.24.0",
        "@rollup/rollup-linux-arm64-gnu": "4.24.0",
        "@rollup/rollup-linux-arm64-musl": "4.24.0",
        "@rollup/rollup-linux-powerpc64le-gnu": "4.24.0",
        "@rollup/rollup-linux-riscv64-gnu": "4.24.0",
        "@rollup/rollup-linux-s390x-gnu": "4.24.0",
        "@rollup/rollup-linux-x64-gnu": "4.24.0",
        "@rollup/rollup-linux-x64-musl": "4.24.0",
        "@rollup/rollup-win32-arm64-msvc": "4.24.0",
        "@rollup/rollup-win32-ia32-msvc": "4.24.0",
        "@rollup/rollup-win32-x64-msvc": "4.24.0",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/scheduler": {
      "version": "0.23.2",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.23.2.tgz",
      "integrity": "sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.1.0"
      }
    },
    "node_modules/semver": {
      "version": "7.6.3",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.6.3.tgz",
      "integrity": "sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/signal-exit": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-4.1.0.tgz",
      "integrity": "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==",
      "dev": true,
      "license": "ISC",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/sonner": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/sonner/-/sonner-1.5.0.tgz",
      "integrity": "sha512-FBjhG/gnnbN6FY0jaNnqZOMmB73R+5IiyYAw8yBj7L54ER7HB3fOSE5OFiQiE2iXWxeXKvg6fIP4LtVppHEdJA==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-5.1.2.tgz",
      "integrity": "sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eastasianwidth": "^0.2.0",
        "emoji-regex": "^9.2.2",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width-cjs": {
      "name": "string-width",
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/string-width-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.1.0.tgz",
      "integrity": "sha512-iq6eVVI64nQQTRYq2KtEg2d2uU7LElhTJwsH4YzIHZshxlgZms/wIc4VoDQTlG/IvVIrBKG06CrZnp0qv7hkcQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-ansi-cjs": {
      "name": "strip-ansi",
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/sucrase": {
      "version": "3.35.0",
      "resolved": "https://registry.npmjs.org/sucrase/-/sucrase-3.35.0.tgz",
      "integrity": "sha512-8EbVDiu9iN/nESwxeSxDKe0dunta1GOlHufmSSXxMD2z2/tMZpDMpvXQGsc+ajGo8y2uYUmixaSRUc/QPoQ0GA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.2",
        "commander": "^4.0.0",
        "glob": "^10.3.10",
        "lines-and-columns": "^1.1.6",
        "mz": "^2.7.0",
        "pirates": "^4.0.1",
        "ts-interface-checker": "^0.1.9"
      },
      "bin": {
        "sucrase": "bin/sucrase",
        "sucrase-node": "bin/sucrase-node"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tailwind-merge": {
      "version": "2.5.4",
      "resolved": "https://registry.npmjs.org/tailwind-merge/-/tailwind-merge-2.5.4.tgz",
      "integrity": "sha512-0q8cfZHMu9nuYP/b5Shb7Y7Sh1B7Nnl5GqNr1U+n2p6+mybvRtayrQ+0042Z5byvTA8ihjlP8Odo8/VnHbZu4Q==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/dcastil"
      }
    },
    "node_modules/tailwindcss": {
      "version": "3.4.14",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.14.tgz",
      "integrity": "sha512-IcSvOcTRcUtQQ7ILQL5quRDg7Xs93PdJEk1ZLbhhvJc7uj/OAhYOnruEiwnGgBvUtaUAJ8/mhSw1o8L2jCiENA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "arg": "^5.0.2",
        "chokidar": "^3.5.3",
        "didyoumean": "^1.2.2",
        "dlv": "^1.1.3",
        "fast-glob": "^3.3.0",
        "glob-parent": "^6.0.2",
        "is-glob": "^4.0.3",
        "jiti": "^1.21.0",
        "lilconfig": "^2.1.0",
        "micromatch": "^4.0.5",
        "normalize-path": "^3.0.0",
        "object-hash": "^3.0.0",
        "picocolors": "^1.0.0",
        "postcss": "^8.4.23",
        "postcss-import": "^15.1.0",
        "postcss-js": "^4.0.1",
        "postcss-load-config": "^4.0.1",
        "postcss-nested": "^6.0.1",
        "postcss-selector-parser": "^6.0.11",
        "resolve": "^1.22.2",
        "sucrase": "^3.32.0"
      },
      "bin": {
        "tailwind": "lib/cli.js",
        "tailwindcss": "lib/cli.js"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/tailwindcss-animate": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/tailwindcss-animate/-/tailwindcss-animate-1.0.7.tgz",
      "integrity": "sha512-bl6mpH3T7I3UFxuvDEXLxy/VuFxBk5bbzplh7tXI68mwMokNYd1t9qPBHlnyTwfa4JGC4zP516I1hYYtQ/vspA==",
      "license": "MIT",
      "peerDependencies": {
        "tailwindcss": ">=3.0.0 || insiders"
      }
    },
    "node_modules/text-table": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/text-table/-/text-table-0.2.0.tgz",
      "integrity": "sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/thenify": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/thenify/-/thenify-3.3.1.tgz",
      "integrity": "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0"
      }
    },
    "node_modules/thenify-all": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/thenify-all/-/thenify-all-1.6.0.tgz",
      "integrity": "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "thenify": ">= 3.1.0 < 4"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/tiny-invariant": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/tiny-invariant/-/tiny-invariant-1.3.3.tgz",
      "integrity": "sha512-+FbBPE1o9QAYvviau/qC5SE3caw21q3xkvWKBtja5vgqOWIHHJ3ioaq1VPfn/Szqctz2bU/oYeKd9/z5BL+PVg==",
      "license": "MIT"
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/ts-api-utils": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-1.3.0.tgz",
      "integrity": "sha512-UQMIo7pb8WRomKR1/+MFVLTroIvDVtMX3K6OUir8ynLyzB8Jeriont2bTAtmNPa1ekAgN7YPDyf6V+ygrdU+eQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=16"
      },
      "peerDependencies": {
        "typescript": ">=4.2.0"
      }
    },
    "node_modules/ts-interface-checker": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/ts-interface-checker/-/ts-interface-checker-0.1.13.tgz",
      "integrity": "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/tslib": {
      "version": "2.8.0",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.0.tgz",
      "integrity": "sha512-jWVzBLplnCmoaTr13V9dYbiQ99wvZRd0vNWaDRg+aVYRcjDF3nDksxFDE/+fkXnKhpnUUkmx5pK/v8mCtLVqZA==",
      "license": "0BSD"
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/typescript": {
      "version": "5.6.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.6.3.tgz",
      "integrity": "sha512-hjcS1mhfuyi4WW8IWtjP7brDrG2cuDZukyrYrSauoXGNgx0S7zceP07adYkJycEr56BOUTNPzbInooiN3fn1qw==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/typescript-eslint": {
      "version": "8.11.0",
      "resolved": "https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.11.0.tgz",
      "integrity": "sha512-cBRGnW3FSlxaYwU8KfAewxFK5uzeOAp0l2KebIlPDOT5olVi65KDG/yjBooPBG0kGW/HLkoz1c/iuBFehcS3IA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "8.11.0",
        "@typescript-eslint/parser": "8.11.0",
        "@typescript-eslint/utils": "8.11.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/undici-types": {
      "version": "6.19.8",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.19.8.tgz",
      "integrity": "sha512-ve2KP6f/JnbPBFyobGHuerC9g1FYGn/F8n1LWTwNxCEzd6IfqTwUQcNXgEtmmQ6DlRrC1hrSrBnCZPokRrDHjw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/update-browserslist-db": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.1.1.tgz",
      "integrity": "sha512-R8UzCaa9Az+38REPiJ1tXlImTJXlVfgHZsglwBD/k6nj76ctsH1E3q4doGrukiLQd3sGQYu56r5+lo5r94l29A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.0"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/use-callback-ref": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/use-callback-ref/-/use-callback-ref-1.3.2.tgz",
      "integrity": "sha512-elOQwe6Q8gqZgDA8mrh44qRTQqpIHDcZ3hXTLjBe1i4ph8XpNJnO+aQf3NaG+lriLopI4HMx9VjQLfPQ6vhnoA==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.8.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/use-sidecar": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/use-sidecar/-/use-sidecar-1.1.2.tgz",
      "integrity": "sha512-epTbsLuzZ7lPClpz2TyryBfztm7m+28DlEv2ZCQ3MDr5ssiwyOwGH/e5F9CkfWjJ1t4clvI58yF822/GUkjjhw==",
      "license": "MIT",
      "dependencies": {
        "detect-node-es": "^1.1.0",
        "tslib": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "^16.9.0 || ^17.0.0 || ^18.0.0",
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/vaul": {
      "version": "0.9.9",
      "resolved": "https://registry.npmjs.org/vaul/-/vaul-0.9.9.tgz",
      "integrity": "sha512-7afKg48srluhZwIkaU+lgGtFCUsYBSGOl8vcc8N/M3YQlZFlynHD15AE+pwrYdc826o7nrIND4lL9Y6b9WWZZQ==",
      "license": "MIT",
      "dependencies": {
        "@radix-ui/react-dialog": "^1.1.1"
      },
      "peerDependencies": {
        "react": "^16.8 || ^17.0 || ^18.0",
        "react-dom": "^16.8 || ^17.0 || ^18.0"
      }
    },
    "node_modules/victory-vendor": {
      "version": "36.9.2",
      "resolved": "https://registry.npmjs.org/victory-vendor/-/victory-vendor-36.9.2.tgz",
      "integrity": "sha512-PnpQQMuxlwYdocC8fIJqVXvkeViHYzotI+NJrCuav0ZYFoq912ZHBk3mCeuj+5/VpodOjPe1z0Fk2ihgzlXqjQ==",
      "license": "MIT AND ISC",
      "dependencies": {
        "@types/d3-array": "^3.0.3",
        "@types/d3-ease": "^3.0.0",
        "@types/d3-interpolate": "^3.0.1",
        "@types/d3-scale": "^4.0.2",
        "@types/d3-shape": "^3.1.0",
        "@types/d3-time": "^3.0.0",
        "@types/d3-timer": "^3.0.0",
        "d3-array": "^3.1.6",
        "d3-ease": "^3.0.1",
        "d3-interpolate": "^3.0.1",
        "d3-scale": "^4.0.2",
        "d3-shape": "^3.1.0",
        "d3-time": "^3.0.0",
        "d3-timer": "^3.0.1"
      }
    },
    "node_modules/vite": {
      "version": "5.4.10",
      "resolved": "https://registry.npmjs.org/vite/-/vite-5.4.10.tgz",
      "integrity": "sha512-1hvaPshuPUtxeQ0hsVH3Mud0ZanOLwVTneA1EgbAM5LhaZEqyPWGRQ7BtaMvUrTDeEaC8pxtj6a6jku3x4z6SQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "^0.21.3",
        "postcss": "^8.4.43",
        "rollup": "^4.20.0"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^18.0.0 || >=20.0.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^18.0.0 || >=20.0.0",
        "less": "*",
        "lightningcss": "^1.21.0",
        "sass": "*",
        "sass-embedded": "*",
        "stylus": "*",
        "sugarss": "*",
        "terser": "^5.4.0"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        }
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-8.1.0.tgz",
      "integrity": "sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^6.1.0",
        "string-width": "^5.0.1",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs": {
      "name": "wrap-ansi",
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/wrap-ansi-cjs/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi/node_modules/ansi-styles": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-6.2.1.tgz",
      "integrity": "sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/yaml": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/yaml/-/yaml-2.6.0.tgz",
      "integrity": "sha512-a6ae//JvKDEra2kdi1qzCyrJW/WZCgFi8ydDV+eXExl95t+5R+ijnqHJbz9tmMh8FUjx3iv2fCQ4dclAQlO2UQ==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "yaml": "bin.mjs"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "3.23.8",
      "resolved": "https://registry.npmjs.org/zod/-/zod-3.23.8.tgz",
      "integrity": "sha512-XBx9AXhXktjUqnepgTiE5flcKIYWi/rme0Eaj+5Y0lftuGBq+jyRu/md4WnuxqgP1ubdpNCsYEYPxrzVHD8d6g==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    }
  }
}
```


## package.json

```json
{
  "name": "vite_react_shadcn_ts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-hover-card": "^1.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.1",
    "@radix-ui/react-navigation-menu": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@tanstack/react-query": "^5.56.2",
    "@types/leaflet": "^1.9.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.3.0",
    "input-otp": "^1.2.4",
    "leaflet": "^1.9.4",
    "lodash": "^4.17.21",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-leaflet": "^4.2.1",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react-swc": "^3.5.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "lovable-tagger": "^1.0.19",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^5.4.1"
  }
}
```


## postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```


## README.md

```md
# Welcome to the RoadWise Project

RoadWise is a project that helps you to drive safely and efficiently:
- it lets you define your destination
- once set, it will track your position and speed
- and detect the curve ahead and provide you optimal speed and assist in braking

You can test the latest version online: https://roadwise-helper.lovable.app/

Note that the project run locally - no information regarding your GPS position is shared online.
Also this is a functional WPA web site, you can easily install the app on your phone.

> ⚠️ **Warning**: This is an educational project. It is not a production ready software, nor something you can trust for driving. Be careful and drive safely, and look at the road, not at your phone.


## Installation

> ⚠️ **Warning**: This project is still in development. Some features might not work as expected, and breaking changes could occur without notice.

Before building the project, make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher recommended).

Then, follow these steps:

```sh
# Clone the repository
git clone [repository-url]
cd roadwise

# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will start at http://localhost:8080

## Building the Project

To build the project for production:

```sh
# Create a production build
npm run build

# Preview the production build locally
npm run preview
```

The build output will be in the `dist` directory, ready for deployment.


## Technical Documentation

See [docs/tech-overview.md](docs/tech-overview.md) for more details.

> This project is an attempt to test capabilities of AI code generation tools. The main service used to create the application is Lovable (https://lovable.dev). Gemini2 helped for some work on calculations, and also to generate the technical documentation. I also use Cursor & Claude for local editing to fine tune some algorithms.

## To Do

- [ ] Add a 3D route mode, where drive can see the road ahead in subjective view, with colors indicating braking distance abd other usefull informations...
- [ ] Display the distance to next trun in arge font so we can easily see it
- [ ] Review the CurveAnalyzer in order to better detect "long curves", especially on high speed road: use some cumulative angular metric to spot them ?
- [ ] Add some voice feedback to alert the user that need to brake, next turn, etc...
- [ ] Fix the RoadInfo part so we can accurately compute legal speed, detect urban zone entering / exit, Highway...
- [ ] Add feedback analysis: record the driver trip, allow to replay / compare actual speed with prediction
- [ ] Compute a driving safety score based on delta between prediction / actual speed
- [ ] Better metrics for vehcile using IMU ? or estimate lateral acceleration ?
- [ ] Compute a driving economy score based on speed, acceleration, braking, etc... where the score aims to optimize consumption (or autonomy for EV)
- [ ] Build a real native version?
- [ ] Add a "free ride" mode, where the user can drive anywhere, and the app will not provide any speed advice
- [ ] Add a "autonomous driving" mode, where the user can set a destination, and the app will drive there automatically (;))

## Project contribution

This project has been built using Lovable assistant. See https://lovable.dev/projects/a633e3e6-d831-417c-ad56-2d4b003fa9d9
```


## tailwind.config.ts

```ts
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
```


## tsconfig.app.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": false,
    "noFallthroughCasesInSwitch": false,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```


## tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
}
```


## tsconfig.node.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```


## vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

