/**
 * Buddhism — 7 background variants.
 *
 * Iconographic vocabulary: Dharmachakra (8-spoke wheel), lotus, bodhi leaf,
 * stupa. Warm orange on soft amber→black gradient.
 */
import type { BeliefBackgroundConfig, VariantRenderProps } from './types';

const ORANGE = '#e79d4f';        // warm monk-robe orange, lifted for readability
const IVORY  = '#fff5dc';        // design-system goldCore
const ORANGE_DIM = 'rgba(231, 157, 79, 0.4)';
const IVORY_DIM  = 'rgba(255, 245, 220, 0.35)';

const VIEWBOX = '-500 -500 1000 1000';

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={VIEWBOX} xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
      {children}
    </svg>
  );
}

/**
 * Dharmachakra — 8-spoke wheel with a hub.
 *   cx, cy     center
 *   r          outer rim radius
 *   spokeCount defaults to 8 (the classical dharmachakra)
 */
function DharmaWheel({
  cx = 0, cy = 0, r, spokeCount = 8, rotate = 0,
  stroke = ORANGE, strokeWidth = 2.4, opacity = 0.7,
}: {
  cx?: number; cy?: number; r: number; spokeCount?: number; rotate?: number;
  stroke?: string; strokeWidth?: number; opacity?: number;
}) {
  const spokes = Array.from({ length: spokeCount }, (_, i) => {
    const a = (i * (360 / spokeCount) + rotate) * (Math.PI / 180);
    return {
      x2: cx + Math.cos(a) * r,
      y2: cy + Math.sin(a) * r,
      // Spokes end with a small hook — the classical dharmachakra detail.
      hookA: cx + Math.cos(a) * r * 0.93 + Math.cos(a + Math.PI / 2) * (r * 0.05),
      hookB: cy + Math.sin(a) * r * 0.93 + Math.sin(a + Math.PI / 2) * (r * 0.05),
    };
  });
  const hubR = r * 0.14;
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} strokeLinecap="round">
      {/* Rim */}
      <circle cx={cx} cy={cy} r={r} fill="none" />
      {/* Inner rim (thinner) */}
      <circle cx={cx} cy={cy} r={r * 0.88} fill="none" strokeWidth={strokeWidth * 0.45} />
      {/* Spokes */}
      {spokes.map((s, i) => (
        <line key={i} x1={cx} y1={cy} x2={s.x2} y2={s.y2} strokeWidth={strokeWidth * 0.6} />
      ))}
      {/* Hub */}
      <circle cx={cx} cy={cy} r={hubR} fill="none" />
      <circle cx={cx} cy={cy} r={hubR * 0.4} fill={stroke} stroke="none" opacity={0.7} />
    </g>
  );
}

/**
 * Single lotus petal — teardrop-shaped, its tip pointing at angle `angle`
 * (radians), anchored at (cx, cy).
 */
function lotusPetalPath(cx: number, cy: number, angle: number, length: number, width: number): string {
  const tipX = cx + Math.cos(angle) * length;
  const tipY = cy + Math.sin(angle) * length;
  const perp = angle + Math.PI / 2;
  const midR = length * 0.5;
  const sxA = cx + Math.cos(angle) * midR + Math.cos(perp) * width;
  const syA = cy + Math.sin(angle) * midR + Math.sin(perp) * width;
  const sxB = cx + Math.cos(angle) * midR - Math.cos(perp) * width;
  const syB = cy + Math.sin(angle) * midR - Math.sin(perp) * width;
  return `M ${cx} ${cy} Q ${sxA.toFixed(1)} ${syA.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${sxB.toFixed(1)} ${syB.toFixed(1)} ${cx} ${cy} Z`;
}

