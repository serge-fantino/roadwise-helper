import { roadInfoService } from './index';
import { calculateDistance } from '../../utils/mapUtils';

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
  private readonly UPDATE_DISTANCE = 100; // Distance en mètres avant mise à jour
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
    if (!this.currentInfo) return true;

    const distance = calculateDistance(newPosition, this.currentInfo.lastPosition);
    console.log('Distance since last road info update:', distance, 'm');
    return distance >= this.UPDATE_DISTANCE;
  }

  public async updateRoadInfo(position: [number, number]) {
    // Éviter les mises à jour trop fréquentes
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(async () => {
      if (!this.shouldUpdate(position)) {
        console.log('Skipping road info update - vehicle hasn\'t moved enough');
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

        console.log('Road info updated:', this.currentInfo);
        this.notifyObservers();
      } catch (error) {
        console.error('Error updating road info:', error);
        // En cas d'erreur, on garde les anciennes informations
      }
    }, 100); // Petit délai pour éviter les appels trop fréquents
  }

  public getCurrentInfo(): RoadInfo | null {
    return this.currentInfo;
  }
}

export const roadInfoManager = RoadInfoManager.getInstance();