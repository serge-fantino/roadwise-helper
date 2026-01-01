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
import { routePlannerService } from '../../services/route/RoutePlannerService';
import { VehicleTelemetry } from '../../types/VehicleTelemetry';
import { SceneCoordinateSystem } from '../../utils/SceneCoordinateSystem';
import * as THREE from 'three';
import { CartesianPoint, generateBorders } from '../../services/route/RouteProjectionService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriveViewProps {
  vehicle: VehicleTelemetry;
  positionHistory: [number, number][];
}

const DriveView = ({ vehicle, positionHistory }: DriveViewProps) => {
  const position = vehicle.position;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const vehicleMeshRef = useRef<THREE.Mesh | null>(null); // Cube représentant le véhicule
  const coordinateSystemRef = useRef<SceneCoordinateSystem | null>(null); // Système de coordonnées de la scène 3D
  const fixedOriginRef = useRef<[number, number] | null>(null); // Origine FIXE de la vue 3D (ne change pas pendant le mouvement)
  const vehicleRef = useRef<VehicleTelemetry>(vehicle); // IMPORTANT: éviter stale closure dans animate()
  
  // Mini-map state and refs
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapInstanceRef = useRef<L.Map | null>(null);
  const minimapMarkerRef = useRef<L.Marker | null>(null);
  const minimapRouteRef = useRef<L.Polyline | null>(null);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'subjective' | 'drone'>('drone'); // Mode drone par défaut
  const viewModeRef = useRef<'subjective' | 'drone'>('drone'); // Ref pour accès dans animate

  // Sync viewMode state with ref
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Sync latest vehicle snapshot to ref so the animation loop always uses current values
  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  // Créer des panneaux de distance tous les 500m et poteaux tous les 30m
  const createDistanceSigns = (path: CartesianPoint[]): THREE.Group => {
    const signsGroup = new THREE.Group();
    const signInterval = 500; // Panneaux tous les 500m
    const poleInterval = 30; // Poteaux tous les 30m
    
    const distanceBetween = (p1: CartesianPoint, p2: CartesianPoint): number => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    let accumulatedDistance = 0;
    let nextSignDistance = signInterval;
    let nextPoleDistance = poleInterval;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segmentLength = distanceBetween(p1, p2);

      while (accumulatedDistance + segmentLength >= nextSignDistance) {
        const distanceInSegment = nextSignDistance - accumulatedDistance;
        const t = distanceInSegment / segmentLength;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;

        // Créer le poteau (bleu, plus gros)
        const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x0066ff,
          emissive: 0x003399,
          emissiveIntensity: 0.3
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x - 8, 1.5, -y); // 8m sur le côté GAUCHE (plus visible)
        signsGroup.add(pole);

        // Créer le panneau (blanc avec texte, plus gros)
        const signGeometry = new THREE.BoxGeometry(4, 2, 0.2);
        const signMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.2
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(x - 8, 3.5, -y);
        signsGroup.add(sign);

        // Ajouter le texte de distance (en noir sur fond blanc, plus gros)
        const distanceKm = nextSignDistance / 1000;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 512, 256);
        context.fillStyle = '#000000';
        context.font = 'bold 96px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`${distanceKm.toFixed(1)} km`, 256, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
          map: texture,
          side: THREE.DoubleSide // Visible des deux côtés
        });
        const textMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 1.8),
          textMaterial
        );
        textMesh.position.set(x - 8, 3.5, -y + 0.15);
        signsGroup.add(textMesh);
        
        console.log(`[DriveView] Panneau créé à ${distanceKm.toFixed(1)} km, position:`, x, y);

        nextSignDistance += signInterval;
      }
      
      // Ajouter des petits poteaux tous les 30m (repères visuels)
      while (accumulatedDistance + segmentLength >= nextPoleDistance) {
        // Skip si c'est un panneau de distance (on ne veut pas de doublon)
        if (Math.abs(nextPoleDistance - (nextSignDistance - signInterval)) > 10) {
          const distanceInSegment = nextPoleDistance - accumulatedDistance;
          const t = distanceInSegment / segmentLength;
          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;

          // Créer un petit poteau blanc (plus discret)
          const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 6);
          const poleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xaaaaaa,
            emissiveIntensity: 0.2
          });
          const pole = new THREE.Mesh(poleGeometry, poleMaterial);
          pole.position.set(x - 5, 1, -y); // 5m sur le côté GAUCHE
          signsGroup.add(pole);
        }
        
        nextPoleDistance += poleInterval;
      }

      accumulatedDistance += segmentLength;
    }

    return signsGroup;
  };

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
    const mountEl = containerRef.current;

    // Initialisation de la scène Three.js
    const scene = new THREE.Scene();
    
    // Ciel bleu (fond)
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      3000
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    // Ombres désactivées
    // En dev (React StrictMode) l'effet peut monter/démonter 2x: on nettoie avant d'ajouter
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

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

    // Créer le cube représentant le véhicule (rouge vif pour être visible)
    const vehicleGeometry = new THREE.BoxGeometry(2, 1.5, 4); // 2m large, 1.5m haut, 4m long
    const vehicleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Rouge vif
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.3
    });
    const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
    vehicleMesh.position.set(0, 0.75, 0); // 0.75m au-dessus du sol (moitié de sa hauteur)
    scene.add(vehicleMesh);
    vehicleMeshRef.current = vehicleMesh;
    sceneRef.current = scene;
    cameraRef.current = camera;
    
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

    // VERSION SIMPLIFIÉE: pas d'interpolation, pas de Kalman
    // Garder les références aux objets de la piste pour pouvoir les supprimer proprement
    let trackObjects: THREE.Object3D[] = [];
    let lastRouteKey = ''; // Pour détecter si la ROUTE a changé (pas la position)

    // Fonction pour nettoyer la piste
    const clearTrack = () => {
      trackObjects.forEach(obj => {
        scene.remove(obj);
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      trackObjects = [];
    };

    // Animation loop - VERSION OPTIMISÉE
    let frameCount = 0;
    let rafId = 0;
    let stopped = false;
    const animate = () => {
      if (stopped) return;
      rafId = requestAnimationFrame(animate);

      const currentVehicle = vehicleRef.current;
      const currentGpsPosition = currentVehicle.position;
      const currentHeading = currentVehicle.heading;

      // Construire la piste UNE SEULE FOIS (ou quand la route change)
      // IMPORTANT: on ne reconstruit PAS la scène pendant le mouvement du véhicule.
      const routeState = routePlannerService.getState();
      const enhanced = routeState.enhancedPoints ?? [];
      if (enhanced.length > 1) {
        const first = enhanced[0].position;
        const last = enhanced[enhanced.length - 1].position;
        const routeKey = `${enhanced.length}-${first[0].toFixed(6)}-${first[1].toFixed(6)}-${last[0].toFixed(6)}-${last[1].toFixed(6)}`;

        if (routeKey !== lastRouteKey) {
          lastRouteKey = routeKey;

          // Origine FIXE: on la définit une seule fois (ou si on change complètement de route)
          fixedOriginRef.current = currentGpsPosition;
          coordinateSystemRef.current = new SceneCoordinateSystem(fixedOriginRef.current);

          // Nettoyer l'ancienne piste proprement
          clearTrack();

          // Convertir toute la route en cartésien dans le repère FIXE
          const path: CartesianPoint[] = enhanced.map(p => coordinateSystemRef.current!.gpsToCartesian(p.position));
          const { leftBorder, rightBorder } = generateBorders(path);

          // Créer la géométrie de la piste COMPLETE
          const trackSurface = createTrackSurface(leftBorder, rightBorder);
          scene.add(trackSurface);
          trackObjects.push(trackSurface);

          const leftBorders = createTrackBorders(leftBorder, 'left');
          const rightBorders = createTrackBorders(rightBorder, 'right');
          scene.add(leftBorders);
          scene.add(rightBorders);
          trackObjects.push(leftBorders, rightBorders);

          const roadMarkings = createRoadMarkings(path);
          scene.add(roadMarkings);
          trackObjects.push(roadMarkings);

          const distanceSigns = createDistanceSigns(path);
          scene.add(distanceSigns);
          trackObjects.push(distanceSigns);
        }
      }

      // Position caméra et véhicule
      if (coordinateSystemRef.current) {
        // Convertir la position GPS ACTUELLE du véhicule en Three.js en utilisant le système de coordonnées
        const vehiclePos3D = coordinateSystemRef.current.gpsToThreeJS(currentGpsPosition, 0.75);
        
        // Mettre à jour la position du cube véhicule
        if (vehicleMeshRef.current) {
          vehicleMeshRef.current.position.set(vehiclePos3D.x, vehiclePos3D.y, vehiclePos3D.z);
          
          // Orienter le véhicule selon le heading
          const geoHeading = 90 - currentHeading;
          const headingRad = geoHeading * Math.PI / 180;
          vehicleMeshRef.current.rotation.y = -headingRad;
        }

        // Orientation = heading du véhicule (tangente à la route)
        // NavigationCalculator: 0°=Est, 90°=Nord → conversion nécessaire
        const geoHeading = 90 - currentHeading; // Convention géographique
        const headingRad = geoHeading * Math.PI / 180;
        const directionX = Math.sin(headingRad);
        const directionZ = -Math.cos(headingRad); // y cartésien inversé en z Three.js
        
        if (viewModeRef.current === 'subjective') {
          // Vue subjective (première personne) - caméra à la position du véhicule
          const cameraPos = coordinateSystemRef.current.gpsToThreeJS(currentGpsPosition, 1.5);
          camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);

          // Regarder devant
          const lookAheadDistance = 10; // Regarder 10m devant
          const lookAtX = cameraPos.x + directionX * lookAheadDistance;
          const lookAtZ = cameraPos.z + directionZ * lookAheadDistance;

          camera.lookAt(lookAtX, 1.2, lookAtZ);
        } else {
          // Vue drone (exactement au-dessus du véhicule)
          const droneHeight = 80; // 80m de hauteur pour bien voir
          const cameraPos = coordinateSystemRef.current.gpsToThreeJS(currentGpsPosition, droneHeight);
          camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);

          // Calculer le point devant le véhicule pour orienter la vue
          const lookAheadDistance = 50;
          const lookAtX = cameraPos.x + directionX * lookAheadDistance;
          const lookAtZ = cameraPos.z + directionZ * lookAheadDistance;
          
          // Regarder devant le véhicule (map orientée avec véhicule vers le haut)
          camera.lookAt(lookAtX, 0, lookAtZ);
        }
      }

      renderer.render(scene, camera);
      frameCount++;
    };

    animate();

    // Gestion du redimensionnement
    const handleResize = () => {
      const width = mountEl.clientWidth;
      const height = mountEl.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (renderer.domElement.parentElement === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Initialize mini-map
  useEffect(() => {
    if (!minimapRef.current || minimapInstanceRef.current) return;

    // Create mini-map
    const minimap = L.map(minimapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false,
    }).setView([position[0], position[1]], 16);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(minimap);

    // Create marker for vehicle position
    const marker = L.circleMarker([position[0], position[1]], {
      radius: 6,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(minimap);

    minimapInstanceRef.current = minimap;
    minimapMarkerRef.current = marker;

    return () => {
      if (minimapInstanceRef.current) {
        minimapInstanceRef.current.remove();
        minimapInstanceRef.current = null;
      }
    };
  }, []);

  // Mini-map: direction line ref
  const minimapDirectionRef = useRef<L.Polyline | null>(null);

  // Update mini-map position and route
  useEffect(() => {
    if (!minimapInstanceRef.current || !minimapMarkerRef.current) return;

    // Update marker position
    minimapMarkerRef.current.setLatLng([position[0], position[1]]);
    
    // Center map on position
    minimapInstanceRef.current.setView([position[0], position[1]], 16, { animate: false });

    // Update route
    const routeState = routePlannerService.getState();
    if (routeState.routePoints.length > 0) {
      // Remove old route if exists
      if (minimapRouteRef.current) {
        minimapRouteRef.current.remove();
      }

      // Add new route
      const route = L.polyline(routeState.routePoints, {
        color: '#ef4444',
        weight: 3,
        opacity: 0.7,
      }).addTo(minimapInstanceRef.current);

      minimapRouteRef.current = route;
    }

    // Ajouter une ligne pour visualiser la direction de regard (DEBUG)
    // NavigationCalculator utilise la convention : 0°=Est, 90°=Nord
    // Donc on doit convertir en convention géographique : 0°=Nord, 90°=Est
    const geoHeading = 90 - vehicle.heading; // Conversion mathématique → géographique
    const headingRad = geoHeading * Math.PI / 180;
    const lookDistance = 50; // 50m pour la visualisation
    
    // Calculer le point de regard en coordonnées géographiques
    const METERS_PER_DEGREE_LAT = 111111;
    const deltaLat = Math.cos(headingRad) * lookDistance / METERS_PER_DEGREE_LAT;
    const deltaLon = Math.sin(headingRad) * lookDistance / (METERS_PER_DEGREE_LAT * Math.cos(position[0] * Math.PI / 180));
    
    const lookAtPoint: [number, number] = [
      position[0] + deltaLat,
      position[1] + deltaLon
    ];

    // Remove old direction line
    if (minimapDirectionRef.current) {
      minimapDirectionRef.current.remove();
    }

    // Add direction line (yellow for visibility)
    const directionLine = L.polyline([position, lookAtPoint], {
      color: '#ffff00',
      weight: 4,
      opacity: 0.9,
    }).addTo(minimapInstanceRef.current);

    minimapDirectionRef.current = directionLine;

    console.log('[DriveView] Minimap direction:', {
      headingNav: vehicle.heading.toFixed(1) + '° (0°=Est)',
      headingGeo: geoHeading.toFixed(1) + '° (0°=Nord)',
      from: position,
      to: lookAtPoint,
      deltaLat: deltaLat.toFixed(6),
      deltaLon: deltaLon.toFixed(6)
    });
  }, [position]);

  return (
    <div className="relative w-full h-full">
      {/* Container WebGL */}
      <div ref={containerRef} className="absolute inset-0 bg-black" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Info en haut à gauche */}
        <div className="absolute top-4 left-4 bg-black/50 text-white p-3 rounded-lg space-y-3 pointer-events-auto">
          {/* Position */}
          <div className="text-sm font-mono">
            Position: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </div>
          
          {/* Toggle vue subjective/drone */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/20">
            <span className="text-xs font-semibold">🚗 FPS</span>
            <button
              onClick={() => setViewMode(prev => prev === 'subjective' ? 'drone' : 'subjective')}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                viewMode === 'drone' ? 'bg-blue-500' : 'bg-gray-600'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  viewMode === 'drone' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-semibold">🚁 Drone</span>
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