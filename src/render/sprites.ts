import type { Registry } from '../core/Registry';
import type { Pt, SpriteContext, SpriteFn } from '../core/types';
import { SpriteCache, ellipse, lerpPt, poly, seeded, shade } from './draw';

/**
 * Sprites procedurales inspirados en la estética de Age of Empires II (no se usa
 * ningún recurso gráfico del juego original). Cada sprite es una función
 * registrada con un id; las definiciones eligen sprite + parámetros.
 * La luz viene de arriba a la izquierda: caras izquierdas iluminadas, derechas en sombra.
 */

export const cache = new SpriteCache();
const OUTLINE = 'rgba(22,14,6,0.85)';
const SKINS = ['#e6b98f', '#d9a67a', '#c98f62', '#edc7a2'];
/** Las unidades se dibujan algo más grandes que la escala de las casillas, como en AoE2. */
const UNIT_SCALE = 1.3;

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function outline(ctx: CanvasRenderingContext2D, w = 0.9) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = w; ctx.stroke();
}

// ================================================================ unidades

function drawWeapon(ctx: CanvasRenderingContext2D, weapon: string | undefined, swing: number) {
  if (!weapon) return;
  ctx.save();
  ctx.lineCap = 'round';
  switch (weapon) {
    case 'sword': {
      ctx.translate(4.5, -12.5);
      ctx.rotate(-0.5 + swing * 1.8);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.6;
      line(ctx, { x: 0, y: 0 }, { x: 0, y: -11.5 });
      ctx.strokeStyle = '#e4e8ec'; ctx.lineWidth = 1.5;
      line(ctx, { x: 0, y: 0 }, { x: 0, y: -11 });
      ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1.6;
      line(ctx, { x: -2.2, y: -1 }, { x: 2.2, y: -1 });
      break;
    }
    case 'spear':
    case 'javelin': {
      const len = weapon === 'spear' ? 27 : 15;
      ctx.translate(4.5 + swing * 5, -12);
      ctx.rotate(0.35 + swing * 0.5);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
      line(ctx, { x: 0, y: 6 }, { x: 0, y: -len + 6 });
      ctx.strokeStyle = '#9a7442'; ctx.lineWidth = 1.2;
      line(ctx, { x: 0, y: 6 }, { x: 0, y: -len + 6 });
      ctx.fillStyle = '#dfe3e7';
      poly(ctx, [{ x: -1.8, y: -len + 7 }, { x: 0, y: -len }, { x: 1.8, y: -len + 7 }]); ctx.fill(); outline(ctx, 0.6);
      break;
    }
    case 'bow': {
      const pull = swing * 3;
      ctx.translate(6.5, -14);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(-3, 0, 7.5, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-3, 0, 7.5, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0.4, -6.7); ctx.lineTo(-2 - pull, 0); ctx.lineTo(0.4, 6.7); ctx.stroke();
      break;
    }
    case 'axe':
    case 'throwingAxe': {
      ctx.translate(4.5, -12.5);
      ctx.rotate(-0.3 + swing * 1.9);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4;
      line(ctx, { x: 0, y: 1 }, { x: 0, y: -9.5 });
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.3;
      line(ctx, { x: 0, y: 1 }, { x: 0, y: -9.5 });
      ctx.fillStyle = '#c4cad0';
      poly(ctx, [{ x: 0, y: -9.5 }, { x: 4, y: -11 }, { x: 4, y: -6 }, { x: 0, y: -7.3 }]); ctx.fill(); outline(ctx, 0.6);
      break;
    }
    case 'hammer': {
      ctx.translate(4.5, -12.5);
      ctx.rotate(-0.3 + swing * 1.9);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.3;
      line(ctx, { x: 0, y: 1 }, { x: 0, y: -8 });
      ctx.fillStyle = '#7d828a'; ctx.fillRect(-2, -10, 4, 2.6);
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
  return { walk, swing, facing: e?.facing ?? 1, id };
}

/** Herramienta del aldeano según lo que hace. */
function villagerTool(s: SpriteContext): string {
  const o = s.entity?.order;
  if (o?.type === 'build') return 'hammer';
  if (s.entity?.carry?.type === 'gold' || s.entity?.carry?.type === 'stone') return 'axe';
  return s.params.weapon ?? 'axe';
}

export const humanoid: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, params: P } = s;
  const { walk, swing, facing, id } = animState(s);
  const sc = (P.scale ?? 1) * UNIT_SCALE;
  const villager = !!P.villager;
  const female = villager && id % 2 === 1;
  const skin = SKINS[id % SKINS.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing * sc, z * sc);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 1.5, 0, 7.5, 2.8); ctx.fill();

  // piernas
  if (!female) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4;
    line(ctx, { x: -1.9, y: -9 }, { x: -1.9 - walk * 2.6, y: -0.8 });
    line(ctx, { x: 1.9, y: -9 }, { x: 1.9 + walk * 2.6, y: -0.8 });
    ctx.strokeStyle = P.legs ?? '#5a4026'; ctx.lineWidth = 2.2;
    line(ctx, { x: -1.9, y: -9 }, { x: -1.9 - walk * 2.6, y: -0.8 });
    line(ctx, { x: 1.9, y: -9 }, { x: 1.9 + walk * 2.6, y: -0.8 });
  }
  // capa
  if (P.cape) {
    ctx.fillStyle = shade(color, -0.45);
    poly(ctx, [{ x: -3, y: -18.5 }, { x: -8, y: -4.5 }, { x: -1, y: -6.5 }]); ctx.fill(); outline(ctx, 0.7);
  }
  // carga a la espalda
  if (e?.carry && e.carry.amount > 0.5) {
    const cc: Record<string, string> = { wood: '#8b5a2b', food: '#c0392b', gold: '#f1c40f', stone: '#9e9e9e' };
    ctx.fillStyle = cc[e.carry.type] ?? '#a0522d';
    ctx.beginPath(); ctx.roundRect(-9, -17.5, 5, 7.5, 1.5); ctx.fill(); outline(ctx, 0.7);
  }
  // cuerpo
  ctx.beginPath();
  if (female) {
    ctx.moveTo(-3.8, -19); ctx.lineTo(3.8, -19); ctx.lineTo(5.8, -0.8); ctx.lineTo(-5.8, -0.8); ctx.closePath();
  } else {
    ctx.roundRect(-4.6, -19, 9.2, 10.5, 2.8);
  }
  ctx.fillStyle = color; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(1, -20, 6, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-5, -20, 2.4, 20);
  if (P.armor) { ctx.fillStyle = '#a3abb3'; ctx.fillRect(-5, -19, 10, 5.5); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-5, -19, 3, 5.5); }
  if (female) { ctx.fillStyle = 'rgba(240,232,210,0.85)'; ctx.fillRect(-2.6, -12, 5.2, 11); }
  ctx.restore();
  outline(ctx);
  ctx.fillStyle = 'rgba(50,30,12,0.85)'; ctx.fillRect(-4.6, -11.6, 9.2, 1.6);
  // brazo delantero
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.2;
  line(ctx, { x: 2.6, y: -17.2 }, { x: 4.6, y: -12.6 });
  ctx.strokeStyle = shade(color, -0.12); ctx.lineWidth = 2;
  line(ctx, { x: 2.6, y: -17.2 }, { x: 4.6, y: -12.6 });
  // cabeza
  ctx.fillStyle = skin;
  ellipse(ctx, 0, -22.6, 3.7, 3.8); ctx.fill(); outline(ctx, 0.8);
  ctx.fillStyle = 'rgba(30,20,10,0.8)';
  ellipse(ctx, 1.7, -22.9, 0.5, 0.6); ctx.fill();
  if (P.helmet) {
    ctx.fillStyle = '#8f99a2';
    ctx.beginPath(); ctx.arc(0, -23.2, 4.1, Math.PI, 0); ctx.closePath(); ctx.fill(); outline(ctx, 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-3, -26.2, 1.4, 2.5);
    ctx.fillStyle = '#7a838c'; ctx.fillRect(-4.5, -23.6, 9, 1.4);
  } else if (P.hood) {
    ctx.fillStyle = P.hood;
    ctx.beginPath(); ctx.arc(0, -23, 4.3, Math.PI * 0.85, Math.PI * 2.15); ctx.fill(); outline(ctx, 0.7);
  } else if (female) {
    ctx.fillStyle = '#f0e8d4';
    ctx.beginPath(); ctx.arc(0, -23.3, 4, Math.PI * 1.0, Math.PI * 2.0); ctx.fill(); outline(ctx, 0.6);
    ctx.fillStyle = '#6a4424'; ellipse(ctx, -3.8, -22, 1.6, 1.6); ctx.fill();
  } else if (villager) {
    ctx.fillStyle = '#8a6a3a';
    ellipse(ctx, 0, -25.4, 5.6, 1.5); ctx.fill(); outline(ctx, 0.6);
    ctx.beginPath(); ctx.arc(0, -25.6, 3, Math.PI, 0); ctx.fill();
  } else {
    ctx.fillStyle = P.hair ?? '#5a3a1e';
    ctx.beginPath(); ctx.arc(0, -23.1, 3.8, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
  if (P.shield) {
    ctx.fillStyle = shade(color, -0.2);
    ctx.beginPath(); ctx.moveTo(-8.6, -17); ctx.lineTo(-2.2, -17); ctx.lineTo(-2.4, -11); ctx.quadraticCurveTo(-5.4, -6.5, -8.4, -11); ctx.closePath();
    ctx.fill(); outline(ctx, 0.8);
    ctx.strokeStyle = '#e2cf8e'; ctx.lineWidth = 0.8;
    line(ctx, { x: -5.4, y: -16.4 }, { x: -5.4, y: -9.4 });
  }
  drawWeapon(ctx, villager ? villagerTool(s) : P.weapon, swing);
  ctx.restore();
};

export const cavalry: SpriteFn = s => {
  const { ctx, x, y, z, color, entity: e, params: P, time } = s;
  const { swing, facing, id } = animState(s);
  const g = e?.moving ? Math.sin(time * 14 + id) : 0;
  const sc = (P.scale ?? 1) * UNIT_SCALE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * facing * sc, z * sc);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 2, 0, 13.5, 3.8); ctx.fill();
  const horse = P.horse ?? '#7b5232';
  ctx.lineCap = 'round';
  const legs: [number, number][] = [[-7, -g], [-4, g], [5, g], [8, -g]];
  for (const [lx, d] of legs) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.4;
    line(ctx, { x: lx, y: -8 }, { x: lx + d * 3, y: -0.5 });
    ctx.strokeStyle = shade(horse, -0.25); ctx.lineWidth = 2.1;
    line(ctx, { x: lx, y: -8 }, { x: lx + d * 3, y: -0.5 });
  }
  ctx.strokeStyle = shade(horse, -0.5); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-10, -11); ctx.quadraticCurveTo(-15, -9, -13.5, -3.5); ctx.stroke();
  // cuerpo y cuello
  ctx.fillStyle = horse;
  ctx.beginPath();
  ctx.ellipse(0, -10.5, 10.8, 5, 0, 0, Math.PI * 2);
  ctx.moveTo(6, -13.5); ctx.lineTo(11, -21.5); ctx.lineTo(14.5, -19.5); ctx.lineTo(10.5, -9.5);
  ctx.fill(); outline(ctx);
  ctx.fillStyle = horse;
  ellipse(ctx, 14, -20, 3.9, 2.3); ctx.fill(); outline(ctx, 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ellipse(ctx, -3, -13, 6, 1.6); ctx.fill();
  ctx.strokeStyle = shade(horse, -0.55); ctx.lineWidth = 1.6;
  line(ctx, { x: 7, y: -14 }, { x: 11.5, y: -21.5 });
  if (P.barding) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, -10, 10, 4.4, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, 0.8);
    ctx.strokeStyle = '#e8d9a0'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, -10, 10, 4.4, 0, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-4, -15.5, 7, 3); // silla
  }
  // jinete
  ctx.beginPath(); ctx.roundRect(-3.6, -25, 7.2, 10.5, 2.2);
  ctx.fillStyle = color; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0.8, -26, 4, 12);
  if (P.armor) { ctx.fillStyle = '#a3abb3'; ctx.fillRect(-4, -25, 8, 5); }
  ctx.restore(); outline(ctx);
  ctx.fillStyle = SKINS[id % SKINS.length];
  ellipse(ctx, 0, -28.2, 3.4, 3.5); ctx.fill(); outline(ctx, 0.8);
  if (P.helmet) {
    ctx.fillStyle = '#8f99a2';
    ctx.beginPath(); ctx.arc(0, -28.8, 3.8, Math.PI, 0); ctx.closePath(); ctx.fill(); outline(ctx, 0.7);
  } else {
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.arc(0, -28.9, 3.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
  if (P.plume) {
    ctx.fillStyle = '#c8302a';
    ctx.beginPath(); ctx.moveTo(-1, -32); ctx.quadraticCurveTo(-7, -37, -9, -30); ctx.quadraticCurveTo(-5, -33, -1, -31); ctx.fill(); outline(ctx, 0.6);
  }
  if (P.banner) {
    // Estandarte del General: asta a la espalda con la bandera del color del jugador
    ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 1.6;
    line(ctx, { x: -5, y: -16 }, { x: -5, y: -50 });
    const wave = Math.sin(time * 5 + id) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(-19, -47 + wave); ctx.lineTo(-17, -42 + wave); ctx.lineTo(-19, -37 + wave); ctx.lineTo(-5, -39); ctx.closePath();
    ctx.fill(); outline(ctx, 0.7);
    ctx.fillStyle = '#f2d36b'; ellipse(ctx, -11, -44 + wave / 2, 2.2, 2.2); ctx.fill();
  }
  ctx.save();
  ctx.translate(0, -9.5);
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
  ctx.scale(z * facing * UNIT_SCALE, z * UNIT_SCALE);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 1, 0, 17, 5); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4.4;
  line(ctx, { x: -4 + bump, y: -9 }, { x: 16 + bump, y: -9 });
  ctx.strokeStyle = '#5a3e22'; ctx.lineWidth = 3;
  line(ctx, { x: -4 + bump, y: -9 }, { x: 16 + bump, y: -9 });
  ctx.fillStyle = '#8a8f94'; ctx.fillRect(15 + bump, -11.5, 3.5, 5);
  ctx.fillStyle = '#7a5530'; ctx.fillRect(-13, -11, 26, 7); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.9; ctx.strokeRect(-13, -11, 26, 7);
  ctx.fillStyle = '#6a4a2a';
  poly(ctx, [{ x: -15, y: -11 }, { x: 0, y: -23 }, { x: 15, y: -11 }]); ctx.fill(); outline(ctx);
  ctx.strokeStyle = 'rgba(30,18,8,0.5)'; ctx.lineWidth = 0.6;
  for (let i = 1; i < 5; i++) line(ctx, { x: -15 + i * 3, y: -11 - i * 2.4 }, { x: 15 - i * 3, y: -11 - i * 2.4 });
  ctx.fillStyle = color; ctx.fillRect(-7, -16, 14, 2.4);
  for (const wx of [-8, 8]) {
    ctx.fillStyle = '#3d2a17'; ellipse(ctx, wx, -3.5, 4, 4); ctx.fill(); outline(ctx, 0.8);
    ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 0.9;
    line(ctx, { x: wx + Math.cos(roll) * 3, y: -3.5 + Math.sin(roll) * 3 }, { x: wx - Math.cos(roll) * 3, y: -3.5 - Math.sin(roll) * 3 });
  }
  ctx.restore();
};

