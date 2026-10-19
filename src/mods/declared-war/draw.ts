import type { OverlayContext, Pt } from '../../core/types';
import type { WarPick } from './panel';
import { battlePointInfo, fmt, warState, type PointInfo, type War } from './war';
import { BALANCE } from '../../config/balance';

function ring(o: OverlayContext, x: number, y: number, r: number, n = 72): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push(o.project(x + Math.cos(t) * r, y + Math.sin(t) * r));
  }
  return pts;
}

function pathOf(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** Bandera en el centro del círculo, con la cuenta atrás. */
function flag(o: OverlayContext, w: War, label: string) {
  const { ctx, game } = o, z = o.zoom;
  const c = o.project(w.x, w.y);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(1.5, 2.5 * z);
  ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 46 * z); ctx.stroke();
  ctx.fillStyle = game.players[w.a].color;
  ctx.beginPath(); ctx.moveTo(c.x, c.y - 46 * z); ctx.lineTo(c.x + 22 * z, c.y - 40 * z); ctx.lineTo(c.x, c.y - 32 * z); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8c870'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = `bold ${Math.max(11, Math.round(15 * z))}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(label, c.x, c.y - 52 * z);
  ctx.fillStyle = '#ffe6a0'; ctx.fillText(label, c.x, c.y - 52 * z);
  ctx.textAlign = 'left';
}

let cache: { key: string; info: PointInfo } | null = null;

/** Vista previa al elegir el punto: roca y agua en rojo, entradas del borde, cima y validez. */
function preview(o: OverlayContext, pk: WarPick) {
  const { ctx, game, ui } = o, z = o.zoom;
  let at = pk.pending;
  if (!at && ui.mouse?.inside) at = o.unproject(ui.mouse.x, ui.mouse.y);
  if (!at || pk.target === null) return;
  const key = `${at.x.toFixed(1)},${at.y.toFixed(1)},${pk.target},${game.map.version}`;
  if (cache?.key !== key) cache = { key, info: battlePointInfo(game, game.humanId, pk.target, at.x, at.y) };
  const info = cache.info, r = BALANCE.war.circleRadius, m = game.map;
  // Casillas infranqueables dentro del círculo
  ctx.fillStyle = 'rgba(220,40,30,0.32)';
  for (let ty = Math.floor(at.y - r); ty <= at.y + r; ty++) for (let tx = Math.floor(at.x - r); tx <= at.x + r; tx++) {
    if (!m.inBounds(tx, ty) || m.walkable(tx, ty) || Math.hypot(tx + 0.5 - at.x, ty + 0.5 - at.y) > r) continue;
    const q = [o.project(tx, ty), o.project(tx + 1, ty), o.project(tx + 1, ty + 1), o.project(tx, ty + 1)];
    pathOf(ctx, q); ctx.fill();
  }
  const pts = ring(o, at.x, at.y, r);
  pathOf(ctx, pts);
  ctx.fillStyle = info.ok ? 'rgba(255,230,140,0.10)' : 'rgba(255,60,60,0.10)'; ctx.fill();
  ctx.strokeStyle = info.ok ? '#ffe08a' : '#ff6b5a'; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.setLineDash([8, 5]); ctx.stroke(); ctx.setLineDash([]);
  // Entradas: borde transitable (verde) o cerrado (rojo)
  for (const e of info.edge) {
    const p = o.project(e.x, e.y);
    ctx.fillStyle = e.ok ? '#7dff7d' : '#ff5a4a';
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, 2.6 * z), 0, Math.PI * 2); ctx.fill();
  }
  // La cima
  if (info.peak) {
    const p = o.project(info.peak.x, info.peak.y);
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 12 * z); ctx.lineTo(p.x - 7 * z, p.y); ctx.lineTo(p.x + 7 * z, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const c = o.project(at.x, at.y);
  const text = info.ok ? `Alturas ${info.minH.toFixed(1)}–${info.maxH.toFixed(1)} · ${info.passes < 0 ? 'abierto' : `${info.passes} entradas`}` : info.reason ?? '';
  ctx.font = `bold ${Math.max(12, Math.round(14 * z))}px Georgia, serif`; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(text, c.x, c.y);
  ctx.fillStyle = info.ok ? '#fff2c0' : '#ffb0a0'; ctx.fillText(text, c.x, c.y);
  ctx.textAlign = 'left';
}

/** Círculos de batalla en el mapa (los ven todos los jugadores, también bajo la niebla). */
export function drawWarWorld(o: OverlayContext) {
  const st = warState(o.game);
  if (!st) return;
  const { ctx, game } = o, z = o.zoom;
  for (const w of st.wars) {
    if (w.phase !== 'prep' && w.phase !== 'battle') continue;
    const battle = w.phase === 'battle';
    const pulse = battle ? 0.5 + 0.5 * Math.sin(game.time * 4) : 0;
    const pts = ring(o, w.x, w.y, w.r);
    pathOf(ctx, pts);
    ctx.fillStyle = battle ? `rgba(200,30,20,${0.08 + pulse * 0.06})` : 'rgba(255,215,110,0.07)';
    ctx.fill();
    ctx.strokeStyle = battle ? '#ff4a3a' : '#ffd36e';
    ctx.lineWidth = Math.max(2, 3 * z);
    if (!battle) ctx.setLineDash([10, 6]);
    ctx.stroke(); ctx.setLineDash([]);
    flag(o, w, battle ? `⚔ ${fmt(w.endsAt - game.time)}` : `⚔ ${fmt(w.battleAt - game.time)}`);
  }
  const pk = o.ui.pickPoint as WarPick | null;
  if (pk?.owner === 'declared-war') preview(o, pk);
}

/** Y en el minimapa. */
export function drawWarMinimap(o: OverlayContext) {
  const st = warState(o.game);
  if (!st) return;
  const { ctx, game } = o;
  const draw = (x: number, y: number, r: number, color: string, dash: boolean) => {
    pathOf(ctx, Array.from({ length: 36 }, (_, i) => o.project(x + Math.cos(i / 36 * Math.PI * 2) * r, y + Math.sin(i / 36 * Math.PI * 2) * r)));
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; if (dash) ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
    const c = o.project(x, y);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2); ctx.fill();
  };
  for (const w of st.wars) {
    if (w.phase !== 'prep' && w.phase !== 'battle') continue;
    const on = w.phase === 'battle' ? (Math.sin(game.time * 6) > -0.3) : true;
    draw(w.x, w.y, w.r, w.phase === 'battle' ? (on ? '#ff4a3a' : '#ffb0a0') : '#ffd36e', w.phase !== 'battle');
  }
  const pk = o.ui.pickPoint as WarPick | null;
  if (pk?.owner === 'declared-war' && pk.pending) draw(pk.pending.x, pk.pending.y, BALANCE.war.circleRadius, '#ffffff', true);
}
