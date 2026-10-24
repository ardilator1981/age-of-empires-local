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
 * Unidades y recursos: { "id": "tree", "height": 80 } (alto en px a zoom 1) o "width".
 *
 * Hojas de varios fotogramas: las piezas con el mismo id se juntan en una tira, en orden
 * (variantes de árbol, fases de una mina...). Pueden venir de varias imágenes:
 * { "kind": "resource", "out": "resources",
 *   "groups": { "goldMine": { "width": 58, "pick": "amount", "shadow": 22 } },
 *   "sources": [ { "source": "...", "grid": [3, 2], "items": [ ... ] }, ... ] }
 * Una pieza sin medida propia usa la escala de la anterior del mismo id y de la misma
 * imagen, para que las fases conserven su tamaño relativo.
 * Una pieza puede llevar su propia "age" (p. ej. la misma torre en cada época) y su "state"
 * ("walk", "attack"...): esas piezas forman una animación con imagen propia en la hoja.
 * Con "grid": "auto" cada figura es una casilla (en orden de lectura), sin cuadrícula fija.
 * Con "keep": 0.5 en una imagen solo se usa su mitad de arriba (útil cuando las filas se tocan).
 * Con "sharedScale": true en una imagen, las piezas sin medida usan la escala de la primera
 * (personajes dibujados juntos a la misma escala).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const configPath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--entrada');
if (!configPath) { console.log('Uso: npm run art-import -- <config.json> [--entrada carpeta]'); process.exit(1); }
const entradaArg = args.includes('--entrada') ? args[args.indexOf('--entrada') + 1] : null;
const entrada = resolve(entradaArg ?? 'art-src/entrada');
const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
const SCALE = 2;

/** Quita el fondo de una imagen y agrupa sus piezas por casilla de la cuadrícula. */
async function loadSource(srcFile, grid, keep = 1) {
  const { data, info } = await sharp(srcFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // keep < 1: solo se usa la parte de arriba de la imagen (lo de abajo se borra a blanco)
  if (keep < 1) data.fill(255, Math.floor(H * keep) * W * 3);
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
  const [GC, GR] = Array.isArray(grid) ? grid : [1, 1];
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
  if (grid === 'auto') {
    // Sin cuadrícula: cada figura (componente grande, con sus piezas sueltas cerca) es una casilla, en orden de lectura
    const maxN = Math.max(...boxes.map(b => b.n));
    const big = boxes.map((b, id) => ({ b, id })).filter(o => o.b.n >= maxN * 0.25);
    const groups = new Map(big.map(o => [o.id, [o.id]]));
    boxes.forEach((b, id) => {
      if (b.n < 40 || groups.has(id)) return;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      let best = -1, bd = Infinity;
      for (const o of big) {
        const dx = Math.max(o.b.x0 - cx, 0, cx - o.b.x1), dy = Math.max(o.b.y0 - cy, 0, cy - o.b.y1);
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = o.id; }
      }
      if (best >= 0) groups.get(best).push(id);
    });
    const medH = big.map(o => o.b.y1 - o.b.y0).sort((a, b) => a - b)[Math.floor(big.length / 2)] ?? 1;
    const ordered = big.map(o => ({ id: o.id, cy: (o.b.y0 + o.b.y1) / 2, cx: (o.b.x0 + o.b.x1) / 2 }))
      .sort((a, b) => (Math.abs(a.cy - b.cy) > medH * 0.5 ? a.cy - b.cy : a.cx - b.cx));
    return { W, H, rgba, comp, boxes, cells: ordered.map(o => groups.get(o.id)) };
  }
  const cells = Array.from({ length: GC * GR }, () => []);
  boxes.forEach((b, id) => {
    if (b.n < 40) return; // motas sueltas
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const c = Math.min(GC - 1, Math.floor((cx / W) * GC)), r = Math.min(GR - 1, Math.floor((cy / H) * GR));
    cells[r * GC + c].push(id);
  });
  return { W, H, rgba, comp, boxes, cells };
}

// ------------------------------------------------------------ piezas → hojas
const sources = cfg.sources ?? [{ source: cfg.source, grid: cfg.grid, items: cfg.items }];
const groupCfg = cfg.groups ?? {};
const PAD = 4;

/**
 * Cuánto se parece un color al magenta del color de jugador (0..1), por tono y saturación:
 * así se detectan también sus sombras oscuras y sus brillos. Los rojos de tejados y ladrillo
 * (tono 0-30°) y los morados (≤ 280°) quedan fuera.
 */
function magentaAmount(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (max < 40 || d < 25) return 0;
  let h;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  const sat = d / max;
  const hue = h >= 290 && h <= 340 ? 1 : h > 280 && h < 290 ? (h - 280) / 10 : h > 340 && h < 350 ? (350 - h) / 10 : 0;
  return hue * Math.max(0, Math.min(1, (sat - 0.3) / 0.25));
}

