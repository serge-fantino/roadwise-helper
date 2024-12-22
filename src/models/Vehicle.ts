export class Vehicle {
  private _position: [number, number];
  private _speed: number;
  private _positionHistory: [number, number][];
  private readonly maxHistoryLength = 10;

  constructor(initialPosition: [number, number]) {
    this._position = initialPosition;
    this._speed = 0;
    this._positionHistory = [initialPosition];
  }

  get position(): [number, number] {
    return this._position;
  }

  get speed(): number {
    return this._speed;
  }

  get positionHistory(): [number, number][] {
    return this._positionHistory;
  }

  update(newPosition: [number, number], newSpeed: number) {
    this._position = newPosition;
    this._speed = newSpeed;
    
    this._positionHistory.push(newPosition);
    if (this._positionHistory.length > this.maxHistoryLength) {
      this._positionHistory.shift();
    }
  }

  reset(position: [number, number]) {
    this._position = position;
    this._speed = 0;
    this._positionHistory = [position];
  }
}