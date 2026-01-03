import { roadInfoService } from './index';
import { calculateDistance } from '../../utils/mapUtils';

export interface RoadInfo {
  isOnRoad: boolean;
  speedLimit: number | null;
  currentSegment: [number, number][];
  isInCity: boolean;
  lastPosition: [number, number];
  roadType: string;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRoadType(tags: any): string {
    if (!tags || !tags.highway) return 'unknown';
    
    switch (tags.highway) {
      case 'motorway':
      case 'motorway_link':
        return 'highway';
      case 'trunk':
      case 'trunk_link':
      case 'primary':
        return 'speed_road';
      case 'secondary':
      case 'tertiary':
        return 'road';
      case 'residential':
      case 'living_street':
        return 'city';
      default:
        return 'road';
    }
  }

  public async forceUpdate(position: [number, number]) {
    console.log('Forcing road info update for position:', position);
    await this.updateRoadInfo(position, true);
  }

  public async updateRoadInfo(position: [number, number], force: boolean = false) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(async () => {
      if (!force && !this.shouldUpdate(position)) {
        return;
      }

      console.log('Updating road info for position:', position);

      try {
        const roadData = await roadInfoService.getRoadData(position[0], position[1]);
        const isOnRoad = roadData.elements.length > 0;
        const tags = roadData.elements[0]?.tags || {};
        const roadType = this.getRoadType(tags);
        const speedLimit = tags.maxspeed ? parseInt(tags.maxspeed) : null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentSegment = roadData.elements[0]?.geometry?.map((node: any) => [node.lat, node.lon]) || [];
        const isInCity = speedLimit ? speedLimit <= 50 : false;

        this.currentInfo = {
          isOnRoad,
          speedLimit,
          currentSegment,
          isInCity,
          lastPosition: position,
          roadType
        };

        this.lastUpdateTime = Date.now();
        console.log('Road info updated:', this.currentInfo);
        this.notifyObservers();
      } catch (error) {
        console.error('Error updating road info:', error);
      }
    }, 100);
  }

  public getCurrentInfo(): RoadInfo | null {
    return this.currentInfo;
  }
}

export const roadInfoManager = RoadInfoManager.getInstance();