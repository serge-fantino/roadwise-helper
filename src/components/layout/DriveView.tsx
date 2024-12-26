import { useEffect, useRef, useState } from 'react';
import { Car } from 'lucide-react';
import { calculateBearing } from '../../utils/mapUtils';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface DriveViewProps {
  position: [number, number];
}

interface Point2D {
  x: number;
  y: number;
}

const DriveView = ({ position }: DriveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentRouteSegment, setCurrentRouteSegment] = useState<[number, number][]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Conversion des coordonnées GPS en coordonnées cartésiennes locales
  const toLocalCoordinates = (point: [number, number], origin: [number, number]): [number, number] => {
    const scale = 111000; // mètres par degré
    const cosLat = Math.cos((origin[0] * Math.PI) / 180);
    
    return [
      (point[1] - origin[1]) * scale * cosLat,
      (point[0] - origin[0]) * scale]
  };

  // Mise à jour du segment de route
  useEffect(() => {
    const routeState = routePlannerService.getState();
    if (routeState.routePoints.length < 2) return;

    // Trouver le point de route le plus proche
    let minDist = Infinity;
    let closestIdx = 0;
    
    routeState.routePoints.forEach((point, idx) => {
      const localPoint = toLocalCoordinates(point, position);
      const dist = Math.sqrt(localPoint[0] * localPoint[0] + localPoint[1] * localPoint[1]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    // Extraire le segment de route à afficher (500m avant et après)
    const segment: [number, number][] = [];
    const startIdx = Math.max(0, closestIdx - 10);
    const endIdx = Math.min(routeState.routePoints.length, closestIdx + 50);
    
    let currentIndex = 0;
    for (let i = startIdx; i < endIdx; i++) {
      segment.push(toLocalCoordinates(routeState.routePoints[i], position));
      if (i<=closestIdx) {
        currentIndex++;
      }
    }

    setCurrentRouteSegment(segment);
    setCurrentIndex(currentIndex);
  }, [position]);

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

    // Calculer l'angle du segment courant pour l'orientation
    const currentPoint = currentRouteSegment[currentIndex];
    const nextPoint = currentRouteSegment[currentIndex+1];
    const bearing = calculateBearing(currentPoint, nextPoint);

    const drawRoute = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Transformer le contexte pour centrer et orienter la vue
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.7);
      const rotationAngle = (bearing-90) * Math.PI / 180;
      ctx.rotate(rotationAngle);

      // Dessiner la route
      ctx.beginPath();
      currentRouteSegment.forEach((localPoint, index) => {
        const distance = Math.sqrt(localPoint[0] * localPoint[0]+ localPoint[1] * localPoint[1]);
        const alpha = Math.max(0.1, 1 - (distance / 500)); // Fade sur 500m
        
        // Utiliser du gris pour les points passés (avant l'index actuel) et du bleu pour les points à venir
        const color = index < currentIndex ? 'rgba(128, 128, 128, ' : (index === currentIndex ? 'rgba(128, 0, 0, ' : 'rgba(59, 130, 246, ');
        ctx.strokeStyle = color + alpha + ')';
        ctx.lineWidth = Math.max(10, 50 * (1 - distance / 1000)); // Largeur qui diminue avec la distance
        
        if (index === 0) {
          ctx.moveTo(localPoint[0], -localPoint[1]);
        } else {
          ctx.lineTo(localPoint[0], -localPoint[1]);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(localPoint[0], -localPoint[1]);
        }
      });

      // Dessiner le point rouge à l'origine
      ctx.beginPath();
      ctx.fillStyle = 'red';
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Afficher le bearing en haut à gauche
      ctx.save();
      ctx.font = '16px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`Bearing: ${Math.round(bearing)}°`, 10, 30);
      ctx.restore();
    };

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
    </div>
  );
};

export default DriveView;