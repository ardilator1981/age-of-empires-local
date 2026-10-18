import type { Registry } from '../core/Registry';
import type { Pt, SpriteContext, SpriteFn } from '../core/types';
import { SpriteCache, ellipse, lerpPt, poly, seeded, shade, up } from './draw';

/**
 * Sprites procedurales (no se usa ningún recurso gráfico del juego original).
 * Cada sprite es una función registrada con un id; las definiciones de unidades
 * y edificios eligen sprite + parámetros. Un mod puede registrar sprites nuevos.
 */

export const cache = new SpriteCache();
const SKIN = '#e2b48c';

// ================================================================ unidades

function drawWeapon(ctx: CanvasRenderingContext2D, weapon: string | undefined, swing: number) {
  if (!weapon) return;
  ctx.save();
  ctx.lineCap = 'round';
  switch (weapon) {
    case 'sword': {
      ctx.translate(4, -13);
      ctx.rotate(-0.5 + swing * 1.8);
      ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -11); ctx.stroke();
      ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(2, -1); ctx.stroke();
      break;
    }
    case 'spear':
    case 'javelin': {
      const len = weapon === 'spear' ? 26 : 15;
      ctx.translate(4 + swing * 5, -12);
      ctx.rotate(0.35 + swing * 0.5);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -len + 6); ctx.stroke();
      ctx.fillStyle = '#d0d4d8';
      poly(ctx, [{ x: -1.6, y: -len + 7 }, { x: 0, y: -len + 1 }, { x: 1.6, y: -len + 7 }]); ctx.fill();
      break;
    }
    case 'bow': {
      const pull = swing * 3;
      ctx.translate(6, -14);
      ctx.strokeStyle = '#7a4f22'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-3, 0, 7, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0.2, -6.2); ctx.lineTo(-2 - pull, 0); ctx.lineTo(0.2, 6.2); ctx.stroke();
      break;
    }
    case 'axe':
    case 'throwingAxe': {
      ctx.translate(4, -13);
      ctx.rotate(-0.3 + swing * 1.9);
      ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
      ctx.fillStyle = '#b8bec4';
      poly(ctx, [{ x: 0, y: -9 }, { x: 3.5, y: -10.5 }, { x: 3.5, y: -6 }, { x: 0, y: -7 }]); ctx.fill();
      break;
    }
    case 'staff': {
      ctx.translate(4, -12);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -12); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function animState(s: SpriteContext) {
  const e = s.entity;
  const id = e?.id ?? 0;
  const walk = e?.moving ? Math.sin(s.time * 11 + id) : 0;
  let swing = 0;
  if (e && e.attackAnim > 0) swing = Math.sin(((0.35 - e.attackAnim) / 0.35) * Math.PI);
  else if (e?.working) swing = (Math.sin(s.time * 7 + id) + 1) / 2;
  return { walk, swing, facing: e?.facing ?? 1 };
}

