import { useEffect, useState } from 'react';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';
import LoadingScreen from '../components/LoadingScreen';
import MainLayout from '../components/MainLayout';

const Index = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [recommendedSpeed, setRecommendedSpeed] = useState<number>(0);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);
  const [destination, setDestination] = useState<{ address: string; location: [number, number] } | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setSpeed(pos.coords.speed || 0);
          const newRecommendedSpeed = calculateRecommendedSpeed(pos.coords.speed || 0);
          setRecommendedSpeed(newRecommendedSpeed);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Error",
            description: "Please enable location services to use the driver assistant.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  if (!position) {
    return <LoadingScreen />;
  }

  return (
    <MainLayout
      position={position}
      speed={speed}
      recommendedSpeed={recommendedSpeed}
      isOnRoad={isOnRoad}
      destination={destination}
      onDestinationSelect={(location, address) => {
        setDestination({ location, address });
      }}
      onRoadStatusChange={setIsOnRoad}
    />
  );
};

export default Index;