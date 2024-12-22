import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { calculateDistance } from '../utils/mapUtils';
import { toast } from '../components/ui/use-toast';

// Créer une instance unique du véhicule
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

  // Réinitialiser le véhicule si la position initiale change
  useEffect(() => {
    globalVehicle.reset(initialPosition);
    setVehicle(globalVehicle);
  }, [initialPosition]);

  const updateVehicle = (position: [number, number], speed: number) => {
    globalVehicle.update(position, speed);
    setVehicle(globalVehicle);
  };

  // Gestion du GPS réel
  useEffect(() => {
    if (!isDebugMode && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          updateVehicle(newPosition, pos.coords.speed || 0);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Erreur de localisation",
            description: "Veuillez activer la géolocalisation pour utiliser l'assistant de conduite.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    }
  }, [isDebugMode]);

  // Gestion de la simulation
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
      }, 3000); // 3 seconds interval

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