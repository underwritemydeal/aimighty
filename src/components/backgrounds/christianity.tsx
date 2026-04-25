/**
 * Christianity (Protestant) — 7 background variants.
 *
 * Iconographic vocabulary: Latin cross, mandorla (almond halo), radiating
 * light, rose-window geometry, Calvary scene. Each of the 7 variants is a
 * distinct composition drawing from this vocabulary — not a rotation or
 * density tweak.
 */
import type { BeliefBackgroundConfig, VariantRenderProps } from './types';

const STROKE = '#d4b882';          // champagne gold (matches design-system gold)
const STROKE_SOFT = '#f0dcb4';     // lighter tint for highlights

const VIEWBOX = '-500 -500 1000 1000';

// Shared svg wrapper — keeps all variants consistent in sizing.
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={VIEWBOX} xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
      {children}
    </svg>
  );
}

/**
 * Draws a Latin cross centered at (cx, cy).
 *   h = full vertical height
 *   w = full horizontal bar width
 *   t = bar thickness
 *   armY = where the horizontal bar crosses (measured from top of cross; 0.35 is classical)
 */
function LatinCross({
  cx = 0, cy = 0, h = 440, w = 260, t = 32, armY = 0.32, opacity = 0.65, stroke = STROKE,
}: {
  cx?: number; cy?: number; h?: number; w?: number; t?: number; armY?: number;
  opacity?: number; stroke?: string;
}) {
  const top = cy - h / 2;
  const bot = cy + h / 2;
  const armYAbs = top + h * armY;
  return (
    <g stroke={stroke} fill="none" strokeLinecap="square" opacity={opacity}>
      {/* vertical bar */}
      <line x1={cx} y1={top} x2={cx} y2={bot} strokeWidth={t} />
      {/* horizontal bar */}
      <line x1={cx - w / 2} y1={armYAbs} x2={cx + w / 2} y2={armYAbs} strokeWidth={t} />
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// V1 — Mandorla of Light
// Cross centered in a vesica piscis, with 16 thin spokes radiating outward.
function V1({ reducedMotion: _r }: VariantRenderProps) {
  const spokes = Array.from({ length: 16 }, (_, i) => (i * 22.5) * (Math.PI / 180));
  return (
    <Svg>
      {/* Outer spokes — thin, recede into the gradient */}
      <g stroke={STROKE} strokeLinecap="round" opacity={0.2}>
        {spokes.map((a, i) => (
          <line
            key={i}
            x1={Math.cos(a) * 360}
            y1={Math.sin(a) * 360}
            x2={Math.cos(a) * 470}
            y2={Math.sin(a) * 470}
            strokeWidth={2}
          />
        ))}
      </g>
      {/* Outer soft ring */}
      <circle cx={0} cy={0} r={350} fill="none" stroke={STROKE} strokeWidth={1.5} opacity={0.22} />
      {/* Mandorla — vesica piscis (two overlapping circles). Rendered as one ellipse
          for mobile frame-rate simplicity; reads as an almond halo at 70vmin. */}
      <ellipse cx={0} cy={0} rx={220} ry={340} fill="none" stroke={STROKE} strokeWidth={2.5} opacity={0.55} />
      <ellipse cx={0} cy={0} rx={175} ry={275} fill="none" stroke={STROKE} strokeWidth={1.5} opacity={0.3} />
      {/* Cross */}
      <LatinCross h={470} w={230} t={16} opacity={0.72} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V2 — Gloria (small cross, radiating alternating rays)
// Reads as "God's glory breaking forth" — bursting rays at 16 angles,
// alternating long + short, sunburst-composition.
function V2({ reducedMotion: _r }: VariantRenderProps) {
  const rays = Array.from({ length: 24 }, (_, i) => ({
    angle: (i * 15) * (Math.PI / 180),
    long: i % 2 === 0,
  }));
  return (
    <Svg>
      <g stroke={STROKE} strokeLinecap="round" opacity={0.28}>
        {rays.map((r, i) => {
          const innerR = 155;
          const outerR = r.long ? 470 : 330;
          return (
            <line
              key={i}
              x1={Math.cos(r.angle) * innerR}
              y1={Math.sin(r.angle) * innerR}
              x2={Math.cos(r.angle) * outerR}
              y2={Math.sin(r.angle) * outerR}
              strokeWidth={r.long ? 2 : 1.5}
            />
          );
        })}
      </g>
      {/* Inner disc of light — rendered as a thin ring, not a fill */}
      <circle cx={0} cy={0} r={140} fill="none" stroke={STROKE} strokeWidth={2} opacity={0.5} />
      <circle cx={0} cy={0} r={105} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.25} />
      {/* Small central cross */}
      <LatinCross h={190} w={105} t={12} opacity={0.7} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V3 — Calvary Triad (three crosses, fixed orientation, no rotation)
// Hill silhouette, three crosses of graded heights. Radially asymmetric
// by design — `rotate: 'none'` in the config.
function V3({ reducedMotion: _r }: VariantRenderProps) {
  return (
    <Svg>
      {/* Faint upward light halo behind the tallest cross */}
      <g stroke={STROKE} fill="none" strokeLinecap="round" opacity={0.18}>
        <path d="M 0 220 L 0 -460" strokeWidth={1.5} />
        <path d="M -60 220 L -20 -420" strokeWidth={1} />
        <path d="M 60 220 L 20 -420" strokeWidth={1} />
        <path d="M -130 220 L -80 -360" strokeWidth={0.8} />
        <path d="M 130 220 L 80 -360" strokeWidth={0.8} />
      </g>
      {/* Subtle sky arc above the scene */}
      <path
        d="M -470 -50 Q 0 -340 470 -50"
        fill="none"
        stroke={STROKE}
        strokeWidth={1}
        opacity={0.2}
      />
      <path
        d="M -420 -120 Q 0 -380 420 -120"
        fill="none"
        stroke={STROKE}
        strokeWidth={0.8}
        opacity={0.14}
      />
      {/* Ground line — shallow curved horizon, slight rise at center (Golgotha). */}
      <path
        d="M -470 250 Q -230 228 -40 218 Q 0 214 40 218 Q 230 228 470 250"
        fill="none"
        stroke={STROKE}
        strokeWidth={2}
        opacity={0.35}
      />
      {/* Left thief cross — shorter, slight inward lean via height only */}
      <LatinCross cx={-280} cy={20} h={380} w={150} t={14} opacity={0.45} />
      {/* Right thief cross */}
      <LatinCross cx={280} cy={20} h={380} w={150} t={14} opacity={0.45} />
      {/* Center cross — tallest, brightest */}
      <LatinCross cx={0} cy={-30} h={500} w={230} t={20} opacity={0.72} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V4 — Star of the Nativity (cross inside 8-point star)
// Chi-Rho composition tradition. Star of Bethlehem geometry.
function V4({ reducedMotion: _r }: VariantRenderProps) {
  // 8-point star as a 16-vertex polygon: 8 outer at r=420, 8 inner at r=175.
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 420 : 175;
    const a = (i * 22.5 - 90) * (Math.PI / 180);
    points.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  // Secondary 8-point star, larger + rotated 22.5°, drawn as thin
  const points2: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 480 : 230;
    const a = (i * 22.5 - 90 + 11.25) * (Math.PI / 180);
    points2.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <Svg>
      {/* Faint outer star */}
      <polygon points={points2.join(' ')} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.2} />
      {/* Primary 8-point star */}
      <polygon points={points.join(' ')} fill="none" stroke={STROKE} strokeWidth={2.5} opacity={0.5} />
      {/* Inner octagonal ring */}
      <circle cx={0} cy={0} r={145} fill="none" stroke={STROKE} strokeWidth={1.5} opacity={0.28} />
      <circle cx={0} cy={0} r={105} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.2} />
      {/* Inscribed cross, medium size */}
      <LatinCross h={280} w={155} t={16} opacity={0.72} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V5 — Prayer Arcs (layered, off-center)
// Small cross at center, wide arcs of layered rings at staggered centers.
// Less a halo, more the feeling of many prayers reaching outward.
function V5({ reducedMotion: _r }: VariantRenderProps) {
  // 6 circles at 60° intervals at radius 180 from origin, each r=310.
  const circles = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * (Math.PI / 180);
    return { cx: Math.cos(a) * 180, cy: Math.sin(a) * 180, r: 310, opacity: 0.22 };
  });
  // 2 larger outer enclosing rings, slightly off-axis.
  const outerRings = [
    { cx: 40, cy: -30, r: 455, opacity: 0.18 },
    { cx: -40, cy: 30, r: 455, opacity: 0.18 },
  ];
  return (
    <Svg>
      {outerRings.map((c, i) => (
        <circle
          key={`o${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke={STROKE}
          strokeWidth={1}
          opacity={c.opacity}
        />
      ))}
      {circles.map((c, i) => (
        <circle
          key={`c${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke={STROKE}
          strokeWidth={1.2}
          opacity={c.opacity}
        />
      ))}
      {/* Center small cross */}
      <LatinCross h={180} w={100} t={11} opacity={0.72} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V6 — Descent of the Spirit (cross + 8 doves + light radiating)
// Eight dove silhouettes at compass points around a central cross,
// radial symmetry lets the 90s rotation read as "circling," not "falling."
function V6({ reducedMotion: _r }: VariantRenderProps) {
  // Dove silhouette path — two wings meeting at an apex, small.
  // Drawn in a local space ~60 units wide; we translate + rotate to place.
  const Dove = ({ cx, cy, rot }: { cx: number; cy: number; rot: number }) => (
    <g
      transform={`translate(${cx} ${cy}) rotate(${rot})`}
      stroke={STROKE}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.5}
    >
      {/* Left wing (arc up) */}
      <path d="M 0 0 Q -18 -18 -42 -6" strokeWidth={2.5} />
      {/* Right wing (arc up) */}
      <path d="M 0 0 Q 18 -18 42 -6" strokeWidth={2.5} />
      {/* Body dot */}
      <circle cx={0} cy={0} r={3.5} fill={STROKE} stroke="none" />
    </g>
  );
  const doves = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * (Math.PI / 180);
    const r = 380;
    // Rotate the dove so its "up" always points radially outward.
    const rot = (i * 45) + 90;
    return { cx: Math.cos(a) * r, cy: Math.sin(a) * r, rot };
  });
  const rays = Array.from({ length: 16 }, (_, i) => (i * 22.5) * (Math.PI / 180));
  return (
    <Svg>
      {/* Short radiating rays between center and dove ring */}
      <g stroke={STROKE} strokeLinecap="round" opacity={0.18}>
        {rays.map((a, i) => (
          <line
            key={i}
            x1={Math.cos(a) * 200}
            y1={Math.sin(a) * 200}
            x2={Math.cos(a) * 330}
            y2={Math.sin(a) * 330}
            strokeWidth={1.2}
          />
        ))}
      </g>
      {/* Outer ring the doves travel on */}
      <circle cx={0} cy={0} r={380} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.18} />
      <circle cx={0} cy={0} r={195} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.25} />
      {/* Doves */}
      {doves.map((d, i) => (
        <Dove key={i} cx={d.cx} cy={d.cy} rot={d.rot} />
      ))}
      {/* Cross in the center */}
      <LatinCross h={310} w={175} t={16} opacity={0.72} stroke={STROKE_SOFT} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V7 — Rose Window
// Gothic rose window geometry: outer circle, 12 radial dividers, ring of
// 12 circular lobes, inner 8-petal rosette, tiny cross at exact center.
function V7({ reducedMotion: _r }: VariantRenderProps) {
  const divisions = 12;
  const dividers = Array.from({ length: divisions }, (_, i) => (i * (360 / divisions)) * (Math.PI / 180));
  const lobes = Array.from({ length: divisions }, (_, i) => {
    const a = (i * (360 / divisions) + (360 / divisions) / 2) * (Math.PI / 180);
    return { cx: Math.cos(a) * 365, cy: Math.sin(a) * 365 };
  });
  // 8-petal inner rosette — petals via arcs.
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * (Math.PI / 180);
    const a2 = ((i + 1) * 45) * (Math.PI / 180);
    const x1 = Math.cos(a) * 60;
    const y1 = Math.sin(a) * 60;
    const x2 = Math.cos(a2) * 60;
    const y2 = Math.sin(a2) * 60;
    const mx = Math.cos((a + a2) / 2) * 135;
    const my = Math.sin((a + a2) / 2) * 135;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  });
  return (
    <Svg>
      {/* Outer ring */}
      <circle cx={0} cy={0} r={450} fill="none" stroke={STROKE} strokeWidth={1.8} opacity={0.4} />
      <circle cx={0} cy={0} r={435} fill="none" stroke={STROKE} strokeWidth={0.8} opacity={0.22} />
      {/* Ring the lobes sit on */}
      <circle cx={0} cy={0} r={290} fill="none" stroke={STROKE} strokeWidth={1} opacity={0.22} />
      {/* Radial dividers */}
      <g stroke={STROKE} opacity={0.2} strokeLinecap="round">
        {dividers.map((a, i) => (
          <line
            key={i}
            x1={Math.cos(a) * 140}
            y1={Math.sin(a) * 140}
            x2={Math.cos(a) * 435}
            y2={Math.sin(a) * 435}
            strokeWidth={1}
          />
        ))}
      </g>
      {/* Lobes */}
      <g fill="none" stroke={STROKE} strokeWidth={1.4} opacity={0.36}>
        {lobes.map((l, i) => (
          <circle key={i} cx={l.cx} cy={l.cy} r={58} />
        ))}
      </g>
      {/* Inner rosette */}
      <g fill="none" stroke={STROKE} strokeWidth={1.5} opacity={0.42}>
        {petals.map((d, i) => <path key={i} d={d} />)}
      </g>
      <circle cx={0} cy={0} r={60} fill="none" stroke={STROKE} strokeWidth={1.2} opacity={0.28} />
      {/* Tiny center cross */}
      <LatinCross h={78} w={44} t={6} opacity={0.8} stroke={STROKE_SOFT} />
    </Svg>
  );
}

export const christianityConfig: BeliefBackgroundConfig = {
  gradient:
    'radial-gradient(ellipse at 50% 38%, rgba(92,56,22,0.55) 0%, rgba(42,24,10,0.85) 36%, rgba(12,8,4,1) 72%, #060402 100%)',
  accent: STROKE,
  accentSecondary: STROKE_SOFT,
  particleColor: 'rgba(212, 184, 130, 0.55)',
  particleCount: 22,
  variants: [
    { id: 'christianity-v1', name: 'Mandorla of Light',          SymbolLayer: V1 },
    { id: 'christianity-v2', name: 'Gloria',                     SymbolLayer: V2 },
    { id: 'christianity-v3', name: 'Calvary Triad',              SymbolLayer: V3, rotate: 'none' },
    { id: 'christianity-v4', name: 'Star of the Nativity',       SymbolLayer: V4 },
    { id: 'christianity-v5', name: 'Prayer Arcs',                SymbolLayer: V5 },
    { id: 'christianity-v6', name: 'Descent of the Spirit',      SymbolLayer: V6 },
    { id: 'christianity-v7', name: 'Rose Window',                SymbolLayer: V7 },
  ],
};
