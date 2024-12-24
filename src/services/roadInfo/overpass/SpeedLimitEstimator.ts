import { isInCity } from './CityDetector';

export const estimateSpeedLimit = async (tags: Record<string, string>, lat: number, lon: number): Promise<number | null> => {
  console.log('[SpeedLimitEstimator] Analyzing tags:', tags);
  
  const highway = tags.highway;
  const maxspeedTag = tags.maxspeed;
  
  // Si une limite de vitesse explicite existe
  if (maxspeedTag) {
    const speedNumber = parseInt(maxspeedTag.replace(/[^0-9]/g, ''));
    if (!isNaN(speedNumber)) {
      console.log('[SpeedLimitEstimator] Found explicit speed limit:', speedNumber);
      return speedNumber;
    }
  }

  // Sinon, on estime basé sur le type de route et la localisation
  const inCity = await isInCity(lat, lon);
  console.log('[SpeedLimitEstimator] Location check:', { inCity, highway });

  let estimatedLimit: number | null = null;
  
  switch (highway) {
    case 'motorway':
      estimatedLimit = 130;
      break;
    case 'trunk':
      estimatedLimit = 110;
      break;
    case 'primary':
    case 'secondary':
    case 'tertiary':
      if (tags.ref?.startsWith('D')) {
        estimatedLimit = inCity ? 50 : 80;
      } else {
        estimatedLimit = inCity ? 50 : 80;
      }
      break;
    case 'residential':
    case 'living_street':
      estimatedLimit = 30;
      break;
    default:
      estimatedLimit = null;
  }

  console.log('[SpeedLimitEstimator] Estimated speed limit:', {
    estimatedLimit,
    inCity,
    highway,
    ref: tags.ref
  });

  return estimatedLimit;
};