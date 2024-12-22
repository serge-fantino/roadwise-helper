import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './map/RouteOverlay';
import VehicleMarker from './map/VehicleMarker';
import DestinationMarker from './map/DestinationMarker';
import HistoryTrail from './map/HistoryTrail';
import MapEventHandlers from './map/MapEventHandlers';
import { useVehicleState } from '../hooks/useVehicleState';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
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
  const {
    position: currentPosition,
    speed: currentSpeed,
    history: currentHistory,
    isOnRoad,
    handleRoadStatusChange
  } = useVehicleState(position, speed, positionHistory, onRoadStatusChange);

  console.log('MapView rendering with history:', currentHistory);

  return (
    <MapContainer
      center={currentPosition}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapEventHandlers 
        position={currentPosition}
        onRoadStatusChange={handleRoadStatusChange}
        onMapClick={onMapClick}
      />
      {/* Ensure we only render one instance of HistoryTrail */}
      <HistoryTrail positions={currentHistory} />
      <PredictionOverlay position={currentPosition} speed={currentSpeed} />
      <VehicleMarker position={currentPosition} isOnRoad={isOnRoad} />
      {destination && <DestinationMarker position={destination} />}
      <RouteOverlay routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;