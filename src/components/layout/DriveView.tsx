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
import { roadPredictor } from '../../services/prediction/RoadPredictor';
import { TurnPrediction } from '../../services/prediction/PredictionTypes';
import { VehicleTelemetry } from '../../types/VehicleTelemetry';
import { SceneCoordinateSystem } from '../../utils/SceneCoordinateSystem';
import * as THREE from 'three';
import { CartesianPoint, generateBorders } from '../../services/route/RouteProjectionService';
import { calculateDistance } from '../../utils/mapUtils';
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
  const turnsRef = useRef<TurnPrediction[]>([]);
  const turnsDirtyRef = useRef(false);
  const renderSamplesRef = useRef<Array<{ t: number; position: [number, number]; heading: number }>>([]);
  const RENDER_LAG_MS = 100; // ~1/10s de retard pour interpoler proprement
  const SAMPLE_WINDOW_MS = 3000; // garder 3s d'échantillons max
  
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
    // Buffer de rendu pour interpolation
    const now = Date.now();
    renderSamplesRef.current.push({ t: now, position: vehicle.position, heading: vehicle.heading });
    // trim
    const cutoff = now - SAMPLE_WINDOW_MS;
    renderSamplesRef.current = renderSamplesRef.current.filter(s => s.t >= cutoff);
  }, [vehicle]);

  // Subscribe to turn predictions (used for 3D turn markers)
  useEffect(() => {
    const observer = (_prediction: TurnPrediction | null, turns: TurnPrediction[]) => {
      turnsRef.current = turns ?? [];
      turnsDirtyRef.current = true;
    };
    roadPredictor.addObserver(observer);
    return () => roadPredictor.removeObserver(observer);
  }, []);

  // Créer des panneaux de distance tous les 500m
  // distanceOffsetM: distance cumulée (m) au début du segment (pour afficher des km absolus)
  const createDistanceSigns = (path: CartesianPoint[], distanceOffsetM: number): THREE.Group => {
    const signsGroup = new THREE.Group();
    const signInterval = 500; // Panneaux tous les 500m
    
    const distanceBetween = (p1: CartesianPoint, p2: CartesianPoint): number => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    let accumulatedDistance = 0;
    // Aligner le premier panneau sur le prochain multiple de 500m en distance absolue
    const offsetMod = ((distanceOffsetM % signInterval) + signInterval) % signInterval;
    let nextSignDistance = offsetMod === 0 ? signInterval : (signInterval - offsetMod);

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
        const distanceKm = (distanceOffsetM + nextSignDistance) / 1000;
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
          side: THREE.FrontSide
        });
        const textMeshFront = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 1.8),
          textMaterial
        );
        textMeshFront.position.set(x - 8, 3.5, -y + 0.15);
        signsGroup.add(textMeshFront);

        // Texte sur l'autre face (évite l'effet miroir en backface)
        const textMeshBack = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 1.8),
          textMaterial.clone()
        );
        textMeshBack.position.set(x - 8, 3.5, -y - 0.15);
        textMeshBack.rotation.y = Math.PI;
        signsGroup.add(textMeshBack);

        nextSignDistance += signInterval;
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
    // On utilise une géométrie 1x1 qu'on scale dynamiquement selon la taille du segment affiché,
    // sinon on finit par voir la piste "dans le ciel" quand elle dépasse le plan.
    const groundGeometry = new THREE.PlaneGeometry(1, 1);
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

    // Helper: adapter taille/position du sol au segment courant (marges incluses)
    const updateGroundForPath = (path: CartesianPoint[]) => {
      if (path.length === 0) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of path) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      // Marges pour être confortable visuellement
      const margin = 300; // mètres
      const sizeX = Math.max(2000, (maxX - minX) + margin * 2);
      const sizeZ = Math.max(2000, (maxY - minY) + margin * 2);

      // Centrage (rappel: Three.js z = -cartesianY)
      const centerX = (minX + maxX) / 2;
      const centerZ = -((minY + maxY) / 2);

      ground.position.set(centerX, -0.01, centerZ);
      // PlaneGeometry est dans (x,y). Après rotation X=-90°, l'axe Y devient Z en monde.
      ground.scale.set(sizeX, sizeZ, 1);
    };

    // Garder les références aux objets de la piste pour pouvoir les supprimer proprement
    let trackObjects: THREE.Object3D[] = [];
    let turnSignsObj: THREE.Object3D | null = null;
    let lastRouteKey = ''; // Pour détecter si la ROUTE a changé (pas la position)
    let routeGps: [number, number][] = [];
    let routeCumDist: number[] = []; // mètres, longueur = routeGps.length
    let segmentStartIdx = 0;
    let segmentEndIdx = 0;
    let lastClosestIdx = 0;
    let lastRebuildAtMs = 0;
    const WINDOW_AHEAD_M = 5000;
    const WINDOW_BEHIND_M = 1000;
    const REBUILD_TRIGGER_M = 2000; // rebuild si <2km du bord avant
    const REBUILD_COOLDOWN_MS = 1500;

    const computeCumDist = (gpsPoints: [number, number][]) => {
      const cum: number[] = new Array(gpsPoints.length).fill(0);
      for (let i = 1; i < gpsPoints.length; i++) {
        cum[i] = cum[i - 1] + calculateDistance(gpsPoints[i - 1], gpsPoints[i]);
      }
      return cum;
    };

    const lowerBoundCum = (cum: number[], target: number) => {
      // first index with cum[i] >= target
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (cum[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const findClosestIdx = (gpsPoints: [number, number][], current: [number, number], hintIdx: number) => {
      if (gpsPoints.length === 0) return 0;
      // Recherche locale autour du dernier index (plus rapide), sinon fallback global
      const span = 200;
      const start = Math.max(0, hintIdx - span);
      const end = Math.min(gpsPoints.length - 1, hintIdx + span);

      let bestIdx = hintIdx;
      let bestDist = Infinity;
      for (let i = start; i <= end; i++) {
        const d = calculateDistance(current, gpsPoints[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      // Si on est très loin du meilleur local, faire une passe globale (rare)
      if (bestDist > 200) {
        for (let i = 0; i < gpsPoints.length; i++) {
          const d = calculateDistance(current, gpsPoints[i]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
      }

      return bestIdx;
    };

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

    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh && (mesh as any).geometry) {
          (mesh as any).geometry.dispose?.();
        }
        const mat = (mesh as any).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else mat.dispose?.();
        }
      });
    };

    const getTurnColor = (radius: number): number => {
      if (!Number.isFinite(radius)) return 0xF2FCE2;
      if (radius > 100) return 0xF2FCE2;
      if (radius > 50) return 0xFEF7CD;
      if (radius > 25) return 0xFEC6A1;
      if (radius > 10) return 0xF97316;
      return 0xEA384C;
    };

    const buildTurnSignMesh = (colorHex: number): THREE.Object3D => {
      const group = new THREE.Group();

      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xE5E7EB, roughness: 0.8, metalness: 0.2 })
      );
      pole.position.set(0, 0.9, 0);
      group.add(pole);

      // Triangle sign (flat)
      const shape = new THREE.Shape();
      shape.moveTo(-0.6, 0);
      shape.lineTo(0.6, 0);
      shape.lineTo(0, 0.9);
      shape.lineTo(-0.6, 0);
      const sign = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.25,
          roughness: 0.6,
          metalness: 0.0,
          side: THREE.DoubleSide,
        })
      );
      sign.position.set(0, 1.55, 0);
      group.add(sign);

      return group;
    };

    const rebuildTurnSigns = () => {
      if (!coordinateSystemRef.current) return;
      if (!routeGps || routeGps.length < 3) return;

      // Remove previous
      if (turnSignsObj) {
        scene.remove(turnSignsObj);
        disposeObject(turnSignsObj);
        turnSignsObj = null;
      }

      const turns = turnsRef.current ?? [];
      if (turns.length === 0) return;

      const group = new THREE.Group();
      const cs = coordinateSystemRef.current;

      const clampIdx = (i: number) => Math.max(0, Math.min(routeGps.length - 1, i));

      const placeOffsetM = 4.0; // road half-width(3m) + margin
      const eligible = turns
        .filter(t => t?.curveInfo && typeof t.curveInfo.startIndex === 'number')
        .filter(t => t.curveInfo.startIndex >= segmentStartIdx && t.curveInfo.startIndex <= segmentEndIdx)
        .slice(0, 6);

      for (const t of eligible) {
        const idx = clampIdx(t.curveInfo.startIndex);
        const aGps = routeGps[clampIdx(idx - 1)];
        const bGps = routeGps[clampIdx(idx + 1)];

        const a = cs.gpsToCartesian(aGps);
        const b = cs.gpsToCartesian(bGps);
        const p = cs.gpsToCartesian(t.curveInfo.startPoint ?? routeGps[idx]);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        // Right normal in cartesian
        const rx = uy;
        const ry = -ux;

        const px = p.x + rx * placeOffsetM;
        const py = p.y + ry * placeOffsetM;

        const worldX = px;
        const worldZ = -py;

        const signObj = buildTurnSignMesh(getTurnColor(t.curveInfo.radius));
        signObj.position.set(worldX, 0, worldZ);

        // Face incoming traffic: align normal with -tangent
        const angle = Math.atan2(ux, uy); // same convention as other track elements
        signObj.rotation.y = -angle;

        group.add(signObj);
      }

      turnSignsObj = group;
      scene.add(group);
    };

    const rebuildSegment = (originGps: [number, number], startIdx: number, endIdx: number) => {
      // Réinitialiser le repère (origine) UNIQUEMENT au moment du rebuild
      fixedOriginRef.current = originGps;
      coordinateSystemRef.current = new SceneCoordinateSystem(originGps);

      segmentStartIdx = startIdx;
      segmentEndIdx = endIdx;

      clearTrack();

      const segmentGps = routeGps.slice(startIdx, endIdx + 1);
      const path: CartesianPoint[] = segmentGps.map(p => coordinateSystemRef.current!.gpsToCartesian(p));
      const { leftBorder, rightBorder } = generateBorders(path);

      // Adapter le sol à la taille du segment affiché
      updateGroundForPath(path);

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

      const distanceOffsetM = routeCumDist[startIdx] ?? 0;
      const distanceSigns = createDistanceSigns(path, distanceOffsetM);
      scene.add(distanceSigns);
      trackObjects.push(distanceSigns);

      // Add turn signs for this window
      rebuildTurnSigns();
    };

    // Animation loop - VERSION OPTIMISÉE
    let frameCount = 0;
    let rafId = 0;
    let stopped = false;
    const getInterpolatedSample = (targetMs: number) => {
      const samples = renderSamplesRef.current;
      if (samples.length === 0) return null;
      if (samples.length === 1) return samples[0];

      // Assurer ordre chronologique
      // (normalement c'est déjà le cas, mais on ne prend pas de risque)
      const s0 = samples[0];
      const sN = samples[samples.length - 1];
      if (targetMs <= s0.t) return s0;
      if (targetMs >= sN.t) return sN;

      // trouver l'intervalle [a,b]
      let a = s0;
      let b = sN;
      for (let i = samples.length - 1; i >= 1; i--) {
        const prev = samples[i - 1];
        const cur = samples[i];
        if (prev.t <= targetMs && targetMs <= cur.t) {
          a = prev;
          b = cur;
          break;
        }
      }

      const span = Math.max(1, b.t - a.t);
      const alpha = Math.min(1, Math.max(0, (targetMs - a.t) / span));

      // Interpolation angle (wrap 0/360)
      let d = b.heading - a.heading;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      const heading = (a.heading + d * alpha + 360) % 360;

      const position: [number, number] = [
        a.position[0] + (b.position[0] - a.position[0]) * alpha,
        a.position[1] + (b.position[1] - a.position[1]) * alpha,
      ];

      return { t: targetMs, position, heading };
    };

    const animate = () => {
      if (stopped) return;
      rafId = requestAnimationFrame(animate);

      const currentVehicle = vehicleRef.current;
      // Render smoothing: on rend avec un léger retard, et on interpole entre 2 keypoints
      const now = Date.now();
      const renderTarget = now - RENDER_LAG_MS;
      const smoothed = getInterpolatedSample(renderTarget);
      const currentGpsPosition = smoothed?.position ?? currentVehicle.position;
      const currentHeading = smoothed?.heading ?? currentVehicle.heading;

      // Construire la piste UNE SEULE FOIS (ou quand la route change)
      const routeState = routePlannerService.getState();
      const enhanced = routeState.enhancedPoints ?? [];
      if (enhanced.length > 1) {
        const first = enhanced[0].position;
        const last = enhanced[enhanced.length - 1].position;
        const routeKey = `${enhanced.length}-${first[0].toFixed(6)}-${first[1].toFixed(6)}-${last[0].toFixed(6)}-${last[1].toFixed(6)}`;

        if (routeKey !== lastRouteKey) {
          lastRouteKey = routeKey;

          // (Re)charger la route complète en GPS + distances cumulées
          routeGps = enhanced.map(p => p.position);
          routeCumDist = computeCumDist(routeGps);
          lastClosestIdx = 0;

          // Construire un premier segment autour de la position actuelle
          const closestIdx = findClosestIdx(routeGps, currentGpsPosition, lastClosestIdx);
          lastClosestIdx = closestIdx;

          const curS = routeCumDist[closestIdx] ?? 0;
          const startS = Math.max(0, curS - WINDOW_BEHIND_M);
          const endS = Math.min(routeCumDist[routeCumDist.length - 1] ?? 0, curS + WINDOW_AHEAD_M);

          const startIdx = lowerBoundCum(routeCumDist, startS);
          const endIdx = lowerBoundCum(routeCumDist, endS);

          lastRebuildAtMs = Date.now();
          rebuildSegment(currentGpsPosition, startIdx, Math.max(startIdx + 1, endIdx));
        }
        // If turn list changed, refresh signs without rebuilding whole track
        if (turnsDirtyRef.current && frameCount % 10 === 0) {
          turnsDirtyRef.current = false;
          rebuildTurnSigns();
        }
        // Rebuild trigger: quand on approche du bord avant du segment (<2km)
        // On throttle pour éviter les rebuilds trop fréquents.
        if (routeGps.length > 1 && routeCumDist.length === routeGps.length && frameCount % 20 === 0) {
          const now = Date.now();
          if (now - lastRebuildAtMs > REBUILD_COOLDOWN_MS) {
            const closestIdx = findClosestIdx(routeGps, currentGpsPosition, lastClosestIdx);
            lastClosestIdx = closestIdx;

            const curS = routeCumDist[closestIdx] ?? 0;
            const endS = routeCumDist[segmentEndIdx] ?? curS;
            const remainingAhead = endS - curS;

            const routeEndS = routeCumDist[routeCumDist.length - 1] ?? 0;
            const canExtend = curS + WINDOW_AHEAD_M < routeEndS;

            if (canExtend && remainingAhead < REBUILD_TRIGGER_M) {
              const startS = Math.max(0, curS - WINDOW_BEHIND_M);
              const newEndS = Math.min(routeEndS, curS + WINDOW_AHEAD_M);
              const startIdx = lowerBoundCum(routeCumDist, startS);
              const endIdx = lowerBoundCum(routeCumDist, newEndS);

              lastRebuildAtMs = now;
              rebuildSegment(currentGpsPosition, startIdx, Math.max(startIdx + 1, endIdx));
            }
          }
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
          const headingRad = (currentHeading * Math.PI) / 180;
          vehicleMeshRef.current.rotation.y = -headingRad;
        }

        // Orientation = heading du véhicule (tangente à la route)
        // Convention géographique: 0°=Nord, 90°=Est
        const headingRad = (currentHeading * Math.PI) / 180;
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
    // Convention géographique : 0°=Nord, 90°=Est
    const headingRad = (vehicle.heading * Math.PI) / 180;
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
      headingGeo: vehicle.heading.toFixed(1) + '° (0°=Nord)',
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
              // Mobile: max 1/4 largeur écran. Desktop: 200x200.
              style={{ width: 'min(25vw, 200px)', height: 'min(25vw, 200px)', cursor: 'default' }}
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