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
      console.log('[OverpassRoadInfoService] Sending query:', query);
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
      console.log('[OverpassRoadInfoService] Response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      console.error('[OverpassRoadInfoService] Query error:', error);
      throw error;
    }
  }

  private async isInCity(lat: number, lon: number): Promise<boolean> {
    console.log('[OverpassRoadInfoService] Checking if location is in city:', { lat, lon });
    const query = `
      [out:json];
      (
        node(around:1000,${lat},${lon})["traffic_sign"="city_limit"];
        way(around:100,${lat},${lon})["landuse"="residential"];
        way(around:100,${lat},${lon})["place"~"city|town|village"];
        relation(around:100,${lat},${lon})["place"~"city|town|village"];
      );
      out body;
    `;

    try {
      const data = await this.query(query);
      const isInCity = data.elements.length > 0;
      console.log('[OverpassRoadInfoService] City check result:', {
        isInCity,
        elementsFound: data.elements.length,
        elements: data.elements
      });
      return isInCity;
    } catch (error) {
      console.error('[OverpassRoadInfoService] Error checking city status:', error);
      return false;
    }
  }

  private async estimateSpeedLimit(tags: Record<string, string>, lat: number, lon: number): Promise<number | null> {
    console.log('[OverpassRoadInfoService] Estimating speed limit with tags:', tags);
    const highway = tags.highway;
    const isInCity = await this.isInCity(lat, lon);
    console.log('[OverpassRoadInfoService] Location check:', { isInCity, highway });

    // Estimation basée sur les règles françaises
    let estimatedLimit: number | null = null;
    
    switch (highway) {
      case 'motorway':
        estimatedLimit = 130;
        break;
      case 'trunk':
        estimatedLimit = 110;
        break;
      case 'primary':
      case 'secondary':
      case 'tertiary':
        // Si c'est une route départementale (présence de ref commençant par D)
        if (tags.ref?.startsWith('D')) {
          estimatedLimit = isInCity ? 50 : 80;
        } else {
          estimatedLimit = isInCity ? 50 : 80;
        }
        break;
      case 'residential':
      case 'living_street':
        estimatedLimit = 30;
        break;
      default:
        estimatedLimit = null;
    }

    console.log('[OverpassRoadInfoService] Estimated speed limit:', {
      estimatedLimit,
      isInCity,
      highway,
      ref: tags.ref
    });

    return estimatedLimit;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    console.log('[OverpassRoadInfoService] Checking if point is on road:', { lat, lon });
    const query = `
      [out:json];
      way(around:10,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await this.query(query);
      const isOnRoad = data.elements.length > 0;
      console.log('[OverpassRoadInfoService] Point on road check result:', {
        isOnRoad,
        elementsFound: data.elements.length
      });
      return isOnRoad;
    } catch (error) {
      console.error('[OverpassRoadInfoService] Error checking point on road:', error);
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    console.log('[OverpassRoadInfoService] Getting speed limit for:', { lat, lon });
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
      console.log('[OverpassRoadInfoService] Speed limit data:', data);
      
      if (data.elements.length === 0) {
        console.log('[OverpassRoadInfoService] No road elements found');
        return null;
      }

      // Chercher d'abord une limite de vitesse explicite
      for (const element of data.elements) {
        if (element.tags?.maxspeed) {
          console.log('[OverpassRoadInfoService] Found explicit maxspeed:', element.tags.maxspeed);
          const speedNumber = parseInt(element.tags.maxspeed.replace(/[^0-9]/g, ''));
          if (!isNaN(speedNumber)) {
            return speedNumber;
          }
        }
      }

      // Si pas de limite explicite, estimer basé sur le type de route
      for (const element of data.elements) {
        if (element.tags?.highway) {
          console.log('[OverpassRoadInfoService] No explicit speed limit found, estimating from road type');
          const estimatedLimit = await this.estimateSpeedLimit(element.tags, lat, lon);
          if (estimatedLimit) {
            return estimatedLimit;
          }
        }
      }
      
      console.log('[OverpassRoadInfoService] No speed limit could be determined');
      return null;
    } catch (error) {
      console.error('[OverpassRoadInfoService] Error getting speed limit:', error);
      return null;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    console.log('[OverpassRoadInfoService] Getting current road segment:', { lat, lon });
    const query = `
      [out:json];
      way(around:20,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await this.query(query);
      if (data.elements.length === 0) {
        console.log('[OverpassRoadInfoService] No road segment found');
        return [];
      }

      const way = data.elements[0];
      if (!way.geometry) {
        console.log('[OverpassRoadInfoService] Road segment has no geometry');
        return [];
      }

      const segment = way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
      console.log('[OverpassRoadInfoService] Found road segment with points:', segment.length);
      return segment;
    } catch (error) {
      console.error('[OverpassRoadInfoService] Error getting road segment:', error);
      throw error;
    }
  }
}