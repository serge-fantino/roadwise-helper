import { useState } from 'react';
import { getRoute } from '../utils/routingUtils';
import { toast } from '../components/ui/use-toast';

export const useRouting = () => {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const calculateRoute = async (start: [number, number], end: [number, number]) => {
    try {
      console.log('Calculating route from', start, 'to', end);
      const route = await getRoute(start, end);
      console.log('Route calculated with', route.length, 'points:', route);
      
      if (route.length < 2) {
        toast({
          title: "Erreur",
          description: "L'itinéraire calculé est invalide",
          variant: "destructive"
        });
        return [];
      }

      setRoutePoints(route);
      toast({
        title: "Itinéraire calculé (Old)",
        description: "L'itinéraire a été calculé avec succès",
      });
      return route;
    } catch (error) {
      console.error('Error calculating route:', error);
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