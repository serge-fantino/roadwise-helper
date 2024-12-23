import { RoadInfoAPIService } from './types';
import { OverpassRoadInfoService } from './OverpassRoadInfoService';
import { MapboxRoadInfoService } from './MapboxRoadInfoService';
import { NominatimRoadInfoService } from './NominatimRoadInfoService';
import { settingsService } from '../SettingsService';

class RoadInfoService implements RoadInfoAPIService {
  private static instance: RoadInfoService;
  private currentProvider: RoadInfoAPIService;

  private constructor() {
    const settings = settingsService.getSettings();
    this.currentProvider = this.getProviderInstance(settings.roadInfoProvider);

    // Observer pour les changements de provider
    settingsService.addObserver((newSettings) => {
      console.log('Switching road info provider to:', newSettings.roadInfoProvider);
      this.currentProvider = this.getProviderInstance(newSettings.roadInfoProvider);
    });
  }

  private getProviderInstance(provider: string): RoadInfoAPIService {
    switch (provider) {
      case 'mapbox':
        const settings = settingsService.getSettings();
        if (!settings.mapboxToken) {
          console.warn('Mapbox token not configured, falling back to Nominatim');
          return NominatimRoadInfoService.getInstance();
        }
        return MapboxRoadInfoService.getInstance();
      case 'nominatim':
        return NominatimRoadInfoService.getInstance();
      case 'overpass':
      default:
        return OverpassRoadInfoService.getInstance();
    }
  }

  public static getInstance(): RoadInfoService {
    if (!RoadInfoService.instance) {
      RoadInfoService.instance = new RoadInfoService();
    }
    return RoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    return this.currentProvider.isPointOnRoad(lat, lon);
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    return this.currentProvider.getSpeedLimit(lat, lon);
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    return this.currentProvider.getCurrentRoadSegment(lat, lon);
  }
}

export const roadInfoService = RoadInfoService.getInstance();