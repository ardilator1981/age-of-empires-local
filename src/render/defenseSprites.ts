import type { Registry } from '../core/Registry';
import type { Pt, SpriteContext, SpriteFn } from '../core/types';
import { poly, shade } from './draw';
import { defenseTexture, paintTextured } from './art/defenseTextures';

/**
 * Sprites procedurales de las defensas lineales: empalizada y muros (`wall`) y zanja y puente (`ditch`).
 * Los tramos se dibujan unidos a sus vecinos (`SpriteContext.link`, por la marca `spriteParams.link`):
 * los muros son un solo cuerpo continuo (sin aristas en las uniones entre casillas), la empalizada
 * son troncos con punta y la zanja tiene esquinas redondeadas y taludes.
 */

const DIRS: [number, number][] = [[-1, 0], [0, -1], [1, 0], [0, 1]];
const lift = (p: Pt, h: number, z: number): Pt => ({ x: p.x, y: p.y - h * z });

/** Textura de las caras del tramo que se está dibujando (null: color liso). */
let faceTex: HTMLImageElement | null = null;

/** Textura de un tramo según su material (`spriteParams.tex`, o por la empalizada y el color). */
function textureFor(P: Record<string, any>): HTMLImageElement | null {
  const name: string = P.tex ?? (P.stakes ? 'palisade' : MATERIAL[P.color as string] ?? '');
  return name ? defenseTexture(name) : null;
}
const MATERIAL: Record<string, string> = { '#8a6a3e': 'wood', '#a9a398': 'stone', '#8c8a86': 'fortified' };

const EDGE = 'rgba(20,14,8,0.6)';
/** Las alturas de `spriteParams.height` quedaban bajas junto a las tropas (unos 40 px): se escalan al dibujar. */
const HEIGHT_SCALE = 2.4;
const frac = (v: number) => v - Math.floor(v);
/** Valor pseudoaleatorio estable de una casilla (para variar troncos y bordes sin `Math.random`). */
const hash = (a: number, b: number, c = 0) => frac(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453);

/**
 * Prisma de (x0, y0) a (x1, y1) con altura entre h0 y h1: tapa y las dos caras que se ven. Sin aristas
 * verticales (salvo con `edges`) para que los tramos contiguos se vean como un solo cuerpo.
 */
