export interface RoadInfoAPIService {
  isPointOnRoad(lat: number, lon: number): Promise<boolean>;
  getSpeedLimit(lat: number, lon: number): Promise<number | null>;
  getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]>;
  getRoadData(lat: number, lon: number): Promise<any>;
}