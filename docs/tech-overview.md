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