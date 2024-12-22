const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export const isPointOnRoad = async (lat: number, lon: number): Promise<boolean> => {
  // Query pour trouver les routes dans un rayon de 10 mètres autour du point
  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
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
    return data.elements.length > 0;
  } catch (error) {
    console.error('Erreur lors de la vérification de la position:', error);
    return false;
  }
};

export const getSpeedLimit = async (lat: number, lon: number): Promise<number | null> => {
  // Query pour trouver la route la plus proche et sa vitesse maximale dans un rayon de 10 mètres
  const query = `
    [out:json];
    way(around:10,${lat},${lon})["highway"]["maxspeed"];
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
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
      return null;
    }

    // Récupérer la vitesse maximale du premier élément trouvé
    const maxspeed = data.elements[0].tags.maxspeed;
    
    // Convertir la vitesse en nombre si possible
    if (maxspeed) {
      // Gérer les cas spéciaux comme "50 mph" ou "zone:30"
      const speedNumber = parseInt(maxspeed.replace(/[^0-9]/g, ''));
      if (!isNaN(speedNumber)) {
        // Si la vitesse est en mph, convertir en km/h
        if (maxspeed.includes('mph')) {
          return Math.round(speedNumber * 1.60934);
        }
        return speedNumber;
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la vitesse maximale:', error);
    return null;
  }
};

export const getCurrentRoadSegment = async (lat: number, lon: number): Promise<[number, number][]> => {
  const query = `
    [out:json];
    way(around:20,${lat},${lon})["highway"];
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
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
      return [];
    }

    // Prendre le premier segment trouvé et convertir ses coordonnées
    const way = data.elements[0];
    if (way.geometry) {
      return way.geometry.map((node: { lat: number; lon: number }) => [node.lat, node.lon]);
    }

    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération du segment:', error);
    return [];
  }
};
