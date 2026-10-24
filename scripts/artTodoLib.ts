/**
 * Lista viva de arte: compara el contenido registrado (unidades, edificios, terrenos, recursos...) con
 * lo que ya tiene imagen en public/sprites/ y lo declarado en src/mods/art/index.ts.
 * La usan `npm run art-todo` (escribe art-src/PENDIENTES.md) y tests/arttodo.test.ts (avisa si el
 * archivo está desactualizado o si hay contenido nuevo que no aparece en la lista).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Registry } from '../src/core/Registry';
import { DECORATION_KINDS } from '../src/render/decorations';
import { type ArtEntry, sheetPath } from '../src/render/art/artRegistry';

export type Kind = 'unidad' | 'edificio' | 'recurso' | 'terreno' | 'decoración' | 'efecto' | 'interfaz';
export type Status = 'hecho' | 'sin animar' | 'pendiente';

export interface Item {
  kind: Kind;
  id: string;
  name: string;
  status: Status;
  /** Lo que falta (estados de animación, edades...). */
  missing: string[];
  /** Archivos que se esperan, relativos a public/sprites/. */
  files: string[];
  /** 1 = lo más urgente. */
  priority: number;
  /** Clave de la plantilla de prompt (ver PROMPTS). */
  prompt: string;
  note?: string;
}

export interface Manifest { states?: Record<string, unknown>; ages?: Record<string, { states?: Record<string, unknown> }> }
export interface Disk {
  /** Manifiestos leídos de public/sprites/**.json, por ruta de hoja ('sprites/units/militia.json'). */
  manifests: Map<string, Manifest>;
  exists(path: string): boolean;
}

export function loadDisk(root = resolve('.')): Disk {
  const manifests = new Map<string, Manifest>();
  return {
    manifests,
    exists: p => existsSync(join(root, 'public', p)),
  };
}

function manifestOf(disk: Disk, root: string, sheet: string): Manifest | null {
  const path = sheetPath(sheet);
  if (disk.manifests.has(path)) return disk.manifests.get(path)!;
  const file = join(root, 'public', path);
  let m: Manifest | null = null;
  if (existsSync(file)) { try { m = JSON.parse(readFileSync(file, 'utf8')); } catch { m = null; } }
  if (m) disk.manifests.set(path, m);
  return m;
}

const TERRAIN_EXTS = ['png', 'jpg', 'jpeg', 'webp'];

