#!/usr/bin/env node
/**
 * Convierte una imagen generada (varias piezas sobre fondo blanco) en sprites del juego.
 *
 *   npm run art-import -- art-src/import/pack3-edad-oscura.json
 *   npm run art-import -- <config.json> --entrada <carpeta con las imágenes>
 *
 * Para cada pieza: quita el fondo blanco (también los huecos blancos cerrados, como
 * entre las aspas de un molino), suaviza el borde sin halo blanco, separa las piezas
 * por la cuadrícula, sustituye el magenta por gris claro y crea con él la máscara del
 * color del jugador, escala la pieza a su tamaño en casillas (a 2x), calcula el punto
 * de apoyo y escribe el PNG, la máscara y el JSON en public/sprites/<out>/.
 * También deja una vista previa con la huella dibujada en art-src/preview/.
 *
 * Formato del archivo de configuración:
 * {
 *   "source": "pack3-edificios/pack3_edificios.jpg",  ← relativo a la carpeta de entrada
 *   "grid": [3, 2],                                    ← columnas y filas de la imagen
 *   "kind": "building" | "unit" | "resource",
 *   "out": "buildings",                                ← carpeta dentro de public/sprites/
 *   "age": 0,                                          ← (edificios) edad de esta versión
 *   "items": [                                         ← en orden de lectura; null = saltar
 *     { "id": "house", "size": 2 },                    ← edificio de 2x2 casillas
 *     { "id": "mill", "size": 2, "fit": 1.3, "dy": 6 } ← fit: ancho de la pieza / ancho de la huella
 *   ]                                                     dx, dy: mover el apoyo (px de la salida)
 * }
 * Unidades y recursos: { "id": "oak1", "height": 80 } (alto en px a zoom 1).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const configPath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--entrada');
if (!configPath) { console.log('Uso: npm run art-import -- <config.json> [--entrada carpeta]'); process.exit(1); }
const entradaArg = args.includes('--entrada') ? args[args.indexOf('--entrada') + 1] : null;
const entrada = resolve(entradaArg ?? 'art-src/entrada');
const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
const SCALE = 2;
const srcFile = join(entrada, cfg.source);
if (!existsSync(srcFile)) { console.log(`No encuentro ${srcFile}`); process.exit(1); }

const { data, info } = await sharp(srcFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const N = W * H;
const px = i => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];

// ------------------------------------------------------------ fondo
/** Casi blanco y sin color (el JPG deja ruido cerca del blanco). */
const whiteish = (i, min) => {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  return Math.min(r, g, b) >= min && Math.max(r, g, b) - Math.min(r, g, b) <= 22;
};
const bg = new Uint8Array(N);
{
  const q = [];
  for (let x = 0; x < W; x++) { q.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { q.push(y * W, y * W + W - 1); }
  for (const i of q) bg[i] = whiteish(i, 232) ? 1 : 0;
  const stack = q.filter(i => bg[i]);
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!bg[n] && whiteish(n, 232)) { bg[n] = 1; stack.push(n); }
    }
  }
  // Huecos blancos cerrados (entre aspas, vallas...): regiones de blanco casi puro
  const seen = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (bg[i] || seen[i] || !whiteish(i, 240)) continue;
    const region = [i]; seen[i] = 1; let sum = 0;
    for (let k = 0; k < region.length; k++) {
      const j = region[k], x = j % W, y = (j / W) | 0;
      const [r, g, b] = px(j); sum += (r + g + b) / 3;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (!seen[n] && !bg[n] && whiteish(n, 240)) { seen[n] = 1; region.push(n); }
      }
    }
    if (region.length >= 12 && sum / region.length >= 247) for (const j of region) bg[j] = 1;
  }
}

