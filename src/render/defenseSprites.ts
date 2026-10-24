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
const HEIGHT_SCALE = 1.95;
/** Un color hexadecimal oscurecido (`shade` devuelve `rgb()`, que `slab` no admite como base). */
const darken = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - f)).toString(16).padStart(2, '0')).join('');
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
function bar(s: SpriteContext, ax: number, ay: number, bx: number, by: number, th: number, h: number, col: string) {
  const { ctx, z, project: pr } = s;
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len * th, ny = (bx - ax) / len * th;
  const q = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
  const g = (i: number, hh: number) => lift(pr(q[i][0], q[i][1]), hh, z);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(0.5, 0.8 * z);
  // Caras laterales que miran al observador (normal con x + y > 0), de la más lejana a la más cercana
  for (const [i, j, ox, oy] of [[0, 1, nx, ny], [3, 2, -nx, -ny]] as [number, number, number, number][]) {
    if (ox + oy <= 0) continue;
    poly(ctx, [g(i, 0), g(j, 0), g(j, h), g(i, h)]);
    ctx.fillStyle = shade(col, 0.02 - 0.24 * (ox / ((Math.abs(ox) + Math.abs(oy)) || 1)));
    ctx.fill();
  }
  poly(ctx, [g(0, h), g(1, h), g(2, h), g(3, h)]); ctx.fillStyle = shade(col, 0.14); ctx.fill(); ctx.stroke();
}

/** Almenas en las cuatro esquinas de un pilar de muro (cambios de dirección, cruces y extremos). */
function merlons(s: SpriteContext, cx: number, cy: number, pw: number, h: number, col: string) {
  const w = 0.055;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const mx = cx + dx * (pw - w), my = cy + dy * (pw - w);
    slab(s, mx - w, my - w, mx + w, my + w, h, h + 5.5, col);
  }
}

