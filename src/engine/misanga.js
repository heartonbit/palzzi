/**
 * Misanga (Friendship Bracelet) Simulation Engine
 *
 * Models a flat knot-based bracelet loom. Each row consists of knots
 * between adjacent string pairs. Knots are tied in two alternating passes:
 *   Pass 1: even-indexed knots (0, 2, 4, ...)
 *   Pass 2: odd-indexed knots (1, 3, 5, ...)
 *
 * Knot types:
 *  - 'F' (Forward):  left string goes over right → left moves right, left color on top
 *  - 'B' (Backward): right string goes over left → right moves left, right color on top
 */
export class MisangaLoom {
  constructor(nStrings = 4) {
    this.nStrings = nStrings;
    this.state = [];
    this.productColors = [];
    this.knotHistory = [];
    this.rowIndex = 0;
    this.cycleLength = 0;
    this.stateSnapshots = [];
    this.initialStateIds = null;
  }

  init(colors) {
    if (!colors || colors.length !== this.nStrings) {
      throw new Error(`Colors length must match string count (${this.nStrings})`);
    }
    this.state = colors.map((color, i) => ({ id: i, color }));
    this.productColors = [this.state.map(s => ({ ...s }))];
    this.knotHistory = [];
    this.rowIndex = 0;
    this.cycleLength = 0;
    this.stateSnapshots = [];
    this.initialStateIds = this.state.map(s => s.id);
  }

  /**
   * Tie one row of knots using two-pass alternating method.
   * @param {string[]} directions - Array of 'F' or 'B', length = nStrings - 1
   * @returns {Array<{left, right, direction, topColor}>} Knot results
   */
  tieRow(directions) {
    const nKnots = this.nStrings - 1;
    if (directions.length !== nKnots) {
      throw new Error(`Need ${nKnots} knot directions for ${this.nStrings} strings`);
    }

    const current = this.state.map(s => ({ ...s }));
    const knots = [];

    // Pass 1: even-indexed knots (non-overlapping)
    for (let k = 0; k < nKnots; k += 2) {
      if (directions[k] === 'F') {
        knots[k] = { left: current[k].color, right: current[k + 1].color, direction: 'F', topColor: current[k].color };
        const tmp = current[k];
        current[k] = current[k + 1];
        current[k + 1] = tmp;
      } else {
        knots[k] = { left: current[k].color, right: current[k + 1].color, direction: 'B', topColor: current[k + 1].color };
        const tmp = current[k];
        current[k] = current[k + 1];
        current[k + 1] = tmp;
      }
    }

    // Pass 2: odd-indexed knots (non-overlapping, operate on intermediate state)
    for (let k = 1; k < nKnots; k += 2) {
      if (directions[k] === 'F') {
        knots[k] = { left: current[k].color, right: current[k + 1].color, direction: 'F', topColor: current[k].color };
        const tmp = current[k];
        current[k] = current[k + 1];
        current[k + 1] = tmp;
      } else {
        knots[k] = { left: current[k].color, right: current[k + 1].color, direction: 'B', topColor: current[k + 1].color };
        const tmp = current[k];
        current[k] = current[k + 1];
        current[k + 1] = tmp;
      }
    }

    this.state = current;
    this.productColors.push(this.state.map(s => ({ ...s })));
    this.knotHistory.push(knots);

    // Cycle detection
    if (this.cycleLength === 0) {
      this.stateSnapshots.push(this.state.map(s => ({ ...s })));
      const currentIds = this.state.map(s => s.id);
      let match = true;
      for (let i = 0; i < this.nStrings; i++) {
        if (currentIds[i] !== this.initialStateIds[i]) { match = false; break; }
      }
      if (match) {
        this.cycleLength = this.rowIndex + 1;
      }
    }

    this.rowIndex++;
    return knots;
  }

  /**
   * Fast weave: simulate until cycle detected, then cache-copy.
   */
  tieRowFast(directions) {
    if (this.cycleLength === 0 || this.rowIndex < this.cycleLength) {
      return this.tieRow(directions);
    }

    const cycleIdx = this.rowIndex % this.cycleLength;
    const sourceKnots = this.knotHistory[cycleIdx];
    const sourceColors = this.productColors[cycleIdx + 1];

    this.knotHistory.push(sourceKnots.map(k => ({ ...k })));
    this.productColors.push(sourceColors.map(s => ({ ...s })));
    this.state = this.stateSnapshots[cycleIdx].map(s => ({ ...s }));
    this.rowIndex++;

    return sourceKnots.map(k => ({ ...k }));
  }

  /**
   * Get knot directions for a named pattern type at a given row.
   * @param {string} patternType - 'diagonal' | 'flat' | 'chevron' | 'diamond'
   * @param {number} row - Row index
   * @param {number} nStrings - Number of strings
   * @returns {string[]} Array of 'F'/'B'
   */
  static getPatternDirections(patternType, row, nStrings = 4) {
    const nKnots = nStrings - 1;
    switch (patternType) {
      case 'diagonal':
        return Array(nKnots).fill('F');

      case 'flat':
        return Array.from({ length: nKnots }, (_, i) =>
          (row + i) % 2 === 0 ? 'F' : 'B'
        );

      case 'chevron': {
        const half = Math.ceil(nKnots / 2);
        return Array.from({ length: nKnots }, (_, i) =>
          i < half ? 'F' : 'B'
        );
      }

      case 'diamond': {
        const half = Math.ceil(nKnots / 2);
        const phase = row % 2;
        return Array.from({ length: nKnots }, (_, i) => {
          if (phase === 0) return i < half ? 'F' : 'B';
          return i < half ? 'B' : 'F';
        });
      }

      default:
        return Array(nKnots).fill('F');
    }
  }

  reset(colors) {
    this.init(colors);
  }
}