export function buildCatalog(reg: Registry, art: ArtEntry[], disk: Disk, root = resolve('.')): Item[] {
  const items: Item[] = [];
  const sheetOf = (kind: ArtEntry['kind'], id: string) => art.find(a => a.kind === kind && a.id === id)?.sheet;

  // ------------------------------------------------------------ unidades
  for (const u of reg.units.values()) {
    const sheet = sheetOf('unit', u.id);
    const m = sheet ? manifestOf(disk, root, sheet) : null;
    const have = new Set(Object.keys(m?.states ?? {}));
    // Hierro y carbón se recogen como la piedra (`ALIAS` en render/art/spriteSheet.ts)
    const alias = (s: string) => s.replace(/^(work|carry)-(iron|coal)$/, '$1-stone');
    const has = (s: string) => have.has(s) || have.has(alias(s)) || (s.startsWith('work-') && have.has('work')) || (s.startsWith('carry-') && have.has('carry'));
    const need = ['idle', 'walk'];
    if ((u.attack ?? 0) > 0) need.push('attack');
    if (u.gatherer) for (const r of reg.resources.keys()) need.push(`work-${r}`, `carry-${r}`);
    if (u.builder) need.push('work-build');
    need.push('death');
    const missing = need.filter(s => !has(s));
    const status: Status = !m ? 'pendiente' : missing.length ? 'sin animar' : 'hecho';
    const mounted = u.classes.includes('cavalry');
    const ranged = !!u.range && u.range >= 1;
    const key = (st: string) => `anim:${st === 'attack' && !ranged ? 'attack-melee' : st}${mounted ? ':mounted' : ''}`;
    const priority = !m ? 2
      : missing.some(s => s.startsWith('work-') || s.startsWith('carry-')) ? 1
      : missing.includes('attack') || missing.includes('walk') ? 2
      : missing.includes('death') ? 3 : 9;
    items.push({
      kind: 'unidad', id: u.id, name: u.name, status, missing: m ? missing : need, priority,
      files: (m ? missing : need).map(s => `units/${u.id}${s === 'idle' ? '' : '-' + s}.png (+ -mask.png)`),
      prompt: !m ? 'unit:still ' + missing.filter(s => s !== 'idle').map(key).join(' ') : missing.map(key).join(' '),
      note: !m ? 'primero la imagen quieta (Pack 6a/6b) y luego las animaciones' : undefined,
    });
  }

  // ------------------------------------------------------------ edificios
  for (const b of reg.buildings.values()) {
    const sheet = sheetOf('building', b.id);
    const m = sheet ? manifestOf(disk, root, sheet) : null;
    const ages = reg.ages.map(a => a.index).filter(a => a > b.age);
    const missing = !m ? [] : ages.filter(a => !m.ages?.[String(a)]).map(a => reg.ageName(a));
    const status: Status = !m ? 'pendiente' : missing.length ? 'sin animar' : 'hecho';
    items.push({
      kind: 'edificio', id: b.id, name: b.name, status,
      missing: !m ? [`imagen base (${reg.ageName(b.age)})`, ...ages.map(a => reg.ageName(a))] : missing,
      priority: !m ? 3 : 4,
      files: (!m ? [b.id, ...ages.map(a => `${b.id}-${a}`)] : ages.filter(a => !m.ages?.[String(a)]).map(a => `${b.id}-${a}`)).map(f => `buildings/${f}.png (+ -mask.png)`),
      prompt: !m ? 'building:base' : 'building:age',
      note: b.size ? `huella ${b.size}x${b.size}` : undefined,
    });
  }

  // ------------------------------------------------------------ recursos
  for (const r of reg.resourceNodes.values()) {
    const sheet = sheetOf('resource', r.id);
    const m = sheet ? manifestOf(disk, root, sheet) : null;
    items.push({
      kind: 'recurso', id: r.id, name: r.name, status: m ? 'hecho' : 'pendiente', missing: m ? [] : ['imagen'],
      priority: 3, files: m ? [] : [`resources/${r.id}.png`], prompt: 'resource',
    });
  }

  // ------------------------------------------------------------ terrenos
  for (const t of reg.terrains) {
    const key = t.pattern ?? t.id;
    const done = t.texture ? disk.exists(t.texture) : TERRAIN_EXTS.some(e => disk.exists(`sprites/terrain/${key}.${e}`));
    items.push({
      kind: 'terreno', id: t.id, name: t.name, status: done ? 'hecho' : 'pendiente', missing: done ? [] : ['textura 1024x1024'],
      priority: 3, files: done ? [] : [`terrain/${key}.png`], prompt: `terrain:${key}`,
    });
  }

  // ------------------------------------------------------------ decoración, efectos e interfaz
  // Aún sin soporte en el motor: se dibujan por código aunque exista la imagen.
  const engine = 'el motor todavía no usa estas imágenes (se dibuja por código)';
  /** Qué imágenes de efectos y de interfaz ya usa el motor (el resto aún no). */
  const wired = (folder: string, id: string) => folder === 'decorations' || (folder === 'effects' && (id.startsWith('projectile-') || id === 'rubble'))
    || (folder === 'ui' && reg.resources.has(id.replace(/^icon-/, '')));
  const fixed = (kind: Kind, folder: string, id: string, name: string, prompt: string, file = id): Item => {
    const done = disk.exists(`sprites/${folder}/${file}.png`);
    return { kind, id, name, status: done ? 'hecho' : 'pendiente', missing: done ? [] : ['imagen'], priority: 5, files: done ? [] : [`${folder}/${file}.png`], prompt, note: wired(folder, id) ? undefined : engine };
  };
  for (const k of DECORATION_KINDS) items.push(fixed('decoración', 'decorations', k, k, 'decoration', `deco-${k}`));
  const styles = new Set<string>(['arrow']);
  for (const d of [...reg.units.values(), ...reg.buildings.values()]) if (d.projectile) styles.add(d.projectile);
  for (const s of styles) items.push(fixed('efecto', 'effects', `projectile-${s}`, `Proyectil: ${s}`, 'effect'));
  for (const [id, name] of [['rubble', 'Escombros de edificio'], ['fire', 'Llama'], ['smoke', 'Humo'], ['dust', 'Polvo'], ['rally-flag', 'Bandera de punto de reunión'], ['treasure-chest', 'Cofre del tesoro']]) {
    items.push(fixed('efecto', 'effects', id, name, 'effect'));
  }
  for (const r of reg.resources.values()) items.push(fixed('interfaz', 'ui', `icon-${r.id}`, `Icono de ${r.name}`, 'ui:icon'));
  for (const [id, name] of [['icon-population', 'Icono de población'], ['icon-idle-villager', 'Aldeano inactivo'], ['icon-attack', 'Atacar'], ['icon-stop', 'Parar'], ['icon-delete', 'Eliminar'], ['icon-build', 'Construir'], ['icon-rally', 'Punto de reunión'], ['panel-stone', 'Panel de piedra'], ['panel-wood', 'Panel de madera'], ['panel-parchment', 'Pergamino'], ['frame-corner', 'Esquina de marco']]) {
    items.push(fixed('interfaz', 'ui', id, name, id.startsWith('icon') ? 'ui:icon' : 'ui:panel'));
  }
  for (const t of reg.techs.values()) items.push(fixed('interfaz', 'ui/tech', t.id, `Tecnología: ${t.name}`, 'ui:tech'));
  return items;
}

