#!/usr/bin/env node
/* =========================================================
   Optimiza todas las imágenes de la app (sin descargas externas).

   Uso:   npm install
          npm run images                 (regenera todas)
          npm run images -- --only=tren,cafe

   Para cada clave de DSV.images (js/config.js):
     1. Lee assets/img/source/<clave>.(jpg|jpeg|png|webp|avif).
     2. Genera AVIF + WebP en 640 / 1024 / 1600 / 2400 px y en su ancho original (sin ampliar nunca).
     3. Genera un placeholder difuminado diminuto (base64) para la carga.
     4. Escribe assets/img/manifest.js, que la app lee automáticamente.
   ========================================================= */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/img');
const SRC = path.join(OUT, 'source');
const WIDTHS = [640, 1024, 1600, 2400];
const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

// Lee el catálogo directamente de js/config.js (única fuente de verdad).
const ctx = { window: {} }; ctx.DSV = ctx.window.DSV = {};
vm.runInNewContext(await fs.readFile(path.join(ROOT, 'js/config.js'), 'utf8'), ctx);
const catalog = ctx.DSV.images;

await fs.mkdir(SRC, { recursive: true });

async function findSource(key) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif']) {
    const p = path.join(SRC, `${key}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

const manifestPath = path.join(OUT, 'manifest.js');
let previous = { images: {} };
if (existsSync(manifestPath)) {
  const c = { window: {} };
  try { vm.runInNewContext(await fs.readFile(manifestPath, 'utf8'), c); previous = c.window.DSV_IMAGE_MANIFEST || previous; } catch {}
}
const images = { ...previous.images };
let ok = 0, failed = [];

for (const [key, def] of Object.entries(catalog)) {
  if (only.length && !only.includes(key)) continue;
  try {
    const src = await findSource(key);
    if (!src) throw new Error(`falta assets/img/source/${key}.jpg`);
    process.stdout.write(`• ${key} … `);

    const img = sharp(src, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const w0 = meta.width, h0 = meta.height;
    if (!w0 || w0 < 1000) console.warn(`\n  ⚠ ${key}: la imagen original mide ${w0}px de ancho; se verá blanda en pantallas grandes.`);
    const widths = WIDTHS.filter(w => w < w0 - 40);
    widths.push(w0);   // siempre el ancho nativo, para no perder nitidez en pantallas grandes

    for (const w of widths) {
      const base = sharp(src, { failOn: 'none' }).rotate().resize({ width: w, withoutEnlargement: true });
      await base.clone().webp({ quality: 74, effort: 5, smartSubsample: true }).toFile(path.join(OUT, `${key}-${w}.webp`));
      await base.clone().avif({ quality: 52, effort: 4 }).toFile(path.join(OUT, `${key}-${w}.avif`));
    }
    const lq = await sharp(src, { failOn: 'none' }).rotate().resize({ width: 32 }).webp({ quality: 40 }).toBuffer();
    images[key] = { widths, avif: true, width: w0, height: h0, lqip: `data:image/webp;base64,${lq.toString('base64')}` };
    ok++;
    console.log(`listo (${widths.join(', ')} px)`);
  } catch (e) {
    failed.push(key);
    console.log(`\n  ✗ ${key}: ${e.message}`);
  }
}

const manifest = { generatedAt: new Date().toISOString(), images };
await fs.writeFile(manifestPath, `/* Generado por scripts/fetch-images.mjs — no editar a mano. */\nwindow.DSV_IMAGE_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`);

const missing = Object.keys(catalog).filter(k => !images[k]);
console.log(`\n${ok} imágenes procesadas.${failed.length ? ` Fallaron: ${failed.join(', ')}.` : ''}`);
if (missing.length) console.log(`Faltan en el manifiesto: ${missing.join(', ')} (la app mostrará el degradado atmosférico en su lugar).`);
else console.log('Las imágenes están completas en assets/img.');
