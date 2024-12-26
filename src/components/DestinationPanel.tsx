import { Button } from './ui/button';
import { Search, MapPin, X, Play, Square } from 'lucide-react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useState, useEffect } from 'react';

interface DestinationPanelProps {
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
  onSearchModeChange: (isSearchMode: boolean) => void;
  isSearchMode: boolean;
}

const DestinationPanel = ({ 
  destination, 
  onDestinationSelect,
  onDestinationClick,
  onSearchModeChange,
  isSearchMode
}: DestinationPanelProps) => {
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    const updatePredictionState = (isActive: boolean) => {
      console.log('Prediction state updated:', isActive);
      setIsPredicting(isActive);
    };

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
    <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-4">
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
          onClick={handlePredictionToggle}
        >
          {isPredicting ? (
            <Square className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-gray-800 flex-shrink-0"
          onClick={handleSearchClick}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default DestinationPanel;