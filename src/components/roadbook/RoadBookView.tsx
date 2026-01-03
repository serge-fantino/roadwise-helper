import { useEffect, useState } from 'react';
import { roadPredictor } from '@/services/prediction/RoadPredictor';
import { vehicleStateManager, VehicleState } from '@/services/VehicleStateManager';
import { routePlannerService } from '@/services/route/RoutePlannerService';
import { TurnPrediction } from '@/services/prediction/PredictionTypes';
import { RouteState } from '@/services/route/RoutePlannerTypes';
import TurnCard from './TurnCard';

const RoadBookView = () => {
  const [turns, setTurns] = useState<TurnPrediction[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  useEffect(() => {
    // Observer pour les prédictions de virages
    const predictionObserver = (prediction: TurnPrediction | null, allTurns: TurnPrediction[]) => {
      console.log('[RoadBookView] Turns updated:', allTurns);
      
      // Les virages sont déjà triés et filtrés par TurnPredictionManager
      // On ne fait qu'un filtrage minimal pour s'assurer de la validité
      // et utiliser le même critère de dédoublonnage (turn.index) que TurnPredictionManager
      const MAX_DISTANCE = 10000; // 10km
      const seen = new Set<number>();
      
      const validTurns = allTurns
        .filter(turn => {
          // Vérifier que le virage est valide
          if (!turn.curveInfo || turn.distance <= 0 || turn.distance > MAX_DISTANCE) {
            return false;
          }
          // Utiliser turn.index pour la cohérence avec TurnPredictionManager.sortTurns()
          if (seen.has(turn.index)) {
            return false;
          }
          seen.add(turn.index);
          return true;
        })
        .slice(0, 5); // Prendre les 5 premiers (déjà triés par distance)
      
      // S'assurer que le premier virage correspond au currentPrediction si disponible
      // Cela garantit la synchronisation entre le header et le roadbook
      if (prediction && validTurns.length > 0) {
        const firstTurn = validTurns[0];
        // Si le prediction correspond au premier virage, utiliser les données du prediction
        // (qui inclut le requiredDeceleration recalculé)
        if (prediction.index === firstTurn.index || 
            (prediction.curveInfo && firstTurn.curveInfo && 
             prediction.curveInfo.startIndex === firstTurn.curveInfo.startIndex)) {
          validTurns[0] = { ...firstTurn, ...prediction };
        }
      }
      
      console.log('[RoadBookView] Filtered turns:', validTurns.length, 'from', allTurns.length);
      console.log('[RoadBookView] First turn:', validTurns[0]?.distance, 'm, prediction:', prediction?.distance, 'm');
      setTurns(validTurns);
    };

    roadPredictor.addObserver(predictionObserver);
    
    // Forcer une notification initiale si des virages existent déjà
    // (au cas où l'observer est ajouté après que les virages aient été calculés)
    // La position est maintenant mise à jour automatiquement dans MainLayout

    return () => {
      roadPredictor.removeObserver(predictionObserver);
    };
  }, []);

  useEffect(() => {
    // Observer pour la vitesse actuelle
    const handleVehicleUpdate = (state: VehicleState) => {
      setCurrentSpeed(state.speed);
    };

    vehicleStateManager.addObserver(handleVehicleUpdate);
    setCurrentSpeed(vehicleStateManager.getState().speed);

    return () => {
      vehicleStateManager.removeObserver(handleVehicleUpdate);
    };
  }, []);

  useEffect(() => {
    // Observer pour les points de la route
    const handleRouteUpdate = (state: RouteState) => {
      setRoutePoints(state.routePoints);
    };

    routePlannerService.addObserver(handleRouteUpdate);
    setRoutePoints(routePlannerService.getState().routePoints);

    return () => {
      routePlannerService.removeObserver(handleRouteUpdate);
    };
  }, []);

  if (turns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <div className="text-2xl mb-2">📖</div>
          <div className="text-lg">Aucun virage détecté</div>
          <div className="text-sm mt-2">Définissez une destination pour voir les virages à venir</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-1">Road Book</h2>
          <p className="text-gray-400 text-sm">
            {turns.length} {turns.length > 1 ? 'virages' : 'virage'} à venir
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Le badge indique la classification (Intersection / Épingle / …) quand disponible.
          </p>
        </div>

        <div className="space-y-3">
          {turns.map((turn, index) => (
            <TurnCard
              key={`turn-${turn.index}-${turn.curveInfo.startIndex}-${turn.curveInfo.endIndex}-${index}`}
              turn={turn}
              currentSpeed={currentSpeed}
              isNext={index === 0}
              routePoints={routePoints}
            />
          ))}
        </div>

        {turns.length < 3 && (
          <div className="mt-6 text-center text-gray-500 text-sm">
            <p>Peu de virages détectés sur cette route</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadBookView;

