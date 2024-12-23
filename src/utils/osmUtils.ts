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
export const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, initialDelay = 1000) => {
  const fetchWithTimeout = async (url: string, options: RequestInit) => {
    const timeout = 5000; // 5 seconds timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Accept': 'application/json',
          'User-Agent': 'DriverAssistant/1.0',
        },
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  try {
    const response = await fetchWithTimeout(url, options);
    
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
      console.log(`Request failed, retrying in ${initialDelay}ms...`, error);
      await delay(initialDelay);
      return fetchWithRetry(url, options, retries - 1, initialDelay * 2);
    }
    console.error('All retries failed:', error);
    // Return a mock response as fallback
    return new Response(JSON.stringify({ elements: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

    const data = await response.json();
    
    if (data.elements.length === 0) {
      // Fallback speed limits based on road type if maxspeed tag is not available
      const roadTypeResponse = await fetchWithRetry(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(`
          [out:json];
          way(around:10,${lat},${lon})["highway"];
          out body;
        `)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const roadData = await roadTypeResponse.json();
      if (roadData.elements.length > 0) {
        const highway = roadData.elements[0].tags.highway;
        const defaultSpeeds: { [key: string]: number } = {
          'motorway': 130,
          'trunk': 110,
          'primary': 90,
          'secondary': 80,
          'tertiary': 70,
          'residential': 50,
          'service': 30,
        };
        const fallbackSpeed = defaultSpeeds[highway] || 50;
        cache.set(cacheKey, { data: fallbackSpeed, timestamp: Date.now() });
        return fallbackSpeed;
      }
      
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