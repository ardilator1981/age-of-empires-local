/**
 * Genera docs/catalogo.md: todo el contenido del juego con su estado de lógica (qué está integrado y qué no).
 * Uso: npm run catalog            escribe el archivo
 *      npm run catalog -- --check sale con error si el archivo está desactualizado
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRegistry } from '../src/core/Registry';
import { ALL_MODS } from '../src/mods';
import { catalogMarkdown, OUT_FILE } from './catalogLib';

const md = catalogMarkdown(buildRegistry(ALL_MODS), ALL_MODS);
const file = resolve(OUT_FILE);
if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(file, 'utf8'); } catch { /* no existe */ }
  if (cur !== md) { console.error(`${OUT_FILE} está desactualizado: ejecuta npm run catalog`); process.exit(1); }
  console.log(`${OUT_FILE} al día`);
} else {
  writeFileSync(file, md);
  const open = md.split('\n').filter(l => /⚠ Sin usar \|/.test(l)).length;
  console.log(`${OUT_FILE} escrito`);
}
