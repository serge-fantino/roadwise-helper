import AddressSearch from '../AddressSearch';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface SearchAreaProps {
  onLocationSelect: (location: [number, number], address: string) => void;
}

const SearchArea = ({ onLocationSelect }: SearchAreaProps) => {
  const handleLocationSelect = (location: [number, number], address: string) => {
    console.log('[SearchArea] Location selected:', { location, address });
    routePlannerService.setDestination(location, address);
    onLocationSelect(location, address);
  };

  return (
    <div className="flex-1 bg-gray-900 p-2">
      <div className="max-w-xl mx-auto">
        <AddressSearch 
          onLocationSelect={handleLocationSelect}
          fullScreen
        />
      </div>
    </div>
  );
};

export default SearchArea;