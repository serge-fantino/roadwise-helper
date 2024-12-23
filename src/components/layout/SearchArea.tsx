import AddressSearch from '../AddressSearch';

interface SearchAreaProps {
  onLocationSelect: (location: [number, number], address: string) => void;
}

const SearchArea = ({ onLocationSelect }: SearchAreaProps) => {
  return (
    <div className="flex-1 bg-gray-900 p-2">
      <div className="max-w-xl mx-auto">
        <AddressSearch 
          onLocationSelect={onLocationSelect}
          fullScreen
        />
      </div>
    </div>
  );
};

export default SearchArea;