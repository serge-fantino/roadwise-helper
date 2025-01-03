export class CityDetector {
  async isInCity(lat: number, lon: number): Promise<boolean> {
    console.log('[CityDetector] Checking if location is in city:', { lat, lon });
    
    const query = `
      [out:json];
      (
        node(around:1000,${lat},${lon})["traffic_sign"="city_limit"];
        way(around:100,${lat},${lon})["landuse"="residential"];
        way(around:100,${lat},${lon})["place"~"city|town|village"];
        relation(around:100,${lat},${lon})["place"~"city|town|village"];
      );
      out body;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const isInCity = data.elements.length > 0;
      
      console.log('[CityDetector] Result:', {
        isInCity,
        elementsFound: data.elements.length,
        elements: data.elements
      });
      
      return isInCity;
    } catch (error) {
      console.error('[CityDetector] Error:', error);
      return false;
    }
  }
}