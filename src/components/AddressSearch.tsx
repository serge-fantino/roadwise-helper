import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { useAddressSearch } from '../hooks/useAddressSearch';

interface AddressSearchProps {
  onLocationSelect: (location: [number, number], address: string) => void;
  fullScreen?: boolean;
}

const AddressSearch = ({ onLocationSelect, fullScreen = false }: AddressSearchProps) => {
  const {
    query,
    results,
    isSearching,
    handleInputChange,
    handleResultClick,
    handleSearchClick,
    handleKeyPress,
  } = useAddressSearch(onLocationSelect);

  return (
    <div className={`relative w-full ${fullScreen ? 'h-full' : ''}`}>
      <SearchBar
        query={query}
        isSearching={isSearching}
        onQueryChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onSearchClick={handleSearchClick}
      />
      <SearchResults 
        results={results}
        onResultClick={handleResultClick}
        fullScreen={fullScreen}
      />
    </div>
  );
};

export default AddressSearch;