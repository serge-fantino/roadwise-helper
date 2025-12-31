import DestinationPanel from '../DestinationPanel';
import SpeedPanel from '../SpeedPanel';
import { TurnPrediction } from '@/services/prediction/PredictionTypes';

interface TopPanelProps {
  speed: number;
  isOnRoad: boolean;
  isDebugMode?: boolean;
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  isSearchMode: boolean;
  onViewModeChange: (mode: 'map' | 'drive' | 'roadbook') => void;
  viewMode: 'map' | 'drive' | 'roadbook';
  speedLimit?: number;
  optimalSpeed?: number;
  prediction?: TurnPrediction;
  isRoadPredictorActive: boolean;
}

const TopPanel = ({
  speed,
  isOnRoad,
  isDebugMode,
  destination,
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  isSearchMode,
  onViewModeChange,
  viewMode,
  speedLimit,
  optimalSpeed,
  prediction,
  isRoadPredictorActive
}: TopPanelProps) => {
  return (
    <div className="relative z-10 bg-gray-900 shadow-lg">
      <div className="container mx-auto py-4 px-4">
        <div className="flex flex-col gap-4">
          <SpeedPanel
            currentSpeed={speed}
            speedLimit={speedLimit}
            optimalSpeed={optimalSpeed}
            prediction={prediction}
            isDebugMode={isDebugMode}
          />
          <DestinationPanel
            destination={destination}
            onDestinationSelect={onDestinationSelect}
            onDestinationClick={onDestinationClick}
            onSearchModeChange={onSearchModeChange}
            isSearchMode={isSearchMode}
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};

export default TopPanel;