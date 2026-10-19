#!/usr/bin/env node
/**
 * Hace repetibles (sin costuras) las texturas de terreno de public/sprites/terrain/.
 *
 *   npm run fix-textures            procesa las texturas nuevas o cambiadas
 *   npm run fix-textures -- --check solo informa (cuadradas, tamaño, costuras), no toca nada
 *   npm run fix-textures -- --force vuelve a procesar todas desde los originales
 *   npm run fix-textures -- --no-flatten no iguala la luz (deja viñetas y degradados grandes)
 *   npm run fix-textures -- otra/carpeta
 *
 * Cómo funciona: desplaza la imagen un 50 % en ambos sentidos (los bordes, que ahora
 * encajan, quedan en el centro formando una cruz) y funde esa cruz con copias
 * desplazadas solo en horizontal, solo en vertical o sin desplazar. Cada copia tiene
 * sus costuras en un sitio distinto y se usa con peso 0 justo allí, así que el
 * resultado encaja consigo mismo por los cuatro lados. La mezcla conserva el
 * contraste para que la franja fundida no quede borrosa. Antes iguala la luz: las
 * imágenes generadas suelen traer el centro más claro que los bordes (viñeta) y, al
 * repetirse, eso formaría una cuadrícula de manchas.
 *
 * El original se guarda en art-src/terrain/ y el script recuerda qué ha procesado
 * (art-src/terrain/.fixed.json): ejecutarlo dos veces no estropea nada, y si
 * cambias una imagen por otra nueva la procesa de nuevo.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const check = args.includes('--check');
const force = args.includes('--force');
const flatten = !args.includes('--no-flatten');
const dir = resolve(args.find(a => !a.startsWith('--')) ?? 'public/sprites/terrain');
const backupDir = resolve('art-src/terrain');
const stateFile = join(backupDir, '.fixed.json');
const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
/** Semiancho (fracción de la imagen) de la franja fundida alrededor de cada costura. */
const BAND = 0.14;

if (!existsSync(dir)) {
  console.log(`No existe ${dir}. Deja ahí las texturas (grass.png, dirt.png...) y vuelve a ejecutar.`);
  process.exit(0);
}

const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
const sha = buf => createHash('sha1').update(buf).digest('hex');
const files = readdirSync(dir).filter(f => EXTS.has(extname(f).toLowerCase())).sort();
if (!files.length) console.log(`No hay imágenes en ${dir}.`);

