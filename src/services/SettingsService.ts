type Observer = (settings: Settings) => void;

export type RoadInfoProvider = 'overpass' | 'mapbox' | 'nominatim';
export type SimulatorVersion = 'v1' | 'v2';
export type DrivingStyle = 'prudent' | 'normal' | 'sportif';

export interface Settings {
  defaultSpeed: number;
  minTurnSpeed: number;
  maxTurnAngle: number;
  minTurnAngle: number;
  roadInfoProvider: RoadInfoProvider;
  mapboxToken: string;
  predictionDistance: number;
  maxRouteDeviation: number;
  disableOverpass: boolean;
  simulatorVersion: SimulatorVersion;
  currentSpeed: number;
  drivingStyle: DrivingStyle;
}

const SETTINGS_STORAGE_KEY = 'app_settings';

class SettingsService {
  private settings: Settings;
  private observers: Observer[] = [];

  constructor() {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const defaultSettings: Settings = {
      defaultSpeed: 90,
      minTurnSpeed: 30,
      maxTurnAngle: 90,
      minTurnAngle: 15,
      roadInfoProvider: 'overpass',
      mapboxToken: '',
      predictionDistance: 500,
      maxRouteDeviation: 50,
      disableOverpass: false,
      simulatorVersion: 'v1',
      currentSpeed: 0,
      drivingStyle: 'prudent'
    };

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings = {
          ...defaultSettings,
          ...parsed
        };
      } catch (e) {
        this.settings = defaultSettings;
      }
    } else {
      this.settings = defaultSettings;
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    this.notifyObservers();
  }

  addObserver(observer: Observer) {
    this.observers.push(observer);
  }

  removeObserver(observer: Observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.getSettings()));
  }
}

export const settingsService = new SettingsService();