// ================================================================ edificios

type Proj = (x: number, y: number) => Pt;

interface Mat {
  wall: string;
  style: 'planks' | 'timber' | 'stone';
  roof: string;
  roofStyle: 'thatch' | 'tiles' | 'slate';
  footing: string;
}

/** Materiales según la edad, como en AoE2: los edificios mejoran al avanzar. */
function material(age: number, P: Record<string, any>): Mat {
  if (P.material === 'stone') return { wall: P.wall ?? '#b8ae9c', style: 'stone', roof: P.roof ?? '#56606b', roofStyle: 'slate', footing: '#9b9285' };
  if (age <= 0) return { wall: '#8e6c45', style: 'planks', roof: '#c6a45c', roofStyle: 'thatch', footing: '#7a6a58' };
  if (age === 1) return { wall: '#e4d8ba', style: 'timber', roof: P.roof ?? '#a64a2e', roofStyle: 'tiles', footing: '#9b9285' };
  return { wall: '#c6bca8', style: 'stone', roof: age >= 3 ? '#4d5b6c' : (P.roof ?? '#9a432b'), roofStyle: age >= 3 ? 'slate' : 'tiles', footing: '#9b9285' };
}

/** Punto de una cara vertical: s a lo largo de a→b, t de h0 a h1 (px a zoom 1). */
function faceP(a: Pt, b: Pt, h0: number, h1: number, z: number, s: number, t: number): Pt {
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s - (h0 + (h1 - h0) * t) * z };
}

