type Observer = (settings: Settings) => void;

export type RoadInfoProvider = 'overpass' | 'mapbox';

export interface Settings {
  defaultSpeed: number;
  minTurnSpeed: number;
  maxTurnAngle: number;
  minTurnAngle: number;
  roadInfoProvider: RoadInfoProvider;
  mapboxToken: string;
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
    };

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Assurons-nous que toutes les propriétés sont présentes
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