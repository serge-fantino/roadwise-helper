import { getSpeedLimit } from '../utils/osmUtils';

type CachedSpeedLimit = {
  value: number;
  timestamp: number;
};

export class SpeedLimitCache {
  private cache: Map<string, CachedSpeedLimit> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 secondes en millisecondes

  private generateKey(lat: number, lon: number): string {
    // Arrondir à 5 décimales pour regrouper les points proches
    return `${lat.toFixed(5)},${lon.toFixed(5)}`;
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number> {
    const key = this.generateKey(lat, lon);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.value;
    }

    const speedLimit = await getSpeedLimit(lat, lon);
    this.cache.set(key, {
      value: speedLimit,
      timestamp: Date.now()
    });

    // Nettoyage périodique du cache
    this.cleanCache();

    return speedLimit;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
} 