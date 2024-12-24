import { roadInfoService } from './index';
import { calculateDistance } from '../../utils/mapUtils';
import { settingsService } from '../SettingsService';

export interface RoadInfo {
  isOnRoad: boolean;
  speedLimit: number | null;
  currentSegment: [number, number][];
  isInCity: boolean;
  lastPosition: [number, number];
}

type RoadInfoObserver = (info: RoadInfo) => void;

class RoadInfoManager {
  private static instance: RoadInfoManager;
  private observers: RoadInfoObserver[] = [];
  private currentInfo: RoadInfo | null = null;
  private readonly MIN_UPDATE_DISTANCE = 10;
  private readonly MIN_UPDATE_INTERVAL = 5000;
  private lastUpdateTime: number = 0;
  private updateTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): RoadInfoManager {
    if (!RoadInfoManager.instance) {
      RoadInfoManager.instance = new RoadInfoManager();
    }
    return RoadInfoManager.instance;
  }

  public addObserver(observer: RoadInfoObserver) {
    this.observers.push(observer);
  }

  public removeObserver(observer: RoadInfoObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    if (this.currentInfo) {
      this.observers.forEach(observer => observer(this.currentInfo!));
    }
  }

  private shouldUpdate(newPosition: [number, number]): boolean {
    // Check if Overpass is disabled
    if (settingsService.getSettings().disableOverpass) {
      console.log('Skipping road info update - Overpass API is disabled');
      return false;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate < this.MIN_UPDATE_INTERVAL) {
      console.log('Skipping road info update - too soon since last update:', 
        timeSinceLastUpdate, 'ms');
      return false;
    }

    if (!this.currentInfo) return true;

    const distance = calculateDistance(newPosition, this.currentInfo.lastPosition);
    console.log('Distance since last road info update:', distance, 'm');

    return distance >= this.MIN_UPDATE_DISTANCE;
  }

  public async updateRoadInfo(position: [number, number]) {
    // Annuler tout timeout en cours
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Utiliser un debounce pour éviter les appels trop fréquents
    this.updateTimeout = setTimeout(async () => {
      if (!this.shouldUpdate(position)) {
        return;
      }

      console.log('Updating road info for position:', position);

      try {
        // Faire toutes les requêtes en parallèle
        const [isOnRoad, speedLimit, currentSegment] = await Promise.all([
          roadInfoService.isPointOnRoad(position[0], position[1]),
          roadInfoService.getSpeedLimit(position[0], position[1]),
          roadInfoService.getCurrentRoadSegment(position[0], position[1])
        ]);

        // Déterminer si on est en ville à partir des tags de la route
        const isInCity = speedLimit ? speedLimit <= 50 : false;

        this.currentInfo = {
          isOnRoad,
          speedLimit,
          currentSegment,
          isInCity,
          lastPosition: position
        };

        this.lastUpdateTime = Date.now();
        console.log('Road info updated:', this.currentInfo);
        this.notifyObservers();
      } catch (error) {
        console.error('Error updating road info:', error);
        // En cas d'erreur, on garde les anciennes informations
      }
    }, 100); // Petit délai pour le debounce
  }

  public getCurrentInfo(): RoadInfo | null {
    return this.currentInfo;
  }
}

export const roadInfoManager = RoadInfoManager.getInstance();