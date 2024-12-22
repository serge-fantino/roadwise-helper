import { Card } from '../components/ui/card';

interface SpeedPanelProps {
  currentSpeed: number;
  recommendedSpeed: number;
}

const SpeedPanel = ({ currentSpeed, recommendedSpeed }: SpeedPanelProps) => {
  const kmhSpeed = Math.round(currentSpeed * 3.6); // Convert m/s to km/h
  const kmhRecommended = Math.round(recommendedSpeed * 3.6);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="bg-gray-900/90 text-white p-6 rounded-xl w-full max-w-xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-gray-400">Current</div>
            <div className="text-4xl font-bold">{kmhSpeed}</div>
            <div className="text-sm text-gray-400">km/h</div>
          </div>
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-gray-400">Recommended</div>
            <div className={`text-4xl font-bold ${kmhSpeed > kmhRecommended ? 'text-red-500' : 'text-green-500'}`}>
              {kmhRecommended}
            </div>
            <div className="text-sm text-gray-400">km/h</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SpeedPanel;