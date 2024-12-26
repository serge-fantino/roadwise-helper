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