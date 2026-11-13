import { PLOT_TONES } from './tokens';

/* The five sale states, in the order a plot moves through them.

   `doc` is what lands in Firestore (the same strings plotHelpers'
   normalizeStatus produces); `legacy` catches values saved before Token /
   Partial Payment existed. Colours are the app's own — the same ones
   plotHelpers.AC uses — so a plot means the same thing here as in the
   rest of the app.

   Available carries both: `tones` is the master plan's alternating tan,
   and `fill` is the pale paper an unsold plot takes in the status view,
   so unsold land reads as empty rather than as another shade of tan. */
export const STATUS = {
  available: {
    key: 'available', doc: 'Available', label: 'Available', legacy: [],
    tones: PLOT_TONES, fill: '#F2EDE1', dot: '#DFB694', ink: '#1A1208',
  },
  token: {
    key: 'token', doc: 'Token', label: 'Token', legacy: ['booked'],
    fill: '#E0A33C', dot: '#E0A33C', ink: '#1A1208',
  },
  partial: {
    key: 'partial', doc: 'Partial Payment', label: 'Partial Payment', legacy: ['reserved'],
    fill: '#C97A3C', dot: '#C97A3C', ink: '#FFFFFF',
  },
  agreement: {
    key: 'agreement', doc: 'Agreement', label: 'Agreement', legacy: [],
    fill: '#4F7A3B', dot: '#4F7A3B', ink: '#FFFFFF',
  },
  sold: {
    key: 'sold', doc: 'Sold', label: 'Sold', legacy: [],
    fill: '#A9543F', dot: '#A9543F', ink: '#FFFFFF',
  },
};

export const STATUS_KEYS = Object.keys(STATUS);

const LOOKUP = (() => {
  const m = new Map();
  STATUS_KEYS.forEach((k) => {
    const s = STATUS[k];
    m.set(k, k);
    m.set(s.doc.toLowerCase(), k);
    s.legacy.forEach((l) => m.set(l.toLowerCase(), k));
  });
  return m;
})();

/** Anything Firestore hands us → one of the five keys. */
export const statusKeyOf = (value) =>
  LOOKUP.get(String(value || '').trim().toLowerCase()) || 'available';

/** A key → the string the rest of the app reads back. */
export const statusDocValue = (key) => (STATUS[key] || STATUS.available).doc;

/** How many plots sit in each state, for the legend's counts. */
export const statusTally = (plots, status) => {
  const out = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  plots.forEach((p) => { out[statusKeyOf((status || {})[p.name])] += 1; });
  return out;
};
