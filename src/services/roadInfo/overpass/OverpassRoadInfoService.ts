import { RoadInfoAPIService } from '../types';
import { OverpassAPI } from './OverpassAPI';
import { SpeedLimitEstimator } from './SpeedLimitEstimator';
import { CityDetector } from './CityDetector';

export class OverpassRoadInfoService implements RoadInfoAPIService {
  private static instance: OverpassRoadInfoService;
  private api: OverpassAPI;
  private speedLimitEstimator: SpeedLimitEstimator;
  private cityDetector: CityDetector;

  private constructor() {
    this.api = new OverpassAPI();
    this.speedLimitEstimator = new SpeedLimitEstimator();
    this.cityDetector = new CityDetector();
  }

  public static getInstance(): OverpassRoadInfoService {
    if (!OverpassRoadInfoService.instance) {
      OverpassRoadInfoService.instance = new OverpassRoadInfoService();
    }
    return OverpassRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    return data.elements.length > 0;
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    if (data.elements.length === 0) return null;

    const road = data.elements[0];
    const isInCity = await this.cityDetector.isInCity(lat, lon);
    
    return this.speedLimitEstimator.estimateSpeedLimit(road.tags, isInCity);
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    const data = await this.api.queryNearbyRoads(lat, lon);
    if (data.elements.length === 0) return [];

    const road = data.elements[0];
    if (!road.geometry) return [[lat, lon]];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return road.geometry.map((node: any) => [node.lat, node.lon]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRoadData(lat: number, lon: number): Promise<any> {
    return this.api.queryNearbyRoads(lat, lon);
  }
}