export const humanoid: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, params: P } = s;
  const { walk, swing, facing } = animState(s);
  const sc = P.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing * sc, z * sc);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, 0, 0, 7, 3); ctx.fill();
  ctx.strokeStyle = P.legs ?? '#4a3420'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.8, -9); ctx.lineTo(-1.8 - walk * 2.5, -0.8);
  ctx.moveTo(1.8, -9); ctx.lineTo(1.8 + walk * 2.5, -0.8);
  ctx.stroke();
  if (P.cape) {
    ctx.fillStyle = shade(color, -0.4);
    poly(ctx, [{ x: -3, y: -18 }, { x: -7.5, y: -5 }, { x: -1, y: -7 }]); ctx.fill();
  }
  if (e?.carry && e.carry.amount > 0.5) {
    const cc: Record<string, string> = { wood: '#8b5a2b', food: '#c0392b', gold: '#f1c40f', stone: '#9e9e9e' };
    ctx.fillStyle = cc[e.carry.type] ?? '#a0522d';
    ctx.fillRect(-8.5, -17, 4.5, 7);
  }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-4.5, -18, 9, 10, 2.5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
  if (P.armor) { ctx.fillStyle = '#9aa3ab'; ctx.fillRect(-3.5, -17, 7, 5); }
  ctx.fillStyle = 'rgba(40,25,10,0.7)'; ctx.fillRect(-4.5, -11, 9, 1.6);
  ctx.fillStyle = SKIN;
  ellipse(ctx, 0, -21.5, 3.6, 3.6); ctx.fill();
  if (P.helmet) {
    ctx.fillStyle = '#8d969e';
    ctx.beginPath(); ctx.arc(0, -22, 3.9, Math.PI, 0); ctx.fill();
    ctx.fillRect(-4.2, -22.6, 8.4, 1.3);
  } else if (P.hood) {
    ctx.fillStyle = P.hood;
    ctx.beginPath(); ctx.arc(0, -22, 4.1, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
  } else {
    ctx.fillStyle = P.hair ?? '#5a3a1e';
    ctx.beginPath(); ctx.arc(0, -22.3, 3.7, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
  if (P.shield) {
    ctx.fillStyle = shade(color, -0.25);
    ellipse(ctx, -4.8, -13, 3.1, 4.4); ctx.fill();
    ctx.strokeStyle = '#d8c08a'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  drawWeapon(ctx, P.weapon, swing);
  ctx.restore();
};

export const cavalry: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, params: P, time } = s;
  const { swing, facing } = animState(s);
  const g = e?.moving ? Math.sin(time * 14 + (e?.id ?? 0)) : 0;
  const sc = P.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing * sc, z * sc);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, 0, 0, 13, 4); ctx.fill();
  const horse = P.horse ?? '#7b5232';
  ctx.strokeStyle = shade(horse, -0.3); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -8); ctx.lineTo(-7 - g * 3, -0.5);
  ctx.moveTo(-4, -8); ctx.lineTo(-4 + g * 3, -0.5);
  ctx.moveTo(5, -8); ctx.lineTo(5 + g * 3, -0.5);
  ctx.moveTo(8, -8); ctx.lineTo(8 - g * 3, -0.5);
  ctx.stroke();
  ctx.strokeStyle = shade(horse, -0.4); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, -11); ctx.quadraticCurveTo(-14, -9, -13, -4); ctx.stroke();
  ctx.fillStyle = horse;
  ellipse(ctx, 0, -10.5, 10.5, 4.8); ctx.fill();
  poly(ctx, [{ x: 6, y: -13 }, { x: 11, y: -21 }, { x: 14, y: -19 }, { x: 10, y: -10 }]); ctx.fill();
  ellipse(ctx, 13.5, -20, 3.8, 2.3); ctx.fill();
  if (P.barding) {
    ctx.fillStyle = color;
    ellipse(ctx, 0, -10, 9.5, 4.3); ctx.fill();
    ctx.strokeStyle = '#e8d9a0'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // jinete
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-3.5, -24, 7, 10, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
  if (P.armor) { ctx.fillStyle = '#9aa3ab'; ctx.fillRect(-3, -23, 6, 4.5); }
  ctx.fillStyle = SKIN;
  ellipse(ctx, 0, -27, 3.3, 3.3); ctx.fill();
  if (P.helmet) {
    ctx.fillStyle = '#8d969e';
    ctx.beginPath(); ctx.arc(0, -27.5, 3.6, Math.PI, 0); ctx.fill();
  } else {
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.arc(0, -27.7, 3.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
  ctx.save();
  ctx.translate(0, -9);
  drawWeapon(ctx, P.weapon, swing);
  ctx.restore();
  ctx.restore();
};

export const ram: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, time } = s;
  const facing = e?.facing ?? 1;
  const bump = e && e.attackAnim > 0 ? Math.sin(((0.35 - e.attackAnim) / 0.35) * Math.PI) * 3 : 0;
  const roll = e?.moving ? time * 6 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing, z);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 0, 0, 16, 5); ctx.fill();
  ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-4 + bump, -9); ctx.lineTo(16 + bump, -9); ctx.stroke();
  ctx.fillStyle = '#8a8f94'; ctx.fillRect(15 + bump, -11, 3, 4);
  ctx.fillStyle = '#7a5530'; ctx.fillRect(-13, -11, 26, 7);
  ctx.fillStyle = '#5e3f22';
  poly(ctx, [{ x: -15, y: -11 }, { x: 0, y: -22 }, { x: 15, y: -11 }]); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-7, -15, 14, 2);
  for (const wx of [-8, 8]) {
    ctx.fillStyle = '#3d2a17'; ellipse(ctx, wx, -3.5, 3.8, 3.8); ctx.fill();
    ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(wx + Math.cos(roll) * 3, -3.5 + Math.sin(roll) * 3); ctx.lineTo(wx - Math.cos(roll) * 3, -3.5 - Math.sin(roll) * 3); ctx.stroke();
  }
  ctx.restore();
};

