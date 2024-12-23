import { useState } from 'react';
import TopPanel from './layout/TopPanel';
import SearchArea from './layout/SearchArea';
import MapArea from './layout/MapArea';
import StatusBar from './StatusBar';

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
  positionHistory,
}: MainLayoutProps) => {
  const [isSearchMode, setIsSearchMode] = useState(false);

  const handleDestinationClick = () => {
    if (destination) {
      const mapView = document.querySelector('.leaflet-container');
      if (mapView) {
        const event = new CustomEvent('zoomToDestination', {
          detail: { location: destination.location }
        });
        mapView.dispatchEvent(event);
      }
    }
  };

  const handleMapClick = (location: [number, number], address: string) => {
    onDestinationSelect(location, address);
  };

  return (
    <div className="h-screen flex flex-col">
      <TopPanel 
        speed={speed}
        recommendedSpeed={recommendedSpeed}
        isOnRoad={isOnRoad}
        isDebugMode={isDebugMode}
        destination={destination}
        onDestinationSelect={onDestinationSelect}
        onDestinationClick={handleDestinationClick}
        onSearchModeChange={setIsSearchMode}
        isSearchMode={isSearchMode}
      />

      {isSearchMode ? (
        <SearchArea 
          onLocationSelect={(location, address) => {
            onDestinationSelect(location, address);
            setIsSearchMode(false);
          }}
        />
      ) : (
        <MapArea 
          position={position}
          speed={speed}
          onRoadStatusChange={onRoadStatusChange}
          destination={destination?.location}
          routePoints={routePoints}
          onMapClick={handleMapClick}
          positionHistory={positionHistory}
        />
      )}

      <StatusBar 
        isOnRoad={isOnRoad}
        speed={speed}
        isDebugMode={isDebugMode}
        onDebugModeChange={onDebugModeChange}
      />
    </div>
  );
};

export default MainLayout;