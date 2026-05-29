#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPRITES_DIR = join(__dirname, "..", "public", "sprites");

const WEBP_QUALITY = 80;
const AVIF_QUALITY = 50;

async function main() {
  const avif = process.argv.includes("--avif");
  const files = await readdir(SPRITES_DIR);
  const pngs = files.filter((f) => f.endsWith(".png"));

  console.log(`Found ${pngs.length} PNG sprites in ${SPRITES_DIR}`);

  let webpBytes = 0;
  let pngBytes = 0;

  for (const png of pngs) {
    const input = join(SPRITES_DIR, png);
    const base = png.replace(/\.png$/, "");
    const inputSize = (await stat(input)).size;
    pngBytes += inputSize;

    const webpOut = join(SPRITES_DIR, `${base}.webp`);
    const { size: webpSize } = await sharp(input).webp({ quality: WEBP_QUALITY }).toFile(webpOut);
    webpBytes += webpSize;

    const pct = Math.round((1 - webpSize / inputSize) * 100);
    process.stdout.write(`  ${png} -> .webp  ${fmt(inputSize)} -> ${fmt(webpSize)} (${pct}% smaller)\n`);

    if (avif) {
      const avifOut = join(SPRITES_DIR, `${base}.avif`);
      await sharp(input).avif({ quality: AVIF_QUALITY }).toFile(avifOut);
    }
  }

  console.log(`\nDone: ${pngs.length} WebP files created`);
  console.log(`  PNG total:  ${fmt(pngBytes)}`);
  console.log(`  WebP total: ${fmt(webpBytes)} (${Math.round((1 - webpBytes / pngBytes) * 100)}% smaller)`);
  if (avif) console.log(`  AVIF files also created (--avif)`);
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
