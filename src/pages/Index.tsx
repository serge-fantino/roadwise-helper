import { useEffect, useState } from 'react';
import MapView from '../components/MapView';
import SpeedPanel from '../components/SpeedPanel';
import { calculateRecommendedSpeed } from '../utils/speedUtils';
import { toast } from '../components/ui/use-toast';

const Index = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [recommendedSpeed, setRecommendedSpeed] = useState<number>(0);
  const [isOnRoad, setIsOnRoad] = useState<boolean>(true);

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
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <MapView 
          position={position} 
          speed={speed} 
          onRoadStatusChange={setIsOnRoad}
        />
      </div>
      <div className="h-40 bg-gray-900 p-4">
        <SpeedPanel 
          currentSpeed={speed} 
          recommendedSpeed={recommendedSpeed}
          isOnRoad={isOnRoad}
          onDestinationSelect={(location) => {
            const mapView = document.querySelector('.leaflet-container');
            if (mapView) {
              const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: 0,
                clientY: 0,
              });
              Object.defineProperty(event, 'latlng', {
                value: { lat: location[0], lng: location[1] }
              });
              mapView.dispatchEvent(event);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Index;