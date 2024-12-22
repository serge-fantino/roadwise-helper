import { Snake } from './Snake';
import { calculateBearing } from '../utils/mapUtils';

type VehicleObserver = (position: [number, number], speed: number) => void;

export class Vehicle {
  private _position: [number, number] | null;
  private _speed: number;
  private _snake: Snake;
  private _observers: VehicleObserver[] = [];
  private _heading: number = 0;

  constructor(initialPosition: [number, number] | null) {
    this._position = initialPosition;
    this._speed = 0;
    this._snake = new Snake(initialPosition || [0, 0]);
  }

  get position(): [number, number] {
    return this._position || [0, 0];
  }

  get speed(): number {
    return this._speed;
  }

  get heading(): number {
    return this._heading;
  }

  get positionHistory(): [number, number][] {
    return this._snake.positions;
  }

  addObserver(observer: VehicleObserver) {
    this._observers.push(observer);
  }

  removeObserver(observer: VehicleObserver) {
    this._observers = this._observers.filter(obs => obs !== observer);
  }

  private notifyObservers() {
    if (this._position) {
      this._observers.forEach(observer => observer(this._position!, this._speed));
    }
  }

  private updateHeading() {
    const positions = this._snake.positions;
    if (positions.length >= 2) {
      const lastPos = positions[0];
      const prevPos = positions[1];
      this._heading = calculateBearing(prevPos, lastPos);
    }
  }

  update(newPosition: [number, number], newSpeed: number) {
    this._position = newPosition;
    this._speed = newSpeed;
    this._snake.addPosition(newPosition);
    this.updateHeading();
    this.notifyObservers();
  }

  reset(position: [number, number]) {
    this._position = position;
    this._speed = 0;
    this._snake.reset(position);
    this._heading = 0;
    this.notifyObservers();
  }
}