import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';

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

  if (isSearchMode) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-4">
        <span className="text-lg font-semibold w-full">Search destination</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white px-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="h-5 w-5 flex-shrink-0" />
        {destination ? (
          <button
            className="hover:text-blue-400 transition-colors text-left truncate"
            onClick={onDestinationClick}
          >
            {destination.address}
          </button>
        ) : (
          <span className="text-gray-400 truncate">Free ride mode</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:text-white hover:bg-gray-800 ml-2 flex-shrink-0"
        onClick={() => onSearchModeChange(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default DestinationPanel;