function slab(s: SpriteContext, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, col: string, edges = false) {
  const { ctx, z, project: pr } = s;
  const A = pr(x0, y0), B = pr(x1, y0), C = pr(x1, y1), D = pr(x0, y1);
  const L = (p: Pt, h: number) => lift(p, h, z);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(0.5, 0.8 * z);
  const front = [L(D, h0), L(C, h0), L(C, h1), L(D, h1)], side = [L(C, h0), L(B, h0), L(B, h1), L(C, h1)];
  poly(ctx, front); ctx.fillStyle = shade(col, 0.02); ctx.fill();
  poly(ctx, side); ctx.fillStyle = shade(col, -0.22); ctx.fill();
  if (faceTex) {
    // La textura se alinea con el mundo (una repetición por casilla) para que los tramos encajen
    const ux = pr(x0 + 1, y1), uy = pr(x1, y0 + 1), fx = x0 - Math.floor(x0), fy = y0 - Math.floor(y0);
    const stepX = { x: ux.x - D.x, y: ux.y - D.y }, stepY = { x: uy.x - B.x, y: uy.y - B.y };
    const hv = { x: 0, y: (h1 - h0) * z };
    const top1 = L(D, h1), top2 = L(B, h1);
    paintTextured(ctx, faceTex, front, { x: top1.x - fx * stepX.x, y: top1.y - fx * stepX.y }, stepX, hv);
    paintTextured(ctx, faceTex, side, { x: top2.x - fy * stepY.x, y: top2.y - fy * stepY.y }, stepY, hv);
    ctx.fillStyle = 'rgba(0,0,0,0.24)'; poly(ctx, side); ctx.fill();
  }
  const topFace = [L(A, h1), L(B, h1), L(C, h1), L(D, h1)];
  poly(ctx, topFace); ctx.fillStyle = shade(col, 0.14); ctx.fill();
  if (faceTex) {
    // La tapa se ve desde arriba: la misma textura tendida sobre el suelo, aclarada
    const o = L(pr(Math.floor(x0), Math.floor(y0)), h1), ex = L(pr(Math.floor(x0) + 1, Math.floor(y0)), h1), ey = L(pr(Math.floor(x0), Math.floor(y0) + 1), h1);
    paintTextured(ctx, faceTex, topFace, o, { x: ex.x - o.x, y: ex.y - o.y }, { x: ey.x - o.x, y: ey.y - o.y });
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; poly(ctx, topFace); ctx.fill();
  }
  // Contorno: solo el borde de arriba y el pie (y las aristas verticales si es un pilar suelto)
  ctx.strokeStyle = EDGE;
  ctx.beginPath(); ctx.moveTo(L(D, h1).x, L(D, h1).y); ctx.lineTo(L(C, h1).x, L(C, h1).y); ctx.lineTo(L(B, h1).x, L(B, h1).y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L(D, h0).x, L(D, h0).y); ctx.lineTo(L(C, h0).x, L(C, h0).y); ctx.lineTo(L(B, h0).x, L(B, h0).y); ctx.stroke();
  if (edges) {
    ctx.beginPath(); ctx.moveTo(L(C, h0).x, L(C, h0).y); ctx.lineTo(L(C, h1).x, L(C, h1).y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L(D, h0).x, L(D, h0).y); ctx.lineTo(L(D, h1).x, L(D, h1).y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L(B, h0).x, L(B, h0).y); ctx.lineTo(L(B, h1).x, L(B, h1).y); ctx.stroke();
  }
}

/** Barra oblicua de A a B (en casillas) con medio ancho `th`: para los tramos que se unen en diagonal. */
function bar(s: SpriteContext, ax: number, ay: number, bx: number, by: number, th: number, h: number, col: string, h0 = 0) {
  const { ctx, z, project: pr } = s;
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len * th, ny = (bx - ax) / len * th;
  const q = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
  const g = (i: number, hh: number) => lift(pr(q[i][0], q[i][1]), hh, z);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(0.5, 0.8 * z);
  // Caras laterales que miran al observador (normal con x + y > 0), de la más lejana a la más cercana
  for (const [i, j, ox, oy] of [[0, 1, nx, ny], [3, 2, -nx, -ny]] as [number, number, number, number][]) {
    if (ox + oy <= 0) continue;
    poly(ctx, [g(i, h0), g(j, h0), g(j, h), g(i, h)]);
    ctx.fillStyle = shade(col, 0.02 - 0.24 * (ox / ((Math.abs(ox) + Math.abs(oy)) || 1)));
    ctx.fill();
    if (faceTex) {
      const a = g(i, h0), b = g(j, h0), o = g(i, h);
      paintTextured(ctx, faceTex, [g(i, h0), g(j, h0), g(j, h), g(i, h)], o, { x: (b.x - a.x) / len, y: (b.y - a.y) / len }, { x: 0, y: (h - h0) * z });
      if (ox > 0) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; poly(ctx, [g(i, h0), g(j, h0), g(j, h), g(i, h)]); ctx.fill(); }
    }
  }
  const topFace = [g(0, h), g(1, h), g(2, h), g(3, h)];
  poly(ctx, topFace); ctx.fillStyle = shade(col, 0.14); ctx.fill();
  if (faceTex) {
    const o = lift(pr(Math.floor(ax), Math.floor(ay)), h, z), ex = lift(pr(Math.floor(ax) + 1, Math.floor(ay)), h, z), ey = lift(pr(Math.floor(ax), Math.floor(ay) + 1), h, z);
    paintTextured(ctx, faceTex, topFace, o, { x: ex.x - o.x, y: ex.y - o.y }, { x: ey.x - o.x, y: ey.y - o.y });
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; poly(ctx, topFace); ctx.fill();
  }
  poly(ctx, topFace); ctx.stroke();
}

