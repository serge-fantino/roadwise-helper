import { getTurnType } from '../utils/turnUtils';

interface TurnWarningProps {
  distance: number;
  angle: number;
}

const TurnWarning = ({ distance, angle }: TurnWarningProps) => {
  const turnDirection = angle < 0 ? "droite" : "gauche";
  const { type: turnType, color: turnColor } = getTurnType(angle);

  if (distance > 500) {
    return (
      <div className="text-lg text-green-500">
        belle ligne droite devant
      </div>
    );
  }

  return (
    <div className={`text-lg ${turnColor}`}>
      virage {turnType} à {turnDirection} dans {Math.round(distance)}m
    </div>
  );
};

export default TurnWarning;