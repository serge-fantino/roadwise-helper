// Cache implementation for OSM requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export const getCacheKey = (lat: number, lon: number, queryType: string) => {
  return `${queryType}-${lat.toFixed(6)}-${lon.toFixed(6)}`;
};

export const getFromCache = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

export const setInCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};