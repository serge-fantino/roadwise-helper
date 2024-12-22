import { useEffect, useState } from 'react';
import MapView from '../components/MapView';
import SpeedPanel from '../components/SpeedPanel';
import PredictionOverlay from '../components/PredictionOverlay';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';

const Index = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [recommendedSpeed, setRecommendedSpeed] = useState<number>(0);

  useEffect(() => {
    // Request location permission and start watching position
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setSpeed(pos.coords.speed || 0);
          
          // Calculate recommended speed based on current conditions
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
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Initializing Driver Assistant</h2>
          <p>Please enable location services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      <MapView position={position} />
      <PredictionOverlay position={position} speed={speed} />
      <SpeedPanel 
        currentSpeed={speed} 
        recommendedSpeed={recommendedSpeed}
      />
    </div>
  );
};

export default Index;