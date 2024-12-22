import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  isSearching: boolean;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchClick: () => void;
}

const SearchBar = ({
  query,
  isSearching,
  onQueryChange,
  onKeyPress,
  onSearchClick
}: SearchBarProps) => {
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="Rechercher une adresse..."
        value={query}
        onChange={onQueryChange}
        onKeyPress={onKeyPress}
        className="flex-1"
      />
      <Button 
        variant="default"
        onClick={onSearchClick}
        disabled={isSearching || query.length < 3}
        className="px-4"
      >
        <Search className="h-4 w-4 mr-2" />
        Rechercher
      </Button>
    </div>
  );
};

export default SearchBar;