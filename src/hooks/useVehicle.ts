import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { calculateDistance } from '../utils/mapUtils';
import { toast } from '../components/ui/use-toast';

// Create a single instance of the vehicle with null initial position
const globalVehicle = new Vehicle(null);

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
  const hasInitializedRef = useRef(false);

  const updateVehicle = (position: [number, number], speed: number) => {
    console.log('Updating vehicle position:', position);
    globalVehicle.update(position, speed);
    setVehicle(globalVehicle);
  };

  // Initialize vehicle with GPS position
  const startGPSTracking = () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: "Erreur GPS",
        description: "La géolocalisation n'est pas supportée par votre navigateur.",
        variant: "destructive"
      });
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        console.log('Initial GPS position:', newPosition);
        if (!hasInitializedRef.current) {
          globalVehicle.reset(newPosition);
          hasInitializedRef.current = true;
        }
        updateVehicle(newPosition, pos.coords.speed || 0);

        // Start watching position after getting initial position
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            console.log('GPS Update - New Position:', newPosition);
            updateVehicle(newPosition, pos.coords.speed || 0);
            retryCountRef.current = 0;
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
                
                if (watchIdRef.current !== null) {
                  navigator.geolocation.clearWatch(watchIdRef.current);
                }
                setTimeout(startGPSTracking, 1000);
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
            timeout: 10000,
            maximumAge: 0
          }
        );
      },
      (error) => {
        console.error('Error getting initial position:', error);
        toast({
          title: "Erreur GPS",
          description: "Impossible d'obtenir votre position initiale.",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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

  // Handle simulation mode
  useEffect(() => {
    if (isDebugMode && routePoints.length > 1) {
      console.log('Starting simulation with route points:', routePoints);
      
      // Reset simulation
      currentRouteIndexRef.current = 0;
      const startPosition = routePoints[0];
      console.log('Setting initial simulation position:', startPosition);
      updateVehicle(startPosition, 0); // Use updateVehicle instead of direct reset

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
        const speed = distance / 3;

        console.log('Simulation update - New Position:', nextPosition);
        updateVehicle(nextPosition, speed); // Use updateVehicle instead of direct update
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
