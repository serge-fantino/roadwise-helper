import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { calculateDistance } from '../utils/mapUtils';
import { toast } from '../components/ui/use-toast';

// Create a single instance of the vehicle
const globalVehicle = new Vehicle([48.8566, 2.3522]);

export const useVehicle = (
  isDebugMode: boolean,
  routePoints: [number, number][],
  initialPosition: [number, number]
) => {
  const [vehicle, setVehicle] = useState<Vehicle>(globalVehicle);
  const watchIdRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentRouteIndexRef = useRef(0);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Reset vehicle if initial position changes
  useEffect(() => {
    globalVehicle.reset(initialPosition);
    setVehicle(globalVehicle);
  }, [initialPosition]);

  const updateVehicle = (position: [number, number], speed: number) => {
    globalVehicle.update(position, speed);
    setVehicle(globalVehicle);
  };

  const startGPSTracking = () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: "Erreur GPS",
        description: "La géolocalisation n'est pas supportée par votre navigateur.",
        variant: "destructive"
      });
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        console.log('GPS Update - New Position:', newPosition);
        updateVehicle(newPosition, pos.coords.speed || 0);
        retryCountRef.current = 0; // Reset retry count on successful update
      },
      (error) => {
        console.error('Error getting location:', error);
        
        if (error.code === error.TIMEOUT) {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            toast({
              title: "Tentative de reconnexion GPS",
              description: `Nouvelle tentative ${retryCountRef.current}/${MAX_RETRIES}...`,
            });
            
            // Clear existing watch and retry
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
            }
            setTimeout(startGPSTracking, 1000); // Retry after 1 second
          } else {
            toast({
              title: "Erreur GPS",
              description: "Impossible d'obtenir votre position. Veuillez vérifier vos paramètres de localisation.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Erreur GPS",
            description: "Veuillez activer la géolocalisation pour utiliser l'assistant de conduite.",
            variant: "destructive"
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased timeout to 10 seconds
        maximumAge: 0
      }
    );
  };

  // Handle GPS tracking
  useEffect(() => {
    if (!isDebugMode) {
      startGPSTracking();

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    }
  }, [isDebugMode]);

  // Handle simulation
  useEffect(() => {
    if (isDebugMode && routePoints.length > 1) {
      // Reset simulation
      currentRouteIndexRef.current = 0;
      const startPosition = routePoints[0];
      globalVehicle.reset(startPosition);
      setVehicle(globalVehicle);

      simulationIntervalRef.current = setInterval(() => {
        const nextIndex = currentRouteIndexRef.current + 1;
        
        if (nextIndex >= routePoints.length) {
          if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
          }
          return;
        }

        const currentPosition = routePoints[currentRouteIndexRef.current];
        const nextPosition = routePoints[nextIndex];
        const distance = calculateDistance(currentPosition, nextPosition);
        const speed = distance / 3; // 3 seconds interval

        updateVehicle(nextPosition, speed);
        currentRouteIndexRef.current = nextIndex;
      }, 3000);

      return () => {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
      };
    }
  }, [isDebugMode, routePoints]);

  return vehicle;
};