interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  fullScreen?: boolean;
}

const SearchResults = ({ results, onResultClick, fullScreen = false }: SearchResultsProps) => {
  if (results.length === 0) return null;

  return (
    <div className={`${fullScreen ? 'mt-4' : 'absolute z-50 mt-1'} w-full bg-white rounded-md shadow-lg border border-gray-200`}>
      <ul className={`py-1 text-sm ${fullScreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-60'} overflow-auto`}>
        {results.map((result, index) => (
          <li
            key={index}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-left"
            onClick={() => onResultClick(result)}
          >
            {result.display_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;