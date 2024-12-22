import { Snake } from './Snake';

export class Vehicle {
  private _position: [number, number] | null;
  private _speed: number;
  private _snake: Snake;

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

  get positionHistory(): [number, number][] {
    return this._snake.positions;
  }

  update(newPosition: [number, number], newSpeed: number) {
    this._position = newPosition;
    this._speed = newSpeed;
    this._snake.addPosition(newPosition);
  }

  reset(position: [number, number]) {
    this._position = position;
    this._speed = 0;
    this._snake.reset(position);
  }
}