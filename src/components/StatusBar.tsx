import { Bug, Settings, RefreshCw } from 'lucide-react';
import { Toggle } from './ui/toggle';
import { useEffect, useState } from 'react';
import { roadPredictor } from '../services/prediction/RoadPredictor';
import { useNavigate } from 'react-router-dom';
import { roadInfoManager } from '../services/roadInfo/RoadInfoManager';
import { LocationService, GpsDebugInfo } from '../services/location/LocationService';

interface StatusBarProps {
  isOnRoad: boolean;
  speed: number;
  isDebugMode?: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
  position: [number, number];
}

const StatusBar = ({ isOnRoad, speed, isDebugMode, onDebugModeChange, position }: StatusBarProps) => {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<{
    distance: number;
    angle: number;
    position: [number, number];
    optimalSpeed?: number;
  } | null>(null);
  const [roadType, setRoadType] = useState<string>('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gpsDebug, setGpsDebug] = useState<GpsDebugInfo>(() =>
    LocationService.getInstance().getGpsDebugInfo()
  );

  useEffect(() => {
    const observer = (newPrediction: typeof prediction) => {
      setPrediction(newPrediction);
    };

    roadPredictor.addObserver(observer);
    return () => {
      roadPredictor.removeObserver(observer);
    };
  }, []);

  useEffect(() => {
    const handleRoadInfo = (info: { roadType: string }) => {
      setRoadType(info.roadType);
    };

    roadInfoManager.addObserver(handleRoadInfo);
    return () => {
      roadInfoManager.removeObserver(handleRoadInfo);
    };
  }, []);

  // GPS debug info (freshness + last fix time + quality + estimated Hz)
  useEffect(() => {
    const locationService = LocationService.getInstance();
    const tick = () => setGpsDebug(locationService.getGpsDebugInfo());
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await roadInfoManager.forceUpdate(position);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getRoadTypeColor = () => {
    switch (roadType) {
      case 'highway':
        return 'bg-blue-500/20 text-blue-500';
      case 'speed_road':
        return 'bg-blue-500/20 text-blue-500';
      case 'city':
        return 'bg-blue-500/20 text-blue-500';
      case 'road':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  const isIdle = speed === 0;

  const gpsDotColor = (() => {
    // Rouge si pas de position réelle (pas en mode gps ou pas de fix)
    if (!gpsDebug.hasRealFix) return 'bg-red-500';
    // Orange si dernier fix > 5s
    if (gpsDebug.ageMs !== null && gpsDebug.ageMs > 5000) return 'bg-orange-500';
    // Vert si < 5s
    return 'bg-green-500';
  })();

  return (
    <div className="h-12 bg-gray-900 flex items-center justify-between">
      {/* Left side - Status information */}
      <div className="text-white text-sm flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-sm font-medium ${isOnRoad ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {isOnRoad ? 'ON ROAD' : 'OFF ROAD'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${isIdle ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {isIdle ? 'IDLE' : 'MOVING'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${getRoadTypeColor()}`}>
            {roadType.replace('_', ' ').toUpperCase()}
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-gray-800 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* GPS debug */}
          <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded bg-gray-800/60 border border-white/10">
            <span className={`inline-block w-2 h-2 rounded-full ${gpsDotColor}`} />
            <span className="text-xs font-mono text-gray-200">
              GPS {gpsDebug.lastFixLocalTime ?? '—'}
              {gpsDebug.ageMs !== null ? ` (${Math.round(gpsDebug.ageMs / 1000)}s)` : ''}
              {gpsDebug.quality?.accuracyM != null ? ` acc:${Math.round(gpsDebug.quality.accuracyM)}m` : ''}
              {gpsDebug.estimatedHz != null ? ` ~${gpsDebug.estimatedHz.toFixed(1)}Hz` : ''}
              {' dop:n/a'}
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Debug toggle and Settings */}
      <div className="flex items-center gap-2">
        {onDebugModeChange && (
          <Toggle
            pressed={isDebugMode}
            onPressedChange={onDebugModeChange}
            className="bg-gray-800 hover:bg-gray-700 text-white data-[state=on]:bg-green-600 data-[state=on]:text-white h-8"
          >
            <Bug className="h-4 w-4" />
          </Toggle>
        )}
        <Toggle
          onPressedChange={() => navigate('/settings')}
          className="bg-gray-800 hover:bg-gray-700 text-white h-8"
        >
          <Settings className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};

export default StatusBar;