import { useState } from 'react';
import { getRoute } from '../utils/routingUtils';
import { toast } from '../components/ui/use-toast';

export const useRouting = () => {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const calculateRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const route = await getRoute(start, end);
      setRoutePoints(route);
      toast({
        title: "Itinéraire calculé",
        description: "L'itinéraire a été calculé avec succès",
      });
      return route;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de calculer l'itinéraire",
        variant: "destructive"
      });
      return [];
    }
  };

  return {
    routePoints,
    calculateRoute
  };
};