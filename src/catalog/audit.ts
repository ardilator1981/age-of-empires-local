/**
 * Auditoría del contenido: recorre el Registry y calcula, para cada definición (unidad, edificio,
 * recurso, tecnología, poder, civilización...), qué hace, quién la usa y si tiene lógica detrás o
 * está «huérfana». Sin DOM: la comparten `npm run catalog` (docs/catalogo.md), el test que vigila
 * que ese archivo esté al día y la pantalla de Catálogo del juego (ui/CatalogScreen.ts).
 *
 * Las heurísticas son estructurales (quién entrena qué, quién gasta qué recurso, a qué afecta cada
 * efecto...). Para lo que solo el código conoce (la IA, los generadores de mapas, los poderes que
 * crean unidades) se buscan los ids entre comillas en el código de esas funciones (`literals`).
 * Lo que la auditoría no puede saber se anota a mano en docs/catalogo-notas.json.
 */
import { Registry } from '../core/Registry';
import type { BuildingDef, Cost, GameMod, TechDef, UnitDef } from '../core/types';
import { AIController, AISystem } from '../game/systems/AISystem';
import { MapGenerator } from '../game/MapGenerator';

export type CatType = 'unit' | 'building' | 'resource' | 'node' | 'tech' | 'power' | 'civ' | 'victory' | 'terrain' | 'engine';
/** ok = integrado · unused = sin usar / sin lógica · dev = en desarrollo / pendiente · deco = solo decorativo */
export type CatState = 'ok' | 'unused' | 'dev' | 'deco';

export const CAT_TYPES: { type: CatType; label: string; icon: string }[] = [
  { type: 'unit', label: 'Unidades', icon: '🧍' },
  { type: 'building', label: 'Edificios', icon: '🏛️' },
  { type: 'tech', label: 'Tecnologías', icon: '📜' },
  { type: 'resource', label: 'Recursos', icon: '🪙' },
  { type: 'node', label: 'Nodos del mapa', icon: '🌲' },
  { type: 'power', label: 'Poderes', icon: '⚡' },
  { type: 'civ', label: 'Civilizaciones', icon: '🚩' },
  { type: 'victory', label: 'Victorias', icon: '🏆' },
  { type: 'terrain', label: 'Terrenos', icon: '🗺️' },
  { type: 'engine', label: 'Motor y mods', icon: '⚙️' },
];

export const STATE_LABEL: Record<CatState, string> = {
  ok: '✔ Integrado', unused: '⚠ Sin usar', dev: '🛠 En desarrollo', deco: '🎨 Solo decorativo',
};

/** Anotación manual de un elemento (docs/catalogo-notas.json). */
export interface CatNote {
  status: 'dev' | 'deco' | 'ok';
  text: string;
  /** Fase del plan a la que pertenece («5»). */
  phase?: string;
  /**
   * Expresión regular sobre los ids de órdenes, sistemas, órdenes de red y poderes: si alguno
   * coincide, lo anotado ya se ha implementado, la nota caduca y se ignora (se avisa en el informe).
   */
  until?: string;
}
export type CatNotes = Record<string, CatNote>;

export interface CatItem {
  type: CatType;
  key: string;
  id: string;
  name: string;
  icon: string;
  mod: string;
  description: string;
  age?: number;
  ageName?: string;
  /** Ids de las civilizaciones que lo tienen (vacío = todas). */
  civs: string[];
  cost: Cost;
  /** Qué hace dentro del juego, según los datos. */
  does: string[];
  /** Implicaciones y aplicaciones: qué desbloquea, qué depende de ello, para qué sirve en la partida. */
  links: string[];
  /** Lo que le falta (por qué está sin usar). Vacío = tiene lógica. */
  missing: string[];
  /** Avisos que no lo dejan sin usar (la IA no lo usa, solo sprite procedural...). */
  hints: string[];
  /** ¿La IA lo usa? null = no aplica. */
  ai: boolean | null;
  art: 'imagen' | 'procedural' | '—';
  state: CatState;
  note?: CatNote;
}

export interface CatalogResult {
  items: CatItem[];
  /** Pistas de comercio: lo que el contenido dice de comerciar y la infraestructura que hay. */
  trade: TradeReport;
  /** Comparativa entre civilizaciones: contenido por edad, únicos y la mejor unidad de cada edad. */
  civReports: CivReport[];
  /** Notas manuales que ya no hacen falta (lo que anotaban existe ya). */
  staleNotes: string[];
  /** Notas que apuntan a contenido que no existe. */
  orphanNotes: string[];
}

export interface CivAgeRow {
  age: number;
  ageName: string;
  /** Acumulados hasta esa edad: lo que la civilización puede entrenar, construir e investigar. */
  units: number;
  buildings: number;
  techs: number;
  /** Unidades entrenables por función (infantería, arqueros, caballería, asedio, armas de fuego, aire). */
  roles: Record<string, number>;
  /** La unidad militar más potente disponible (vida × daño por segundo) y su índice. */
  best: { id: string; name: string; score: number } | null;
}
export interface CivReport {
  id: string;
  name: string;
  bonusText: string[];
  eras: { age: number; name: string }[];
  powers: string[];
  unique: { units: string[]; buildings: string[]; techs: string[] };
  ages: CivAgeRow[];
}

