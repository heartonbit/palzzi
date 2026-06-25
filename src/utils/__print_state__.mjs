import { initializeKumihimoSlots, getNextKumihimoMove } from './weavingHelper.js';

function printState(slots, label, baseSlot = null) {
  console.log(`\n${label}:`);
  // 쌍 찾기
  const pairs = [];
  for (let i = 0; i < 32; i++) {
    const next = (i + 1) % 32;
    if (slots[i] !== null && slots[next] !== null) {
      pairs.push({ left: i, right: next });
    }
  }
  
  console.log(`  실 개수: ${slots.filter(c => c !== null).length}`);
  console.log(`  쌍: ${pairs.map(p => `{${p.left},${p.right}}`).join(', ')}`);
  if (baseSlot !== null) {
    const tr = baseSlot;
    const bl = (baseSlot + 16) % 32;
    console.log(`  현재 baseSlot: ${baseSlot}`);
    console.log(`  TR(slot ${tr}): ${slots[tr] || 'null'}, BL(slot ${bl}): ${slots[bl] || 'null'}`);
  }
  console.log(`  슬롯 상태 (실이 있는 슬롯만):`);
  slots.forEach((c, i) => {
    if (c) console.log(`    slot ${String(i).padStart(2, ' ')} (${String(i+1).padStart(2, ' ')}시 방향): ${c}`);
  });
}

// ===== 8-Thread 전체 상태 출력 =====
console.log('========================================');
console.log('      8-Thread 전체 자료구조');
console.log('========================================');

let slots = initializeKumihimoSlots(8, ['R','R','W','W','B','B','Y','Y']);
let base = 0;

printState(slots, '=== 초기 상태 ===', base);

// 4스텝 진행
for (let step = 1; step <= 4; step++) {
  const m = getNextKumihimoMove(slots, base, 8);
  
  const trColor = slots[m.topRightSource];
  const blColor = slots[m.bottomLeftSource];
  
  // Swap
  slots[m.topRightSource] = blColor;
  slots[m.bottomLeftSource] = trColor;
  
  base = m.nextBaseSlot;
  
  const pairLabel = step === 1 ? '첫' : step === 2 ? '두' : step === 3 ? '세' : '네';
  printState(slots, `=== ${pairLabel} 번째 땋기 후 (step ${step}, next base=${base}) ===`, base);
}

console.log('\n\n========================================');
console.log('      각 스텝별 이동 데이터');
console.log('========================================');

// 처음부터 다시
slots = initializeKumihimoSlots(8, ['R','R','W','W','B','B','Y','Y']);
base = 0;

for (let step = 1; step <= 4; step++) {
  const m = getNextKumihimoMove(slots, base, 8);
  console.log(`\nStep ${step} (base=${base}):`);
  console.log(`  topRightSource:   ${m.topRightSource} (${slots[m.topRightSource]})`);
  console.log(`  topRightDest:     ${m.topRightDest} (${slots[m.topRightDest] || 'null'})`);
  console.log(`  bottomLeftSource: ${m.bottomLeftSource} (${slots[m.bottomLeftSource]})`);
  console.log(`  bottomLeftDest:   ${m.bottomLeftDest} (${slots[m.bottomLeftDest] || 'null'})`);
  console.log(`  nextBaseSlot:     ${m.nextBaseSlot}`);
  
  // Swap 실행
  const tmp = slots[m.topRightSource];
  slots[m.topRightSource] = slots[m.bottomLeftSource];
  slots[m.bottomLeftSource] = tmp;
  base = m.nextBaseSlot;
}
