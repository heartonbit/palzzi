/**
 * Kumihimo Engine - Core braiding algorithm
 * 
 * Implements a working kumihimo braid simulation for a 32-slot round disk.
 * 
 * The algorithm:
 * 1. Thread pairs are placed evenly around the disk
 * 2. Each weave operation moves threads from active positions to target positions
 * 3. Between weaves, the disk rotates by the stride
 * 4. After each stride rotations, a full "row" is complete
 * 
 * For n threads with pairStride = 32 / (n/2):
 * - Initial positions: pairs at [0,1], [pairStride, pairStride+1], ...
 * - Active positions (fixed): [0,1,16,17]
 * - Each weave: move slot 1->15, slot 17->31
 * - Rotate by pairStride between weaves
 * - After (32/pairStride) weaves, all pairs have been processed
 * - Then rotate disk by 1 to advance to next row position
 */

const DISK_SLOTS = 32;

function validateThreadCount(nThreads) {
  if (nThreads < 2 || nThreads > DISK_SLOTS) {
    throw new Error(`Thread count must be between 2 and ${DISK_SLOTS}`);
  }
  if (nThreads % 2 !== 0) {
    throw new Error('Thread count must be even');
  }
  if (DISK_SLOTS % nThreads !== 0) {
    throw new Error(`Thread count (${nThreads}) must divide evenly into ${DISK_SLOTS} slots`);
  }
}

function initDisk(threadColors) {
  const nThreads = threadColors.length;
  validateThreadCount(nThreads);

  const state = new Array(DISK_SLOTS).fill(null);
  const nPairs = nThreads / 2;
  const stride = DISK_SLOTS / nPairs;

  for (let i = 0; i < nPairs; i++) {
    const base = i * stride;
    state[base] = threadColors[i * 2];
    state[base + 1] = threadColors[i * 2 + 1];
  }

  return {
    state,
    product: [],
    nThreads,
    nPairs,
    stride,
    stepCount: 0
  };
}

function rotate(state, offset) {
  const result = new Array(DISK_SLOTS).fill(null);
  for (let i = 0; i < DISK_SLOTS; i++) {
    if (state[i] !== null) {
      result[(i - offset + DISK_SLOTS) % DISK_SLOTS] = state[i];
    }
  }
  return result;
}

/**
 * Weave one row.
 * 
 * The disk starts with threads at active positions [0,1,16,17].
 * Each weave moves 1->15 and 17->31, then rotates by stride.
 * After nPairs/2 weaves, one micro-cycle is complete.
 * We repeat this for (32 / stride) micro-cycles to complete one full row.
 */
function weaveRow(kumiState) {
  const { state, stride, nPairs } = kumiState;

  // How many weave operations to do per row
  // We want to capture all threads once
  const weavesPerRow = nPairs;  // 4 for 8 threads
  const opsPerWeave = 1;  // one TR+BL capture per weave

  const tops = [];
  const bottoms = [];

  for (let w = 0; w < weavesPerRow; w++) {
    // Find the correct orientation to weave
    // The disk may need rotation to align threads to active positions
    let woven = false;
    
    for (let attempt = 0; attempt < DISK_SLOTS; attempt++) {
      // Check if active positions have threads and target positions are empty
      if (state[0] !== null && state[1] !== null && 
          state[16] !== null && state[17] !== null &&
          state[15] === null && state[31] === null) {
        
        // Weave: move TR(1)->BR-1(15), BL(17)->TL-1(31)
        const topColor = state[1];
        const bottomColor = state[17];
        
        state[1] = null;
        state[15] = topColor;
        state[17] = null;
        state[31] = bottomColor;
        
        tops.push(topColor);
        bottoms.push(bottomColor);
        woven = true;
        
        // Rotate by stride for next weave
        state.splice(0, state.length, ...rotate(state, stride));
        break;
      }
      
      // Rotate to find the right alignment
      state.splice(0, state.length, ...rotate(state, 1));
    }
    
    if (!woven) {
      break;
    }
  }

  if (tops.length === 0) {
    return null;
  }

  kumiState.stepCount++;
  const row = [...tops, ...bottoms];
  kumiState.product.push(row);
  return row;
}

function weaveRows(kumiState, rowCount) {
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const row = weaveRow(kumiState);
    if (row === null) break;
    rows.push(row);
  }
  return rows;
}

function getDiskLayout(kumiState) {
  return kumiState.state.map((color, slot) => ({ slot, color }));
}

function getPatternChart(kumiState) {
  return kumiState.product;
}

function reset(kumiState, threadColors) {
  const fresh = initDisk(threadColors);
  Object.keys(fresh).forEach(k => kumiState[k] = fresh[k]);
}

function snapshot(kumiState) {
  return {
    state: [...kumiState.state],
    product: kumiState.product.map(r => [...r]),
    stepCount: kumiState.stepCount,
    nThreads: kumiState.nThreads,
    nPairs: kumiState.nPairs,
    stride: kumiState.stride
  };
}

function restore(kumiState, snap) {
  Object.keys(snap).forEach(k => {
    if (Array.isArray(snap[k])) {
      kumiState[k] = snap[k].map(item => Array.isArray(item) ? [...item] : item);
    } else {
      kumiState[k] = snap[k];
    }
  });
}

function getTotalSteps() {
  return 120;
}

module.exports = {
  initDisk,
  weaveRow,
  weaveRows,
  getDiskLayout,
  getPatternChart,
  reset,
  snapshot,
  restore,
  getTotalSteps,
  DISK_SLOTS
};
