interface SpeedDisplayProps {
  currentSpeed: number;
  recommendedSpeed: number;
  deceleration?: number | null;
}

const SpeedDisplay = ({ currentSpeed, recommendedSpeed, deceleration }: SpeedDisplayProps) => {
  console.log('Speed in SpeedDisplay:', currentSpeed, recommendedSpeed);
  const isOverSpeed = currentSpeed > recommendedSpeed;

  return (
    <div className={`text-4xl font-bold ${isOverSpeed ? 'text-red-500' : 'text-green-500'}`}>
      {currentSpeed}/{recommendedSpeed}
      <span className="text-sm ml-2 text-gray-400">km/h</span>
      {deceleration && deceleration < 0 && (
        <span className="text-sm ml-4 text-yellow-500">
          {Math.abs(deceleration).toFixed(1)}g
        </span>
      )}
    </div>
  );
};

export default SpeedDisplay;