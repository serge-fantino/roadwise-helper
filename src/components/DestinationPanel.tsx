import { useState } from 'react';
import { Button } from './ui/button';
import { Search, MapPin, X } from 'lucide-react';
import AddressSearch from './AddressSearch';

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

  if (!destination) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-400" />
          <span className="text-gray-400">Free ride mode</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:text-white hover:bg-gray-800"
          onClick={() => onSearchModeChange(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Search destination
        </Button>
      </div>
    );
  }

  if (isSearchMode) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white">
        <span className="text-lg font-semibold">Search destination</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:text-white hover:bg-gray-800"
          onClick={() => onSearchModeChange(false)}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between text-white">
      <button
        className="flex items-center gap-2 hover:text-blue-400 transition-colors"
        onClick={onDestinationClick}
      >
        <MapPin className="h-5 w-5" />
        <span className="truncate">{destination.address}</span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:text-white hover:bg-gray-800"
        onClick={() => onSearchModeChange(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        Change
      </Button>
    </div>
  );
};

export default DestinationPanel;