import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './map/RouteOverlay';
import VehicleMarker from './map/VehicleMarker';
import DestinationMarker from './map/DestinationMarker';
import HistoryTrail from './map/HistoryTrail';
import MapEventHandlers from './map/MapEventHandlers';
import TurnWarningMarker from './map/TurnWarningMarker';
import { roadPredictor } from '../services/RoadPredictor';
import { useVehicleState } from '../hooks/useVehicleState';
import { TurnPrediction } from '../services/prediction/PredictionTypes';
import { routePlannerService } from '../services/route/RoutePlannerService';
import { toast } from './ui/use-toast';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  position: [number, number];
  speed: number;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
  routePoints: [number, number][];
  onMapClick: (location: [number, number], address: string) => void;
  positionHistory: [number, number][];
}

const MapView = ({ 
  position, 
  speed, 
  onRoadStatusChange, 
  destination,
  routePoints,
  onMapClick,
  positionHistory
}: MapViewProps) => {
  const {
    position: currentPosition,
    speed: currentSpeed,
    history: currentHistory,
    isOnRoad,
    handleRoadStatusChange
  } = useVehicleState(position, speed, positionHistory, onRoadStatusChange);

  const [nextTurn, setNextTurn] = useState<TurnPrediction | null>(null);
  const [allTurns, setAllTurns] = useState<TurnPrediction[]>([]);

  // Log des mises à jour des points de route
  useEffect(() => {
    console.log('[MapView] Route points updated:', {
      length: routePoints?.length,
      points: routePoints,
      destination
    });
  }, [routePoints, destination]);

  // Mettre à jour la position dans le RoadPredictor
  useEffect(() => {
    roadPredictor.updatePosition(currentPosition);
  }, [currentPosition]);

  useEffect(() => {
    const observer = (prediction: TurnPrediction | null, turns: TurnPrediction[]) => {
      console.log('[MapView] Road prediction updated:', { prediction, turns });
      setNextTurn(prediction);
      setAllTurns(turns);
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  // Démarrer les mises à jour du RoadPredictor quand la route change
  useEffect(() => {
    if (routePoints && routePoints.length > 1) {
      console.log('[MapView] Starting road predictor updates with route points:', routePoints);
      roadPredictor.startUpdates();
    } else {
      console.log('[MapView] Stopping road predictor updates - no route points');
      roadPredictor.stopUpdates();
    }

    return () => roadPredictor.stopUpdates();
  }, [routePoints]);

  // Gérer l'événement de recalcul d'itinéraire
  useEffect(() => {
    const handleRouteRecalculation = async () => {
      console.log('Recalculating route...');
      try {
        await routePlannerService.recalculateRoute();
      } catch (error) {
        console.error('Failed to recalculate route:', error);
        toast({
          title: "Erreur",
          description: "Impossible de recalculer l'itinéraire",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('recalculateRoute', handleRouteRecalculation);
    return () => {
      window.removeEventListener('recalculateRoute', handleRouteRecalculation);
    };
  }, []);

  const heading = (window as any).globalVehicle?.heading || 0;

  return (
    <MapContainer
      center={currentPosition}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapEventHandlers 
        position={currentPosition}
        onRoadStatusChange={handleRoadStatusChange}
        onMapClick={onMapClick}
      />
      <HistoryTrail positions={currentHistory} />
      <PredictionOverlay position={currentPosition} speed={currentSpeed} routePoints={routePoints} />
      <VehicleMarker position={currentPosition} isOnRoad={isOnRoad} heading={heading} />
      {destination && <DestinationMarker position={destination} />}
      {allTurns.map((turn, index) => (
        <TurnWarningMarker 
          key={`${turn.position[0]}-${turn.position[1]}-${index}`}
          position={turn.position} 
          angle={turn.angle}
          isNextTurn={index === 0}
        />
      ))}
      <RouteOverlay routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;