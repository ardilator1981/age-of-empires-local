import type { CivDef } from '../../core/types';

export const civs: CivDef[] = [
  {
    id: 'britain', name: 'Británicos', description: 'Civilización de arqueros. Línea británica: de los anglosajones a la Inglaterra Tudor (después, hacia Estados Unidos).',
    bonusText: ['Arqueros +1 de alcance', 'Centros urbanos cuestan -50% de madera', 'Unidad única: Arquero de tiro largo'],
    bonuses: [
      { type: 'stat', target: { classes: ['archer'], kind: 'unit' }, stat: 'range', op: 'add', value: 1 },
      { type: 'cost', target: { ids: ['townCenter'] }, resource: 'wood', op: 'mul', value: 0.5 },
    ],
    eras: {
      0: { name: 'Anglosajones', description: 'Alfredo de Wessex y los burhs fortificados.', bonuses: [], bonusText: [] },
      1: { name: 'Inglaterra normanda', description: 'Hastings, el Domesday Book y los castillos de piedra.', bonuses: [], bonusText: [] },
      2: { name: 'Inglaterra Plantagenet', description: 'El arco largo de Crécy y Agincourt.', bonuses: [], bonusText: [] },
      3: { name: 'Inglaterra Tudor', description: 'La marina real y las compañías con carta.', bonuses: [], bonusText: [] },
    },
  },
  {
    id: 'france', name: 'Francia', description: 'Civilización de caballería. Línea francesa: de los francos al Renacimiento.',
    bonusText: ['Caballería +20% de PV', 'Mejoras del molino gratis', 'Castillos -25% de coste', 'Unidad única: Lanzador de hachas'],
    bonuses: [
      { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.2 },
      { type: 'cost', target: { ids: ['horseCollar', 'heavyPlow'] }, resource: '*', op: 'mul', value: 0 },
      { type: 'cost', target: { ids: ['castle'] }, resource: '*', op: 'mul', value: 0.75 },
    ],
    eras: {
      0: { name: 'Francos', description: 'Merovingios y carolingios: el reino de guerreros y monjes.', bonuses: [], bonusText: [] },
      1: { name: 'Francia capeta', description: 'Caballería, cruzadas y catedrales góticas.', bonuses: [], bonusText: [] },
      2: { name: 'Francia medieval tardía', description: 'La guerra de los Cien Años y las compañías de ordenanza.', bonuses: [], bonusText: [] },
      3: { name: 'Renacimiento francés', description: 'Francisco I, los castillos de recreo y las guerras de religión.', bonuses: [], bonusText: [] },
    },
  },
  {
    id: 'rus', name: 'Rusia', description: 'Linaje eslavo oriental: defensa en profundidad, pieles de caza que se convierten en oro y masa tardía. Cambia de identidad con cada era.',
    bonusText: ['La caza da además oro (pieles)', 'Madera +10% de recolección', 'Unidad única: Druzhinnik (Edad Oscura)', 'Edificio único: Gorodishche'],
    bonuses: [
      { type: 'gatherYield', nodes: ['deerCarcass', 'boarCarcass'], resource: 'gold', ratio: 0.2 },
      { type: 'gatherRate', resource: 'wood', op: 'mul', value: 1.1 },
    ],
    eras: {
      0: {
        name: 'Eslavos orientales y Rus\' de Kiev',
        description: 'Comerciantes-guerreros de los ríos (s. IX–X): Oleg unifica Nóvgorod y Kiev hacia 882.',
        bonuses: [],
        bonusText: ['Unidad única: Druzhinnik, la guardia armada del príncipe', 'Edificio único: Gorodishche, poblado fortificado de madera y tierra'],
      },
      1: {
        name: 'Rus\' de Kiev cristiana',
        description: 'Principados hermanos que se disputan Kiev (bautismo de Vladimiro, 988; Yaroslav el Sabio).',
        bonuses: [
          { type: 'stat', target: { classes: ['tower'] }, stat: 'hp', op: 'mul', value: 1.2 },
          { type: 'cost', target: { ids: ['watchTower'] }, resource: '*', op: 'mul', value: 0.75 },
        ],
        bonusText: ['Torres +20% de PV; torre de vigilancia -25% de coste', 'Edificio único: Monasterio-fortaleza (refugio)', 'Tecnología única: Russkaya Pravda'],
      },
      2: {
        name: 'Principado de Moscú',
        description: 'Reunir las tierras mientras se paga el tributo a la Horda de Oro (Nevski, Kalitá, Kulikovo 1380).',
        bonuses: [
          { type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 },
          { type: 'cost', target: { ids: ['scoutCavalry', 'lightCavalry'] }, resource: '*', op: 'mul', value: 0.8 },
        ],
        bonusText: ['Recaudador de tributo: oro +10% de recolección', 'Caballería ligera -20% de coste', 'Unidad única: Hijo de boyardo', 'Edificio único: Kremlin de piedra'],
      },
      3: {
        name: 'Zarato ruso',
        description: 'Imperio terrestre y de frontera (Iván IV, coronado en 1547; Kazán 1552; Yermak cruza a Siberia desde 1581). Termina el tributo a la Horda.',
        replaces: [2],
        bonuses: [
          { type: 'cost', target: { ids: ['scoutCavalry', 'lightCavalry'] }, resource: '*', op: 'mul', value: 0.8 },
          { type: 'stat', target: { classes: ['tower'] }, stat: 'range', op: 'add', value: 1 },
          { type: 'gatherYield', nodes: ['deerCarcass', 'boarCarcass'], resource: 'gold', ratio: 0.1 },
        ],
        bonusText: ['Sustituye el tributo: ya no hay oro extra de recolección', 'Torres +1 de alcance', 'La caza da +10% más de oro', 'Unidades únicas: Strelets y Cosaco', 'Edificio único: Ostrog', 'Tecnología única: Marcha a Siberia'],
      },
    },
  },
];