/** Almenas alrededor de la tapa de una torre: en las esquinas y en medio de cada lado (de atrás hacia delante). */
function towerMerlons(s: SpriteContext, cx: number, cy: number, hx: number, hy: number, h: number, col: string) {
  const w = 0.05, ex = hx - w, ey = hy - w;
  const spots: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  spots.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [dx, dy] of spots) {
    const mx = cx + dx * ex, my = cy + dy * ey;
    slab(s, mx - w, my - w, mx + w, my + w, h, h + 5, col);
  }
}

/** Franja del color del jugador al pie de un prisma (como en las murallas de AoE2): solo en las dos caras que se ven. */
function band(s: SpriteContext, x0: number, y0: number, x1: number, y1: number) {
  if (!/^#[0-9a-f]{6}$/i.test(s.color)) return;
  const { ctx, z, project: pr } = s;
  const B = pr(x1, y0), C = pr(x1, y1), D = pr(x0, y1), h0 = 0.6, h1 = 2.6;
  ctx.fillStyle = shade(s.color, -0.05);
  poly(ctx, [lift(D, h0, z), lift(C, h0, z), lift(C, h1, z), lift(D, h1, z)]); ctx.fill();
  ctx.fillStyle = shade(s.color, -0.35);
  poly(ctx, [lift(C, h0, z), lift(B, h0, z), lift(B, h1, z), lift(C, h1, z)]); ctx.fill();
}

/** Torre de muralla (rectangular: medio ancho `hx` × `hy`): más ancha y alta que el lienzo, con almenas y la franja del jugador. */
function tower(s: SpriteContext, cx: number, cy: number, hx: number, hy: number, h: number, col: string, crenels: boolean) {
  slab(s, cx - hx, cy - hy, cx + hx, cy + hy, 0, h, col, true);
  band(s, cx - hx, cy - hy, cx + hx, cy + hy);
  if (crenels) towerMerlons(s, cx, cy, hx, hy, h, col);
}

/** Tronco redondo de empalizada (de pie en (x, y)): cilindro sombreado con la punta tallada. */
function log(s: SpriteContext, x: number, y: number, r: number, h: number, k: number, tex: HTMLImageElement | null) {
  const { ctx, z, project: pr } = s;
  const p = pr(x, y), rx = r * 32 * z, ry = rx * 0.5, top = p.y - h * z;
  const t = hash(x, y, k), tint = (t - 0.5) * 0.3;
  const base = '#7b6a56';
  // Cuerpo: rectángulo vertical con el pie redondeado
  ctx.beginPath();
  ctx.moveTo(p.x - rx, top); ctx.lineTo(p.x - rx, p.y); ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(p.x + rx, top); ctx.closePath();
  ctx.fillStyle = shade(base, tint); ctx.fill();
  const body = [{ x: p.x - rx, y: top }, { x: p.x + rx, y: top }, { x: p.x + rx, y: p.y }, { x: p.x - rx, y: p.y }];
  if (tex) {
    const col = Math.floor(hash(x, y, k + 3) * 5);
    paintTextured(ctx, tex, body, { x: p.x - rx - col * 2 * rx, y: top }, { x: 10 * rx, y: 0 }, { x: 0, y: h * z });
  }
  // Volumen: luz por la izquierda, sombra por la derecha
  const g = ctx.createLinearGradient(p.x - rx, 0, p.x + rx, 0);
  g.addColorStop(0, 'rgba(255,240,215,0.22)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
  poly(ctx, body); ctx.fillStyle = g; ctx.fill();
  // Punta tallada, algo torcida
  const tip = { x: p.x + (hash(x, y, k + 7) - 0.5) * rx, y: top - (3 + 3 * t) * z };
  ctx.beginPath(); ctx.moveTo(p.x - rx, top); ctx.lineTo(tip.x, tip.y); ctx.lineTo(p.x + rx, top); ctx.closePath();
  ctx.fillStyle = shade('#a08c72', tint); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(p.x + rx, top); ctx.lineTo(p.x + rx * 0.2, top); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  ctx.strokeStyle = 'rgba(25,18,10,0.55)'; ctx.lineWidth = Math.max(0.4, 0.5 * z);
  ctx.beginPath(); ctx.moveTo(p.x + rx, p.y); ctx.lineTo(p.x + rx, top); ctx.lineTo(tip.x, tip.y); ctx.lineTo(p.x - rx, top); ctx.stroke();
}

/** Bastión de empalizada: un corro de troncos más altos (esquinas, extremos, puertas y cada pocos tramos). */
function bastion(s: SpriteContext, cx: number, cy: number, h: number, tex: HTMLImageElement | null) {
  const pts: [number, number][] = [[cx, cy]];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; pts.push([cx + Math.cos(a) * 0.17, cy + Math.sin(a) * 0.17]); }
  pts.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
  pts.forEach(([x, y], i) => log(s, x, y, 0.1, h * (0.92 + 0.12 * hash(x, y, 5)), i, tex));
}

/** ¿Lleva torre (o bastión) esta casilla? En esquinas, cruces, extremos y cada tres casillas de un tramo recto. */
function hasTower(tx: number, ty: number, has: boolean[], diagOnly: [number, number][]): boolean {
  const n = has.filter(Boolean).length + diagOnly.length;
  if (n !== 2) return true;
  if (has[0] && has[2]) return tx % 3 === 0;
  if (has[1] && has[3]) return ty % 3 === 0;
  if (diagOnly.length === 2 && diagOnly[0][0] === -diagOnly[1][0] && diagOnly[0][1] === -diagOnly[1][1]) return tx % 3 === 0;
  return true;
}

/**
 * Altura (px a zoom 1) de lo alto de un tramo, donde se dibujan los tiradores del paso de ronda
 * (`game/walkway.ts`): el adarve del lienzo o, si en la casilla hay torre, su plataforma.
 */
export function wallTopPx(P: Record<string, any>, tx: number, ty: number, link?: SpriteContext['link']): number {
  const H = (P.height ?? 22) * HEIGHT_SCALE;
  if (P.gate || P.stakes) return H;
  const has = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  const diagOnly = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][])
    .filter(([dx, dy]) => !has[dx < 0 ? 0 : 2] && !has[dy < 0 ? 1 : 3] && !!link?.(dx, dy));
  return hasTower(tx, ty, has, diagOnly) ? H * 1.35 : H;
}

