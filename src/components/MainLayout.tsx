import TopPanel from './layout/TopPanel';
import MapArea from './layout/MapArea';
import StatusBar from './StatusBar';
import SearchArea from './layout/SearchArea';
import { useState, useEffect } from 'react';
import { vehicleOversamplingService } from '../services/VehicleOversamplingService';
import { routePlannerService } from '../services/route/RoutePlannerService';
import { LocationService } from '../services/location/LocationService';
import { VehicleState } from '../services/VehicleStateManager';
import { RouteState } from '../services/route/RoutePlannerTypes';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { RoadPrediction } from '@/services/prediction/PredictionTypes';

const MainLayout = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'drive' | 'roadbook'>('map');
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleOversamplingService.getState());
  const [routeState, setRouteState] = useState<RouteState>(routePlannerService.getState());
  const [isOnRoad, setIsOnRoad] = useState(false);
  const [prediction, setPrediction] = useState<RoadPrediction | null>(roadPredictor.getCurrentPrediction());
  const [isRoadPredictorActive, setIsRoadPredictorActive] = useState(roadPredictor.getIsActive());

  // GPS mode: ne pas redémarrer sur chaque changement de routePoints
  useEffect(() => {
    if (isDebugMode) return;
    const locationService = LocationService.getInstance();
    locationService.setMode('gps');
    locationService.startUpdates();
    return () => {
      locationService.stopUpdates();
    };
  }, [isDebugMode]);

  // Simulation/debug mode: redémarrer si routePoints change
  useEffect(() => {
    if (!isDebugMode) return;
    const locationService = LocationService.getInstance();
    locationService.setMode('simulation');
    locationService.startUpdates(routeState.routePoints);
    return () => {
      locationService.stopUpdates();
    };
  }, [isDebugMode, routeState.routePoints]);

  useEffect(() => {
    const handleVehicleUpdate = (state: VehicleState) => {
      setVehicleState(state);
    };

    const handleRouteUpdate = (state: RouteState) => {
      setRouteState(state);
    };

    vehicleOversamplingService.addObserver(handleVehicleUpdate);
    routePlannerService.addObserver(handleRouteUpdate);

    return () => {
      vehicleOversamplingService.removeObserver(handleVehicleUpdate);
      routePlannerService.removeObserver(handleRouteUpdate);
    };
  }, []);

  useEffect(() => {
    const handlePredictionUpdate = (prediction: RoadPrediction | null) => {
      setPrediction(prediction);
      setIsOnRoad(true);
    };

    const handleStateUpdate = (active: boolean) => {
      setIsRoadPredictorActive(active);
    };

    roadPredictor.addObserver(handlePredictionUpdate);
    roadPredictor.addStateObserver(handleStateUpdate);

    return () => {
      roadPredictor.removeObserver(handlePredictionUpdate);
      roadPredictor.removeStateObserver(handleStateUpdate);
    };
  }, []);

  const handleDestinationSelect = (location: [number, number], address: string) => {
    console.log('[MainLayout] New destination selected:', { location, address });
    routePlannerService.setDestination(location, address);
    setIsSearchMode(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopPanel
        speed={vehicleState.speed}
        recommendedSpeed={0}
        isOnRoad={isOnRoad}
        isDebugMode={isDebugMode}
        destination={routeState.destination}
        onDestinationSelect={handleDestinationSelect}
        onDestinationClick={() => setIsSearchMode(true)}
        onSearchModeChange={setIsSearchMode}
        isSearchMode={isSearchMode}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
        speedLimit={prediction?.speedLimit}
        optimalSpeed={prediction?.optimalSpeed}
        prediction={prediction}
        isRoadPredictorActive={isRoadPredictorActive}
      />
      <div className="flex-1 relative">
        {isSearchMode ? (
          <SearchArea onLocationSelect={handleDestinationSelect} />
        ) : (
          <MapArea
            onRoadStatusChange={setIsOnRoad}
            viewMode={viewMode}
          />
        )}
      </div>
      <StatusBar 
        isOnRoad={isOnRoad} 
        speed={vehicleState.speed}
        isDebugMode={isDebugMode} 
        onDebugModeChange={setIsDebugMode}
        position={vehicleState.position}
      />
    </div>
  );
};

export default MainLayout;