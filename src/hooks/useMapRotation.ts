import { useEffect, useRef } from 'react';
import L from 'leaflet';

export const useMapRotation = (heading: number) => {
  const mapRef = useRef<L.Map | null>(null);

  const rotateMap = (map: L.Map, angle: number) => {
    const container = map.getContainer();
    if (container) {
      container.style.transform = `rotate(${angle}deg)`;
    }
  };

  const initializeMap = (e: L.LeafletEvent) => {
    console.log('[useMapRotation] Map initialized');
    mapRef.current = e.target;
    if (heading) {
      rotateMap(e.target, -heading);
    }
  };

  useEffect(() => {
    console.log('[useMapRotation] Heading effect triggered:', heading);
    if (mapRef.current) {
      console.log('[useMapRotation] Rotating map to:', -heading);
      rotateMap(mapRef.current, -heading);
    }
  }, [heading]);

  return { mapRef, initializeMap };
};