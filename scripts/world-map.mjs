#!/usr/bin/env node
/**
 * Genera public/maps/world.png: mapamundi con relieve para el selector de regiones.
 * Usa las teselas de elevación abiertas "Terrarium" (Mapzen / AWS Open Data), nivel 3.
 *   npm run world-map
 * Atribución: ver docs/creditos (se muestra en la pantalla de créditos del juego).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'terrarium');
const Z = 3, N = 1 << Z, TS = 256;
const OUT_W = 720, OUT_H = 360, LAT_MAX = 80;

async function tile(x, y) {
  const file = join(CACHE, `${Z}-${x}-${y}.png`);
  let buf;
  try { buf = await readFile(file); }
  catch {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`);
    if (!res.ok) throw new Error(`Tesela ${Z}/${x}/${y}: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, buf);
  }
  return PNG.sync.read(buf);
}

const lerp = (a, b, t) => a + (b - a) * t;
const STOPS = [
  [-6000, [18, 40, 82]], [-200, [44, 92, 150]], [0, [70, 128, 180]],
  [1, [92, 138, 70]], [300, [128, 156, 84]], [800, [176, 168, 106]], [1600, [160, 128, 90]], [3000, [140, 132, 124]], [4500, [238, 238, 240]],
];
function color(e) {
  for (let i = 1; i < STOPS.length; i++) {
    if (e <= STOPS[i][0]) {
      const [e0, c0] = STOPS[i - 1], [e1, c1] = STOPS[i];
      const t = Math.max(0, Math.min(1, (e - e0) / (e1 - e0)));
      return c0.map((v, k) => lerp(v, c1[k], t));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

async function main() {
  console.log(`Descargando ${N * N} teselas Terrarium de nivel ${Z}…`);
  const tiles = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) tiles[y * N + x] = await tile(x, y);
  const W = N * TS;
  const elev = (px, py) => {
    px = ((px % W) + W) % W; py = Math.max(0, Math.min(W - 1, py));
    const t = tiles[Math.floor(py / TS) * N + Math.floor(px / TS)];
    const i = ((py % TS) * TS + (px % TS)) * 4;
    return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
  };
  const out = new PNG({ width: OUT_W, height: OUT_H });
  for (let oy = 0; oy < OUT_H; oy++) {
    const lat = LAT_MAX - (oy + 0.5) / OUT_H * 2 * LAT_MAX;
    const phi = lat * Math.PI / 180;
    const my = (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2 * W;
    for (let ox = 0; ox < OUT_W; ox++) {
      const lon = -180 + (ox + 0.5) / OUT_W * 360;
      const mx = (lon + 180) / 360 * W;
      const e = elev(Math.floor(mx), Math.floor(my));
      // Sombreado del relieve (luz del noroeste)
      const ex = elev(Math.floor(mx) + 1, Math.floor(my)) - elev(Math.floor(mx) - 1, Math.floor(my));
      const ey = elev(Math.floor(mx), Math.floor(my) + 1) - elev(Math.floor(mx), Math.floor(my) - 1);
      const shade = e > 0 ? Math.max(0.6, Math.min(1.35, 1 - (ex + ey) / 1500)) : 1;
      const c = color(e);
      const i = (oy * OUT_W + ox) * 4;
      out.data[i] = Math.min(255, c[0] * shade); out.data[i + 1] = Math.min(255, c[1] * shade); out.data[i + 2] = Math.min(255, c[2] * shade); out.data[i + 3] = 255;
    }
  }
  const file = join(ROOT, 'public', 'maps', 'world.png');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, PNG.sync.write(out, { colorType: 2 }));
  console.log(`Escrito public/maps/world.png (${OUT_W}×${OUT_H}, latitudes ±${LAT_MAX}°)`);
}
main().catch(err => { console.error(err); process.exit(1); });
