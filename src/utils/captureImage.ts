/**
 * Canvas-based capture image generator.
 *
 * Renders a 1080×1920 (9:16) PNG using the native Canvas API — no
 * html2canvas dependency, because we want full control over typography
 * and the composition is small enough (two text blocks + a wordmark)
 * that imperative canvas drawing is both faster and lighter than
 * DOM-serialization.
 *
 * Layout (top to bottom):
 *   [safe top]               → 140px
 *   Question  (Outfit 400 italic, muted)
 *   [gap]                    → 80px
 *   God's reply (Cormorant Garamond 300, full-strength)
 *   [flex space]
 *   AImighty wordmark
 *   aimightyme.com
 *   [safe bottom]            → 120px
 *
 * Text auto-shrinks up to 30% and grows up to 20% to absorb replies that
 * run unusually long or short. Multi-paragraph replies preserve their
 * breaks. A subtle radial glow blooms from center-top using the belief's
 * `glow` color. A faint film-grain overlay is drawn last for texture.
 */

import type { BeliefTheme } from '../config/beliefThemes';

export interface CaptureRenderOptions {
  question: string;
  reply: string;
  theme: BeliefTheme;
  /** Device pixel ratio for export. 1 = 1080×1920, 2 = 2160×3840. Default 1. */
  scale?: number;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Target font sizes. The layout engine below scales these up/down to fit.
const QUESTION_FONT_BASE = 34;
const QUESTION_FONT_MIN = 26;
// Reply is fit via binary search across [min, max]; no separate base constant.
const REPLY_FONT_MIN = 34; // ~30% shrink floor (relative to a ~48px base)
const REPLY_FONT_MAX = 58; // ~20% grow ceiling

const SAFE_TOP = 140;
const SAFE_BOTTOM = 120;
const SIDE_PADDING = 100;
const QUESTION_TO_REPLY_GAP = 80;
const WORDMARK_GAP = 40;

/**
 * Wait for the two custom fonts to be loaded before drawing. Canvas
 * silently falls back to the default serif/sans if the font isn't
 * ready, and the resulting capture looks wrong. Call `preloadCaptureFonts`
 * once at app boot so this becomes a near-instant `.ready` check.
 */
export async function preloadCaptureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // Warm the font cache by requesting the exact weights/styles used below.
    await Promise.all([
      document.fonts.load("300 48px 'Cormorant Garamond'"),
      document.fonts.load("400 italic 34px Outfit"),
      document.fonts.load('500 40px Outfit'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    console.warn('[captureImage] font preload failed, falling back:', e);
  }
}

/**
 * Wrap `text` into lines that fit within `maxWidth` at the current font.
 * Preserves explicit newlines as paragraph breaks so God's reply keeps
 * its rhythm in the capture.
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const words = paragraphs[pi].trim().split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    if (pi < paragraphs.length - 1) lines.push(''); // blank line = paragraph break
  }
  return lines;
}

/**
 * Binary-search the largest reply font size that fits inside `availableHeight`
 * at the given line-height ratio, clamped to [min, max]. Returns the font px
 * value and the resulting wrapped lines.
 */
function fitReplyToHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  availableHeight: number,
  fontMin: number,
  fontMax: number,
  lineHeightRatio: number
): { fontPx: number; lines: string[] } {
  let lo = fontMin;
  let hi = fontMax;
  let bestFont = fontMin;
  let bestLines: string[] = [];

  // 11 iterations is enough for 1px precision in the [min, max] range.
  for (let i = 0; i < 11; i++) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `300 ${mid}px 'Cormorant Garamond', Georgia, serif`;
    const lines = wrapLines(ctx, text, maxWidth);
    const height = lines.length * mid * lineHeightRatio;
    if (height <= availableHeight) {
      bestFont = mid;
      bestLines = lines;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
    if (lo > hi) break;
  }

  if (!bestLines.length) {
    // Even min font overflowed — use min, let it clip rather than vanish.
    ctx.font = `300 ${fontMin}px 'Cormorant Garamond', Georgia, serif`;
    bestLines = wrapLines(ctx, text, maxWidth);
    bestFont = fontMin;
  }
  return { fontPx: bestFont, lines: bestLines };
}

function drawBackground(ctx: CanvasRenderingContext2D, theme: BeliefTheme): void {
  // Radial glow from upper-center outward, dissolving into the bg.
  const gradient = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H * 0.25, 0,
    CANVAS_W / 2, CANVAS_H * 0.25, CANVAS_W * 0.9
  );
  gradient.addColorStop(0, theme.glow);
  gradient.addColorStop(0.55, theme.bg);
  gradient.addColorStop(1, theme.bg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Vignette at the bottom for wordmark legibility.
  const vignette = ctx.createLinearGradient(0, CANVAS_H * 0.7, 0, CANVAS_H);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, CANVAS_H * 0.7, CANVAS_W, CANVAS_H * 0.3);
}