/** Tronco de empalizada: prisma de madera con la punta tallada. */
function log(s: SpriteContext, x: number, y: number, w: number, h: number, k: number) {
  const { ctx, z, project: pr } = s;
  const A = pr(x - w, y - w), B = pr(x + w, y - w), C = pr(x + w, y + w), D = pr(x - w, y + w);
  const L = (p: Pt, hh: number) => lift(p, hh, z);
  const tint = (hash(x, y, k) - 0.5) * 0.32;
  const base = '#8a6a3e', tip = lift(pr(x, y), h + 5, z);
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.5, 0.7 * z); ctx.strokeStyle = 'rgba(25,16,8,0.75)';
  const front = [L(D, 0), L(C, 0), L(C, h), L(D, h)], side = [L(C, 0), L(B, 0), L(B, h), L(C, h)];
  const tipFront = [L(D, h), L(C, h), tip], tipSide = [L(C, h), L(B, h), tip];
  poly(ctx, front); ctx.fillStyle = shade(base, tint + 0.04); ctx.fill();
  poly(ctx, side); ctx.fillStyle = shade(base, tint - 0.2); ctx.fill();
  poly(ctx, tipFront); ctx.fillStyle = shade(base, tint + 0.12); ctx.fill();
  poly(ctx, tipSide); ctx.fillStyle = shade(base, tint - 0.1); ctx.fill();
  if (faceTex) {
    // Un quinto de la imagen (un tronco) por tronco, según su posición; la misma imagen cubre el cuerpo y la punta
    const col = Math.floor(hash(x, y, k + 3) * 5), hh = (h + 5) * z;
    const uf = { x: (C.x - D.x) * 5, y: (C.y - D.y) * 5 }, of = L(D, h + 5);
    const us = { x: (B.x - C.x) * 5, y: (B.y - C.y) * 5 }, os = L(C, h + 5);
    for (const f of [front, tipFront]) paintTextured(ctx, faceTex, f, { x: of.x - col / 5 * uf.x, y: of.y - col / 5 * uf.y }, uf, { x: 0, y: hh });
    for (const f of [side, tipSide]) paintTextured(ctx, faceTex, f, { x: os.x - col / 5 * us.x, y: os.y - col / 5 * us.y }, us, { x: 0, y: hh });
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; poly(ctx, side); ctx.fill(); poly(ctx, tipSide); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; poly(ctx, side); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(L(D, 0).x, L(D, 0).y); ctx.lineTo(L(D, h).x, L(D, h).y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(L(C, h).x, L(C, h).y); ctx.lineTo(L(C, 0).x, L(C, 0).y);
  ctx.moveTo(L(C, h).x, L(C, h).y); ctx.lineTo(L(B, h).x, L(B, h).y); ctx.lineTo(tip.x, tip.y); ctx.moveTo(L(B, h).x, L(B, h).y); ctx.lineTo(L(B, 0).x, L(B, 0).y);
  ctx.stroke();
  void A;
}

/** Empalizada: troncos con punta a lo largo de los tramos vecinos (de atrás hacia delante). */
function palisade(s: SpriteContext, has: boolean[], H: number, complete: boolean) {
  const { foot, link } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const cx = tx + 0.5, cy = ty + 0.5;
  const pts: [number, number][] = [[cx, cy]];
  DIRS.forEach(([dx, dy], i) => { if (has[i]) pts.push([cx + dx * 0.2, cy + dy * 0.2], [cx + dx * 0.4, cy + dy * 0.4]); });
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (link?.(dx, dy)) pts.push([cx + dx * 0.17, cy + dy * 0.17], [cx + dx * 0.34, cy + dy * 0.34]);
  if (!has.some(Boolean) && pts.length === 1) pts.push([cx - 0.2, cy], [cx + 0.2, cy]);
  pts.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  pts.forEach(([x, y], i) => log(s, x, y, 0.1, H * (0.86 + 0.18 * hash(x, y, 9)) * (complete ? 1 : 1), i));
}

/** Muro, empalizada o puerta de una casilla: brazos continuos hacia los tramos vecinos. */
const wall: SpriteFn = s => {
  const { ctx, z, params: P, entity: e, foot, link, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  faceTex = textureFor(P);
  const complete = !e || e.complete, progress = e ? (e.complete ? 1 : e.progress) : 1;
  const col: string = P.color ?? '#a9a398', top: string = P.top ?? col;
  const H: number = (P.height ?? 22) * HEIGHT_SCALE * (complete ? 1 : 0.25 + 0.75 * progress);
  const th = (P.thick ?? 0.17) * (P.stakes ? 1 : 0.95);
  const cx = tx + 0.5, cy = ty + 0.5;
  // Sombra en el suelo
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  poly(ctx, [pr(tx + 0.1, ty + 0.1), pr(tx + 0.95, ty + 0.1), pr(tx + 0.95, ty + 0.95), pr(tx + 0.1, ty + 0.95)]); ctx.fill();
  const has = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  if (P.stakes) {
    palisade(s, has, H, complete);
  } else {
    const ah = P.gate ? Math.min(H, 8) : H;
    const arm = (i: number) => {
      const [dx, dy] = DIRS[i];
      const x0 = dx < 0 ? tx : dx > 0 ? cx : cx - th, x1 = dx < 0 ? cx : dx > 0 ? tx + 1 : cx + th;
      const y0 = dy < 0 ? ty : dy > 0 ? cy : cy - th, y1 = dy < 0 ? cy : dy > 0 ? ty + 1 : cy + th;
      slab(s, x0, y0, x1, y1, 0, ah, col);
    };
    const diag = (dx: number, dy: number) => {
      // Solo las uniones que de verdad van en oblicuo: si algún lado ortogonal ya está unido, la barra sobra
      if (has[dx < 0 ? 0 : 2] || has[dy < 0 ? 1 : 3]) return;
      if (link?.(dx, dy)) bar(s, cx, cy, cx + dx * 0.5, cy + dy * 0.5, Math.max(0.1, th * 0.8), P.gate ? Math.min(H, 8) : H, col);
    };
    // De atrás hacia delante: los brazos hacia -x y -y primero, los de +x y +y después del pilar
    diag(-1, -1);
    if (P.gate) {
      // Puerta: dos torreones a los lados de la casilla y un dintel encima; el hueco queda abierto
      const alongY = has[1] || has[3], pw = th + 0.06, op = 0.26;
      const box = (a0: number, a1: number, h0: number, h1: number, c: string) => alongY
        ? slab(s, cx - pw, ty + a0, cx + pw, ty + a1, h0, h1, c, true)
        : slab(s, tx + a0, cy - pw, tx + a1, cy + pw, h0, h1, c, true);
      box(0, 0.5 - op, 0, H, col);
      const tex = faceTex; faceTex = null; // el dintel es bajo: va liso
      box(0.5 - op, 0.5 + op, H * 0.74, H, darken(col, 0.08));
      faceTex = tex;
      box(0.5 + op, 1, 0, H, col);
    } else {
      arm(0); arm(1);
    }
    const straight = (has[0] && has[2] && !has[1] && !has[3]) || (has[1] && has[3] && !has[0] && !has[2]);
    if (P.gate) {
      // (los torreones ya están dibujados)
    } else if (!straight) {
      // Esquinas, cruces y extremos: un pilar algo más alto y ancho que el muro
      const pw = th + 0.04;
      slab(s, cx - pw, cy - pw, cx + pw, cy + pw, 0, H + 1.5, col, true);
      ctx.fillStyle = top;
      if (P.crenels) merlons(s, cx, cy, pw, H + 1.5, col);
    }
    if (!P.gate) { arm(2); arm(3); }
    // Uniones en diagonal (las líneas trazadas en oblicuo): una barra hasta la esquina compartida
    for (const [dx, dy] of [[1, -1], [-1, 1], [1, 1]]) diag(dx, dy);
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
