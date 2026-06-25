// Palzzi Weaving Helper Utilities - Kumihimo Generalization
export const KNOT_TYPES = {
  NONE: 'NONE',
  FORWARD: 'FORWARD',
  BACKWARD: 'BACKWARD',
  FORWARD_BACKWARD: 'FORWARD_BACKWARD',
  BACKWARD_FORWARD: 'BACKWARD_FORWARD'
};

export function initializeKumihimoSlots(numThreads, colors) {
  const numPairs = numThreads / 2;
  const diskSize = numThreads * 4;
  const slots = Array(diskSize).fill(null);
  for (let p = 0; p < numPairs; p++) {
    const left = p * 8;
    const right = (left + 1) % diskSize;
    slots[left] = colors[(p * 2) % colors.length];
    slots[right] = colors[(p * 2 + 1) % colors.length];
  }
  return slots;
}

export const MOVE_DIRECTION = { NS: 'NS', EW: 'EW' };

export function getNextKumihimoMove(slots, strandPos, baseSlot = 0, numThreads = 8, rotationStep = 0) {
  const diskSize = numThreads * 4;
  const P = numThreads / 2;
  const halfP = Math.floor(P / 2);
  if (halfP === 0) return null;

  const getPairPos = (p) => {
    const i = p % halfP;
    const cycle = Math.floor(rotationStep / halfP);
    const rem = rotationStep % halfP;
    const shift = cycle + (i < rem ? 1 : 0);
    const left = (p * 8 - shift + diskSize) % diskSize;
    const right = (left + 1) % diskSize;
    return { left, right };
  };

  const i = rotationStep % halfP;
  const pA = i;
  const pB = i + halfP;
  const posA = getPairPos(pA);
  const posB = getPairPos(pB);

  if (slots[posA.left] === null || slots[posA.right] === null ||
    slots[posB.left] === null || slots[posB.right] === null) return null;

  const destA = (posB.left - 1 + diskSize) % diskSize;
  const destB = (posA.left - 1 + diskSize) % diskSize;

  return {
    topRightSource: posA.right,
    topRightDest: destA,
    bottomLeftSource: posB.right,
    bottomLeftDest: destB,
    direction: (i % 2 === 0) ? MOVE_DIRECTION.NS : MOVE_DIRECTION.EW,
    srcStrand1: strandPos.indexOf(posA.right),
    srcStrand2: strandPos.indexOf(posB.right)
  };
}