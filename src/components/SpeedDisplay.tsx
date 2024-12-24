interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  speedLimit?: number | null;
  deceleration?: number | null;
}

const SpeedDisplay = ({ currentSpeed, recommendedSpeed, speedLimit, deceleration }: SpeedDisplayProps) => {
  const isOverSpeed = currentSpeed > (speedLimit || recommendedSpeed);
  
  return (
    <div className="flex items-center space-x-2">
      {/* Vitesse actuelle */}
      <span className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
        {currentSpeed}
      </span>

      {/* Séparateur */}
      <span className="text-4xl text-gray-400">/</span>

      {/* Vitesse optimale */}
      <span className="text-4xl font-bold text-green-500">
        {recommendedSpeed}
      </span>

      {/* Unité et limite de vitesse */}
      <span className="text-sm text-gray-400">
        km/h {speedLimit === null ? "(? km/h)" : speedLimit ? `(${speedLimit} km/h)` : ""}
      </span>

      {/* Décélération */}
      {deceleration && deceleration < 0 && (
        <span className="text-sm text-yellow-500 ml-4">
          {Math.abs(deceleration).toFixed(1)}g
        </span>
      )}
    </div>
  );
};

export default SpeedDisplay;