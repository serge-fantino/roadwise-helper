import { useMemo } from 'react';
import { CurveAnalysisResult } from '@/services/prediction/CurveAnalyzer';
import { calculateDistance, calculateBearing } from '@/utils/mapUtils';

interface TurnPathVisualizationProps {
  curveInfo: CurveAnalysisResult;
  routePoints: [number, number][];
  width?: number;
  height?: number;
}

/**
 * Transforme des coordonnées géographiques en coordonnées SVG
 * Utilise une projection simple basée sur la bounding box
 */
function projectToSVG(
  points: [number, number][],
  width: number,
  height: number,
  padding: number = 10
): [number, number][] {
  if (points.length === 0) return [];

  // Calculer la bounding box
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  points.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });

  // Ajouter un padding
  const latRange = maxLat - minLat || 0.0001;
  const lonRange = maxLon - minLon || 0.0001;
  const latPadding = latRange * 0.1;
  const lonPadding = lonRange * 0.1;

  minLat -= latPadding;
  maxLat += latPadding;
  minLon -= lonPadding;
  maxLon += lonPadding;

  const finalLatRange = maxLat - minLat;
  const finalLonRange = maxLon - minLon;

  // Transformer les points
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  return points.map(([lat, lon]) => {
    const x = padding + ((lon - minLon) / finalLonRange) * availableWidth;
    const y = padding + ((maxLat - lat) / finalLatRange) * availableHeight; // Inverser Y pour SVG
    return [x, y];
  });
}

/**
 * Extrait les points de la route 50m avant et après le virage
 */
function extractRouteSegment(
  routePoints: [number, number][],
  startIndex: number,
  endIndex: number,
  beforeDistance: number = 50,
  afterDistance: number = 50
): [number, number][] {
  if (routePoints.length === 0 || startIndex < 0 || endIndex >= routePoints.length || startIndex > endIndex) {
    return [];
  }

  // Trouver l'index de début (50m avant le startIndex)
  let beforeIndex = startIndex;
  let accumulatedDistance = 0;
  
  for (let i = startIndex - 1; i >= 0 && accumulatedDistance < beforeDistance; i--) {
    const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
    accumulatedDistance += segmentDistance;
    if (accumulatedDistance <= beforeDistance) {
      beforeIndex = i;
    } else {
      break;
    }
  }

  // Trouver l'index de fin (50m après le endIndex)
  let afterIndex = endIndex;
  accumulatedDistance = 0;
  
  for (let i = endIndex; i < routePoints.length - 1 && accumulatedDistance < afterDistance; i++) {
    const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
    accumulatedDistance += segmentDistance;
    if (accumulatedDistance <= afterDistance) {
      afterIndex = i + 1;
    } else {
      break;
    }
  }

  return routePoints.slice(beforeIndex, afterIndex + 1);
}

