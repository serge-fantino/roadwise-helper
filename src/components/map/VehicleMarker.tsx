import { Marker } from 'react-leaflet';
import L from 'leaflet';

// Custom vehicle icon
const vehicleIcon = L.divIcon({
  html: '🚗',
  className: 'vehicle-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

interface VehicleMarkerProps {
  position: [number, number];
  isOnRoad: boolean;
}

const VehicleMarker = ({ position, isOnRoad }: VehicleMarkerProps) => {
  return (
    <Marker 
      position={position} 
      icon={isOnRoad ? vehicleIcon : new L.Icon.Default()}
    />
  );
};

export default VehicleMarker;