// ---------------------------------------------------------------- prompts (ver docs/prompts-nano-banana.md)

const SAME = 'Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. ';
const ANIM = (what: string, n: number) => `Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw ${n} poses of ${what}. The ${n} poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.`;
const STATES: Record<string, [string, number]> = {
  walk: ['one complete walking step that loops smoothly: right foot forward, passing, left foot forward, passing', 6],
  'attack-melee': ['one sword blow toward the lower right: standing ready, raising the weapon, weapon high, swinging down, follow-through, and recovering', 6],
  attack: ['shooting toward the lower right: standing ready, drawing, aiming, releasing, and lowering the weapon', 6],
  death: ['falling down: being hit, staggering, knees giving way, falling, lying on the ground, lying still', 6],
  'work-wood': ['chopping a tree trunk with an axe (the tree itself is not drawn)', 6],
  'work-gold': ['swinging a pickaxe down at rocks (the rocks are not drawn)', 6],
  'work-stone': ['swinging a pickaxe down at rocks (the rocks are not drawn)', 6],
  'work-iron': ['swinging a pickaxe down at rocks (the rocks are not drawn)', 6],
  'work-coal': ['swinging a pickaxe down at rocks (the rocks are not drawn)', 6],
  'work-food': ['picking berries from a bush and putting them in a basket (the bush is not drawn)', 6],
  'work-build': ['hammering with a mallet, crouching', 6],
  'carry-wood': ['walking while carrying logs on the shoulder', 8],
  'carry-food': ['walking while carrying a full basket of food', 8],
  'carry-gold': ['walking with a heavy sack of ore over the shoulder', 8],
  'carry-stone': ['walking with a heavy sack of ore over the shoulder', 8],
  'carry-iron': ['walking with a heavy sack of ore over the shoulder', 8],
  'carry-coal': ['walking with a heavy sack of coal over the shoulder', 8],
};
const TERRAIN: Record<string, string> = {
  grass: 'a lush green meadow with small tufts of grass and a few tiny yellow and white wildflowers',
  dirt: 'packed earth of a village square, a natural muted brown with small pebbles and a few dry grass blades',
  forest: 'a forest floor of dark soil, fallen leaves, pine needles, moss patches and small twigs',
  sand: 'pale beach sand with soft ripples from the wind and a few tiny shells and pebbles',
  desert: 'dry ochre desert ground, hard cracked clay with scattered small stones',
  snow: 'fresh snow with gentle drifts, soft blue shade in the hollows and a few sparkling ice crystals',
  rock: 'rugged grey mountain rock with cracks, layers and spots of lichen',
  water: 'deep calm lake water, dark blue-green, with small gentle ripples and no reflections',
  shallows: 'clear shallow water over a sandy bottom with visible pebbles and soft rippling light',
};

