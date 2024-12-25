import { Polyline } from 'react-leaflet';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface RouteOverlayProps {
  routePoints: [number, number][];
}

const RouteOverlay = ({ routePoints }: RouteOverlayProps) => {
  if (routePoints.length === 0) return null;

  return (
    <Polyline
      positions={routePoints}
      color={routePlannerService.getRouteColor()}
      weight={4}
      opacity={0.8}
      dashArray="10, 10"
    />
  );
};

export default RouteOverlay;