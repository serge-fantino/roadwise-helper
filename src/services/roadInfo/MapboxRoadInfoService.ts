import { RoadInfoAPIService } from './types';

export class MapboxRoadInfoService implements RoadInfoAPIService {
  private static instance: MapboxRoadInfoService;
  private readonly MAPBOX_API = 'https://api.mapbox.com/v4';
  private readonly accessToken: string;

  private constructor() {
    // À remplacer par la vraie clé d'API
    this.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHF5ZXJwOWwwMXZqMmtvNXZ4Z2t1NXZsIn0.Fk7UqOHH2yP7bA';
  }

  public static getInstance(): MapboxRoadInfoService {
    if (!MapboxRoadInfoService.instance) {
      MapboxRoadInfoService.instance = new MapboxRoadInfoService();
    }
    return MapboxRoadInfoService.instance;
  }

  async isPointOnRoad(lat: number, lon: number): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.features.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=10&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return null;

      // Récupérer la vitesse maximale depuis les propriétés de la route
      const speedLimit = data.features[0].properties.maxspeed;
      if (!speedLimit) return null;

      // Convertir mph en km/h si nécessaire
      return speedLimit.includes('mph') 
        ? Math.round(parseInt(speedLimit) * 1.60934) 
        : parseInt(speedLimit);
    } catch (error) {
      throw error;
    }
  }

  async getCurrentRoadSegment(lat: number, lon: number): Promise<[number, number][]> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=road&radius=20&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quota exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.features.length === 0) return [];

      // Récupérer la géométrie de la route
      const geometry = data.features[0].geometry;
      if (!geometry || !geometry.coordinates) return [];

      // Convertir les coordonnées [lon, lat] en [lat, lon]
      return geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    } catch (error) {
      throw error;
    }
  }
}