/** Prompt de una clave (ver Item.prompt), o null si no hay plantilla. */
export function promptFor(key: string): string | null {
  const [group, a, b] = key.split(':');
  if (group === 'unit') return `${SAME}Draw the character(s) full length, seen from slightly above, turned toward the lower right and standing calmly ready, on a plain white background with wide empty white gaps, no shadow, no ground. Tunics, tabards, shields and cloth in bright magenta (intense pink-purple); magenta nowhere else. No writing, no numbers, no frame. (Several characters per picture, see Pack 6 in docs/prompts-nano-banana.md.)`;
  if (group === 'anim') {
    const s = STATES[a];
    if (!s) return null;
    const what = b === 'mounted' ? s[0].replace(/foot|feet/g, 'hoof').replace('one sword blow', 'one sword blow from horseback') + ' (the horse moves, the rider stays in the saddle)' : s[0];
    return ANIM(what, s[1]);
  }
  if (group === 'building') {
    return a === 'age'
      ? 'Redraw the attached building as it would look in a later, richer period (feudal: half-timbered walls, red clay tiles; castles: dressed stone, slate roofs; imperial: ornate stone and brick, spires), keeping the same viewing angle, size, footprint and lighting from the upper left. Plain white background, no shadow, no ground. Flags and awnings in bright magenta. No writing, no numbers, no frame.'
      : `${SAME}Draw the building seen from high above at a corner so that its ground plan looks like a diamond twice as wide as tall, floating on a plain white background with wide gaps, no shadow, no ground. Flags and awnings in bright magenta. No people, no writing, no numbers, no frame. (See Packs 3 and 4 in docs/prompts-nano-banana.md.)`;
  }
  if (group === 'resource') return `${SAME}Draw the resource, in stages from full to nearly exhausted, on a plain white background with wide gaps, no shadow, no ground, seen from high above at an angle. No writing, no numbers, no frame. (See Pack 2.)`;
  if (group === 'terrain') return `A square close-up painting of the ground, as if photographed looking straight down at your feet: no horizon, no sky, no perspective. Soft, even daylight with no dark corners and no strong shadows. The same kind of ground fills the whole square evenly, with no single large object, path or feature that stands out. Detailed hand-painted illustration with natural colors and fine small details. No writing, no frame, no border. The ground is: ${TERRAIN[a] ?? 'the ground of this terrain'}.`;
  if (group === 'decoration') return `${SAME}Draw small separate ground decorations (about 12 per picture, 4 per row) on a plain white background with wide gaps, seen from high above at an angle, each much smaller than a map tile, no shadow, no ground patch. No writing, no numbers, no frame. (See Pack 8.)`;
  if (group === 'effect') return `${SAME}Draw small separate objects or effect frames (projectiles seen from the side pointing right; flames, smoke and dust in 4 stages each) on a plain white background with wide gaps, no shadow. No writing, no numbers, no frame. (See Pack 7.)`;
  if (group === 'ui') return `Twelve small square paintings in three rows of four on a plain white background with white gaps, each a single object on a dark warm background inside a bevelled grey stone border, easy to recognise when very small, light from the upper left, warm medieval colors. No writing, no letters, no numbers. (See Pack 9.)`;
  return null;
}

