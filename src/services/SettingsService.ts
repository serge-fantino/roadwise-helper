export type RoadInfoProvider = 'overpass' | 'mapbox' | 'nominatim';
export type SimulatorVersion = 'v1' | 'v2';
export type DrivingStyle = 'prudent' | 'normal' | 'sportif';

export interface Settings {
  defaultSpeed: number;
  predictionDistance: number;
  minTurnAngle: number;
  maxTurnDistance: number;
  minTurnDistance: number;
  updateInterval: number;
  roadInfoProvider: RoadInfoProvider;
  maxRouteDeviation: number;
  disableOverpass: boolean;
  simulatorVersion: SimulatorVersion;
  drivingStyle: DrivingStyle;
}

const SETTINGS_STORAGE_KEY = 'app_settings';

class SettingsService {
  private settings: Settings;

  constructor() {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    
    // Valeurs par défaut
    this.settings = {
      defaultSpeed: 50,
      predictionDistance: 200,
      minTurnAngle: 30,
      maxTurnDistance: 200,
      minTurnDistance: 20,
      updateInterval: 2000,
      roadInfoProvider: 'nominatim',
      maxRouteDeviation: 50,
      disableOverpass: false,
      simulatorVersion: 'v1',
      drivingStyle: 'prudent'
    };

    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
  }
}

export const settingsService = new SettingsService();