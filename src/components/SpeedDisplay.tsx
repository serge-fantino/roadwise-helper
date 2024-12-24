interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  speedLimit?: number | null;
  deceleration?: number | null;
  acceleration?: number;
}

const SpeedDisplay = ({ 
  currentSpeed, 
  recommendedSpeed, 
  speedLimit, 
  deceleration,
  acceleration = 0 
}: SpeedDisplayProps) => {
  const isOverSpeed = speedLimit ? currentSpeed > speedLimit : currentSpeed > recommendedSpeed;
  
  const getAccelerationDisplay = () => {
    if (Math.abs(acceleration) < 0.01) {
      return (
        <span className="text-sm text-gray-400 ml-4 px-2 py-1 rounded">
          STEADY
        </span>
      );
    }
    
    if (acceleration > 0) {
      return (
        <span className="text-sm text-white ml-4 px-2 py-1 rounded bg-green-600">
          ACCEL ({acceleration.toFixed(2)}g)
        </span>
      );
    }
    
    return (
      <span className="text-sm text-white ml-4 px-2 py-1 rounded bg-red-600">
        BRAKE ({Math.abs(acceleration).toFixed(2)}g)
      </span>
    );
  };
  
  return (
    <div className="flex items-center space-x-2">
      {/* Vitesse actuelle */}
      <span className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
        {currentSpeed}
      </span>

      {/* Séparateur */}
      <span className="text-4xl text-gray-400">/</span>

      {/* Vitesse recommandée */}
      <span className="text-4xl font-bold text-green-500">
        {speedLimit || recommendedSpeed}
      </span>

      {/* Unité et limite de vitesse */}
      <span className="text-sm text-gray-400">
        km/h {speedLimit ? `(${speedLimit} km/h)` : ''}
      </span>

      {/* Indicateur d'accélération */}
      {getAccelerationDisplay()}

      {/* Décélération requise */}
      {deceleration && deceleration < 0 && (
        <span className="text-sm text-yellow-500 ml-4">
          {Math.abs(deceleration).toFixed(1)}g req
        </span>
      )}
    </div>
  );
};

export default SpeedDisplay;