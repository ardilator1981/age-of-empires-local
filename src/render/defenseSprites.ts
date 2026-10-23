import type { Registry } from '../core/Registry';
import type { Pt, SpriteContext, SpriteFn } from '../core/types';
import { lerpPt, poly, shade } from './draw';

/**
 * Sprites procedurales de las defensas lineales: empalizada y muros (`wall`) y zanja y puente (`ditch`).
 * Los tramos se dibujan unidos a sus vecinos (`SpriteContext.link`, por la marca `spriteParams.link`).
 */

const DIRS: [number, number][] = [[-1, 0], [0, -1], [1, 0], [0, 1]];
const lift = (p: Pt, h: number, z: number): Pt => ({ x: p.x, y: p.y - h * z });

/** Prisma de (x0, y0) a (x1, y1) con altura entre h0 y h1: tapa y las dos caras que se ven. */
function slab(s: SpriteContext, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, col: string) {
  const { ctx, z, project: pr } = s;
  const A = pr(x0, y0), B = pr(x1, y0), C = pr(x1, y1), D = pr(x0, y1);
  const L = (p: Pt, h: number) => lift(p, h, z);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,14,8,0.85)'; ctx.lineWidth = Math.max(0.5, 0.8 * z);
  poly(ctx, [L(D, h0), L(C, h0), L(C, h1), L(D, h1)]); ctx.fillStyle = shade(col, 0.02); ctx.fill(); ctx.stroke();
  poly(ctx, [L(C, h0), L(B, h0), L(B, h1), L(C, h1)]); ctx.fillStyle = shade(col, -0.22); ctx.fill(); ctx.stroke();
  poly(ctx, [L(A, h1), L(B, h1), L(C, h1), L(D, h1)]); ctx.fillStyle = shade(col, 0.14); ctx.fill(); ctx.stroke();
}

/** Barra oblicua de A a B (en casillas) con medio ancho `th`: para los tramos que se unen en diagonal. */
function bar(s: SpriteContext, ax: number, ay: number, bx: number, by: number, th: number, h: number, col: string) {
  const { ctx, z, project: pr } = s;
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len * th, ny = (bx - ax) / len * th;
  const q = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
  const g = (i: number, hh: number) => lift(pr(q[i][0], q[i][1]), hh, z);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,14,8,0.85)'; ctx.lineWidth = Math.max(0.5, 0.8 * z);
  // Caras laterales que miran al observador (normal con x + y > 0), de la más lejana a la más cercana
  for (const [i, j, ox, oy] of [[0, 1, nx, ny], [3, 2, -nx, -ny]] as [number, number, number, number][]) {
    if (ox + oy <= 0) continue;
    poly(ctx, [g(i, 0), g(j, 0), g(j, h), g(i, h)]);
    ctx.fillStyle = shade(col, 0.02 - 0.24 * (ox / ((Math.abs(ox) + Math.abs(oy)) || 1)));
    ctx.fill(); ctx.stroke();
  }
  poly(ctx, [g(0, h), g(1, h), g(2, h), g(3, h)]); ctx.fillStyle = shade(col, 0.14); ctx.fill(); ctx.stroke();
}

/** Muro, empalizada o puerta de una casilla: un pilar central con brazos hacia los tramos vecinos. */
const wall: SpriteFn = s => {
  const { ctx, z, params: P, entity: e, foot, link, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const complete = !e || e.complete, progress = e ? (e.complete ? 1 : e.progress) : 1;
  const col: string = P.color ?? '#a9a398', top: string = P.top ?? col;
  const H: number = (P.height ?? 22) * (complete ? 1 : 0.25 + 0.75 * progress);
  const th = P.thick ?? 0.17;
  const cx = tx + 0.5, cy = ty + 0.5;
  // Sombra en el suelo
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  poly(ctx, [pr(tx + 0.1, ty + 0.1), pr(tx + 0.95, ty + 0.1), pr(tx + 0.95, ty + 0.95), pr(tx + 0.1, ty + 0.95)]); ctx.fill();
  const has = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  const arm = (i: number) => {
    const [dx, dy] = DIRS[i];
    const x0 = dx < 0 ? tx : dx > 0 ? cx : cx - th, x1 = dx < 0 ? cx : dx > 0 ? tx + 1 : cx + th;
    const y0 = dy < 0 ? ty : dy > 0 ? cy : cy - th, y1 = dy < 0 ? cy : dy > 0 ? ty + 1 : cy + th;
    const ah = P.gate ? Math.min(H, 8) : H * 0.82;
    slab(s, x0, y0, x1, y1, 0, ah, col);
    if (P.stakes) stakes(s, x0, y0, x1, y1, ah);
  };
  const diag = (dx: number, dy: number) => {
    if (link?.(dx, dy)) bar(s, cx, cy, cx + dx * 0.5, cy + dy * 0.5, Math.max(0.1, th * 0.8), P.gate ? Math.min(H, 8) : H * 0.82, col);
  };
  // De atrás hacia delante: los brazos hacia -x y -y primero, los de +x y +y después del pilar
  diag(-1, -1); arm(0); arm(1);
  const pw = P.gate ? 0.3 : th + 0.07;
  if (P.gate) {
    // Puerta: dos pilares y un dintel; el hueco se ve oscuro
    const alongY = has[1] || has[3];
    const a = alongY ? [cx - th - 0.1, cy - 0.42, cx + th + 0.1, cy - 0.28] : [cx - 0.42, cy - th - 0.1, cx - 0.28, cy + th + 0.1];
    const b = alongY ? [cx - th - 0.1, cy + 0.28, cx + th + 0.1, cy + 0.42] : [cx + 0.28, cy - th - 0.1, cx + 0.42, cy + th + 0.1];
    slab(s, a[0], a[1], a[2], a[3], 0, H, col);
    slab(s, cx - (alongY ? th + 0.1 : 0.36), cy - (alongY ? 0.36 : th + 0.1), cx + (alongY ? th + 0.1 : 0.36), cy + (alongY ? 0.36 : th + 0.1), H * 0.78, H * 0.92, shade(col, -0.1));
    slab(s, b[0], b[1], b[2], b[3], 0, H, col);
  } else {
    slab(s, cx - pw, cy - pw, cx + pw, cy + pw, 0, H, col);
    ctx.fillStyle = top;
    if (P.crenels) {
      const t = lift(pr(cx, cy), H, z);
      ctx.fillRect(t.x - 2.2 * z, t.y - 2.2 * z, 4.4 * z, 2.2 * z);
    }
  }
  arm(2); arm(3);
  // Uniones en diagonal (las líneas trazadas en oblicuo): una barra hasta la esquina compartida
  for (const [dx, dy] of [[1, -1], [-1, 1], [1, 1]]) diag(dx, dy);
  if (!complete) {
    ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = Math.max(0.6, 1.1 * z);
    const a = pr(tx + 0.15, ty + 0.85), b = pr(tx + 0.85, ty + 0.85);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - 16 * z); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - 16 * z); ctx.stroke();
  }
};

