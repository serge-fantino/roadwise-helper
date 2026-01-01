export type LatLon = [number, number];

export interface VehicleTelemetry {
  /** GPS position [lat, lon] */
  position: LatLon;
  /** Heading in degrees (same convention as VehicleStateManager) */
  heading: number;
  /** Speed (unit consistent with VehicleStateManager; likely km/h) */
  speed: number;
  /** Acceleration (unit consistent with VehicleStateManager) */
  acceleration: number;
}


