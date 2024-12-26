import { useEffect, useRef, useState } from 'react';
import { Car } from 'lucide-react';
import { calculateBearing } from '../../utils/mapUtils';

interface DriveViewProps {
  position: [number, number];
  routePoints: [number, number][];
}

interface Point2D {
  x: number;
  y: number;
}

const DriveView = ({ position, routePoints }: DriveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentRouteSegment, setCurrentRouteSegment] = useState<[number, number][]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Conversion des coordonnées GPS en coordonnées cartésiennes locales
  const toLocalCoordinates = (point: [number, number], origin: [number, number]): Point2D => {
    // Conversion approximative (1° latitude = ~111km, 1° longitude = ~111km * cos(latitude))
    const scale = 111000; // mètres par degré
    const cosLat = Math.cos((origin[0] * Math.PI) / 180);
    
    return {
      x: (point[1] - origin[1]) * scale * cosLat,
      y: (point[0] - origin[0]) * scale
    };
  };

  // Trouver l'index le plus proche dans la route
  const findClosestPointIndex = (pos: [number, number], points: [number, number][]): number => {
    let minDist = Infinity;
    let closestIdx = 0;

    points.forEach((point, idx) => {
      const localPoint = toLocalCoordinates(point, pos);
      const dist = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    return closestIdx;
  };

  // Extraire le segment de route à afficher
  const extractRouteSegment = (startIndex: number): [number, number][] => {
    const segment: [number, number][] = [];
    let accumulatedDistance = 0;
    let currentIdx = startIndex;

    while (currentIdx < routePoints.length - 1 && accumulatedDistance < 1000) {
      const point1 = routePoints[currentIdx];
      const point2 = routePoints[currentIdx + 1];
      
      // Calculer la distance en mètres entre les points
      const p1Local = toLocalCoordinates(point1, point1);
      const p2Local = toLocalCoordinates(point2, point1);
      const distance = Math.sqrt(
        Math.pow(p2Local.x - p1Local.x, 2) + 
        Math.pow(p2Local.y - p1Local.y, 2)
      );

      segment.push(point1);
      accumulatedDistance += distance;
      currentIdx++;
    }

    if (currentIdx < routePoints.length) {
      segment.push(routePoints[currentIdx]);
    }

    return segment;
  };

  // Mise à jour du segment de route si nécessaire
  useEffect(() => {
    if (routePoints.length < 2) return;

    const newIndex = findClosestPointIndex(position, routePoints);
    if (newIndex !== currentIndex || currentRouteSegment.length === 0) {
      const newSegment = extractRouteSegment(newIndex);
      setCurrentRouteSegment(newSegment);
      setCurrentIndex(newIndex);
    }
  }, [position, routePoints, currentIndex]);

  // Rendu de la vue
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentRouteSegment.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajuster la taille du canvas
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Calculer l'angle du premier segment pour l'orientation
    const firstPoint = currentRouteSegment[0];
    const secondPoint = currentRouteSegment[1];
    const initialBearing = calculateBearing(firstPoint, secondPoint);
    const rotationAngle = (90 - initialBearing) * Math.PI / 180;

    // Fonction de dessin
    const drawRoute = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Transformer le contexte pour centrer et orienter la vue
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.7); // Position de la voiture
      ctx.rotate(rotationAngle);

      // Dessiner la route
      ctx.beginPath();
      currentRouteSegment.forEach((point, index) => {
        const localPoint = toLocalCoordinates(point, position);
        
        // Calculer l'opacité en fonction de la distance
        const distance = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);
        const alpha = Math.max(0.1, 1 - (distance / 1000));
        
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.lineWidth = 20 * (1 - distance / 2000); // Largeur qui diminue avec la distance
        
        if (index === 0) {
          ctx.moveTo(localPoint.x, -localPoint.y);
        } else {
          ctx.lineTo(localPoint.x, -localPoint.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(localPoint.x, -localPoint.y);
        }
      });

      ctx.restore();
    };

    // Animation
    const animate = () => {
      drawRoute();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [position, currentRouteSegment]);

  return (
    <div className="relative w-full h-full bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-blue-500">
        <Car size={48} />
      </div>
    </div>
  );
};

export default DriveView;