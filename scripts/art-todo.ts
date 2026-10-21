/**
 * Genera art-src/PENDIENTES.md: qué arte falta (o está sin animar) y el prompt para pedirlo.
 * Uso: npm run art-todo            escribe el archivo
 *      npm run art-todo -- --check sale con error si el archivo está desactualizado
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildRegistry } from '../src/core/Registry';
import { ALL_MODS } from '../src/mods';
import { ART } from '../src/mods/art';
import { buildCatalog, loadDisk, renderMarkdown } from './artTodoLib';

const reg = buildRegistry(ALL_MODS);
const md = renderMarkdown(buildCatalog(reg, ART, loadDisk()));
const file = resolve('art-src/PENDIENTES.md');
if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(file, 'utf8'); } catch { /* no existe */ }
  if (cur !== md) { console.error('art-src/PENDIENTES.md está desactualizado: ejecuta npm run art-todo'); process.exit(1); }
  console.log('art-src/PENDIENTES.md al día');
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, md);
  const left = md.split('\n').filter(l => l.includes('🔴') || l.includes('🟡')).length;
  console.log(`art-src/PENDIENTES.md escrito (${left} elementos con arte pendiente o sin animar)`);
}
