import type { Registry } from '../../core/Registry';
import type { SpriteContext, SpriteFn } from '../../core/types';
import { artMode, hasDom } from './assets';
import { Sheet } from './spriteSheet';

/**
 * Qué definiciones (unidades, edificios, recursos) se dibujan con una hoja de sprites.
 * Lo que no tenga hoja, o cuya hoja aún no ha cargado o no existe, sigue con su
 * sprite procedural: se puede sustituir el arte pieza a pieza.
 */
export type ArtKind = 'unit' | 'building' | 'resource';
export interface ArtEntry { kind: ArtKind; id: string; sheet: string }

export const unitArt = (id: string, sheet: string): ArtEntry => ({ kind: 'unit', id, sheet });
export const buildingArt = (id: string, sheet: string): ArtEntry => ({ kind: 'building', id, sheet });
export const resourceArt = (id: string, sheet: string): ArtEntry => ({ kind: 'resource', id, sheet });

/** 'units/militia' → 'sprites/units/militia.json' */
export function sheetPath(sheet: string): string {
  let p = sheet.endsWith('.json') ? sheet : sheet + '.json';
  if (!p.startsWith('sprites/') && !p.startsWith('/') && !/^https?:/.test(p)) p = 'sprites/' + p;
  return p;
}

/** Las hojas se comparten entre partidas (se cargan una sola vez). */
const sheets = new Map<string, Sheet>();
const bindings = new WeakMap<Registry, Map<string, Sheet>>();
const wrapped = new WeakMap<Registry, Set<string>>();

function getSheet(path: string, kind: ArtKind): Sheet {
  const key = `${kind}|${path}`;
  let s = sheets.get(key);
  if (!s) { s = new Sheet(path, kind); sheets.set(key, s); }
  return s;
}

const kindOf = (def: any): ArtKind => def?.kind === 'unit' ? 'unit' : def?.kind === 'building' ? 'building' : 'resource';

/** Hoja de una definición, solo si ya está cargada. */
export function artFor(reg: Registry, kind: ArtKind, id: string): Sheet | null {
  const s = bindings.get(reg)?.get(`${kind}:${id}`);
  return s?.ready ? s : null;
}

/** Hojas declaradas en este registro (cargadas o no). */
export function declaredArt(reg: Registry): Sheet[] {
  return [...new Set(bindings.get(reg)?.values() ?? [])];
}

/**
 * Asocia hojas a definiciones. Envuelve el sprite de cada una para que dibuje la
 * hoja cuando está lista y, si no, el sprite original. Llamar después de registrar
 * todo el contenido (el mod de arte va el último).
 */
export function bindArt(reg: Registry, entries: ArtEntry[]) {
  if (!hasDom || artMode() === 'no') return;
  let map = bindings.get(reg);
  if (!map) { map = new Map(); bindings.set(reg, map); }
  let done = wrapped.get(reg);
  if (!done) { done = new Set(); wrapped.set(reg, done); }
  for (const a of entries) {
    const def: any = a.kind === 'unit' ? reg.units.get(a.id) : a.kind === 'building' ? reg.buildings.get(a.id) : reg.resourceNodes.get(a.id);
    if (!def) { console.warn(`[arte] ${a.kind} "${a.id}" no existe (hoja ${a.sheet})`); continue; }
    map.set(`${a.kind}:${a.id}`, getSheet(sheetPath(a.sheet), a.kind));
    const spriteId: string = def.sprite;
    if (done.has(spriteId)) continue;
    done.add(spriteId);
    const original = reg.sprites.get(spriteId);
    const fn: SpriteFn = (s: SpriteContext) => {
      const sheet = artFor(reg, kindOf(s.def), s.def?.id);
      if (sheet) sheet.draw(s);
      else original?.(s);
    };
    fn.death = (s, t, facing) => {
      const sheet = artFor(reg, kindOf(s.def), s.def?.id);
      return sheet ? sheet.death(s, t, facing) : original?.death?.(s, t, facing) ?? false;
    };
    reg.addSprite(spriteId, fn);
  }
}