function faceQuad(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, h0: number, h1: number, z: number, s0: number, s1: number, t0: number, t1: number) {
  poly(ctx, [faceP(a, b, h0, h1, z, s0, t0), faceP(a, b, h0, h1, z, s1, t0), faceP(a, b, h0, h1, z, s1, t1), faceP(a, b, h0, h1, z, s0, t1)]);
}

/** Pared con su textura (tablones, entramado o sillería). `light`: brillo de la cara. */
function wall(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, h0: number, h1: number, z: number, mat: Mat, light: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) / z;
  const H = h1 - h0;
  const P = (s: number, t: number) => faceP(a, b, h0, h1, z, s, t);
  faceQuad(ctx, a, b, h0, h1, z, 0, 1, 0, 1);
  ctx.fillStyle = shade(mat.wall, light); ctx.fill();
  ctx.save();
  ctx.clip();
  const lw = Math.max(0.5, 0.75 * z);
  if (mat.style === 'planks') {
    ctx.strokeStyle = 'rgba(40,24,10,0.45)'; ctx.lineWidth = lw;
    const n = Math.max(2, Math.round(len / 4));
    for (let i = 1; i < n; i++) line(ctx, P(i / n, 0), P(i / n, 1));
    ctx.strokeStyle = 'rgba(46,28,12,0.75)'; ctx.lineWidth = lw * 2;
    line(ctx, P(0, 0.96), P(1, 0.96)); line(ctx, P(0, 0.45), P(1, 0.45));
  } else if (mat.style === 'timber') {
    const ft = Math.min(0.32, 7 / Math.max(H, 1));
    faceQuad(ctx, a, b, h0, h1, z, 0, 1, 0, ft);
    ctx.fillStyle = shade(mat.footing, light); ctx.fill();
    ctx.strokeStyle = 'rgba(50,40,30,0.35)'; ctx.lineWidth = lw;
    line(ctx, P(0, ft / 2), P(1, ft / 2));
    ctx.strokeStyle = '#4a321c'; ctx.lineWidth = lw * 2.2;
    line(ctx, P(0, ft), P(1, ft)); line(ctx, P(0, 0.98), P(1, 0.98));
    const bays = Math.max(1, Math.round(len / 11));
    for (let i = 0; i <= bays; i++) line(ctx, P(i / bays, ft), P(i / bays, 1));
    ctx.lineWidth = lw * 1.6;
    for (let i = 0; i < bays; i++) {
      if (i % 2) line(ctx, P(i / bays, ft), P((i + 1) / bays, 1));
      else line(ctx, P((i + 1) / bays, ft), P(i / bays, 1));
    }
  } else {
    ctx.strokeStyle = 'rgba(60,50,40,0.38)'; ctx.lineWidth = lw;
    const rows = Math.max(2, Math.round(H / 5));
    const cols = Math.max(2, Math.round(len / 8));
    for (let r = 1; r < rows; r++) line(ctx, P(0, r / rows), P(1, r / rows));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const s = (c + (r % 2 ? 0.5 : 0)) / cols;
      line(ctx, P(s, r / rows), P(s, (r + 1) / rows));
    }
  }
  // sombra en la base y luz en la parte alta
  const gb = ctx.createLinearGradient(0, faceP(a, b, h0, h1, z, 0.5, 0).y, 0, faceP(a, b, h0, h1, z, 0.5, 1).y);
  gb.addColorStop(0, 'rgba(0,0,0,0.22)'); gb.addColorStop(0.35, 'rgba(0,0,0,0)');
  ctx.fillStyle = gb; ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
  ctx.restore();
  faceQuad(ctx, a, b, h0, h1, z, 0, 1, 0, 1);
  ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.stroke();
}

