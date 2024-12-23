import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { calculateDistance } from '../utils/mapUtils';
import { toast } from '../components/ui/use-toast';

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const globalVehicle = new Vehicle(PARIS_CENTER);
(window as any).globalVehicle = globalVehicle;

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
  const previousDebugModeRef = useRef(isDebugMode);

  const updateVehicle = (position: [number, number], speed: number) => {
    console.log('Updating vehicle position:', position);
    globalVehicle.update(position, speed);
    setVehicle(globalVehicle);
  };

  // Reset vehicle when switching modes
  useEffect(() => {
    if (previousDebugModeRef.current !== isDebugMode) {
      console.log('Debug mode changed, resetting vehicle');
      if (!isDebugMode) {
        // Switching to GPS mode
        startGPSTracking();
      } else {
        // Switching to debug mode
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        // Reset with first route point if available
        if (routePoints.length > 0) {
          globalVehicle.reset(routePoints[0]);
          currentRouteIndexRef.current = 0;
        }
      }
      previousDebugModeRef.current = isDebugMode;
    }
  }, [isDebugMode, routePoints]);

  const handleGPSError = (error: GeolocationPositionError) => {
    console.error('GPS Error:', {
      code: error.code,
      message: error.message,
      PERMISSION_DENIED: error.PERMISSION_DENIED,
      POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
      TIMEOUT: error.TIMEOUT
    });

    let errorMessage = "Erreur de géolocalisation";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Position GPS non disponible. Utilisation de la position par défaut (Paris)";
        // Use default position (Paris center)
        updateVehicle(PARIS_CENTER, 0);
        break;
      case error.TIMEOUT:
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
          return;
        } else {
          errorMessage = "Le GPS ne répond pas. Utilisation de la position par défaut (Paris)";
          // Use default position (Paris center) after max retries
          updateVehicle(PARIS_CENTER, 0);
        }
        break;
    }

    toast({
      title: "Information GPS",
      description: errorMessage,
      variant: error.code === error.PERMISSION_DENIED ? "destructive" : "default"
    });
  };

  const startGPSTracking = () => {
    console.log('Starting GPS tracking...');
    
    if (!('geolocation' in navigator)) {
      toast({
        title: "Erreur GPS",
        description: "La géolocalisation n'est pas supportée par votre navigateur. Utilisation de la position par défaut (Paris)",
        variant: "destructive"
      });
      updateVehicle(PARIS_CENTER, 0);
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Initial GPS position received:', pos);
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
            console.log('GPS Update - New Position:', newPosition, 'Speed:', pos.coords.speed);
            updateVehicle(newPosition, pos.coords.speed || 0);
            retryCountRef.current = 0;
          },
          handleGPSError,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      },
      handleGPSError,
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
      globalVehicle.reset(startPosition);
      updateVehicle(startPosition, 0);

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