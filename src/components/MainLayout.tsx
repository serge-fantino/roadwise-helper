import TopPanel from './layout/TopPanel';
import MapArea from './layout/MapArea';
import StatusBar from './StatusBar';
import SearchArea from './layout/SearchArea';
import { useState, useEffect } from 'react';
import { routePlannerService } from '../services/RoutePlannerService';
import { RouteState } from '../services/route/RoutePlannerTypes';

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
  onDestinationSelect,
  onRoadStatusChange,
  isDebugMode,
  onDebugModeChange,
  positionHistory
}: MainLayoutProps) => {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [routeState, setRouteState] = useState<RouteState>({
    origin: null,
    destination: null,
    routePoints: [],
    routeColor: '#3B82F6' // Added missing routeColor property
  });

  // Observer pour le RoutePlannerService
  useEffect(() => {
    const handleRouteUpdate = (state: RouteState) => {
      console.log('[MainLayout] Route state updated:', state);
      setRouteState(state);
      
      // Mettre à jour le composant parent via onDestinationSelect si nécessaire
      if (state.destination && (!destination || 
          state.destination.location[0] !== destination.location[0] || 
          state.destination.location[1] !== destination.location[1])) {
        onDestinationSelect(state.destination.location, state.destination.address);
      }
    };

    routePlannerService.addObserver(handleRouteUpdate);
    return () => routePlannerService.removeObserver(handleRouteUpdate);
  }, [destination, onDestinationSelect]);

  // Mettre à jour l'origine quand la position change
  useEffect(() => {
    routePlannerService.setOrigin(position);
  }, [position]);

  const handleDestinationSelect = (location: [number, number], address: string) => {
    console.log('[MainLayout] New destination selected:', { location, address });
    routePlannerService.setDestination(location, address);
    setIsSearchMode(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopPanel
        speed={speed}
        recommendedSpeed={recommendedSpeed}
        isOnRoad={isOnRoad}
        isDebugMode={isDebugMode}
        destination={routeState.destination}
        onDestinationSelect={handleDestinationSelect}
        onDestinationClick={() => setIsSearchMode(true)}
        onSearchModeChange={setIsSearchMode}
        isSearchMode={isSearchMode}
      />
      <div className="flex-1 relative">
        {isSearchMode ? (
          <SearchArea onLocationSelect={handleDestinationSelect} />
        ) : (
          <MapArea
            position={position}
            speed={speed}
            onRoadStatusChange={onRoadStatusChange}
            destination={routeState.destination?.location}
            routePoints={routeState.routePoints}
            onMapClick={handleDestinationSelect}
            positionHistory={positionHistory}
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