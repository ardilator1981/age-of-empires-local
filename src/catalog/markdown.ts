/** Informe en Markdown de la auditoría (docs/catalogo.md). Sin DOM. */
import type { CivAgeRow as CivReportAge } from './audit';
import { CAT_TYPES, STATE_LABEL, type CatalogResult, type CatItem } from './audit';
import type { Registry } from '../core/Registry';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const emoji = (i: CatItem) => (i.icon.startsWith('<') ? '' : i.icon + ' ');
const join = (xs: string[]) => xs.map(cell).join(' · ');

function costText(reg: Registry, c: CatItem['cost']): string {
  return Object.entries(c).filter(([, v]) => (v ?? 0) > 0).map(([r, v]) => `${v} ${(reg.resources.get(r)?.name ?? r).toLowerCase()}`).join(', ');
}

export function renderCatalogMarkdown(reg: Registry, res: CatalogResult, developments: string): string {
  const { items } = res;
  const count = (f: (i: CatItem) => boolean) => items.filter(f).length;
  const civs = (i: CatItem) => i.civs.length ? i.civs.map(c => reg.civs.get(c)?.name ?? c).join(', ') : 'todas';
  const out: string[] = [];
  out.push('# Catálogo de contenido', '',
    '> Generado por `npm run catalog` (`scripts/catalog.ts`); no lo edites a mano. Las anotaciones manuales van en `docs/catalogo-notas.json`',
    '> y la explicación de los desarrollos en `docs/catalogo-desarrollos.md`. El mismo cálculo alimenta la pantalla **Catálogo** del juego',
    '> (menú → 📚 Catálogo, o `?catalogo` en la URL).', '',
    '## Cómo leerlo', '',
    '- **Estado**: ✔ integrado (tiene lógica detrás) · ⚠ sin usar (le falta algo, ver «Qué le falta») · 🛠 en desarrollo / pendiente de una fase (anotado a mano) · 🎨 solo decorativo.',
    '- **Qué hace** y **Implicaciones**: se calculan de los datos (qué entrena, qué requiere, qué desbloquea, a quién contrarresta...).',
    '- **IA**: ✔ si la IA lo usa por sí sola; ✗ si nunca lo construye, entrena o lanza (aviso, no error: puede ser a propósito).',
    '- **Arte**: «imagen» si tiene hoja de sprites declarada en `src/mods/art`; «procedural» si se dibuja por código.', '');

  out.push('## Resumen', '', '| Tipo | Total | ✔ Integrado | ⚠ Sin usar | 🛠 En desarrollo | 🎨 Decorativo |', '| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const t of CAT_TYPES) {
    const n = (s?: string) => count(i => i.type === t.type && (!s || i.state === s));
    out.push(`| ${t.icon} ${t.label} | ${n()} | ${n('ok')} | ${n('unused')} | ${n('dev')} | ${n('deco')} |`);
  }
  out.push('');

  out.push('## Desarrollos, implicaciones y aplicaciones', '', developments.trim(), '');

  const orphans = items.filter(i => i.state !== 'ok');
  out.push('## Huérfanos y pendientes', '', orphans.length ? 'Todo lo que no está plenamente integrado, con lo que le falta.' : 'No hay elementos huérfanos.', '');
  if (orphans.length) {
    out.push('| Tipo | Elemento | Estado | Qué le falta / nota |', '| --- | --- | --- | --- |');
    for (const i of orphans) {
      const why = [...i.missing, ...(i.note ? [`**Nota${i.note.phase ? ` (fase ${i.note.phase})` : ''}:** ${i.note.text}`] : [])];
      out.push(`| ${CAT_TYPES.find(t => t.type === i.type)!.label} | ${emoji(i)}${cell(i.name)} (\`${i.id}\`) | ${STATE_LABEL[i.state]} | ${join(why)} |`);
    }
    out.push('');
  }

  const noAI = items.filter(i => i.ai === false);
  out.push('## Contenido que la IA nunca usa', '', noAI.length ? 'Un rival controlado por la IA no lo construye, entrena, investiga ni lanza: solo lo aprovecha un jugador humano. Conviene revisarlo al equilibrar civilizaciones.' : 'La IA usa todo lo que puede.', '');
  for (const t of CAT_TYPES) {
    const xs = noAI.filter(i => i.type === t.type);
    if (xs.length) out.push(`- **${t.label}** (${xs.length}): ${xs.map(i => `${cell(i.name)}${i.civs.length ? ` [${i.civs.map(c => reg.civs.get(c)?.name ?? c).join('/')}]` : ''}`).join(', ')}`);
  }
  out.push('');

  out.push('## Comercio, diplomacia y espionaje', '',
    'Qué dice hoy el contenido sobre comerciar (y temas afines) y qué infraestructura de juego hay detrás.', '',
    `**Infraestructura de motor encontrada** (órdenes, sistemas, órdenes de red, IA): ${res.trade.infrastructure.length ? res.trade.infrastructure.join(', ') : '**ninguna**. No hay orden ni sistema de comercio, rutas, relaciones con otras civilizaciones ni espionaje.'}`, '',
    res.trade.mentions.length ? '| Elemento | Qué dice | Estado |\n| --- | --- | --- |' : '', ...res.trade.mentions.map(m => {
      const it = items.find(i => i.key === m.key)!;
      return `| ${emoji(it)}${cell(it.name)} (${it.type}) | ${cell(m.text)} | ${STATE_LABEL[it.state]}${it.note ? ' — ' + cell(it.note.text) : ''} |`;
    }), '');

  out.push('## Comparativa entre civilizaciones', '',
    'Para revisar las diferencias, el equilibrio estratégico y la jugabilidad. Los recuentos son **acumulados** hasta cada edad e incluyen el contenido común más el propio de la civilización. «Mejor unidad» = la unidad militar con más vida × daño por segundo disponible (un índice grueso, no un simulador de combate).', '');
  const ageNames = res.civReports[0]?.ages.map(a => a.ageName) ?? [];
  for (const [label, pick] of [
    ['Unidades entrenables', (a: CivReportAge) => String(a.units)],
    ['Edificios', (a: CivReportAge) => String(a.buildings)],
    ['Tecnologías', (a: CivReportAge) => String(a.techs)],
    ['Mejor unidad militar (índice)', (a: CivReportAge) => a.best ? `${a.best.name} (${a.best.score})` : '—'],
  ] as [string, (a: CivReportAge) => string][]) {
    out.push(`### ${label}`, '', `| Civilización | ${ageNames.join(' | ')} |`, `| --- | ${ageNames.map(() => '---').join(' | ')} |`);
    for (const c of res.civReports) out.push(`| ${cell(c.name)} | ${c.ages.map(a => pick(a)).join(' | ')} |`);
    out.push('');
  }
  out.push('### Composición del ejército (en la última edad)', '', '| Civilización | Funciones |', '| --- | --- |');
  for (const c of res.civReports) out.push(`| ${cell(c.name)} | ${Object.entries(c.ages[c.ages.length - 1].roles).map(([r, n]) => `${r} ${n}`).join(' · ') || '—'} |`);
  out.push('', '### Identidad, contenido único y poderes', '', '| Civilización | Bonos | Identidad por eras | Unidades únicas | Edificios únicos | Tecnologías únicas | Poderes |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const c of res.civReports) out.push(`| ${cell(c.name)} | ${join(c.bonusText) || '—'} | ${join(c.eras.map(e => `${e.name}`)) || '—'} | ${join(c.unique.units) || '—'} | ${join(c.unique.buildings) || '—'} | ${join(c.unique.techs) || '—'} | ${join(c.powers) || '—'} |`);
  out.push('');

  if (res.staleNotes.length || res.orphanNotes.length) {
    out.push('## Avisos sobre las notas', '');
    if (res.staleNotes.length) out.push(`- Notas que ya no hacen falta (lo anotado existe ya; bórralas de \`docs/catalogo-notas.json\`): ${res.staleNotes.join(', ')}`);
    if (res.orphanNotes.length) out.push(`- Notas que apuntan a contenido que no existe: ${res.orphanNotes.join(', ')}`);
    out.push('');
  }

  for (const t of CAT_TYPES) {
    const rows = items.filter(i => i.type === t.type);
    out.push(`## ${t.icon} ${t.label} (${rows.length})`, '');
    out.push('| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const i of rows) {
      const why = [...i.missing, ...(i.note ? [`Nota: ${i.note.text}`] : []), ...i.hints];
      out.push(`| \`${i.id}\` | ${emoji(i)}${cell(i.name)} | ${i.mod} | ${i.ageName ?? '—'} | ${cell(civs(i))} | ${costText(reg, i.cost) || '—'} | ${STATE_LABEL[i.state]} | ${i.ai === null ? '—' : i.ai ? '✔' : '✗'} | ${i.art} | ${join(i.does) || '—'} | ${join(i.links) || '—'} | ${join(why) || '—'} |`);
    }
    out.push('');
  }
  return out.join('\n');
}