/** Estacas puntiagudas sobre las caras de una empalizada. */
function stakes(s: SpriteContext, x0: number, y0: number, x1: number, y1: number, h: number) {
  const { ctx, z, project: pr } = s;
  const a = pr(x0, y1), b = pr(x1, y1), c = pr(x1, y0);
  const n = 3;
  ctx.strokeStyle = 'rgba(30,20,10,0.55)'; ctx.lineWidth = Math.max(0.5, 0.7 * z);
  for (const [p, q] of [[a, b], [b, c]] as [Pt, Pt][]) {
    for (let i = 1; i < n; i++) {
      const m = lerpPt(p, q, i / n);
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x, m.y - h * z); ctx.stroke();
    }
  }
}

/** Zanja: un surco oscuro hundido, unido a los tramos vecinos; con `bridge`, unas tablas encima. */
const ditch: SpriteFn = s => {
  const { ctx, z, params: P, entity: e, foot, link, project: pr } = s;
  if (!foot) return;
  const { tx, ty } = foot;
  const complete = !e || e.complete, progress = e ? (e.complete ? 1 : e.progress) : 1;
  const inset = 0.14, d = DIRS.map(([dx, dy]) => !!link?.(dx, dy));
  const x0 = tx + (d[0] ? 0 : inset), x1 = tx + 1 - (d[2] ? 0 : inset);
  const y0 = ty + (d[1] ? 0 : inset), y1 = ty + 1 - (d[3] ? 0 : inset);
  const ring = [pr(x0, y0), pr(x1, y0), pr(x1, y1), pr(x0, y1)];
  ctx.fillStyle = 'rgba(86,64,38,0.55)';
  poly(ctx, [pr(tx, ty), pr(tx + 1, ty), pr(tx + 1, ty + 1), pr(tx, ty + 1)]); ctx.fill(); // tierra removida
  ctx.fillStyle = complete ? '#2a1e13' : `rgba(42,30,19,${0.35 + 0.5 * progress})`;
  poly(ctx, ring); ctx.fill();
  if (complete && P.water) {
    ctx.fillStyle = 'rgba(70,96,110,0.55)';
    poly(ctx, [pr(x0 + 0.12, y0 + 0.12), pr(x1 - 0.12, y0 + 0.12), pr(x1 - 0.12, y1 - 0.12), pr(x0 + 0.12, y1 - 0.12)]); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,14,8,0.7)'; ctx.lineWidth = Math.max(0.5, 0.8 * z);
  poly(ctx, ring); ctx.stroke();
  if (P.bridge) {
    // Tablones atravesando el surco
    const alongY = d[1] || d[3];
    for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.2;
      const a = alongY ? pr(tx + 0.08, ty + t) : pr(tx + t, ty + 0.08), b = alongY ? pr(tx + 0.92, ty + t) : pr(tx + t, ty + 0.92);
      ctx.strokeStyle = '#7a5530'; ctx.lineWidth = Math.max(1, 3 * z); ctx.beginPath(); ctx.moveTo(a.x, a.y - 2 * z); ctx.lineTo(b.x, b.y - 2 * z); ctx.stroke();
      ctx.strokeStyle = '#a97c48'; ctx.lineWidth = Math.max(0.6, 1.6 * z); ctx.beginPath(); ctx.moveTo(a.x, a.y - 2.5 * z); ctx.lineTo(b.x, b.y - 2.5 * z); ctx.stroke();
    }
  }
};

export function registerDefenseSprites(reg: Registry) {
  reg.addSprite('wall', wall);
  reg.addSprite('ditch', ditch);
}