/** Faldón de tejado: alero e0→e1, cumbrera r0→r1. */
function roofFace(ctx: CanvasRenderingContext2D, e0: Pt, e1: Pt, r1: Pt, r0: Pt, z: number, mat: Mat, light: number) {
  poly(ctx, [e0, e1, r1, r0]);
  ctx.fillStyle = shade(mat.roof, light); ctx.fill();
  ctx.save(); ctx.clip();
  const lw = Math.max(0.5, 0.7 * z);
  const depth = Math.max(Math.hypot(r0.x - e0.x, r0.y - e0.y), Math.hypot(r1.x - e1.x, r1.y - e1.y)) / z;
  const width = Math.hypot(e1.x - e0.x, e1.y - e0.y) / z;
  if (mat.roofStyle === 'thatch') {
    const n = Math.round(width * 1.2);
    const rnd = seeded(width * 7 + depth);
    for (let i = 0; i < n; i++) {
      const s = rnd();
      const t0 = rnd() * 0.8, t1 = Math.min(1, t0 + 0.2 + rnd() * 0.3);
      const a = lerpPt(lerpPt(e0, r0, t0), lerpPt(e1, r1, t0), s), b = lerpPt(lerpPt(e0, r0, t1), lerpPt(e1, r1, t1), s);
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(90,64,24,0.45)' : 'rgba(250,226,150,0.35)'; ctx.lineWidth = lw;
      line(ctx, a, b);
    }
  } else {
    const rows = Math.max(3, Math.round(depth / 3.4));
    const cols = Math.max(3, Math.round(width / 3.4));
    ctx.strokeStyle = mat.roofStyle === 'slate' ? 'rgba(20,24,30,0.45)' : 'rgba(70,20,10,0.5)'; ctx.lineWidth = lw;
    for (let r = 1; r < rows; r++) line(ctx, lerpPt(e0, r0, r / rows), lerpPt(e1, r1, r / rows));
    ctx.lineWidth = lw * 0.8;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const s = (c + (r % 2 ? 0.5 : 0)) / cols;
      const a = lerpPt(lerpPt(e0, r0, r / rows), lerpPt(e1, r1, r / rows), s);
      const b = lerpPt(lerpPt(e0, r0, (r + 1) / rows), lerpPt(e1, r1, (r + 1) / rows), s);
      line(ctx, a, b);
    }
  }
  ctx.restore();
  poly(ctx, [e0, e1, r1, r0]);
  ctx.strokeStyle = 'rgba(25,15,8,0.7)'; ctx.lineWidth = Math.max(0.5, 0.9 * z); ctx.stroke();
  ctx.strokeStyle = 'rgba(25,15,8,0.6)'; ctx.lineWidth = Math.max(1, 1.6 * z);
  line(ctx, e0, e1);
}

const lift = (p: Pt, h: number, z: number): Pt => ({ x: p.x, y: p.y - h * z });

/** Paredes delanteras (izquierda iluminada, derecha en sombra). */
function walls(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, z: number, mat: Mat) {
  wall(ctx, pr(x0, y1), pr(x1, y1), h0, h1, z, mat, -0.02);
  wall(ctx, pr(x1, y1), pr(x1, y0), h0, h1, z, mat, -0.3);
}

/** Tejado a dos aguas con la cumbrera de oeste a este. Devuelve el centro de la cumbrera. */
function gable(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, y0: number, x1: number, y1: number, base: number, rh: number, z: number, mat: Mat, ov = 0.14): Pt {
  const ym = (y0 + y1) / 2;
  const P = (x: number, y: number, h: number) => lift(pr(x, y), h, z);
  const A = P(x0 - ov, y0 - ov, base - 2), B = P(x1 + ov, y0 - ov, base - 2), C = P(x1 + ov, y1 + ov, base - 2), D = P(x0 - ov, y1 + ov, base - 2);
  const R0 = P(x0 - ov, ym, base + rh), R1 = P(x1 + ov, ym, base + rh);
  roofFace(ctx, A, B, R1, R0, z, mat, 0.14);
  // hastial oeste (detrás) y este (delante)
  poly(ctx, [P(x0, y0, base), P(x0, y1, base), P(x0, ym, base + rh)]);
  ctx.fillStyle = shade(mat.wall, 0.04); ctx.fill();
  roofFace(ctx, D, C, R1, R0, z, mat, -0.06);
  const g0 = P(x1, y1, base), g1 = P(x1, y0, base), g2 = P(x1, ym, base + rh - 1);
  poly(ctx, [g0, g1, g2]);
  ctx.fillStyle = shade(mat.wall, -0.32); ctx.fill();
  if (mat.style === 'timber') {
    ctx.strokeStyle = '#4a321c'; ctx.lineWidth = Math.max(0.8, 1.5 * z);
    line(ctx, lerpPt(g0, g1, 0.5), g2);
  }
  poly(ctx, [g0, g1, g2]); ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.stroke();
  // borde del faldón este
  ctx.strokeStyle = 'rgba(25,15,8,0.75)'; ctx.lineWidth = Math.max(1, 1.8 * z);
  line(ctx, C, R1); line(ctx, R1, B);
  return lerpPt(R0, R1, 0.5);
}

/** Tejado a cuatro aguas (o pirámide si `top` = 0). Devuelve la cúspide. */
function hip(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, y0: number, x1: number, y1: number, base: number, rh: number, z: number, mat: Mat, ov = 0.14, top = 0): Pt {
  const P = (x: number, y: number, h: number) => lift(pr(x, y), h, z);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const tx = Math.min(top, (x1 - x0) / 2), ty = Math.min(top, (y1 - y0) / 2);
  const T = P(x0 - ov, y0 - ov, base - 2), R = P(x1 + ov, y0 - ov, base - 2), B = P(x1 + ov, y1 + ov, base - 2), L = P(x0 - ov, y1 + ov, base - 2);
  const t = top > 0
    ? { T: P(cx - tx, cy - ty, base + rh), R: P(cx + tx, cy - ty, base + rh), B: P(cx + tx, cy + ty, base + rh), L: P(cx - tx, cy + ty, base + rh) }
    : (() => { const a = P(cx, cy, base + rh); return { T: a, R: a, B: a, L: a }; })();
  roofFace(ctx, T, R, t.R, t.T, z, mat, 0.08);
  roofFace(ctx, L, T, t.T, t.L, z, mat, 0.2);
  roofFace(ctx, L, B, t.B, t.L, z, mat, -0.06);
  roofFace(ctx, B, R, t.R, t.B, z, mat, -0.3);
  return lerpPt(t.T, t.B, 0.5);
}

function crenels(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, z: number, color: string, h = 4) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) / z;
  const n = Math.max(3, Math.round(len / 4)) | 1;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i += 2) {
    const p0 = lerpPt(a, b, i / n), p1 = lerpPt(a, b, (i + 1) / n);
    poly(ctx, [p0, p1, lift(p1, h, z), lift(p0, h, z)]); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.55)'; ctx.lineWidth = Math.max(0.5, 0.7 * z); ctx.stroke();
  }
}

/** Torre de piedra cuadrada con almenas. Devuelve su punto más alto. */
function towerBox(ctx: CanvasRenderingContext2D, pr: Proj, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, z: number, mat: Mat, roof = 0): Pt {
  walls(ctx, pr, x0, y0, x1, y1, h0, h1, z, mat);
  const P = (x: number, y: number) => lift(pr(x, y), h1, z);
  poly(ctx, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]);
  ctx.fillStyle = shade(mat.wall, 0.12); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.stroke();
  if (roof > 0) return hip(ctx, pr, x0, y0, x1, y1, h1, roof, z, mat, 0.08);
  crenels(ctx, P(x0, y0), P(x1, y0), z, shade(mat.wall, -0.1));
  crenels(ctx, P(x0, y0), P(x0, y1), z, shade(mat.wall, 0.05));
  crenels(ctx, P(x0, y1), P(x1, y1), z, shade(mat.wall, -0.05));
  crenels(ctx, P(x1, y1), P(x1, y0), z, shade(mat.wall, -0.3));
  return lerpPt(P(x0, y0), P(x1, y1), 0.5);
}

