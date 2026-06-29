import { describe, it, expect } from 'vitest';
import { KumihimoDisk } from './kumihimo.js';

describe('KumihimoDisk Sim Engine', () => {
  it('should initialize with correct thread count and spacing', () => {
    const disk = new KumihimoDisk(8);
    const colors = ['red', 'blue', 'green', 'yellow', 'cyan', 'magenta', 'orange', 'purple'];
    
    disk.init(colors);
    
    // Check initial slot setup for 8 threads:
    // Pairs at (0, 1), (8, 9), (16, 17), (24, 25)
    expect(disk.state[0].color).toBe('red');
    expect(disk.state[1].color).toBe('blue');
    expect(disk.state[8].color).toBe('green');
    expect(disk.state[9].color).toBe('yellow');
    expect(disk.state[16].color).toBe('cyan');
    expect(disk.state[17].color).toBe('magenta');
    expect(disk.state[24].color).toBe('orange');
    expect(disk.state[25].color).toBe('purple');
    
    // Check other slots are empty
    for (let i = 0; i < 32; i++) {
      if ([0, 1, 8, 9, 16, 17, 24, 25].indexOf(i) === -1) {
        expect(disk.state[i]).toBeNull();
      }
    }
  });

  it('should weave multiple rows without collision or empty slot errors for 8 threads', () => {
    const disk = new KumihimoDisk(8);
    const colors = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8'];
    disk.init(colors);

    // Let's weave 50 rows to prove long-term stability
    expect(() => {
      for (let i = 0; i < 50; i++) {
        const row = disk.weaveRow();
        // For 8 threads, repeatCount = nPairs / 2 = 4 / 2 = 2.
        // In each step, we get 1 top and 1 bottom, so we repeat 2 times.
        // Thus, we get 2 tops and 2 bottoms = total 4 threads are crossed!
        // So row.length = 4.
        expect(row.length).toBe(4);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(50);
  });

  it('should handle 4 threads correctly', () => {
    const disk = new KumihimoDisk(4);
    const colors = ['#1', '#2', '#3', '#4'];
    disk.init(colors);

    // nPairs = 2, distance = 16, repeatCount = max(1, 1) = 1.
    // In each row, 1 top and 1 bottom = total 2 threads cross.
    expect(() => {
      for (let i = 0; i < 20; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(2);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(20);
  });

  it('should handle 16 threads correctly', () => {
    const disk = new KumihimoDisk(16);
    const colors = Array.from({ length: 16 }, (_, i) => `#C${i}`);
    disk.init(colors);

    // nPairs = 8, distance = 4, repeatCount = 4.
    // In each row, 4 tops + 4 bottoms = total 8 threads cross.
    expect(() => {
      for (let i = 0; i < 30; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(8);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(30);
  });

  it('should handle 20 threads correctly (fractional distance = 3.2)', () => {
    const disk = new KumihimoDisk(20);
    const colors = Array.from({ length: 20 }, (_, i) => `#C${i}`);
    disk.init(colors);

    // repeatCount = 10 / 2 = 5.
    // In each row, 5 tops + 5 bottoms = total 10 threads cross.
    expect(() => {
      for (let i = 0; i < 30; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(10);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(30);
  });

  it('should handle 24 threads correctly (fractional distance = 2.67)', () => {
    const disk = new KumihimoDisk(24);
    const colors = Array.from({ length: 24 }, (_, i) => `#C${i}`);
    disk.init(colors);

    // repeatCount = 12 / 2 = 6.
    // In each row, 6 tops + 6 bottoms = total 12 threads cross.
    expect(() => {
      for (let i = 0; i < 30; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(12);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(30);
  });

  it('should handle 28 threads correctly (fractional distance = 2.29)', () => {
    const disk = new KumihimoDisk(28);
    const colors = Array.from({ length: 28 }, (_, i) => `#C${i}`);
    disk.init(colors);

    // repeatCount = 14 / 2 = 7.
    // In each row, 7 tops + 7 bottoms = total 14 threads cross.
    expect(() => {
      for (let i = 0; i < 30; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(14);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(30);
  });

  it('should handle 32 threads correctly (max limit, scales dynamically to 64 slots)', () => {
    const disk = new KumihimoDisk(32);
    const colors = Array.from({ length: 32 }, (_, i) => `#C${i}`);
    disk.init(colors);

    // repeatCount = 16 / 2 = 8.
    // In each row, 8 tops + 8 bottoms = total 16 threads cross.
    expect(() => {
      for (let i = 0; i < 30; i++) {
        const row = disk.weaveRow();
        expect(row.length).toBe(16);
      }
    }).not.toThrow();

    expect(disk.product.length).toBe(30);
  });
});
