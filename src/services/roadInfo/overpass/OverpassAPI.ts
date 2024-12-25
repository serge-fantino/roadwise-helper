const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const FALLBACK_API = 'https://overpass.kumi.systems/api/interpreter';

export class OverpassAPI {
  async queryNearbyRoads(lat: number, lon: number): Promise<any> {
    const query = `
      [out:json];
      way(around:50,${lat},${lon})["highway"];
      (._;>;);
      out body;
    `;
    
    return this.queryOverpass(query);
  }

  private async queryOverpass(query: string): Promise<any> {
    console.log('[OverpassAPI] Sending query:', query);
    
    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'DriverAssistant/1.0',
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        console.error('[OverpassAPI] HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[OverpassAPI] Response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[OverpassAPI] Query error:', error);
      
      // If it's a CORS error or network error, try the fallback endpoint
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('[OverpassAPI] Trying fallback endpoint...');
        return this.queryOverpassFallback(query);
      }
      
      throw error;
    }
  }

  private async queryOverpassFallback(query: string): Promise<any> {
    const response = await fetch(FALLBACK_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'DriverAssistant/1.0',
        'Origin': window.location.origin
      },
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Fallback HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}