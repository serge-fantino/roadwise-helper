/**
 * RouteProjectionService
 * 
 * This service is responsible for projecting GPS coordinates into a local cartesian 
 * coordinate system and generating road borders based on the path geometry.
 * 
 * Key responsibilities:
 * - Convert GPS coordinates (lat/lon) to local cartesian coordinates (meters)
 * - Generate left and right road borders based on path geometry
 * - Handle road border transitions at turns and intersections
 * 
 * Road Border Generation Process:
 * 1. Path Segmentation:
 *    - Each pair of consecutive points forms a road segment
 *    - Each segment has its own coordinate system perpendicular to its direction
 * 
 * 2. Border Points Generation:
 *    - For each segment, generate 6 control points:
 *      * middleBottom: start point of the segment
 *      * middleTop: end point of the segment
 *      * leftBottom/rightBottom: points 1m to the left/right of start
 *      * leftTop/rightTop: points 1m to the left/right of end
 * 
 * 3. Turn Handling:
 *    - At each junction between segments:
 *      * Calculate angle between segments
 *      * For sharp turns (>threshold): generate arc points for smooth transition
 *      * For gentle turns: find intersection of border lines
 *    - Outside of turn: straight border lines parallel to path
 * 
 * 4. Border Smoothing:
 *    - Generate additional points along arcs for smooth curves
 *    - Number of points proportional to arc length
 *    - Interpolate points along circular arc
 * 
 * Coordinate System:
 * - Origin: First point of the path
 * - X axis: East direction (positive)
 * - Y axis: North direction (positive)
 * - Units: Meters
 * 
 * Dependencies:
 * None - Pure geometric calculations
 */
interface Point {
    lat: number;
    lon: number;
}

export interface CartesianPoint {
    x: number;
    y: number;
}

interface SegmentBorders {
    middleBottom: CartesianPoint;
    leftBottom: CartesianPoint;
    rightBottom: CartesianPoint;
    middleTop: CartesianPoint;
    leftTop: CartesianPoint;
    rightTop: CartesianPoint;
}

