import { useEffect, useRef } from 'react';
import { Car } from 'lucide-react';

interface DriveViewProps {
  position: [number, number];
  routePoints: [number, number][];
}

const DriveView = ({ position, routePoints }: DriveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajuster la taille du canvas à la taille de son conteneur
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Fonction pour dessiner la route en perspective
    const drawRoad = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Trouver l'index du point actuel dans la route
      const currentIndex = routePoints.findIndex(
        point => point[0] === position[0] && point[1] === position[1]
      );

      if (currentIndex === -1) return;

      // Calculer les points à afficher (1000m devant)
      const pointsAhead = routePoints.slice(currentIndex, currentIndex + 20);
      
      // Dessiner la route en perspective
      ctx.beginPath();
      pointsAhead.forEach((point, index) => {
        // Calculer la position en perspective
        const distance = index * 50; // 50m entre chaque point
        const perspectiveScale = 1 - (distance / 1000);
        const y = canvas.height * (0.4 + (0.5 * (1 - perspectiveScale)));
        const roadWidth = 100 * perspectiveScale; // Largeur de la route qui diminue avec la distance
        
        // Définir la couleur (de plus en plus pâle avec la distance)
        const alpha = Math.max(0.1, perspectiveScale);
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`; // Bleu avec transparence
        
        // Dessiner un segment de route
        ctx.fillRect(
          canvas.width / 2 - roadWidth / 2,
          y,
          roadWidth,
          10
        );
      });
    };

    // Dessiner et mettre à jour régulièrement
    const animate = () => {
      drawRoad();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [position, routePoints]);

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