/**
 * Centralized braid preview configuration.
 * All rendering contexts (main simulator, sidebar, gallery, visdev) import from here
 * so that braid properties can be tuned from a single place.
 */

// ── Power-law scaling constants ──────────────────────────────────
// radius    = RADIUS_BASE × (nThreads / 8) ^ RADIUS_EXPONENT
// pitch     = radius × PITCH_RATIO × (nThreads / 8) ^ PITCH_EXPONENT × PITCH_MULTIPLIER
// vStretch  = VSTRETCH_BASE × (nThreads / 8) ^ VSTRETCH_EXPONENT
export const RADIUS_BASE      = 11.5;
export const RADIUS_EXPONENT  = 0.6;
export const PITCH_RATIO      = 0.1;
export const PITCH_EXPONENT   = 0.2;
export const PITCH_MULTIPLIER = 3;
export const VSTRETCH_BASE    = 0.8;
export const VSTRETCH_EXPONENT = 0.2;

// ── Strand width ─────────────────────────────────────────────────
export const STRAND_WIDTH = 8;

// ── Shared rendering constants ───────────────────────────────────
export const CULLING_RATIO  = 0.7;   // Cull segments behind  −radius × this
export const LIGHTING_MIN   = 0.52;  // Lighting floor
export const LIGHTING_RANGE = 0.48;  // Lighting dynamic range
export const MAX_STEPS      = 500;   // Default simulation length (rows)

// ── 3D Viewer defaults ───────────────────────────────────────────
export const D3_TUBE_RADIUS   = 0.10;  // Tube thickness
export const D3_PITCH_MULT    = 3;   // Braid Tightness, Row pitch multiplier (tubeR × this) 
export const D3_STEPS         = 200;   // Default weave steps to display
export const D3_OVER_UNDER    = 0.25;  // Over/under radial offset factor
export const D3_INTERP        = 8;     // Curve interpolation points between rows
export const D3_TUBE_SEG      = 12;    // Tube radial segments
export const D3_MAX_INIT_ATTEMPTS = 10;

// ── Per-context configurations ───────────────────────────────────
// strandWidthRatio: strand thickness as fraction of RADIUS_BASE (for scaled contexts)
// strandWidthMin  : clamp floor (px)
// strandWidthMax  : clamp ceiling (px)
export const BRAID_CONTEXTS = {
  main: {
    strandWidthRatio: 0.6,
    strandWidthMin:   5,
    strandWidthMax:   18,
  },
  sidebar: {
    strandWidthRatio: 0.5,
    strandWidthMin:   3,
    strandWidthMax:   7,
  },
  gallery: {
    strandWidthRatio: 0.6,
    strandWidthMin:   5,
    strandWidthMax:   12,
  },
};
