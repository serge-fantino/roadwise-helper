import { MapContainer, TileLayer } from 'react-leaflet';
import VehicleMarker from './VehicleMarker';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './RouteOverlay';
import HistoryTrail from './HistoryTrail';
import MapEventHandlers from './MapEventHandlers';

interface MapViewProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number] | null;
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
  return (
    <MapContainer
      center={position}
      zoom={13}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <VehicleMarker position={position} />
      <PredictionOverlay position={position} speed={speed} routePoints={routePoints} />
      <RouteOverlay routePoints={routePoints} />
      {destination && <DestinationMarker position={destination} />}
      <HistoryTrail positions={positionHistory} />
      <MapEventHandlers
        onRoadStatusChange={onRoadStatusChange}
        onMapClick={onMapClick}
      />
    </MapContainer>
  );
};

export default MapView;
