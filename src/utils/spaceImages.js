// // Open-space pictures on the masterplan.
// // Ported from PlanContent.jsx (placement maths unchanged) and adapted to this viewer's features.
// //
// // WHERE THE PICTURES COME FROM (first match wins):
// //   1. the open space's own `image` field in Firestore (a URL),
// //   2. OPEN_IMAGE_BY_NAME — by the space's title, e.g. "OPEN SPACE 1",
// //   3. OPEN_IMAGES — handed out in numeric order (OPEN SPACE 1, 2, 3 …), cycling.
// // Put the files in  public/assets/spaces/  (served as /assets/spaces/…).

// import { isAmenityPlot, isEssPlot, isOpenSpaceType, isStpPlot } from "./plotHelpers";

// export const OPEN_IMAGES = [
//   "/assets/spaces/space1.jpeg", // OPEN SPACE 1
//   "/assets/spaces/space2.jpeg", // OPEN SPACE 2
//   "/assets/spaces/space3.jpeg", // OPEN SPACE 3
// ];

// const OPEN_IMAGE_BY_NAME = {
//   "OPEN SPACE 1": OPEN_IMAGES[0],
//   "OPEN SPACE 2": OPEN_IMAGES[1],
//   "OPEN SPACE 3": OPEN_IMAGES[2],
// };

// /* AMENITY SPACES (clubhouse / amenity areas) have their own list — same rules as above:
//    the feature's own `image` field → AMENITY_IMAGE_BY_NAME (by title) → AMENITY_IMAGES in
//    numeric order, cycling. Point these at any files you like (they may reuse the open-space ones). */
// export const AMENITY_IMAGES = [
//   "/assets/spaces/amenity1.jpeg", // AMENITY SPACE 1
//   "/assets/spaces/amenity2.jpeg", // AMENITY SPACE 2
//   "/assets/spaces/amenity3.jpeg", // AMENITY SPACE 3
// ];

// const AMENITY_IMAGE_BY_NAME = {
//   "AMENITY SPACE 1": AMENITY_IMAGES[0],
//   "AMENITY SPACE 2": AMENITY_IMAGES[1],
//   "AMENITY SPACE 3": AMENITY_IMAGES[2],
// };

// /* Any feature whose label matches is treated as a space too (it only gets a picture
//    if one is configured for it — NMRDA land gets none). */
// const EXTRA_SPACE_WORDS = /nmrda/i;

// /* Spaces listed here use the picture's own proportions (width ÷ height). */
// const IMAGE_RATIO = { "OPEN SPACE 1": 3200 / 1370 };

// /* true → picture covers the whole space (clipped to its outline);
//    false → largest undistorted rectangle inside it. */
// const COVER_SPACE = { "OPEN SPACE 1": true };

// /* Force the picture's angle in degrees (0 = upright). */
// const LOCK_ANGLE = {
//   // "OPEN SPACE 1": 0,
// };

// /* Nudge the final angle by a few degrees. */
// const ROTATION_ADJUST = { "OPEN SPACE 1": 0 };

// /* Spaces NOT in IMAGE_RATIO fill their shape; nudge their tilt here. */
// const TILT_ADJUST = { "OPEN SPACE 2": 0, "OPEN SPACE 3": 0 };

// const MIN_IMAGE_AREA = 100; // m² — smaller spaces get no picture

// /* ── geometry helpers ─────────────────────────────────────────────────── */

// // point-in-polygon (ray casting)
// function pip(x, y, poly) {
//   let inside = false;
//   for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
//     const xi = poly[i][0], yi = poly[i][1];
//     const xj = poly[j][0], yj = poly[j][1];
//     if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
//   }
//   return inside;
// }

// // does a w×h rectangle centred on (cx,cy), turned by (c,s), sit fully inside the polygon?
// function rectFits(poly, cx, cy, w, h, c, s) {
//   const S = 5;
//   for (let k = 0; k <= S; k++) {
//     const t = k / S;
//     const pts = [
//       [-w / 2 + t * w, -h / 2],
//       [-w / 2 + t * w, h / 2],
//       [-w / 2, -h / 2 + t * h],
//       [w / 2, -h / 2 + t * h],
//     ];
//     for (const [lx, ly] of pts) {
//       if (!pip(cx + lx * c - ly * s, cy + lx * s + ly * c, poly)) return false;
//     }
//   }
//   // no corner of the polygon may poke into the rectangle
//   for (const p of poly) {
//     const dx = p[0] - cx, dy = p[1] - cy;
//     const lx = dx * c + dy * s;
//     const ly = -dx * s + dy * c;
//     if (Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2) return false;
//   }
//   return true;
// }

