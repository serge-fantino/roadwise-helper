import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { Search } from 'lucide-react';
import debounce from 'lodash/debounce';

interface AddressSearchProps {
  onLocationSelect: (location: [number, number], address: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const AddressSearch = ({ onLocationSelect }: AddressSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchAddress = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher l'adresse. Veuillez réessayer.",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = debounce(searchAddress, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleResultClick = (result: SearchResult) => {
    onLocationSelect([parseFloat(result.lat), parseFloat(result.lon)], result.display_name);
    setQuery(result.display_name);
    setResults([]);
    toast({
      title: "Destination définie",
      description: "L'itinéraire a été calculé",
    });
  };

  const handleSearchClick = () => {
    if (query.length >= 3) {
      searchAddress(query);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Rechercher une adresse..."
          value={query}
          onChange={handleInputChange}
          className="flex-1"
        />
        <Button 
          variant="default"
          onClick={handleSearchClick}
          disabled={isSearching || query.length < 3}
          className="px-4"
        >
          <Search className="h-4 w-4 mr-2" />
          Rechercher
        </Button>
      </div>
      
      {results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
          <ul className="py-1 text-sm">
            {results.map((result, index) => (
              <li
                key={index}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-left"
                onClick={() => handleResultClick(result)}
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;