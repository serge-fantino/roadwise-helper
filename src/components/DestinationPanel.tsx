import { Button } from './ui/button';
import { Search, MapPin, X, Play, Square, Map, Car, Pause } from 'lucide-react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useState, useEffect } from 'react';
import { Toggle } from './ui/toggle';

interface DestinationPanelProps {
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  onViewModeChange: (mode: 'map' | 'drive') => void;
  isSearchMode: boolean;
  viewMode: 'map' | 'drive';
}

const DestinationPanel = ({ 
  destination, 
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  onViewModeChange,
  isSearchMode,
  viewMode
}: DestinationPanelProps) => {
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    const updatePredictionState = (isActive: boolean) => {
      console.log('Prediction state updated:', isActive);
      setIsPredicting(isActive);
    };

    // Initial state
    setIsPredicting(roadPredictor.getIsActive());

    // Subscribe to state changes
    roadPredictor.addStateObserver(updatePredictionState);
    return () => roadPredictor.removeStateObserver(updatePredictionState);
  }, []);

  const handleSearchClick = () => {
    console.log('Search mode activated');
    onSearchModeChange(true);
  };

  const handleCloseClick = () => {
    console.log('Search mode deactivated');
    onSearchModeChange(false);
  };

  const handlePredictionToggle = () => {
    console.log('Toggling prediction state, current state:', isPredicting);
    if (isPredicting) {
      roadPredictor.stopUpdates();
    } else {
      roadPredictor.startUpdates();
    }
  };

  const handlePositionClick = () => {
    if (!destination) {
      handleSearchClick();
    } else {
      onDestinationClick();
    }
  };

  const handleViewModeToggle = () => {
    onViewModeChange(viewMode === 'map' ? 'drive' : 'map');
  };

  if (isSearchMode) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-4">
        <span className="text-lg font-semibold">Search destination</span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 ml-2 flex-shrink-0"
          onClick={handleCloseClick}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="h-5 w-5 flex-shrink-0" />
        <button
          className="hover:text-blue-400 transition-colors text-left truncate"
          onClick={handlePositionClick}
        >
          {destination ? destination.address : <span className="text-gray-400">Free ride mode</span>}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 flex-shrink-0"
          onClick={handleSearchClick}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 flex-shrink-0"
          onClick={handlePredictionToggle}
        >
          {isPredicting ? (
            <Play className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </Button>
        <Toggle
          pressed={viewMode === 'drive'}
          onPressedChange={() => handleViewModeToggle()}
          className="text-white hover:text-white hover:bg-gray-800"
        >
          {viewMode === 'map' ? (
            <Car className="h-5 w-5" />
          ) : (
            <Map className="h-5 w-5" />
          )}
        </Toggle>
      </div>
    </div>
  );
};

export default DestinationPanel;