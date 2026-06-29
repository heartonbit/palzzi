/**
 * Kumihimo Simulation Engine
 * Handles the state of the circular disk and braiding algorithm.
 * Dynamically scales slot counts for larger threads.
 */
export class KumihimoDisk {
  constructor(nThreads = 8) {
    this.nThreads = nThreads;
    // Dynamically expand to 64 slots for 20+ threads to prevent collision gaps,
    // otherwise stick to the standard 32 slots.
    this.slotsCount = nThreads >= 20 ? 64 : 32;
    this.state = Array(this.slotsCount).fill(null); // slots (0 to slotsCount - 1)
    this.product = []; // Array of rows braided so far (tops + bottoms)
    this.productColors = []; // Array of arrays containing { id, color, slot } objects for each thread ID on each step (doc/6_KumihimoVisualization)
    this.currentPos = 0; // Starting position on the disk for the current step
    this.rowIndex = 0; // Number of rows braided so far
  }

  /**
   * Initializes the disk slots with the given thread colors.
   * @param {string[]} threadColors - Array of colors for the threads. Length must equal nThreads.
   */
  init(threadColors) {
    if (!threadColors || threadColors.length !== this.nThreads) {
      throw new Error(`Thread colors length must match thread count (${this.nThreads})`);
    }

    this.slotsCount = this.nThreads >= 20 ? 64 : 32;
    this.state = Array(this.slotsCount).fill(null);
    this.product = [];
    this.productColors = [];
    this.currentPos = 0;
    this.rowIndex = 0;

    const nPairs = this.nThreads / 2;
    const distance = this.slotsCount / nPairs;

    for (let i = 0; i < nPairs; i++) {
      const idx1 = Math.round(i * distance) % this.slotsCount;
      const idx2 = (idx1 + 1) % this.slotsCount;
      this.state[idx1] = { id: i * 2, color: threadColors[i * 2] };
      this.state[idx2] = { id: i * 2 + 1, color: threadColors[i * 2 + 1] };
    }
    
    // Save initial ordered colors with their slot positions
    this.productColors.push(this.getActiveColors());
  }

  /**
   * Returns the current colors of all active threads, sorted by thread ID.
   * Each entry contains { id, color, slot } representing the current state of that thread.
   * @returns {Array<{id: number, color: string, slot: number}>} Length will be exactly nThreads.
   */
  getActiveColors() {
    const list = [];
    for (let s = 0; s < this.slotsCount; s++) {
      const obj = this.state[s];
      if (obj && typeof obj === 'object') {
        list.push({
          id: obj.id,
          color: obj.color,
          slot: s
        });
      }
    }
    // Return sorted by thread ID (0 to nThreads - 1) for seamless tracking
    return list.sort((a, b) => a.id - b.id);
  }

  /**
   * Performs one row of weaving (braiding) and returns the braided thread colors.
   * Updates the internal disk state and appends the result to product.
   * @returns {string[]} The colors of the threads that were crossed in this row.
   */
  weaveRow() {
    const tops = [];
    const bottoms = [];
    const nPairs = this.nThreads / 2;
    const repeatCount = Math.max(1, nPairs / 2); // Repeat nPairs / 2 times
    const distance = this.slotsCount / nPairs;
    const midOffset = this.slotsCount / 2;

    // Calculate the start position for this row:
    // Every row shifts the starting position by -1 (counter-clockwise relative shift)
    const startPos = (this.slotsCount - this.rowIndex) % this.slotsCount;
    let currentPos = startPos;

    for (let step = 0; step < repeatCount; step++) {
      const currentPosInt = Math.round(currentPos) % this.slotsCount;
      const tl = (currentPosInt + this.slotsCount) % this.slotsCount;
      const tr = (currentPosInt + 1 + this.slotsCount) % this.slotsCount;
      const br = (currentPosInt + midOffset + this.slotsCount) % this.slotsCount;
      const bl = (br + 1 + this.slotsCount) % this.slotsCount;

      const trObj = this.state[tr];
      const blObj = this.state[bl];

      if (trObj === null || blObj === null) {
        throw new Error(
          `Expected threads at slots ${tr + 1} and ${bl + 1}, but found empty slot.`
        );
      }

      // TR -> BR - 1
      const targetBr = (br - 1 + this.slotsCount) % this.slotsCount;
      if (this.state[targetBr] !== null) {
        throw new Error(
          `Slot ${targetBr + 1} is not empty! Collision moving TR (${tr + 1}) to BR - 1 (${targetBr + 1}).`
        );
      }
      this.state[tr] = null;
      this.state[targetBr] = trObj;
      tops.push(trObj.color);

      // BL -> TL - 1
      const targetTl = (tl - 1 + this.slotsCount) % this.slotsCount;
      if (this.state[targetTl] !== null) {
        throw new Error(
          `Slot ${targetTl + 1} is not empty! Collision moving BL (${bl + 1}) to TL - 1 (${targetTl + 1}).`
        );
      }
      this.state[bl] = null;
      this.state[targetTl] = blObj;
      bottoms.push(blObj.color);

      // Shift position for the next pair in this row
      currentPos = (currentPos + distance) % this.slotsCount;
    }

    // Combine tops and bottoms to form the row's output
    const rowResult = [...tops, ...bottoms];
    this.product.push(rowResult);
    this.productColors.push(this.getActiveColors());
    this.rowIndex++;
    
    // Save currentPos for disk rendering (the last position reached in this row)
    this.currentPos = startPos; 

    return rowResult;
  }

  /**
   * Resets the simulation to the initial state while maintaining the thread colors.
   * @param {string[]} threadColors 
   */
  reset(threadColors) {
    this.init(threadColors);
  }
}
