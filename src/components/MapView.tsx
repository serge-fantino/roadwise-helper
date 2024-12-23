import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import PredictionOverlay from './PredictionOverlay';
import RouteOverlay from './map/RouteOverlay';
import VehicleMarker from './map/VehicleMarker';
import DestinationMarker from './map/DestinationMarker';
import HistoryTrail from './map/HistoryTrail';
import MapEventHandlers from './map/MapEventHandlers';
import RoadPredictionInfo from './RoadPredictionInfo';
import TurnWarningMarker from './map/TurnWarningMarker';
import { roadPredictor } from '../services/RoadPredictor';
import { useVehicleState } from '../hooks/useVehicleState';

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
  const mapRef = useRef<L.Map | null>(null);
  const {
    position: currentPosition,
    speed: currentSpeed,
    history: currentHistory,
    isOnRoad,
    handleRoadStatusChange
  } = useVehicleState(position, speed, positionHistory, onRoadStatusChange);

  const [nextTurn, setNextTurn] = useState<{
    position: [number, number];
    angle: number;
  } | null>(null);

  useEffect(() => {
    const observer = (prediction: any) => {
      if (prediction && prediction.position) {
        setNextTurn({
          position: prediction.position,
          angle: prediction.angle
        });
      } else {
        setNextTurn(null);
      }
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  const heading = (window as any).globalVehicle?.heading || 0;
  console.log('[MapView] Current heading:', heading);

  // Effet pour mettre à jour la rotation de la carte
  useEffect(() => {
    console.log('[MapView] Heading effect triggered with heading:', heading);
    if (mapRef.current) {
      console.log('[MapView] Setting map bearing to:', -heading);
      mapRef.current.setBearing(-heading); // On inverse le heading pour que le véhicule pointe vers le haut
      console.log('[MapView] Map bearing updated:', -heading);
    }
  }, [heading]);

  const onMapLoad = (map: L.Map) => {
    console.log('[MapView] Map loaded and initialized');
    mapRef.current = map;
    if (heading) {
      map.setBearing(-heading);
    }
  };

  return (
    <MapContainer
      center={currentPosition}
      zoom={17}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
      ref={mapRef}
      whenReady={() => {
        console.log('[MapView] Map is ready');
        if (mapRef.current) {
          onMapLoad(mapRef.current);
        }
      }}
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
      {nextTurn && <TurnWarningMarker position={nextTurn.position} angle={nextTurn.angle} />}
      <RouteOverlay routePoints={routePoints} />
      <RoadPredictionInfo routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;