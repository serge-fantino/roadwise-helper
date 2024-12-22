import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PredictionOverlay from './PredictionOverlay';
import L from 'leaflet';
import { isPointOnRoad } from '../utils/osmUtils';
import { toast } from '../components/ui/use-toast';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icon
const vehicleIcon = L.divIcon({
  html: '🚗',
  className: 'vehicle-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Component to handle map center updates
const MapUpdater = ({ position, onRoadStatusChange }: { position: [number, number], onRoadStatusChange: (status: boolean) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());

    // Vérifier si le point est sur une route
    const checkRoadPosition = async () => {
      const [lat, lon] = position;
      const onRoad = await isPointOnRoad(lat, lon);
      
      onRoadStatusChange(onRoad);
      
      if (!onRoad) {
        toast({
          title: "Attention",
          description: "Le véhicule ne semble pas être sur une route",
          variant: "destructive"
        });
      }
    };

    checkRoadPosition();
  }, [position, map, onRoadStatusChange]);
  
  return null;
};

interface MapViewProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
}

const MapView = ({ position, speed, onRoadStatusChange }: MapViewProps) => {
  const [isOnRoad, setIsOnRoad] = useState(true);
  const [positionHistory, setPositionHistory] = useState<[number, number][]>([]);

  const handleRoadStatusChange = (status: boolean) => {
    setIsOnRoad(status);
    onRoadStatusChange(status);
  };

  // Update position history
  useEffect(() => {
    if (speed > 0) {
      setPositionHistory(prev => {
        const newHistory = [...prev, position];
        // Keep only last 10 seconds of positions (assuming 1 position per second)
        return newHistory.slice(-10);
      });
    }
  }, [position, speed]);

  return (
    <MapContainer
      center={position}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapUpdater position={position} onRoadStatusChange={handleRoadStatusChange} />
      <PredictionOverlay position={position} speed={speed} />
      <Marker 
        position={position} 
        icon={isOnRoad ? vehicleIcon : new L.Icon.Default()}
      />
      {speed > 0 && positionHistory.length > 1 && (
        <Polyline
          positions={positionHistory}
          color="#3B82F6"
          weight={3}
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
