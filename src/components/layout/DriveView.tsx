/**
 * DriveView Component
 * 
 * This component provides a 3D visualization of the vehicle's path and its borders using Three.js.
 * It creates a first-person view from the vehicle's perspective, showing:
 * - The central path (white line)
 * - Left border (red line)
 * - Right border (green line)
 * 
 * Key features:
 * - Real-time 3D rendering using WebGL (Three.js)
 * - Dynamic camera positioning based on vehicle's current position
 * - Automatic camera orientation following the path's bearing
 * - Responsive design that adapts to window resizing
 * 
 * Technical implementation:
 * - Uses Three.js for 3D rendering
 * - Maintains scene, camera, and renderer references
 * - Updates view based on DriveViewModel state
 * - Converts 2D cartesian coordinates to 3D space (x, 0, -y)
 * - Camera positioned slightly above ground (y=2) for better perspective
 * 
 * Props:
 * @param {[number, number]} position - Current GPS position [lat, lon]
 * @param {[number, number][]} routePoints - Array of GPS coordinates defining the route
 * 
 * Dependencies:
 * - Three.js for 3D rendering
 * - DriveViewModel for state management
 * - RoutePlannerService for route data
 */

import { useEffect, useRef } from 'react';
import { DriveViewModel, DriveViewState } from '../../models/DriveViewModel';
import { routePlannerService } from '../../services/route/RoutePlannerService';
import * as THREE from 'three';
import { CartesianPoint } from '../../services/route/RouteProjectionService';

interface DriveViewProps {
  position: [number, number];
  positionHistory: [number, number][];
}

const DriveView = ({ position, positionHistory }: DriveViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewModel = useRef(new DriveViewModel());
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const lastStateRef = useRef<DriveViewState | null>(null);

  useEffect(() => {
    const routeState = routePlannerService.getState();
    viewModel.current.updateFromPosition(position, routeState.enhancedPoints);
  }, [position]);

  const createLine = (points: CartesianPoint[], color: number): THREE.Line => {
    const geometry = new THREE.BufferGeometry();
    const vertices = points.flatMap(p => [p.x, 0, -p.y]); // Notez le -p.y pour la profondeur
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.LineBasicMaterial({ color, linewidth: 5 });
    return new THREE.Line(geometry, material);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialisation de la scène Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      3000
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Position initiale de la caméra
    camera.position.set(0, 2, 0); // Légèrement surélevée
    camera.lookAt(0, 0, -10); // Regarde vers l'avant
    //lastPosition = position;

    // Ajout d'une grille de référence
    const grid = new THREE.GridHelper(300, 300);
    //scene.add(grid);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const state = viewModel.current.getState();
      
      // Vérifier si l'état a changé avant de redessiner
      if (lastStateRef.current && 
          lastStateRef.current.currentIndex === state.currentIndex &&
          lastStateRef.current.bearing === state.bearing) {
        // Si rien n'a changé, juste re-render la scène
        renderer.render(scene, camera);
        return;
      }

      // Mettre à jour lastState
      lastStateRef.current = { ...state };

      // Nettoyer les anciennes lignes
      scene.children = scene.children.filter(child => child instanceof THREE.GridHelper);

      // Créer les nouvelles lignes
      const pathLine = createLine(state.path, 0xFFFF00);
      const leftBorder = createLine(state.leftBorder, 0xFFFFFF);
      const rightBorder = createLine(state.rightBorder, 0xFFFFFF);

      scene.add(pathLine);
      scene.add(leftBorder);
      scene.add(rightBorder);

      // Mettre à jour la position de la caméra
      if (state.currentIndex + 1 < state.path.length) {
          const nextPosition = state.path[state.currentIndex + 1];
          camera.lookAt(nextPosition.x, 2, -nextPosition.y);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Gestion du redimensionnement
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Container WebGL */}
      <div ref={containerRef} className="absolute inset-0 bg-black" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Info en haut à gauche */}
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-lg">
          <div className="space-y-1">
            {/* Tu peux ajouter d'autres infos ici */}
            <div className="text-sm font-mono">
              Position: {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          </div>
        </div>
        
        {/* Tu peux ajouter d'autres éléments UI ici */}
      </div>
    </div>
  );
};

export default DriveView;