function door(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, z: number, s0: number, s1: number, h: number, wood = '#4a2e16') {
  const p0 = faceP(a, b, 0, h, z, s0, 0), p1 = faceP(a, b, 0, h, z, s1, 0);
  const q0 = faceP(a, b, 0, h, z, s0, 0.75), q1 = faceP(a, b, 0, h, z, s1, 0.75), top = faceP(a, b, 0, h, z, (s0 + s1) / 2, 1);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(q1.x, q1.y);
  ctx.quadraticCurveTo(top.x + (q1.x - q0.x) * 0.1, top.y - 1 * z, q0.x, q0.y);
  ctx.closePath();
  ctx.fillStyle = wood; ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,4,0.8)'; ctx.lineWidth = Math.max(0.5, 0.9 * z); ctx.stroke();
}

function windowAt(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, z: number, s: number, h0: number, w: number, h: number, glow = false) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) / z;
  const ds = w / Math.max(len, 1) / 2;
  faceQuad(ctx, a, b, h0, h0 + h, z, s - ds, s + ds, 0, 1);
  ctx.fillStyle = glow ? '#f0a040' : '#2a1c10'; ctx.fill();
  ctx.strokeStyle = 'rgba(220,200,160,0.5)'; ctx.lineWidth = Math.max(0.5, 0.7 * z); ctx.stroke();
}

function flag(ctx: CanvasRenderingContext2D, base: Pt, z: number, color: string, time: number, pole = 18) {
  const top = lift(base, pole, z);
  ctx.strokeStyle = '#2e2014'; ctx.lineWidth = Math.max(0.8, 1.3 * z);
  line(ctx, base, top);
  const w = Math.sin(time * 4 + base.x * 0.1) * 1.5 * z;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(top.x + 6 * z, top.y + w, top.x + 12 * z, top.y + 2 * z + w);
  ctx.lineTo(top.x + 12 * z, top.y + 7 * z + w);
  ctx.quadraticCurveTo(top.x + 6 * z, top.y + 5 * z + w, top.x, top.y + 6.5 * z);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,4,0.6)'; ctx.lineWidth = Math.max(0.5, 0.7 * z); ctx.stroke();
}

function smoke(ctx: CanvasRenderingContext2D, at: Pt, z: number, time: number) {
  for (let i = 0; i < 4; i++) {
    const t = (time * 0.5 + i / 4) % 1;
    ctx.fillStyle = `rgba(210,210,210,${0.4 * (1 - t)})`;
    ellipse(ctx, at.x + t * 8 * z, at.y - t * 22 * z, (2 + t * 5) * z, (2 + t * 5) * z); ctx.fill();
  }
}

function chimney(ctx: CanvasRenderingContext2D, pr: Proj, x: number, y: number, h0: number, h1: number, z: number, time: number) {
  const stone: Mat = { wall: '#8a8178', style: 'stone', roof: '#555', roofStyle: 'slate', footing: '#888' };
  walls(ctx, pr, x - 0.18, y - 0.18, x + 0.18, y + 0.18, h0, h1, z, stone);
  const top = lift(pr(x, y), h1, z);
  ctx.fillStyle = '#2a2420'; ellipse(ctx, top.x, top.y, 3 * z, 1.5 * z); ctx.fill();
  smoke(ctx, top, z, time);
}

/** Montón de troncos o de piedra/oro (campamentos). */
function pile(ctx: CanvasRenderingContext2D, c: Pt, z: number, kind: string) {
  if (kind === 'wood') {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      const px = c.x + (i - (3 - r) / 2) * 5 * z, py = c.y - r * 4 * z;
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(px - 6 * z, py - 3.4 * z, 9 * z, 3.4 * z);
      ctx.fillStyle = '#d9b07a'; ellipse(ctx, px + 3 * z, py - 1.7 * z, 1.8 * z, 1.8 * z); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(0.4, 0.6 * z); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const px = c.x + Math.cos(i * 2.1) * 6 * z, py = c.y - 2 * z + Math.sin(i * 2.1) * 2.5 * z - (i % 3) * 1.5 * z;
      ctx.fillStyle = i % 3 === 0 ? '#e0be3c' : '#a7a7a7';
      ellipse(ctx, px, py, 3.4 * z, 2.5 * z); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(0.4, 0.6 * z); ctx.stroke();
    }
  }
}

