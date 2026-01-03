import { TurnPrediction } from '@/services/prediction/PredictionTypes';
import { getTurnType } from '@/utils/turnUtils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import TurnPathVisualization from './TurnPathVisualization';

interface TurnCardProps {
  turn: TurnPrediction;
  currentSpeed: number; // en m/s
  isNext: boolean;
  routePoints?: [number, number][];
}

const getCurvatureLabel = (angle: number, radius?: number): string => {
  const absAngle = Math.abs(angle);
  const safeRadius = radius || 0;
  
  // Détection des cas spéciaux
  if (absAngle >= 170 && absAngle <= 190) {
    return 'Retour';
  }
  
  if (safeRadius > 0 && safeRadius < 20) {
    if (absAngle > 90) return 'Épingle';
    return 'Serpentin';
  }
  
  if (safeRadius > 0 && safeRadius < 50 && absAngle > 120) {
    return 'Rond-point';
  }
  
  // Classification par angle
  if (absAngle <= 20) {
    return 'Léger';
  } else if (absAngle <= 45) {
    return 'Modéré';
  } else if (absAngle <= 90) {
    return 'Fort';
  } else if (absAngle <= 135) {
    return 'Très fort';
  } else {
    return 'Épingle';
  }
};

const TurnCard = ({ turn, currentSpeed, isNext, routePoints = [] }: TurnCardProps) => {
  const turnDirection = turn.angle < 0 ? 'droite' : 'gauche';
  const { type: turnType, color: turnColor } = getTurnType(turn.angle);
  const curvatureLabel = getCurvatureLabel(turn.angle, turn.curveInfo?.radius);
  
  const currentSpeedKmh = Math.round(currentSpeed * 3.6);
  const optimalSpeedKmh = turn.optimalSpeed ? Math.round(turn.optimalSpeed) : null;
  const speedLimitKmh = turn.speedLimit ? Math.round(turn.speedLimit) : null;
  
  // Calcul de la barre de progression (similaire à SpeedPanel)
  const maxDistance = 300; // Distance maximale pour commencer à afficher la progression
  const progress = Math.max(0, Math.min(100, (1 - turn.distance / maxDistance) * 100));
  const isLeftTurn = turn.angle < 0;
  
  // Couleur selon la nécessité de freiner
  const needsBraking = optimalSpeedKmh && currentSpeedKmh > optimalSpeedKmh;
  const progressBgColor = needsBraking ? '#EF4444' : '#10B981'; // Rouge si besoin de freiner, vert sinon
  
  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 mb-3 border-2 ${
        isNext ? 'border-blue-500 shadow-lg' : 'border-gray-700'
      } flex gap-4`}
      style={{
        background: `linear-gradient(to ${isLeftTurn ? 'right' : 'left'}, 
          ${progressBgColor}20 ${progress}%, 
          transparent ${progress}%)`
      }}
    >
      {/* Contenu principal à gauche */}
      <div className="flex-1">
      {/* En-tête avec direction et distance */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isNext && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
              PROCHAIN
            </span>
          )}
          <div className={`flex items-center gap-1 ${turnColor}`}>
            {turn.angle < 0 ? (
              <ArrowRight className="h-5 w-5" />
            ) : (
              <ArrowLeft className="h-5 w-5" />
            )}
            <span className="font-semibold text-lg capitalize">{turnDirection}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {Math.round(turn.distance)}<span className="text-sm font-normal">m</span>
          </div>
          <div className="text-xs text-gray-400">Distance restante</div>
        </div>
      </div>

      {/* Informations de courbure */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-400">Type: </span>
          <span className={`font-semibold ${turnColor} capitalize`}>{turnType}</span>
        </div>
        <div>
          <span className="text-gray-400">Courbure: </span>
          <span className="font-semibold text-white">{curvatureLabel}</span>
        </div>
        {turn.curveInfo?.radius && (
          <div>
            <span className="text-gray-400">Rayon: </span>
            <span className="font-semibold text-white">{Math.round(turn.curveInfo.radius)}m</span>
          </div>
        )}
      </div>

      {/* Vitesses */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="bg-gray-900 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Vitesse actuelle</div>
          <div className="text-xl font-bold text-white">
            {currentSpeedKmh}<span className="text-sm"> km/h</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Vitesse optimale</div>
          <div className={`text-xl font-bold ${optimalSpeedKmh && currentSpeedKmh > optimalSpeedKmh ? 'text-red-400' : 'text-green-400'}`}>
            {optimalSpeedKmh ? `${optimalSpeedKmh}` : '—'}<span className="text-sm"> km/h</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Limite</div>
          <div className="text-xl font-bold text-yellow-400">
            {speedLimitKmh ? `${speedLimitKmh}` : '—'}<span className="text-sm"> km/h</span>
          </div>
        </div>
      </div>

      {/* Barre de progression du freinage */}
      {turn.requiredDeceleration !== null && turn.requiredDeceleration !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Décélération requise</span>
            <span className="text-white font-semibold">
              {Math.abs(turn.requiredDeceleration).toFixed(2)}g
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                Math.abs(turn.requiredDeceleration) > 0.3 ? 'bg-red-500' :
                Math.abs(turn.requiredDeceleration) > 0.15 ? 'bg-orange-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(100, Math.abs(turn.requiredDeceleration) * 200)}%` }}
            />
          </div>
        </div>
      )}

      {/* Barre de progression de distance */}
      <div className="mt-3">
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div
            className="h-1 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      </div>

      {/* Visualisation du tracé du virage à droite */}
      {turn.curveInfo && routePoints.length > 0 && (
        <div className="w-40 h-full flex-shrink-0">
          <TurnPathVisualization 
            curveInfo={turn.curveInfo} 
            routePoints={routePoints}
            width={150}
            height={200}
          />
        </div>
      )}
    </div>
  );
};

export default TurnCard;

