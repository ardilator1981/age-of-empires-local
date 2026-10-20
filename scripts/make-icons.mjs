// Genera los iconos de la PWA (PNG y SVG) en public/icons/ sin dependencias externas.
// Uso: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const GOLD = '#e9c86a', GOLD_DIM = '#a8884a', DARK = '#2c2621', RED = '#b0382a';

/** Castillo dibujado en un espacio de 100×100. */
const castle = [
  { t: 'rect', x: 16, y: 80, w: 68, h: 4, fill: GOLD_DIM },
  // torres
  { t: 'rect', x: 22, y: 34, w: 16, h: 46, fill: GOLD },
  { t: 'rect', x: 62, y: 34, w: 16, h: 46, fill: GOLD },
  ...[22, 28, 34, 62, 68, 74].map(x => ({ t: 'rect', x, y: 28, w: 4, h: 6, fill: GOLD })),
  // muralla
  { t: 'rect', x: 38, y: 46, w: 24, h: 34, fill: GOLD },
  ...[40, 48, 56].map(x => ({ t: 'rect', x, y: 41, w: 4, h: 5, fill: GOLD })),
  // torre del homenaje
  { t: 'rect', x: 44, y: 26, w: 12, h: 20, fill: GOLD },
  ...[44, 48.25, 52.5].map(x => ({ t: 'rect', x, y: 21, w: 3.5, h: 5, fill: GOLD })),
  // bandera
  { t: 'rect', x: 49.5, y: 9, w: 1.2, h: 12, fill: GOLD },
  { t: 'poly', pts: [[50.7, 9], [63, 13], [50.7, 17]], fill: RED },
  // puerta y saeteras
  { t: 'rect', x: 45, y: 63, w: 10, h: 17, fill: DARK },
  { t: 'circle', cx: 50, cy: 63, r: 5, fill: DARK },
  { t: 'rect', x: 29, y: 46, w: 2, h: 9, fill: DARK },
  { t: 'rect', x: 69, y: 46, w: 2, h: 9, fill: DARK },
  { t: 'rect', x: 49, y: 31, w: 2, h: 7, fill: DARK },
];

/** Fondo de piedra (degradado vertical) y, si no es maskable, borde dorado. */
function shapes({ maskable, rounded }) {
  const r = rounded ? 18 : 0;
  const out = [{ t: 'rrect', x: 0, y: 0, w: 100, h: 100, r, fill: 'grad' }];
  if (!maskable) out.push({ t: 'rrect', x: 4, y: 4, w: 92, h: 92, r: Math.max(0, r - 4), stroke: GOLD_DIM, sw: 2.5 });
  // En los iconos maskable el contenido debe caber en el 80 % central
  const k = maskable ? 0.72 : 1, o = (100 - 100 * k) / 2;
  for (const s of castle) out.push(scale(s, k, o));
  return out;
}

function scale(s, k, o) {
  const p = v => v * k + o;
  switch (s.t) {
    case 'rect': return { ...s, x: p(s.x), y: p(s.y), w: s.w * k, h: s.h * k };
    case 'circle': return { ...s, cx: p(s.cx), cy: p(s.cy), r: s.r * k };
    case 'poly': return { ...s, pts: s.pts.map(([x, y]) => [p(x), p(y)]) };
    default: return s;
  }
}

// ------------------------------------------------------------ SVG

function svg(list) {
  const body = list.map(s => {
    const fill = s.fill === 'grad' ? 'url(#g)' : s.fill ?? 'none';
    const stroke = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw}"` : '';
    switch (s.t) {
      case 'rrect': return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${fill}"${stroke}/>`;
      case 'rect': return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${fill}"/>`;
      case 'circle': return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${fill}"/>`;
      case 'poly': return `<polygon points="${s.pts.map(p => p.join(',')).join(' ')}" fill="${fill}"/>`;
    }
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5e52"/><stop offset="1" stop-color="#2c2621"/></linearGradient></defs>${body}</svg>\n`;
}

// ------------------------------------------------------------ PNG

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function inRRect(x, y, s, inset = 0) {
  const x0 = s.x + inset, y0 = s.y + inset, x1 = s.x + s.w - inset, y1 = s.y + s.h - inset, r = Math.max(0, s.r - inset);
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Color (rgba) de un punto del icono, pintando las figuras en orden. */
function sample(list, x, y) {
  let c = null;
  for (const s of list) {
    let hit = false;
    if (s.t === 'rrect') hit = s.stroke ? inRRect(x, y, s, -s.sw / 2) && !inRRect(x, y, s, s.sw / 2) : inRRect(x, y, s);
    else if (s.t === 'rect') hit = x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
    else if (s.t === 'circle') hit = (x - s.cx) ** 2 + (y - s.cy) ** 2 <= s.r * s.r;
    else if (s.t === 'poly') hit = inPoly(x, y, s.pts);
    if (!hit) continue;
    if (s.fill === 'grad') { const t = y / 100; c = [106 + (44 - 106) * t, 94 + (38 - 94) * t, 82 + (33 - 82) * t]; }
    else c = hex(s.stroke ?? s.fill);
  }
  return c;
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(list, size) {
  const SS = 4; // supermuestreo para bordes suaves
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = sample(list, ((px + (sx + 0.5) / SS) / size) * 100, ((py + (sy + 0.5) / SS) / size) * 100);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const i = py * (size * 4 + 1) + 1 + px * 4;
      raw[i] = a ? r / a : 0; raw[i + 1] = a ? g / a : 0; raw[i + 2] = a ? b / a : 0; raw[i + 3] = (a / (SS * SS)) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const normal = shapes({ maskable: false, rounded: true });
const square = shapes({ maskable: false, rounded: false });
const maskable = shapes({ maskable: true, rounded: false });

writeFileSync(new URL('icon.svg', OUT), svg(normal));
writeFileSync(new URL('icon-192.png', OUT), png(normal, 192));
writeFileSync(new URL('icon-512.png', OUT), png(normal, 512));
writeFileSync(new URL('icon-maskable-512.png', OUT), png(maskable, 512));
// iOS redondea las esquinas por su cuenta: icono cuadrado sin transparencia
writeFileSync(new URL('apple-touch-icon.png', OUT), png(square, 180));
console.log('Iconos generados en public/icons/');
