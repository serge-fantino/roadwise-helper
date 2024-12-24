import { RoadInfoAPIService } from '../types';
import { queryOverpass } from './OverpassAPI';
import { estimateSpeedLimit } from './SpeedLimitEstimator';

export class OverpassRoadInfoService implements RoadInfoAPIService {
  private static instance: OverpassRoadInfoService;
  private isQuotaExceeded = false;

  private constructor() {}

  public static getInstance(): OverpassRoadInfoService {
    if (!OverpassRoadInfoService.instance) {
      OverpassRoadInfoService.instance = new OverpassRoadInfoService();
    }
    return OverpassRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    if (this.isQuotaExceeded) {
      throw new Error('Quota exceeded');
    }

    console.log('[OverpassRoadInfoService] Checking if point is on road:', { lat, lon });
    const query = `
      [out:json];
      way(around:10,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await queryOverpass(query);
      const isOnRoad = data.elements.length > 0;
      console.log('[OverpassRoadInfoService] Point on road check result:', {
        isOnRoad,
        elementsFound: data.elements.length
      });
      return isOnRoad;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      console.error('[OverpassRoadInfoService] Error checking point on road:', error);
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    if (this.isQuotaExceeded) {
      throw new Error('Quota exceeded');
    }

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
      const data = await queryOverpass(query);
      console.log('[OverpassRoadInfoService] Road data:', data);
      
      if (data.elements.length === 0) {
        console.log('[OverpassRoadInfoService] No road elements found');
        return null;
      }

      // Chercher la route la plus proche avec des tags
      for (const element of data.elements) {
        if (element.tags?.highway) {
          const speedLimit = await estimateSpeedLimit(element.tags, lat, lon);
          return speedLimit;
        }
      }
      
      console.log('[OverpassRoadInfoService] No speed limit could be determined');
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      console.error('[OverpassRoadInfoService] Error getting speed limit:', error);
      return null;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    if (this.isQuotaExceeded) {
      throw new Error('Quota exceeded');
    }

    console.log('[OverpassRoadInfoService] Getting current road segment:', { lat, lon });
    const query = `
      [out:json];
      way(around:20,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await queryOverpass(query);
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
      if (error instanceof Error && error.message.includes('429')) {
        this.isQuotaExceeded = true;
      }
      console.error('[OverpassRoadInfoService] Error getting road segment:', error);
      throw error;
    }
  }

  async getRoadData(lat: number, lon: number): Promise<any> {
    console.log('[OverpassRoadInfoService] Getting road data for:', { lat, lon });
    const query = `
      [out:json];
      way(around:10,${lat},${lon})["highway"];
      out geom;
    `;

    try {
      const data = await queryOverpass(query);
      console.log('[OverpassRoadInfoService] Road data:', data);
      return data;
    } catch (error) {
      console.error('[OverpassRoadInfoService] Error getting road data:', error);
      throw error;
    }
  }
}
