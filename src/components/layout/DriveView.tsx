import { useEffect, useRef } from 'react';
import { DriveViewModel } from '../../models/DriveViewModel';
import { DriveViewRenderer } from '../../utils/DriveViewRenderer';
import { routePlannerService } from '../../services/route/RoutePlannerService';

interface DriveViewProps {
  position: [number, number];
  routePoints: [number, number][];
}

const DriveView = ({ position, routePoints }: DriveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewModel = useRef(new DriveViewModel());

  // Mise à jour du modèle
  useEffect(() => {
    const routeState = routePlannerService.getState();
    viewModel.current.updateFromPosition(position, routeState.enhancedPoints);
  }, [position]);

  // Rendu de la vue
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      DriveViewRenderer.render(ctx, viewModel.current.getState(), canvas.width, canvas.height);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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