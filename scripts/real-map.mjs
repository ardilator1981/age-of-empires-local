#!/usr/bin/env node
/**
 * Genera un mapa jugable a partir de datos geográficos reales.
 *
 *   npm run real-map -- --id vic --name "Plana de Vic" --center 41.9301,2.2549 --size-km 8
 *
 * Descarga el modelo de elevaciones (MET del ICGC dentro de Cataluña, Copernicus DEM GLO-30 fuera)
 * y de OpenStreetMap (Overpass API) agua, bosques, roca, prados, cultivos y núcleos de población.
 * Escribe src/mods/real-maps/data/<id>.json, que el mod «Mapas reales» registra como un mapa más.
 * Ejecuta `node scripts/real-map.mjs --help` para ver todas las opciones.
 *
 * Las descargas se guardan en .cache/real-maps/ para no repetirlas.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'real-maps');
const OUT_DIR = join(ROOT, 'src', 'mods', 'real-maps', 'data');
const USER_AGENT = 'age-local-real-map/1.0 (https://github.com/; generador de mapas para un juego local)';

/** Escala real del render: un nivel de elevación sube ELEV_PX px y el lado de una casilla mide ~35,8 px. */
const ELEV_PX = 12, TILE_EDGE_PX = Math.hypot(32, 16);

const HELP = `
Uso: node scripts/real-map.mjs --id <id> [opciones]

Zona (una de estas):
  --center LAT,LON        Centro de la zona (grados WGS84). Con --size-km.
  --size-km KM            Lado del cuadrado jugable en km (por defecto 8).
  --bbox S,W,N,E          Recuadro en lat/lon (sur, oeste, norte, este).
  --utm MINE,MINN,MAXE,MAXN  Recuadro en metros UTM (huso --zone, por defecto 31 / ETRS89).

Mapa:
  --id ID                 Identificador (nombre del JSON y del mapa). Obligatorio.
  --name "Nombre"         Nombre que aparece en el menú.
  --description "..."     Descripción del menú.
  --tiles N               Lado del mapa en casillas (por defecto 144; el juego lo reescala al tamaño elegido).
  --rotate GRADOS         45 = el norte queda arriba en la pantalla isométrica (por defecto con --center);
                          0 = el recuadro exacto, con el norte arriba a la derecha (por defecto con --bbox/--utm).
  --exaggeration X        Exageración vertical respecto a la escala real (por defecto 1.5).
  --max-level L           Nivel máximo de elevación del juego; si el relieve no cabe, se comprime (por defecto 10).
  --snow-line M           Cota (m) a partir de la que hay nieve (por defecto 2300).
  --pine-line M           Cota (m) a partir de la que los bosques sin especie conocida son pinares (por defecto 1400).
  --rock-slope GRADOS     Pendiente real (°) a partir de la que el terreno es roca infranqueable (por defecto 40).
  --starts "A,B,..."      Asentamientos preferidos para los jugadores, por orden (opcional).

Fuentes:
  --dem auto|icgc|copernicus   Modelo de elevaciones (auto = ICGC en Cataluña y Copernicus fuera).
  --no-osm                No descarga OpenStreetMap (solo relieve).
  --overpass URL          Servidor Overpass (por defecto se prueban varios).
  --refresh               Ignora la caché de descargas.
`;

// ------------------------------------------------------------------ argumentos

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) o[k] = true;
    else { o[k] = next; i++; }
  }
  return o;
}

const nums = (s, n, what) => {
  const v = String(s).split(',').map(Number);
  if (v.length !== n || v.some(x => !Number.isFinite(x))) fail(`${what}: se esperaban ${n} números separados por comas`);
  return v;
};

function fail(msg) { console.error(`Error: ${msg}`); process.exit(1); }
const log = (...a) => console.log(...a);

// ------------------------------------------------------------------ UTM (GRS80 ≈ WGS84; ETRS89 = EPSG:258zz)

const A = 6378137, F = 1 / 298.257222101, K0 = 0.9996;
const E2 = F * (2 - F), EP2 = E2 / (1 - E2);

