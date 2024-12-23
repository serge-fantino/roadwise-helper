import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../models/Vehicle';
import { LocationService } from '../services/location/LocationService';

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

const globalVehicle = new Vehicle(PARIS_CENTER);
(window as any).globalVehicle = globalVehicle;

export const useVehicle = (
  isDebugMode: boolean,
  routePoints: [number, number][],
  initialPosition: [number, number]
) => {
  const [vehicle] = useState<Vehicle>(() => globalVehicle);
  const locationService = useRef<LocationService>(LocationService.getInstance(vehicle));

  useEffect(() => {
    // Mettre à jour le mode en fonction de isDebugMode
    locationService.current.setMode(isDebugMode ? 'simulation' : 'gps');
    
    // Démarrer les mises à jour avec les points de route si nécessaire
    locationService.current.startUpdates(routePoints);

    return () => {
      locationService.current.stopUpdates();
    };
  }, [isDebugMode, routePoints]);

  return vehicle;
};