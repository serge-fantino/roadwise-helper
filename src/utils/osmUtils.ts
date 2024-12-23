const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Cache pour stocker les résultats des requêtes
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Fonction utilitaire pour attendre un certain temps
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour récupérer une clé du cache
const getCacheKey = (lat: number, lon: number, queryType: string) => {
  return `${queryType}-${lat.toFixed(6)}-${lon.toFixed(6)}`;
};

// Fonction pour faire une requête avec retry
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, initialDelay = 1000) => {
  try {
    const response = await fetch(url, options);
    
    if (response.ok) {
      return response;
    }
    
    if (response.status === 429 && retries > 0) {
      console.log(`Rate limited, retrying in ${initialDelay}ms...`);
      await delay(initialDelay);
      return fetchWithRetry(url, options, retries - 1, initialDelay * 2);
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying in ${initialDelay}ms...`);
      await delay(initialDelay);
      return fetchWithRetry(url, options, retries - 1, initialDelay * 2);
    }
    throw error;
  }
};

export const isPointOnRoad = async (lat: number, lon: number): Promise<boolean> => {
  const cacheKey = getCacheKey(lat, lon, 'isPointOnRoad');
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

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

    if (!response.ok) {
      console.error('Erreur lors de la requête Overpass');
      return false;
    }

    const data = await response.json();
    const result = data.elements.length > 0;
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Erreur lors de la vérification de la position:', error);
    return false;
  }
};

export const getSpeedLimit = async (lat: number, lon: number): Promise<number | null> => {
  const cacheKey = getCacheKey(lat, lon, 'getSpeedLimit');
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

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

    if (!response.ok) {
      console.error('Erreur lors de la requête Overpass');
      return null;
    }

    const data = await response.json();
    
    if (data.elements.length === 0) {
      cache.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    const maxspeed = data.elements[0].tags.maxspeed;
    let result = null;
    
    if (maxspeed) {
      const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
      if (!isNaN(speedNumber)) {
        if (maxspeed.includes('mph')) {
          result = Math.round(speedNumber * 1.60934);
        } else {
          result = speedNumber;
        }
      }
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération de la vitesse maximale:', error);
    return null;
  }
};

export const getCurrentRoadSegment = async (lat: number, lon: number): Promise<[number, number][]> => {
  const cacheKey = getCacheKey(lat, lon, 'getCurrentRoadSegment');
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

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

    if (!response.ok) {
      console.error('Erreur lors de la requête Overpass');
      return [];
    }

    const data = await response.json();
    
    if (data.elements.length === 0) {
      cache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }

    const way = data.elements[0];
    let result: [number, number][] = [];
    
    if (way.geometry) {
      result = way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération du segment:', error);
    return [];
  }
};