export const building: SpriteFn = s => {
  const { ctx, z, color, entity: e, params: P, project: pr, foot, time, age } = s;
  if (!foot) return;
  const { tx, ty, size } = foot;
  const complete = !e || e.complete;
  const progress = e ? (e.complete ? 1 : e.progress) : 1;
  const mat = material(age, P);
  const inset = P.inset ?? 0.16;
  const x0 = tx + inset, y0 = ty + inset, x1 = tx + size - inset, y1 = ty + size - inset;
  const style: string = P.style ?? 'house';
  const T = pr(tx, ty), R = pr(tx + size, ty), B = pr(tx + size, ty + size), L = pr(tx, ty + size);

  // Cimientos / sombra en el suelo
  ctx.fillStyle = complete ? 'rgba(0,0,0,0.22)' : 'rgba(120,96,62,0.9)';
  poly(ctx, [lerpPt(T, B, -0.02), lerpPt(R, L, -0.06), lerpPt(B, T, -0.04), lerpPt(L, R, -0.02)]); ctx.fill();
  if (!complete) {
    ctx.strokeStyle = '#6a5a48'; ctx.lineWidth = Math.max(1, 2 * z);
    poly(ctx, [T, R, B, L]); ctx.stroke();
  }

  ctx.save();
  if (!complete) {
    // Se construye de abajo arriba
    const top = T.y - (size * 14 + 60) * z;
    const cut = B.y - (B.y - top) * (0.12 + 0.88 * progress);
    ctx.beginPath(); ctx.rect(L.x - 100 * z, cut, R.x - L.x + 200 * z, B.y - cut + 10 * z); ctx.clip();
  }

  let flagAt: Pt | null = null;
  const front = (h: number) => ({ a: pr(x0, y1), b: pr(x1, y1), h });
  switch (style) {
    case 'house': {
      walls(ctx, pr, x0, y0, x1, y1, 0, 24, z, mat);
      const f = front(24);
      door(ctx, f.a, f.b, z, 0.36, 0.6, 14);
      windowAt(ctx, pr(x1, y1), pr(x1, y0), z, 0.5, 11, 4, 5);
      const ridge = gable(ctx, pr, x0, y0, x1, y1, 24, 20, z, mat);
      if (age >= 1) chimney(ctx, pr, x1 - 0.45, (y0 + y1) / 2 - 0.15, 30, 46, z, time);
      flagAt = lift(ridge, -1, z);
      break;
    }
    case 'tc': {
      // Pórtico bajo con tejado inclinado alrededor de una torre central
      walls(ctx, pr, x0, y0, x1, y1, 0, 20, z, mat);
      const f = front(20);
      door(ctx, f.a, f.b, z, 0.4, 0.6, 15);
      windowAt(ctx, f.a, f.b, z, 0.18, 8, 4, 5); windowAt(ctx, f.a, f.b, z, 0.82, 8, 4, 5);
      windowAt(ctx, pr(x1, y1), pr(x1, y0), z, 0.25, 8, 4, 5); windowAt(ctx, pr(x1, y1), pr(x1, y0), z, 0.75, 8, 4, 5);
      const m = size * 0.27;
      hip(ctx, pr, x0, y0, x1, y1, 20, 12, z, mat, 0.18, (x1 - x0) / 2 - m);
      walls(ctx, pr, x0 + m, y0 + m, x1 - m, y1 - m, 30, 62, z, mat);
      const k = pr(x0 + m, y1 - m), k2 = pr(x1 - m, y1 - m);
      windowAt(ctx, k, k2, z, 0.5, 46, 4, 7);
      windowAt(ctx, pr(x1 - m, y1 - m), pr(x1 - m, y0 + m), z, 0.5, 46, 4, 7);
      flagAt = hip(ctx, pr, x0 + m, y0 + m, x1 - m, y1 - m, 62, 26, z, mat, 0.16);
      break;
    }
    case 'hall': {
      const h = P.height ?? 26;
      walls(ctx, pr, x0, y0, x1, y1, 0, h, z, mat);
      const f = front(h);
      if (P.stable) {
        door(ctx, f.a, f.b, z, 0.15, 0.4, h * 0.7, '#3a2410');
        door(ctx, f.a, f.b, z, 0.6, 0.85, h * 0.7, '#3a2410');
        const hay = faceP(f.a, f.b, 0, h, z, 0.5, 0);
        ctx.fillStyle = '#d8b450'; ellipse(ctx, hay.x, hay.y - 2 * z, 7 * z, 3.5 * z); ctx.fill();
      } else {
        door(ctx, f.a, f.b, z, 0.38, 0.62, h * 0.7);
        windowAt(ctx, f.a, f.b, z, 0.16, h * 0.45, 4, 5); windowAt(ctx, f.a, f.b, z, 0.84, h * 0.45, 4, 5);
      }
      const ra = pr(x1, y1), rb = pr(x1, y0);
      if (P.target) {
        const c = faceP(ra, rb, 0, h, z, 0.5, 0.5);
        for (const [r, col] of [[6, '#f3f3f3'], [4.2, '#c0392b'], [2.2, '#f3f3f3'], [0.9, '#c0392b']] as const) {
          ctx.fillStyle = col; ellipse(ctx, c.x, c.y, r * z * 0.75, r * z); ctx.fill();
        }
      } else {
        windowAt(ctx, ra, rb, z, 0.3, h * 0.45, 4, 5); windowAt(ctx, ra, rb, z, 0.7, h * 0.45, 4, 5);
      }
      if (P.weapons) {
        const w0 = faceP(f.a, f.b, 0, h, z, 0.05, 0.1);
        ctx.strokeStyle = '#d0d4d8'; ctx.lineWidth = Math.max(0.8, 1.2 * z);
        for (let i = 0; i < 3; i++) line(ctx, { x: w0.x + i * 3 * z, y: w0.y }, { x: w0.x + i * 3 * z + 2 * z, y: w0.y - 14 * z });
      }
      flagAt = gable(ctx, pr, x0, y0, x1, y1, h, P.roofHeight ?? 22, z, mat);
      break;
    }
    case 'smithy': {
      walls(ctx, pr, x0, y0, x1, y1, 0, 22, z, mat);
      const f = front(22);
      door(ctx, f.a, f.b, z, 0.3, 0.55, 15);
      windowAt(ctx, pr(x1, y1), pr(x1, y0), z, 0.4, 7, 6, 6, true);
      const anvil = faceP(f.a, f.b, 0, 22, z, 0.8, 0);
      ctx.fillStyle = '#3c3c40'; ctx.fillRect(anvil.x - 4 * z, anvil.y + 1 * z, 8 * z, 3 * z);
      flagAt = gable(ctx, pr, x0, y0, x1, y1, 22, 18, z, mat);
      chimney(ctx, pr, x1 - 0.5, y0 + 0.5, 22, 50, z, time);
      break;
    }
    case 'shed': {
      const h = P.height ?? 18;
      const c = pr((x0 + x1) / 2, (y0 + y1) / 2);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1.4, 3.2 * z);
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1]]) { const p = pr(px, py); line(ctx, p, lift(p, h, z)); }
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1, 2 * z);
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1]]) { const p = pr(px, py); line(ctx, p, lift(p, h, z)); }
      if (complete) pile(ctx, c, z, P.pile ?? 'wood');
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1.4, 3.2 * z);
      const p4 = pr(x1, y1); line(ctx, p4, lift(p4, h, z));
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1, 2 * z); line(ctx, p4, lift(p4, h, z));
      flagAt = gable(ctx, pr, x0, y0, x1, y1, h, 14, z, mat, 0.2);
      break;
    }
    case 'mill': {
      const m = 0.32;
      walls(ctx, pr, x0 + m, y0 + m, x1 - m, y1 - m, 0, 34, z, mat);
      const f = { a: pr(x0 + m, y1 - m), b: pr(x1 - m, y1 - m) };
      door(ctx, f.a, f.b, z, 0.35, 0.65, 13);
      flagAt = hip(ctx, pr, x0 + m, y0 + m, x1 - m, y1 - m, 34, 16, z, mat, 0.12);
      // aspas girando en la cara derecha
      const hub = faceP(pr(x1 - m, y1 - m), pr(x1 - m, y0 + m), 0, 34, z, 0.5, 0.82);
      const a0 = complete ? time * 1.3 : 0.4;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        const dir = { x: Math.cos(a), y: Math.sin(a) };
        const perp = { x: -dir.y, y: dir.x };
        const at = (d: number, w: number): Pt => ({ x: hub.x + (dir.x * d + perp.x * w) * z, y: hub.y + (dir.y * d + perp.y * w) * z });
        poly(ctx, [at(5, 0), at(26, 0), at(26, 5.5), at(6, 4)]);
        ctx.fillStyle = 'rgba(236,226,204,0.92)'; ctx.fill();
        ctx.strokeStyle = 'rgba(80,56,30,0.8)'; ctx.lineWidth = Math.max(0.5, 0.7 * z); ctx.stroke();
        for (let k = 1; k < 4; k++) line(ctx, at(5 + k * 5.2, 0), at(5 + k * 5.2, 5));
        ctx.strokeStyle = '#4a321c'; ctx.lineWidth = Math.max(0.8, 1.6 * z);
        line(ctx, at(0, 0), at(27, 0));
      }
      ctx.fillStyle = '#3a2a1a'; ellipse(ctx, hub.x, hub.y, 2.2 * z, 2.2 * z); ctx.fill();
      break;
    }
    case 'tower': {
      const stone = material(2, { material: 'stone', wall: P.wall, roof: P.roof });
      towerBox(ctx, pr, x0, y0, x1, y1, 0, 70, z, stone);
      const f = pr(x0, y1), g = pr(x1, y1);
      for (const hh of [24, 46]) {
        const p = faceP(f, g, 0, 70, z, 0.5, hh / 70);
        ctx.fillStyle = '#1e1610'; ctx.fillRect(p.x - 0.8 * z, p.y - 5 * z, 1.6 * z, 5 * z);
      }
      door(ctx, f, g, z, 0.3, 0.7, 12);
      flagAt = hip(ctx, pr, x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05, 74, 20, z, stone, 0.02);
      break;
    }
    case 'castle': {
      const stone = material(2, { material: 'stone', wall: P.wall ?? '#b3a996', roof: P.roof ?? '#56606b' });
      const ci = 0.45, tw = 1;
      // muralla
      walls(ctx, pr, x0 + ci, y0 + ci, x1 - ci, y1 - ci, 0, 40, z, stone);
      const Pw = (x: number, y: number) => lift(pr(x, y), 40, z);
      poly(ctx, [Pw(x0 + ci, y0 + ci), Pw(x1 - ci, y0 + ci), Pw(x1 - ci, y1 - ci), Pw(x0 + ci, y1 - ci)]);
      ctx.fillStyle = shade(stone.wall, 0.08); ctx.fill();
      const gate = { a: pr(x0 + ci, y1 - ci), b: pr(x1 - ci, y1 - ci) };
      door(ctx, gate.a, gate.b, z, 0.4, 0.6, 20, '#20160e');
      ctx.strokeStyle = 'rgba(160,160,170,0.6)'; ctx.lineWidth = Math.max(0.5, 0.7 * z);
      for (let i = 1; i < 4; i++) line(ctx, faceP(gate.a, gate.b, 0, 20, z, 0.4 + i * 0.05, 0), faceP(gate.a, gate.b, 0, 20, z, 0.4 + i * 0.05, 0.8));
      // torres y torre del homenaje
      towerBox(ctx, pr, x0, y0, x0 + tw, y0 + tw, 0, 58, z, stone);
      const k = 1.25;
      const keepTop = towerBox(ctx, pr, x0 + k, y0 + k, x1 - k, y1 - k, 40, 78, z, stone);
      towerBox(ctx, pr, x1 - tw, y0, x1, y0 + tw, 0, 58, z, stone);
      towerBox(ctx, pr, x0, y1 - tw, x0 + tw, y1, 0, 58, z, stone);
      crenels(ctx, Pw(x0 + ci, y1 - ci), Pw(x1 - ci, y1 - ci), z, shade(stone.wall, -0.05), 5);
      crenels(ctx, Pw(x1 - ci, y1 - ci), Pw(x1 - ci, y0 + ci), z, shade(stone.wall, -0.3), 5);
      towerBox(ctx, pr, x1 - tw, y1 - tw, x1, y1, 0, 58, z, stone);
      flagAt = keepTop;
      break;
    }
    default: {
      walls(ctx, pr, x0, y0, x1, y1, 0, P.height ?? 22, z, mat);
      flagAt = gable(ctx, pr, x0, y0, x1, y1, P.height ?? 22, P.roofHeight ?? 18, z, mat);
    }
  }
  ctx.restore();

  if (!complete) {
    // andamios
    ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = Math.max(0.6, 1.3 * z);
    const H = (size * 10 + 30) * z * Math.min(1, progress + 0.25);
    for (const p of [L, B, R]) line(ctx, p, lift(p, H / z, z));
    for (const f of [0.35, 0.7]) {
      ctx.beginPath(); ctx.moveTo(L.x, L.y - H * f); ctx.lineTo(B.x, B.y - H * f); ctx.lineTo(R.x, R.y - H * f); ctx.stroke();
    }
  } else if (flagAt && P.flag !== false) {
    flag(ctx, flagAt, z, color, time);
  }
};

