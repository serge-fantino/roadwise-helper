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