/** Empalizada: troncos redondos muy juntos sobre una franja de tierra, con bastiones. */
function palisade(s: SpriteContext, has: boolean[], diagOnly: [number, number][], H: number, towerHere: boolean) {
  const { ctx, foot, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const cx = tx + 0.5, cy = ty + 0.5, tex = defenseTexture('palisade');
  // Franja de tierra apisonada bajo los troncos
  ctx.fillStyle = 'rgba(128,100,64,0.7)';
  const strip = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy), nx = -dy / len * 0.13, ny = dx / len * 0.13, ex = cx + dx * 0.5, ey = cy + dy * 0.5;
    poly(ctx, [pr(cx + nx, cy + ny), pr(ex + nx, ey + ny), pr(ex - nx, ey - ny), pr(cx - nx, cy - ny)]); ctx.fill();
  };
  DIRS.forEach(([dx, dy], i) => { if (has[i]) strip(dx, dy); });
  diagOnly.forEach(([dx, dy]) => strip(dx, dy));
  ctx.beginPath(); ctx.ellipse(pr(cx, cy).x, pr(cx, cy).y, 0.2 * 32 * s.z, 0.1 * 32 * s.z, 0, 0, Math.PI * 2); ctx.fill();
  // Troncos: el del centro y los de cada brazo (el que cae justo en el borde lo pone la casilla de abajo o la derecha)
  const pts: [number, number][] = towerHere ? [] : [[cx, cy]];
  const step = 0.125;
  DIRS.forEach(([dx, dy], i) => {
    if (!has[i]) return;
    const last = dx > 0 || dy > 0 ? 4 : 3;
    for (let k = towerHere ? 2 : 1; k <= last; k++) pts.push([cx + dx * step * k, cy + dy * step * k]);
  });
  diagOnly.forEach(([dx, dy]) => {
    const last = dy > 0 ? 5 : 4;
    for (let k = towerHere ? 2 : 1; k <= last; k++) pts.push([cx + dx * 0.1 * k, cy + dy * 0.1 * k]);
  });
  if (!has.some(Boolean) && !diagOnly.length && !towerHere) pts.push([cx - step, cy], [cx + step, cy]);
  const front = pts.filter(([x, y]) => x + y > cx + cy), back = pts.filter(([x, y]) => x + y <= cx + cy);
  const draw = (list: [number, number][]) => {
    list.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
    list.forEach(([x, y], i) => log(s, x, y, 0.085, H * (0.9 + 0.16 * hash(x, y, 9)), i, tex));
  };
  draw(back);
  if (towerHere) bastion(s, cx, cy, H * 1.3, tex);
  draw(front);
}