export const farm: SpriteFn = s => {
  const { ctx, z, entity: e, project: pr, foot } = s;
  if (!foot) return;
  const { tx, ty, size } = foot;
  const i = 0.05;
  const T = pr(tx + i, ty + i), R = pr(tx + size - i, ty + i), B = pr(tx + size - i, ty + size - i), L = pr(tx + i, ty + size - i);
  const complete = !e || e.complete;
  poly(ctx, [T, R, B, L]);
  ctx.fillStyle = complete ? '#6e5030' : 'rgba(140,110,70,0.85)'; ctx.fill();
  ctx.strokeStyle = '#4a3418'; ctx.lineWidth = Math.max(0.8, 1.6 * z); ctx.stroke();
  const ratio = e ? Math.max(0, e.amount / (e.initialAmount || 1)) : 1;
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const a = lerpPt(T, L, (r + 0.5) / rows), b = lerpPt(R, B, (r + 0.5) / rows);
    ctx.strokeStyle = 'rgba(52,32,14,0.75)'; ctx.lineWidth = Math.max(0.8, 1.6 * z);
    line(ctx, { x: a.x, y: a.y + 1.2 * z }, { x: b.x, y: b.y + 1.2 * z });
    ctx.strokeStyle = 'rgba(160,120,74,0.5)'; ctx.lineWidth = Math.max(0.5, 0.8 * z);
    line(ctx, { x: a.x, y: a.y - 0.6 * z }, { x: b.x, y: b.y - 0.6 * z });
    if (complete && ratio > 0.02) {
      const n = 9;
      for (let k = 0; k < n; k++) {
        const p = lerpPt(a, b, (k + 0.5) / n);
        const hgt = (2.5 + ratio * 4) * z;
        ctx.strokeStyle = ratio > 0.4 ? '#6f9a2c' : '#a39a3a'; ctx.lineWidth = Math.max(0.8, 1.4 * z);
        line(ctx, p, { x: p.x - 1 * z, y: p.y - hgt });
        line(ctx, p, { x: p.x + 1.2 * z, y: p.y - hgt * 0.8 });
        ctx.fillStyle = ratio > 0.4 ? '#d8c060' : '#c8a850';
        ellipse(ctx, p.x, p.y - hgt, 1 * z, 1.2 * z); ctx.fill();
      }
    }
  }
};

// ================================================================ naturaleza

/** Sombra alargada y difusa hacia abajo a la derecha. */
function softShadow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.32) {
  c.save();
  c.translate(x, y); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
  g.addColorStop(0, `rgba(10,6,0,${a})`); g.addColorStop(0.6, `rgba(10,6,0,${a * 0.7})`); g.addColorStop(1, 'rgba(10,6,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

function oak(c: CanvasRenderingContext2D, rnd: () => number, big: number) {
  softShadow(c, 13, 1, 22 * big, 7 * big);
  c.fillStyle = '#4e321a';
  c.beginPath(); c.moveTo(-2.4, 0); c.lineTo(-1.6, -22); c.lineTo(1.8, -22); c.lineTo(2.6, 0); c.closePath(); c.fill();
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-1.8, -20, 1, 18);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * 7;
    blobs.push([Math.cos(a) * d * 1.3, -32 + Math.sin(a) * d * 0.9 - rnd() * 4, (6 + rnd() * 4) * big]);
  }
  // silueta oscura
  c.fillStyle = '#1e3a14';
  for (const [x, y, r] of blobs) { ellipse(c, x, y, r + 1.2, r * 0.92 + 1.2); c.fill(); }
  const tones = ['#2e5a1e', '#3a6c24', '#4a7e2c'];
  blobs.forEach(([x, y, r], i) => { c.fillStyle = tones[i % 3]; ellipse(c, x, y, r, r * 0.92); c.fill(); });
  // sombra interior abajo a la derecha
  c.fillStyle = 'rgba(10,30,5,0.28)';
  ellipse(c, 5, -27, 10, 7); c.fill();
  // hojas sueltas: luces y sombras
  for (let i = 0; i < 70; i++) {
    const [bx, by, r] = blobs[Math.floor(rnd() * blobs.length)];
    const a = rnd() * Math.PI * 2, d = rnd() * r;
    const x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d * 0.9;
    const lit = x - bx + y - by < 0;
    c.fillStyle = lit ? (rnd() < 0.5 ? 'rgba(178,214,108,0.55)' : 'rgba(120,170,70,0.6)') : 'rgba(18,40,10,0.45)';
    ellipse(c, x, y, 1.6, 1.1); c.fill();
  }
}

