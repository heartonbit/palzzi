import { initializeKumihimoSlots, getNextKumihimoMove } from './weavingHelper.js';

function printSlots(slots, label) {
  console.log(`\n${label}:`);
  const active = [];
  slots.forEach((c, i) => { if (c) active.push(`  slot ${String(i).padStart(2,' ')}: ${c}`); });
  console.log(active.join('\n'));
}

console.log('========================================');
console.log('         초기화 테스트');
console.log('========================================');

console.log('\n--- 4-Thread (R,R,W,W) ---');
console.log('기대: {31,0}=R,R, {15,16}=W,W');
let s4 = initializeKumihimoSlots(4, ['R','R','W','W']);
// 쌍 검증: {31,0}, {15,16}
console.assert(s4[31] === 'R' && s4[0] === 'R', '북쪽 쌍(31,0) 실패');
console.assert(s4[15] === 'W' && s4[16] === 'W', '남쪽 쌍(15,16) 실패');
console.assert(s4.filter(c => c !== null).length === 4, '실 개수 불일치');
printSlots(s4, '결과');

console.log('\n--- 6-Thread (R,R,W,W,B,B) ---');
console.log('기대: {31,0}=R,R, {9,10}=W,W, {19,20}=B,B');
let s6 = initializeKumihimoSlots(6, ['R','R','W','W','B','B']);
console.assert(s6[31] === 'R' && s6[0] === 'R', '쌍0(31,0) 실패');
console.assert(s6[9] === 'W' && s6[10] === 'W', '쌍1(9,10) 실패');
console.assert(s6[19] === 'B' && s6[20] === 'B', '쌍2(19,20) 실패');
console.assert(s6.filter(c => c !== null).length === 6, '실 개수 불일치');
printSlots(s6, '결과');

console.log('\n--- 8-Thread (R,R,W,W,B,B,Y,Y) ---');
console.log('기대: {31,0}=R,R, {7,8}=W,W, {15,16}=B,B, {23,24}=Y,Y');
let s8 = initializeKumihimoSlots(8, ['R','R','W','W','B','B','Y','Y']);
console.assert(s8[31] === 'R' && s8[0] === 'R', '쌍0(31,0) 실패');
console.assert(s8[7] === 'W' && s8[8] === 'W', '쌍1(7,8) 실패');
console.assert(s8[15] === 'B' && s8[16] === 'B', '쌍2(15,16) 실패');
console.assert(s8[23] === 'Y' && s8[24] === 'Y', '쌍3(23,24) 실패');
console.assert(s8.filter(c => c !== null).length === 8, '실 개수 불일치');
printSlots(s8, '결과');

console.log('\n--- 12-Thread (R,R,W,W,B,B,Y,Y,G,G,P,P) ---');
console.log('기대: {31,0}=R,R, {4,5}=W,W, {9,10}=B,B, {14,15}=Y,Y, {19,20}=G,G, {24,25}=P,P');
let s12 = initializeKumihimoSlots(12, ['R','R','W','W','B','B','Y','Y','G','G','P','P']);
console.assert(s12[31] === 'R' && s12[0] === 'R', '쌍0(31,0) 실패');
console.assert(s12[4] === 'W' && s12[5] === 'W', '쌍1(4,5) 실패');
console.assert(s12[9] === 'B' && s12[10] === 'B', '쌍2(9,10) 실패');
console.assert(s12[14] === 'Y' && s12[15] === 'Y', '쌍3(14,15) 실패');
console.assert(s12[19] === 'G' && s12[20] === 'G', '쌍4(19,20) 실패');
console.assert(s12[24] === 'P' && s12[25] === 'P', '쌍5(24,25) 실패');
console.assert(s12.filter(c => c !== null).length === 12, '실 개수 불일치');
printSlots(s12, '결과');

console.log('\n--- 16-Thread (R,R,W,W,B,B,Y,Y,G,G,P,P,O,O,C,C) ---');
let s16 = initializeKumihimoSlots(16, ['R','R','W','W','B','B','Y','Y','G','G','P','P','O','O','C','C']);
console.assert(s16[31] === 'R' && s16[0] === 'R', '쌍0(31,0) 실패');
console.assert(s16[3] === 'W' && s16[4] === 'W', '쌍1(3,4) 실패');
console.assert(s16[7] === 'B' && s16[8] === 'B', '쌍2(7,8) 실패');
console.assert(s16[11] === 'Y' && s16[12] === 'Y', '쌍3(11,12) 실패');
console.assert(s16[15] === 'G' && s16[16] === 'G', '쌍4(15,16) 실패');
console.assert(s16[19] === 'P' && s16[20] === 'P', '쌍5(19,20) 실패');
console.assert(s16[23] === 'O' && s16[24] === 'O', '쌍6(23,24) 실패');
console.assert(s16[27] === 'C' && s16[28] === 'C', '쌍7(27,28) 실패');
console.assert(s16.filter(c => c !== null).length === 16, '실 개수 불일치');
printSlots(s16, '결과');