export interface TradeReport {
  mentions: { key: string; name: string; text: string }[];
  infrastructure: string[];
}

// ---------------------------------------------------------------- utilidades

/** Ids entre comillas en el código de una función o clase (la IA, un generador de mapas, un poder...). */
function literals(...fns: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const f of fns) {
    if (!f) continue;
    let src = '';
    try { src = String(f); } catch { continue; }
    for (const m of src.matchAll(/['"`]([A-Za-z][A-Za-z0-9_-]*)['"`]/g)) out.add(m[1]);
  }
  return out;
}

const list = (xs: string[], max = 4) => xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} y ${xs.length - max} más`;
const costKeys = (c: Cost) => Object.entries(c).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k);

/** Qué mod aportó cada elemento (el primero de la lista que lo registra). */
function ownersOf(mods: GameMod[]): Map<string, string> {
  const out = new Map<string, string>();
  const quiet = console.warn; const err = console.error;
  console.warn = () => {}; console.error = () => {};
  try {
    // Un Registry nuevo con cada prefijo de mods: lo que aparece al añadir un mod es suyo.
    // Se construye a mano (sin validate) para no repetir avisos.
    const ids = (r: Registry) => [
      ...[...r.units.keys()].map(k => 'unit:' + k), ...[...r.buildings.keys()].map(k => 'building:' + k),
      ...[...r.techs.keys()].map(k => 'tech:' + k), ...[...r.resources.keys()].map(k => 'resource:' + k),
      ...[...r.resourceNodes.keys()].map(k => 'node:' + k), ...[...r.powers.keys()].map(k => 'power:' + k),
      ...[...r.civs.keys()].map(k => 'civ:' + k), ...[...r.victories.keys()].map(k => 'victory:' + k),
      ...r.terrains.map(t => 'terrain:' + t.id),
      ...[...r.orders.keys()].map(k => 'engine:order-' + k), ...r.systems.map(s => 'engine:system-' + s.id),
      ...[...r.netCommands.keys()].map(k => 'engine:net-' + k), ...r.aiPlugins.map(p => 'engine:ai-' + p.id),
      ...r.hudPanels.map(p => 'engine:panel-' + p.id),
    ];
    for (let i = 0; i < mods.length; i++) {
      const r = new Registry();
      for (const m of mods.slice(0, i + 1)) { try { m.register(r); } catch { /* se avisa al construir el real */ } }
      for (const k of ids(r)) if (!out.has(k)) out.set(k, mods[i].id);
    }
  } finally { console.warn = quiet; console.error = err; }
  return out;
}

// ---------------------------------------------------------------- auditoría

export interface AuditInput {
  reg: Registry;
  /** Mods activos, en orden (para saber de quién es cada cosa). */
  mods: GameMod[];
  /** Ids con imagen declarada: 'unit:villager', 'building:castle'... (src/mods/art). */
  art: Set<string>;
  notes?: CatNotes;
}

export function auditCatalog({ reg, mods, art, notes = {} }: AuditInput): CatalogResult {
  const owners = ownersOf(mods);
  const modOf = (key: string) => owners.get(key) ?? '?';
  const items: CatItem[] = [];
  const lastAge = Math.max(...reg.ages.map(a => a.index));
  const ageName = (i: number) => reg.ageName(i);
  const resName = (id: string) => reg.resources.get(id)?.name ?? id;
  const civName = (id: string) => reg.civs.get(id)?.name ?? id;
  const unitName = (id: string) => reg.units.get(id)?.name ?? id;
  const bldName = (id: string) => reg.buildings.get(id)?.name ?? id;
  const allDefs = (): (UnitDef | BuildingDef)[] => [...reg.units.values(), ...reg.buildings.values()];

  // ---- índices
  const trainedBy = new Map<string, UnitDef[]>();
  for (const u of reg.units.values()) for (const b of u.trainedAt) trainedBy.set(b, [...(trainedBy.get(b) ?? []), u]);
  const researchedBy = new Map<string, TechDef[]>();
  for (const t of reg.techs.values()) researchedBy.set(t.researchedAt, [...(researchedBy.get(t.researchedAt) ?? []), t]);
  /** Edificios que piden otro: id → quién lo pide. */
  const requiredBy = new Map<string, string[]>();
  const need = (b: string, who: string) => requiredBy.set(b, [...(requiredBy.get(b) ?? []), who]);
  for (const b of reg.buildings.values()) for (const r of b.requiresBuildings ?? []) need(r, b.name);
  for (const t of reg.techs.values()) for (const r of t.requiresBuildings?.ids ?? []) need(r, t.name);
  const spent = new Map<string, string[]>();
  const spend = (c: Cost | undefined, who: string) => { for (const r of costKeys(c ?? {})) spent.set(r, [...(spent.get(r) ?? []), who]); };
  for (const d of allDefs()) spend(d.cost, d.name);
  for (const t of reg.techs.values()) spend(t.cost, t.name);
  for (const w of reg.powers.values()) spend(w.cost, w.name);
  const upgradeFrom = new Map<string, string>();
  for (const t of reg.techs.values()) for (const e of t.effects) if (e.type === 'upgrade') upgradeFrom.set(e.to, e.from);

  // ---- código de mods y del motor: ids que mencionan
  const aiSrc = literals(AISystem, AIController, ...reg.aiPlugins.map(p => p.think));
  for (const p of reg.aiPlugins) for (const id of p.uses ?? []) aiSrc.add(id);
  const mapSrc = literals(MapGenerator, ...[...reg.mapTypes.values()].map(m => m.generate), ...reg.gameStartHooks);
  const spawnSrc = literals(...reg.gameStartHooks, ...[...reg.powers.values()].map(p => p.apply), ...[...reg.netCommands.values()],
    ...reg.systems.map(s => s.factory), ...reg.hudPanels.map(p => p.create), ...reg.combatRules);
  const mentionedByCode = (id: string) => spawnSrc.has(id);

  // ---- civilizaciones: contenido propio
  const civContent = (civ: string) => ({
    units: [...reg.units.values()].filter(u => u.civs?.includes(civ)),
    buildings: [...reg.buildings.values()].filter(b => b.civs?.includes(civ)),
    techs: [...reg.techs.values()].filter(t => t.civs?.includes(civ)),
  });
  /** ¿Hay alguna civilización que cumpla ambas restricciones? (vacío = todas) */
  const civsOverlap = (a?: string[], b?: string[]) => !a?.length || !b?.length || a.some(x => b.includes(x));

  const push = (it: Omit<CatItem, 'key' | 'state' | 'hints' | 'mod' | 'links'> & { hints?: string[]; links?: string[] }) => {
    const key = `${it.type}:${it.id}`;
    items.push({ ...it, key, mod: modOf(key), hints: it.hints ?? [], links: it.links ?? [], state: it.missing.length ? 'unused' : 'ok' });
  };
  const artOf = (t: 'unit' | 'building' | 'resource', id: string): CatItem['art'] => art.has(`${t}:${id}`) ? 'imagen' : 'procedural';

  // ================================================================ edificios
  const aiBuilds = new Set<string>();
  for (const b of reg.buildings.values()) {
    const does: string[] = [], missing: string[] = [], hints: string[] = [];
    const tr = trainedBy.get(b.id) ?? [], rs = researchedBy.get(b.id) ?? [];
    if (tr.length) does.push(`Entrena: ${list(tr.map(u => u.name))}`);
    if (rs.length) does.push(`Investiga ${rs.length} tecnología${rs.length > 1 ? 's' : ''}`);
    if (b.dropSite?.length) does.push(`Depósito de ${b.dropSite.map(resName).join(', ')}`);
    if (b.gatherable) does.push(`Fuente renovable de ${resName(b.gatherable.resource)}`);
    if (b.popProvided) does.push(`Aloja +${b.popProvided} población`);
    if (b.shelter) does.push(`Refugio (${b.shelter.capacity}) para ${b.shelter.classes.join('/')}`);
    if (b.walkway) does.push(`Paso de ronda (${b.walkway.capacity}) para tiradores ${b.walkway.classes.join('/')}`);
    if ((b.attack ?? 0) > 0) does.push('Defensa: dispara a los enemigos');
    if (b.classes.includes('townCenter') || b.id === reg.setup.townCenter) does.push('Centro urbano: punto de partida');
    if (b.los >= 12) does.push(`Gran visión (${b.los})`);
    if (requiredBy.get(b.id)?.length) does.push(`Requisito de: ${list(requiredBy.get(b.id)!)}`);
    if (mentionedByCode(b.id)) does.push('Lo usa el código de un mod');
    if (!does.length) missing.push('No entrena, no investiga, no es depósito ni refugio, no aloja, no ataca y nada lo pide como requisito.');
    if (!reg.sprites.has(b.sprite)) missing.push(`Su sprite «${b.sprite}» no está registrado.`);
    for (const c of b.civs ?? []) if (!reg.civs.has(c)) missing.push(`Es de la civilización «${c}», que no existe.`);
    if (b.age > lastAge) missing.push('Su edad no existe.');
    if (tr.length && !tr.some(u => civsOverlap(u.civs, b.civs))) hints.push('Ninguna de sus unidades es de sus civilizaciones.');
    const ai = aiSrc.has(b.id)
      || b.classes.includes('townCenter')
      || (!b.civs && ((b.dropSite?.length ?? 0) > 0 || (b.popProvided ?? 0) > 0 && b.category === 'economy' || b.gatherable?.resource === 'food'))
      || [...reg.units.values()].some(u => u.wildlife?.livestock && u.trainedAt.includes(b.id));
    if (ai) aiBuilds.add(b.id);
    else hints.push('La IA no lo construye.');
    push({ type: 'building', id: b.id, name: b.name, icon: b.icon, description: b.description, age: b.age, ageName: ageName(b.age), civs: b.civs ?? [], cost: b.cost, does, missing, hints, ai, art: artOf('building', b.id) });
  }

  // ================================================================ unidades
  const starting = new Set(reg.setup.startingUnits.map(s => s.unit));
  const wild = new Set((reg.setup.wildlife ?? []).map(w => w.unit));
  for (const u of reg.units.values()) {
    const does: string[] = [], missing: string[] = [], hints: string[] = [];
    const places = u.trainedAt.filter(b => reg.buildings.has(b));
    const how: string[] = [];
    if (places.length) how.push(`Se entrena en ${list(places.map(bldName))}`);
    if (upgradeFrom.has(u.id)) how.push(`Mejora de ${unitName(upgradeFrom.get(u.id)!)}`);
    if (starting.has(u.id)) how.push('Unidad inicial');
    if (wild.has(u.id)) how.push('Aparece en el mapa');
    if (mentionedByCode(u.id) || mapSrc.has(u.id)) how.push('La crea el código de un mod o del mapa');
    does.push(...how);
    if ((u.attack ?? 0) > 0) does.push(`Ataca (${u.attack}${u.range && u.range >= 1 ? `, alcance ${u.range}` : ''})`);
    if (u.gatherer) does.push('Recolecta');
    if (u.builder) does.push('Construye');
    if (u.aura) does.push('Da un aura a las tropas cercanas');
    if (u.autoExplore) does.push('Explora sola');
    if (u.hunting) does.push('Caza');
    if (u.flying) does.push('Vuela');
    if (u.wildlife) does.push(`Animal (${u.wildlife.behavior})`);
    if (!how.length) missing.push(u.trainedAt.length ? `Se entrena en ${list(u.trainedAt)}, que no existe${u.trainedAt.length > 1 ? 'n' : ''}, y nada más la crea.` : 'No se entrena en ningún edificio y nada la crea ni la mejora.');
    else if (places.length && !places.some(b => civsOverlap(u.civs, reg.buildings.get(b)?.civs))) missing.push('Sus civilizaciones no tienen ninguno de los edificios que la entrenan.');
    if (!does.some(d => /^(Ataca|Recolecta|Construye|Da un aura|Explora|Caza|Vuela|Animal)/.test(d)) && !u.maxAlive) missing.push('No ataca, no recolecta, no construye y no tiene habilidad: solo ocupa población.');
    if (!reg.sprites.has(u.sprite)) missing.push(`Su sprite «${u.sprite}» no está registrado.`);
    for (const c of u.civs ?? []) if (!reg.civs.has(c)) missing.push(`Es de la civilización «${c}», que no existe.`);
    for (const t of u.requiresTechs ?? []) if (!reg.techs.has(t)) missing.push(`Pide la tecnología «${t}», que no existe.`);
    let ai: boolean | null = null;
    if (places.length || upgradeFrom.has(u.id)) {
      ai = aiSrc.has(u.id)
        || (!!u.gatherer && u.trainedAt.some(b => reg.buildings.get(b)?.classes.includes('townCenter')))
        || (!u.gatherer && (u.attack ?? 0) > 0 && !u.wildlife)
        || !!u.wildlife?.livestock;
      if (!ai) hints.push('La IA no la entrena.');
      else if (places.length && !places.some(b => aiBuilds.has(b))) { ai = false; hints.push('La IA no construye ningún edificio que la entrene.'); }
    }
    push({ type: 'unit', id: u.id, name: u.name, icon: u.icon, description: u.description, age: u.age, ageName: ageName(u.age), civs: u.civs ?? [], cost: u.cost, does: does.filter(Boolean), missing, hints, ai, art: artOf('unit', u.id) });
  }

  // ================================================================ tecnologías
  const matches = (kind: 'unit' | 'building' | 'tech' | undefined, t: { ids?: string[]; classes?: string[]; kind?: string }) => {
    const k = t.kind ?? kind;
    const pool: { id: string; classes?: string[] }[] = [
      ...(k !== 'building' && k !== 'tech' ? [...reg.units.values()] : []),
      ...(k !== 'unit' && k !== 'tech' ? [...reg.buildings.values()] : []),
      ...(k === 'tech' ? [...reg.techs.values()] : []),
    ];
    return pool.filter(d => (!t.ids || t.ids.includes(d.id)) && (!t.classes || t.classes.some(c => d.classes?.includes(c))));
  };
  const relevant = (d: any, stat: string): boolean => {
    switch (stat) {
      case 'attack': case 'reloadTime': return (d.attack ?? 0) > 0;
      case 'range': return (d.range ?? 0) >= 1;
      case 'popProvided': return (d.popProvided ?? 0) > 0;
      case 'carryCapacity': return !!d.gatherer;
      case 'speed': case 'trainTime': return d.kind === 'unit';
      case 'buildTime': return d.kind === 'building';
      default: return true;
    }
  };
  for (const t of reg.techs.values()) {
    const does: string[] = [], missing: string[] = [], hints: string[] = [];
    if (t.setsAge !== undefined) does.push(`Sube a la edad: ${ageName(t.setsAge)}`);
    const gates = [...reg.units.values()].filter(u => u.requiresTechs?.includes(t.id)).map(u => u.name);
    if (gates.length) does.push(`Desbloquea: ${list(gates)}`);
    if (!t.effects.length && t.setsAge === undefined && !gates.length) missing.push('No tiene efectos.');
    t.effects.forEach((e, i) => {
      const n = `Efecto ${i + 1}`;
      switch (e.type) {
        case 'stat': {
          const hit = matches(undefined, e.target).filter(d => relevant(d, e.stat));
          if (!hit.length) missing.push(`${n} (${e.stat}) no afecta a ninguna unidad ni edificio${e.target.classes ? ` de clase ${e.target.classes.join('/')}` : ''}.`);
          else does.push(`${e.stat} ${e.op === 'mul' ? '×' + e.value : e.op === 'add' ? (e.value >= 0 ? '+' : '') + e.value : '=' + e.value}: ${list(hit.map(d => d.id), 3)}`);
          break;
        }
        case 'cost': {
          const hit = matches(undefined, e.target);
          if (!hit.length) missing.push(`${n} (coste) no afecta a nada.`);
          else does.push(`Cambia el coste de ${list(hit.map(d => d.id), 3)}`);
          break;
        }
        case 'gatherRate':
          if (e.resource !== '*' && !reg.resources.has(e.resource)) missing.push(`${n}: el recurso «${e.resource}» no existe.`);
          else if (e.resource !== '*' && ![...reg.resourceNodes.values()].some(x => x.resource === e.resource) && ![...reg.buildings.values()].some(b => b.gatherable?.resource === e.resource)) missing.push(`${n}: nada produce ${resName(e.resource)}.`);
          else does.push(`Recolección de ${e.resource === '*' ? 'todo' : resName(e.resource)} ${e.op === 'mul' ? '×' + e.value : '+' + e.value}`);
          break;
        case 'gatherYield':
          if (!e.nodes.every(x => reg.resourceNodes.has(x)) || !reg.resources.has(e.resource)) missing.push(`${n}: nodo o recurso inexistente.`);
          else does.push(`Recolectar ${list(e.nodes)} da además ${resName(e.resource)}`);
          break;
        case 'grant':
          if (!costKeys(e.resources).length) missing.push(`${n}: no regala nada.`);
          else does.push('Regala recursos');
          break;
        case 'upgrade':
          if (e.from === e.to) missing.push(`${n}: mejora una unidad en sí misma.`);
          else does.push(`Mejora ${unitName(e.from)} → ${unitName(e.to)}`);
          break;
        case 'custom': does.push('Efecto propio (código)'); break;
      }
    });
    const lab = reg.buildings.get(t.researchedAt);
    if (lab && !civsOverlap(t.civs, lab.civs)) missing.push(`Se investiga en ${lab.name}, que no tienen sus civilizaciones.`);
    for (const c of t.civs ?? []) if (!reg.civs.has(c)) missing.push(`Es de la civilización «${c}», que no existe.`);
    if (t.age > lastAge) missing.push('Su edad no existe.');
    const ai = !!lab && (aiBuilds.has(lab.id) || aiSrc.has(t.id)) ? (t.aiWeight ? true : true) : false;
    if (!ai) hints.push(`La IA no la investiga: no construye ${lab?.name ?? t.researchedAt}.`);
    push({ type: 'tech', id: t.id, name: t.name, icon: t.icon, description: t.description, age: t.age, ageName: ageName(t.age), civs: t.civs ?? [], cost: t.cost, does, missing, hints, ai, art: '—' });
  }

  // ================================================================ recursos y nodos
  const produced = (r: string) => [
    ...[...reg.resourceNodes.values()].filter(n => n.resource === r).map(n => n.name),
    ...[...reg.buildings.values()].filter(b => b.gatherable?.resource === r).map(b => b.name),
    ...[...reg.techs.values()].filter(t => t.effects.some(e => (e.type === 'grant' && (e.resources[r] ?? 0) > 0) || (e.type === 'gatherYield' && e.resource === r))).map(t => t.name),
    ...(literals(...[...reg.powers.values()].map(p => p.apply)).has(r) ? ['un poder'] : []),
  ];
  for (const r of reg.resources.values()) {
    const from = produced(r.id), uses = spent.get(r.id) ?? [];
    const does: string[] = [];
    const missing: string[] = [];
    if (from.length) does.push(`Lo producen: ${list(from)}`); else missing.push('Nada lo produce (ningún nodo, granja, tecnología ni poder).');
    if (uses.length) does.push(`Lo gastan ${uses.length} elementos (${list(uses, 3)})`); else missing.push('Nada lo gasta: ningún coste lo usa.');
    const deposits = [...reg.buildings.values()].filter(b => b.dropSite?.includes(r.id));
    if (from.length && !deposits.length && !reg.buildings.get(reg.setup.townCenter)?.dropSite?.includes(r.id)) missing.push('Se produce pero ningún edificio lo admite como depósito.');
    push({ type: 'resource', id: r.id, name: r.name, icon: r.icon, description: `Recurso. Al empezar: ${r.start.low}/${r.start.standard}/${r.start.high}.${r.minAge ? ` Se muestra desde ${ageName(r.minAge)}.` : ''}`, age: r.minAge, ageName: r.minAge !== undefined ? ageName(r.minAge) : undefined, civs: [], cost: {}, does, missing, ai: null, art: '—' });
  }
  const carcasses = new Set([...reg.units.values()].map(u => u.wildlife?.carcass).filter(Boolean) as string[]);
  const baseNodes = new Set(reg.setup.baseResources.map(b => b.node));
  for (const n of reg.resourceNodes.values()) {
    const does: string[] = [], missing: string[] = [];
    const placed = baseNodes.has(n.id) || mapSrc.has(n.id) || carcasses.has(n.id) || mentionedByCode(n.id);
    if (baseNodes.has(n.id)) does.push('Se reparte junto a cada base');
    else if (carcasses.has(n.id)) does.push('Cadáver de un animal');
    else if (placed) does.push('Lo coloca un generador de mapas');
    else missing.push('Ningún generador de mapas ni animal lo coloca.');
    if (reg.resources.has(n.resource)) does.push(`Da ${n.amount} de ${resName(n.resource)}`); else missing.push(`Da «${n.resource}», que no es un recurso.`);
    if (!reg.buildings.get(reg.setup.townCenter)?.dropSite?.includes(n.resource) && ![...reg.buildings.values()].some(b => b.dropSite?.includes(n.resource))) missing.push(`Ningún edificio admite ${resName(n.resource)}.`);
    if (!reg.sprites.has(n.sprite)) missing.push(`Su sprite «${n.sprite}» no está registrado.`);
    push({ type: 'node', id: n.id, name: n.name, icon: n.icon, description: `Nodo de ${resName(n.resource)} (${n.amount}).`, civs: [], cost: {}, does, missing, ai: null, art: artOf('resource', n.id) });
  }

  // ================================================================ poderes, civilizaciones, victorias, terrenos
  const powerAI = literals(...reg.aiPlugins.map(p => p.think));
  for (const w of reg.powers.values()) {
    const does = [`Disponible desde ${ageName(w.minAge)}${w.maxAge !== undefined ? ` hasta ${ageName(w.maxAge)}` : ''}`, `Enfriamiento ${w.cooldown} s`];
    if (w.target === 'point') does.push('Se lanza sobre un punto del mapa');
    const missing: string[] = [], hints: string[] = [];
    for (const c of w.civs ?? []) if (!reg.civs.has(c)) missing.push(`Es de la civilización «${c}», que no existe.`);
    if (w.minAge > lastAge || (w.maxAge !== undefined && w.maxAge < w.minAge)) missing.push('Nunca está disponible: su rango de edades no existe.');
    for (const r of costKeys(w.cost ?? {})) if (!reg.resources.has(r)) missing.push(`Cuesta «${r}», que no es un recurso.`);
    if (typeof w.apply !== 'function') missing.push('No tiene efecto (apply).');
    const ai = powerAI.has(w.id);
    if (!ai) hints.push('La IA no lo usa.');
    push({ type: 'power', id: w.id, name: w.name, icon: w.icon, description: w.description, age: w.minAge, ageName: ageName(w.minAge), civs: w.civs ?? [], cost: w.cost ?? {}, does, missing, hints, ai, art: '—' });
  }
  for (const c of reg.civs.values()) {
    const own = civContent(c.id);
    const does: string[] = [], missing: string[] = [], hints: string[] = [];
    if (c.bonuses.length) does.push(`${c.bonuses.length} bonos permanentes`);
    const eras = Object.keys(c.eras ?? {}).map(Number);
    if (eras.length) does.push(`Identidad por eras: ${eras.map(ageName).join(', ')}`);
    if (own.units.length) does.push(`Unidades propias: ${list(own.units.map(u => u.name))}`);
    if (own.buildings.length) does.push(`Edificios propios: ${list(own.buildings.map(b => b.name))}`);
    if (own.techs.length) does.push(`Tecnologías propias: ${own.techs.length}`);
    const pw = [...reg.powers.values()].filter(p => p.civs?.includes(c.id));
    if (pw.length) does.push(`Poderes: ${list(pw.map(p => p.name))}`);
    if (!c.bonuses.length && !eras.length) missing.push('No tiene bonos ni identidad por eras.');
    if (!own.units.length && !own.buildings.length && !own.techs.length) hints.push('No tiene contenido propio (ni unidades, ni edificios, ni tecnologías).');
    if (eras.length && Math.max(...eras) < lastAge) hints.push(`Su identidad solo llega a ${ageName(Math.max(...eras))}; faltan eras hasta ${ageName(lastAge)}.`);
    push({ type: 'civ', id: c.id, name: c.name, icon: '🚩', description: c.description, civs: [c.id], cost: {}, does, missing, hints, ai: null, art: '—' });
  }
  for (const v of reg.victories.values()) {
    push({ type: 'victory', id: v.id, name: v.name, icon: '🏆', description: v.description, civs: [], cost: {}, does: ['Se puede elegir al preparar la partida'], missing: typeof v.isDefeated === 'function' ? [] : ['No tiene condición de derrota.'], ai: null, art: '—' });
  }
  const nodeGround = new Set([...reg.resourceNodes.values()].map(n => n.groundTerrain).filter(Boolean) as string[]);
  const terrainUsed = (id: string) => mapSrc.has(id) || nodeGround.has(id) || literals(...[...reg.mapTypes.values()].map(m => m.generate)).has(id);
  for (const t of reg.terrains) {
    const does = [t.walkable ? 'Se puede caminar' : 'Intransitable', t.buildable ? 'Se puede construir' : 'No se puede construir'];
    if (t.water) does.push('Agua animada');
    push({ type: 'terrain', id: t.id, name: t.name, icon: '🗺️', description: `Terreno (textura ${t.pattern ?? t.id}).`, civs: [], cost: {}, does, missing: terrainUsed(t.id) ? [] : ['Ningún generador de mapas lo pinta.'], ai: null, art: '—' });
  }

  // ================================================================ motor y mods
  const engine = (id: string, name: string, desc: string, does: string[]) =>
    push({ type: 'engine', id, name, icon: '⚙️', description: desc, civs: [], cost: {}, does, missing: [], ai: null, art: '—' });
  for (const k of reg.orders.keys()) engine(`order-${k}`, `Orden «${k}»`, 'Orden de unidad con su manejador.', ['Orden de unidad']);
  for (const s of reg.systems) engine(`system-${s.id}`, `Sistema «${s.id}»`, `Se ejecuta cada tick (prioridad ${s.priority}).`, ['Sistema de la simulación']);
  for (const k of reg.netCommands.keys()) engine(`net-${k}`, `Orden de red «${k}»`, 'Orden de jugador propia de un mod.', ['Orden de jugador']);
  for (const p of reg.aiPlugins) engine(`ai-${p.id}`, `IA: ${p.id}`, 'Extensión de la IA.', ['Extensión de la IA']);
  for (const p of reg.hudPanels) engine(`panel-${p.id}`, `Panel «${p.id}»`, 'Panel de interfaz de un mod.', ['Panel de interfaz']);

  // ================================================================ comercio
  const tradeRx = /comerci|mercad|caravan|\btrade\b|market|arancel|monopolio|puerto comercial|tributo|embajad|diplom|esp[ií]a|espionaj/i;
  const mentions = items
    .filter(i => ['unit', 'building', 'tech', 'power', 'civ'].includes(i.type) && tradeRx.test(`${i.name} ${i.description}`))
    .map(i => ({ key: i.key, name: i.name, text: i.description }));
  const infraRx = /trade|comerc|market|mercad|caravan|diplom|embass|embaj|spy|espi/i;
  const infrastructure = items.filter(i => i.type === 'engine' && infraRx.test(i.id)).map(i => i.name);
  const codeIds = [...reg.orders.keys(), ...reg.systems.map(s => s.id), ...reg.netCommands.keys(), ...reg.powers.keys()].join(' ');

  // ================================================================ implicaciones y aplicaciones
  const linkTo = new Map(items.map(i => [i.key, i]));
  const addLink = (key: string, text: string) => linkTo.get(key)?.links.push(text);
  for (const b of reg.buildings.values()) {
    const tr = trainedBy.get(b.id) ?? [], rs = researchedBy.get(b.id) ?? [];
    if (tr.length) addLink(`building:${b.id}`, `Sin él no se pueden entrenar: ${list(tr.map(u => u.name), 5)}.`);
    if (rs.length) addLink(`building:${b.id}`, `Aquí se investigan ${rs.length} mejoras (hasta ${ageName(Math.max(...rs.map(t => t.age)))}).`);
    for (const r of b.requiresBuildings ?? []) addLink(`building:${b.id}`, `Para construirlo hace falta ${bldName(r)}.`);
    if (b.maxAlive) addLink(`building:${b.id}`, `Solo se puede tener ${b.maxAlive} a la vez.`);
    if (b.dropSite?.length) addLink(`building:${b.id}`, `Acorta el trayecto de los aldeanos que recogen ${b.dropSite.map(resName).join(', ')}: conviene construirlo junto a los nodos.`);
    if ((b.popProvided ?? 0) > 0) addLink(`building:${b.id}`, 'Sube el límite de población: sin él el ejército y la economía no crecen.');
  }
  for (const u of reg.units.values()) {
    const k = `unit:${u.id}`;
    if (upgradeFrom.has(u.id)) addLink(k, `Se consigue investigando la mejora de ${unitName(upgradeFrom.get(u.id)!)}.`);
    const up = [...reg.techs.values()].flatMap(t => t.effects.filter(e => e.type === 'upgrade' && e.from === u.id).map(e => (e as any).to as string));
    if (up.length) addLink(k, `Se puede mejorar a ${up.map(unitName).join(', ')}.`);
    if (u.bonus?.length) addLink(k, `Hace daño extra contra: ${u.bonus.map(x => `${x.vs} (+${x.amount})`).join(', ')}.`);
    const counters = [...reg.units.values()].filter(o => o.bonus?.some(x => u.classes.includes(x.vs)));
    if (counters.length) addLink(k, `Lo contrarrestan: ${list(counters.map(o => o.name), 4)}.`);
    if (u.maxAlive) addLink(k, `Máximo ${u.maxAlive} vivo${u.maxAlive > 1 ? 's' : ''} a la vez${u.retrainCooldown ? `; si cae, ${u.retrainCooldown} s de espera` : ''}.`);
    if (u.pop > 1) addLink(k, `Ocupa ${u.pop} de población.`);
  }
  for (const t of reg.techs.values()) {
    const k = `tech:${t.id}`;
    for (const r of t.requiresTechs ?? []) addLink(k, `Requiere antes: ${reg.techs.get(r)?.name ?? r}.`);
    const next = [...reg.techs.values()].filter(o => o.requiresTechs?.includes(t.id)).map(o => o.name);
    if (next.length) addLink(k, `Desbloquea: ${list(next, 4)}.`);
    const units = [...reg.units.values()].filter(u => u.requiresTechs?.includes(t.id)).map(u => u.name);
    if (units.length) addLink(k, `Permite entrenar: ${list(units, 4)}.`);
    if (t.excludes?.length) addLink(k, `Doctrina excluyente: impide ${t.excludes.map(x => reg.techs.get(x)?.name ?? x).join(', ')}.`);
    if (t.setsAge !== undefined) addLink(k, 'Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización.');
  }
  for (const r of reg.resources.values()) {
    const k = `resource:${r.id}`;
    const sinks = (spent.get(r.id) ?? []).length;
    if (sinks) addLink(k, `Limita ${sinks} elementos del juego: es una restricción de ritmo y de estrategia.`);
    if (r.minAge) addLink(k, `Obliga a llegar a ${ageName(r.minAge)} para empezar a recogerlo.`);
  }
  for (const w of reg.powers.values()) {
    addLink(`power:${w.id}`, `Se lanza con la orden de mod «power»; el enfriamiento es de ${w.cooldown} s.`);
    if (w.civs?.length) addLink(`power:${w.id}`, `Solo para: ${w.civs.map(civName).join(', ')}.`);
  }
  for (const c of reg.civs.values()) {
    const own = civContent(c.id);
    if (own.units.length) addLink(`civ:${c.id}`, `Sus unidades únicas definen su estilo de ejército: ${list(own.units.map(u => u.name), 4)}.`);
    if (c.eras) addLink(`civ:${c.id}`, 'Cambia de nombre y de bonos con la era: la partida larga cuenta su historia.');
  }

  // ================================================================ comparativa de civilizaciones
  const ROLES: [string, (u: UnitDef) => boolean][] = [
    ['infantería', u => u.classes.includes('infantry')], ['arqueros', u => u.classes.includes('archer')],
    ['caballería', u => u.classes.includes('cavalry')], ['asedio', u => u.classes.includes('siege')],
    ['armas de fuego', u => u.classes.includes('firearm')], ['aire', u => !!u.flying],
  ];
  const civReports: CivReport[] = [...reg.civs.values()].map(c => {
    const mine = <T extends { civs?: string[] }>(d: T) => !d.civs?.length || d.civs.includes(c.id);
    const own = civContent(c.id);
    const units = [...reg.units.values()].filter(u => mine(u) && !u.wildlife && u.trainedAt.length);
    const ages: CivAgeRow[] = reg.ages.map(a => {
      const us = units.filter(u => u.age <= a.index);
      const roles: Record<string, number> = {};
      for (const [r, f] of ROLES) { const n = us.filter(f).length; if (n) roles[r] = n; }
      let best: CivAgeRow['best'] = null;
      for (const u of us) {
        if ((u.attack ?? 0) <= 0 || u.gatherer) continue;
        const score = Math.round(u.hp * (u.attack ?? 0) / (u.reloadTime || 1));
        if (!best || score > best.score) best = { id: u.id, name: u.name, score };
      }
      return {
        age: a.index, ageName: a.name, units: us.length, roles, best,
        buildings: [...reg.buildings.values()].filter(b => mine(b) && b.age <= a.index).length,
        techs: [...reg.techs.values()].filter(t => mine(t) && t.age <= a.index).length,
      };
    });
    return {
      id: c.id, name: c.name, bonusText: c.bonusText,
      eras: Object.entries(c.eras ?? {}).map(([i, e]) => ({ age: Number(i), name: e.name })).sort((a, b) => a.age - b.age),
      powers: [...reg.powers.values()].filter(p => p.civs?.includes(c.id)).map(p => p.name),
      unique: { units: own.units.map(u => u.name), buildings: own.buildings.map(b => b.name), techs: own.techs.map(t => t.name) },
      ages,
    };
  });

  // ================================================================ notas manuales
  const staleNotes: string[] = [], orphanNotes: string[] = [];
  const byKey = new Map(items.map(i => [i.key, i]));
  for (const [key, note] of Object.entries(notes)) {
    const it = byKey.get(key);
    if (!it) { orphanNotes.push(key); continue; }
    if (note.until && new RegExp(note.until, 'i').test(codeIds)) { staleNotes.push(key); continue; }
    it.note = note;
    it.state = note.status;
  }
  return { items, civReports, trade: { mentions, infrastructure }, staleNotes, orphanNotes };
}