function toUtm(lat, lon, zone) {
  const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180, lam0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const n = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2), t = Math.tan(phi) ** 2, c = EP2 * Math.cos(phi) ** 2;
  const a = Math.cos(phi) * (lam - lam0);
  const m = A * ((1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256) * phi - (3 * E2 / 8 + 3 * E2 ** 2 / 32 + 45 * E2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * E2 ** 2 / 256 + 45 * E2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * E2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = K0 * n * (a + (1 - t + c) * a ** 3 / 6 + (5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5 / 120) + 500000;
  let y = K0 * (m + n * Math.tan(phi) * (a * a / 2 + (5 - t + 9 * c + 4 * c * c) * a ** 4 / 24 + (61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6 / 720));
  if (lat < 0) y += 10000000;
  return [x, y];
}

function fromUtm(x, y, zone, south = false) {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  x -= 500000; if (south) y -= 10000000;
  const m = y / K0, mu = m / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const n1 = A / Math.sqrt(1 - E2 * Math.sin(p1) ** 2), t1 = Math.tan(p1) ** 2, c1 = EP2 * Math.cos(p1) ** 2;
  const r1 = A * (1 - E2) / (1 - E2 * Math.sin(p1) ** 2) ** 1.5, d = x / (n1 * K0);
  const lat = p1 - (n1 * Math.tan(p1) / r1) * (d * d / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4 / 24
    + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6 / 720);
  const lon = (d - (1 + 2 * t1 + c1) * d ** 3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5 / 120) / Math.cos(p1);
  return [lat * 180 / Math.PI, ((zone - 1) * 6 - 180 + 3) + lon * 180 / Math.PI];
}

// ------------------------------------------------------------------ descargas con caché

async function cached(key, ext, fetcher, refresh) {
  const file = join(CACHE, createHash('sha1').update(key).digest('hex').slice(0, 20) + ext);
  if (!refresh) { try { return await readFile(file); } catch { /* no está */ } }
  const buf = await fetcher();
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, buf);
  return buf;
}

async function httpGet(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url.slice(0, 120)}`);
  return Buffer.from(await res.arrayBuffer());
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ geometría del mapa

/**
 * Marco del mapa: casilla (u, v) continua → metros UTM. El centro del mapa es el centro de la zona;
 * `rot` gira la rejilla (45° = norte arriba en la vista isométrica, porque la pantalla «sube» en -u-v).
 */
function makeFrame(cE, cN, tiles, mpt, rotDeg) {
  const r = rotDeg * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r), c = tiles / 2;
  // Sin giro: u → este, v → sur. Con giro de 45°: u → sureste, v → suroeste (el norte queda arriba).
  const toUtmXY = (u, v) => {
    const a = (u - c) * mpt, b = (v - c) * mpt;
    return [cE + a * cos - b * sin, cN - (a * sin + b * cos)];
  };
  const toTile = (E, N) => {
    const a = E - cE, b = cN - N;
    return [(a * cos + b * sin) / mpt + c, (-a * sin + b * cos) / mpt + c];
  };
  return { toUtmXY, toTile };
}

// ------------------------------------------------------------------ elevaciones

const inCatalonia = (lat, lon) => lat > 40.45 && lat < 42.9 && lon > 0.1 && lon < 3.4;

/** Ráster regular en UTM (fila 0 = norte). */
class Raster {
  constructor(minE, maxN, cell, cols, rows) {
    Object.assign(this, { minE, maxN, cell, cols, rows });
    this.data = new Float32Array(cols * rows).fill(NaN);
  }
  sample(E, N) {
    const fx = (E - this.minE) / this.cell - 0.5, fy = (this.maxN - N) / this.cell - 0.5;
    const x0 = Math.max(0, Math.min(this.cols - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(this.rows - 2, Math.floor(fy)));
    const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
    const d = this.data, i = y0 * this.cols + x0;
    const a = d[i], b = d[i + 1], c = d[i + this.cols], e = d[i + this.cols + 1];
    const vals = [[a, (1 - tx) * (1 - ty)], [b, tx * (1 - ty)], [c, (1 - tx) * ty], [e, tx * ty]];
    let s = 0, w = 0;
    for (const [v, k] of vals) if (Number.isFinite(v)) { s += v * k; w += k; }
    return w > 0 ? s / w : NaN;
  }
}

/** MET del ICGC (WCS, salida ArcGrid). Máx. ~35 800 píxeles por petición, así que se pide por trozos. */
async function demIcgc(box, cell, refresh) {
  const [minE, minN, maxE, maxN] = box;
  const cols = Math.ceil((maxE - minE) / cell), rows = Math.ceil((maxN - minN) / cell);
  const ras = new Raster(minE, maxN, cell, cols, rows);
  const CH = 175;
  const jobs = [];
  for (let r0 = 0; r0 < rows; r0 += CH) for (let c0 = 0; c0 < cols; c0 += CH) jobs.push([r0, c0]);
  log(`  ICGC MET: ${cols}×${rows} celdas de ${cell.toFixed(1)} m en ${jobs.length} peticiones`);
  for (const [r0, c0] of jobs) {
    const nc = Math.min(CH, cols - c0), nr = Math.min(CH, rows - r0);
    const e0 = minE + c0 * cell, n1 = maxN - r0 * cell;
    const bb = [e0, n1 - nr * cell, e0 + nc * cell, n1].map(v => v.toFixed(2)).join(',');
    const url = `https://geoserveis.icgc.cat/icc_mdt/wcs/service?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=icc:met`
      + `&CRS=EPSG:25831&BBOX=${bb}&WIDTH=${nc}&HEIGHT=${nr}&FORMAT=ArcGrid`;
    const buf = await cached(url, '.asc', async () => {
      const b = await httpGet(url);
      if (!/^\s*NCOLS/i.test(b.subarray(0, 40).toString())) throw new Error(`el ICGC respondió: ${b.subarray(0, 300).toString().replace(/\s+/g, ' ')}`);
      return b;
    }, refresh);
    const lines = buf.toString().split('\n');
    const hdr = {};
    let li = 0;
    for (; li < lines.length; li++) {
      const m = lines[li].trim().match(/^([A-Za-z_]+)\s+(-?[\d.eE+-]+)$/);
      if (!m) break;
      hdr[m[1].toUpperCase()] = Number(m[2]);
    }
    const nodata = hdr.NODATA_VALUE ?? -9999, gc = hdr.NCOLS, gr = hdr.NROWS;
    const vals = lines.slice(li).join(' ').trim().split(/\s+/).map(Number);
    for (let y = 0; y < gr && y < nr; y++) for (let x = 0; x < gc && x < nc; x++) {
      const v = vals[y * gc + x];
      if (Number.isFinite(v) && v !== nodata && v > -500) ras.data[(r0 + y) * cols + c0 + x] = v;
    }
  }
  return ras;
}

