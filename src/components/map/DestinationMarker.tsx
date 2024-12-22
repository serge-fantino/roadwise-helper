import { Marker } from 'react-leaflet';
import L from 'leaflet';

// Custom destination icon
const destinationIcon = L.divIcon({
  html: '📍',
  className: 'destination-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

interface DestinationMarkerProps {
  position: [number, number];
}

const DestinationMarker = ({ position }: DestinationMarkerProps) => {
  return (
    <Marker 
      position={position}
      icon={destinationIcon}
    />
  );
};

export default DestinationMarker;