const TurnPathVisualization = ({ 
  curveInfo, 
  routePoints,
  width = 150, 
  height = 200 
}: TurnPathVisualizationProps) => {
  // Extraire le segment de route avec 50m avant et après
  const routeSegment = useMemo(() => {
    if (!routePoints || routePoints.length === 0 || !curveInfo) {
      return null;
    }
    return extractRouteSegment(routePoints, curveInfo.startIndex, curveInfo.endIndex, 50, 50);
  }, [routePoints, curveInfo]);

  const svgPoints = useMemo(() => {
    if (!routeSegment || routeSegment.length < 2) {
      return null;
    }
    return projectToSVG(routeSegment, width, height);
  }, [routeSegment, width, height]);

  // Trouver l'index de début du segment dans routePoints
  // On recalcule directement pour être sûr de la correspondance
  const segmentStartIndexInRoute = useMemo(() => {
    if (!routePoints || routePoints.length === 0 || !curveInfo) {
      return -1;
    }
    // Recalculer l'index de début en remontant depuis startIndex
    let beforeIndex = curveInfo.startIndex;
    let accumulatedDistance = 0;
    
    for (let i = curveInfo.startIndex - 1; i >= 0 && accumulatedDistance < 50; i--) {
      const segmentDistance = calculateDistance(routePoints[i], routePoints[i + 1]);
      accumulatedDistance += segmentDistance;
      if (accumulatedDistance <= 50) {
        beforeIndex = i;
      } else {
        break;
      }
    }
    
    return beforeIndex;
  }, [routePoints, curveInfo]);

  // Trouver les indices dans le segment de route
  const startIndexInSegment = useMemo(() => {
    if (!routeSegment || !curveInfo || segmentStartIndexInRoute < 0) return -1;
    // Le startIndex du virage dans le segment extrait
    return Math.max(0, curveInfo.startIndex - segmentStartIndexInRoute);
  }, [routeSegment, curveInfo, segmentStartIndexInRoute]);

  const apexIndexInSegment = useMemo(() => {
    if (!routeSegment || !curveInfo || startIndexInSegment < 0) return -1;
    const apexIndex = curveInfo.apexIndex - curveInfo.startIndex + startIndexInSegment;
    return apexIndex >= 0 && apexIndex < svgPoints?.length ? apexIndex : -1;
  }, [routeSegment, curveInfo, startIndexInSegment, svgPoints]);

  const endIndexInSegment = useMemo(() => {
    if (!routeSegment || !curveInfo || startIndexInSegment < 0) return -1;
    const endIndex = curveInfo.endIndex - curveInfo.startIndex + startIndexInSegment;
    return endIndex >= 0 && endIndex < svgPoints?.length ? endIndex : -1;
  }, [routeSegment, curveInfo, startIndexInSegment, svgPoints]);

  const apexPoint = useMemo(() => {
    if (!svgPoints || apexIndexInSegment < 0 || apexIndexInSegment >= svgPoints.length) {
      return null;
    }
    return svgPoints[apexIndexInSegment];
  }, [svgPoints, apexIndexInSegment]);

  const startPoint = useMemo(() => {
    if (!svgPoints || startIndexInSegment < 0 || startIndexInSegment >= svgPoints.length) {
      return null;
    }
    return svgPoints[startIndexInSegment];
  }, [svgPoints, startIndexInSegment]);

  const endPoint = useMemo(() => {
    if (!svgPoints || endIndexInSegment < 0 || endIndexInSegment >= svgPoints.length) {
      return null;
    }
    return svgPoints[endIndexInSegment];
  }, [svgPoints, endIndexInSegment]);

  // Calculer la direction de la route au début (pour la flèche)
  const routeDirection = useMemo(() => {
    if (!routeSegment || routeSegment.length < 2 || !svgPoints || svgPoints.length < 2) {
      return null;
    }
    // Utiliser les 2-3 premiers points pour calculer la direction
    const startPoint = routeSegment[0];
    const nextPoint = routeSegment[Math.min(2, routeSegment.length - 1)];
    const bearing = calculateBearing(startPoint, nextPoint);
    
    // Convertir le bearing (0-360, 0 = Nord) en angle SVG (0 = Est, sens horaire)
    // SVG: 0° = vers la droite (Est), 90° = vers le bas (Sud)
    // Bearing: 0° = Nord, 90° = Est
    const svgAngle = (bearing - 90) * (Math.PI / 180);
    
    return {
      angle: svgAngle,
      point: svgPoints[0]
    };
  }, [routeSegment, svgPoints]);

  if (!svgPoints || svgPoints.length < 2) {
    return (
      <div className="w-full h-full bg-gray-900 rounded flex items-center justify-center text-gray-500 text-xs">
        Tracé non disponible
      </div>
    );
  }

  // Créer le path string pour SVG
  const pathString = svgPoints
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');

  // Couleur selon le rayon (plus le rayon est petit, plus le virage est serré)
  const getPathColor = () => {
    if (!curveInfo.radius) return '#3B82F6'; // Bleu par défaut
    if (curveInfo.radius < 20) return '#EF4444'; // Rouge pour très serré
    if (curveInfo.radius < 50) return '#F59E0B'; // Orange pour serré
    if (curveInfo.radius < 100) return '#10B981'; // Vert pour modéré
    return '#3B82F6'; // Bleu pour large
  };

  const pathColor = getPathColor();

  return (
    <div className="h-full bg-gray-900 rounded overflow-hidden flex flex-col">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="flex-1 w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fond */}
        <rect width={width} height={height} fill="#111827" />
        
        {/* Tracé complet de la route (50m avant + virage + 50m après) */}
        <path
          d={pathString}
          fill="none"
          stroke="#4B5563"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
        
        {/* Tracé du virage (mis en évidence) */}
        {startIndexInSegment >= 0 && endIndexInSegment >= 0 && endIndexInSegment < svgPoints.length && (
          <path
            d={svgPoints
              .slice(startIndexInSegment, endIndexInSegment + 1)
              .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
              .join(' ')}
            fill="none"
            stroke={pathColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        
        {/* Flèche indiquant le sens de la route (au début du segment) */}
        {routeDirection && routeDirection.point && (
          <g transform={`translate(${routeDirection.point[0]}, ${routeDirection.point[1]}) rotate(${routeDirection.angle * 180 / Math.PI})`}>
            {/* Pointe de la flèche */}
            <path
              d="M 0 0 L -10 -4 L -10 -1.5 L -15 0 L -10 1.5 L -10 4 Z"
              fill="#60A5FA"
              stroke="#111827"
              strokeWidth="1"
              opacity="0.9"
            />
          </g>
        )}
        
        {/* Point de départ du virage (plus visible) */}
        {startPoint && (
          <>
            {/* Cercle extérieur pour meilleure visibilité */}
            <circle
              cx={startPoint[0]}
              cy={startPoint[1]}
              r="8"
              fill="#10B981"
              fillOpacity="0.2"
              stroke="#10B981"
              strokeWidth="2"
            />
            {/* Point principal */}
            <circle
              cx={startPoint[0]}
              cy={startPoint[1]}
              r="6"
              fill="#10B981"
              stroke="#111827"
              strokeWidth="2.5"
            />
            {/* Point central pour plus de visibilité */}
            <circle
              cx={startPoint[0]}
              cy={startPoint[1]}
              r="2.5"
              fill="#111827"
            />
            {/* Label "DÉBUT" */}
            <text
              x={startPoint[0]}
              y={startPoint[1] - 12}
              textAnchor="middle"
              fill="#10B981"
              fontSize="10"
              fontWeight="bold"
              stroke="#111827"
              strokeWidth="0.5"
            >
              DÉBUT
            </text>
          </>
        )}
        
        {/* Point d'apex (point le plus serré) */}
        {apexPoint && (
          <circle
            cx={apexPoint[0]}
            cy={apexPoint[1]}
            r="5"
            fill="#EF4444"
            stroke="#111827"
            strokeWidth="2"
          />
        )}
        
        {/* Point de fin du virage */}
        {endPoint && (
          <circle
            cx={endPoint[0]}
            cy={endPoint[1]}
            r="4"
            fill="#3B82F6"
            stroke="#111827"
            strokeWidth="1.5"
          />
        )}
      </svg>
      
      {/* Légende compacte */}
      <div className="px-2 py-1 flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-800">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Début</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Apex</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Fin</span>
        </div>
      </div>
    </div>
  );
};

export default TurnPathVisualization;

