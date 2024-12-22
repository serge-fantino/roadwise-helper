import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/mapUtils';

export const useSimulation = (
  routePoints: [number, number][],
  isDebugMode: boolean,
  onPositionChange: (position: [number, number]) => void,
  onSpeedChange: (speed: number) => void
) => {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const previousPosition = useRef<[number, number] | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing simulation when debug mode changes
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }

    // Only start simulation if in debug mode and we have route points
    if (isDebugMode && routePoints.length > 1) {
      // Reset to start of route when entering debug mode
      setCurrentPointIndex(0);
      if (routePoints[0]) {
        onPositionChange(routePoints[0]);
        previousPosition.current = routePoints[0];
      }

      simulationInterval.current = setInterval(() => {
        setCurrentPointIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          
          // If we've reached the end of the route, stop simulation
          if (nextIndex >= routePoints.length) {
            if (simulationInterval.current) {
              clearInterval(simulationInterval.current);
              simulationInterval.current = null;
            }
            return prevIndex;
          }

          const nextPosition = routePoints[nextIndex];
          onPositionChange(nextPosition);

          // Calculate speed (distance in meters / time in seconds)
          if (previousPosition.current) {
            const distance = calculateDistance(previousPosition.current, nextPosition);
            const speed = distance / 10; // 10 seconds interval
            onSpeedChange(speed);
          }

          previousPosition.current = nextPosition;
          return nextIndex;
        });
      }, 10000); // 10 seconds interval
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    };
  }, [isDebugMode, routePoints, onPositionChange, onSpeedChange]);

  const resetSimulation = () => {
    setCurrentPointIndex(0);
    previousPosition.current = null;
    if (routePoints.length > 0) {
      onPositionChange(routePoints[0]);
      onSpeedChange(0);
    }
  };

  return { resetSimulation };
};