// ------------------------------------------------------------ borde suave sin halo blanco
const rgba = Buffer.alloc(N * 4);
{
  // distancia (en px, hasta 3) al fondo
  const dist = new Uint8Array(N).fill(255);
  let front = [];
  for (let i = 0; i < N; i++) if (bg[i]) { dist[i] = 0; front.push(i); }
  for (let d = 1; d <= 3; d++) {
    const next = [];
    for (const i of front) {
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (dist[n] > d) { dist[n] = d; next.push(n); }
      }
    }
    front = next;
  }
  for (let i = 0; i < N; i++) {
    const [r, g, b] = px(i);
    if (bg[i]) continue;
    let a = 1, f = [r, g, b];
    if (dist[i] <= 2) {
      // Color del interior más cercano: el borde es ese color mezclado con blanco
      const x = i % W, y = (i / W) | 0;
      let best = null, bd = 1e9;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (dist[n] < 3) continue;
        const dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = n; }
      }
      if (best !== null) {
        const c = px(best);
        let num = 0, den = 0;
        for (let k = 0; k < 3; k++) { num += 255 - [r, g, b][k]; den += 255 - c[k]; }
        a = den > 30 ? Math.max(0, Math.min(1, num / den)) : 1;
        if (a > 0.02) f = [r, g, b].map((v, k) => Math.max(0, Math.min(255, (v - (1 - a) * 255) / a)));
        f = f.map((v, k) => v * 0.5 + c[k] * 0.5);
      }
    }
    rgba[i * 4] = f[0]; rgba[i * 4 + 1] = f[1]; rgba[i * 4 + 2] = f[2]; rgba[i * 4 + 3] = Math.round(a * 255);
  }
}

// ------------------------------------------------------------ piezas por casilla de la cuadrícula
const [GC, GR] = cfg.grid ?? [1, 1];
const comp = new Int32Array(N).fill(-1);
const boxes = [];
for (let i = 0; i < N; i++) {
  if (rgba[i * 4 + 3] < 8 || comp[i] >= 0) continue;
  const id = boxes.length, st = [i];
  comp[i] = id;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  while (st.length) {
    const j = st.pop(), x = j % W, y = (j / W) | 0;
    n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (comp[k] < 0 && rgba[k * 4 + 3] >= 8) { comp[k] = id; st.push(k); }
    }
  }
  boxes.push({ x0, y0, x1, y1, n });
}
const cells = Array.from({ length: GC * GR }, () => []);
boxes.forEach((b, id) => {
  if (b.n < 40) return; // motas sueltas
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const c = Math.min(GC - 1, Math.floor((cx / W) * GC)), r = Math.min(GR - 1, Math.floor((cy / H) * GR));
  cells[r * GC + c].push(id);
});

// ------------------------------------------------------------ salida
const outDir = resolve('public/sprites', cfg.out);
mkdirSync(outDir, { recursive: true });
const previewDir = resolve('art-src/preview');
mkdirSync(previewDir, { recursive: true });
const previews = [];

