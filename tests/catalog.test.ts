import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auditCatalog } from '../src/catalog/audit';
import { ALL_MODS } from '../src/mods';
import { ART } from '../src/mods/art';
import { catalogMarkdown, NOTES_FILE, OUT_FILE } from '../scripts/catalogLib';
import { warReg } from './helpers';

const notes = JSON.parse(readFileSync(NOTES_FILE, 'utf8'));
const res = auditCatalog({ reg: warReg, mods: ALL_MODS, art: new Set(ART.map(a => `${a.kind}:${a.id}`)), notes });

describe('catálogo de contenido', () => {
  it('incluye todo el contenido registrado', () => {
    const has = (k: string) => res.items.some(i => i.key === k);
    for (const u of warReg.units.keys()) expect(has(`unit:${u}`), u).toBe(true);
    for (const b of warReg.buildings.keys()) expect(has(`building:${b}`), b).toBe(true);
    for (const t of warReg.techs.keys()) expect(has(`tech:${t}`), t).toBe(true);
    for (const p of warReg.powers.keys()) expect(has(`power:${p}`), p).toBe(true);
    for (const c of warReg.civs.keys()) expect(has(`civ:${c}`), c).toBe(true);
  });

  it('las notas apuntan a contenido que existe', () => {
    expect(res.orphanNotes).toEqual([]);
  });

  it('detecta un edificio sin ninguna función', () => {
    const reg = warReg;
    reg.addBuilding({ ...reg.building('house'), id: '__vacio', name: 'Vacío', popProvided: 0 });
    try {
      const r = auditCatalog({ reg, mods: ALL_MODS, art: new Set() });
      expect(r.items.find(i => i.key === 'building:__vacio')?.state).toBe('unused');
    } finally { reg.buildings.delete('__vacio'); }
  });

  it('docs/catalogo.md está al día (si falla: npm run catalog)', () => {
    expect(readFileSync(OUT_FILE, 'utf8')).toBe(catalogMarkdown(warReg, ALL_MODS));
  });
});
