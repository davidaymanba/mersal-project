/**
 * Categorical slots for charts, in fixed order. Brand-derived (teal, terracotta, blue) and
 * checked with the data-viz validator on the white surface: lightness band, chroma floor,
 * adjacent CVD ΔE 12.2 (protan), normal-vision ΔE 26.6, contrast ≥ 3:1 — all pass.
 * Never cycle or extend: a fourth series folds into "Other" or a separate chart.
 */
export const SERIES_COLORS = ['#0e9f8e', '#e2643b', '#2a78d6'] as const;