/** Copernicus DEM GLO-30 (GeoTIFF optimizados en el bucket público de AWS), leído por rangos con geotiff. */
async function demCopernicus(box, cell, zone, refresh) {
  let fromUrl;
  try { ({ fromUrl } = await import('geotiff')); }
  catch { fail('falta la dependencia geotiff: ejecuta `npm install`'); }
  const [minE, minN, maxE, maxN] = box;
  const cols = Math.ceil((maxE - minE) / cell), rows = Math.ceil((maxN - minN) / cell);
  const ras = new Raster(minE, maxN, cell, cols, rows);
  // Extensión en grados
  let s = 90, n = -90, w = 180, e = -180;
  for (const [E, N] of [[minE, minN], [minE, maxN], [maxE, minN], [maxE, maxN], [(minE + maxE) / 2, minN], [(minE + maxE) / 2, maxN]]) {
    const [la, lo] = fromUtm(E, N, zone);
    s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo);
  }
  const tiles = [];
  for (let la = Math.floor(s); la <= Math.floor(n); la++) for (let lo = Math.floor(w); lo <= Math.floor(e); lo++) {
    const ns = (la >= 0 ? 'N' : 'S') + String(Math.abs(la)).padStart(2, '0');
    const ew = (lo >= 0 ? 'E' : 'W') + String(Math.abs(lo)).padStart(3, '0');
    const name = `Copernicus_DSM_COG_10_${ns}_00_${ew}_00_DEM`;
    tiles.push({ la, lo, url: `https://copernicus-dem-30m.s3.amazonaws.com/${name}/${name}.tif` });
  }
  log(`  Copernicus GLO-30: ${tiles.length} hoja(s) de 1°`);
  const grids = [];
  for (const t of tiles) {
    // Solo se descarga la ventana necesaria: se pide la cabecera y luego los bloques con rangos HTTP.
    const s0 = Math.max(s, t.la) - 0.01, n0 = Math.min(n, t.la + 1) + 0.01, w0 = Math.max(w, t.lo) - 0.01, e0 = Math.min(e, t.lo + 1) + 0.01;
    const key = `${t.url}#${s0.toFixed(4)},${w0.toFixed(4)},${n0.toFixed(4)},${e0.toFixed(4)}`;
    let buf;
    try {
      buf = await cached(key, '.bin', async () => {
        const tif = await fromUrl(t.url, { headers: { 'User-Agent': USER_AGENT } });
        const img = await tif.getImage();
        const W = img.getWidth(), H = img.getHeight(), [bw, bs, be, bn] = img.getBoundingBox();
        const px = lo => Math.max(0, Math.min(W, Math.round((lo - bw) / (be - bw) * W)));
        const py = la => Math.max(0, Math.min(H, Math.round((bn - la) / (bn - bs) * H)));
        const win = [px(w0), py(n0), px(e0), py(s0)];
        const [band] = await img.readRasters({ window: win });
        const head = new Float64Array([win[0], win[1], win[2] - win[0], win[3] - win[1], W, H, bw, bs, be, bn]);
        return Buffer.concat([Buffer.from(head.buffer), Buffer.from(new Float32Array(band).buffer)]);
      }, refresh);
    } catch (err) {
      if (/HTTP 40[34]/.test(String(err))) { log(`  (sin hoja ${t.url.split('/').pop()}: mar, altura 0)`); continue; }
      throw err;
    }
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const h = new Float64Array(ab, 0, 10);
    grids.push({ x0: h[0], y0: h[1], gw: h[2], gh: h[3], W: h[4], H: h[5], bw: h[6], bs: h[7], be: h[8], bn: h[9], data: new Float32Array(ab, 80) });
  }
  const sampleDeg = (la, lo) => {
    for (const g of grids) {
      if (la < g.bs || la > g.bn || lo < g.bw || lo > g.be) continue;
      const fx = (lo - g.bw) / (g.be - g.bw) * g.W - 0.5 - g.x0, fy = (g.bn - la) / (g.bn - g.bs) * g.H - 0.5 - g.y0;
      const x0 = Math.max(0, Math.min(g.gw - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(g.gh - 2, Math.floor(fy)));
      const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0)), d = g.data, i = y0 * g.gw + x0;
      return (d[i] * (1 - tx) + d[i + 1] * tx) * (1 - ty) + (d[i + g.gw] * (1 - tx) + d[i + g.gw + 1] * tx) * ty;
    }
    return 0;
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const [la, lo] = fromUtm(minE + (x + 0.5) * cell, maxN - (y + 0.5) * cell, zone);
    ras.data[y * cols + x] = sampleDeg(la, lo);
  }
  return ras;
}

