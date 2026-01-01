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

import { useEffect, useRef, useState } from 'react';
import { DriveViewModel, DriveViewState } from '../../models/DriveViewModel';
import { routePlannerService } from '../../services/route/RoutePlannerService';
import { vehicleStateManager } from '../../services/VehicleStateManager';
import { RouteFollowingTracker } from '../../utils/RouteFollowingTracker';
import * as THREE from 'three';
import { CartesianPoint } from '../../services/route/RouteProjectionService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  
  // Mini-map state and refs
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapInstanceRef = useRef<L.Map | null>(null);
  const minimapMarkerRef = useRef<L.Marker | null>(null);
  const minimapRouteRef = useRef<L.Polyline | null>(null);
  const [minimapVisible, setMinimapVisible] = useState(true);

  useEffect(() => {
    const routeState = routePlannerService.getState();
    viewModel.current.updateFromPosition(position, routeState.enhancedPoints);
  }, [position]);

  // Créer la surface de piste (mesh triangulé)
  const createTrackSurface = (leftBorder: CartesianPoint[], rightBorder: CartesianPoint[]): THREE.Mesh => {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Créer les vertices en alternant entre leftBorder et rightBorder
    for (let i = 0; i < Math.min(leftBorder.length, rightBorder.length); i++) {
      const left = leftBorder[i];
      const right = rightBorder[i];
      vertices.push(left.x, 0, -left.y);
      vertices.push(right.x, 0, -right.y);
    }
    
    // Créer les indices pour les triangles (strips)
    for (let i = 0; i < Math.min(leftBorder.length, rightBorder.length) - 1; i++) {
      const base = i * 2;
      // Premier triangle
      indices.push(base, base + 1, base + 2);
      // Deuxième triangle
      indices.push(base + 1, base + 3, base + 2);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Matériau asphalte (gris foncé avec un peu de brillance)
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, // Asphalte foncé
      roughness: 0.8,
      metalness: 0.1
    });
    
    return new THREE.Mesh(geometry, material);
  };

  // Créer les bordures de piste (rouges et blanches) avec couleur basée sur la position absolue
  const createTrackBorders = (border: CartesianPoint[], side: 'left' | 'right'): THREE.Group => {
    const group = new THREE.Group();
    const borderHeight = 0.08; // Plus bas
    const borderWidth = 0.3; // Plus large
    const segmentLength = 2.0; // Longueur de chaque segment (mètres)
    
    // Calculer la distance cumulative pour chaque point
    let cumulativeDistance = 0;
    const distances: number[] = [0];
    for (let i = 1; i < border.length; i++) {
      const p1 = border[i - 1];
      const p2 = border[i];
      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      cumulativeDistance += dist;
      distances.push(cumulativeDistance);
    }
    
    // Créer des segments de bordures avec couleur basée sur la distance absolue
    for (let i = 0; i < border.length - 1; i++) {
      const p1 = border[i];
      const p2 = border[i + 1];
      const segmentDist = distances[i + 1] - distances[i];
      
      // Diviser le segment en sous-segments si nécessaire
      const numSubSegments = Math.ceil(segmentDist / segmentLength);
      const subSegmentLength = segmentDist / numSubSegments;
      
      for (let j = 0; j < numSubSegments; j++) {
        const t1 = j / numSubSegments;
        const t2 = (j + 1) / numSubSegments;
        
        const subP1 = {
          x: p1.x + (p2.x - p1.x) * t1,
          y: p1.y + (p2.y - p1.y) * t1
        };
        const subP2 = {
          x: p1.x + (p2.x - p1.x) * t2,
          y: p1.y + (p2.y - p1.y) * t2
        };
        
        // Distance absolue au milieu du sous-segment
        const midDistance = distances[i] + segmentDist * (t1 + t2) / 2;
        
        // Alterner rouge et blanc basé sur la distance absolue (chaque 2 mètres)
        const isRed = Math.floor(midDistance / 2.0) % 2 === 0;
        
        const geometry = new THREE.BoxGeometry(borderWidth, borderHeight, subSegmentLength);
        const material = new THREE.MeshStandardMaterial({
          color: isRed ? 0xff0000 : 0xffffff,
          roughness: 0.4,
          metalness: 0.2
        });
        
        const borderSegment = new THREE.Mesh(geometry, material);
        
        // Positionner et orienter la bordure
        const midX = (subP1.x + subP2.x) / 2;
        const midY = (subP1.y + subP2.y) / 2;
        const angle = Math.atan2(subP2.x - subP1.x, subP2.y - subP1.y);
        
        borderSegment.position.set(midX, borderHeight / 2, -midY);
        borderSegment.rotation.y = -angle;
        
        // Positionner sur le bord de la piste
        const offset = side === 'left' ? -0.4 : 0.4;
        borderSegment.position.x += Math.cos(angle) * offset;
        borderSegment.position.z -= Math.sin(angle) * offset;
        
        group.add(borderSegment);
      }
    }
    
    return group;
  };

  // Créer les marquages au sol (lignes blanches pointillées)
  const createRoadMarkings = (path: CartesianPoint[]): THREE.Group => {
    const group = new THREE.Group();
    
    // Calculer la distance cumulative pour chaque point
    let cumulativeDistance = 0;
    const distances: number[] = [0];
    for (let i = 1; i < path.length; i++) {
      const p1 = path[i - 1];
      const p2 = path[i];
      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      cumulativeDistance += dist;
      distances.push(cumulativeDistance);
    }
    
    // Créer des segments de 1m espacés de 2m (donc 1m de marquage, 2m d'espace = cycle de 3m)
    const markingLength = 1.0; // 1 mètre de marquage
    const spacingLength = 2.0; // 2 mètres d'espace
    const cycleLength = markingLength + spacingLength; // 3 mètres au total
    
    let currentDistance = 0;
    const maxDistance = cumulativeDistance;
    
    while (currentDistance < maxDistance) {
      // Trouver les points correspondants à cette distance
      let segmentStart = 0;
      let segmentEnd = 0;
      let startT = 0;
      let endT = 0;
      
      // Trouver le segment de départ
      for (let i = 0; i < distances.length - 1; i++) {
        if (distances[i] <= currentDistance && distances[i + 1] >= currentDistance) {
          segmentStart = i;
          startT = (currentDistance - distances[i]) / (distances[i + 1] - distances[i]);
          break;
        }
      }
      
      // Trouver le segment de fin (currentDistance + markingLength)
      const endDistance = Math.min(currentDistance + markingLength, maxDistance);
      for (let i = 0; i < distances.length - 1; i++) {
        if (distances[i] <= endDistance && distances[i + 1] >= endDistance) {
          segmentEnd = i;
          endT = (endDistance - distances[i]) / (distances[i + 1] - distances[i]);
          break;
        }
      }
      
      // Si le marquage est dans un seul segment
      if (segmentStart === segmentEnd) {
        const p1 = path[segmentStart];
        const p2 = path[segmentStart + 1];
        const segLength = distances[segmentStart + 1] - distances[segmentStart];
        const actualLength = (endT - startT) * segLength;
        
        if (actualLength > 0.1) { // Ignorer les segments trop courts
          const geometry = new THREE.BoxGeometry(0.2, 0.01, actualLength); // Plus large (0.2m)
          const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.4
          });
          
          const marking = new THREE.Mesh(geometry, material);
          const t = (startT + endT) / 2;
          const midX = p1.x + (p2.x - p1.x) * t;
          const midY = p1.y + (p2.y - p1.y) * t;
          const angle = Math.atan2(p2.x - p1.x, p2.y - p1.y);
          
          marking.position.set(midX, 0.01, -midY);
          marking.rotation.y = -angle;
          
          group.add(marking);
        }
      }
      
      // Passer au prochain cycle (marquage + espace)
      currentDistance += cycleLength;
    }
    
    return group;
  };

  const createLine = (points: CartesianPoint[], color: number): THREE.Line => {
    const geometry = new THREE.BufferGeometry();
    const vertices = points.flatMap(p => [p.x, 0, -p.y]);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    return new THREE.Line(geometry, material);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialisation de la scène Three.js
    const scene = new THREE.Scene();
    
    // Ciel bleu (fond)
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      3000
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    // Ombres désactivées
    containerRef.current.appendChild(renderer.domElement);

    // Position initiale de la caméra
    camera.position.set(0, 1.5, 0); // Légèrement surélevée
    camera.lookAt(0, 0, -5); // Regarde vers l'avant

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    // Ombres désactivées
    scene.add(directionalLight);
    
    // Sol (herbe/terrain autour de la piste)
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5f3a, // Vert herbe
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    // Ombres désactivées
    scene.add(ground);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Garder une référence au sol
    const groundRef = ground;

    // Variables pour l'interpolation basée sur le temps et la vitesse
    let lastFrameState: DriveViewState | null = null;
    let lastFrameTime = performance.now();
    const currentInterpolatedPosition = new THREE.Vector3(0, 1.5, 0);
    const currentInterpolatedLookAt = new THREE.Vector3(0, 0, -5);
    
    // Tracker qui suit la route de manière contrainte
    let routeTracker: RouteFollowingTracker | null = null;
    let lastProcessedIndex = -1; // Pour détecter les nouvelles mesures GPS (sera réassigné)
    let trackerInitialized = false; // Pour forcer la réinitialisation au premier rendu

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const state = viewModel.current.getState();
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastFrameTime) / 1000; // en secondes
      lastFrameTime = currentTime;

      // Initialiser le tracker au premier passage
      if (!routeTracker && state.path.length > 0) {
        routeTracker = new RouteFollowingTracker(state.path, 0);
        lastProcessedIndex = 0;
        console.log('[DriveView] Route Tracker initialisé avec', state.path.length, 'points');
      }

      // Mettre à jour la route si elle a changé
      if (routeTracker && state.path.length > 0) {
        routeTracker.updateRoute(state.path);
      }

      // Détecter nouvelle mesure GPS via VehicleStateManager
      const vehicleState = vehicleStateManager.getState();
      const newGPSMeasurement = state.currentIndex !== lastProcessedIndex;

      if (newGPSMeasurement && routeTracker && trackerInitialized && state.path.length > 0 && state.currentIndex < state.path.length) {
        // Nouvelle mesure GPS reçue
        const gpsPosition = state.path[state.currentIndex];
        
        // Mettre à jour le tracker avec la position GPS projetée sur la route
        routeTracker.updateGPSMeasurement(
          [gpsPosition.x, gpsPosition.y],
          vehicleState.speed  // vitesse en m/s
        );
        
        lastProcessedIndex = state.currentIndex;
        console.log('[DriveView] GPS mis à jour:', {
          position: [gpsPosition.x, gpsPosition.y],
          speed: vehicleState.speed,
          distance: routeTracker.getCurrentDistance()
        });
      }

      // Vérifier si on doit reconstruire la géométrie de la piste
      const geometryNeedsUpdate = !lastFrameState || 
          lastFrameState.currentIndex !== state.currentIndex ||
          lastFrameState.bearing !== state.bearing;

      if (geometryNeedsUpdate) {
        lastFrameState = { ...state };

        // Nettoyer les anciens éléments de piste (garder le sol et les lumières)
        scene.children = scene.children.filter(child => 
          child instanceof THREE.AmbientLight || 
          child instanceof THREE.DirectionalLight ||
          (child instanceof THREE.Mesh && child === groundRef)
        );

        // Créer la surface de piste
        const trackSurface = createTrackSurface(state.leftBorder, state.rightBorder);
        scene.add(trackSurface);

        // Créer les bordures de piste
        const leftBorders = createTrackBorders(state.leftBorder, 'left');
        const rightBorders = createTrackBorders(state.rightBorder, 'right');
        scene.add(leftBorders);
        scene.add(rightBorders);

        // Créer les marquages au sol
        const roadMarkings = createRoadMarkings(state.path);
        scene.add(roadMarkings);
      }

      // Mettre à jour la position interpolée avec le tracker GPS
      // Mettre à jour la position interpolée avec le tracker GPS (60 FPS)
      // Mettre à jour la position interpolée avec le tracker de route (60 FPS)
      if (routeTracker) {
        // Avancer le long de la route et converger vers la position GPS
        const { point, lookAhead } = routeTracker.updateFrame(deltaTime);
        
        // Mettre à jour la position de la caméra (sur la route)
        currentInterpolatedPosition.set(
          point.x,
          1.5, // hauteur de la caméra
          -point.y // inverser Y pour coordonnées Three.js
        );
        
        // Point de visée (regarder devant sur la route)
        currentInterpolatedLookAt.set(
          lookAhead.x,
          1.2,
          -lookAhead.y
        );
      } else {
        // Fallback : utiliser position actuelle (ne devrait pas arriver)
        const currentPoint = state.path[state.currentIndex] || state.path[0];
        if (currentPoint) {
          currentInterpolatedPosition.set(currentPoint.x, 1.5, -currentPoint.y);
          
          const bearingRad = state.bearing * Math.PI / 180;
          const lookX = currentPoint.x + Math.sin(bearingRad) * 10;
          const lookY = currentPoint.y + Math.cos(bearingRad) * 10;
          currentInterpolatedLookAt.set(lookX, 1.2, -lookY);
        }
      }

      // Mettre à jour la caméra avec la position interpolée
      camera.position.copy(currentInterpolatedPosition);
      camera.lookAt(currentInterpolatedLookAt);

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
        
        {/* Mini-map overlay */}
        {minimapVisible && (
          <div className="absolute top-4 right-4 bg-black/70 rounded-lg overflow-hidden border-2 border-white/30 shadow-2xl">
            <div 
              ref={minimapRef} 
              className="w-[200px] h-[200px]"
              style={{ cursor: 'default' }}
            />
            <button
              onClick={() => setMinimapVisible(false)}
              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded px-2 py-0.5 text-xs"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Toggle button if minimap is hidden */}
        {!minimapVisible && (
          <button
            onClick={() => setMinimapVisible(true)}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-lg px-3 py-2 text-sm"
          >
            📍 Minimap
          </button>
        )}
      </div>
    </div>
  );
};

export default DriveView;