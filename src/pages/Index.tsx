import { useState, useEffect } from 'react';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';
import LoadingScreen from '../components/LoadingScreen';
import MainLayout from '../components/MainLayout';
import { useRouting } from '../hooks/useRouting';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleState } from '../hooks/useVehicleState';

const Index = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);
  const [destination, setDestination] = useState<{ address: string; location: [number, number] } | null>(null);
  const { routePoints, calculateRoute } = useRouting();
  
  // Position initiale par défaut (Paris)
  const defaultPosition: [number, number] = [48.8566, 2.3522];
  const vehicle = useVehicle(isDebugMode, routePoints, defaultPosition);

  const { speed, position, history, handleRoadStatusChange } = useVehicleState(
    defaultPosition,
    0,
    [],
    setIsOnRoad
  );

  // Log pour tracer les mises à jour de vitesse
  useEffect(() => {
    console.log('[Index] Speed updated:', speed);
  }, [speed]);

  // Log détaillé pour tracer les mises à jour des points de route
  useEffect(() => {
    console.log('[Index] Route points state updated:', {
      length: routePoints?.length,
      points: routePoints,
      destination: destination?.location
    });
  }, [routePoints, destination]);

  // Calcul d'itinéraire uniquement lors d'un changement de destination
  useEffect(() => {
    if (destination) {
      console.log('[Index] Starting route calculation:', {
        from: position,
        to: destination.location,
        currentRoutePoints: routePoints?.length
      });
      
      calculateRoute(position, destination.location)
        .then(newRoute => {
          console.log('[Index] Route calculation completed:', {
            success: newRoute.length > 0,
            points: newRoute.length,
            firstPoint: newRoute[0],
            lastPoint: newRoute[newRoute.length - 1]
          });
        })
        .catch(error => {
          console.error('[Index] Route calculation failed:', error);
        });
    }
  }, [destination]); 

  if (!vehicle) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout
      position={position}
      speed={speed}
      recommendedSpeed={calculateRecommendedSpeed(speed)}
      isOnRoad={isOnRoad}
      destination={destination}
      routePoints={routePoints}
      onDestinationSelect={(location, address) => {
        console.log('[Index] New destination selected:', { location, address });
        setDestination({ location, address });
      }}
      onRoadStatusChange={handleRoadStatusChange}
      isDebugMode={isDebugMode}
      onDebugModeChange={setIsDebugMode}
      positionHistory={history}
    />
  );
};

export default Index;