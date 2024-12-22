import { useState } from 'react';
import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';
import AddressSearch from './AddressSearch';

interface DestinationPanelProps {
  destination: { address: string; location: [number, number] } | null;
  onDestinationSelect: (location: [number, number], address: string) => void;
  onDestinationClick: () => void;
}

const DestinationPanel = ({ 
  destination, 
  onDestinationSelect,
  onDestinationClick 
}: DestinationPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <AddressSearch 
          onLocationSelect={(location, address) => {
            onDestinationSelect(location, address);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

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
          onClick={() => setIsEditing(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Search destination
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
        onClick={() => setIsEditing(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        Change
      </Button>
    </div>
  );
};

export default DestinationPanel;