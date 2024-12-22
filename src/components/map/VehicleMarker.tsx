import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDownRight,
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft
} from 'lucide-react';
import { renderToString } from 'react-dom/server';

interface VehicleMarkerProps {
  position: [number, number];
  isOnRoad: boolean;
  heading?: number;
}

const VehicleMarker = ({ position, isOnRoad, heading = 0 }: VehicleMarkerProps) => {
  const getDirectionIcon = (heading: number) => {
    // Normalize heading to 0-360
    const normalizedHeading = ((heading % 360) + 360) % 360;
    
    // Define direction ranges (45 degree segments)
    if (normalizedHeading >= 337.5 || normalizedHeading < 22.5) return ArrowUp;
    if (normalizedHeading >= 22.5 && normalizedHeading < 67.5) return ArrowUpRight;
    if (normalizedHeading >= 67.5 && normalizedHeading < 112.5) return ArrowRight;
    if (normalizedHeading >= 112.5 && normalizedHeading < 157.5) return ArrowDownRight;
    if (normalizedHeading >= 157.5 && normalizedHeading < 202.5) return ArrowDown;
    if (normalizedHeading >= 202.5 && normalizedHeading < 247.5) return ArrowDownLeft;
    if (normalizedHeading >= 247.5 && normalizedHeading < 292.5) return ArrowLeft;
    return ArrowUpLeft;
  };

  const DirectionIcon = getDirectionIcon(heading);
  
  const vehicleIcon = L.divIcon({
    html: isOnRoad ? renderToString(
      <DirectionIcon 
        size={24}
        color="#2563eb"
        strokeWidth={3}
      />
    ) : '📍',
    className: 'vehicle-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Marker 
      position={position} 
      icon={vehicleIcon}
    />
  );
};

export default VehicleMarker;