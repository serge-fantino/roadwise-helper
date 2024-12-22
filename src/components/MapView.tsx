import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './map/RouteOverlay';
import VehicleMarker from './map/VehicleMarker';
import DestinationMarker from './map/DestinationMarker';
import HistoryTrail from './map/HistoryTrail';
import MapEventHandlers from './map/MapEventHandlers';

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
  const [isOnRoad, setIsOnRoad] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [currentHistory, setCurrentHistory] = useState<[number, number][]>(positionHistory);

  const handleVehicleUpdate = useCallback((newPosition: [number, number], newSpeed: number) => {
    console.log('Vehicle update received in MapView:', newPosition, newSpeed);
    setCurrentPosition(newPosition);
    setCurrentSpeed(newSpeed);
    
    // Get the latest history from the global vehicle
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      const history = vehicle.positionHistory;
      console.log('Current vehicle history:', history);
      setCurrentHistory(history);
    }
  }, []);

  // Subscribe to vehicle updates
  useEffect(() => {
    const vehicle = (window as any).globalVehicle;
    if (vehicle) {
      console.log('Subscribing to vehicle updates');
      vehicle.addObserver(handleVehicleUpdate);
      // Initial history
      setCurrentHistory(vehicle.positionHistory);
      return () => {
        console.log('Unsubscribing from vehicle updates');
        vehicle.removeObserver(handleVehicleUpdate);
      };
    }
  }, [handleVehicleUpdate]);

  // Synchronize with initial props
  useEffect(() => {
    setCurrentPosition(position);
    setCurrentSpeed(speed);
    setCurrentHistory(positionHistory);
  }, [position, speed, positionHistory]);

  const handleRoadStatusChange = (status: boolean) => {
    setIsOnRoad(status);
    onRoadStatusChange(status);
  };

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
      <PredictionOverlay position={currentPosition} speed={currentSpeed} />
      <VehicleMarker position={currentPosition} isOnRoad={isOnRoad} />
      <HistoryTrail positions={currentHistory} />
      {destination && <DestinationMarker position={destination} />}
      <RouteOverlay routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;