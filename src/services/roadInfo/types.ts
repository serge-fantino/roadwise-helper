export interface RoadInfo {
  isOnRoad: boolean;
  speedLimit: number | null;
  roadSegment: [number, number][];
}

export interface RoadInfoAPIService {
  isPointOnRoad(lat: number, lon: number): Promise<boolean>;
  getSpeedLimit(lat: number, lon: number): Promise<number | null>;
  getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]>;
}