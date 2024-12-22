import { Card } from './ui/card';
import { Toggle } from './ui/toggle';
import { Bug } from 'lucide-react';

interface SpeedPanelProps {
  currentSpeed: number;
  recommendedSpeed: number;
  isOnRoad?: boolean;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const SpeedPanel = ({ 
  currentSpeed, 
  recommendedSpeed, 
  isOnRoad,
  isDebugMode,
  onDebugModeChange 
}: SpeedPanelProps) => {
  const kmhSpeed = Math.round(currentSpeed * 3.6); // Convert m/s to km/h
  const kmhRecommended = Math.round(recommendedSpeed * 3.6);
  const isIdle = currentSpeed === 0;
  
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <Card className="bg-gray-900/90 text-white p-6 rounded-xl w-full max-w-xl mx-auto">
        <div className="grid grid-cols-4 gap-4">
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
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-gray-400">Status</div>
            <div className={`text-2xl font-bold ${isOnRoad ? 'text-green-500' : 'text-red-500'}`}>
              {isOnRoad ? 'ON ROAD' : 'OFF ROAD'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-gray-400">Movement</div>
            <div className={`text-2xl font-bold ${isIdle ? 'text-yellow-500' : 'text-blue-500'}`}>
              {isIdle ? 'IDLE' : 'MOVING'}
            </div>
          </div>
        </div>
        {onDebugModeChange && (
          <div className="mt-4 flex justify-end">
            <Toggle
              pressed={isDebugMode}
              onPressedChange={onDebugModeChange}
              className="data-[state=on]:bg-green-500"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Mode
            </Toggle>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SpeedPanel;