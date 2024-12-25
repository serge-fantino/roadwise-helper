export type RoadInfoProvider = 'overpass' | 'mapbox' | 'nominatim';
export type SimulatorVersion = 'v1' | 'v2';
export type DrivingStyle = 'prudent' | 'normal' | 'sportif';

export interface Settings {
  defaultSpeed: number;
  predictionDistance: number;
  minTurnAngle: number;
  maxTurnAngle: number;
  maxTurnDistance: number;
  minTurnDistance: number;
  minTurnSpeed: number;
  updateInterval: number;
  roadInfoProvider: RoadInfoProvider;
  maxRouteDeviation: number;
  disableOverpass: boolean;
  simulatorVersion: SimulatorVersion;
  drivingStyle: DrivingStyle;
  mapboxToken: string;
}

type SettingsObserver = (settings: Settings) => void;

class SettingsService {
  private settings: Settings;
  private observers: SettingsObserver[] = [];

  constructor() {
    const savedSettings = localStorage.getItem('app_settings');
    
    // Valeurs par défaut
    this.settings = {
      defaultSpeed: 50,
      predictionDistance: 500,
      minTurnAngle: 30,
      maxTurnAngle: 90,
      maxTurnDistance: 200,
      minTurnDistance: 20,
      minTurnSpeed: 30,
      updateInterval: 2000,
      roadInfoProvider: 'nominatim',
      maxRouteDeviation: 50,
      disableOverpass: false,
      simulatorVersion: 'v1',
      drivingStyle: 'prudent',
      mapboxToken: ''
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
    localStorage.setItem('app_settings', JSON.stringify(this.settings));
    this.notifyObservers();
  }

  addObserver(observer: SettingsObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: SettingsObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.settings));
  }
}

export const settingsService = new SettingsService();