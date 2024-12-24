import { RoadInfoAPIService } from './types';
import { settingsService } from '../SettingsService';

export class RoadInfoService implements RoadInfoAPIService {
  private provider: RoadInfoAPIService;

  constructor(provider: RoadInfoAPIService) {
    this.provider = provider;
  }

  private isDisabled(): boolean {
    const settings = settingsService.getSettings();
    return settings.disableOverpass;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return true; // On suppose que le point est sur la route par défaut
    }
    return this.provider.isPointOnRoad(lat, lon);
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return null;
    }
    return this.provider.getSpeedLimit(lat, lon);
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    if (this.isDisabled()) {
      console.log('Road info API calls are disabled');
      return [];
    }
    return this.provider.getCurrentRoadSegment(lat, lon);
  }
}