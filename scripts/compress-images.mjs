#!/usr/bin/env node
// One-off perf script. Re-encodes public/images/**/*.jpg at quality 80
// with mozjpeg encoding (progressive). Only writes back when smaller.
import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'public/images';
const QUALITY = 80;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && /\.jpe?g$/i.test(e.name)) out.push(p);
  }
  return out;
}

let beforeTotal = 0;
let afterTotal = 0;
const files = await walk(ROOT);
for (const f of files) {
  const src = await readFile(f);
  const before = src.length;
  const out = await sharp(src)
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toBuffer();
  if (out.length < before) {
    await writeFile(f, out);
    beforeTotal += before;
    afterTotal += out.length;
    const pct = ((1 - out.length / before) * 100).toFixed(1);
    console.log(`${f}  ${(before / 1024).toFixed(0)}kB -> ${(out.length / 1024).toFixed(0)}kB  (-${pct}%)`);
  } else {
    beforeTotal += before;
    afterTotal += before;
    console.log(`${f}  unchanged (already smaller)`);
  }
}
console.log('---');
console.log(
  `TOTAL  ${(beforeTotal / 1024 / 1024).toFixed(2)}MB -> ${(afterTotal / 1024 / 1024).toFixed(2)}MB  (saved ${((beforeTotal - afterTotal) / 1024 / 1024).toFixed(2)}MB)`
);
