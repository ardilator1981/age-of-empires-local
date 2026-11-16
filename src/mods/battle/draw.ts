import { BALANCE } from '../../config/balance';
import type { OverlayContext } from '../../core/types';
import { battleState, type Regiment } from './state';

const B = BALANCE.battle;

/** Iconos de estado de un regimiento (los activos ahora), de más a menos importante. */
export function statusIcons(r: Regiment, now: number): string[] {
  const out: string[] = [];
  if (r.routed) return ['🏳️'];
  if (r.charging) out.push('🐎');
  else if (r.running) out.push('🏃');
  if (now < r.rearUntil) out.push('⤵️');
  else if (now < r.flankUntil) out.push('↔️');
  if (r.morale < B.wavering) out.push('⚠️');
  if (r.fatigue > B.tired) out.push('😓');
  return out;
}

function moraleColor(r: Regiment): string {
  if (r.routed) return '#8a8a8a';
  return r.morale > 50 ? '#5cc15a' : r.morale > B.wavering ? '#e0b43a' : '#d9503c';
}

/**
 * Sobre cada regimiento: barra de moral (con el cansancio debajo) e iconos de estado: huyendo,
 * cargando, corriendo, flanqueado, de espaldas, vacilante y cansado. Los enemigos solo si se ven.
 */
export function drawBattle(o: OverlayContext) {
  const { ctx, game } = o, z = o.zoom;
  const st = battleState(game);
  if (!st) return;
  const me = game.humanId, vis = game.human.visible, w = game.map.w;
  const bw = 48 * z, bh = Math.max(4, 6 * z);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `${Math.max(12, Math.round(16 * z))}px sans-serif`;
  for (const r of Object.values(st.regs)) {
    const cx = r.center.x, cy = r.center.y;
    if (r.owner !== me && !vis[Math.floor(cy) * w + Math.floor(cx)]) continue;
    const p = o.project(cx, cy);
    // Por encima de las cabezas de las tropas (y de sus barras de vida)
    const x = p.x - bw / 2, y = p.y - 68 * z;
    ctx.fillStyle = r.owner === me ? 'rgba(236,224,180,0.9)' : 'rgba(255,120,100,0.9)';
    ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4 + (r.fatigue > 0 ? bh * 0.7 : 0));
    ctx.fillStyle = 'rgba(20,16,10,0.9)';
    ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2 + (r.fatigue > 0 ? bh * 0.7 : 0));
    ctx.fillStyle = moraleColor(r);
    ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, r.morale / 100)), bh);
    if (r.fatigue > 0) {
      ctx.fillStyle = '#5a9ad9';
      ctx.fillRect(x, y + bh, bw * Math.min(1, r.fatigue / 100), bh * 0.5);
    }
    const icons = statusIcons(r, game.time);
    if (icons.length) ctx.fillText(icons.join(''), p.x, y - 2 * z);
  }
  ctx.restore();
}
