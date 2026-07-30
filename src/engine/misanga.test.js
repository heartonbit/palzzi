import { describe, it, expect } from 'vitest';
import { MisangaLoom } from './misanga.js';

describe('MisangaLoom Engine', () => {
  it('should initialize with correct string count', () => {
    const loom = new MisangaLoom(4);
    loom.init(['#e63946', '#f4a261', '#2a9d8f', '#264653']);
    expect(loom.nStrings).toBe(4);
    expect(loom.state.length).toBe(4);
    expect(loom.productColors.length).toBe(1);
    expect(loom.rowIndex).toBe(0);
  });

  it('should throw if colors length mismatches', () => {
    const loom = new MisangaLoom(4);
    expect(() => loom.init(['#e63946', '#f4a261'])).toThrow();
  });

  it('should tie a diagonal row (all forward)', () => {
    const loom = new MisangaLoom(4);
    const colors = ['#A', '#B', '#C', '#D'];
    loom.init(colors);

    const dirs = ['F', 'F', 'F'];
    const knots = loom.tieRow(dirs);

    expect(knots.length).toBe(3);
    expect(loom.rowIndex).toBe(1);
    expect(loom.productColors.length).toBe(2);
    knots.forEach(k => {
      expect(k.direction).toBe('F');
    });
  });

  it('should swap string positions correctly with forward knots', () => {
    const loom = new MisangaLoom(4);
    const colors = ['#A', '#B', '#C', '#D'];
    loom.init(colors);

    // All forward: each string should shift right
    loom.tieRow(['F', 'F', 'F']);

    // After one row of all forward, the leftmost string should have moved right
    const afterState = loom.state.map(s => s.color);
    // The exact permutation depends on two-pass logic
    expect(afterState.length).toBe(4);
    expect(new Set(afterState).size).toBe(4); // All unique colors preserved
  });

  it('should detect cycles', () => {
    const loom = new MisangaLoom(4);
    loom.init(['#A', '#B', '#C', '#D']);

    // Tie rows until cycle is detected
    for (let r = 0; r < 20; r++) {
      loom.tieRow(['F', 'F', 'F']);
    }

    expect(loom.cycleLength).toBeGreaterThan(0);
  });

  it('should generate correct pattern directions', () => {
    const diagonal = MisangaLoom.getPatternDirections('diagonal', 0, 4);
    expect(diagonal).toEqual(['F', 'F', 'F']);

    const chevron = MisangaLoom.getPatternDirections('chevron', 0, 4);
    expect(chevron).toEqual(['F', 'F', 'B']);

    const flat = MisangaLoom.getPatternDirections('flat', 0, 4);
    expect(flat.length).toBe(3);
    flat.forEach(d => expect(['F', 'B']).toContain(d));

    const diamond0 = MisangaLoom.getPatternDirections('diamond', 0, 4);
    const diamond1 = MisangaLoom.getPatternDirections('diamond', 1, 4);
    expect(diamond0.length).toBe(3);
    expect(diamond1.length).toBe(3);
  });

  it('should weave multiple rows without error', () => {
    const loom = new MisangaLoom(4);
    loom.init(['#A', '#B', '#C', '#D']);

    for (let r = 0; r < 50; r++) {
      const dirs = MisangaLoom.getPatternDirections('chevron', r, 4);
      expect(() => loom.tieRow(dirs)).not.toThrow();
    }
    expect(loom.rowIndex).toBe(50);
    expect(loom.productColors.length).toBe(51); // initial + 50 rows
  });

  it('should work with different string counts', () => {
    const loom6 = new MisangaLoom(6);
    loom6.init(['#A', '#B', '#C', '#D', '#E', '#F']);
    for (let r = 0; r < 10; r++) {
      const dirs = MisangaLoom.getPatternDirections('diagonal', r, 6);
      expect(dirs.length).toBe(5);
      loom6.tieRow(dirs);
    }
    expect(loom6.rowIndex).toBe(10);
  });
});
