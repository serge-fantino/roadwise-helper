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
import TurnCurveOverlay from './map/TurnCurveOverlay';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { TurnPrediction } from '../services/prediction/PredictionTypes';
import { routePlannerService } from '../services/route/RoutePlannerService';
import { toast } from './ui/use-toast';
import { vehicleStateManager } from '../services/VehicleStateManager';
import { tripService } from '../services/TripService';
import { VehicleState } from '../services/VehicleStateManager';
import { TripState } from '../services/TripService';
import { settingsService } from '../services/SettingsService';
import { getMapTileConfig } from '../utils/mapStyles';

// Fix Leaflet default icon paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [vehicleState, setVehicleState] = useState<VehicleState>(vehicleStateManager.getState());
  const [tripState, setTripState] = useState<TripState>({ positions: [], metrics: {} });
  const [mapTileConfig, setMapTileConfig] = useState(getMapTileConfig(settingsService.getSettings().mapStyle));

  useEffect(() => {
    const handleVehicleUpdate = (state: VehicleState) => {
      setVehicleState(state);
    };

    const handleTripUpdate = (state: TripState) => {
      setTripState(state);
    };

    vehicleStateManager.addObserver(handleVehicleUpdate);
    tripService.addObserver(handleTripUpdate);

    return () => {
      vehicleStateManager.removeObserver(handleVehicleUpdate);
      tripService.removeObserver(handleTripUpdate);
    };
  }, []);

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

  // Note: La mise à jour de position est maintenant gérée dans MainLayout
  // pour que ça fonctionne même quand on n'est pas sur la vue carte

  useEffect(() => {
    const observer = (prediction: TurnPrediction | null, turns: TurnPrediction[]) => {
      console.log('[MapView] Road prediction updated:', { prediction, turns });
      setNextTurn(prediction);
      setAllTurns(turns);
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  // Observer pour les changements de style de carte
  useEffect(() => {
    const handleSettingsChange = () => {
      const settings = settingsService.getSettings();
      setMapTileConfig(getMapTileConfig(settings.mapStyle));
    };

    settingsService.addObserver(handleSettingsChange);
    return () => settingsService.removeObserver(handleSettingsChange);
  }, []);

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

  return (
    <MapContainer
      center={vehicleState.position}
      zoom={17}
      minZoom={2}
      maxZoom={mapTileConfig.maxZoom || 19}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url={mapTileConfig.url}
        attribution={mapTileConfig.attribution}
        minZoom={2}
        maxZoom={mapTileConfig.maxZoom || 19}
        className="map-tiles"
      />
      <MapEventHandlers 
        position={vehicleState.position}
        onRoadStatusChange={onRoadStatusChange}
        onMapClick={onMapClick}
      />
      <HistoryTrail positions={tripState.positions} />
      <PredictionOverlay position={vehicleState.position} speed={vehicleState.speed} routePoints={routePoints} />
      <VehicleMarker 
        position={vehicleState.position}
        heading={vehicleState.heading}
        speed={vehicleState.speed}
      />
      {destination && <DestinationMarker position={destination} />}
      {allTurns.map((turn, index) => (
        <TurnWarningMarker 
          key={`${turn.position[0]}-${turn.position[1]}-${index}`}
          position={turn.position} 
          angle={turn.angle}
          isNextTurn={index === 0}
        />
      ))}
      <TurnCurveOverlay turns={allTurns} />
      <RouteOverlay routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;