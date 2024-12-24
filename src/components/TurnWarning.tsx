import { getTurnType } from '../utils/turnUtils';

interface TurnWarningProps {
  distance: number;
  angle: number | null;
}

const TurnWarning = ({ distance, angle }: TurnWarningProps) => {
  // Si l'angle est null, c'est une ligne droite
  if (angle === null) {
    return (
      <div className="text-lg text-green-500">
        belle ligne droite devant
      </div>
    );
  }

  const turnDirection = angle < 0 ? "droite" : "gauche";
  const { type: turnType, color: turnColor } = getTurnType(angle);

  return (
    <div className={`text-lg ${turnColor}`}>
      virage {turnType} à {turnDirection} dans {Math.round(distance)}m
    </div>
  );
};

export default TurnWarning;