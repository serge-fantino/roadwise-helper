export type RouteState = {
  origin: [number, number] | null;
  destination: { location: [number, number]; address: string } | null;
  routePoints: [number, number][];
};

export type RouteObserver = (state: RouteState) => void;