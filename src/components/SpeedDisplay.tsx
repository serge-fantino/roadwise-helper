interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  speedLimit?: number | null;
  deceleration?: number | null;
}

const SpeedDisplay = ({ currentSpeed, recommendedSpeed, speedLimit, deceleration }: SpeedDisplayProps) => {
  const isOverSpeed = currentSpeed > (speedLimit || recommendedSpeed);
  const displaySpeedLimit = speedLimit || null;
  
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

      {/* Unité */}
      <span className="text-sm text-gray-400 mr-4">km/h</span>

      {/* Panneau de limitation */}
      {displaySpeedLimit && (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 border-2 border-white">
          <span className="text-xl font-bold text-white">
            {displaySpeedLimit}
          </span>
        </div>
      )}

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