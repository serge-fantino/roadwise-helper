import MapView from '../MapView';

interface MapAreaProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
  routePoints: [number, number][];
  onMapClick: (location: [number, number], address: string) => void;
  positionHistory: [number, number][];
}

const MapArea = ({
  position,
  speed,
  onRoadStatusChange,
  destination,
  routePoints,
  onMapClick,
  positionHistory
}: MapAreaProps) => {
  return (
    <div className="flex-1 w-full h-full relative">
      <MapView 
        position={position} 
        speed={speed} 
        onRoadStatusChange={onRoadStatusChange}
        destination={destination}
        routePoints={routePoints}
        onMapClick={onMapClick}
        positionHistory={positionHistory}
      />
    </div>
  );
};

export default MapArea;