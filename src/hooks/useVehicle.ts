import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { toast } from '../components/ui/use-toast';
import { useSimulationControl } from './useSimulationControl';

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
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const hasInitializedRef = useRef(false);
  const previousDebugModeRef = useRef(isDebugMode);

  // Utilise notre nouveau hook de simulation
  useSimulationControl(vehicle, isDebugMode, routePoints);

  const updateVehicle = (position: [number, number], speed: number) => {
    console.log('Updating vehicle position:', position);
    globalVehicle.update(position, speed);
    setVehicle(globalVehicle);
  };

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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Initial GPS position received:', pos);
        const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (!hasInitializedRef.current) {
          globalVehicle.reset(newPosition);
          hasInitializedRef.current = true;
        }
        updateVehicle(newPosition, pos.coords.speed || 0);

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

  return vehicle;
};