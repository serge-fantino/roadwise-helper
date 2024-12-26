export interface EnhancedRoutePoint {
  position: [number, number];
  smoothPosition: [number, number];
  angleReal: number;
  angleSmooth: number;
}

export type RouteState = {
  origin: [number, number] | null;
  destination: { location: [number, number]; address: string } | null;
  routePoints: [number, number][];
  enhancedPoints: EnhancedRoutePoint[];
  routeColor: string;
};

export type RouteObserver = (state: RouteState) => void;