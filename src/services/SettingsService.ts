type Observer = (settings: Settings) => void;

export interface Settings {
  defaultSpeed: number;
  minTurnSpeed: number;
  maxTurnAngle: number;
  minTurnAngle: number;
}

class SettingsService {
  private settings: Settings = {
    defaultSpeed: 90,
    minTurnSpeed: 30,
    maxTurnAngle: 90,
    minTurnAngle: 15, // Nouvelle valeur par défaut
  };
  
  private observers: Observer[] = [];

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>) {
    this.settings = { ...this.settings, ...newSettings };
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