/**
 * Subtle film-grain overlay — 1% opacity noise gives the capture a tactile,
 * less-plastic feel and helps it not look like AI-generated slop on Instagram.
 * Skip on low-power devices where the noise fill is too expensive.
 */
function drawGrain(ctx: CanvasRenderingContext2D): void {
  const density = 0.012; // ~1.2% of pixels get a noise dot
  const count = Math.floor(CANVAS_W * CANVAS_H * density);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * CANVAS_W;
    const y = Math.random() * CANVAS_H;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawWordmark(ctx: CanvasRenderingContext2D, theme: BeliefTheme): void {
  const bottomY = CANVAS_H - SAFE_BOTTOM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // "AImighty" — "AI" in glow gold, "mighty" in primary text color.
  ctx.font = "500 52px 'Cormorant Garamond', Georgia, serif";
  const aiText = 'AI';
  const mightyText = 'mighty';
  const aiWidth = ctx.measureText(aiText).width;
  const mightyWidth = ctx.measureText(mightyText).width;
  const totalWidth = aiWidth + mightyWidth;
  const startX = (CANVAS_W - totalWidth) / 2;
  const wordmarkY = bottomY - WORDMARK_GAP - 28;

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.secondary;
  ctx.fillText(aiText, startX, wordmarkY);
  ctx.fillStyle = theme.primary;
  ctx.fillText(mightyText, startX + aiWidth, wordmarkY);

  // URL below
  ctx.textAlign = 'center';
  ctx.font = '400 24px Outfit, system-ui, sans-serif';
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.7;
  ctx.fillText('aimightyme.com', CANVAS_W / 2, bottomY);
  ctx.globalAlpha = 1;
}

/**
 * Render the capture to an offscreen canvas and return a Blob (PNG).
 * Resolves with the blob ready to download, share, or preview.
 */
export async function renderCaptureBlob(
  opts: CaptureRenderOptions
): Promise<Blob> {
  const { question, reply, theme, scale = 1 } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W * scale;
  canvas.height = CANVAS_H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.scale(scale, scale);

  // Prefer crisp-edges text rendering for social-feed viewing on phones.
  ctx.textRendering = 'optimizeLegibility';
  ctx.imageSmoothingQuality = 'high';

  drawBackground(ctx, theme);

  const maxTextWidth = CANVAS_W - SIDE_PADDING * 2;

  // 1) Measure the question block at base size. Shrink if it wraps past 3 lines.
  let questionFont = QUESTION_FONT_BASE;
  ctx.font = `italic 400 ${questionFont}px Outfit, system-ui, sans-serif`;
  let questionLines = wrapLines(ctx, question, maxTextWidth);
  while (questionLines.length > 3 && questionFont > QUESTION_FONT_MIN) {
    questionFont -= 2;
    ctx.font = `italic 400 ${questionFont}px Outfit, system-ui, sans-serif`;
    questionLines = wrapLines(ctx, question, maxTextWidth);
  }
  const questionLineHeight = questionFont * 1.35;
  const questionBlockHeight = questionLines.length * questionLineHeight;

  // 2) Compute the vertical budget for the reply.
  const replyBlockTop = SAFE_TOP + questionBlockHeight + QUESTION_TO_REPLY_GAP;
  const replyBlockBottom = CANVAS_H - SAFE_BOTTOM - WORDMARK_GAP - 100; // wordmark + url
  const replyAvailable = replyBlockBottom - replyBlockTop;

  // 3) Fit the reply with binary search across [min, max].
  const { fontPx: replyFont, lines: replyLines } = fitReplyToHeight(
    ctx, reply, maxTextWidth, replyAvailable, REPLY_FONT_MIN, REPLY_FONT_MAX, 1.4
  );
  const replyLineHeight = replyFont * 1.4;

  // 4) Draw question (center-aligned, muted).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `italic 400 ${questionFont}px Outfit, system-ui, sans-serif`;
  ctx.fillStyle = theme.secondary;
  ctx.globalAlpha = 0.8;
  questionLines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, SAFE_TOP + i * questionLineHeight);
  });
  ctx.globalAlpha = 1;

  // 5) Draw reply (center-aligned, full strength, Cormorant 300).
  ctx.font = `300 ${replyFont}px 'Cormorant Garamond', Georgia, serif`;
  ctx.fillStyle = theme.primary;
  // Center the reply block vertically inside its available space so
  // short replies don't sit awkwardly at the top of a huge empty region.
  const replyTotalHeight = replyLines.length * replyLineHeight;
  const replyStartY = replyBlockTop + Math.max(0, (replyAvailable - replyTotalHeight) / 2);
  replyLines.forEach((line, i) => {
    if (!line) return; // paragraph spacer
    ctx.fillText(line, CANVAS_W / 2, replyStartY + i * replyLineHeight);
  });

  // 6) Wordmark + URL at bottom.
  drawWordmark(ctx, theme);

  // 7) Film grain last so it sits on top of everything.
  drawGrain(ctx);

  // Export.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/png',
      0.95
    );
  });
}
