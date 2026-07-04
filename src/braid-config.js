/**
 * Centralized braid preview configuration.
 * All rendering contexts (main simulator, sidebar, gallery) import from here
 * so that braid properties can be tuned from a single place.
 */

// ── Power-law scaling constants ──────────────────────────────────
// radius  = baseRadius × (nThreads / 8) ^ RADIUS_EXPONENT
// pitch   = radius × PITCH_RATIO × (nThreads / 8) ^ PITCH_EXPONENT
export const RADIUS_EXPONENT = 0.70;
export const PITCH_RATIO     = 0.15;
export const PITCH_EXPONENT  = 0.30;

// ── Shared rendering constants ───────────────────────────────────
export const CULLING_RATIO  = 0.7;   // Cull segments behind  −radius × this
export const LIGHTING_MIN   = 0.52;  // Lighting floor
export const LIGHTING_RANGE = 0.48;  // Lighting dynamic range
export const MAX_STEPS      = 500; // Default simulation length (rows)

// ── Per-context configurations ───────────────────────────────────
// baseRadius      : cylinder radius for 8 threads (px)
// strandWidthRatio: strand thickness as fraction of baseRadius
// strandWidthMin  : clamp floor (px)
// strandWidthMax  : clamp ceiling (px)
export const BRAID_CONTEXTS = {
  main: {
    baseRadius:       7.5,
    strandWidthRatio: 0.6,
    strandWidthMin:   5,
    strandWidthMax:   18,
  },
  sidebar: {
    baseRadius:       7.5,
    strandWidthRatio: 0.5,
    strandWidthMin:   3,
    strandWidthMax:   7,
  },
  gallery: {
    baseRadius:       7.5,
    strandWidthRatio: 0.6,
    strandWidthMin:   5,
    strandWidthMax:   12,
  },
};
