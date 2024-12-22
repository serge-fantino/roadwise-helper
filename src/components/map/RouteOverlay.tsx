import { Polyline } from 'react-leaflet';

interface RouteOverlayProps {
  routePoints: [number, number][];
}

const RouteOverlay = ({ routePoints }: RouteOverlayProps) => {
  if (routePoints.length === 0) return null;

  return (
    <Polyline
      positions={routePoints}
      color="#10B981"
      weight={4}
      opacity={0.8}
      dashArray="10, 10"
    />
  );
};

export default RouteOverlay;