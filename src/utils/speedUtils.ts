export const calculateRecommendedSpeed = (currentSpeed: number): number => {
  // This is a simplified calculation - in a real app, this would consider:
  // - Road type and conditions
  // - Weather
  // - Traffic
  // - Upcoming turns and obstacles
  
  // For now, we'll just recommend slightly lower than current speed if above 50 km/h
  const speedKmh = currentSpeed * 3.6;
  if (speedKmh > 50) {
    return (speedKmh - 5) / 3.6;
  }
  return currentSpeed;
};

export const calculateBrakingDistance = (speed: number): number => {
  // Simple braking distance calculation
  // Real calculation would consider:
  // - Road conditions
  // - Tire condition
  // - Weather
  return (speed * speed) / (2 * 9.81 * 0.8); // Simple physics formula with 0.8 friction coefficient
};