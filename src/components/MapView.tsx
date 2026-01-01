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
import HeadingDebugLine from './map/HeadingDebugLine';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { TurnPrediction } from '../services/prediction/PredictionTypes';
import { routePlannerService } from '../services/route/RoutePlannerService';
import { toast } from './ui/use-toast';
import { settingsService } from '../services/SettingsService';
import { getMapTileConfig } from '../utils/mapStyles';
import { VehicleTelemetry } from '../types/VehicleTelemetry';

// Fix Leaflet default icon paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  vehicle: VehicleTelemetry;
  onRoadStatusChange: (status: boolean) => void;
  destination?: [number, number];
  routePoints: [number, number][];
  onMapClick: (location: [number, number], address: string) => void;
  positionHistory: [number, number][];
}

const MapView = ({ 
  vehicle,
  onRoadStatusChange, 
  destination,
  routePoints,
  onMapClick,
  positionHistory
}: MapViewProps) => {
  const [mapTileConfig, setMapTileConfig] = useState(getMapTileConfig(settingsService.getSettings().mapStyle));

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
      center={vehicle.position}
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
        position={vehicle.position}
        onRoadStatusChange={onRoadStatusChange}
        onMapClick={onMapClick}
      />
      <HistoryTrail positions={positionHistory} />
      <PredictionOverlay position={vehicle.position} speed={vehicle.speed} routePoints={routePoints} />
      <VehicleMarker 
        position={vehicle.position}
        heading={vehicle.heading}
        speed={vehicle.speed}
      />
      {/* Ligne de direction pour debug (même calcul que minimap) */}
      <HeadingDebugLine 
        position={vehicle.position}
        heading={vehicle.heading}
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