// /* Largest rectangle of a given width÷height that fits inside the polygon. Tries the
//    directions of the longest edges (and their perpendiculars) so the picture lines up. */
// function bestRect(pts, ratio, lockDeg) {
//   const xs = pts.map((p) => p[0]);
//   const ys = pts.map((p) => p[1]);
//   const minX = Math.min(...xs), maxX = Math.max(...xs);
//   const minY = Math.min(...ys), maxY = Math.max(...ys);
//   const bw = maxX - minX, bh = maxY - minY;

//   let thetas;
//   if (lockDeg != null) {
//     thetas = [(lockDeg * Math.PI) / 180];
//   } else {
//     const edges = [];
//     for (let i = 0; i < pts.length; i++) {
//       const a = pts[i], b = pts[(i + 1) % pts.length];
//       let deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
//       deg = ((deg % 180) + 180) % 180;
//       edges.push({ len: Math.hypot(b[0] - a[0], b[1] - a[1]), deg });
//     }
//     edges.sort((p, q) => q.len - p.len);
//     const degs = [];
//     for (const e of edges) {
//       if (degs.length >= 3) break;
//       if (!degs.some((d) => Math.abs((((d - e.deg + 90) % 180) + 180) % 180 - 90) < 2)) degs.push(e.deg);
//     }
//     thetas = degs.flatMap((d) => [d, d + 90]).map((d) => (d * Math.PI) / 180);
//   }

//   const G = 9;
//   let best = { w: 0 };
//   for (const th of thetas) {
//     const c = Math.cos(th), s = Math.sin(th);
//     for (let gi = 0; gi < G; gi++) {
//       for (let gj = 0; gj < G; gj++) {
//         const cx = minX + ((gi + 0.5) / G) * bw;
//         const cy = minY + ((gj + 0.5) / G) * bh;
//         if (!pip(cx, cy, pts)) continue;
//         if (best.w && !rectFits(pts, cx, cy, best.w * 1.01, (best.w * 1.01) / ratio, c, s)) continue;
//         let lo = best.w || 0;
//         let hi = Math.max(bw, bh) * 1.2;
//         for (let it = 0; it < 8; it++) {
//           const mid = (lo + hi) / 2;
//           if (rectFits(pts, cx, cy, mid, mid / ratio, c, s)) lo = mid; else hi = mid;
//         }
//         if (lo > best.w) best = { w: lo, cx, cy, th };
//       }
//     }
//   }
//   if (!best.w) return null;

//   const w = best.w * 0.985; // a hair smaller so the edge never touches the outline
//   let deg = (best.th * 180) / Math.PI;
//   while (deg > 90) deg -= 180;
//   while (deg <= -90) deg += 180;
//   return { cx: best.cx, cy: best.cy, w, h: w / ratio, deg };
// }

// /* The rectangle, turned by `deg`, that covers the WHOLE polygon. */
// function coverRect(pts, deg) {
//   const rad = (deg * Math.PI) / 180;
//   const c = Math.cos(rad), s = Math.sin(rad);
//   let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
//   for (const p of pts) {
//     const lx = p[0] * c + p[1] * s;
//     const ly = -p[0] * s + p[1] * c;
//     if (lx < minX) minX = lx;
//     if (lx > maxX) maxX = lx;
//     if (ly < minY) minY = ly;
//     if (ly > maxY) maxY = ly;
//   }
//   const mx = (minX + maxX) / 2;
//   const my = (minY + maxY) / 2;
//   return { cx: mx * c - my * s, cy: mx * s + my * c, w: maxX - minX, h: maxY - minY, deg };
// }

