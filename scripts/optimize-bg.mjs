#!/usr/bin/env node
// Convert + optimize a single image: PNG/JPG → JPG with mozjpeg q80,
// resized to a sensible web-bg size, output under 400KB.
// Usage: node scripts/optimize-bg.mjs <input> <output>

import sharp from 'sharp';
import { statSync } from 'fs';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: optimize-bg.mjs <input> <output>');
  process.exit(1);
}

const TARGET_W = 1080; // 9:16 mobile-quality background; covers iPhone 14 Pro 3x exactly
const TARGET_H = 1920;
const MAX_BYTES = 400 * 1024;

async function run() {
  let quality = 80;
  while (quality >= 50) {
    await sharp(input)
      .resize({ width: TARGET_W, height: TARGET_H, fit: 'cover', position: 'top' })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toFile(output);
    const size = statSync(output).size;
    if (size <= MAX_BYTES) {
      console.log(`${output} → ${(size / 1024).toFixed(0)}KB @ q${quality}`);
      return;
    }
    quality -= 5;
  }
  console.error(`${output}: could not get under ${MAX_BYTES} even at q50`);
  process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