// ──────────────────────────────────────────────────────────────
// V1 — Classical Dharmachakra
// Centered 8-spoke wheel, single element, reverent simplicity.
function V1({ reducedMotion: _r }: VariantRenderProps) {
  return (
    <Svg>
      {/* Outer halo ring */}
      <circle cx={0} cy={0} r={460} fill="none" stroke={ORANGE_DIM} strokeWidth={1} />
      <circle cx={0} cy={0} r={400} fill="none" stroke={ORANGE_DIM} strokeWidth={0.6} opacity={0.6} />
      {/* Main wheel */}
      <DharmaWheel r={310} strokeWidth={3} stroke={ORANGE} opacity={0.72} />
      {/* Subtle overlaid wheel rotated 22.5° for depth */}
      <DharmaWheel r={310} strokeWidth={1.5} stroke={IVORY} opacity={0.22} rotate={22.5} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V2 — Wheel Above Lotus (rotate: 'none')
// Vertical composition: wheel floats in the upper third, lotus blooms below.
function V2({ reducedMotion: _r }: VariantRenderProps) {
  const basePetals = 8;
  const outerPetals = Array.from({ length: basePetals }, (_, i) => {
    const angle = (180 + (i - (basePetals - 1) / 2) * 22) * (Math.PI / 180);
    return lotusPetalPath(0, 260, angle, 280, 60);
  });
  const innerPetals = Array.from({ length: basePetals - 2 }, (_, i) => {
    const angle = (180 + (i - (basePetals - 3) / 2) * 26) * (Math.PI / 180);
    return lotusPetalPath(0, 260, angle, 180, 40);
  });
  return (
    <Svg>
      {/* Wheel — upper third */}
      <DharmaWheel cy={-180} r={170} strokeWidth={2.4} stroke={ORANGE} opacity={0.7} />
      {/* Glow ring around wheel */}
      <circle cx={0} cy={-180} r={205} fill="none" stroke={IVORY_DIM} strokeWidth={0.8} />
      {/* Lotus — lower half, anchored at (0, 260) */}
      <g fill="none" stroke={ORANGE} strokeWidth={1.8} opacity={0.55} strokeLinejoin="round">
        {outerPetals.map((d, i) => <path key={`op${i}`} d={d} />)}
      </g>
      <g fill="none" stroke={IVORY} strokeWidth={1.4} opacity={0.38} strokeLinejoin="round">
        {innerPetals.map((d, i) => <path key={`ip${i}`} d={d} />)}
      </g>
      {/* Base line — lotus pad hint */}
      <path d="M -320 260 Q 0 285 320 260" fill="none" stroke={ORANGE} strokeWidth={1.2} opacity={0.32} />
      {/* Lotus stem center dot */}
      <circle cx={0} cy={260} r={8} fill={IVORY} opacity={0.45} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V3 — Bodhi Leaf Frame (rotate: 'none')
// Heart-shaped bodhi leaf silhouette enclosing a central wheel.
function V3({ reducedMotion: _r }: VariantRenderProps) {
  // Bodhi leaf — heart shape with a pointed drip-tip at the bottom.
  // Drawn vertically (tip pointing down) using cubic Bezier curves.
  const leafPath = [
    'M 0 -420',              // top notch (cleft)
    'C 0 -380 0 -380 0 -380',
    'C -90 -440 -290 -340 -290 -170',
    'C -290 -40 -170 120 -50 240',
    'L 0 420',                // drip tip
    'L 50 240',
    'C 170 120 290 -40 290 -170',
    'C 290 -340 90 -440 0 -380',
    'C 0 -380 0 -380 0 -380',
    'Z',
  ].join(' ');
  // Leaf veins — radial-from-top pattern
  return (
    <Svg>
      {/* Outer faint aura */}
      <ellipse cx={0} cy={0} rx={355} ry={485} fill="none" stroke={ORANGE_DIM} strokeWidth={0.8} />
      {/* Leaf outline (double stroke for a vellum-leaf feel) */}
      <path d={leafPath} fill="none" stroke={ORANGE} strokeWidth={2.5} opacity={0.6} strokeLinejoin="round" />
      <path d={leafPath} fill="none" stroke={IVORY} strokeWidth={0.8} opacity={0.3} strokeLinejoin="round" />
      {/* Midrib (central vein, runs top to drip-tip) */}
      <path d="M 0 -380 L 0 420" stroke={ORANGE} strokeWidth={1.4} opacity={0.4} />
      {/* Side veins — 6 per side, fanning from midrib */}
      <g stroke={ORANGE} strokeWidth={0.9} opacity={0.3} fill="none">
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M 0 -300 Q ${s * 110} -260 ${s * 210} -190`} />
            <path d={`M 0 -200 Q ${s * 130} -150 ${s * 240} -70`} />
            <path d={`M 0 -90  Q ${s * 130} -30  ${s * 250} 50`} />
            <path d={`M 0 30   Q ${s * 120} 80   ${s * 220} 160`} />
            <path d={`M 0 150  Q ${s * 90}  180  ${s * 170} 230`} />
            <path d={`M 0 250  Q ${s * 50}  280  ${s * 100} 320`} />
          </g>
        ))}
      </g>
      {/* Inner wheel — smaller to sit inside the leaf body */}
      <DharmaWheel cy={-50} r={155} strokeWidth={2} stroke={IVORY} opacity={0.72} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V4 — Eightfold Path
// Small central wheel, 8 long path-lines extending to frame edge. Each ends
// in a small glyph mark (a tiny lotus-bud) representing one of the 8 paths.
function V4({ reducedMotion: _r }: VariantRenderProps) {
  const paths = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    const start = 140;
    const end = 460;
    const ex = Math.cos(a) * end;
    const ey = Math.sin(a) * end;
    return { a, x1: Math.cos(a) * start, y1: Math.sin(a) * start, x2: ex, y2: ey, ex, ey };
  });
  return (
    <Svg>
      {/* Faint containing ring */}
      <circle cx={0} cy={0} r={460} fill="none" stroke={ORANGE_DIM} strokeWidth={0.8} />
      <circle cx={0} cy={0} r={130} fill="none" stroke={ORANGE_DIM} strokeWidth={0.8} />
      {/* Path lines */}
      <g stroke={ORANGE} strokeLinecap="round" opacity={0.45}>
        {paths.map((p, i) => (
          <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} strokeWidth={1.6} />
        ))}
      </g>
      {/* Small lotus-bud glyphs at each path end */}
      {paths.map((p, i) => (
        <g key={`g${i}`} transform={`translate(${p.ex} ${p.ey}) rotate(${(p.a * 180) / Math.PI + 90})`}>
          <path
            d={lotusPetalPath(0, 0, -Math.PI / 2, 34, 10)}
            fill="none"
            stroke={IVORY}
            strokeWidth={1.4}
            opacity={0.7}
          />
          <circle cx={0} cy={0} r={4} fill={IVORY} opacity={0.7} />
        </g>
      ))}
      {/* Central wheel (small, focal) */}
      <DharmaWheel r={110} strokeWidth={2.4} stroke={ORANGE} opacity={0.7} />
      <DharmaWheel r={110} strokeWidth={1} stroke={IVORY} opacity={0.3} rotate={22.5} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V5 — Lotus Mandala
// Pure lotus meditation — no wheel. Three concentric petal rings: 8, 16, 32.
function V5({ reducedMotion: _r }: VariantRenderProps) {
  const outerPetals = Array.from({ length: 32 }, (_, i) => {
    const a = (i * (360 / 32) - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 460, 25);
  });
  const midPetals = Array.from({ length: 16 }, (_, i) => {
    const a = (i * (360 / 16) + 360 / 32 - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 340, 40);
  });
  const innerPetals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 215, 60);
  });
  return (
    <Svg>
      <g fill="none" stroke={ORANGE} strokeWidth={1} opacity={0.3} strokeLinejoin="round">
        {outerPetals.map((d, i) => <path key={`o${i}`} d={d} />)}
      </g>
      <g fill="none" stroke={ORANGE} strokeWidth={1.4} opacity={0.45} strokeLinejoin="round">
        {midPetals.map((d, i) => <path key={`m${i}`} d={d} />)}
      </g>
      <g fill="none" stroke={IVORY} strokeWidth={1.8} opacity={0.6} strokeLinejoin="round">
        {innerPetals.map((d, i) => <path key={`i${i}`} d={d} />)}
      </g>
      {/* Center — a small filled disc and ring */}
      <circle cx={0} cy={0} r={52} fill="none" stroke={IVORY} strokeWidth={1.6} opacity={0.6} />
      <circle cx={0} cy={0} r={18} fill={IVORY} opacity={0.5} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V6 — Thousand-Petal Lotus
// Dense radial lotus: 24 outer, 12 mid, 6 inner petals with a central bindu.
// Similar family to V5 but different density, petal proportions, and ring
// counts — reads distinct at a glance.
function V6({ reducedMotion: _r }: VariantRenderProps) {
  const outer = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 440, 38);
  });
  const mid = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 + 15 - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 285, 55);
  });
  const inner = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * (Math.PI / 180);
    return lotusPetalPath(0, 0, a, 160, 45);
  });
  // Thin decorative ring between outer and mid
  return (
    <Svg>
      <circle cx={0} cy={0} r={470} fill="none" stroke={ORANGE_DIM} strokeWidth={0.8} />
      <g fill="none" stroke={ORANGE} strokeWidth={1.2} opacity={0.35} strokeLinejoin="round">
        {outer.map((d, i) => <path key={`o${i}`} d={d} />)}
      </g>
      <circle cx={0} cy={0} r={300} fill="none" stroke={ORANGE} strokeWidth={0.6} opacity={0.28} />
      <g fill="none" stroke={IVORY} strokeWidth={1.6} opacity={0.5} strokeLinejoin="round">
        {mid.map((d, i) => <path key={`m${i}`} d={d} />)}
      </g>
      <circle cx={0} cy={0} r={170} fill="none" stroke={IVORY_DIM} strokeWidth={0.6} />
      <g fill={IVORY} fillOpacity={0.12} stroke={IVORY} strokeWidth={1.8} opacity={0.7} strokeLinejoin="round">
        {inner.map((d, i) => <path key={`i${i}`} d={d} />)}
      </g>
      {/* Bindu — the center point */}
      <circle cx={0} cy={0} r={30} fill="none" stroke={IVORY} strokeWidth={1.6} opacity={0.7} />
      <circle cx={0} cy={0} r={9} fill={IVORY} opacity={0.85} />
    </Svg>
  );
}

// ──────────────────────────────────────────────────────────────
// V7 — Stupa with Wheel Halo (rotate: 'none')
// Vertical stupa silhouette, wheel behind it as a halo.
function V7({ reducedMotion: _r }: VariantRenderProps) {
  // Stupa shape: square plinth, bell-shaped dome, spire with chattra rings, finial.
  return (
    <Svg>
      {/* Background halo — dharma wheel behind the dome */}
      <g transform="translate(0 -30)">
        <DharmaWheel r={280} strokeWidth={1.8} stroke={ORANGE} opacity={0.45} />
        <DharmaWheel r={280} strokeWidth={0.9} stroke={IVORY} opacity={0.22} rotate={22.5} />
      </g>
      {/* Ground line */}
      <line x1={-380} y1={360} x2={380} y2={360} stroke={ORANGE} strokeWidth={1.2} opacity={0.4} />
      <line x1={-300} y1={375} x2={300} y2={375} stroke={ORANGE} strokeWidth={0.6} opacity={0.22} />
      {/* Plinth (square base) */}
      <rect x={-130} y={230} width={260} height={130} fill="none" stroke={IVORY} strokeWidth={2} opacity={0.6} />
      <rect x={-110} y={210} width={220} height={25} fill="none" stroke={IVORY} strokeWidth={1.5} opacity={0.55} />
      {/* Dome (bell) */}
      <path d="M -160 210 Q -160 40 0 40 Q 160 40 160 210 Z" fill="none" stroke={IVORY} strokeWidth={2.2} opacity={0.65} />
      <path d="M -130 210 Q -130 65 0 65 Q 130 65 130 210" fill="none" stroke={IVORY} strokeWidth={0.8} opacity={0.3} />
      {/* Harmika (square box atop dome) */}
      <rect x={-40} y={-5} width={80} height={45} fill="none" stroke={IVORY} strokeWidth={1.8} opacity={0.6} />
      {/* Spire with chattra (3 diminishing rings) */}
      <path d="M -20 -5 L 20 -5" stroke={IVORY} strokeWidth={1.4} opacity={0.5} />
      <path d="M 0 -5 L 0 -220" stroke={IVORY} strokeWidth={2} opacity={0.65} />
      <ellipse cx={0} cy={-60}  rx={32} ry={7} fill="none" stroke={IVORY} strokeWidth={1.5} opacity={0.6} />
      <ellipse cx={0} cy={-100} rx={26} ry={6} fill="none" stroke={IVORY} strokeWidth={1.4} opacity={0.55} />
      <ellipse cx={0} cy={-140} rx={20} ry={5} fill="none" stroke={IVORY} strokeWidth={1.3} opacity={0.5} />
      <ellipse cx={0} cy={-175} rx={14} ry={4} fill="none" stroke={IVORY} strokeWidth={1.2} opacity={0.45} />
      {/* Finial — a small lotus-bud at the tip */}
      <path
        d={lotusPetalPath(0, -220, -Math.PI / 2, 30, 9)}
        fill="none"
        stroke={ORANGE}
        strokeWidth={1.6}
        opacity={0.7}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-220} r={4} fill={ORANGE} opacity={0.8} />
    </Svg>
  );
}

export const buddhismConfig: BeliefBackgroundConfig = {
  gradient:
    'radial-gradient(ellipse at 50% 42%, rgba(110,62,20,0.5) 0%, rgba(52,26,8,0.85) 36%, rgba(16,10,4,1) 72%, #0b0704 100%)',
  accent: ORANGE,
  accentSecondary: IVORY,
  particleColor: 'rgba(255, 245, 220, 0.45)',
  particleCount: 20,
  variants: [
    { id: 'buddhism-v1', name: 'Classical Dharmachakra',   SymbolLayer: V1 },
    { id: 'buddhism-v2', name: 'Wheel Above Lotus',        SymbolLayer: V2, rotate: 'none' },
    { id: 'buddhism-v3', name: 'Bodhi Leaf',               SymbolLayer: V3, rotate: 'none' },
    { id: 'buddhism-v4', name: 'Eightfold Path',           SymbolLayer: V4 },
    { id: 'buddhism-v5', name: 'Lotus Mandala',            SymbolLayer: V5 },
    { id: 'buddhism-v6', name: 'Thousand-Petal Lotus',     SymbolLayer: V6 },
    { id: 'buddhism-v7', name: 'Stupa with Wheel Halo',    SymbolLayer: V7, rotate: 'none' },
  ],
};
