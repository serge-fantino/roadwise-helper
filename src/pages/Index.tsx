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

  // Calcul de la vitesse recommandée
  const recommendedSpeed = calculateRecommendedSpeed(speed);

  // Calcul d'itinéraire uniquement lors d'un changement de destination
  useEffect(() => {
    if (destination) {
      calculateRoute(position, destination.location);
    }
  }, [destination, position]);

  if (!vehicle) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout
      position={position}
      speed={speed}
      recommendedSpeed={recommendedSpeed}
      isOnRoad={isOnRoad}
      destination={destination}
      routePoints={routePoints}
      onDestinationSelect={(location, address) => {
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