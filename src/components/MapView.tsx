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
import { getRoute } from '../utils/routingUtils';
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

  useEffect(() => {
    const observer = (prediction: TurnPrediction | null, turns: TurnPrediction[]) => {
      console.log('Road prediction updated:', { prediction, turns });
      setNextTurn(prediction);
      setAllTurns(turns);
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  useEffect(() => {
    if (routePoints && routePoints.length > 0) {
      console.log('Starting road predictor updates with route points:', routePoints);
      roadPredictor.startUpdates(routePoints, destination);
    } else {
      console.log('Stopping road predictor updates - no route points');
      roadPredictor.stopUpdates();
    }

    return () => roadPredictor.stopUpdates();
  }, [routePoints, destination]);

  // Gérer l'événement de recalcul d'itinéraire
  useEffect(() => {
    const handleRouteRecalculation = async (event: CustomEvent) => {
      const { from, to } = event.detail;
      console.log('Recalculating route:', { from, to });
      
      try {
        const newRoutePoints = await getRoute(from, to);
        if (newRoutePoints.length > 0) {
          // Créer un événement personnalisé pour mettre à jour l'itinéraire
          const updateEvent = new CustomEvent('updateRoute', {
            detail: {
              routePoints: newRoutePoints
            }
          });
          window.dispatchEvent(updateEvent);
          
          toast({
            title: "Itinéraire recalculé",
            description: "Un nouvel itinéraire a été calculé pour vous ramener à destination",
          });
        }
      } catch (error) {
        console.error('Failed to recalculate route:', error);
        toast({
          title: "Erreur",
          description: "Impossible de recalculer l'itinéraire",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
    return () => {
      window.removeEventListener('recalculateRoute', handleRouteRecalculation as EventListener);
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