// ------------------------------------------------------------------ OpenStreetMap

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

async function overpass(query, servers, refresh) {
  const buf = await cached(query, '.json', async () => {
    let wait = 4000, lastErr;
    for (let attempt = 0; attempt < 8; attempt++) {
      const url = servers[attempt % servers.length];
      try {
        const b = await httpGet(url, { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const j = JSON.parse(b.toString());
        if (j.remark && /runtime error|timed out/i.test(j.remark)) throw new Error(j.remark);
        return b;
      } catch (err) {
        lastErr = err;
        log(`  Overpass (${new URL(url).host}) falló: ${String(err.message ?? err).slice(0, 100)}. Reintento en ${wait / 1000} s…`);
        await sleep(wait);
        wait = Math.min(wait * 2, 60000);
      }
    }
    throw lastErr;
  }, refresh);
  return JSON.parse(buf.toString()).elements ?? [];
}

/** Une los tramos de un multipolígono en anillos cerrados. */
function assembleRings(lines) {
  const key = p => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
  const pool = lines.filter(l => l.length > 1).map(l => l.slice());
  const rings = [];
  while (pool.length) {
    let ring = pool.pop();
    for (let guard = 0; key(ring[0]) !== key(ring[ring.length - 1]) && guard < 10000; guard++) {
      const end = key(ring[ring.length - 1]);
      const i = pool.findIndex(l => key(l[0]) === end || key(l[l.length - 1]) === end);
      if (i < 0) break;
      const l = pool.splice(i, 1)[0];
      ring = ring.concat(key(l[0]) === end ? l.slice(1) : l.slice(0, -1).reverse());
    }
    rings.push(ring);
  }
  return rings;
}

/** Relleno par-impar de un conjunto de anillos (en casillas) sobre la rejilla de terreno. */
function fillRings(rings, tiles, set) {
  let vMin = Infinity, vMax = -Infinity;
  for (const r of rings) for (const [, v] of r) { vMin = Math.min(vMin, v); vMax = Math.max(vMax, v); }
  for (let v = Math.max(0, Math.floor(vMin)); v <= Math.min(tiles - 1, Math.ceil(vMax)); v++) {
    const yc = v + 0.5, xs = [];
    for (const r of rings) for (let i = 0; i < r.length; i++) {
      const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
      if ((y1 <= yc) !== (y2 <= yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let u = Math.max(0, Math.ceil(xs[k] - 0.5)); u <= Math.min(tiles - 1, Math.floor(xs[k + 1] - 0.5)); u++) set(u, v);
    }
  }
}

/** Clase de terreno de un elemento OSM (o null). El orden de LAYERS decide qué pisa a qué. */
function landClass(tags) {
  const lu = tags.landuse, na = tags.natural, ww = tags.waterway;
  if (na === 'water' || lu === 'reservoir' || lu === 'basin' || ww === 'riverbank' || ww === 'dock') return 'w';
  if (na === 'glacier') return 'g';
  if (na === 'bare_rock') return 'r';
  if (na === 'scree' || na === 'shingle') return 'd';
  if (lu === 'forest' || na === 'wood') {
    const lt = tags.leaf_type;
    return lt === 'needleleaved' ? 'p' : lt === 'mixed' ? 'x' : 'f';
  }
  if (na === 'scrub' || na === 'heath') return 'h';
  if (lu === 'meadow' || lu === 'grass' || na === 'grassland') return 'm';
  if (lu === 'farmland' || lu === 'orchard' || lu === 'vineyard' || lu === 'allotments') return 'a';
  if (lu === 'residential' || lu === 'industrial' || lu === 'commercial' || lu === 'retail') return 'u';
  return null;
}
const LAYERS = ['a', 'm', 'h', 'f', 'x', 'p', 'd', 'g', 'r', 'u', 'w'];
const LEGEND = {
  '.': 'sin datos / campo abierto', a: 'cultivos', m: 'prado', h: 'matorral', f: 'bosque frondoso o sin especie',
  x: 'bosque mixto', p: 'bosque de coníferas', d: 'pedregal / canchal', g: 'glaciar', r: 'roca desnuda', u: 'zona urbana', w: 'agua (lago, embalse, cauce ancho)',
};

// ------------------------------------------------------------------ principal

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) { console.log(HELP); return; }
  if (!args.id || args.id === true) fail('falta --id (ejecuta con --help para ver las opciones)');
  const id = String(args.id);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) fail('--id solo puede contener letras, números y guiones');
  const tiles = Math.round(Number(args.tiles ?? 144));
  if (!(tiles >= 32 && tiles <= 400)) fail('--tiles debe estar entre 32 y 400');
  const refresh = !!args.refresh;

  // Zona: centro + lado (km) en UTM
  let zone = Number(args.zone ?? 0), cE, cN, sideM, rotate;
  if (args.utm) {
    const [a, b, c, d] = nums(args.utm, 4, '--utm');
    zone ||= 31; cE = (a + c) / 2; cN = (b + d) / 2; sideM = Math.max(c - a, d - b); rotate = 0;
  } else if (args.bbox) {
    const [s, w, n, e] = nums(args.bbox, 4, '--bbox');
    zone ||= Math.floor(((w + e) / 2 + 180) / 6) + 1;
    const pts = [[s, w], [s, e], [n, w], [n, e]].map(([la, lo]) => toUtm(la, lo, zone));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    cE = (Math.min(...xs) + Math.max(...xs)) / 2; cN = (Math.min(...ys) + Math.max(...ys)) / 2;
    sideM = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); rotate = 0;
  } else if (args.center) {
    const [la, lo] = nums(args.center, 2, '--center');
    zone ||= inCatalonia(la, lo) ? 31 : Math.floor((lo + 180) / 6) + 1;
    [cE, cN] = toUtm(la, lo, zone);
    sideM = Number(args['size-km'] ?? 8) * 1000; rotate = 45;
  } else fail('indica la zona con --center, --bbox o --utm');
  if (args.rotate !== undefined) rotate = Number(args.rotate);
  const mpt = sideM / tiles;
  const frame = makeFrame(cE, cN, tiles, mpt, rotate);
  const [cLat, cLon] = fromUtm(cE, cN, zone);

  // Recuadro UTM que contiene el mapa (girado) con un margen
  let box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [u, v] of [[0, 0], [tiles, 0], [0, tiles], [tiles, tiles]]) {
    const [E, N] = frame.toUtmXY(u, v);
    box = [Math.min(box[0], E), Math.min(box[1], N), Math.max(box[2], E), Math.max(box[3], N)];
  }
  const margin = mpt * 2;
  box = [box[0] - margin, box[1] - margin, box[2] + margin, box[3] + margin].map(v => Math.round(v));
  log(`Mapa ${id}: ${tiles}×${tiles} casillas de ${mpt.toFixed(1)} m (${(sideM / 1000).toFixed(1)} km), centro ${cLat.toFixed(5)}, ${cLon.toFixed(5)}, UTM ${zone}N, giro ${rotate}°`);

  // ---------------- elevaciones
  let demMode = String(args.dem ?? 'auto');
  if (demMode === 'auto') demMode = zone === 31 && inCatalonia(cLat, cLon) ? 'icgc' : 'copernicus';
  const cell = Math.max(demMode === 'icgc' ? 5 : 25, mpt / 2);
  let ras, demName;
  if (demMode === 'icgc') {
    if (zone !== 31) fail('el MET del ICGC solo se sirve en UTM 31N (--zone 31)');
    try { ras = await demIcgc(box, cell, refresh); demName = 'ICGC · Model d\'Elevacions del Terreny (MET 5×5 m / 15×15 m)'; }
    catch (err) { log(`  No se pudo usar el ICGC (${err.message}); se usa Copernicus.`); demMode = 'copernicus'; }
  }
  if (ras) {
    // Zonas sin datos (fuera de Cataluña): se completan con Copernicus
    const missing = ras.data.reduce((n, v) => n + (Number.isFinite(v) ? 0 : 1), 0);
    if (missing > 0) {
      log(`  ${missing} celdas sin datos del ICGC (fuera de Cataluña): se completan con Copernicus`);
      try {
        const cop = await demCopernicus(box, cell, zone, refresh);
        for (let i = 0; i < ras.data.length; i++) if (!Number.isFinite(ras.data[i])) ras.data[i] = cop.data[i];
        demName += ' + Copernicus DEM GLO-30';
      } catch (err) { log(`  Copernicus tampoco disponible (${err.message}); se interpola.`); }
    }
  } else {
    ras = await demCopernicus(box, cell, zone, refresh);
    demName = 'Copernicus DEM GLO-30';
  }

  // Altura de cada vértice: media de 3×3 muestras alrededor (filtro de caja del tamaño de una casilla)
  const VW = tiles + 1, elev = new Float64Array(VW * VW);
  for (let v = 0; v <= tiles; v++) for (let u = 0; u <= tiles; u++) {
    let s = 0, n = 0;
    for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) {
      const [E, N] = frame.toUtmXY(u + du / 3, v + dv / 3);
      const h = ras.sample(E, N);
      if (Number.isFinite(h)) { s += h; n++; }
    }
    elev[v * VW + u] = n ? s / n : NaN;
  }
  // Huecos sin datos: se rellenan con los vecinos
  for (let pass = 0; pass < 50 && elev.some(x => Number.isNaN(x)); pass++) {
    const src = elev.slice();
    for (let i = 0; i < elev.length; i++) if (Number.isNaN(src[i])) {
      const u = i % VW, v = (i / VW) | 0;
      let s = 0, n = 0;
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = u + du, y = v + dv;
        if (x < 0 || y < 0 || x > tiles || y > tiles) continue;
        const h = src[y * VW + x];
        if (Number.isFinite(h)) { s += h; n++; }
      }
      if (n) elev[i] = s / n;
    }
  }
  for (let i = 0; i < elev.length; i++) if (Number.isNaN(elev[i])) elev[i] = 0;
  let eMin = Infinity, eMax = -Infinity;
  for (const h of elev) { eMin = Math.min(eMin, h); eMax = Math.max(eMax, h); }
  const exag = Number(args.exaggeration ?? 1.5), maxLevel = Number(args['max-level'] ?? 10);
  const trueMpl = mpt * ELEV_PX / TILE_EDGE_PX; // metros reales por nivel a escala 1:1
  const mpl = Math.max(trueMpl / exag, (eMax - eMin) / maxLevel, 0.01);
  log(`  Elevación ${eMin.toFixed(0)}–${eMax.toFixed(0)} m → 0–${((eMax - eMin) / mpl).toFixed(1)} niveles (${mpl.toFixed(1)} m por nivel; exageración efectiva ${(trueMpl / mpl).toFixed(2)}×)`);
  const heights = Array.from(elev, h => Math.round(((h - eMin) / mpl) * 100) / 100);

  // ---------------- OpenStreetMap
  const terrain = Array.from({ length: tiles }, () => new Array(tiles).fill('.'));
  const rivers = [], cliffs = [], settlements = [];
  let osmOk = false;
  if (!args['no-osm']) {
    let s = 90, n = -90, w = 180, e = -180;
    for (const [E, N] of [[box[0], box[1]], [box[0], box[3]], [box[2], box[1]], [box[2], box[3]]]) {
      const [la, lo] = fromUtm(E, N, zone);
      s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo);
    }
    const bb = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;
    const servers = args.overpass ? [String(args.overpass)] : OVERPASS;
    const queries = {
      agua: `[out:json][timeout:180];(way["waterway"~"^(river|stream|canal)$"](${bb});way["natural"="water"](${bb});relation["natural"="water"](${bb});way["landuse"~"^(reservoir|basin)$"](${bb});relation["landuse"="reservoir"](${bb});way["waterway"="riverbank"](${bb});relation["waterway"="riverbank"](${bb}););out geom;`,
      vegetación: `[out:json][timeout:180];(way["landuse"~"^(forest|meadow|grass|farmland|orchard|vineyard|allotments)$"](${bb});relation["landuse"~"^(forest|meadow|grass|farmland)$"](${bb});way["natural"~"^(wood|scrub|heath|grassland)$"](${bb});relation["natural"~"^(wood|scrub|heath|grassland)$"](${bb}););out geom;`,
      'roca y núcleos': `[out:json][timeout:180];(way["natural"~"^(bare_rock|scree|shingle|glacier|cliff)$"](${bb});relation["natural"~"^(bare_rock|scree|glacier)$"](${bb});way["landuse"~"^(residential|industrial|commercial|retail)$"](${bb});relation["landuse"~"^(residential|industrial)$"](${bb});node["place"~"^(city|town|village|hamlet)$"](${bb}););out geom;`,
    };
    const elements = [];
    try {
      for (const [what, q] of Object.entries(queries)) {
        log(`  OpenStreetMap: ${what}…`);
        const els = await overpass(q, servers, refresh);
        log(`    ${els.length} elementos`);
        elements.push(...els);
      }
      osmOk = true;
    } catch (err) {
      log(`  No se pudo descargar OpenStreetMap (${err.message}). El mapa tendrá solo relieve; vuelve a ejecutar el script más tarde.`);
    }
    const proj = p => frame.toTile(...toUtm(p.lat, p.lon, zone));
    const inside = (pts, m) => pts.some(([x, y]) => x >= -m && y >= -m && x <= tiles + m && y <= tiles + m);
    // Un polígono puede envolver el mapa entero sin tener vértices dentro: basta con que su recuadro lo toque
    const overlaps = pts => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return x1 >= 0 && y1 >= 0 && x0 <= tiles && y0 <= tiles;
    };
    // Polígonos por capas
    const polys = Object.fromEntries(LAYERS.map(l => [l, []]));
    for (const el of elements) {
      const tags = el.tags ?? {};
      if (el.type === 'node') {
        const [x, y] = proj(el);
        if (x < 1 || y < 1 || x > tiles - 1 || y > tiles - 1 || !tags.name) continue;
        const pop = Number(String(tags.population ?? '').replace(/[^\d]/g, '')) || undefined;
        settlements.push({ name: tags.name, kind: tags.place, x: +x.toFixed(2), y: +y.toFixed(2), ...(pop ? { population: pop } : {}) });
        continue;
      }
      if (el.type === 'way' && /^(river|stream|canal)$/.test(tags.waterway ?? '') && el.geometry) {
        const pts = el.geometry.map(proj);
        if (!inside(pts, 2)) continue;
        rivers.push({ name: tags.name ?? '', kind: tags.waterway, points: simplify(pts).map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]) });
        continue;
      }
      if (el.type === 'way' && tags.natural === 'cliff' && el.geometry) {
        const pts = el.geometry.map(proj);
        if (inside(pts, 1)) cliffs.push(pts);
        continue;
      }
      const cls = landClass(tags);
      if (!cls) continue;
      let rings;
      if (el.type === 'way' && el.geometry) rings = [el.geometry];
      else if (el.type === 'relation' && el.members) rings = assembleRings(el.members.filter(m => m.type === 'way' && m.geometry).map(m => m.geometry));
      else continue;
      const tr = rings.map(r => r.map(proj));
      if (tr.some(overlaps)) polys[cls].push(tr);
    }
    for (const cls of LAYERS) for (const rings of polys[cls]) fillRings(rings, tiles, (u, v) => { terrain[v][u] = cls; });
    // Los acantilados son roca
    for (const pts of cliffs) for (let i = 0; i + 1 < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2) + 1;
      for (let k = 0; k <= steps; k++) {
        const u = Math.floor(x1 + (x2 - x1) * k / steps), v = Math.floor(y1 + (y2 - y1) * k / steps);
        if (u >= 0 && v >= 0 && u < tiles && v < tiles) terrain[v][u] = 'r';
      }
    }
    const rank = { city: 0, town: 1, village: 2, hamlet: 3 };
    settlements.sort((a, b) => (rank[a.kind] - rank[b.kind]) || ((b.population ?? 0) - (a.population ?? 0)));
    log(`  ${rivers.length} tramos de río, ${settlements.length} núcleos: ${settlements.slice(0, 8).map(s => s.name).join(', ')}${settlements.length > 8 ? '…' : ''}`);
  }

  const counts = {};
  for (const row of terrain) for (const c of row) counts[c] = (counts[c] ?? 0) + 1;
  log(`  Terreno: ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${(100 * n / tiles / tiles).toFixed(0)}%`).join(' · ')}`);

  const attribution = [
    demMode === 'icgc' ? 'Elevaciones: Institut Cartogràfic i Geològic de Catalunya (ICGC), CC BY 4.0' : null,
    /Copernicus/.test(demName) ? 'Elevaciones: Copernicus DEM GLO-30 © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, proporcionado bajo el programa COPERNICUS de la Unión Europea y la ESA' : null,
    osmOk ? 'Ríos, bosques, usos del suelo y núcleos: © colaboradores de OpenStreetMap, ODbL 1.0' : null,
  ].filter(Boolean);

  const out = {
    format: 1,
    id,
    name: String(args.name ?? id),
    description: String(args.description ?? `Mapa real generado a partir de datos geográficos (${(sideM / 1000).toFixed(1)}×${(sideM / 1000).toFixed(1)} km).`),
    attribution,
    source: {
      center: [+cLat.toFixed(6), +cLon.toFixed(6)], crs: `EPSG:${zone === 31 && demMode === 'icgc' ? 25831 : 32600 + zone}`,
      utmCenter: [Math.round(cE), Math.round(cN)], sideMeters: Math.round(sideM), rotation: rotate, dem: demName, osm: osmOk,
      generated: new Date().toISOString().slice(0, 10),
    },
    size: tiles,
    metersPerTile: +mpt.toFixed(3),
    elevation: { min: +eMin.toFixed(1), max: +eMax.toFixed(1), metersPerLevel: +mpl.toFixed(3) },
    snowLine: Number(args['snow-line'] ?? 2300),
    pineLine: Number(args['pine-line'] ?? 1400),
    rockSlopeDeg: Number(args['rock-slope'] ?? 40),
    ...(args.starts ? { preferredStarts: String(args.starts).split(',').map(s => s.trim()).filter(Boolean) } : {}),
    legend: LEGEND,
    terrain: terrain.map(r => r.join('')),
    heights,
    rivers,
    settlements,
  };
  await mkdir(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${id}.json`);
  await writeFile(file, JSON.stringify(out) + '\n');
  log(`Escrito ${file.replace(ROOT + '/', '')} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
}

/** Quita puntos a menos de media casilla del anterior. */
function simplify(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = out[out.length - 1];
    if (Math.hypot(pts[i][0] - x, pts[i][1] - y) >= 0.5 || i === pts.length - 1) out.push(pts[i]);
  }
  return out;
}

main().catch(err => { console.error(err); process.exit(1); });
