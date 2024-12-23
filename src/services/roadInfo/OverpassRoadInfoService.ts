import { RoadInfoAPIService } from './types';
import { fetchWithRetry } from '../../utils/api/fetchWithRetry';

export class OverpassRoadInfoService implements RoadInfoAPIService {
  private static instance: OverpassRoadInfoService;
  private readonly OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  private isQuotaExceeded = false;

  private constructor() {}

  public static getInstance(): OverpassRoadInfoService {
    if (!OverpassRoadInfoService.instance) {
      OverpassRoadInfoService.instance = new OverpassRoadInfoService();
    }
    return OverpassRoadInfoService.instance;
  }

  private async query(query: string): Promise<any> {
    if (this.isQuotaExceeded) {
      throw new Error('Quota exceeded');
    }

    try {
      const response = await fetchWithRetry(
        this.OVERPASS_API,
        {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        3,
        2000,
        30000
      );

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      throw error;
    }
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    const query = `
      [out:json];
      way(around:10,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await this.query(query);
      return data.elements.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    const query = `
      [out:json];
      way(around:10,${lat},${lon})["highway"]["maxspeed"];
      out body;
    `;

    try {
      const data = await this.query(query);
      if (data.elements.length === 0) return null;

      const maxspeed = data.elements[0].tags.maxspeed;
      if (!maxspeed) return null;

      const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
      if (isNaN(speedNumber)) return null;

      return maxspeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    const query = `
      [out:json];
      way(around:20,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await this.query(query);
      if (data.elements.length === 0) return [];

      const way = data.elements[0];
      if (!way.geometry) return [];

      return way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
    } catch (error) {
      throw error;
    }
  }
}