/**
 * Puerta: dos torres (o bastiones) a los lados, un dintel encima y un rastrillo en el hueco. `ux, uy` es la
 * dirección del muro (unitaria, en casillas): sirve igual para tramos rectos que en oblicuo.
 */
function gate(s: SpriteContext, ux: number, uy: number, H: number, col: string, woody: boolean, crenels: boolean, thc: number) {
  const { ctx, z, foot, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const cx = tx + 0.5, cy = ty + 0.5;
  // En oblicuo la casilla es más larga (√2): las torres se apartan más
  const half = Math.abs(ux) > 0.1 && Math.abs(uy) > 0.1 ? 0.7 : 0.5;
  const open = 0.17, tw = Math.min(0.2, Math.max(0.15, thc + 0.04)), off = Math.min(half - tw * 0.6, open + tw);
  // Normal hacia el observador (x + y crece hacia la pantalla)
  let nx = -uy, ny = ux;
  if (nx + ny < 0 || (nx + ny === 0 && ny < 0)) { nx = -nx; ny = -ny; }
  const sideAt = (k: number) => {
    const x = cx + ux * off * k, y = cy + uy * off * k;
    if (woody) bastion(s, x, y, H * 1.25, defenseTexture('palisade'));
    else tower(s, x, y, tw, tw, H * 1.3, col, crenels);
  };
  const back = ux + uy > 0 || (ux + uy === 0 && uy > 0) ? -1 : 1;
  sideAt(back);
  // Rastrillo: rejilla oscura en el plano de delante del hueco
  const hO = H * 0.68;
  const P0 = pr(cx - ux * open + nx * thc, cy - uy * open + ny * thc), P1 = pr(cx + ux * open + nx * thc, cy + uy * open + ny * thc);
  ctx.fillStyle = 'rgba(15,10,6,0.55)';
  poly(ctx, [P0, P1, lift(P1, hO, z), lift(P0, hO, z)]); ctx.fill();
  ctx.strokeStyle = woody ? 'rgba(70,50,30,0.95)' : 'rgba(40,40,44,0.95)'; ctx.lineWidth = Math.max(0.6, 1 * z);
  for (let i = 0; i <= 5; i++) {
    const a = { x: P0.x + (P1.x - P0.x) * i / 5, y: P0.y + (P1.y - P0.y) * i / 5 };
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - hO * z); ctx.stroke();
  }
  for (let j = 1; j <= 4; j++) {
    const h = hO * j / 4.5;
    ctx.beginPath(); ctx.moveTo(P0.x, P0.y - h * z); ctx.lineTo(P1.x, P1.y - h * z); ctx.stroke();
  }
  // Dintel sobre el hueco
  const tex = faceTex; if (woody) faceTex = defenseTexture('wood');
  bar(s, cx - ux * (off - tw), cy - uy * (off - tw), cx + ux * (off - tw), cy + uy * (off - tw), thc + 0.02, H, woody ? '#6e5536' : col, hO);
  faceTex = tex;
  sideAt(-back);
  // Lienzo que une las torres con el borde de la casilla (si queda hueco)
  if (!woody && off + tw < half - 0.02) {
    for (const k of [-1, 1]) bar(s, cx + ux * (off + tw) * k, cy + uy * (off + tw) * k, cx + ux * half * k, cy + uy * half * k, thc, H, col);
  }
}

