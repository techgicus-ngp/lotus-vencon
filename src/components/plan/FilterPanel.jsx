import React, { useMemo, useState } from 'react';

import {
  EMPTY_FILTERS, FACING_OPTIONS, RL_OPTIONS, STATUS_OPTIONS, AREA_UNITS,
  applyFilters, isEmpty, roadWidthOptions,
} from '../../lib/filters';
import { MONO, SANS } from '../../theme/tokens';

/* Bright, compact panel palette (local, so it doesn't depend on the
   dark map tokens). */
const ACCENT = '#4F46E5';
const CANVAS = '#FFFFFF';
const INK = '#1A1A2E';
const HAIR = 'rgba(26, 26, 46, 0.14)';
const MUTED = '#6B7280';
const SOFT = 'rgba(79, 70, 229, 0.07)';

const Pill = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    style={{
      font: `500 11px/1 ${MONO}`,
      color: on ? CANVAS : INK,
      background: on ? ACCENT : 'transparent',
      border: `1px solid ${on ? ACCENT : HAIR}`,
      borderRadius: 999,
      padding: '6px 10px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const Section = ({ label, children }) => (
  <div style={{ display: 'grid', gap: 6 }}>
    <div style={{
      fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: MUTED,
    }}>
      {label}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
  </div>
);

/**
 * Filters, staged then applied. The draft is local so trying a facing or
 * typing a range doesn't repaint the layout on every keystroke — only
 * "Apply filters" pushes a match set up to App.
 *
 * onApply(hits, draft): hits is a Set of plot names, or null when the
 * draft is empty. Same shape App already hands PlanMap as `matches`.
 *
 * Sits on the LEFT: DetailPanel owns the right edge, and App's zoomTo
 * already reserves 350px there when framing a plot.
 */
export default function FilterPanel({ plots, filters, onApply, onClose, hideStatus = false }) {
  const [draft, setDraft] = useState(filters || EMPTY_FILTERS);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const roads = useMemo(() => roadWidthOptions(plots), [plots]);
  const hits = useMemo(() => applyFilters(plots, draft), [plots, draft]);
  const total = useMemo(() => plots.filter((p) => !p.isRoad).length, [plots]);

  const field = {
    font: `400 12px/1 ${MONO}`,
    color: INK,
    background: SOFT,
    border: `1px solid ${HAIR}`,
    borderRadius: 8,
    padding: '8px 9px',
    width: '100%',
    minWidth: 0,
  };

  return (
    <div
      className="filter-panel"
      role="dialog"
      aria-label="Filter plots"
      style={{
        position: 'absolute', top: 'var(--mh-block, 14px)', left: 14, zIndex: 12,
        width: 280, maxWidth: 'calc(100vw - 28px)', maxHeight: 'calc(100% - var(--mh-block, 14px) - 14px)',
        display: 'flex', flexDirection: 'column',
        background: CANVAS,
        color: INK,
        border: `1px solid ${HAIR}`,
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(31, 41, 55, 0.18)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .filter-panel input::placeholder { color: #9CA3AF; }
        .filter-panel input { color-scheme: light; }
        .filter-panel .fp-body::-webkit-scrollbar { width: 5px; }
        .filter-panel .fp-body::-webkit-scrollbar-thumb {
          background: ${HAIR}; border-radius: 3px;
        }

        /* Tablet / small laptop: keep floating panel, just narrower & tighter */
        @media (max-width: 900px) {
          .filter-panel {
            width: min(270px, calc(100vw - 24px)) !important;
            top: var(--mh-block, 12px) !important; left: 12px !important;
          }
        }

        /* Phone landscape / small tablet: shrink further, tighten paddings */
        @media (max-width: 640px) {
          .filter-panel {
            top: auto !important; left: 8px !important; right: 8px;
            bottom: 8px; width: auto !important; max-height: 78% !important;
          }
          .filter-panel .fp-header {
            padding: 10px 12px 8px !important;
          }
          .filter-panel .fp-body {
            padding: 10px !important;
            gap: 12px !important;
          }
          .filter-panel .fp-footer {
            padding: 8px !important;
          }
        }

        /* Phone portrait: smaller text/controls, more of the sheet used */
        @media (max-width: 420px) {
          .filter-panel {
            left: 6px !important; right: 6px; bottom: 6px;
            max-height: 85% !important; border-radius: 12px !important;
          }
          .filter-panel .fp-title {
            font-size: 12px !important;
          }
          .filter-panel input,
          .filter-panel button {
            font-size: 12px !important;
          }
          .filter-panel .fp-footer {
            grid-template-columns: 1fr 1.4fr !important;
          }
        }

        /* Very small phones */
        @media (max-width: 340px) {
          .filter-panel .fp-body {
            padding: 8px !important;
            gap: 10px !important;
          }
          .filter-panel .fp-footer button {
            padding: 8px 0 !important;
          }
        }

        /* Short viewports (landscape phones): cap sheet height sensibly */
        @media (max-height: 480px) {
          .filter-panel {
            max-height: 92% !important;
          }
        }
      `}</style>

      <header
        className="fp-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px 8px', borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div
          className="fp-title"
          style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: ACCENT,
          }}
        >
          Filters
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
            {hits ? hits.size : total} of {total}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              style={{
                font: `400 16px/1 ${MONO}`, color: INK,
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              }}
            >
              &times;
            </button>
          )}
        </div>
      </header>

      <div
        className="fp-body"
        style={{
          display: 'grid', gap: 12, padding: 12,
          overflowY: 'auto', overscrollBehavior: 'contain',
        }}
      >
        <Section label="Area range">
          <div style={{ display: 'flex', gap: 5, width: '100%' }}>
            {AREA_UNITS.map((u) => (
              <Pill key={u} on={draft.unit === u} onClick={() => set({ unit: u })}>
                {u}
              </Pill>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', gap: 8, width: '100%',
          }}>
            <input
              style={field}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Min"
              aria-label={`Minimum area in ${draft.unit}`}
              value={draft.min}
              onChange={(e) => set({ min: e.target.value })}
            />
            <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>to</span>
            <input
              style={field}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Max"
              aria-label={`Maximum area in ${draft.unit}`}
              value={draft.max}
              onChange={(e) => set({ max: e.target.value })}
            />
          </div>
        </Section>

        {roads.length > 0 && (
          <Section label="Road width">
            <Pill on={draft.road === 'All'} onClick={() => set({ road: 'All' })}>All</Pill>
            {roads.map((w) => (
              <Pill
                key={w}
                on={String(draft.road) === String(w)}
                onClick={() => set({ road: w })}
              >
                {w} m
              </Pill>
            ))}
          </Section>
        )}

        <Section label="Facing">
          <Pill on={draft.facing === 'All'} onClick={() => set({ facing: 'All' })}>All</Pill>
          {FACING_OPTIONS.map((f) => (
            <Pill key={f} on={draft.facing === f} onClick={() => set({ facing: f })}>
              {f}
            </Pill>
          ))}
        </Section>

        {!hideStatus && (
          <>
            <Section label="Status">
              <Pill on={draft.status === 'All'} onClick={() => set({ status: 'All' })}>All</Pill>
              {STATUS_OPTIONS.map((s) => (
                <Pill key={s} on={draft.status === s} onClick={() => set({ status: s })}>
                  {s}
                </Pill>
              ))}
            </Section>

            <Section label="RL status">
              <Pill on={draft.rl === 'All'} onClick={() => set({ rl: 'All' })}>All</Pill>
              {RL_OPTIONS.map((r) => (
                <Pill key={r} on={draft.rl === r} onClick={() => set({ rl: r })}>
                  {r}
                </Pill>
              ))}
            </Section>
          </>
        )}
      </div>

      <footer
        className="fp-footer"
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 8,
          padding: 10, borderTop: `1px solid ${HAIR}`,
        }}
      >
        <button
          type="button"
          onClick={() => { setDraft(EMPTY_FILTERS); onApply(null, EMPTY_FILTERS); }}
          disabled={isEmpty(draft)}
          style={{
            font: `500 12px/1 ${MONO}`,
            color: isEmpty(draft) ? MUTED : INK,
            background: 'transparent',
            border: `1px solid ${HAIR}`,
            borderRadius: 10, padding: '9px 0',
            cursor: isEmpty(draft) ? 'default' : 'pointer',
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onApply(hits, draft)}
          style={{
            font: `500 12px/1 ${MONO}`, color: CANVAS,
            background: ACCENT, border: `1px solid ${ACCENT}`,
            borderRadius: 10, padding: '9px 0', cursor: 'pointer',
          }}
        >
          Apply filters
        </button>
      </footer>
    </div>
  );
}