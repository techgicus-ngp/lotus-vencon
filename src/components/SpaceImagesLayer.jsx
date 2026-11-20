import { memo } from "react";

/* Open-space pictures, drawn inside the SVG masterplan between the polygons and the labels.
   They never take clicks (pointer-events: none), so a tap still reaches the open space below.
   `opacityFor` dims a picture along with its space when a filter is active. */
const SpaceImagesLayer = memo(function SpaceImagesLayer({ spaces, opacityFor }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {spaces.map((s) => {
        const o = opacityFor ? opacityFor(s.raw, 1) : 1;
        const groupOpacity = o < 0.9 ? o : 1;

        // largest undistorted rectangle inside the shape (no clip)
        if (s.mode === "fit") {
          const p = s.p;
          return (
            <image
              key={`img-${s.id}`}
              href={s.src}
              x={p.cx - p.w / 2}
              y={p.cy - p.h / 2}
              width={p.w}
              height={p.h}
              preserveAspectRatio="none"
              opacity={groupOpacity}
              transform={`rotate(${p.deg} ${p.cx} ${p.cy})`}
            />
          );
        }

        // 'cover' = spread over the whole space, 'fill' = fill the shape; both clipped to it
        const clipId = `os-clip-${s.id}`;
        const isCover = s.mode === "cover";
        const r = isCover ? s.r : s.box;
        const tilt = isCover ? r.deg : s.tilt;
        return (
          <g key={`img-${s.id}`} opacity={groupOpacity}>
            <defs>
              <clipPath id={clipId}>
                <path d={s.d} clipRule="evenodd" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <image
                href={s.src}
                x={r.cx - r.w / 2}
                y={r.cy - r.h / 2}
                width={r.w}
                height={r.h}
                preserveAspectRatio={isCover ? "none" : "xMidYMid slice"}
                opacity={isCover ? undefined : 0.95}
                transform={`rotate(${tilt} ${r.cx} ${r.cy})`}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
});

export default SpaceImagesLayer;