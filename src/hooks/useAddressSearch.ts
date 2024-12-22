import { useState } from 'react';
import debounce from 'lodash/debounce';
import { toast } from '../components/ui/use-toast';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const useAddressSearch = (onLocationSelect: (location: [number, number], address: string) => void) => {
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
  };

  const handleSearchClick = () => {
    if (query.length >= 3) {
      searchAddress(query);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  return {
    query,
    results,
    isSearching,
    handleInputChange,
    handleResultClick,
    handleSearchClick,
    handleKeyPress,
  };
};