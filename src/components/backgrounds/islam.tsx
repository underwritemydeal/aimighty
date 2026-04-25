/**
 * Islam — 7 background variants.
 *
 * Iconographic vocabulary: 8-point Khatim star + girih geometric tile
 * lattice. Per the product brief: NO calligraphy of Allah's name, NO Kaaba
 * imagery, NO crescent. The geometry IS the reverence.
 *
 * Accent palette: emerald + gold, rendered thin on a deep emerald→black
 * radial gradient.
 */
import type { BeliefBackgroundConfig, VariantRenderProps } from './types';

const EMERALD = '#3ab889';      // lifted emerald — readable against dark
const GOLD    = '#e2c899';      // gold accent matches design-system goldLight
const GOLD_DIM = 'rgba(226, 200, 153, 0.55)';
const EM_DIM   = 'rgba(58, 184, 137, 0.4)';

const VIEWBOX = '-500 -500 1000 1000';

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={VIEWBOX} xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
      {children}
    </svg>
  );
}

/**
 * 8-point Khatim star — drawn as a 16-vertex polygon.
 *   cx, cy      center
 *   outerR      tip-to-center radius
 *   innerR      concave radius (default = outerR * 0.41, reads as "Khatim-sharp")
 *   rotate      additional rotation in degrees (default 0 = a tip points up)
 */
