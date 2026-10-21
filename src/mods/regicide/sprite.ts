import type { SpriteFn } from '../../core/types';
import { UNIT_SCALE, humanoid } from '../../render/sprites';

/** El rey: un humanoide con capa y armadura, y una corona sobre la cabeza. */
export const kingSprite: SpriteFn = s => {
  humanoid(s);
  const { ctx, x, y, z, params: P } = s;
  const sc = (P.scale ?? 1) * UNIT_SCALE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(z * sc, z * sc);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-3.7, -25.4); ctx.lineTo(-3.9, -30.6); ctx.lineTo(-1.9, -28.4); ctx.lineTo(0, -31.4);
  ctx.lineTo(1.9, -28.4); ctx.lineTo(3.9, -30.6); ctx.lineTo(3.7, -25.4); ctx.closePath();
  ctx.fillStyle = '#f2c230'; ctx.fill();
  ctx.strokeStyle = 'rgba(22,14,6,0.85)'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = '#d6322e';
  ctx.beginPath(); ctx.arc(0, -27, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
