import { DriveViewState } from "../models/DriveViewModel";

export class DriveViewRenderer {
  static render(ctx: CanvasRenderingContext2D, state: DriveViewState, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);
    
    // Transformer le contexte pour centrer et orienter la vue
    ctx.save();
    ctx.translate(width / 2, height * 0.7);
    const rotationAngle = (-state.bearing) * Math.PI / 180;
    ctx.rotate(rotationAngle);

    // Dessiner la route
    ctx.beginPath();
    state.routeSegment.forEach((localPoint, index) => {
      const distance = Math.sqrt(localPoint[0] * localPoint[0] + localPoint[1] * localPoint[1]);
      const alpha = Math.max(0.1, 1 - (distance / 500));
      
      const color = index < state.currentIndex ? 'rgba(128, 128, 128, ' : 
        (index === state.currentIndex ? 'rgba(128, 0, 0, ' : 'rgba(59, 130, 246, ');
      ctx.strokeStyle = color + alpha + ')';
      ctx.lineWidth = Math.max(10, 50 * (1 - distance / 1000));
      
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
    ctx.fillText(`Bearing: ${Math.round(state.bearing)}°`, 10, 30);
    ctx.restore();
  }
} 