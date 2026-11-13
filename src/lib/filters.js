import { is12mRoadPlot, normalizeStatus } from '../utils/plotHelpers';

/**
 * Filtering, kept away from the panel so the map and the search box can
 * ask the same question: does this plot match?
 *
 * applyFilters returns the same shape PlanMap takes for `matches` — a Set
 * of plot names, or null when nothing is filtered. Null and "everything
 * matches" are deliberately different: null means don't dim anything, an
 * empty Set means the filter found nothing.
 *
 * What gets filtered are layout features (see lib/buildLayout), so the
 * app's own plot object is read from `.doc`. Every field is read through
 * one of the accessors below — one place to fix when a field is renamed.
 */

export const SQM_PER_SQFT = 0.09290304;

const docOf = (f) => f.doc || f.data || f;

/* shoelace, in drawing metres, so a plot without a stored area still
   filters correctly rather than silently dropping out */
const polyArea = (pts) => {
  if (!pts || pts.length < 3) return null;
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

export const areaOf = (f) => {
  const n = Number(docOf(f).area);
  return Number.isFinite(n) && n > 0 ? n : polyArea(f.pts);
};

/* The app has no road-width field: plots next to a 12 m road are the
   fixed set in constants.js, everything else is 9 m. */
export const roadWidthOf = (f) => (is12mRoadPlot(docOf(f)) ? 12 : 9);

const FACINGS = {
  n: 'North', north: 'North',
  s: 'South', south: 'South',
  e: 'East', east: 'East',
  w: 'West', west: 'West',
  ne: 'North-East', northeast: 'North-East', 'north east': 'North-East',
  nw: 'North-West', northwest: 'North-West', 'north west': 'North-West',
  se: 'South-East', southeast: 'South-East', 'south east': 'South-East',
  sw: 'South-West', southwest: 'South-West', 'south west': 'South-West',
};

export const facingOf = (f) => {
  const raw = docOf(f).facing;
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ');
  return FACINGS[key] || FACINGS[key.replace(/\s+/g, '')] || null;
};

export const statusOf = (f) => normalizeStatus(docOf(f).status || '');

/* RL ("approval") status lives in the plot's contactPhone field. */
export const rlStatusOf = (f) => (
  String(docOf(f).contactPhone || '').trim().toLowerCase() === 'approved'
    ? 'Approved'
    : 'Not Approved'
);

/* ---------------------------------------------------------------
   the filter itself
--------------------------------------------------------------- */

export const AREA_UNITS = ['sq.m', 'sq.ft'];
export const FACING_OPTIONS = [
  'North', 'South', 'East', 'West',
  'North-East', 'North-West', 'South-East', 'South-West',
];
export const STATUS_OPTIONS = ['Available', 'Token', 'Partial Payment', 'Agreement', 'Sold'];
export const RL_OPTIONS = ['Approved', 'Not Approved'];

export const EMPTY_FILTERS = {
  unit: 'sq.m',
  min: '',
  max: '',
  road: 'All',
  facing: 'All',
  status: 'All',
  rl: 'All',
};

export const isEmpty = (f) => (
  f.min === '' && f.max === ''
  && f.road === 'All' && f.facing === 'All'
  && f.status === 'All' && f.rl === 'All'
);

/* Road widths present in the layout, ascending. */
export const roadWidthOptions = (plots) => (
  [...new Set(plots.map(roadWidthOf))].sort((a, b) => a - b)
);

const toSqm = (value, unit) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return unit === 'sq.ft' ? n * SQM_PER_SQFT : n;
};

export const matchesFilters = (plot, f) => {
  if (f.min !== '' || f.max !== '') {
    const a = areaOf(plot);
    if (a === null) return false;
    const lo = f.min !== '' ? toSqm(f.min, f.unit) : null;
    const hi = f.max !== '' ? toSqm(f.max, f.unit) : null;
    if (lo !== null && a < lo) return false;
    if (hi !== null && a > hi) return false;
  }
  if (f.road !== 'All' && roadWidthOf(plot) !== Number(f.road)) return false;
  if (f.facing !== 'All' && facingOf(plot) !== f.facing) return false;
  if (f.status !== 'All' && statusOf(plot) !== f.status) return false;
  if (f.rl !== 'All' && rlStatusOf(plot) !== f.rl) return false;
  return true;
};

/**
 * plots: the array behind layout.byName (plots only — roads and open
 * space are never in it, so they are not dimmed as non-matches).
 */
export const applyFilters = (plots, f) => {
  if (isEmpty(f)) return null;
  const out = new Set();
  for (const p of plots) if (matchesFilters(p, f)) out.add(p.name);
  return out;
};
