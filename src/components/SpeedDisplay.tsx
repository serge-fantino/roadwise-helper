interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  speedLimit?: number | null;
  deceleration?: number | null;
}

const SpeedDisplay = ({ currentSpeed, recommendedSpeed, speedLimit, deceleration }: SpeedDisplayProps) => {
  const isOverSpeed = currentSpeed > (speedLimit || recommendedSpeed);
  const displaySpeedLimit = speedLimit || '—';
  
  return (
    <div className="space-y-1">
      <div className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
        {currentSpeed}
        <span className="text-sm ml-2 text-gray-400">km/h</span>
      </div>
      <div className="text-sm space-x-2">
        <span className="text-gray-300">Limite: {displaySpeedLimit}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-300">Optimal: {recommendedSpeed}</span>
        {deceleration && deceleration < 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-yellow-500">
              {Math.abs(deceleration).toFixed(1)}g
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeedDisplay;