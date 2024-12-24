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
import RoadPredictionInfo from './RoadPredictionInfo';
import TurnWarningMarker from './map/TurnWarningMarker';
import { roadPredictor } from '../services/RoadPredictor';
import { useVehicleState } from '../hooks/useVehicleState';
import { TurnPrediction } from '../services/prediction/PredictionTypes';

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
      setNextTurn(prediction);
      setAllTurns(turns);
    };

    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
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
      <RoadPredictionInfo routePoints={routePoints} />
    </MapContainer>
  );
};

export default MapView;