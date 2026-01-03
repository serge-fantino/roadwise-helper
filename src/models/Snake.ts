type TimestampedPosition = {
  position: [number, number];
  timestamp: number;
};

export class Snake {
  private _positions: Array<TimestampedPosition> = [];
  private readonly maxLength: number;
  private readonly maxAge: number = 60000; // 60 secondes en millisecondes

  constructor(initialPosition: [number, number], maxLength: number = 60) {
    this._positions = initialPosition ? [{
      position: [...initialPosition],
      timestamp: Date.now()
    }] : [];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): Array<[number, number]> {
    this.cleanOldPositions();
    return this._positions.map(tp => [...tp.position]);
  }

  private cleanOldPositions() {
    const now = Date.now();
    this._positions = this._positions.filter(tp => {
      return (now - tp.timestamp) <= this.maxAge;
    });
  }

  addPosition(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid position format:', position);
      return;
    }

    // Ne pas ajouter si la position est identique à la dernière
    if (this._positions.length > 0) {
      const lastPos = this._positions[0].position;
      if (lastPos[0] === position[0] && lastPos[1] === position[1]) {
        return;
      }
    }

    this._positions.unshift({
      position: [...position],
      timestamp: Date.now()
    });
    
    this.cleanOldPositions();
    
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }

    console.log('Snake positions updated:', this._positions.map(tp => tp.position));
  }

  reset(position: [number, number]) {
    if (!this.isValidPosition(position)) {
      console.error('Invalid reset position:', position);
      return;
    }
    this._positions = [{
      position: [...position],
      timestamp: Date.now()
    }];
    console.log('Snake reset to position:', position);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isValidPosition(position: any): position is [number, number] {
    return Array.isArray(position) && 
           position.length === 2 && 
           typeof position[0] === 'number' && 
           typeof position[1] === 'number' &&
           !isNaN(position[0]) && 
           !isNaN(position[1]);
  }
}