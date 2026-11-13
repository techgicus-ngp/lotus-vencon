import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Search, X, Maximize2, Share2, Copy, MessageCircle } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { getMap, watchMap } from "../services/mapService";
import { plotFromDoc } from "../models/plot";
import { CenterSpinner } from "../components/Common";
import { useToast } from "../components/Toast";
import PlotViewSheet from "./PlotDetails";
import PlanMap from "../components/plan/PlanMap";
import { buildLayout } from "../lib/buildLayout";
import { normalizeStatus, statusColor } from "../utils/plotHelpers";

/* ── Screen chrome — the indigo/white HUD (top bar, pills, modals).
   The map itself, its controls and the filter panel are PlanMap's. ── */
const CANVAS = "rgba(255, 255, 255, 0.94)";
const PANEL = "rgba(255, 255, 255, 0.92)";
const HAIR = "rgba(26, 26, 46, 0.12)";
const ACCENT = "#4F46E5";
const GRAD = "linear-gradient(135deg, #4F46E5, #7C3AED)";
const SOFT = "rgba(79, 70, 229, 0.07)";
const MUTED = "#6B7280";
const INK = "#1A1A2E";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Consolas, monospace";

const PUBLIC_USER = { uid: "public", name: "Visitor", role: "guest" };
const STATUS_KEY = "mv_show_status";

/* Plot sheet: a 390px card bottom-right on desktop, a compact bar on a phone
   (≤ 640px). PlanMap frames the picked plot clear of whichever it is. */
const reserveFor = (vw) => (vw > 640 ? { right: 416 } : { bottom: 96 });

const sectionLabel = {
  fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED,
};

function GlassModal({ title, onClose, children, actions }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)",
        display: "grid", placeItems: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380, maxWidth: "100%", background: CANVAS, backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)", border: `1px solid ${HAIR}`, borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,.6)", color: INK, fontFamily: SANS, padding: 18,
        }}
      >
        <div style={{ ...sectionLabel, color: ACCENT, fontSize: 13, marginBottom: 12 }}>{title}</div>
        {children}
        {actions && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>{actions}</div>}
      </div>
    </div>
  );
}

const glassBtn = (primary) => ({
  font: `600 13px/1 ${MONO}`, color: primary ? "#FFFFFF" : INK,
  background: primary ? GRAD : "transparent", border: `1px solid ${primary ? ACCENT : HAIR}`,
  borderRadius: 10, padding: "11px 16px", cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: 8, textDecoration: "none",
});

const kvRow = {
  display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13,
  borderBottom: `1px solid ${HAIR}`,
};

const inputStyle = {
  font: `400 13px/1 ${MONO}`, color: INK, background: SOFT,
  border: `1px solid ${HAIR}`, borderRadius: 9, padding: "10px", width: "100%",
  boxSizing: "border-box", outline: "none",
};

/* A plot's geometry, as a string. The layout is rebuilt only when this
   changes, so a status change (someone books a plot) updates colours and
   the sheet without re-framing the camera. */
const geometryKey = (plots) =>
  plots
    .map((p) => [
      p.srNo, p.plotNo, p.type, p.title, p.area,
      p.labelPosition ? `${p.labelPosition.lat},${p.labelPosition.lng}` : "",
      p.corners.map((c) => `${c.lat.toFixed(7)},${c.lng.toFixed(7)}`).join(";"),
    ].join("|"))
    .join("#");

