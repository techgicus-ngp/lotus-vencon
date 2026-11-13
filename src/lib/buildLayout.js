import { makeFrame } from './geo';
import {
  centroid, edgeLengths, inradiusAt, longestEdgeAngle, polygonArea,
} from './geometry';
import { statusKeyOf } from '../theme/status';
import {
  isAmenityPlot, isStpPlot, isEssPlot, isOpenSpaceType,
} from '../utils/plotHelpers';

/* The app's own `type` values (and the title-based amenity rule) mapped
   to the land uses the plan knows how to draw. */
export const kindOf = (p) => {
  if (p.type === 'road') return 'road';
  if (isAmenityPlot(p)) return 'amenity';
  if (isStpPlot(p) || isEssPlot(p)) return 'utility';
  if (isOpenSpaceType(p)) return 'open_space';
  return 'plot';
};

/* roads first, plots last, so a plot's border always wins the edge */
export const DRAW_ORDER = {
  road: 0, htl: 1, open_space: 2, amenity: 3, utility: 4, plot: 5,
};

/**
 * The app's plot objects (models/plot.js) → the drawable plan.
 *
 * The plots already carry real lat/lng corners, so one metre frame
 * anchored at the middle of the layout turns every corner into plain
 * metres (x east, y south), and every stroke, number and dimension is
 * then sized on the ground rather than in screen pixels.
 *
 * `name` is the key everything downstream uses (selection, match sets,
 * the status map). It is made unique among plots, because two plots
 * sharing a number would otherwise collapse into one entry; `label` is
 * what is printed.
 */
export function buildLayout(docs, mapMeta = {}) {
  const usable = docs.filter((p) => Array.isArray(p.corners) && p.corners.length >= 3);
  if (!usable.length) return null;

  let latSum = 0;
  let lngSum = 0;
  let n = 0;
  usable.forEach((p) => p.corners.forEach((c) => {
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      latSum += c.lat; lngSum += c.lng; n += 1;
    }
  }));
  if (!n) return null;

  const frame = makeFrame(latSum / n, lngSum / n);
  const usedNames = new Set();

  const features = usable.map((p, i) => {
    const pts = p.corners.map((c) => frame.toDraw(c.lat, c.lng));
    const c = centroid(pts);
    const lp = p.labelPosition ? frame.toDraw(p.labelPosition.lat, p.labelPosition.lng) : c;
    const kind = kindOf(p);

    const base = String(p.plotNo || p.title || p.srNo || i + 1);
    let name = base;
    if (kind === 'plot') {
      if (usedNames.has(name)) name = `${base} (${p.srNo || i})`;
      while (usedNames.has(name)) name += '*';
      usedNames.add(name);
    }

    return {
      i,
      docId: p.firestoreId,
      kind,
      name,
      label: base,
      title: p.title || '',
      pts,
      sides: edgeLengths(pts),
      c,
      lp,
      ir: inradiusAt(pts, lp),
      angle: longestEdgeAngle(pts),
      area: p.area > 0 ? p.area : polygonArea(pts),
      statusKey: statusKeyOf(p.status),
      doc: p,
    };
  });

  const plots = features.filter((f) => f.kind === 'plot');
  const xs = features.flatMap((f) => f.pts.map((q) => q[0]));
  const ys = features.flatMap((f) => f.pts.map((q) => q[1]));
  const bounds = {
    x0: Math.min(...xs), y0: Math.min(...ys),
    x1: Math.max(...xs), y1: Math.max(...ys),
  };

  /* The site's outer edge (mapMeta.layoutBoundary, {lat, lng} points),
     run through the same frame as every plot corner. Null when the map
     has none. */
  const rawBoundary = Array.isArray(mapMeta.layoutBoundary) ? mapMeta.layoutBoundary : null;
  const layoutBoundary = rawBoundary
    ? rawBoundary
      .map((c) => ({ lat: Number(c?.lat), lng: Number(c?.lng) }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
      .map((c) => frame.toDraw(c.lat, c.lng))
    : null;

  return {
    frame,
    features,
    plots,
    sorted: [...features].sort((a, b) => DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind]),
    byName: new Map(plots.map((f) => [f.name, f])),
    bounds,
    layoutBoundary,
    meta: {
      title: mapMeta.title || mapMeta.name || 'Plot layout',
      w: bounds.x1 - bounds.x0,
      h: bounds.y1 - bounds.y0,
    },
    areaMin: plots.length ? Math.min(...plots.map((p) => p.area)) : 0,
    areaMax: plots.length ? Math.max(...plots.map((p) => p.area)) : 0,
    toLL: (x, y) => frame.toLL(x, y),
    toDraw: (lat, lng) => frame.toDraw(lat, lng),
  };
}
