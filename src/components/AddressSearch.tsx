import { Input } from './ui/input';
import { useAddressSearch } from '../hooks/useAddressSearch';
import { Loader2 } from 'lucide-react';

interface AddressSearchProps {
  onLocationSelect: (location: [number, number], address: string) => void;
  fullScreen?: boolean;
}

const AddressSearch = ({ onLocationSelect, fullScreen }: AddressSearchProps) => {
  const {
    query,
    results,
    isSearching,
    handleInputChange,
    handleResultClick,
    handleKeyPress,
  } = useAddressSearch(onLocationSelect);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          placeholder="Rechercher une adresse..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className="w-full bg-gray-800 text-white border-gray-700 focus:border-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 bg-gray-800 rounded-md shadow-lg ${fullScreen ? 'max-h-[calc(100vh-12rem)]' : 'max-h-60'} overflow-auto`}>
          <ul className="py-1">
            {results.map((result) => (
              <li key={result.display_name}>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
                  onClick={() => handleResultClick(result)}
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;