// ================================================================ edificios

type Quad = { T: Pt; R: Pt; B: Pt; L: Pt };
type Proj = (x: number, y: number) => Pt;

function stroke(ctx: CanvasRenderingContext2D, z: number) {
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = Math.max(0.5, 0.8 * z);
  ctx.stroke();
}

/** Caja isométrica entre (x0,y0)-(x1,y1) desde la altura `base` con altura `h` (px a zoom 1). */
function isoBox(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, y0: number, x1: number, y1: number, base: number, h: number, z: number, wall: string, top?: string): Quad {
  const T = pr(x0, y0), R = pr(x1, y0), B = pr(x1, y1), L = pr(x0, y1);
  const b = base * z, H = (base + h) * z;
  ctx.fillStyle = shade(wall, -0.28);
  poly(ctx, [up(L, b), up(B, b), up(B, H), up(L, H)]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(wall, -0.06);
  poly(ctx, [up(B, b), up(R, b), up(R, H), up(B, H)]); ctx.fill(); stroke(ctx, z);
  const q = { T: up(T, H), R: up(R, H), B: up(B, H), L: up(L, H) };
  ctx.fillStyle = top ?? shade(wall, 0.15);
  poly(ctx, [q.T, q.R, q.B, q.L]); ctx.fill(); stroke(ctx, z);
  return q;
}

function pyramidRoof(ctx: CanvasRenderingContext2D, q: Quad, h: number, z: number, roof: string, overhang = 1.12): Pt {
  const c = { x: (q.T.x + q.R.x + q.B.x + q.L.x) / 4, y: (q.T.y + q.R.y + q.B.y + q.L.y) / 4 };
  const ex = (p: Pt) => ({ x: c.x + (p.x - c.x) * overhang, y: c.y + (p.y - c.y) * overhang });
  const T = ex(q.T), R = ex(q.R), B = ex(q.B), L = ex(q.L);
  const A = up(c, h * z);
  ctx.fillStyle = shade(roof, 0.08); poly(ctx, [L, T, A]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(roof, -0.05); poly(ctx, [T, R, A]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(roof, -0.3); poly(ctx, [L, B, A]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(roof, 0.12); poly(ctx, [B, R, A]); ctx.fill(); stroke(ctx, z);
  return A;
}

function gableRoof(ctx: CanvasRenderingContext2D, q: Quad, h: number, z: number, roof: string, wall: string): Pt {
  const rA = up(lerpPt(q.T, q.L, 0.5), h * z), rB = up(lerpPt(q.R, q.B, 0.5), h * z);
  ctx.fillStyle = shade(roof, 0.15); poly(ctx, [q.T, q.R, rB, rA]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(wall, 0.1); poly(ctx, [q.T, q.L, rA]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(roof, -0.18); poly(ctx, [q.L, q.B, rB, rA]); ctx.fill(); stroke(ctx, z);
  ctx.fillStyle = shade(wall, -0.06); poly(ctx, [q.B, q.R, rB]); ctx.fill(); stroke(ctx, z);
  // tejas
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = Math.max(0.4, 0.6 * z);
  for (let i = 1; i < 4; i++) {
    const a = lerpPt(q.L, rA, i / 4), b = lerpPt(q.B, rB, i / 4);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  return lerpPt(rA, rB, 0.5);
}

function crenels(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, n: number, h: number, z: number, wall: string) {
  ctx.fillStyle = shade(wall, -0.1);
  for (let i = 0; i < n; i += 2) {
    const p0 = lerpPt(a, b, i / n), p1 = lerpPt(a, b, (i + 1) / n);
    poly(ctx, [p0, p1, up(p1, h * z), up(p0, h * z)]); ctx.fill(); stroke(ctx, z);
  }
}

function flag(ctx: CanvasRenderingContext2D, base: Pt, z: number, color: string, time: number) {
  const top = up(base, 18 * z);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(0.8, 1.2 * z);
  ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  const w = Math.sin(time * 4 + base.x * 0.1) * 1.5 * z;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(top.x + 5 * z, top.y + w, top.x + 11 * z, top.y + 2 * z + w);
  ctx.lineTo(top.x + 11 * z, top.y + 7 * z + w);
  ctx.quadraticCurveTo(top.x + 5 * z, top.y + 5 * z + w, top.x, top.y + 6 * z);
  ctx.closePath(); ctx.fill();
}

function door(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, x1: number, y1: number, h: number, z: number) {
  const a = pr(x0 + (x1 - x0) * 0.4, y1), b = pr(x0 + (x1 - x0) * 0.6, y1);
  ctx.fillStyle = '#3a2614';
  poly(ctx, [a, b, up(b, h * z), up(a, h * z)]); ctx.fill();
}

function windowOn(ctx: CanvasRenderingContext2D, pr: Proj, x1: number, y0: number, y1: number, at: number, base: number, h: number, z: number) {
  const a = pr(x1, y0 + (y1 - y0) * (at - 0.07)), b = pr(x1, y0 + (y1 - y0) * (at + 0.07));
  ctx.fillStyle = 'rgba(30,20,10,0.75)';
  poly(ctx, [up(a, base * z), up(b, base * z), up(b, (base + h) * z), up(a, (base + h) * z)]); ctx.fill();
}

export const building: SpriteFn = s => {
  const { ctx, z, color, entity: e, params: P, project: pr, foot, time } = s;
  if (!foot) return;
  const { tx, ty, size } = foot;
  const complete = !e || e.complete;
  const k = complete ? 1 : 0.15 + 0.85 * (e?.progress ?? 0);
  const inset = P.inset ?? 0.12;
  const x0 = tx + inset, y0 = ty + inset, x1 = tx + size - inset, y1 = ty + size - inset;
  const wall = P.wall ?? '#d2bf95', roof = P.roof ?? '#8e4a2c';
  const style: string = P.style ?? 'house';

  if (!complete) {
    ctx.fillStyle = 'rgba(125,98,62,0.85)';
    poly(ctx, [pr(tx, ty), pr(tx + size, ty), pr(tx + size, ty + size), pr(tx, ty + size)]); ctx.fill();
  }
  ctx.save();
  if (!complete) ctx.globalAlpha = 0.75;

  let flagAt: Pt | null = null;
  switch (style) {
    case 'tc': {
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, 16 * k, z, wall);
      if (complete) {
        door(ctx, pr, x0, x1, y1, 10, z);
        windowOn(ctx, pr, x1, y0, y1, 0.3, 6, 5, z); windowOn(ctx, pr, x1, y0, y1, 0.7, 6, 5, z);
      }
      if (k > 0.5) {
        const m = size * 0.24;
        const q2 = isoBox(ctx, pr, x0 + m, y0 + m, x1 - m, y1 - m, 16 * k, 16 * k, z, shade(wall, -0.05));
        flagAt = pyramidRoof(ctx, q2, 26 * k, z, roof);
        void q;
      }
      break;
    }
    case 'house': {
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, 14 * k, z, wall);
      if (complete) door(ctx, pr, x0, x1, y1, 8, z);
      flagAt = gableRoof(ctx, q, 13 * k, z, roof, wall);
      break;
    }
    case 'hall': {
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, (P.height ?? 20) * k, z, wall);
      if (complete) {
        door(ctx, pr, x0, x1, y1, 11, z);
        windowOn(ctx, pr, x1, y0, y1, 0.5, 8, 5, z);
      }
      flagAt = gableRoof(ctx, q, (P.roofHeight ?? 15) * k, z, roof, wall);
      if (complete && P.target) {
        const c = pr(x1, (y0 + y1) / 2);
        for (const [r, col] of [[5, '#f3f3f3'], [3.4, '#c0392b'], [1.6, '#f3f3f3']] as const) {
          ctx.fillStyle = col; ellipse(ctx, c.x + 1 * z, c.y - 10 * z, r * z * 0.7, r * z); ctx.fill();
        }
      }
      break;
    }
    case 'smithy': {
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, 16 * k, z, wall);
      if (complete) door(ctx, pr, x0, x1, y1, 9, z);
      flagAt = pyramidRoof(ctx, q, 16 * k, z, roof);
      if (complete) {
        isoBox(ctx, pr, x1 - 0.7, y0 + 0.3, x1 - 0.3, y0 + 0.7, 16, 20, z, '#6b625a');
        const ch = up(pr(x1 - 0.5, y0 + 0.5), 38 * z);
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.6 + i / 3) % 1;
          ctx.fillStyle = `rgba(200,200,200,${0.45 * (1 - t)})`;
          ellipse(ctx, ch.x + t * 6 * z, ch.y - t * 18 * z, (2 + t * 4) * z, (2 + t * 4) * z); ctx.fill();
        }
      }
      break;
    }
    case 'shed': {
      const h = 14 * k;
      ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1, 2 * z);
      for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
        const p = pr(px, py);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - h * z); ctx.stroke();
      }
      const c = pr((x0 + x1) / 2, (y0 + y1) / 2);
      if (complete) {
        if (P.pile === 'wood') {
          ctx.fillStyle = '#8b5a2b';
          for (let i = 0; i < 4; i++) { ellipse(ctx, c.x + (i - 1.5) * 4 * z, c.y - 3 * z - (i % 2) * 3 * z, 5 * z, 2.2 * z); ctx.fill(); }
        } else {
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? '#a7a7a7' : '#e0be3c';
            ellipse(ctx, c.x + (i - 1.5) * 4 * z, c.y - 2 * z - (i % 2) * 2 * z, 3.5 * z, 2.5 * z); ctx.fill();
          }
        }
      }
      const q: Quad = { T: up(pr(x0, y0), h * z), R: up(pr(x1, y0), h * z), B: up(pr(x1, y1), h * z), L: up(pr(x0, y1), h * z) };
      flagAt = pyramidRoof(ctx, q, 12 * k, z, roof, 1.18);
      break;
    }
    case 'mill': {
      const q = isoBox(ctx, pr, x0 + 0.15, y0 + 0.15, x1 - 0.15, y1 - 0.15, 0, 20 * k, z, wall);
      if (complete) door(ctx, pr, x0 + 0.15, x1 - 0.15, y1 - 0.15, 9, z);
      const apex = pyramidRoof(ctx, q, 14 * k, z, roof);
      if (complete) {
        const hub = up(pr(x1 - 0.1, y1 - 0.1), 26 * z);
        const a0 = time * 1.2;
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(0.8, 1.4 * z);
        for (let i = 0; i < 4; i++) {
          const a = a0 + (i * Math.PI) / 2;
          const tip = { x: hub.x + Math.cos(a) * 20 * z, y: hub.y + Math.sin(a) * 20 * z };
          ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
          const side = { x: Math.cos(a + 0.25) * 18 * z + hub.x, y: Math.sin(a + 0.25) * 18 * z + hub.y };
          const side2 = { x: Math.cos(a + 0.25) * 7 * z + hub.x, y: Math.sin(a + 0.25) * 7 * z + hub.y };
          const mid = { x: Math.cos(a) * 7 * z + hub.x, y: Math.sin(a) * 7 * z + hub.y };
          ctx.fillStyle = 'rgba(240,230,210,0.9)';
          poly(ctx, [mid, tip, side, side2]); ctx.fill();
        }
      }
      flagAt = apex;
      break;
    }
    case 'tower': {
      const stone = P.wall ?? '#b5aa98';
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, 56 * k, z, stone);
      if (k > 0.95) {
        crenels(ctx, q.L, q.B, 5, 4, z, stone);
        crenels(ctx, q.B, q.R, 5, 4, z, stone);
        flagAt = pyramidRoof(ctx, q, 14, z, roof, 1.25);
      }
      break;
    }
    case 'castle': {
      const stone = P.wall ?? '#a59c8c';
      const q = isoBox(ctx, pr, x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.3, 0, 34 * k, z, stone);
      if (k > 0.95) {
        crenels(ctx, q.L, q.B, 9, 4, z, stone);
        crenels(ctx, q.B, q.R, 9, 4, z, stone);
        const t = 1;
        const keep = isoBox(ctx, pr, x0 + 1.2, y0 + 1.2, x1 - 1.2, y1 - 1.2, 34, 22, z, shade(stone, 0.05));
        flagAt = pyramidRoof(ctx, keep, 18, z, roof);
        for (const [cx, cy] of [[x0, y0], [x1 - t, y0], [x0, y1 - t], [x1 - t, y1 - t]]) {
          const tq = isoBox(ctx, pr, cx, cy, cx + t, cy + t, 0, 50, z, stone);
          crenels(ctx, tq.L, tq.B, 3, 4, z, stone);
          crenels(ctx, tq.B, tq.R, 3, 4, z, stone);
        }
        door(ctx, pr, x0 + 0.3, x1 - 0.3, y1 - 0.3, 14, z);
      }
      break;
    }
    default: {
      const q = isoBox(ctx, pr, x0, y0, x1, y1, 0, (P.height ?? 18) * k, z, wall);
      flagAt = pyramidRoof(ctx, q, (P.roofHeight ?? 14) * k, z, roof);
    }
  }

  if (!complete) {
    // andamios
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = Math.max(0.6, 1.2 * z);
    const H = ((P.height ?? 20) + 10) * z;
    for (const [px, py] of [[tx, ty + size], [tx + size, ty + size], [tx + size, ty]]) {
      const p = pr(px, py);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - H); ctx.stroke();
    }
    const L = pr(tx, ty + size), B = pr(tx + size, ty + size), R = pr(tx + size, ty);
    for (const f of [0.35, 0.7]) {
      ctx.beginPath(); ctx.moveTo(L.x, L.y - H * f); ctx.lineTo(B.x, B.y - H * f); ctx.lineTo(R.x, R.y - H * f); ctx.stroke();
    }
  } else if (flagAt && P.flag !== false) {
    flag(ctx, flagAt, z, color, time);
  }
  ctx.restore();
};