let warnings = 0, changed = 0;
for (const f of files) {
  const file = join(dir, f);
  const buf = readFileSync(file);
  const img = sharp(buf);
  const meta = await img.metadata();
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const notes = [];
  if (W !== H) { notes.push(`⚠ no es cuadrada (${W}x${H}): el juego la estirará a un cuadrado`); warnings++; }
  else if (W < 512) notes.push(`⚠ pequeña (${W} px): se recomienda 1024`);
  const before = seamScore(data, W, H, C);
  const done = state[f] === sha(buf);

  if (check || (done && !force)) {
    const status = done ? 'ya repetible' : before > 1.6 ? `costura visible (${before.toFixed(1)}x)` : `parece repetible (${before.toFixed(1)}x)`;
    console.log(`${f}: ${W}x${H} ${meta.format} · ${status}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
    continue;
  }

  // Siempre se parte del original (si ya se había procesado y no ha cambiado)
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, f);
  let src = data;
  if (done && existsSync(backup)) {
    src = (await sharp(readFileSync(backup)).removeAlpha().resize(W, H, { fit: 'fill' }).raw().toBuffer());
  } else {
    copyFileSync(file, backup);
  }

  const original = src === data ? before : seamScore(src, W, H, C);
  const out = makeSeamless(src, W, H, C);
  let pipe = sharp(out, { raw: { width: W, height: H, channels: C } });
  const ext = extname(f).toLowerCase();
  if (ext === '.png') pipe = pipe.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipe = pipe.webp({ quality: 92 });
  else pipe = pipe.jpeg({ quality: 92, mozjpeg: true });
  const result = await pipe.toBuffer();
  const tmp = file + '.tmp';
  writeFileSync(tmp, result);
  renameSync(tmp, file);
  state[f] = sha(result);
  changed++;
  const after = seamScore(out, W, H, C);
  console.log(`${f}: ${W}x${H} · costura ${original.toFixed(1)}x → ${after.toFixed(1)}x · original en art-src/terrain/${basename(f)}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
}

if (!check && changed) {
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}
if (warnings) console.log(`\n${warnings} textura(s) no son cuadradas. Recórtalas a un cuadrado (idealmente 1024x1024).`);

/**
 * Cuánto más se nota el salto entre el borde derecho y el izquierdo (y entre el de abajo
 * y el de arriba) que el que hay entre dos columnas/filas vecinas del interior. ~1 = sin costura.
 */
function seamScore(px, W, H, C) {
  const at = (x, y, c) => px[(y * W + x) * C + c];
  const colDiff = (x0, x1) => { let s = 0; for (let y = 0; y < H; y++) for (let c = 0; c < 3 && c < C; c++) s += Math.abs(at(x0, y, c) - at(x1, y, c)); return s / H; };
  const rowDiff = (y0, y1) => { let s = 0; for (let x = 0; x < W; x++) for (let c = 0; c < 3 && c < C; c++) s += Math.abs(at(x, y0, c) - at(x, y1, c)); return s / W; };
  let inner = 0, n = 0;
  for (let k = 1; k < 8; k++) {
    const x = Math.floor((W * k) / 8), y = Math.floor((H * k) / 8);
    inner += colDiff(x, x - 1) + rowDiff(y, y - 1); n += 2;
  }
  inner /= n;
  const seam = (colDiff(W - 1, 0) + rowDiff(H - 1, 0)) / 2;
  return seam / Math.max(1e-3, inner);
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Peso de la copia sin desplazar en un eje: 1 en el centro (donde la copia desplazada
 * tiene su costura), 0 fuera de la franja central (y por tanto en los bordes).
 */
function edgeWeights(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 1 - smoothstep(0, BAND, Math.abs((i + 0.5) / n - 0.5));
  return w;
}

/** Desenfoque de caja separable y periódico (los bordes dan la vuelta), aplicado dos veces. */
function blurWrap(px, W, H, C, r) {
  let a = Float32Array.from(px), b = new Float32Array(px.length);
  const n = 2 * r + 1;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) for (let c = 0; c < C; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[(y * W + ((k % W) + W) % W) * C + c];
      for (let x = 0; x < W; x++) {
        b[(y * W + x) * C + c] = s / n;
        s += a[(y * W + (x + r + 1) % W) * C + c] - a[(y * W + ((x - r) % W + W) % W) * C + c];
      }
    }
    for (let x = 0; x < W; x++) for (let c = 0; c < C; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[((((k % H) + H) % H) * W + x) * C + c];
      for (let y = 0; y < H; y++) {
        a[(y * W + x) * C + c] = s / n;
        s += b[(((y + r + 1) % H) * W + x) * C + c] - b[((((y - r) % H) + H) % H * W + x) * C + c];
      }
    }
  }
  return a;
}

/** Quita la variación de luz a gran escala (viñetas, degradados), manteniendo el color medio. */
function flattenLight(px, W, H, C) {
  const big = blurWrap(px, W, H, C, Math.round(W / 10));
  const mean = new Float64Array(C);
  for (let i = 0; i < px.length; i++) mean[i % C] += px[i];
  for (let c = 0; c < C; c++) mean[c] /= W * H;
  const out = Buffer.alloc(px.length);
  for (let i = 0; i < px.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(px[i] - big[i] + mean[i % C])));
  return out;
}

function makeSeamless(px, W, H, C) {
  if (flatten) px = flattenLight(px, W, H, C);
  const wx = edgeWeights(W), wy = edgeWeights(H);
  const hx = W >> 1, hy = H >> 1;
  // Los tonos grandes (manchas, degradados de luz) se funden de forma lineal y suave;
  // el detalle fino se funde conservando su contraste para que no quede borroso.
  const low = blurWrap(px, W, H, C, Math.max(2, Math.round(W / 48)));
  const out = Buffer.alloc(px.length);
  for (let y = 0; y < H; y++) {
    const y1 = (y + hy) % H;
    for (let x = 0; x < W; x++) {
      const x1 = (x + hx) % W;
      // Cuatro copias: sin desplazar (w00), desplazada en x (w10), en y (w01) y en ambos (w11)
      const w00 = wx[x] * wy[y], w10 = (1 - wx[x]) * wy[y], w01 = wx[x] * (1 - wy[y]), w11 = (1 - wx[x]) * (1 - wy[y]);
      const norm = 1 / Math.sqrt(w00 * w00 + w10 * w10 + w01 * w01 + w11 * w11);
      const i00 = (y * W + x) * C, i10 = (y * W + x1) * C, i01 = (y1 * W + x) * C, i11 = (y1 * W + x1) * C;
      for (let c = 0; c < C; c++) {
        const l = w00 * low[i00 + c] + w10 * low[i10 + c] + w01 * low[i01 + c] + w11 * low[i11 + c];
        const h = w00 * (px[i00 + c] - low[i00 + c]) + w10 * (px[i10 + c] - low[i10 + c])
          + w01 * (px[i01 + c] - low[i01 + c]) + w11 * (px[i11 + c] - low[i11 + c]);
        out[i00 + c] = Math.max(0, Math.min(255, Math.round(l + h * norm)));
      }
    }
  }
  return out;
}