// /* Smallest tilted rectangle that covers the polygon (spaces that fill their shape). */
// function orientedBox(pts) {
//   let best = null;
//   for (let i = 0; i < pts.length; i++) {
//     const a = pts[i];
//     const b = pts[(i + 1) % pts.length];
//     const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
//     const c = Math.cos(-th), s = Math.sin(-th);
//     let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
//     for (const p of pts) {
//       const rx = p[0] * c - p[1] * s;
//       const ry = p[0] * s + p[1] * c;
//       if (rx < minX) minX = rx;
//       if (rx > maxX) maxX = rx;
//       if (ry < minY) minY = ry;
//       if (ry > maxY) maxY = ry;
//     }
//     const w = maxX - minX, h = maxY - minY;
//     if (!best || w * h < best.area) best = { area: w * h, th, w, h, minX, minY };
//   }
//   const mx = best.minX + best.w / 2;
//   const my = best.minY + best.h / 2;
//   const c = Math.cos(best.th), s = Math.sin(best.th);
//   let deg = (best.th * 180) / Math.PI;
//   while (deg > 90) deg -= 180;
//   while (deg <= -90) deg += 180;
//   return { cx: mx * c - my * s, cy: mx * s + my * c, w: best.w, h: best.h, deg };
// }

// const polyArea = (pts) => {
//   let a = 0;
//   for (let i = 0; i < pts.length; i++) {
//     const [x1, y1] = pts[i];
//     const [x2, y2] = pts[(i + 1) % pts.length];
//     a += x1 * y2 - x2 * y1;
//   }
//   return Math.abs(a) / 2;
// };

// const labelOf = (f) => String(f.raw.title || "").trim();

// const drawable = (f) => f.pts && f.pts.length >= 3 && f.raw.type !== "plot" && f.raw.type !== "road";

// // open spaces / gardens (amenity and utility areas are NOT in this group)
// const isSpace = (f) => {
//   if (!drawable(f)) return false;
//   const p = f.raw;
//   if (isAmenityPlot(p) || isEssPlot(p) || isStpPlot(p)) return false;
//   return isOpenSpaceType(p) || /open\s*space/i.test(labelOf(f)) || EXTRA_SPACE_WORDS.test(labelOf(f));
// };

// // amenity spaces (clubhouse etc.) — utility areas (ESS / STP) still get no picture
// const isAmenity = (f) => drawable(f) && isAmenityPlot(f.raw) && !isEssPlot(f.raw) && !isStpPlot(f.raw);

// // "OPEN SPACE 2" → 2. Spaces with no number (like the NMRDA land) go last.
// const numOf = (f) => {
//   const m = labelOf(f).match(/\d+/);
//   return m ? parseInt(m[0], 10) : 999;
// };

// // "Open  Space 1" / "aminity space 2" → upper-case, single spaces, so title lookups are forgiving
// const keyOf = (f) => labelOf(f).toUpperCase().replace(/\s+/g, " ");

// function place(list, images, byName) {
//   return list
//     .map((f, idx) => {
//       const area = f.raw.area > 0 ? f.raw.area : polyArea(f.pts);
//       if (area < MIN_IMAGE_AREA) return null;

//       const nameKey = keyOf(f);
//       const isNmrda = EXTRA_SPACE_WORDS.test(nameKey);
//       const src =
//         f.raw.image ||
//         byName[nameKey] ||
//         (isNmrda || !images.length ? null : images[idx % images.length]);
//       if (!src) return null;

//       const base = { id: String(f.rk).replace(/[^a-zA-Z0-9_-]/g, "_"), src, d: f.d, raw: f.raw };

//       // picture placed by its own proportions (e.g. OPEN SPACE 1)
//       const ratio = IMAGE_RATIO[nameKey];
//       if (ratio) {
//         const p = bestRect(f.pts, ratio, LOCK_ANGLE[nameKey]);
//         if (p) {
//           const deg = p.deg + (ROTATION_ADJUST[nameKey] || 0);
//           if (COVER_SPACE[nameKey]) return { ...base, mode: "cover", r: coverRect(f.pts, deg) };
//           return { ...base, mode: "fit", p: { ...p, deg } };
//         }
//       }

//       // fill the shape, clipped to it
//       const box = orientedBox(f.pts);
//       return { ...base, mode: "fill", box, tilt: box.deg + (TILT_ADJUST[nameKey] || 0) };
//     })
//     .filter(Boolean);
// }

