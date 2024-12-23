import { RoadInfoAPIService } from './types';
import { settingsService } from '../SettingsService';

export class MapboxRoadInfoService implements RoadInfoAPIService {
  private static instance: MapboxRoadInfoService;
  private readonly MAPBOX_API = 'https://api.mapbox.com/v4';

  private constructor() {}

  public static getInstance(): MapboxRoadInfoService {
    if (!MapboxRoadInfoService.instance) {
      MapboxRoadInfoService.instance = new MapboxRoadInfoService();
    }
    return MapboxRoadInfoService.instance;
  }

  private get accessToken(): string {
    return settingsService.getSettings().mapboxToken;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.features.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return null;

      const speedLimit = data.features[0].properties.maxspeed;
      if (!speedLimit) return null;

      return speedLimit.includes('mph') 
        ? Math.round(parseInt(speedLimit) * 1.60934) 
        : parseInt(speedLimit);
    } catch (error) {
      throw error;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    if (!this.accessToken) {
      throw new Error('Mapbox token not configured');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=20&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return [];

      const geometry = data.features[0].geometry;
      if (!geometry || !geometry.coordinates) return [];

      return geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    } catch (error) {
      throw error;
    }
  }
}