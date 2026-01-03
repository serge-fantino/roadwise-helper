import { RoadInfoAPIService } from './types';
import { fetchWithRetry } from '../../utils/api/fetchWithRetry';

export class NominatimRoadInfoService implements RoadInfoAPIService {
  private static instance: NominatimRoadInfoService;
  private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org';

  private constructor() {}

  public static getInstance(): NominatimRoadInfoService {
    if (!NominatimRoadInfoService.instance) {
      NominatimRoadInfoService.instance = new NominatimRoadInfoService();
    }
    return NominatimRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      const data = await response.json();
      return data.address && (
        data.address.road || 
        data.address.highway || 
        data.address.street
      );
    } catch (error) {
      console.error('Nominatim error:', error);
      return false;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Nominatim');
      }

      const data = await response.json();
      
      // Nominatim ne fournit pas directement les limites de vitesse
      // On utilise une estimation basée sur le type de route
      if (data.address) {
        if (data.address.highway === 'motorway') return 130;
        if (data.address.highway === 'trunk') return 110;
        if (data.address.highway === 'primary') return 90;
        if (data.address.highway === 'secondary') return 80;
        if (data.address.highway === 'residential') return 50;
      }
      
      return null;
    } catch (error) {
      console.error('Nominatim error:', error);
      return null;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    // Nominatim ne fournit pas directement la géométrie des routes
    // On retourne juste le point actuel comme segment
    return [[lat, lon]];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRoadData(lat: number, lon: number): Promise<any> {
    try {
      const response = await fetchWithRetry(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Nominatim');
      }

      const data = await response.json();
      
      return {
        elements: data.address ? [{
          tags: {
            highway: data.address.highway || data.address.road_type,
            maxspeed: null
          },
          geometry: [{
            lat: lat,
            lon: lon
          }]
        }] : []
      };
    } catch (error) {
      console.error('Nominatim error:', error);
      return { elements: [] };
    }
  }
}
