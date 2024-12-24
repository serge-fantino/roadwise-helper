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
      console.log('Sending Overpass query:', query);
      const response = await fetchWithRetry(
        this.OVERPASS_API,
        {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      const data = await response.json();
      console.log('Overpass response:', data);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      console.error('Overpass query error:', error);
      throw error;
    }
  }

  private estimateSpeedLimit(tags: Record<string, string>): number | null {
    const highway = tags.highway;
    const isInCity = tags.place === 'city' || tags.place === 'town' || tags.place === 'village';

    // Estimation basée sur les règles françaises
    switch (highway) {
      case 'motorway':
        return 130;
      case 'trunk':
        return 110;
      case 'primary':
      case 'secondary':
      case 'tertiary':
        // Si c'est une route départementale (présence de ref commençant par D)
        if (tags.ref?.startsWith('D')) {
          return isInCity ? 50 : 80;
        }
        return isInCity ? 50 : 80;
      case 'residential':
      case 'living_street':
        return 30;
      default:
        return null;
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
      (
        way(around:10,${lat},${lon})["highway"];
        >;
        <;
      );
      out body;
    `;

    try {
      const data = await this.query(query);
      console.log('Speed limit data:', data);
      
      if (data.elements.length === 0) return null;

      // Chercher d'abord une limite de vitesse explicite
      for (const element of data.elements) {
        if (element.tags?.maxspeed) {
          console.log('Found explicit maxspeed:', element.tags.maxspeed);
          const speedNumber = parseInt(element.tags.maxspeed.replace(/[^0-9]/g, ''));
          if (!isNaN(speedNumber)) {
            return speedNumber;
          }
        }
      }

      // Si pas de limite explicite, estimer basé sur le type de route
      for (const element of data.elements) {
        if (element.tags?.highway) {
          console.log('Estimating speed limit from road type:', element.tags);
          const estimatedLimit = this.estimateSpeedLimit(element.tags);
          if (estimatedLimit) {
            return estimatedLimit;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting speed limit:', error);
      return null;
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