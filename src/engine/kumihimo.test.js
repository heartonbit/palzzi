/**
 * Kumihimo Engine Tests
 */
const kumihimo = require('./kumihimo');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

// Test 1: Initialize 8-thread disk
console.log('\n--- Test 1: Initialize 8-thread disk ---');
const colors = ['#FF0000', '#FF4400', '#FF8800', '#FFCC00', '#FFFF00', '#88FF00', '#00FF00', '#00FFFF'];
const state = kumihimo.initDisk(colors);

assert(state.state.length === 32, 'Disk has 32 slots');
assert(state.nThreads === 8, '8 threads configured');
assert(state.stride === 8, 'Stride = 32/4 = 8');
assert(state.nPairs === 4, '4 pairs');

// Check initial positions - pairs at [0,1], [8,9], [16,17], [24,25]
assert(state.state[0] === '#FF0000', 'Slot 0 has color A');
assert(state.state[1] === '#FF4400', 'Slot 1 has color B');
assert(state.state[2] === null, 'Slot 2 is empty');
assert(state.state[8] === '#FF8800', 'Slot 8 has color C');
assert(state.state[9] === '#FFCC00', 'Slot 9 has color D');
assert(state.state[16] === '#FFFF00', 'Slot 16 has color E');
assert(state.state[17] === '#88FF00', 'Slot 17 has color F');
assert(state.state[24] === '#00FF00', 'Slot 24 has color G');
assert(state.state[25] === '#00FFFF', 'Slot 25 has color H');

// Test 2: Weave rows
console.log('\n--- Test 2: Weave rows ---');
for (let i = 0; i < 10; i++) {
  const row = kumihimo.weaveRow(state);
  assert(row !== null, `Row ${i} weaves successfully`);
  assert(row.length === 8, `Row ${i} has 8 thread colors`);
}
assert(state.product.length === 10, 'Product has 10 rows');

// Test 3: Snapshot and restore
console.log('\n--- Test 3: Snapshot and restore ---');
const snap = kumihimo.snapshot(state);
assert(snap.product.length === 10, 'Snapshot has 10 rows');
assert(snap.stepCount === 10, 'Snapshot step count is 10');

const freshState = kumihimo.initDisk(colors);
kumihimo.restore(freshState, snap);
assert(freshState.stepCount === 10, 'Restored state has 10 steps');
assert(freshState.product.length === 10, 'Restored product has 10 rows');

// Test 4: Export pattern chart
console.log('\n--- Test 4: Pattern chart ---');
const chart = kumihimo.getPatternChart(state);
assert(chart.length === 10, 'Chart has 10 rows');
assert(chart[0].length === 8, 'First row has 8 colors');

// Test 5: 4-thread disk
console.log('\n--- Test 5: 4-thread disk ---');
const colors4 = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
const state4 = kumihimo.initDisk(colors4);
assert(state4.stride === 16, 'Stride = 32/2 = 16');
assert(state4.nPairs === 2, '2 pairs');

// Test 6: 16-thread disk
console.log('\n--- Test 6: 16-thread disk ---');
const colors16 = Array.from({ length: 16 }, (_, i) => `#${(0x1000000 + i * 0x111111).toString(16).slice(1)}`);
const state16 = kumihimo.initDisk(colors16);
assert(state16.stride === 4, 'Stride = 32/8 = 4');
assert(state16.nPairs === 8, '8 pairs');

// Test 7: Error handling
console.log('\n--- Test 7: Error handling ---');
try {
  kumihimo.initDisk(['#FF0000', '#00FF00', '#0000FF']);
  assert(false, 'Should throw for odd thread count');
} catch (e) {
  assert(e.message.includes('even'), 'Odd thread count rejected');
}

try {
  kumihimo.initDisk(['#FF0000']);
  assert(false, 'Should throw for < 2 threads');
} catch (e) {
  assert(e.message.includes('between 2'), 'Low thread count rejected');
}

console.log('\n🎉 All tests passed!');
