import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PredictionOverlay from './PredictionOverlay';

// Component to handle map center updates
const MapUpdater = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  
  return null;
};

interface MapViewProps {
  position: [number, number];
  speed: number;
}

const MapView = ({ position, speed }: MapViewProps) => {
  return (
    <MapContainer
      center={position}
      zoom={17}
      className="h-screen w-screen"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapUpdater position={position} />
      <PredictionOverlay position={position} speed={speed} />
    </MapContainer>
  );
};

export default MapView;