import { fetchWithRetry } from './api/fetchWithRetry';
import { getCacheKey, getFromCache, setInCache } from './cache/osmCache';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export const isPointOnRoad = async (lat: number, lon: number): Promise<boolean> => {
  const cacheKey = getCacheKey(lat, lon, 'isPointOnRoad');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    const result = data.elements.length > 0;
    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error checking position:', error);
    return false;
  }
};

export const getSpeedLimit = async (lat: number, lon: number): Promise<number | null> => {
  const cacheKey = getCacheKey(lat, lon, 'getSpeedLimit');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"]["maxspeed"];
    out body;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    let result = null;

    if (data.elements.length > 0) {
      const maxspeed = data.elements[0].tags.maxspeed;
      if (maxspeed) {
        const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
        if (!isNaN(speedNumber)) {
          result = maxspeed.includes('mph') ? Math.round(speedNumber * 1.60934) : speedNumber;
        }
      }
    }

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting speed limit:', error);
    return null;
  }
};

export const getCurrentRoadSegment = async (lat: number, lon: number): Promise<[number, number][]> => {
  const cacheKey = getCacheKey(lat, lon, 'getCurrentRoadSegment');
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  const query = `
    [out:json];
    way(around:20,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetchWithRetry(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    let result: [number, number][] = [];
    
    if (data.elements.length > 0) {
      const way = data.elements[0];
      if (way.geometry) {
        result = way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
      }
    }

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error getting road segment:', error);
    return [];
  }
};