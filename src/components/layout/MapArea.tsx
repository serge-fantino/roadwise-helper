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
          positionHistory={positionHistory}
        />
      )}
    </div>
  );
};

export default MapArea;