function pine(c: CanvasRenderingContext2D, rnd: () => number, snow: boolean, big: number) {
  softShadow(c, 12, 1, 20 * big, 6 * big);
  c.fillStyle = '#4a2e18';
  c.fillRect(-1.8, -12, 3.6, 12);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const yb = -8 - i * 9 * big, w = (13 - i * 2.2) * big + rnd() * 1.5, h = 14 * big;
    const pts: Pt[] = [{ x: -w, y: yb }];
    for (let k = 1; k < 6; k++) pts.push({ x: -w + (2 * w * k) / 6, y: yb + (k % 2 ? 2.2 : 0) });
    pts.push({ x: w, y: yb }, { x: 0, y: yb - h });
    c.fillStyle = '#163a1e'; poly(c, pts); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = '#245a2c';
    poly(c, [{ x: -w * 0.8, y: yb - 0.5 }, { x: 0, y: yb - h + 1 }, { x: 0, y: yb + 1 }]); c.fill();
    for (let k = 0; k < 10; k++) {
      const t = rnd(), sx = (rnd() - 0.5) * 2 * w * (1 - t);
      c.fillStyle = sx < 0 ? 'rgba(90,140,70,0.5)' : 'rgba(8,24,10,0.45)';
      ellipse(c, sx, yb - t * h * 0.9, 1.4, 0.9); c.fill();
    }
    if (snow) {
      c.fillStyle = 'rgba(246,250,255,0.95)';
      poly(c, [{ x: -w * 0.55, y: yb - h * 0.42 }, { x: 0, y: yb - h + 0.5 }, { x: w * 0.5, y: yb - h * 0.45 }, { x: 0, y: yb - h * 0.6 }]); c.fill();
      c.fillRect(-w * 0.9, yb - 1.4, w * 1.2, 1.4);
    }
  }
}

export const tree: SpriteFn = s => {
  const species: string = s.params.species ?? ((s.entity?.variant ?? 0.3) > 0.62 ? 'pine' : 'oak');
  const snow = !!s.params.snow;
  const v = Math.floor((s.entity?.variant ?? 0.3) * 5);
  const big = 0.92 + (v % 3) * 0.08;
  cache.draw(s.ctx, `tree-${species}-${snow ? 1 : 0}-${v}`, 68, 80, 24, 72, s.x, s.y + 3 * s.z, s.z, c => {
    const rnd = seeded(v * 13 + 7);
    if (species === 'pine') pine(c, rnd, snow, big);
    else oak(c, rnd, big);
  });
};

export const rocks: SpriteFn = s => {
  const v = Math.floor((s.entity?.variant ?? 0.5) * 3);
  const color: string = s.params.color ?? '#9e9e9e';
  const ratio = s.entity ? s.entity.amount / (s.entity.initialAmount || 1) : 1;
  const big = ratio > 0.5 ? 1 : 0;
  const gold = color.toLowerCase() === '#e6c13a';
  cache.draw(s.ctx, `rocks${color}${v}${big}`, 54, 38, 27, 27, s.x, s.y, s.z, c => {
    const rnd = seeded(v + 7);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(c, 3, 2, 20, 7); c.fill();
    const n = big ? 6 : 3;
    const stones: [number, number, number][] = [];
    for (let i = 0; i < n; i++) stones.push([(rnd() - 0.5) * 24, (rnd() - 0.5) * 8 - 2, 5 + rnd() * 4.5]);
    stones.sort((a, b) => a[1] - b[1]);
    for (const [bx, by, r] of stones) {
      const pts: Pt[] = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        pts.push({ x: bx + Math.cos(a) * r * (0.75 + rnd() * 0.35), y: by + Math.sin(a) * r * 0.62 * (0.75 + rnd() * 0.35) - r * 0.3 });
      }
      c.fillStyle = gold ? '#8a6418' : shade(color, -0.3); poly(c, pts); c.fill();
      c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = gold ? '#c99a26' : color;
      poly(c, pts.map(p => ({ x: p.x * 0.82 + bx * 0.18 - 0.8, y: p.y * 0.8 + (by - r * 0.45) * 0.2 - 1 }))); c.fill();
      if (gold) {
        for (let k = 0; k < 6; k++) {
          c.fillStyle = k % 2 ? '#ffe46e' : '#f2c230';
          ellipse(c, bx + (rnd() - 0.5) * r, by - r * 0.4 + (rnd() - 0.5) * r * 0.5, 1.8 + rnd(), 1.3 + rnd() * 0.7); c.fill();
        }
        c.fillStyle = 'rgba(255,255,220,0.9)';
        ellipse(c, bx - r * 0.3, by - r * 0.7, 0.9, 0.9); c.fill();
      } else {
        c.fillStyle = shade(color, 0.4);
        ellipse(c, bx - r * 0.3, by - r * 0.62, r * 0.28, r * 0.16); c.fill();
      }
    }
  });
};

export const bush: SpriteFn = s => {
  const ratio = s.entity ? s.entity.amount / (s.entity.initialAmount || 1) : 1;
  const b = Math.ceil(ratio * 4);
  const v = Math.floor((s.entity?.variant ?? 0.5) * 2);
  cache.draw(s.ctx, `bush${b}${v}`, 46, 34, 23, 25, s.x, s.y, s.z, c => {
    const rnd = seeded(v + 3);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(c, 3, 1, 16, 5.5); c.fill();
    const blobs: [number, number, number][] = [[-7, -7, 8], [7, -7, 8], [0, -13, 9], [0, -6, 8]];
    c.fillStyle = '#1d3c16';
    for (const [x, y, r] of blobs) { ellipse(c, x, y, r + 1, r * 0.8 + 1); c.fill(); }
    blobs.forEach(([x, y, r], i) => { c.fillStyle = ['#2e6226', '#347030', '#3e7e34', '#2a5a22'][i]; ellipse(c, x, y, r, r * 0.8); c.fill(); });
    c.fillStyle = 'rgba(170,210,110,0.3)'; ellipse(c, -3, -15, 4, 2.5); c.fill();
    for (let i = 0; i < b * 5; i++) {
      const x = (rnd() - 0.5) * 22, y = -4 - rnd() * 13;
      c.fillStyle = '#8a1028'; ellipse(c, x + 0.4, y + 0.4, 1.8, 1.8); c.fill();
      c.fillStyle = '#d0304a'; ellipse(c, x, y, 1.5, 1.5); c.fill();
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