// ---------------------------------------------------------------- Markdown

const ICON: Record<Status, string> = { hecho: '✅ hecho', 'sin animar': '🟡 sin animar', pendiente: '🔴 pendiente' };

export function renderMarkdown(items: Item[]): string {
  const out: string[] = [];
  out.push('# Arte pendiente', '');
  out.push('> Generado por `npm run art-todo` a partir del contenido registrado (mods), `src/mods/art/index.ts` y `public/sprites/`.');
  out.push('> **No lo edites a mano**: vuelve a ejecutar el comando después de importar arte nuevo o de añadir contenido.');
  out.push('> `npm test` falla si este archivo está desactualizado. Flujo y plantillas: README («Arte con imágenes») y `docs/prompts-nano-banana.md`.', '');
  const kinds: Kind[] = ['unidad', 'edificio', 'recurso', 'terreno', 'decoración', 'efecto', 'interfaz'];
  out.push('## Resumen', '', '| Tipo | Hecho | Sin animar | Pendiente |', '| --- | ---: | ---: | ---: |');
  for (const k of kinds) {
    const l = items.filter(i => i.kind === k);
    out.push(`| ${k} | ${l.filter(i => i.status === 'hecho').length} | ${l.filter(i => i.status === 'sin animar').length} | ${l.filter(i => i.status === 'pendiente').length} |`);
  }
  out.push('');
  const todo = items.filter(i => i.status !== 'hecho');
  out.push('## Siguiente en generar (por prioridad)', '',
    '1. Aldeano: recoger, llevar carga y construir · 2. Unidades de combate: andar y atacar · 3. Muerte y edificios por edad · 4. Variantes por edad restantes · 5. Decoración, efectos e interfaz (necesitan además soporte en el motor).', '');
  const next = [...todo].sort((a, b) => a.priority - b.priority).slice(0, 15);
  for (const i of next) out.push(`- P${i.priority} · **${i.kind} ${i.id}**: ${i.missing.slice(0, 6).join(', ')}${i.missing.length > 6 ? '…' : ''}`);
  out.push('');
  const used = new Set<string>();
  for (const k of kinds) {
    const l = items.filter(i => i.kind === k);
    out.push(`## ${k[0].toUpperCase()}${k.slice(1)}${k === 'unidad' ? 'es' : k === 'efecto' || k === 'recurso' ? 's' : k === 'decoración' ? 'es' : k === 'interfaz' ? '' : 's'}`, '');
    out.push('| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |', '| --- | --- | --- | --- | --- | ---: | --- |');
    for (const i of l) {
      if (i.status !== 'hecho') for (const k of i.prompt.split(' ')) used.add(k);
      out.push(`| ${i.id} | ${i.name} | ${ICON[i.status]} | ${i.missing.join(', ') || '—'} | ${i.files.join('<br>') || '—'} | ${i.status === 'hecho' ? '—' : i.priority} | ${i.status === 'hecho' ? '—' : i.prompt.split(' ').map(k => '`' + k + '`').join(' ')} |`);
    }
    const notes = [...new Set(l.filter(i => i.status !== 'hecho' && i.note).map(i => i.note!))];
    if (notes.length) out.push('', ...notes.map(n => `*${n}*`));
    out.push('');
  }
  out.push('## Prompts', '', 'Cada fila apunta a una plantilla por su clave. Adjunta la imagen del personaje o edificio indicado y pega el texto. Después: `npm run art-import` y `npm run art-todo`.', '');
  for (const key of [...used].sort()) {
    const p = promptFor(key);
    if (p) out.push(`### \`${key}\``, '', '```text', p, '```', '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