function Khatim({
  cx = 0, cy = 0, outerR, innerR, rotate = 0,
  stroke = GOLD, strokeWidth = 2, opacity = 0.6, fill = 'none',
}: {
  cx?: number; cy?: number; outerR: number; innerR?: number; rotate?: number;
  stroke?: string; strokeWidth?: number; opacity?: number; fill?: string;
}) {
  const ri = innerR ?? outerR * 0.41;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outerR : ri;
    const a = (i * 22.5 - 90 + rotate) * (Math.PI / 180);
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <polygon
      points={pts.join(' ')}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="miter"
      opacity={opacity}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// V1 — Khatim Radiant
// Large central Khatim, ringed by a circle; eight smaller satellite stars
// tile outward at cardinal + ordinal points, linked by a thin girih lattice.
function V1({ reducedMotion: _r }: VariantRenderProps) {
  const satellites = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    return { cx: Math.cos(a) * 370, cy: Math.sin(a) * 370, r: 82 };
  });
  return (
    <Svg>
      {/* Outer containing ring */}
      <circle cx={0} cy={0} r={470} fill="none" stroke={EM_DIM} strokeWidth={1} />
      {/* Girih lattice — straight lines linking the 8 satellites as an octagon */}
      <g stroke={EMERALD} fill="none" strokeWidth={1} opacity={0.3}>
        {satellites.map((s, i) => {
          const n = satellites[(i + 1) % 8];
          return <line key={`edge-${i}`} x1={s.cx} y1={s.cy} x2={n.cx} y2={n.cy} />;
        })}
        {/* Radial spokes from center to each satellite */}
        {satellites.map((s, i) => (
          <line key={`spoke-${i}`} x1={0} y1={0} x2={s.cx} y2={s.cy} strokeWidth={0.8} opacity={0.6} />
        ))}
      </g>
      {/* Satellites */}
      {satellites.map((s, i) => (
        <Khatim
          key={`sat-${i}`}
          cx={s.cx}
          cy={s.cy}
          outerR={s.r}
          rotate={i * 45}
          stroke={GOLD}
          strokeWidth={1.6}
          opacity={0.45}
        />
      ))}
      {/* Central Khatim — foreground anchor */}
      <Khatim outerR={220} stroke={GOLD} strokeWidth={2.4} opacity={0.72} />
      <Khatim outerR={220} innerR={100} rotate={22.5} stroke={EMERALD} strokeWidth={1.2} opacity={0.4} />
      <circle cx={0} cy={0} r={46} fill="none" stroke={GOLD} strokeWidth={1.3} opacity={0.5} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V2 — Lattice of Nine
// A 3×3 grid of interlocking Khatim stars, grouted by a girih tile mesh.
function V2({ reducedMotion: _r }: VariantRenderProps) {
  const positions = [-280, 0, 280];
  const stars: { cx: number; cy: number }[] = [];
  positions.forEach((x) => positions.forEach((y) => stars.push({ cx: x, cy: y })));
  return (
    <Svg>
      {/* Girih mesh — connect each star to its orthogonal neighbors */}
      <g stroke={EMERALD} strokeWidth={1} opacity={0.28} fill="none">
        {stars.map((s, i) => {
          const out: React.ReactNode[] = [];
          const right = stars.find((t) => t.cx === s.cx + 280 && t.cy === s.cy);
          const down  = stars.find((t) => t.cx === s.cx && t.cy === s.cy + 280);
          if (right) out.push(<line key={`r${i}`} x1={s.cx} y1={s.cy} x2={right.cx} y2={right.cy} />);
          if (down)  out.push(<line key={`d${i}`} x1={s.cx} y1={s.cy} x2={down.cx}  y2={down.cy} />);
          return out;
        })}
        {/* Diagonals — the girih "connector" diamonds */}
        {stars.map((s, i) => {
          const dr = stars.find((t) => t.cx === s.cx + 280 && t.cy === s.cy + 280);
          if (!dr) return null;
          const midX = s.cx + 140;
          const midY = s.cy + 140;
          return (
            <g key={`dia${i}`} opacity={0.7}>
              <line x1={s.cx + 140} y1={s.cy} x2={midX} y2={midY} />
              <line x1={s.cx} y1={s.cy + 140} x2={midX} y2={midY} />
              <line x1={s.cx + 280} y1={s.cy + 140} x2={midX} y2={midY} />
              <line x1={s.cx + 140} y1={s.cy + 280} x2={midX} y2={midY} />
            </g>
          );
        })}
      </g>
      {/* The 9 stars */}
      {stars.map((s, i) => (
        <Khatim
          key={i}
          cx={s.cx}
          cy={s.cy}
          outerR={s.cx === 0 && s.cy === 0 ? 130 : 115}
          rotate={22.5}
          stroke={GOLD}
          strokeWidth={s.cx === 0 && s.cy === 0 ? 2.2 : 1.6}
          opacity={s.cx === 0 && s.cy === 0 ? 0.72 : 0.5}
        />
      ))}
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V3 — Inner Geometry
// Nested Khatim stars at decreasing scales, each rotated 22.5° from the
// last — a fractal-feeling depth composition.
function V3({ reducedMotion: _r }: VariantRenderProps) {
  return (
    <Svg>
      {/* Outermost subtle ring */}
      <circle cx={0} cy={0} r={470} fill="none" stroke={EM_DIM} strokeWidth={1} />
      <Khatim outerR={440} innerR={200} rotate={0}     stroke={EMERALD} strokeWidth={1.5} opacity={0.35} />
      <Khatim outerR={320} innerR={130} rotate={22.5}  stroke={GOLD}    strokeWidth={1.8} opacity={0.45} />
      <Khatim outerR={215} innerR={88}  rotate={0}     stroke={GOLD}    strokeWidth={2.2} opacity={0.6} />
      <Khatim outerR={130} innerR={55}  rotate={22.5}  stroke={GOLD}    strokeWidth={1.8} opacity={0.55} />
      <Khatim outerR={68}  innerR={28}  rotate={0}     stroke={GOLD}    strokeWidth={1.4} opacity={0.7} />
      <circle cx={0} cy={0} r={12} fill={GOLD} opacity={0.7} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V4 — Eightfold Rosette
// Central Khatim blooms into an 8-petal rosette — the interior geometry of
// a muqarnas dome, flattened.
function V4({ reducedMotion: _r }: VariantRenderProps) {
  // Eight petals radiating outward — almond-shaped arcs.
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    const tipR = 380;
    const midR = 195;
    const wid  = 50;
    const tipX = Math.cos(a) * tipR;
    const tipY = Math.sin(a) * tipR;
    // Side control points perpendicular to the radial axis.
    const perp = a + Math.PI / 2;
    const sideR = midR;
    const sxA = Math.cos(a) * sideR + Math.cos(perp) * wid;
    const syA = Math.sin(a) * sideR + Math.sin(perp) * wid;
    const sxB = Math.cos(a) * sideR - Math.cos(perp) * wid;
    const syB = Math.sin(a) * sideR - Math.sin(perp) * wid;
    return `M 0 0 Q ${sxA.toFixed(1)} ${syA.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${sxB.toFixed(1)} ${syB.toFixed(1)} 0 0 Z`;
  });
  return (
    <Svg>
      <circle cx={0} cy={0} r={460} fill="none" stroke={EM_DIM} strokeWidth={1.2} />
      <circle cx={0} cy={0} r={390} fill="none" stroke={EM_DIM} strokeWidth={0.8} />
      {/* Petals */}
      <g fill="none" stroke={GOLD} strokeWidth={1.6} opacity={0.45}>
        {petals.map((d, i) => <path key={i} d={d} />)}
      </g>
      {/* Central Khatim anchor */}
      <Khatim outerR={150} innerR={62} stroke={GOLD} strokeWidth={2.2} opacity={0.7} />
      <Khatim outerR={150} innerR={62} rotate={22.5} stroke={EMERALD} strokeWidth={1.2} opacity={0.35} />
      <circle cx={0} cy={0} r={26} fill="none" stroke={GOLD} strokeWidth={1.3} opacity={0.55} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V5 — Horizon Lattice (rotate: 'none')
// Khatim high, girih tile strip below — sky-over-earth composition.
function V5({ reducedMotion: _r }: VariantRenderProps) {
  // Tile strip: alternating rhombus + bowtie, repeating along y = +200.
  const tiles: React.ReactNode[] = [];
  const tileW = 110;
  for (let i = -4; i <= 4; i++) {
    const x = i * tileW;
    // Rhombus
    tiles.push(
      <polygon
        key={`rh-${i}`}
        points={`${x - tileW / 2},200 ${x},140 ${x + tileW / 2},200 ${x},260`}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.2}
        opacity={0.4}
      />
    );
    // Small Khatim cap above every other rhombus
    if (i % 2 === 0) {
      tiles.push(<Khatim key={`kh-${i}`} cx={x} cy={90} outerR={28} stroke={EMERALD} strokeWidth={1} opacity={0.45} />);
    }
  }
  return (
    <Svg>
      {/* Sky arcs */}
      <g fill="none" stroke={GOLD_DIM} strokeLinecap="round">
        <path d="M -460 -80 Q 0 -400 460 -80" strokeWidth={1.2} opacity={0.35} />
        <path d="M -410 -170 Q 0 -450 410 -170" strokeWidth={0.8} opacity={0.22} />
        <path d="M -360 -260 Q 0 -480 360 -260" strokeWidth={0.6} opacity={0.15} />
      </g>
      {/* Horizon line */}
      <line x1={-470} y1={200} x2={470} y2={200} stroke={EMERALD} strokeWidth={1} opacity={0.35} />
      <line x1={-470} y1={320} x2={470} y2={320} stroke={EMERALD} strokeWidth={0.6} opacity={0.2} />
      {/* Tile strip */}
      {tiles}
      {/* Main Khatim — floating above the horizon */}
      <Khatim cx={0} cy={-180} outerR={180} innerR={78} stroke={GOLD} strokeWidth={2.4} opacity={0.7} />
      <Khatim cx={0} cy={-180} outerR={180} innerR={78} rotate={22.5} stroke={EMERALD} strokeWidth={1.2} opacity={0.32} />
      <circle cx={0} cy={-180} r={36} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.5} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V6 — Whirling Concentric Stars
// Center Khatim largest; ring of 8 medium stars at r=240; ring of 16 small
// at r=420. Sufi whirling-dervish concentric energy.
function V6({ reducedMotion: _r }: VariantRenderProps) {
  const mid = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    return { cx: Math.cos(a) * 245, cy: Math.sin(a) * 245, rot: i * 45 };
  });
  const outer = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 - 90) * (Math.PI / 180);
    return { cx: Math.cos(a) * 420, cy: Math.sin(a) * 420, rot: i * 22.5 };
  });
  return (
    <Svg>
      <circle cx={0} cy={0} r={475} fill="none" stroke={EM_DIM} strokeWidth={0.8} />
      <circle cx={0} cy={0} r={420} fill="none" stroke={EM_DIM} strokeWidth={0.5} opacity={0.6} />
      <circle cx={0} cy={0} r={245} fill="none" stroke={EM_DIM} strokeWidth={0.6} />
      {outer.map((s, i) => (
        <Khatim key={`o${i}`} cx={s.cx} cy={s.cy} outerR={28} rotate={s.rot} stroke={GOLD} strokeWidth={1} opacity={0.45} />
      ))}
      {mid.map((s, i) => (
        <Khatim key={`m${i}`} cx={s.cx} cy={s.cy} outerR={58} rotate={s.rot} stroke={GOLD} strokeWidth={1.6} opacity={0.55} />
      ))}
      <Khatim outerR={115} innerR={48} stroke={GOLD} strokeWidth={2.2} opacity={0.72} />
      <Khatim outerR={115} innerR={48} rotate={22.5} stroke={EMERALD} strokeWidth={1.2} opacity={0.35} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V7 — Interlaced Strapwork
// 8-point star formed by two overlaid squares, rendered as thick-then-thin
// paired strokes to read as interwoven ribbons. The most ornate composition.
function V7({ reducedMotion: _r }: VariantRenderProps) {
  // Two squares (rotated 45° apart), each drawn with two parallel strokes
  // to fake a ribbon. The outer stroke is GOLD; inner thin stroke is void
  // to create a "split ribbon" look.
  const square = (rot: number, size: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + rot) * (Math.PI / 180);
      pts.push(`${(Math.cos(a) * size).toFixed(2)},${(Math.sin(a) * size).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  return (
    <Svg>
      <circle cx={0} cy={0} r={470} fill="none" stroke={EM_DIM} strokeWidth={1} />
      <circle cx={0} cy={0} r={395} fill="none" stroke={EM_DIM} strokeWidth={0.6} opacity={0.6} />
      {/* Square 1 — the "over" ribbon */}
      <polygon points={square(-45, 380)} fill="none" stroke={GOLD} strokeWidth={5} opacity={0.55} />
      <polygon points={square(-45, 380)} fill="none" stroke="#02100a" strokeWidth={1.6} opacity={1} />
      {/* Square 2 — the "under" ribbon — thinner to suggest it passes behind */}
      <polygon points={square(0, 380)} fill="none" stroke={GOLD} strokeWidth={4} opacity={0.5} />
      <polygon points={square(0, 380)} fill="none" stroke="#02100a" strokeWidth={1.3} opacity={1} />
      {/* Inner 8-point star (solid form) */}
      <Khatim outerR={210} innerR={90} stroke={GOLD} strokeWidth={2} opacity={0.6} />
      <Khatim outerR={210} innerR={90} rotate={22.5} stroke={EMERALD} strokeWidth={1.2} opacity={0.4} />
      {/* Center eye */}
      <circle cx={0} cy={0} r={42} fill="none" stroke={GOLD} strokeWidth={1.4} opacity={0.6} />
      <circle cx={0} cy={0} r={22} fill={GOLD} opacity={0.3} />
    </Svg>
  );
}

export const islamConfig: BeliefBackgroundConfig = {
  gradient:
    'radial-gradient(ellipse at 50% 40%, rgba(18,92,70,0.55) 0%, rgba(6,34,24,0.9) 38%, rgba(3,18,12,1) 72%, #020c08 100%)',
  accent: GOLD,
  accentSecondary: EMERALD,
  particleColor: 'rgba(226, 200, 153, 0.5)',
  particleCount: 24,
  variants: [
    { id: 'islam-v1', name: 'Khatim Radiant',          SymbolLayer: V1 },
    { id: 'islam-v2', name: 'Lattice of Nine',         SymbolLayer: V2 },
    { id: 'islam-v3', name: 'Inner Geometry',          SymbolLayer: V3 },
    { id: 'islam-v4', name: 'Eightfold Rosette',       SymbolLayer: V4 },
    { id: 'islam-v5', name: 'Horizon Lattice',         SymbolLayer: V5, rotate: 'none' },
    { id: 'islam-v6', name: 'Whirling Stars',          SymbolLayer: V6 },
    { id: 'islam-v7', name: 'Interlaced Strapwork',    SymbolLayer: V7 },
  ],
};
