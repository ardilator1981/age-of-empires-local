/** Carga lo que necesita la auditoría del catálogo desde el disco (la usan scripts/catalog.ts y tests/catalog.test.ts). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Registry } from '../src/core/Registry';
import type { GameMod } from '../src/core/types';
import { auditCatalog, type CatNotes } from '../src/catalog/audit';
import { renderCatalogMarkdown } from '../src/catalog/markdown';
import { ART } from '../src/mods/art';

export const NOTES_FILE = 'docs/catalogo-notas.json';
export const DEV_FILE = 'docs/catalogo-desarrollos.md';
export const OUT_FILE = 'docs/catalogo.md';

export function catalogMarkdown(reg: Registry, mods: GameMod[], root = resolve('.')): string {
  const notes: CatNotes = JSON.parse(readFileSync(resolve(root, NOTES_FILE), 'utf8'));
  const developments = readFileSync(resolve(root, DEV_FILE), 'utf8');
  const art = new Set(ART.map(a => `${a.kind}:${a.id}`));
  return renderCatalogMarkdown(reg, auditCatalog({ reg, mods, art, notes }), developments);
}
