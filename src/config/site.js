/* Settings the plan viewer needs. Everything else about the site lives in
   Firestore (maps/<id>) and in constants.js. */

/** Maps JavaScript API key (same one the rest of the app uses). */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/** Optional Cloud-console Map ID. It must be a VECTOR map for the native
    tilt and 360° turn to work; on a raster ID (or none) those two are
    ignored and everything else — picking a plot, the raised block, the
    orbit around it — still works. */
export const GOOGLE_MAP_STYLE_ID = import.meta.env.VITE_GOOGLE_MAP_STYLE_ID || '';

/** How far past the plan's edge the drawing window may reach (metres),
    and the largest texture we will ask a browser for on any one side. */
export const PAD = 40;
export const MAX_SHEET = 4096;
