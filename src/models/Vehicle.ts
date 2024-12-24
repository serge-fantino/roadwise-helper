import { Snake } from './Snake';
import { calculateBearing } from '../utils/mapUtils';

type VehicleObserver = (position: [number, number], speed: number, acceleration: number) => void;

export class Vehicle {
  private _position: [number, number];
  private _speed: number;
  private _acceleration: number;
  private _snake: Snake;
  private _observers: VehicleObserver[] = [];
  private _heading: number = 0;

  constructor(initialPosition: [number, number]) {
    this._position = initialPosition;
    this._speed = 0;
    this._acceleration = 0;
    this._snake = new Snake(initialPosition);
  }

  get position(): [number, number] {
    return this._position;
  }

  get speed(): number {
    return this._speed;
  }

  get acceleration(): number {
    return this._acceleration;
  }

  get heading(): number {
    return this._heading;
  }

  get positionHistory(): [number, number][] {
    return this._snake.positions;
  }

  addObserver(observer: VehicleObserver) {
    this._observers.push(observer);
    console.log('[Vehicle] Observer added, total observers:', this._observers.length);
  }

  removeObserver(observer: VehicleObserver) {
    this._observers = this._observers.filter(obs => obs !== observer);
    console.log('[Vehicle] Observer removed, remaining observers:', this._observers.length);
  }

  private notifyObservers() {
    console.log('[Vehicle] Notifying observers - Current speed:', this._speed, 'Current acceleration:', this._acceleration);
    this._observers.forEach(observer => {
      observer(this._position, this._speed, this._acceleration);
    });
  }

  private updateHeading() {
    const positions = this._snake.positions;
    if (positions.length >= 2) {
      const lastPos = positions[0];
      const prevPos = positions[1];
      this._heading = calculateBearing(prevPos, lastPos);
      console.log('[Vehicle] Heading updated:', this._heading);
    }
  }

  update(newPosition: [number, number], newSpeed: number, acceleration: number = 0) {
    console.log('[Vehicle] Updating vehicle:', { 
      newPosition, 
      newSpeed, 
      acceleration,
      currentSpeed: this._speed 
    });
    this._position = newPosition;
    this._speed = newSpeed;
    this._acceleration = acceleration;
    this._snake.addPosition(newPosition);
    this.updateHeading();
    this.notifyObservers();
  }

  reset(position: [number, number]) {
    console.log('[Vehicle] Resetting vehicle to position:', position);
    this._position = position;
    this._speed = 0;
    this._acceleration = 0;
    this._snake.reset(position);
    this._heading = 0;
    this.notifyObservers();
  }
}