/* ── Main screen ────────────────────────────────────────────────────────── */
export default function MapViewerScreen({ publicView = false }) {
  const { mapId } = useParams();
  const { user } = useSession();
  const viewer = publicView ? PUBLIC_USER : user;
  const nav = useNavigate();
  const toast = useToast();

  // Status view: ON = plots coloured by sale status. The public share view
  // never has it. The choice is remembered on this device.
  const [showStatus, setShowStatus] = useState(() => {
    if (publicView) return false;
    try { return localStorage.getItem(STATUS_KEY) !== "0"; } catch { return true; }
  });
  const hideStatus = publicView || !showStatus;

  const [mapDoc, setMapDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState(null);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [showArea, setShowArea] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [vw, setVw] = useState(() => window.innerWidth);

  const mapRef = useRef(null);
  const fitRef = useRef(null);
  const lastPlotsJson = useRef("");

  /* ── data: initial load, then live updates (e.g. someone books a plot) ── */
  useEffect(() => {
    lastPlotsJson.current = "";
    let off = () => {};
    let cancelled = false;
    const apply = (m) => {
      const json = JSON.stringify(m.plots ?? []);
      if (json === lastPlotsJson.current) return; // nothing changed
      lastPlotsJson.current = json;
      setMapDoc(m);
    };
    getMap(mapId)
      .then((m) => {
        if (cancelled) return;
        if (m) {
          apply(m);
          off = watchMap(mapId, apply);
        }
      })
      .catch((e) => console.error("Error loading map data:", e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; off(); };
  }, [mapId]);

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const plots = useMemo(
    () =>
      (mapDoc?.plots ?? []).map((raw) => {
        const p = plotFromDoc(raw);
        // the public share view never reveals sale status
        return publicView && p.type === "plot" ? { ...p, status: "Available" } : p;
      }),
    [mapDoc, publicView],
  );

  /* ── the drawable plan ── */
  const plotsRef = useRef(plots);
  plotsRef.current = plots;
  const geoKey = useMemo(() => geometryKey(plots), [plots]);
  const boundaryKey = JSON.stringify(mapDoc?.layoutBoundary ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => buildLayout(plotsRef.current, mapDoc ?? {}), [geoKey, boundaryKey]);

  /* name → status for PlanMap, and a refresh of each feature's plot record.
     When only a status changed the layout object is the same one, so its
     features are pointed at the new records here rather than rebuilt. */
  const status = useMemo(() => {
    if (!layout) return {};
    const usable = plots.filter((p) => Array.isArray(p.corners) && p.corners.length >= 3);
    layout.features.forEach((f) => { if (usable[f.i]) f.doc = usable[f.i]; });
    return Object.fromEntries(layout.plots.map((f) => [f.name, f.doc.status]));
  }, [layout, plots]);

  const selectedPlot = selectedName && layout ? layout.byName.get(selectedName)?.doc ?? null : null;

  /* ── Share ── */
  const shareUrl = `${window.location.origin}/share/${mapId}`;
  const shareText = `${mapDoc?.name || "Layout"} — view the layout and plots`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const t = document.createElement("textarea");
      t.value = shareUrl;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    toast("Link copied");
  };
  const nativeShare = () => navigator.share({ title: shareText, text: shareText, url: shareUrl }).catch(() => {});
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  /* ── derived lists ── */
  const statuses = useMemo(
    () => (hideStatus ? [] : [...new Set(plots.filter((p) => p.type === "plot").map((p) => normalizeStatus(p.status)))]),
    [plots, hideStatus],
  );
  const count = useCallback((t) => plots.filter((p) => p.type === t).length, [plots]);
  const countStatus = useCallback(
    (s) => plots.filter((p) => p.type === "plot" && normalizeStatus(p.status) === s).length,
    [plots],
  );

  /* A status pill narrows the plan the same way a filter does: PlanMap dims
     every plot that is not in the set. */
  const matches = useMemo(() => {
    if (!category || !layout) return null;
    return new Set(
      layout.plots.filter((f) => normalizeStatus(f.doc.status) === category).map((f) => f.name),
    );
  }, [category, layout, plots]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── actions ── */
  const clearSelection = useCallback(() => setSelectedName(null), []);
  const onSelect = useCallback((name) => setSelectedName(name || null), []);
  const onReady = useCallback(() => {}, []);

  const toggleStatus = useCallback((next) => {
    const on = typeof next === "boolean" ? next : !showStatus;
    setShowStatus(on);
    try { localStorage.setItem(STATUS_KEY, on ? "1" : "0"); } catch { /* ignore */ }
    if (!on) setCategory(null);
  }, [showStatus]);

  const doSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q || !layout) { clearSelection(); return; }
    const hit = layout.plots.find(
      (f) => (f.doc.plotNo || "").toLowerCase() === q
        || (f.doc.srNo || "").toLowerCase() === q
        || (f.doc.title || "").toLowerCase().includes(q),
    );
    if (!hit) { toast("No match found", { error: true }); return; }
    setSelectedName(hit.name);
  };

  const fitAll = () => { clearSelection(); fitRef.current?.(); };

  if (loading) return <CenterSpinner />;
  if (!mapDoc) {
    return (
      <div className="center-fill">
        <p>Map not found.</p>
        {!publicView && <button className="btn btn-primary" onClick={() => nav("/")}>Back</button>}
      </div>
    );
  }

  return (
    <div className="ref-map-page">
      <style>{`
        .ref-map-page { position: fixed; inset: 0; overflow: hidden; background: #000; font-family: ${SANS}; color: ${INK}; user-select: none; --mh-block: 128px; }
        .ref-hud-top { position: absolute; top: 14px; left: 14px; right: 14px; z-index: 10; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .ref-topbar { pointer-events: auto; display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: ${CANVAS}; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid ${HAIR}; border-radius: 14px; box-shadow: 0 18px 42px rgba(31, 41, 55, 0.2); flex-wrap: wrap; }
        .ref-icon-btn { width: 38px; height: 38px; border-radius: 10px; background: ${SOFT}; border: 1px solid ${HAIR}; color: ${INK}; display: grid; place-items: center; cursor: pointer; transition: border-color 150ms ease, color 150ms ease; flex-shrink: 0; }
        .ref-icon-btn:hover { border-color: ${ACCENT}; color: ${ACCENT}; }
        .ref-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: ${SOFT}; border: 1px solid ${HAIR}; border-radius: 10px; padding: 4px 6px 4px 12px; }
        .ref-search:focus-within { border-color: ${ACCENT}; }
        .ref-search input { flex: 1; background: transparent; border: none; outline: none; color: ${INK}; font: 400 13px/1 ${MONO}; padding: 6px 0; min-width: 0; user-select: text; }
        .ref-search input::placeholder { color: ${MUTED}; }
        .ref-find-btn { font: 600 12px/1 ${MONO}; background: ${GRAD}; color: #FFFFFF; border: none; border-radius: 7px; padding: 7px 12px; cursor: pointer; }
        .ref-chips-row { pointer-events: auto; display: flex; align-items: center; gap: 7px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; width: max-content; max-width: calc(100% - 64px); }
        .ref-chips-row::-webkit-scrollbar { display: none; }
        .ref-pill { font: 500 12px/1 ${MONO}; color: ${INK}; background: ${PANEL}; border: 1px solid ${HAIR}; border-radius: 999px; padding: 8px 14px; cursor: pointer; white-space: nowrap; box-shadow: 0 8px 20px rgba(31, 41, 55, 0.2); transition: all 150ms ease; display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex-shrink: 0; min-height: 32px; box-sizing: border-box; }
        .ref-pill:hover { border-color: ${ACCENT}; }
        .ref-pill.on { color: #FFFFFF; background: ${GRAD}; border-color: ${ACCENT}; font-weight: 700; }
        .ref-pill-dot { width: 10px; height: 10px; border-radius: 3px; border: 1px solid ${HAIR}; box-sizing: border-box; }

        /* PlanMap's own filter button sits just under the top bar on a desktop and
           drops to the bottom-left on a tablet or phone. */
        .filter-toggle-btn { position: absolute; top: var(--mh-block); left: 14px; z-index: 6; }
        @media (max-width: 1024px) {
          .filter-toggle-btn { top: auto; bottom: 50px; left: 14px; }
        }
        @media (max-width: 768px) {
          .ref-map-page { --mh-block: 118px; }
          .ref-hud-top { top: 8px; left: 8px; right: 8px; gap: 6px; }
          .ref-topbar { padding: 8px 10px; gap: 8px; border-radius: 12px; }
          .ref-icon-btn { width: 36px; height: 36px; }
          .ref-topbar > div:nth-child(2) { display: none; }
          .ref-search { padding: 0 10px; height: 36px; }
          .ref-search input { font-size: 14px; }
          .ref-find-btn { padding: 5px 10px; }
        }
      `}</style>

      {/* ── The map: camera, plan, raised plot, zoom, compass, filters, status ── */}
      {layout ? (
        <PlanMap
          layout={layout}
          selected={selectedName}
          onSelect={onSelect}
          matches={matches}
          status={status}
          mapRef={mapRef}
          fitRef={fitRef}
          onReady={onReady}
          showStatus={showStatus}
          setShowStatus={toggleStatus}
          reserve={reserveFor(vw)}
          share={publicView}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#E7E1D5", fontFamily: MONO, padding: 24, textAlign: "center" }}>
          This layout has no plots with map coordinates yet.
        </div>
      )}

      {/* ── HUD: top bar + status pills ── */}
      <div className="ref-hud-top">
        <div className="ref-topbar">
          {!publicView && (
            <button className="ref-icon-btn" onClick={() => nav(-1)} title="Back"><ArrowLeft size={18} /></button>
          )}
          <div style={{ minWidth: 140 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT }}>MASTERPLAN</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
              {mapDoc?.name || "Layout Map"}
            </div>
          </div>

          <div className="ref-search">
            <Search size={15} color={MUTED} />
            <input
              placeholder="Search plot no / sr no / title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            {query && (
              <button
                onClick={() => { setQuery(""); clearSelection(); }}
                style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", display: "grid", placeItems: "center" }}
              >
                <X size={14} />
              </button>
            )}
            <button className="ref-find-btn" onClick={doSearch}>Find</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="ref-icon-btn" title="Fit full layout" onClick={fitAll}>
              <Maximize2 size={17} />
            </button>
            <button className="ref-icon-btn" title="Area details" onClick={() => setShowArea(true)}>
              <Info size={17} />
            </button>
            <button className="ref-icon-btn" title="Share layout" aria-label="Share layout" onClick={() => setShowShare(true)}>
              <Share2 size={17} />
            </button>
          </div>
        </div>

        {statuses.length > 0 && (
          <div className="ref-chips-row">
            <button className={`ref-pill ${category === null ? "on" : ""}`} onClick={() => setCategory(null)}>
              All ({count("plot")})
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                className={`ref-pill ${category === s ? "on" : ""}`}
                onClick={() => setCategory(category === s ? null : s)}
              >
                <span className="ref-pill-dot" style={{ background: statusColor(s) }} />
                {s} ({countStatus(s)})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Selected plot inspector ── */}
      {selectedPlot && (
        <PlotViewSheet
          plot={hideStatus ? { ...selectedPlot, status: "" } : selectedPlot}
          mapId={mapId}
          mapName={mapDoc?.name ?? ""}
          user={viewer}
          hideStatus={hideStatus}
          onClose={clearSelection}
        />
      )}

      {/* ── Area details ── */}
      {showArea && (
        <GlassModal
          title="Area Details"
          onClose={() => setShowArea(false)}
          actions={<button style={glassBtn(true)} onClick={() => setShowArea(false)}>Close</button>}
        >
          {[
            ["Total Area", mapDoc?.totalArea ?? "0"],
            ["Total Plots", mapDoc?.totalPlots ?? count("plot")],
            ["Total Roads", mapDoc?.totalRoads ?? count("road")],
            ["Total Open Spaces", mapDoc?.totalOpenSpaces ?? count("open_space")],
          ].map(([k, v]) => (
            <div style={kvRow} key={k}><span style={{ color: MUTED }}>{k}</span><b>{String(v)}</b></div>
          ))}
          {!hideStatus && statuses.length > 0 && (
            <>
              <div style={{ ...sectionLabel, margin: "14px 0 4px" }}>Plots by status</div>
              {statuses.map((s) => (
                <div style={kvRow} key={s}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: MUTED }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: statusColor(s) }} />{s}
                  </span>
                  <b>{countStatus(s)}</b>
                </div>
              ))}
            </>
          )}
        </GlassModal>
      )}

      {/* ── Share ── */}
      {showShare && (
        <GlassModal
          title="Share this layout"
          onClose={() => setShowShare(false)}
          actions={<button style={glassBtn(true)} onClick={() => setShowShare(false)}>Done</button>}
        >
          <p style={{ marginTop: 0, color: MUTED, fontSize: 13 }}>Anyone with this link can view the layout. No login needed.</p>
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} style={{ ...inputStyle, userSelect: "text" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button style={glassBtn(true)} onClick={copyLink}><Copy size={15} /> Copy link</button>
            <a style={{ ...glassBtn(false), color: "#16A34A", borderColor: "rgba(22,163,74,.4)" }} href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={15} /> WhatsApp
            </a>
            {navigator.share && (
              <button style={glassBtn(false)} onClick={nativeShare}><Share2 size={15} /> More…</button>
            )}
          </div>
        </GlassModal>
      )}
    </div>
  );
}
