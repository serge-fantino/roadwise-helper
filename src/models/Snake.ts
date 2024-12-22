export class Snake {
  private _positions: [number, number][] = [];
  private readonly maxLength: number;

  constructor(initialPosition: [number, number], maxLength: number = 10) {
    this._positions = initialPosition ? [initialPosition] : [];
    this.maxLength = maxLength;
    console.log('Snake initialized with position:', initialPosition);
  }

  get positions(): [number, number][] {
    // Retourner une copie profonde pour éviter les références circulaires
    return this._positions.map(pos => [...pos] as [number, number]);
  }

  addPosition(position: [number, number]) {
    console.log('Adding position to snake:', position);
    
    // Vérifier si la position est valide
    if (!Array.isArray(position) || position.length !== 2 || 
        typeof position[0] !== 'number' || typeof position[1] !== 'number') {
      console.error('Invalid position format:', position);
      return;
    }
    
    // Ajouter une copie de la position
    this._positions.unshift([...position]);
    
    // Garder seulement maxLength positions
    if (this._positions.length > this.maxLength) {
      this._positions = this._positions.slice(0, this.maxLength);
    }
    
    console.log('Updated snake positions:', this._positions);
  }

  reset(position: [number, number]) {
    console.log('Resetting snake to position:', position);
    this._positions = [[...position]];
  }
}