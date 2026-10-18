import type { CivDef } from '../../core/types';

export const civs: CivDef[] = [
  {
    id: 'britons', name: 'Británicos', description: 'Civilización de arqueros.',
    bonusText: ['Arqueros +1 de alcance', 'Centros urbanos cuestan -50% de madera', 'Unidad única: Arquero de tiro largo'],
    bonuses: [
      { type: 'stat', target: { classes: ['archer'], kind: 'unit' }, stat: 'range', op: 'add', value: 1 },
      { type: 'cost', target: { ids: ['townCenter'] }, resource: 'wood', op: 'mul', value: 0.5 },
    ],
  },
  {
    id: 'franks', name: 'Francos', description: 'Civilización de caballería.',
    bonusText: ['Caballería +20% de PV', 'Mejoras del molino gratis', 'Castillos -25% de coste', 'Unidad única: Lanzador de hachas'],
    bonuses: [
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.2 },
      { type: 'cost', target: { ids: ['horseCollar', 'heavyPlow'] }, resource: '*', op: 'mul', value: 0 },
      { type: 'cost', target: { ids: ['castle'] }, resource: '*', op: 'mul', value: 0.75 },
    ],
  },
  {
    id: 'goths', name: 'Godos', description: 'Civilización de infantería.',
    bonusText: ['Infantería -20% de coste', 'Infantería se entrena un 20% más rápido', 'Unidad única: Huscarle'],
    bonuses: [
      { type: 'cost', target: { classes: ['infantry'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.8 },
      { type: 'stat', target: { classes: ['infantry'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.8 },
    ],
  },
  {
    id: 'mongols', name: 'Mongoles', description: 'Civilización de arqueros a caballo.',
    bonusText: ['Exploradores +2 de visión', 'Caballería ligera +30% de PV', 'Mangudai disparan un 25% más rápido', 'Unidad única: Mangudai'],
    bonuses: [
      { type: 'stat', target: { ids: ['scoutCavalry', 'lightCavalry'] }, stat: 'los', op: 'add', value: 2 },
      { type: 'stat', target: { ids: ['lightCavalry'] }, stat: 'hp', op: 'mul', value: 1.3 },
      { type: 'stat', target: { ids: ['mangudai'] }, stat: 'reloadTime', op: 'mul', value: 0.8 },
    ],
  },
];
