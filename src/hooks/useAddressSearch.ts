import { useState, useRef } from 'react';
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
  const currentRequest = useRef<AbortController | null>(null);
  const pendingQuery = useRef<string | null>(null);

  const searchAddress = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    // Si une requête est en cours, on la stocke pour plus tard
    if (isSearching) {
      pendingQuery.current = searchQuery;
      return;
    }

    try {
      // Annuler toute requête précédente
      if (currentRequest.current) {
        currentRequest.current.abort();
      }

      // Créer un nouveau controller pour cette requête
      currentRequest.current = new AbortController();
      setIsSearching(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DriverAssistant/1.0',
          },
          signal: currentRequest.current.signal
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);

      // Vérifier s'il y a une requête en attente
      if (pendingQuery.current && pendingQuery.current !== searchQuery) {
        const nextQuery = pendingQuery.current;
        pendingQuery.current = null;
        searchAddress(nextQuery);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error('Search error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher l'adresse. Veuillez réessayer.",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setIsSearching(false);
      currentRequest.current = null;
    }
  };

  // Augmenter le délai à 1000ms (1 seconde)
  const debouncedSearch = debounce(searchAddress, 1000);

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