console.log('\n========================================');
console.log('         땋기 동작 테스트 (SWAP)');
console.log('========================================');

console.log('\n--- 4-Thread: 2스텝 사이클 ---');
let t4 = initializeKumihimoSlots(4, ['R1','R2','W1','W2']);
let b4 = 0;
for (let step = 1; step <= 2; step++) {
  const m = getNextKumihimoMove(t4, b4, 4);
  console.log(`\nStep ${step} (base=${b4}):`);
  console.log(`  TR slot ${m.topRightSource}(${t4[m.topRightSource]}) ↔ BL slot ${m.bottomLeftSource}(${t4[m.bottomLeftSource]})`);
  const tmp = t4[m.topRightSource];
  t4[m.topRightSource] = t4[m.bottomLeftSource];
  t4[m.bottomLeftSource] = tmp;
  b4 = m.nextBaseSlot;
  const active = t4.map((c,i) => c ? `s${i}:${c}` : null).filter(Boolean);
  console.log(`  결과: ${active.join(', ')}`);
}
console.assert(t4.filter(c => c !== null).length === 4, '4-Thread: 실 소실 발생!');
console.log('\n✅ 4-Thread: 4개 실 유지됨');

console.log('\n--- 8-Thread: 8스텝 (2사이클) ---');
let t8 = initializeKumihimoSlots(8, ['R1','R2','W1','W2','B1','B2','Y1','Y2']);
let b8 = 0;
for (let step = 1; step <= 8; step++) {
  const m = getNextKumihimoMove(t8, b8, 8);
  console.log(`Step ${step} (base=${b8}): TR(s${m.topRightSource}=${t8[m.topRightSource]}) ↔ BL(s${m.bottomLeftSource}=${t8[m.bottomLeftSource]})`);
  const tmp = t8[m.topRightSource];
  t8[m.topRightSource] = t8[m.bottomLeftSource];
  t8[m.bottomLeftSource] = tmp;
  b8 = m.nextBaseSlot;
}
console.assert(t8.filter(c => c !== null).length === 8, '8-Thread: 실 소실 발생!');
console.log('✅ 8-Thread: 8개 실 유지됨');

console.log('\n--- 16-Thread: 8스텝 ---');
let t16 = initializeKumihimoSlots(16, ['R1','R2','W1','W2','B1','B2','Y1','Y2','G1','G2','P1','P2','O1','O2','C1','C2']);
let b16 = 0;
for (let step = 1; step <= 8; step++) {
  const m = getNextKumihimoMove(t16, b16, 16);
  console.log(`Step ${step} (base=${b16}): TR(s${m.topRightSource}=${t16[m.topRightSource]}) ↔ BL(s${m.bottomLeftSource}=${t16[m.bottomLeftSource]})`);
  const tmp = t16[m.topRightSource];
  t16[m.topRightSource] = t16[m.bottomLeftSource];
  t16[m.bottomLeftSource] = tmp;
  b16 = m.nextBaseSlot;
}
console.assert(t16.filter(c => c !== null).length === 16, '16-Thread: 실 소실 발생!');
console.log('✅ 16-Thread: 16개 실 유지됨');

console.log('\n========================================');
console.log('         사이클 복원 테스트');
console.log('========================================');

// 8-Thread: 4스텝 후 원래 상태로 돌아오는지
let tc = initializeKumihimoSlots(8, ['R','R','W','W','B','B','Y','Y']);
let bc = 0;
const original = [...tc];
for (let step = 1; step <= 4; step++) {
  const m = getNextKumihimoMove(tc, bc, 8);
  const tmp = tc[m.topRightSource];
  tc[m.topRightSource] = tc[m.bottomLeftSource];
  tc[m.bottomLeftSource] = tmp;
  bc = m.nextBaseSlot;
}
const backToOriginal = tc.every((c, i) => c === original[i]);
console.assert(backToOriginal, '8-Thread: 4스텝 후 원래 상태로 복원되지 않음');
console.log(`✅ 8-Thread: 4스텝 사이클 후 원래 상태 복원: ${backToOriginal}`);

console.log('\n========================================');
console.log('         모든 테스트 완료!');
console.log('========================================');
