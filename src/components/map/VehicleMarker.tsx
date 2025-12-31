import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';
import styles from './VehicleMarker.module.css';

interface VehicleMarkerProps {
  position: [number, number];
  heading: number;
  speed: number;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ position, heading, speed }) => {
  const getSpeedColor = (speedMS: number): string => {
    // Convertir la vitesse en km/h et la limiter entre 0 et 150
    const speedKmh = Math.min(Math.max(speedMS * 3.6, 0), 150);
    // Convertir la vitesse en une valeur entre 0 et 1
    const hue = (1 - speedKmh / 150) * 240; // 240 = bleu, 0 = rouge
    return `hsl(${hue}, 100%, 50%)`;
  };

  const icon = useMemo(() => {
    const color = getSpeedColor(speed);
    return L.divIcon({
      className: styles['vehicle-marker'],
      html: `
        <div class="${styles['vehicle-icon']}" style="transform: rotate(${90-heading}deg);">
          <div class="${styles.arrow}" style="border-bottom-color: ${color};"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [heading, speed]);

  return (
    <Marker 
      position={position} 
      icon={icon} 
      zIndexOffset={1000}
    />
  );
};

export default VehicleMarker;