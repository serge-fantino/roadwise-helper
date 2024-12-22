export class Snake {
  private _positions: Array<[number, number]> = [];
  private readonly maxLength: number;

  constructor(initialPosition: [number, number], maxLength: number = 20) {
    this._positions = initialPosition ? [[...initialPosition]] : [];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): Array<[number, number]> {
    return this._positions.map(pos => [...pos]);
  }

  addPosition(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid position format:', position);
      return;
    }

    // Ne pas ajouter si la position est identique à la dernière
    if (this._positions.length > 0) {
      const lastPos = this._positions[0];
      if (lastPos[0] === position[0] && lastPos[1] === position[1]) {
        return;
      }
    }

    this._positions.unshift([...position]);
    
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }

    console.log('Snake positions updated:', this._positions);
  }

  reset(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid reset position:', position);
      return;
    }
    this._positions = [[...position]];
    console.log('Snake reset to position:', position);
  }

  private isValidPosition(position: any): position is [number, number] {
    return Array.isArray(position) && 
           position.length === 2 && 
           typeof position[0] === 'number' && 
           typeof position[1] === 'number' &&
           !isNaN(position[0]) && 
           !isNaN(position[1]);
  }
}