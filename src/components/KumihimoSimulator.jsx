// KumihimoSimulator.jsx 내 핵심 로직 부분
const executeStep = () => {
  const move = getNextKumihimoMove(slots, strandPos, 0, numThreads, rotationStep);
  if (!move) return false;

  setRotationStep(rotationStep + 1);
  const nextSlots = [...slots];
  nextSlots[move.topRightDest] = slots[move.topRightSource];
  nextSlots[move.bottomLeftDest] = slots[move.bottomLeftSource];
  nextSlots[move.topRightSource] = null;
  nextSlots[move.bottomLeftSource] = null;

  setSlots(nextSlots);
  const nextPos = [...strandPos];
  nextPos[move.srcStrand1] = move.topRightDest;
  nextPos[move.srcStrand2] = move.bottomLeftDest;
  setStrandPos(nextPos);

  setCurrentStep(prev => prev + 1);
  return true;
};