/** Muro, empalizada o puerta de una casilla: lienzo fino con paso de ronda, torres y uniones con los vecinos. */
const wall: SpriteFn = s => {
  const { ctx, z, params: P, entity: e, foot, link, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  faceTex = textureFor(P);
  const complete = !e || e.complete, progress = e ? (e.complete ? 1 : e.progress) : 1;
  const col: string = P.color ?? '#a9a398';
  const H: number = (P.height ?? 22) * HEIGHT_SCALE * (complete ? 1 : 0.25 + 0.75 * progress);
  const thc = (P.thick ?? 0.17) * 1.15;
  const cx = tx + 0.5, cy = ty + 0.5;
  const has = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  // Uniones solo en oblicuo (si un lado ortogonal ya está unido, sobran)
  const diagOnly: [number, number][] = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][])
    .filter(([dx, dy]) => !has[dx < 0 ? 0 : 2] && !has[dy < 0 ? 1 : 3] && !!link?.(dx, dy));
  const towerHere = hasTower(tx, ty, has, diagOnly);
  const woody = !!P.stakes || P.color === '#8a6a3e';
  if (P.gate) {
    // Dirección del muro: la de los vecinos ortogonales, o la de los oblicuos si solo hay de esos
    let ux = has[0] || has[2] ? 1 : 0, uy = has[1] || has[3] ? 1 : 0;
    if (!ux && !uy && diagOnly.length) { const [dx, dy] = diagOnly[0]; ux = dx * Math.SQRT1_2; uy = dy * Math.SQRT1_2; }
    if (ux && uy && !diagOnly.length) uy = 0;
    if (!ux && !uy) ux = 1;
    gate(s, ux, uy, H, col, woody, !!P.crenels || !woody, thc);
  } else if (P.stakes) {
    palisade(s, has, diagOnly, H, towerHere);
  } else {
    const pw = Math.min(0.42, thc + 0.09);
    // Lienzo: de la torre (si la hay) o del centro hasta el borde de la casilla, con su paso de ronda y parapetos bajos
    const curtain = (dx: number, dy: number) => {
      const st = towerHere ? pw : 0;
      if (dx || dy) {
        if (dx && dy) { bar(s, cx + dx * st * 0.7, cy + dy * st * 0.7, cx + dx * 0.5, cy + dy * 0.5, thc, H, col); return; }
        const a = dx < 0 ? tx : dx > 0 ? cx + st : cx - thc, b = dx < 0 ? cx - st : dx > 0 ? tx + 1 : cx + thc;
        const c = dy < 0 ? ty : dy > 0 ? cy + st : cy - thc, d = dy < 0 ? cy - st : dy > 0 ? ty + 1 : cy + thc;
        slab(s, a, c, b, d, 0, H, col);
        band(s, a, c, b, d);
        const lw = 0.04;
        if (dx) { slab(s, a, c, b, c + lw, H, H + 2.6, col); slab(s, a, d - lw, b, d, H, H + 2.6, col); }
        else { slab(s, a, c, a + lw, d, H, H + 2.6, col); slab(s, b - lw, c, b, d, H, H + 2.6, col); }
      }
    };
    const back: [number, number][] = [], fwd: [number, number][] = [];
    DIRS.forEach(([dx, dy], i) => { if (has[i]) (dx + dy < 0 ? back : fwd).push([dx, dy]); });
    diagOnly.forEach(([dx, dy]) => (dx + dy < 0 || (dx + dy === 0 && dy < 0) ? back : fwd).push([dx, dy]));
    back.forEach(([dx, dy]) => curtain(dx, dy));
    if (towerHere || (!back.length && !fwd.length)) tower(s, cx, cy, pw, pw, H * 1.35, col, !!P.crenels);
    fwd.forEach(([dx, dy]) => curtain(dx, dy));
  }
  if (!complete) {
    ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = Math.max(0.6, 1.1 * z);
    const a = pr(tx + 0.15, ty + 0.85), b = pr(tx + 0.85, ty + 0.85);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - 16 * z); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - 16 * z); ctx.stroke();
  }
};

