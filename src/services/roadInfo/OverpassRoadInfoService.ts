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
    // Modifions la requête pour inclure plus de détails sur les limites de vitesse
    const query = `
      [out:json];
      (
        way(around:10,${lat},${lon})["highway"]["maxspeed"];
        way(around:10,${lat},${lon})["highway"]["maxspeed:advisory"];
        way(around:10,${lat},${lon})["highway"]["zone:maxspeed"];
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const data = await this.query(query);
      console.log('Speed limit data:', data);
      
      if (data.elements.length === 0) return null;

      // Cherchons d'abord une limite de vitesse explicite
      for (const element of data.elements) {
        const maxspeed = element.tags?.maxspeed;
        if (maxspeed) {
          console.log('Found maxspeed:', maxspeed);
          const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
          if (!isNaN(speedNumber)) {
            return maxspeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
          }
        }
      }

      // Sinon, cherchons une limite de vitesse conseillée
      for (const element of data.elements) {
        const advisorySpeed = element.tags?.['maxspeed:advisory'];
        if (advisorySpeed) {
          console.log('Found advisory speed:', advisorySpeed);
          const speedNumber = parseInt(advisorySpeed.replace(/[^0-9]/g, ''));
          if (!isNaN(speedNumber)) {
            return advisorySpeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
          }
        }
      }

      // En dernier recours, cherchons une limite de zone
      for (const element of data.elements) {
        const zoneSpeed = element.tags?.['zone:maxspeed'];
        if (zoneSpeed) {
          console.log('Found zone speed:', zoneSpeed);
          const speedNumber = parseInt(zoneSpeed.replace(/[^0-9]/g, ''));
          if (!isNaN(speedNumber)) {
            return zoneSpeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
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