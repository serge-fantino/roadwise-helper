export class Snake {
  private _positions: [number, number][] = [];
  private readonly maxLength: number;

  constructor(initialPosition: [number, number], maxLength: number = 10) {
    this._positions = initialPosition ? [initialPosition] : [];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): [number, number][] {
    return [...this._positions]; // Return a copy to avoid reference issues
  }

  addPosition(position: [number, number]) {
    console.log('Adding position to snake:', position);
    
    // Add new position at the beginning of the array
    this._positions.unshift(position);
    
    // Keep only maxLength positions
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }
    
    console.log('Updated snake positions:', [...this._positions]); // Log a copy
  }

  reset(position: [number, number]) {
    console.log('Resetting snake to position:', position);
    this._positions = [position];
  }
}
