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
    if (!isDebugMode || routePoints.length < 2) {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
      return;
    }

    simulationInterval.current = setInterval(() => {
      if (currentPointIndex < routePoints.length - 1) {
        const currentPosition = routePoints[currentPointIndex];
        const nextPosition = routePoints[currentPointIndex + 1];

        // Update position
        onPositionChange(nextPosition);

        // Calculate speed (distance in meters / time in seconds)
        if (previousPosition.current) {
          const distance = calculateDistance(previousPosition.current, nextPosition);
          const speed = distance / 10; // 10 seconds interval
          onSpeedChange(speed);
        }

        previousPosition.current = nextPosition;
        setCurrentPointIndex(prev => prev + 1);
      } else {
        // End of route
        if (simulationInterval.current) {
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
        }
      }
    }, 10000); // 10 seconds interval

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    };
  }, [isDebugMode, routePoints, currentPointIndex, onPositionChange, onSpeedChange]);

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