// /**
//  * Works out where each picture goes. Runs once per layout.
//  * @param features  layout features: { rk, pts, d, raw }
//  * @returns [{ id, src, d, raw, mode: 'cover'|'fit'|'fill', ... }]
//  */
// export function buildSpaceImages(features) {
//   const byNum = (a, b) => numOf(a) - numOf(b);
//   return [
//     ...place(features.filter(isSpace).sort(byNum), OPEN_IMAGES, OPEN_IMAGE_BY_NAME),
//     ...place(features.filter(isAmenity).sort(byNum), AMENITY_IMAGES, AMENITY_IMAGE_BY_NAME),
//   ];
// }


// Open-space / amenity pictures on the masterplan.
//
// ONE picture for everything: public/grass.png.
// Every open space and every amenity area is filled with it (clipped to its outline, tilted to
// follow the shape). Per-space pictures, name lookups and the Firestore `image` field are no
// longer used.

import { isAmenityPlot, isEssPlot, isOpenSpaceType, isStpPlot } from "./plotHelpers";

// public/grass.png → served from the site root (BASE_URL keeps it right under a sub-path deploy)
export const GRASS_IMAGE = `${import.meta.env.BASE_URL}assets/spaces/grass.jpg`;

/* NMRDA land is treated as a space too, but it is not a garden: set to false to give it grass as well. */
const SKIP_NMRDA = true;
const NMRDA = /nmrda/i;

const MIN_IMAGE_AREA = 100; // m² — smaller spaces get no picture

/* ── geometry helpers ─────────────────────────────────────────────────── */

/* Smallest tilted rectangle that covers the polygon, so the picture follows the shape's angle. */
function orientedBox(pts) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(-th), s = Math.sin(-th);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      const rx = p[0] * c - p[1] * s;
      const ry = p[0] * s + p[1] * c;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    const w = maxX - minX, h = maxY - minY;
    if (!best || w * h < best.area) best = { area: w * h, th, w, h, minX, minY };
  }
  const mx = best.minX + best.w / 2;
  const my = best.minY + best.h / 2;
  const c = Math.cos(best.th), s = Math.sin(best.th);
  let deg = (best.th * 180) / Math.PI;
  while (deg > 90) deg -= 180;
  while (deg <= -90) deg += 180;
  return { cx: mx * c - my * s, cy: mx * s + my * c, w: best.w, h: best.h, deg };
}

const polyArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

const labelOf = (f) => String(f.raw.title || "").trim();

const drawable = (f) => f.pts && f.pts.length >= 3 && f.raw.type !== "plot" && f.raw.type !== "road";

// open spaces / gardens (amenity and utility areas are NOT in this group)
const isSpace = (f) => {
  if (!drawable(f)) return false;
  const p = f.raw;
  if (isAmenityPlot(p) || isEssPlot(p) || isStpPlot(p)) return false;
  return isOpenSpaceType(p) || /open\s*space/i.test(labelOf(f)) || NMRDA.test(labelOf(f));
};

// amenity spaces (clubhouse etc.) — utility areas (ESS / STP) still get no picture
const isAmenity = (f) => drawable(f) && isAmenityPlot(f.raw) && !isEssPlot(f.raw) && !isStpPlot(f.raw);

/**
 * Works out where the picture goes on every open space and amenity. Runs once per layout.
 * @param features  layout features: { rk, pts, d, raw }
 * @returns [{ id, src, d, raw, mode: 'fill', box, tilt }]
 */
export function buildSpaceImages(features) {
  return features
    .filter((f) => isSpace(f) || isAmenity(f))
    .map((f) => {
      const area = f.raw.area > 0 ? f.raw.area : polyArea(f.pts);
      if (area < MIN_IMAGE_AREA) return null;
      if (SKIP_NMRDA && NMRDA.test(labelOf(f))) return null;

      const box = orientedBox(f.pts);
      return {
        id: String(f.rk).replace(/[^a-zA-Z0-9_-]/g, "_"),
        src: GRASS_IMAGE,
        d: f.d,
        raw: f.raw,
        mode: "fill", // fill the shape, clipped to its outline
        box,
        tilt: box.deg,
      };
    })
    .filter(Boolean);
}