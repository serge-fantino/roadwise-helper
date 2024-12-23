import { Marker } from 'react-leaflet';
import { TriangleAlert } from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

interface TurnWarningMarkerProps {
  position: [number, number];
  angle: number;
}

const TurnWarningMarker = ({ position, angle }: TurnWarningMarkerProps) => {
  const iconHtml = renderToString(
    <div className="text-red-500">
      <TriangleAlert size={24} />
    </div>
  );

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'turn-warning-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });

  return (
    <Marker position={position} icon={customIcon} />
  );
};

export default TurnWarningMarker;