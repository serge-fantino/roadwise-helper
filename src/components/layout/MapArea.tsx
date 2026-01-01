import { useEffect, useState } from 'react';
import MapView from '../MapView';
import DriveView from './DriveView';
import RoadBookView from '../roadbook/RoadBookView';
import { vehicleStateManager } from '../../services/VehicleStateManager';
import { tripService } from '../../services/TripService';
import { routePlannerService } from '../../services/route/RoutePlannerService';
import { VehicleState } from '../../services/VehicleStateManager';
import { TripState } from '../../services/TripService';
import { RouteState } from '../../services/route/RoutePlannerTypes';
import { VehicleTelemetry } from '../../types/VehicleTelemetry';

interface MapAreaProps {
  onRoadStatusChange: (status: boolean) => void;
  viewMode: 'map' | 'drive' | 'roadbook';
}

const MapArea = ({
  onRoadStatusChange,
  viewMode
}: MapAreaProps) => {
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleStateManager.getState());
  const [tripState, setTripState] = useState<TripState>(tripService.getState());
  const [routeState, setRouteState] = useState<RouteState>(routePlannerService.getState());

  useEffect(() => {
    const handleVehicleUpdate = (state: VehicleState) => {
      setVehicleState(state);
    };

    const handleTripUpdate = (state: TripState) => {
      setTripState(state);
    };

    const handleRouteUpdate = (state: RouteState) => {
      setRouteState(state);
    };

    vehicleStateManager.addObserver(handleVehicleUpdate);
    tripService.addObserver(handleTripUpdate);
    routePlannerService.addObserver(handleRouteUpdate);

    return () => {
      vehicleStateManager.removeObserver(handleVehicleUpdate);
      tripService.removeObserver(handleTripUpdate);
      routePlannerService.removeObserver(handleRouteUpdate);
    };
  }, []);

  const handleMapClick = (location: [number, number], address: string) => {
    routePlannerService.setDestination(location, address);
  };

  return (
    <div className="flex-1 w-full h-full relative">
      {viewMode === 'map' ? (
        <MapView 
          position={vehicleState.position} 
          speed={vehicleState.speed} 
          onRoadStatusChange={onRoadStatusChange}
          destination={routeState.destination?.location}
          routePoints={routeState.routePoints}
          onMapClick={handleMapClick}
          positionHistory={tripState.positions}
        />
      ) : viewMode === 'drive' ? (
        <DriveView 
          vehicle={vehicleState as VehicleTelemetry}
          positionHistory={tripState.positions}
        />
      ) : (
        <RoadBookView />
      )}
    </div>
  );
};

export default MapArea;