import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART } from '../src/mods/art';
import { buildCatalog, loadDisk, promptFor, renderMarkdown } from '../scripts/artTodoLib';
import { warReg } from './helpers';

/** La lista de arte pendiente (art-src/PENDIENTES.md): ver `npm run art-todo`. */
const items = buildCatalog(warReg, ART, loadDisk());

describe('lista de arte pendiente', () => {
  it('incluye todo el contenido registrado', () => {
    const has = (kind: string, id: string) => items.some(i => i.kind === kind && i.id === id);
    for (const u of warReg.units.keys()) expect(has('unidad', u), `unidad ${u}`).toBe(true);
    for (const b of warReg.buildings.keys()) expect(has('edificio', b), `edificio ${b}`).toBe(true);
    for (const r of warReg.resourceNodes.keys()) expect(has('recurso', r), `recurso ${r}`).toBe(true);
    for (const t of warReg.terrains) expect(has('terreno', t.id), `terreno ${t.id}`).toBe(true);
    for (const t of warReg.techs.keys()) expect(has('interfaz', t), `tecnología ${t}`).toBe(true);
  });

  it('las hojas declaradas en ART apuntan a contenido que existe', () => {
    for (const a of ART) {
      const ok = a.kind === 'unit' ? warReg.units.has(a.id) : a.kind === 'building' ? warReg.buildings.has(a.id) : warReg.resourceNodes.has(a.id);
      expect(ok, `${a.kind} ${a.id} de ART no existe`).toBe(true);
    }
  });

  it('cada elemento pendiente tiene plantilla de prompt', () => {
    for (const i of items.filter(i => i.status !== 'hecho')) {
      for (const k of i.prompt.split(' ')) expect(promptFor(k), `${i.kind} ${i.id}: sin plantilla "${k}"`).not.toBeNull();
    }
  });

  it('art-src/PENDIENTES.md está al día (si falla: npm run art-todo)', () => {
    const file = readFileSync('art-src/PENDIENTES.md', 'utf8');
    expect(file).toBe(renderMarkdown(items));
  });
});
