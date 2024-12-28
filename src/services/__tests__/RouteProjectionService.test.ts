import { angleBetweenSegments, generateBorders, generateRoadBorders, latLonToMeters } from '../RouteProjectionService';
import { saveRoutePlot } from '../../utils/RouteVisualizer';

describe('RouteProjectionService', () => {

  describe('angleBetweenSegments', () => {
    it('should return 0 when the angle is 0', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 0, y: 1 };
      const p3 = { x: 0, y: 2 };
      const result = angleBetweenSegments(p1, p2, p3);
      expect(result).toEqual(0);
    });
    it('should return PI/2 when the angle is 90 right', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 0, y: 1 };
      const p3 = { x: 1, y: 1 };
      const result = angleBetweenSegments(p1, p2, p3);
      expect(result).toEqual(Math.PI / 2);
    });
    it('should return -PI/2 when the angle is 90 left', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 0, y: 1 };
      const p3 = { x: -1, y: 1 };
      const result = angleBetweenSegments(p1, p2, p3);
      expect(result).toEqual(-Math.PI / 2);
    });
  });

  describe('generateBorders', () => {
    it('should return empty arrays when path has less than 2 points', () => {
      const path = [{ x: 0, y: 0 }];
      const result = generateBorders(path);
      expect(result).toEqual({ path: [], leftBorder: [], rightBorder: [] });
    });
    it('should generate a simple segment if there are only two points', () => {
      const path = [{ x: 0, y: 0 }, { x: 0, y: 1 }];
      const result = generateBorders(path);
      expect(result).toEqual({ path, leftBorder: [{ x: -1, y: 0 }, { x: -1, y: 1 }], rightBorder: [{ x: 1, y: 0 }, { x: 1, y: 1 }] });
    });
    it('should generate a straight road border', () => {
      const path = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }];
      const result = generateBorders(path);
      console.log("result", result);
      saveRoutePlot(result, "straight_road_border");
      expect(result).toEqual({ path, leftBorder: [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: -1, y: 2 }], rightBorder: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }] });
    });
    it('should generate a 90° right turn', () => {
      const path = [{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 5, y: 7.5 }, { x: 10, y: 7.5 }, { x: 15, y: 7.5 }];
      const result = generateBorders(path);
      console.log("result", result);
      saveRoutePlot(result, "90_right_turn_border");
      expect(result.leftBorder.length).toBeGreaterThan(result.rightBorder.length);
    });
    it('shoudl generate Viller example', () => {
      const route = [[48.984413, 6.643369], [48.984417, 6.643427], [48.984472, 6.643915], [48.984499, 6.644103], [48.984525, 6.644234], [48.984561, 6.644348], [48.984607, 6.644446], [48.984664, 6.644521], [48.984735, 6.644591], [48.984825, 6.644661], [48.984916, 6.644713], [48.985022, 6.64475], [48.985302, 6.644802], [48.985384, 6.644805], [48.985525, 6.644805], [48.985602, 6.644808], [48.985694, 6.644822], [48.985771, 6.64485], [48.985837, 6.644886], [48.985909, 6.644954], [48.985987, 6.64505], [48.986116, 6.64522], [48.986396, 6.645681], [48.986434, 6.645787], [48.986458, 6.645904], [48.986458, 6.646037], [48.986442, 6.646159], [48.986401, 6.646306], [48.986332, 6.646502], [48.986258, 6.646659], [48.986189, 6.646774], [48.986118, 6.646875], [48.986023, 6.646995], [48.985932, 6.647092], [48.98552, 6.647542], [48.985476, 6.647454], [48.985425, 6.647396], [48.985122, 6.647171], [48.985076, 6.647144], [48.98503, 6.647135], [48.984989, 6.647154], [48.984967, 6.647172], [48.984941, 6.647219], [48.984922, 6.647299], [48.984818, 6.647956], [48.984815, 6.647969]]
      const origin = route[0];
      const cartesianPath = route.map(p => latLonToMeters(p[0], p[1], origin[0], origin[1]));
      const result = generateBorders(cartesianPath);
      saveRoutePlot(result, "viller_border");
    });
  });
}); 

