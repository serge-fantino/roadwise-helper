export class Snake {
  private _positions: [number, number][] = [];
  private readonly maxLength: number;

  constructor(initialPosition: [number, number], maxLength: number = 10) {
    this._positions = [initialPosition];
    this.maxLength = maxLength;
  }

  get positions(): [number, number][] {
    return this._positions;
  }

  addPosition(position: [number, number]) {
    // Add new position at the beginning of the array
    this._positions.unshift(position);
    
    // Keep only maxLength positions
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }
  }

  reset(position: [number, number]) {
    this._positions = [position];
  }
}
