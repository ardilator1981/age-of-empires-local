import type { Registry } from '../core/Registry';
import type { SpriteFn } from '../core/types';
import { SpriteCache, ellipse, shade } from './draw';

/**
 * Sprites procedurales de animales (ciervo, jabalí, oveja) y de su cadáver. Mismas reglas que
 * `sprites.ts`: la luz viene de arriba a la izquierda y el animal mira a la derecha (se voltea
 * con `facing`).
 */

const OUTLINE = 'rgba(22,14,6,0.85)';
const cache = new SpriteCache();

interface Look { body: string; belly: string; scale: number }
const LOOK: Record<string, Look> = {
  deer: { body: '#a8703c', belly: '#d9bd8e', scale: 1.15 },
  boar: { body: '#4e4036', belly: '#6a5a4c', scale: 1.05 },
  sheep: { body: '#efeae0', belly: '#d8d2c4', scale: 0.95 },
};

function legs(c: CanvasRenderingContext2D, color: string, swing: number, thick: number, len: number) {
  c.lineCap = 'round';
  for (const [lx, d] of [[-5.5, -swing], [-3, swing], [4, swing], [6.5, -swing]] as [number, number][]) {
    c.strokeStyle = OUTLINE; c.lineWidth = thick + 1.2;
    c.beginPath(); c.moveTo(lx, -len); c.lineTo(lx + d * 2.5, -0.5); c.stroke();
    c.strokeStyle = shade(color, -0.3); c.lineWidth = thick;
    c.beginPath(); c.moveTo(lx, -len); c.lineTo(lx + d * 2.5, -0.5); c.stroke();
  }
}

function drawAnimal(c: CanvasRenderingContext2D, species: string, swing: number, seed: number) {
  const L = LOOK[species] ?? LOOK.deer;
  c.lineJoin = 'round';
  c.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(c, 1, 0, 10, 3); c.fill();
  if (species === 'deer') {
    legs(c, L.body, swing, 1.5, 7);
    c.fillStyle = L.body;
    c.beginPath(); c.ellipse(0, -9, 8.5, 4.2, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = L.belly; ellipse(c, -0.5, -7.2, 6, 1.8); c.fill();
    c.fillStyle = L.body;
    c.beginPath(); c.moveTo(5, -11); c.lineTo(9, -17); c.lineTo(11.5, -15.5); c.lineTo(8, -8.5); c.closePath(); c.fill(); c.stroke();
    ellipse(c, 11.5, -16.6, 2.8, 1.7); c.fill(); c.stroke();
    // cornamenta
    c.strokeStyle = '#5a4026'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(9.5, -18); c.lineTo(8, -23); c.moveTo(8.6, -20.5); c.lineTo(11, -22.5); c.moveTo(10.5, -18); c.lineTo(11.5, -23); c.stroke();
    c.fillStyle = '#f2ece0'; ellipse(c, -8.3, -9.8, 1.4, 1.2); c.fill();
  } else if (species === 'boar') {
    legs(c, L.body, swing, 1.6, 5);
    c.fillStyle = L.body;
    c.beginPath(); c.ellipse(0, -7.5, 8.2, 5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = L.belly; ellipse(c, 0, -5, 6, 1.6); c.fill();
    // cresta de cerdas y cabeza
    c.fillStyle = shade(L.body, -0.35);
    c.beginPath(); c.moveTo(-6, -11); for (let i = 0; i < 5; i++) c.lineTo(-4 + i * 2.6, i % 2 ? -11.5 : -13.2); c.lineTo(6, -11); c.closePath(); c.fill();
    c.fillStyle = L.body; ellipse(c, 9, -7.2, 4, 3.4); c.fill(); c.stroke();
    c.fillStyle = '#2a201a'; ellipse(c, 12.6, -6.4, 1.5, 1.4); c.fill();
    c.fillStyle = '#f2ece0'; c.beginPath(); c.moveTo(10.5, -5); c.lineTo(12.4, -3.4); c.lineTo(11, -4.2); c.fill();
    c.fillStyle = '#d0302a'; ellipse(c, 8.6, -8.4, 0.7, 0.7); c.fill();
  } else {
    legs(c, '#3a3028', swing, 1.4, 4.5);
    // lana a mechones
    c.fillStyle = L.body;
    for (const [bx, by, r] of [[-4.5, -8, 4.6], [0, -9.5, 5], [4.5, -8, 4.4], [-1.5, -6.2, 4.6], [2.5, -6.4, 4]] as [number, number, number][]) {
      ellipse(c, bx, by, r, r * 0.9); c.fill(); c.strokeStyle = 'rgba(70,60,45,0.55)'; c.lineWidth = 0.6; c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(c, -2, -12, 3, 1.3); c.fill();
    c.fillStyle = '#3a3028'; ellipse(c, 8.4, -8.6, 2.6, 2.3); c.fill();
    c.fillStyle = '#524436'; ellipse(c, 7, -10.6, 1.1, 0.8); c.fill();
  }
  void seed;
}

export const animal: SpriteFn = s => {
  const { ctx, x, y, z, entity: e, params: P, time } = s;
  const species: string = P.species ?? 'deer';
  const sc = (LOOK[species] ?? LOOK.deer).scale * 1.3;
  const facing = e?.facing ?? 1;
  const swing = e?.moving ? Math.sin(time * 12 + (e.id % 7)) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing * sc, z * sc);
  // Un respingo de ataque (el jabalí)
  if (e && e.attackAnim > 0) ctx.translate(3 * Math.sin((e.attackAnim / 0.35) * Math.PI), 0);
  drawAnimal(ctx, species, swing, e?.id ?? 0);
  ctx.restore();
};

/** Animal abatido: tumbado de lado, más pequeño cuanto menos carne queda. */
export const carcass: SpriteFn = s => {
  const species: string = s.params.species ?? 'deer';
  const L = LOOK[species] ?? LOOK.deer;
  const ratio = s.entity ? s.entity.amount / (s.entity.initialAmount || 1) : 1;
  const stage = ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0;
  cache.draw(s.ctx, `carcass-${species}-${stage}`, 44, 28, 22, 20, s.x, s.y, s.z * L.scale * 1.15, c => {
    c.lineJoin = 'round';
    c.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(c, 1, 0, 14, 4.5); c.fill();
    const k = [0.55, 0.8, 1][stage];
    c.fillStyle = L.body;
    c.beginPath(); c.ellipse(0, -4.5, 10 * k, 4.4 * k, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = L.belly; ellipse(c, -1, -2.6, 7.5 * k, 1.8 * k); c.fill();
    // patas hacia arriba y cabeza caída
    c.strokeStyle = shade(L.body, -0.3); c.lineWidth = 1.5; c.lineCap = 'round';
    for (const lx of [-5, -2, 3, 6]) { c.beginPath(); c.moveTo(lx * k, -7); c.lineTo(lx * k + 1.2, -12 * k); c.stroke(); }
    c.fillStyle = L.body; ellipse(c, 11 * k, -3.2, 3.2 * k, 2.2 * k); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.stroke();
    if (stage === 0) { c.strokeStyle = '#e8e0cc'; c.lineWidth = 0.9; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.4, -5.5); c.lineTo(i * 2.4 + 0.6, -2.5); c.stroke(); } }
  });
};

export function registerAnimalSprites(reg: Registry) {
  reg.addSprite('animal', animal);
  reg.addSprite('carcass', carcass);
}
