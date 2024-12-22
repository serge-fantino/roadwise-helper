import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { isPointOnRoad } from '../../utils/osmUtils';
import { toast } from '../ui/use-toast';

interface MapEventHandlersProps {
  position: [number, number];
  onRoadStatusChange: (status: boolean) => void;
  onMapClick: (location: [number, number], address: string) => void;
}

const MapEventHandlers = ({ position, onRoadStatusChange, onMapClick }: MapEventHandlersProps) => {
  const map = useMap();

  // Handle position updates and road status checks
  useEffect(() => {
    map.setView(position, map.getZoom());

    const checkRoadPosition = async () => {
      const [lat, lon] = position;
      const onRoad = await isPointOnRoad(lat, lon);
      onRoadStatusChange(onRoad);
    };

    checkRoadPosition();
  }, [position, map, onRoadStatusChange]);

  // Handle zoom to destination events
  useEffect(() => {
    const handleZoomToDestination = (e: CustomEvent) => {
      const { location } = e.detail;
      map.setView(location, 15);
    };

    const mapElement = map.getContainer();
    mapElement.addEventListener('zoomToDestination', handleZoomToDestination as EventListener);

    return () => {
      mapElement.removeEventListener('zoomToDestination', handleZoomToDestination as EventListener);
    };
  }, [map]);

  // Handle map clicks and reverse geocoding
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer l'adresse",
        variant: "destructive"
      });
      return "Adresse inconnue";
    }
  };

  useMapEvents({
    click: async (e) => {
      const location: [number, number] = [e.latlng.lat, e.latlng.lng];
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      onMapClick(location, address);
    },
  });

  return null;
};

export default MapEventHandlers;