/** Contorno redondeado (en coordenadas de casilla) de un rectángulo: solo se redondean las esquinas no unidas. */
function roundedRect(x0: number, y0: number, x1: number, y1: number, rounded: [boolean, boolean, boolean, boolean], r: number): [number, number][] {
  const out: [number, number][] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) { const a = a0 + (Math.PI / 2) * (i / 4); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  };
  // Esquinas en orden: noroeste (x0, y0), noreste (x1, y0), sureste (x1, y1), suroeste (x0, y1)
  if (rounded[0]) arc(x0 + r, y0 + r, Math.PI); else out.push([x0, y0]);
  if (rounded[1]) arc(x1 - r, y0 + r, Math.PI * 1.5); else out.push([x1, y0]);
  if (rounded[2]) arc(x1 - r, y1 - r, 0); else out.push([x1, y1]);
  if (rounded[3]) arc(x0 + r, y1 - r, Math.PI * 0.5); else out.push([x0, y1]);
  return out;
}

/** Zanja: un surco hundido con taludes y esquinas redondeadas, unido a los tramos vecinos; con `bridge`, un puente de tablones. */
const ditch: SpriteFn = s => {
  const { ctx, z, params: P, entity: e, foot, link, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const complete = !e || e.complete, progress = e ? (e.complete ? 1 : e.progress) : 1;
  const d = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  const toPx = (pts: [number, number][]) => pts.map(([x, y]) => pr(x, y));
  const rect = (inset: number) => {
    const x0 = tx + (d[0] ? 0 : inset), x1 = tx + 1 - (d[2] ? 0 : inset);
    const y0 = ty + (d[1] ? 0 : inset), y1 = ty + 1 - (d[3] ? 0 : inset);
    // Una esquina se redondea si no continúa en ninguno de sus dos lados
    const rounded: [boolean, boolean, boolean, boolean] = [!d[0] && !d[1], !d[1] && !d[2], !d[2] && !d[3], !d[3] && !d[0]];
    return { x0, y0, x1, y1, pts: roundedRect(x0, y0, x1, y1, rounded, 0.2 - inset * 0.4) };
  };
  const bank = rect(0.04), pit = rect(0.19);
  // Tierra removida: el talud que rodea al surco
  ctx.fillStyle = 'rgba(110,84,52,0.78)'; poly(ctx, toPx(bank.pts)); ctx.fill();
  const soil = complete ? defenseTexture('ditch') : null;
  if (soil) {
    const o = pr(tx, ty), u = pr(tx + 1, ty), v = pr(tx, ty + 1);
    paintTextured(ctx, soil, toPx(bank.pts), o, { x: u.x - o.x, y: u.y - o.y }, { x: v.x - o.x, y: v.y - o.y });
    ctx.fillStyle = 'rgba(40,26,12,0.3)'; poly(ctx, toPx(bank.pts)); ctx.fill();
  }
  // El hoyo, más oscuro cuanto más hondo (y a medias mientras se cava)
  ctx.fillStyle = complete ? '#2b1f14' : `rgba(43,31,20,${0.35 + 0.5 * progress})`;
  poly(ctx, toPx(pit.pts)); ctx.fill();
  if (complete) {
    // Taludes interiores: la pared de atrás recibe la luz (arriba a la izquierda), la de delante queda en sombra
    ctx.save();
    ctx.beginPath(); toPx(pit.pts).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
    const a = pr(pit.x0, pit.y0), b = pr(pit.x1, pit.y0), c = pr(pit.x0, pit.y1);
    ctx.strokeStyle = 'rgba(120,92,58,0.55)'; ctx.lineWidth = Math.max(1, 5 * z); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
    if (soil) {
      ctx.save(); ctx.globalAlpha = 0.5;
      const o = pr(tx, ty), u = pr(tx + 1, ty), v = pr(tx, ty + 1);
      paintTextured(ctx, soil, toPx(pit.pts), o, { x: u.x - o.x, y: u.y - o.y }, { x: v.x - o.x, y: v.y - o.y });
      ctx.restore();
      ctx.fillStyle = 'rgba(10,6,2,0.45)'; poly(ctx, toPx(pit.pts)); ctx.fill();
    }
    if (P.water) {
      const w = rect(0.26);
      ctx.fillStyle = 'rgba(70,96,110,0.6)'; poly(ctx, toPx(w.pts)); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(20,14,8,0.5)'; ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.lineJoin = 'round';
  poly(ctx, toPx(pit.pts)); ctx.stroke();
  if (P.bridge) {
    // Tablero de tablones que cruza el surco: más ancho que el hoyo y apoyado en los taludes
    const alongY = d[1] || d[3];
    const x0 = alongY ? tx + 0.0 : tx + 0.22, x1 = alongY ? tx + 1.0 : tx + 0.78;
    const y0 = alongY ? ty + 0.22 : ty + 0.0, y1 = alongY ? ty + 0.78 : ty + 1.0;
    const lift2 = (p: Pt, h = 3) => ({ x: p.x, y: p.y - h * z });
    const top = [pr(x0, y0), pr(x1, y0), pr(x1, y1), pr(x0, y1)].map(p => lift2(p));
    const planks = defenseTexture('bridge');
    // Canto del tablero
    ctx.fillStyle = '#5a4026'; poly(ctx, [lift2(pr(x0, y1), 0), lift2(pr(x1, y1), 0), top[2], top[3]]); ctx.fill();
    ctx.fillStyle = '#46311c'; poly(ctx, [lift2(pr(x1, y1), 0), lift2(pr(x1, y0), 0), top[1], top[2]]); ctx.fill();
    ctx.fillStyle = '#a97c48'; poly(ctx, top); ctx.fill();
    if (planks) {
      const o = lift2(pr(tx, ty)), u = lift2(pr(tx + 1, ty)), v = lift2(pr(tx, ty + 1));
      paintTextured(ctx, planks, top, o, { x: u.x - o.x, y: u.y - o.y }, { x: v.x - o.x, y: v.y - o.y });
    } else {
      for (let i = 0; i < 4; i++) {
        const t = 0.18 + i * 0.2;
        const a = alongY ? lift2(pr(tx + 0.02, ty + 0.22 + t * 0.56)) : lift2(pr(tx + 0.22 + t * 0.56, ty + 0.02));
        const b = alongY ? lift2(pr(tx + 0.98, ty + 0.22 + t * 0.56)) : lift2(pr(tx + 0.22 + t * 0.56, ty + 0.98));
        ctx.strokeStyle = '#7a5530'; ctx.lineWidth = Math.max(1, 3 * z); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(0.5, 0.8 * z); poly(ctx, top); ctx.stroke();
  }
};

export function registerDefenseSprites(reg: Registry) {
  reg.addSprite('wall', wall);
  reg.addSprite('ditch', ditch);
}