for (let k = 0; k < cfg.items.length; k++) {
  const item = cfg.items[k];
  if (!item) continue;
  const ids = new Set(cells[k]);
  if (!ids.size) { console.log(`⚠ ${item.id}: no hay nada en la casilla ${k + 1} de la cuadrícula`); continue; }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const id of ids) { const b = boxes[id]; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const piece = Buffer.alloc(cw * ch * 4), mask = Buffer.alloc(cw * ch * 4);
  let magenta = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y + y0) * W + (x + x0), o = (y * cw + x) * 4;
    if (!ids.has(comp[i])) continue;
    let r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];
    // Magenta → gris claro con su sombreado + máscara
    const m = Math.max(0, Math.min(1, (Math.min(r, b) - g - 40) / 60)) * (Math.abs(r - b) < 110 ? 1 : 0);
    if (m > 0) {
      const v = Math.min(255, Math.max(r, b) * 1.05);
      r = r + (v - r) * m; g = g + (v - g) * m; b = b + (v - b) * m;
      mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = Math.round(m * a);
      if (m > 0.5) magenta++;
    }
    piece[o] = r; piece[o + 1] = g; piece[o + 2] = b; piece[o + 3] = a;
  }

  // Escala: edificios por el ancho de la huella (N*128 px a 2x), el resto por altura
  let k2;
  if (cfg.kind === 'building') k2 = (item.size * 64 * SCALE * (item.fit ?? 1)) / cw;
  else k2 = ((item.height ?? 60) * SCALE) / ch;
  const ow = Math.max(1, Math.round(cw * k2)), oh = Math.max(1, Math.round(ch * k2));
  const pad = 4;
  const resize = buf => sharp(buf, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(ow, oh, { kernel: 'lanczos3' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const fw = ow + pad * 2, fh = oh + pad * 2;
  // Apoyo: centro abajo; en edificios, centro del rombo (su punta inferior toca el fondo)
  const anchor = {
    x: Math.round(fw / 2 + (item.dx ?? 0)),
    y: Math.round(cfg.kind === 'building' ? fh - pad - item.size * 32 * (item.fit ?? 1) + (item.dy ?? 0) : fh - pad - 2 + (item.dy ?? 0)),
  };

  const age = cfg.age ?? 0;
  const base = age > 0 ? `${item.id}-${age}` : item.id;
  await resize(piece).png({ compressionLevel: 9 }).toFile(join(outDir, `${base}.png`));
  const hasMask = magenta > 20;
  if (hasMask) await resize(mask).png({ compressionLevel: 9 }).toFile(join(outDir, `${base}-mask.png`));

  // JSON: la edad 0 es la hoja base; las demás edades se añaden como variantes
  const jsonPath = join(outDir, `${item.id}.json`);
  const manifest = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null;
  const idle = { row: 0, frames: 1 };
  if (age === 0 || !manifest) {
    const m = {
      image: `${base}.png`,
      ...(hasMask ? { mask: `${base}-mask.png` } : {}),
      cell: { w: fw, h: fh },
      anchor,
      scale: SCALE,
      states: { ...(manifest?.states ?? {}), idle },
      ...(manifest?.ages ? { ages: manifest.ages } : {}),
    };
    if (cfg.kind === 'resource' && item.shadow !== undefined) m.shadow = item.shadow;
    writeFileSync(jsonPath, JSON.stringify(m, null, 2) + '\n');
  } else {
    manifest.ages = manifest.ages ?? {};
    manifest.ages[age] = {
      image: `${base}.png`,
      ...(hasMask ? { mask: `${base}-mask.png` } : {}),
      states: { idle: { ...idle, cell: { w: fw, h: fh }, anchor } },
    };
    writeFileSync(jsonPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  // Vista previa: la pieza sobre fondo gris con la huella y el apoyo
  const out = await sharp(join(outDir, `${base}.png`)).toBuffer();
  const hw = cfg.kind === 'building' ? item.size * 64 : 12, hh = cfg.kind === 'building' ? item.size * 32 : 6;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}">
    <polygon points="${anchor.x},${anchor.y - hh} ${anchor.x + hw},${anchor.y} ${anchor.x},${anchor.y + hh} ${anchor.x - hw},${anchor.y}" fill="none" stroke="#00e0ff" stroke-width="2"/>
    <circle cx="${anchor.x}" cy="${anchor.y}" r="4" fill="#ff2020"/></svg>`;
  previews.push({ buf: await sharp({ create: { width: fw, height: fh, channels: 4, background: '#8a8f7a' } })
    .composite([{ input: out }, { input: Buffer.from(svg) }]).png().toBuffer(), w: fw, h: fh });
  console.log(`${item.id}${age ? ` (edad ${age})` : ''}: ${fw}x${fh} px, apoyo (${anchor.x}, ${anchor.y})${hasMask ? ', máscara de color' : ''}`);
}

if (previews.length) {
  const gap = 10, totalW = previews.reduce((s, p) => s + p.w + gap, gap), maxH = Math.max(...previews.map(p => p.h)) + gap * 2;
  let x = gap;
  const comps = previews.map(p => { const c = { input: p.buf, left: x, top: gap }; x += p.w + gap; return c; });
  const name = configPath.replace(/^.*\//, '').replace(/\.json$/, '');
  const file = join(previewDir, `${name}.png`);
  await sharp({ create: { width: totalW, height: maxH, channels: 4, background: '#40443a' } }).composite(comps).png().toFile(file);
  console.log(`Vista previa: ${file}`);
}
