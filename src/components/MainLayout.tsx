import { ReactNode, useState } from 'react';
import MapView from './MapView';
import SpeedPanel from './SpeedPanel';
import DestinationPanel from './DestinationPanel';
import AddressSearch from './AddressSearch';
import { Toggle } from './ui/toggle';
import { Bug } from 'lucide-react';

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
      {/* Speed Panel */}
      <div className="h-28 bg-gray-900 p-4">
        <SpeedPanel 
          currentSpeed={speed} 
          recommendedSpeed={recommendedSpeed}
          isOnRoad={isOnRoad}
          isDebugMode={isDebugMode}
          onDebugModeChange={onDebugModeChange}
        />
      </div>

      {/* Address Search */}
      <div className="h-16 bg-gray-900 p-4">
        <DestinationPanel 
          destination={destination} 
          onDestinationSelect={onDestinationSelect}
          onDestinationClick={handleDestinationClick}
          onSearchModeChange={setIsSearchMode}
          isSearchMode={isSearchMode}
        />
      </div>

      {isSearchMode ? (
        <div className="flex-1 bg-gray-900 p-4">
          <div className="max-w-xl mx-auto">
            <AddressSearch 
              onLocationSelect={(location, address) => {
                onDestinationSelect(location, address);
                setIsSearchMode(false);
              }}
              fullScreen
            />
          </div>
        </div>
      ) : (
        <>
          {/* Map View */}
          <div className="flex-1">
            <MapView 
              position={position} 
              speed={speed} 
              onRoadStatusChange={onRoadStatusChange}
              destination={destination?.location}
              routePoints={routePoints}
              onMapClick={handleMapClick}
              positionHistory={positionHistory}
            />
          </div>
        </>
      )}

      {/* Status Bar */}
      <div className="h-12 bg-gray-900 p-2 flex items-center justify-between">
        <div className="text-white text-sm px-4">
          {isOnRoad ? 'On road' : 'Off road'} • {Math.round(speed * 3.6)} km/h
        </div>
        {onDebugModeChange && (
          <div className="px-4">
            <Toggle
              pressed={isDebugMode}
              onPressedChange={onDebugModeChange}
              className="data-[state=on]:bg-green-500 h-8"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug
            </Toggle>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;