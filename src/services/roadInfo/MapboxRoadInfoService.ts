import { RoadInfoAPIService } from './types';

export class MapboxRoadInfoService implements RoadInfoAPIService {
  private static instance: MapboxRoadInfoService;
  private readonly MAPBOX_API = 'https://api.mapbox.com/v4';
  private readonly accessToken: string;

  private constructor() {
    // À remplacer par la vraie clé d'API
    this.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
  }

  public static getInstance(): MapboxRoadInfoService {
    if (!MapboxRoadInfoService.instance) {
      MapboxRoadInfoService.instance = new MapboxRoadInfoService();
    }
    return MapboxRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    // TODO: Implémenter avec l'API Mapbox
    // Pour l'instant, retourne true par défaut
    return true;
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    // TODO: Implémenter avec l'API Mapbox
    // Pour l'instant, retourne null
    return null;
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    // TODO: Implémenter avec l'API Mapbox
    // Pour l'instant, retourne un segment vide
    return [];
  }
}