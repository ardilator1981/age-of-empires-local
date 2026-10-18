import type { Registry } from '../core/Registry';
import type { Pt, SpriteContext } from '../core/types';

/**
 * Retratos para la interfaz, dibujados con los mismos sprites del juego
 * (como los retratos de AoE2). Se generan una vez y se guardan en caché.
 */
const cache = new Map<string, string>();
const S = 64;

export function portrait(reg: Registry, kind: 'unit' | 'building' | 'resource', defId: string, color: string, age: number): string {
  const key = `${kind}|${defId}|${color}|${age}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def: any = kind === 'unit' ? reg.units.get(defId) : kind === 'building' ? reg.buildings.get(defId) : reg.resourceNodes.get(defId);
  const fn = def ? reg.sprites.get(def.sprite) : undefined;
  const R = 2;
  const c = document.createElement('canvas');
  c.width = S * R; c.height = S * R;
  const ctx = c.getContext('2d')!;
  ctx.scale(R, R);
  const bg = ctx.createRadialGradient(S / 2, S * 0.4, 4, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, '#6e5a40'); bg.addColorStop(1, '#1e160e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  if (fn && def) {
    let x = S / 2, y = S * 0.88, z = 1.3;
    let project: (wx: number, wy: number) => Pt = () => ({ x, y });
    let foot: SpriteContext['foot'];
    if (kind === 'unit') {
      z = (def.radius ?? 0.22) > 0.3 ? 1.0 : 1.3;
      x = S / 2 - (z < 1.2 ? 3 : 0);
    } else if (kind === 'building') {
      const size = def.size as number;
      z = Math.min(0.9, 50 / (size * 64));
      const cy = S * 0.84 - size * 8 * z;
      project = (wx, wy) => ({ x: S / 2 + (wx - wy) * 32 * z, y: cy + (wx + wy - size) * 16 * z });
      foot = { tx: 0, ty: 0, size };
      const p = project(size / 2, size / 2);
      x = p.x; y = p.y;
    } else {
      z = def.sprite === 'tree' ? 0.8 : 1.15;
      y = def.sprite === 'tree' ? S * 0.95 : S * 0.7;
    }
    try {
      fn({ ctx, x, y, z, time: 0.8, color, entity: null, def, params: def.spriteParams ?? {}, project, foot, age });
    } catch { /* un sprite de mod puede necesitar una entidad */ }
  }
  // URL corta (blob:) en vez de data: para que el HTML del panel no pese
  const data = c.toDataURL('image/png');
  const bin = atob(data.slice(data.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  cache.set(key, url);
  return url;
}
