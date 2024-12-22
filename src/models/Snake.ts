export class Snake {
  private _positions: [number, number][] = [];
  private readonly maxLength: number;

  constructor(initialPosition: [number, number], maxLength: number = 10) {
    this._positions = [initialPosition];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): [number, number][] {
    console.log('Getting snake positions:', this._positions);
    return this._positions;
  }

  addPosition(position: [number, number]) {
    console.log('Adding position to snake:', position);
    console.log('Current positions before add:', this._positions);
    
    // Add new position at the beginning of the array
    this._positions.unshift(position);
    
    // Keep only maxLength positions
    if (this._positions.length > this.maxLength) {
      console.log(`Snake length (${this._positions.length}) exceeds max (${this.maxLength}), trimming...`);
      this._positions = this._positions.slice(0, this.maxLength);
    }
    
    console.log('Updated snake positions:', this._positions);
  }

  reset(position: [number, number]) {
    console.log('Resetting snake to position:', position);
    this._positions = [position];
  }
}