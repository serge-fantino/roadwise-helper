import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { roadPredictor } from '../../services/prediction/RoadPredictor';
import { toast } from '../../components/ui/use-toast';
import { roadInfoManager } from '../../services/roadInfo/RoadInfoManager';

interface MapEventHandlersProps {
  position: [number, number];
  onRoadStatusChange: (status: boolean) => void;
  onMapClick: (location: [number, number], address: string) => void;
}

const MapEventHandlers = ({ position, onRoadStatusChange, onMapClick }: MapEventHandlersProps) => {
  const map = useMap();

  useEffect(() => {
    // Vérifier que la position est valide avant de mettre à jour la vue
    if (position && Array.isArray(position) && position.length === 2) {
      const [lat, lng] = position;
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        const currentZoom = map.getZoom();
        const maxZoom = map.getMaxZoom();
        const minZoom = map.getMinZoom();
        const safeZoom = Math.max(minZoom, Math.min(currentZoom, maxZoom));
        
        try {
          map.setView([lat, lng], safeZoom, { animate: false });
        } catch (error) {
          console.error('[MapEventHandlers] Error setting view:', error);
        }
      }
    }
  }, [position, map]);

  // Écouter les mises à jour du RoadInfoManager
  useEffect(() => {
    const handleRoadInfo = (info: { isOnRoad: boolean }) => {
      onRoadStatusChange(info.isOnRoad);
    };

    roadInfoManager.addObserver(handleRoadInfo);
    roadInfoManager.updateRoadInfo(position);

    return () => {
      roadInfoManager.removeObserver(handleRoadInfo);
    };
  }, [position, onRoadStatusChange]);

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