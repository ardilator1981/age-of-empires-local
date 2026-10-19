#!/usr/bin/env node
/**
 * Genera (o regenera) todas las regiones reales de src/mods/real-maps/regions.json
 * llamando a scripts/real-map.mjs con los mismos parámetros. Reproducible.
 *
 *   npm run regions                 # genera las que falten
 *   npm run regions -- --all        # regenera todas
 *   npm run regions -- --only luxor # solo una
 *
 * Para añadir una región nueva: añade una entrada a regions.json (id, nombre, país,
 * categoría, lat/lon del centro, lado en km, bioma y descripción) y ejecuta este script.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const regions = JSON.parse(readFileSync(join(ROOT, 'src/mods/real-maps/regions.json'), 'utf8'));
const args = process.argv.slice(2);
const all = args.includes('--all');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

let failed = 0;
for (const r of regions) {
  if (only && r.id !== only) continue;
  const out = join(ROOT, 'src/mods/real-maps/data', `${r.id}.json`);
  if (!all && !only && existsSync(out)) { console.log(`= ${r.id} ya existe (usa --all para regenerarla)`); continue; }
  console.log(`\n> ${r.id}: ${r.name}`);
  const a = ['scripts/real-map.mjs', '--id', r.id, '--name', r.name, '--description', r.description,
    '--center', `${r.lat},${r.lon}`, '--size-km', String(r.sizeKm ?? 8), '--biome', r.biome ?? 'temperate'];
  if (r.snowLine) a.push('--snow-line', String(r.snowLine));
  if (r.starts) a.push('--starts', r.starts.join(','));
  const res = spawnSync(process.execPath, a, { cwd: ROOT, stdio: 'inherit' });
  if (res.status !== 0) { failed++; console.error(`! ${r.id} falló`); }
}
process.exit(failed ? 1 : 0);
