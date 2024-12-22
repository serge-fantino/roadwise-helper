const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Initializing Driver Assistant</h2>
        <p>Please enable location services...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;