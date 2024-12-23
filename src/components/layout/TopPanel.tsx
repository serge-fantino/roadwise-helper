import SpeedPanel from '../SpeedPanel';
import DestinationPanel from '../DestinationPanel';

interface TopPanelProps {
  speed: number;
  recommendedSpeed: number;
  isOnRoad: boolean;
  isDebugMode?: boolean;
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  isSearchMode: boolean;
}

const TopPanel = ({
  speed,
  recommendedSpeed,
  isOnRoad,
  isDebugMode,
  destination,
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  isSearchMode
}: TopPanelProps) => {
  return (
    <>
      <div className="h-20 bg-gray-900 p-2">
        <SpeedPanel 
          currentSpeed={speed} 
          recommendedSpeed={recommendedSpeed}
          isOnRoad={isOnRoad}
          isDebugMode={isDebugMode}
        />
      </div>

      <div className="h-12 bg-gray-900 p-2">
        <DestinationPanel 
          destination={destination} 
          onDestinationSelect={onDestinationSelect}
          onDestinationClick={onDestinationClick}
          onSearchModeChange={onSearchModeChange}
          isSearchMode={isSearchMode}
        />
      </div>
    </>
  );
};

export default TopPanel;