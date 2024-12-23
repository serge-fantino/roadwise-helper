import { RoadInfoAPIService } from './types';
import { OverpassRoadInfoService } from './OverpassRoadInfoService';
import { MapboxRoadInfoService } from './MapboxRoadInfoService';

export class RoadInfoService implements RoadInfoAPIService {
  private static instance: RoadInfoService;
  private services: RoadInfoAPIService[];
  private currentServiceIndex: number = 0;

  private constructor() {
    this.services = [
      OverpassRoadInfoService.getInstance(),
      MapboxRoadInfoService.getInstance()
    ];
  }

  public static getInstance(): RoadInfoService {
    if (!RoadInfoService.instance) {
      RoadInfoService.instance = new RoadInfoService();
    }
    return RoadInfoService.instance;
  }

  private async tryNextService<T>(operation: (service: RoadInfoAPIService) => Promise<T>): Promise<T> {
    const initialServiceIndex = this.currentServiceIndex;
    
    do {
      try {
        const result = await operation(this.services[this.currentServiceIndex]);
        return result;
      } catch (error) {
        console.log(`Service ${this.currentServiceIndex} failed:`, error);
        
        // Passer au service suivant
        this.currentServiceIndex = (this.currentServiceIndex + 1) % this.services.length;
        
        // Si on a fait le tour complet des services, on relance l'erreur
        if (this.currentServiceIndex === initialServiceIndex) {
          throw new Error('All road info services failed');
        }
      }
    } while (true);
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    return this.tryNextService(service => service.isPointOnRoad(lat, lon));
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    return this.tryNextService(service => service.getSpeedLimit(lat, lon));
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    return this.tryNextService(service => service.getCurrentRoadSegment(lat, lon));
  }
}

// Export d'une instance singleton
export const roadInfoService = RoadInfoService.getInstance();