import { ReactNode, useState } from 'react';
import MapView from './MapView';
import SpeedPanel from './SpeedPanel';
import DestinationPanel from './DestinationPanel';

interface MainLayoutProps {
  position: [number, number];
  speed: number;
  recommendedSpeed: number;
  isOnRoad: boolean;
  destination: { address: string; location: [number, number] } | null;
  routePoints: [number, number][];
  onDestinationSelect: (location: [number, number], address: string) => void;
  onRoadStatusChange: (status: boolean) => void;
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
          <div className="flex-1">
            <MapView 
              position={position} 
              speed={speed} 
              onRoadStatusChange={onRoadStatusChange}
              destination={destination?.location}
              routePoints={routePoints}
              onMapClick={handleMapClick}
            />
          </div>
          <div className="h-40 bg-gray-900 p-4">
            <SpeedPanel 
              currentSpeed={speed} 
              recommendedSpeed={recommendedSpeed}
              isOnRoad={isOnRoad}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MainLayout;