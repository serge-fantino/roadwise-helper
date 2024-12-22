import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { useAddressSearch } from '../hooks/useAddressSearch';

interface AddressSearchProps {
  onLocationSelect: (location: [number, number], address: string) => void;
}

const AddressSearch = ({ onLocationSelect }: AddressSearchProps) => {
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
    <div className="relative w-full">
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
      />
    </div>
  );
};

export default AddressSearch;