/** Recorta las componentes `ids` y separa el magenta (→ gris claro + máscara). */
function cutPiece(src, ids) {
  const { W, rgba, comp, boxes } = src;
  let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
  for (const id of ids) { const b = boxes[id]; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const piece = Buffer.alloc(cw * ch * 4), mask = Buffer.alloc(cw * ch * 4);
  let magenta = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y + y0) * W + (x + x0), o = (y * cw + x) * 4;
    if (!ids.has(comp[i])) continue;
    let r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];
    const m = magentaAmount(r, g, b);
    if (m > 0) {
      const v = Math.min(255, Math.max(r, b) * 1.05);
      r += (v - r) * m; g += (v - g) * m; b += (v - b) * m;
      mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = Math.round(m * a);
      if (m > 0.5) magenta++;
    }
    piece[o] = r; piece[o + 1] = g; piece[o + 2] = b; piece[o + 3] = a;
  }
  return { piece, mask, cw, ch, magenta };
}

// Cada id es una hoja; sus piezas (de una o varias imágenes) son fotogramas, en orden.
const groups = new Map();
for (const s of sources) {
  const file = join(entrada, s.source);
  if (!existsSync(file)) { console.log(`No encuentro ${file}`); process.exit(1); }
  const src = await loadSource(file, s.grid, s.keep ?? 1);
  const lastK = new Map();
  let sourceScale = null;
  s.items.forEach((item, k) => {
    if (!item) return;
    const ids = new Set(src.cells[k]);
    if (!ids.size) { console.log(`⚠ ${s.source}: no hay nada en la casilla ${k + 1}`); return; }
    const cut = cutPiece(src, ids);
    const g = groupCfg[item.id] ?? {};
    // Escala: edificios por el ancho de su huella (N*128 px a 2x); el resto por alto o ancho
    // a zoom 1. Sin medida propia, la misma escala que la pieza anterior de la misma imagen,
    // así las fases (mina llena → agotada) conservan su tamaño relativo.
    let scale;
    if (cfg.kind === 'building') scale = (item.size * 64 * SCALE * (item.fit ?? 1)) / cut.cw;
    else if (item.width) scale = (item.width * SCALE) / cut.cw;
    else if (item.height) scale = (item.height * SCALE) / cut.ch;
    else if (lastK.has(item.id)) scale = lastK.get(item.id);
    else if (s.sharedScale && sourceScale !== null) scale = sourceScale;
    else if (g.width) scale = (g.width * SCALE) / cut.cw;
    else scale = ((g.height ?? 60) * SCALE) / cut.ch;
    lastK.set(item.id, scale);
    if (sourceScale === null) sourceScale = scale;
    const key = `${item.id}|${item.age ?? cfg.age ?? 0}|${item.state ?? 'idle'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ item, cut, scale, source: s.source });
  });
}

const outDir = resolve('public/sprites', cfg.out);
mkdirSync(outDir, { recursive: true });
const previewDir = resolve('art-src/preview');
mkdirSync(previewDir, { recursive: true });
const previews = [];

// La edad 0 primero: es la hoja base, las demás se añaden a su JSON como variantes
const ordered = [...groups].map(([key, frames]) => {
  const [id, age, state] = key.split('|');
  return { id, age: Number(age), state, frames };
}).sort((a, b) => a.age - b.age || (a.state === 'idle' ? -1 : b.state === 'idle' ? 1 : 0));
for (const { id, age, state, frames } of ordered) {
  const g = groupCfg[id] ?? {};
  const first = frames[0].item;
  const sized = await Promise.all(frames.map(async f => {
    const ow = Math.max(1, Math.round(f.cut.cw * f.scale)), oh = Math.max(1, Math.round(f.cut.ch * f.scale));
    const resize = buf => sharp(buf, { raw: { width: f.cut.cw, height: f.cut.ch, channels: 4 } }).resize(ow, oh, { kernel: 'lanczos3' }).png().toBuffer();
    return { ow, oh, piece: await resize(f.cut.piece), mask: await resize(f.cut.mask), magenta: f.cut.magenta };
  }));
  const cellW = Math.max(...sized.map(s => s.ow)) + PAD * 2, cellH = Math.max(...sized.map(s => s.oh)) + PAD * 2;
  const n = sized.length;
  const place = (s, i) => ({ left: i * cellW + Math.round((cellW - s.ow) / 2), top: cellH - PAD - s.oh });
  const hasMask = sized.reduce((t, s) => t + s.magenta, 0) > 20;
  const dx = first.dx ?? g.dx ?? 0, dy = first.dy ?? g.dy ?? 0;
  const anchor = {
    x: Math.round(cellW / 2 + dx),
    y: Math.round(cfg.kind === 'building' ? cellH - PAD - first.size * 32 * (first.fit ?? 1) + dy : cellH - PAD - 2 + dy),
  };
  const base = (age > 0 ? `${id}-${age}` : id) + (state !== 'idle' ? `-${state}` : '');
  const sheet = (key) => sharp({ create: { width: cellW * n, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(sized.map((s, i) => ({ input: s[key], ...place(s, i) }))).png({ compressionLevel: 9 });
  await sheet('piece').toFile(join(outDir, `${base}.png`));
  if (hasMask) await sheet('mask').toFile(join(outDir, `${base}-mask.png`));

  const jsonPath = join(outDir, `${id}.json`);
  const old = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : null;
  if (state !== 'idle') {
    // Animación (andar, atacar...) con imagen propia dentro de la hoja de la unidad
    if (!old) { console.log(`⚠ ${id}: falta la hoja base (idle) antes de añadir "${state}"`); continue; }
    const st = { image: `${base}.png`, ...(hasMask ? { mask: `${base}-mask.png` } : {}), row: 0, frames: n, fps: g.fps?.[state] ?? 8, cell: { w: cellW, h: cellH }, anchor };
    const target = age > 0 ? ((old.ages ??= {})[age] ??= {}) : old;
    (target.states ??= {})[state] = st;
    writeFileSync(jsonPath, JSON.stringify(old, null, 2) + '\n');
  } else {
  const idle = { row: 0, frames: n, ...(n > 1 ? { pick: g.pick ?? 'variant' } : {}) };
  if (age === 0 || !old) {
    const m = {
      image: `${base}.png`,
      ...(hasMask ? { mask: `${base}-mask.png` } : {}),
      cell: { w: cellW, h: cellH },
      anchor,
      scale: SCALE,
      ...(g.shadow !== undefined ? { shadow: g.shadow } : {}),
      ...(g.facing ? { facing: g.facing } : {}),
      states: { ...(old?.states ?? {}), idle },
      ...(old?.ages ? { ages: old.ages } : {}),
    };
    writeFileSync(jsonPath, JSON.stringify(m, null, 2) + '\n');
  } else {
    old.ages = old.ages ?? {};
    old.ages[age] = { ...(old.ages[age] ?? {}), image: `${base}.png`, ...(hasMask ? { mask: `${base}-mask.png` } : {}), states: { ...(old.ages[age]?.states ?? {}), idle: { ...idle, cell: { w: cellW, h: cellH }, anchor } } };
    writeFileSync(jsonPath, JSON.stringify(old, null, 2) + '\n');
  }
  }

  // Vista previa: la hoja sobre gris, con el apoyo (y la huella en edificios) de cada fotograma
  const hw = cfg.kind === 'building' ? first.size * 64 : 14, hh = cfg.kind === 'building' ? first.size * 32 : 7;
  let marks = '';
  for (let i = 0; i < n; i++) {
    const ax = i * cellW + anchor.x;
    marks += `<polygon points="${ax},${anchor.y - hh} ${ax + hw},${anchor.y} ${ax},${anchor.y + hh} ${ax - hw},${anchor.y}" fill="none" stroke="#00e0ff" stroke-width="2"/><circle cx="${ax}" cy="${anchor.y}" r="4" fill="#ff2020"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW * n}" height="${cellH}">${marks}</svg>`;
  previews.push({ buf: await sharp({ create: { width: cellW * n, height: cellH, channels: 4, background: '#8a8f7a' } })
    .composite([{ input: join(outDir, `${base}.png`) }, { input: Buffer.from(svg) }]).png().toBuffer(), w: cellW * n, h: cellH });
  console.log(`${id}${age ? ` (edad ${age})` : ''}${state !== 'idle' ? ` [${state}]` : ''}: ${n} fotograma(s) de ${cellW}x${cellH} px, apoyo (${anchor.x}, ${anchor.y})${hasMask ? ', máscara de color' : ''}`);
}

if (previews.length) {
  const gap = 10, maxW = Math.max(...previews.map(p => p.w)) + gap * 2;
  let y = gap;
  const comps = previews.map(p => { const c = { input: p.buf, left: gap, top: y }; y += p.h + gap; return c; });
  const name = configPath.replace(/^.*\//, '').replace(/\.json$/, '');
  const file = join(previewDir, `${name}.png`);
  await sharp({ create: { width: maxW, height: y, channels: 4, background: '#40443a' } }).composite(comps).png().toFile(file);
  console.log(`Vista previa: ${file}`);
}

// Iconos de tecnologías: lista de los que existen, para que el juego no pida los que faltan (src/mods/art)
if (cfg.out === 'ui/tech') {
  // Solo hace falta el PNG de cada icono (sin JSON ni máscara)
  for (const f of readdirSync(outDir)) if ((f.endsWith('.json') && f !== 'index.json') || f.endsWith('-mask.png')) rmSync(join(outDir, f));
  const ids = readdirSync(outDir).filter(f => f.endsWith('.png') && !f.endsWith('-mask.png')).map(f => f.replace(/\.png$/, '')).sort();
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(ids) + '\n');
  console.log(`Índice de iconos de tecnología: ${ids.length}`);
}