export function latLonToMeters(lat: number, lon: number, originLat: number, originLon: number): CartesianPoint {
    const R = 6371e3; // Rayon de la Terre en mètres
    const dLat = toRadians(lat - originLat);
    const dLon = toRadians(lon - originLon);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(originLat)) * Math.cos(toRadians(lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance approximative en mètres

    // Approximation locale : on considère que la différence de longitude affecte principalement l'axe X
    // et la différence de latitude affecte principalement l'axe Y.
    // C'est une simplification, mais elle est raisonnable localement.
    const y = distance * Math.sin(bearing(toRadians(originLat), toRadians(originLon), toRadians(lat), toRadians(lon)));
    const x = distance * Math.cos(bearing(toRadians(originLat), toRadians(originLon), toRadians(lat), toRadians(lon)));

    return { x, y };
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return Math.atan2(y, x);
}

function createSegmentBorders(p1: CartesianPoint, p2: CartesianPoint, roadWidth: number=3): SegmentBorders {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitDx = dx / length;
    const unitDy = dy / length;

    // Vecteur perpendiculaire normalisé (pour obtenir le côté gauche/droite)
    const perpX = -unitDy * roadWidth;
    const perpY = unitDx * roadWidth;

    const leftBottom = { x: p1.x + perpX, y: p1.y + perpY };
    const rightBottom = { x: p1.x - perpX, y: p1.y - perpY };
    const leftTop = { x: p2.x + perpX, y: p2.y + perpY };
    const rightTop = { x: p2.x - perpX, y: p2.y - perpY };

    return { middleBottom: p1, leftBottom, rightBottom, middleTop: p2, leftTop, rightTop };
}

export function angleBetweenSegments(p1: CartesianPoint, p2: CartesianPoint, p3: CartesianPoint): number {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitudeV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magnitudeV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (magnitudeV1 === 0 || magnitudeV2 === 0) {
        return 0; // Gérer le cas où l'un des segments a une longueur nulle
    }

    const cosAngle = dotProduct / (magnitudeV1 * magnitudeV2);
    let angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // S'assurer que la valeur est entre -1 et 1

    // Déterminer le signe de l'angle (sens de rotation) en utilisant le produit vectoriel 2D
    const crossProduct = v1.x * v2.y - v1.y * v2.x;
    if (crossProduct > 0) {
        angle = -angle; // Tourne à droite (clockwise)
    }

    return angle;
}

function interpolateArc(center: CartesianPoint, startPoint: CartesianPoint, endPoint: CartesianPoint, numPoints: number): CartesianPoint[] {
    const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
    const endAngle = Math.atan2(endPoint.y - center.y, endPoint.x - center.x);

    let deltaAngle = endAngle - startAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    const arcRadius = Math.sqrt(Math.pow(center.x - startPoint.x, 2) + Math.pow(center.y - startPoint.y, 2));
    const arcPoints: CartesianPoint[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const angle = startAngle + deltaAngle * (i / numPoints);
        const x = center.x + Math.cos(angle) * arcRadius;
        const y = center.y + Math.sin(angle) * arcRadius;
        arcPoints.push({ x, y });
    }
    return arcPoints;
}

function findIntersection(p1: CartesianPoint, p2: CartesianPoint, p3: CartesianPoint, p4: CartesianPoint): CartesianPoint | null {
    if (p2.x === p3.x && p2.y === p3.y) {
        return p2;
    }
    const det = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (det === 0) {
        return null; // Les segments sont parallèles
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / det;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / det;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    }
    return null; // Pas d'intersection dans les segments
}

export function generateBorders(cartesianPath: CartesianPoint[]): { path: CartesianPoint[], leftBorder: CartesianPoint[], rightBorder: CartesianPoint[] } {
    if (cartesianPath.length < 2) {
        return { path: [], leftBorder: [], rightBorder: [] };
    }

    let leftBorder: CartesianPoint[] = [];
    let rightBorder: CartesianPoint[] = [];
    const segmentsBorders: SegmentBorders[] = [];

    for (let i = 0; i < cartesianPath.length - 1; i++) {
        segmentsBorders.push(createSegmentBorders(cartesianPath[i], cartesianPath[i + 1]));
    }

    if (segmentsBorders.length === 1) {
        return {
            path: cartesianPath,
            leftBorder: [segmentsBorders[0].leftBottom, segmentsBorders[0].leftTop],
            rightBorder: [segmentsBorders[0].rightBottom, segmentsBorders[0].rightTop]
        };
    }

    leftBorder.push(segmentsBorders[0].leftBottom);
    rightBorder.push(segmentsBorders[0].rightBottom);

    for (let i = 0; i < segmentsBorders.length - 1; i++) {
        const segmentA = segmentsBorders[i];
        const segmentB = segmentsBorders[i + 1];
        const centerPoint = segmentA.middleTop
        const angle = angleBetweenSegments(segmentA.middleBottom, segmentA.middleTop, segmentB.middleTop); // Utiliser le point suivant s'il existe

        if (false && angle === 0) {
            leftBorder.push(segmentA.leftTop);
            rightBorder.push(segmentA.rightTop);
        } else {
            let outerTop: CartesianPoint, outerBottomNext: CartesianPoint;
            let outerBorder: CartesianPoint[];
            let innerBorder: CartesianPoint[];
    
            if (angle > 0) { // Tourne à droite, le côté extérieur est le gauche
                outerTop = segmentA.leftTop;
                outerBottomNext = segmentB.leftBottom;
                outerBorder = leftBorder;
                innerBorder = rightBorder;  
            } else { // Tourne à gauche, le côté extérieur est le droit
                outerTop = segmentA.rightTop;
                outerBottomNext = segmentB.rightBottom;
                outerBorder = rightBorder;
                innerBorder = leftBorder;
            }
            const arcLength = Math.sqrt(Math.pow(outerTop.x - outerBottomNext.x, 2) + Math.pow(outerTop.y - outerBottomNext.y, 2));
            if (arcLength < .5) {
                outerBorder.push(outerTop, outerBottomNext);
            } else {
                const numArcPoints = Math.round(arcLength)*2;
                const arcPoints = interpolateArc(centerPoint, outerTop, outerBottomNext, numArcPoints);
                outerBorder.push(outerTop, ...arcPoints, outerBottomNext);
            }
 
            if (angle > 0) {
                const intersection = findIntersection(segmentA.rightBottom, segmentA.rightTop, segmentB.rightBottom, segmentB.rightTop);
                if (intersection) {
                    innerBorder.push(intersection);
                } else {
                    //rightBorder.push(segmentB.rightBottom);
                }
            } else {
                const intersection = findIntersection(segmentA.leftBottom, segmentA.leftTop, segmentB.leftBottom, segmentB.leftTop);
                if (intersection) {
                    innerBorder.push(intersection);
                } else {
                    //leftBorder.push(segmentB.leftBottom);
                }
            }
        }
        // left the road open in order to easily extend it with new segments...
        /*
        if (i+1 === segmentsBorders.length - 1) {
            leftBorder.push(segmentB.leftTop);
            rightBorder.push(segmentB.rightTop);
        }
        */
    }

    return { path: cartesianPath, leftBorder, rightBorder };
}