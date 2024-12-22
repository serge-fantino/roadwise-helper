import { useState, useEffect } from 'react';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';
import LoadingScreen from '../components/LoadingScreen';
import MainLayout from '../components/MainLayout';
import { useRouting } from '../hooks/useRouting';
import { useVehicle } from '../hooks/useVehicle';

const Index = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);
  const [destination, setDestination] = useState<{ address: string; location: [number, number] } | null>(null);
  const { routePoints, calculateRoute } = useRouting();
  
  // Position initiale par défaut (Paris)
  const defaultPosition: [number, number] = [48.8566, 2.3522];
  const vehicle = useVehicle(isDebugMode, routePoints, defaultPosition);

  // Calcul de la vitesse recommandée
  const recommendedSpeed = calculateRecommendedSpeed(vehicle.speed);

  // Gestion du calcul d'itinéraire quand la destination change
  useEffect(() => {
    if (destination) {
      calculateRoute(vehicle.position, destination.location);
    }
  }, [destination, vehicle.position]);

  if (!vehicle) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout
      position={vehicle.position}
      speed={vehicle.speed}
      recommendedSpeed={recommendedSpeed}
      isOnRoad={isOnRoad}
      destination={destination}
      routePoints={routePoints}
      onDestinationSelect={(location, address) => {
        setDestination({ location, address });
      }}
      onRoadStatusChange={setIsOnRoad}
      isDebugMode={isDebugMode}
      onDebugModeChange={setIsDebugMode}
      positionHistory={vehicle.positionHistory}
    />
  );
};

export default Index;