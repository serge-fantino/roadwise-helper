import { useState, useEffect } from 'react';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';
import LoadingScreen from '../components/LoadingScreen';
import MainLayout from '../components/MainLayout';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleState } from '../hooks/useVehicleState';
import { routePlannerService } from '../services/route/RoutePlannerService';

const Index = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);
  const [destination, setDestination] = useState<{ address: string; location: [number, number] } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  
  // Position initiale par défaut (Paris)
  const defaultPosition: [number, number] = [48.8566, 2.3522];
  const vehicle = useVehicle(isDebugMode, routePoints, defaultPosition);

  const { speed, position, history, handleRoadStatusChange } = useVehicleState(
    defaultPosition,
    0,
    [],
    setIsOnRoad
  );

  // Observer pour les mises à jour de la route
  useEffect(() => {
    const observer = (state: { routePoints: [number, number][] }) => {
      setRoutePoints(state.routePoints);
    };

    routePlannerService.addObserver(observer);
    return () => routePlannerService.removeObserver(observer);
  }, []);

  // Calcul d'itinéraire uniquement lors d'un changement de destination
  useEffect(() => {
    if (destination) {
      console.log('[Index] Starting route calculation:', {
        from: position,
        to: destination.location
      });
      
      routePlannerService.calculateRoute(position, destination.location);
      routePlannerService.setDestination(destination.location, destination.address);
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