export const farm: SpriteFn = s => {
  const { ctx, z, entity: e, project: pr, foot } = s;
  if (!foot) return;
  const { tx, ty, size } = foot;
  const i = 0.06;
  const T = pr(tx + i, ty + i), R = pr(tx + size - i, ty + i), B = pr(tx + size - i, ty + size - i), L = pr(tx + i, ty + size - i);
  const complete = !e || e.complete;
  ctx.fillStyle = complete ? '#7a5a32' : 'rgba(140,110,70,0.8)';
  poly(ctx, [T, R, B, L]); ctx.fill();
  ctx.strokeStyle = '#5e4424'; ctx.lineWidth = Math.max(0.6, 1.2 * z);
  ctx.stroke();
  const ratio = e ? Math.max(0, e.amount / (e.initialAmount || 1)) : 1;
  const rows = 6;
  for (let r = 1; r < rows; r++) {
    const a = lerpPt(T, L, r / rows), b = lerpPt(R, B, r / rows);
    ctx.strokeStyle = 'rgba(70,45,20,0.6)'; ctx.lineWidth = Math.max(0.5, 1 * z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (complete && ratio > 0) {
      ctx.strokeStyle = `rgba(${Math.round(150 + 60 * (1 - ratio))},${Math.round(170 + 20 * ratio)},60,0.95)`;
      ctx.lineWidth = Math.max(1, 2.4 * z * (0.4 + ratio * 0.6));
      ctx.setLineDash([2 * z, 2.5 * z]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 1.5 * z); ctx.lineTo(b.x, b.y - 1.5 * z); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
};

// ================================================================ naturaleza

export const tree: SpriteFn = s => {
  const v = Math.floor((s.entity?.variant ?? 0.3) * 6);
  const pine = v >= 3;
  cache.draw(s.ctx, `tree${v}`, 40, 58, 20, 50, s.x, s.y + 4 * s.z, s.z, c => {
    const rnd = seeded(v + 1);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(c, 0, -2, 12, 4.5); c.fill();
    c.fillStyle = '#5b3a1e';
    c.fillRect(-1.8, -16, 3.6, 14);
    if (pine) {
      const greens = ['#1f5a2a', '#24672f', '#2c7536'];
      for (let i = 0; i < 3; i++) {
        c.fillStyle = greens[i];
        const yb = -12 - i * 9, w = 12 - i * 3 + rnd() * 2;
        poly(c, [{ x: -w, y: yb }, { x: 0, y: yb - 17 }, { x: w, y: yb }]); c.fill();
      }
    } else {
      const base = ['#2f6b2a', '#357a2f', '#3e8a36'];
      const blobs: [number, number, number][] = [[-6, -22, 8], [6, -23, 8], [0, -31, 9], [0, -21, 8]];
      blobs.forEach(([bx, by, r], i) => {
        c.fillStyle = base[i % 3];
        ellipse(c, bx + (rnd() - 0.5) * 3, by, r + rnd() * 2, r * 0.9 + rnd()); c.fill();
      });
      c.fillStyle = 'rgba(160,210,110,0.25)';
      ellipse(c, -3, -31, 4, 3); c.fill();
    }
  });
};

export const rocks: SpriteFn = s => {
  const v = Math.floor((s.entity?.variant ?? 0.5) * 3);
  const color: string = s.params.color ?? '#9e9e9e';
  const ratio = s.entity ? s.entity.amount / (s.entity.initialAmount || 1) : 1;
  const big = ratio > 0.5 ? 1 : 0;
  cache.draw(s.ctx, `rocks${color}${v}${big}`, 48, 34, 24, 24, s.x, s.y, s.z, c => {
    const rnd = seeded(v + 7);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(c, 0, 1, 18, 7); c.fill();
    const n = big ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const bx = (rnd() - 0.5) * 22, by = (rnd() - 0.5) * 8 - 2;
      const r = 5 + rnd() * 4;
      const pts: Pt[] = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        pts.push({ x: bx + Math.cos(a) * r * (0.75 + rnd() * 0.35), y: by + Math.sin(a) * r * 0.65 * (0.75 + rnd() * 0.35) - r * 0.3 });
      }
      c.fillStyle = shade(color, -0.25); poly(c, pts); c.fill();
      c.fillStyle = color;
      poly(c, pts.map(p => ({ x: p.x * 0.8 + bx * 0.2, y: p.y * 0.8 + (by - r * 0.4) * 0.2 - 1 }))); c.fill();
      c.fillStyle = shade(color, 0.45);
      ellipse(c, bx - r * 0.25, by - r * 0.6, r * 0.25, r * 0.15); c.fill();
    }
  });
};

export const bush: SpriteFn = s => {
  const ratio = s.entity ? s.entity.amount / (s.entity.initialAmount || 1) : 1;
  const b = Math.ceil(ratio * 4);
  const v = Math.floor((s.entity?.variant ?? 0.5) * 2);
  cache.draw(s.ctx, `bush${b}${v}`, 40, 30, 20, 22, s.x, s.y, s.z, c => {
    const rnd = seeded(v + 3);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(c, 0, 1, 14, 5); c.fill();
    for (const [bx, by, r, col] of [[-6, -6, 7, '#2e6a2a'], [6, -6, 7, '#336f2e'], [0, -11, 8, '#3c7d34']] as const) {
      c.fillStyle = col; ellipse(c, bx, by, r, r * 0.8); c.fill();
    }
    c.fillStyle = '#b3243d';
    for (let i = 0; i < b * 4; i++) {
      ellipse(c, (rnd() - 0.5) * 20, -4 - rnd() * 12, 1.6, 1.6); c.fill();
    }
  });
};

export function registerCoreSprites(reg: Registry) {
  reg.addSprite('humanoid', humanoid);
  reg.addSprite('cavalry', cavalry);
  reg.addSprite('ram', ram);
  reg.addSprite('building', building);
  reg.addSprite('farm', farm);
  reg.addSprite('tree', tree);
  reg.addSprite('rocks', rocks);
  reg.addSprite('bush', bush);
}
