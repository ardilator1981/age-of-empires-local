import type { CivDef } from '../../core/types';
import { industrialLayers } from './civ-industrial';
import { persiaCiv } from './civ-persia';
import { ethiopiaCiv } from './civ-ethiopia';

const baseCivs: CivDef[] = [
  {
    id: 'britain', name: 'Británicos', description: 'Civilización de arqueros. Línea británica: de los anglosajones a la Inglaterra Tudor (después, hacia Estados Unidos).',
    bonusText: ['Arqueros +1 de alcance', 'Centros urbanos cuestan -50% de madera', 'Unidad única: Arquero de tiro largo'],
    bonuses: [
      { type: 'stat', target: { classes: ['archer'], kind: 'unit' }, stat: 'range', op: 'add', value: 1 },
      { type: 'cost', target: { ids: ['townCenter'] }, resource: 'wood', op: 'mul', value: 0.5 },
    ],
    eras: {
      0: {
        name: 'Anglosajones', description: 'Alfredo de Wessex (871–899), la red de burhs fortificados y la fyrd.',
        bonuses: [{ type: 'cost', target: { classes: ['tower', 'wall'], kind: 'building' }, resource: 'wood', op: 'mul', value: 0.75 }],
        bonusText: ['Torres, burhs y empalizadas -25% de madera', 'Unidad única: Fyrdman', 'Edificio único: Burh', 'Tecnología única: Reforma de Alfredo'],
      },
      1: {
        name: 'Inglaterra normanda', description: 'Hastings (1066), el Domesday Book y los castillos de piedra.',
        bonuses: [
          { type: 'cost', target: { ids: ['castle'] }, resource: '*', op: 'mul', value: 0.85 },
          { type: 'cost', target: { classes: ['cavalry'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.9 },
        ],
        bonusText: ['Castillos -15% de coste', 'Caballería -10% de comida', 'Unidad única: Caballero normando', 'Edificio único: Castillo de mota', 'Tecnología única: Domesday'],
      },
      2: {
        name: 'Inglaterra Plantagenet', description: 'El arco largo de Crécy (1346) y Agincourt (1415); Eduardo I y los castillos de Gales.',
        bonuses: [{ type: 'cost', target: { ids: ['townCenter'] }, resource: 'stone', op: 'mul', value: 0.8 }],
        bonusText: ['Centros urbanos -20% de piedra', 'Unidad única: Arquero de tiro largo', 'Edificio único: Castillo concéntrico', 'Tecnología única: Arqueros ingleses'],
      },
      3: {
        name: 'Inglaterra Tudor', description: 'La marina real y las compañías con carta (East India Company, 1600). Los barcos llegarán con el mar.',
        bonuses: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.05 }],
        bonusText: ['Compañías con carta real: oro +5% de recolección', 'Unidad única: Arcabucero Tudor', 'Tecnología única: Carta de compañía'],
      },
      4: {
        name: 'Gran Bretaña', description: 'Estado fiscal-militar (Unión de 1707, Banco de Inglaterra 1694, guerra de los Siete Años) y milicias de las Trece Colonias.',
        bonuses: [
          { type: 'cost', target: { ids: ['militia', 'manAtArms', 'longSwordsman', 'spearman', 'pikeman'] }, resource: 'food', op: 'mul', value: 0.8 },
          { type: 'stat', target: { classes: ['firearm'], kind: 'unit' }, stat: 'reloadTime', op: 'mul', value: 0.95 },
        ],
        bonusText: ['Milicia colonial: infantería sin pólvora -20% de comida', 'Armas de fuego recargan un 5% más rápido', 'Unidad única: Casaca roja', 'Edificio único: Banco', 'Tecnología única: Deuda nacional (crédito)'],
      },
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
      0: {
        name: 'Francos', description: 'Merovingios y carolingios: Poitiers (732), Carlomagno emperador (800).',
        bonuses: [
          { type: 'cost', target: { ids: ['townCenter'] }, resource: '*', op: 'mul', value: 0.9 },
          { type: 'stat', target: { ids: ['townCenter'] }, stat: 'popProvided', op: 'add', value: 5 },
        ],
        bonusText: ['Los condes administran: centros urbanos -10% de coste y +5 de población', 'Unidad única: Guerrero franco', 'Edificio único: Villa real', 'Tecnología única: Capitulares'],
      },
      1: {
        name: 'Francia capeta', description: 'Cruzadas, Cluny y las catedrales góticas desde Saint-Denis (h. 1140).',
        bonuses: [
          { type: 'cost', target: { ids: ['knight', 'cavalier'] }, resource: '*', op: 'mul', value: 0.9 },
          { type: 'stat', target: { ids: ['knight', 'cavalier'] }, stat: 'hp', op: 'mul', value: 1.1 },
        ],
        bonusText: ['Caballeros y paladines -10% de coste y +10% de PV', 'Unidad única: Caballero cruzado', 'Edificio único: Catedral gótica (refugio)', 'Tecnología única: Carta urbana'],
      },
      2: {
        name: 'Francia medieval tardía', description: 'Guerra de los Cien Años; las ordenanzas de Carlos VII (1439) crean las primeras compañías permanentes.',
        bonuses: [{ type: 'stat', target: { classes: ['infantry', 'cavalry'], kind: 'unit' }, stat: 'trainTime', op: 'mul', value: 0.85 }],
        bonusText: ['Compañías de ordenanza: infantería y caballería se entrenan un 15% más rápido', 'Unidad única: Gendarme', 'Edificio único: Bastida', 'Tecnología única: Taille'],
      },
      3: {
        name: 'Renacimiento francés', description: 'Francisco I, Marignano (1515), los castillos de recreo y las guerras de religión.',
        bonuses: [{ type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.05 }],
        bonusText: ['Burocracia: oro +5% de recolección', 'Unidad única: Arcabucero de la ordenanza', 'Edificio único: Château', 'Tecnología única: Contratar mercenarios'],
      },
      4: {
        name: 'Antiguo Régimen', description: 'Luis XIV, Colbert, Vauban y la artillería de Gribeauval (1765).',
        bonuses: [
          { type: 'stat', target: { classes: ['fortress'], kind: 'building' }, stat: 'hp', op: 'mul', value: 1.2 },
          { type: 'stat', target: { classes: ['fortress'], kind: 'building' }, stat: 'range', op: 'add', value: 1 },
          { type: 'cost', target: { classes: ['siege'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.85 },
          { type: 'gatherRate', resource: 'gold', op: 'mul', value: 1.1 },
        ],
        bonusText: ['Fortalezas abaluartadas: +20% de PV y +1 de alcance', 'Trincheras y artillería estándar: asedio y artillería -15% de coste', 'Manufacturas reales: oro +10% de recolección', 'Unidades únicas: Fusilero con bayoneta y Cañón Gribeauval', 'Edificios únicos: Fortaleza de Vauban y Manufactura real', 'Tecnología única: Colbertismo'],
      },
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
      4: {
        name: 'Imperio ruso',
        description: 'Occidentalización forzada y ejército regular (Pedro I, 1721; Poltava 1709; reclutamiento por quintas desde 1705; Catalina II). El almirantazgo llegará con el mar.',
        bonuses: [
          { type: 'cost', target: { ids: ['musketeer', 'grenadier'] }, resource: '*', op: 'mul', value: 0.75 },
          { type: 'stat', target: { ids: ['musketeer'] }, stat: 'hp', op: 'mul', value: 0.9 },
          { type: 'cost', target: { classes: ['artillery'] }, resource: '*', op: 'mul', value: 0.8 },
        ],
        bonusText: ['Levas (quintas): mosqueteros y granaderos -25% de coste, pero los mosqueteros tienen -10% de PV', 'Artillería -20% de coste', 'Unidades únicas: Granadero y Unicornio', 'Edificio único: Academia de ingenieros'],
      },
    },
  },
  {
    id: 'china', name: 'China', description: 'Linaje dinástico: economía de granjas estatal, tecnología precoz y barata, y defensa con tiradores. De los Sui-Tang a los Qing.',
    bonusText: ['Economía de granjas estatal: alimento +5% de recolección', 'Unidad única: Fubing (Edad Oscura)', 'Edificio único: Granero estatal'],
    bonuses: [{ type: 'gatherRate', resource: 'food', op: 'mul', value: 1.05 }],
    eras: {
      0: {
        name: 'Sui-Tang', description: 'Reunificación con granero estatal (581/618–907): campos iguales y soldado-labrador (fubing).',
        bonuses: [
          { type: 'gatherRate', resource: 'food', op: 'mul', value: 1.1 },
          { type: 'cost', target: { classes: ['infantry'], kind: 'unit' }, resource: 'food', op: 'mul', value: 0.9 },
        ],
        bonusText: ['Campos iguales: alimento +10% de recolección', 'Soldado-labrador: infantería -10% de comida', 'Unidad única: Fubing', 'Edificio único: Granero estatal', 'Tecnología única: Exámenes imperiales'],
      },
      1: {
        name: 'Song del Norte', description: 'Papel moneda y primer fuego (960–1127): el arroz de Champa y el billete jiaozi.',
        bonuses: [{ type: 'cost', target: { kind: 'tech' }, resource: '*', op: 'mul', value: 0.95 }],
        bonusText: ['Tecnologías -5% de coste', 'Unidad única: Lancero de fuego', 'Edificio único: Casa de moneda', 'Tecnologías únicas: Arroz de Champa y Billete jiaozi'],
      },
      2: {
        name: 'Song del Sur y Yuan', description: 'Marina y asedio con ingenieros de todo el mundo (1127–1368): Xiangyang (1273), la bomba trueno.',
        bonuses: [{ type: 'cost', target: { classes: ['siege'], kind: 'unit' }, resource: '*', op: 'mul', value: 0.85 }],
        bonusText: ['Ingenieros del mundo: asedio -15% de coste', 'Unidades únicas: Ballestero de repetición y Trabuquete de contrapeso', 'Edificio único: Gran Canal', 'Tecnología única: Bomba trueno'],
      },
      3: {
        name: 'Ming', description: 'Muralla, tesoro y arcabuz (1368–1644): la Gran Muralla, Qi Jiguang y el Shenjiying.',
        bonuses: [{ type: 'stat', target: { classes: ['tower', 'castle', 'wall'], kind: 'building' }, stat: 'hp', op: 'mul', value: 1.2 }],
        bonusText: ['Murallas y torres: murallas, torres y castillos +20% de PV', 'Unidad única: Arcabucero de las divisiones divinas', 'Edificio único: Ciudad Prohibida', 'Tecnología única: Pato mandarín'],
      },
      4: {
        name: 'Qing', description: 'Estado manchú-chino y comercio por un solo puerto (1644–1800): Ocho Banderas, conquista de Zungaria, sistema de Cantón.',
        bonuses: [
          { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'hp', op: 'mul', value: 1.1 },
          { type: 'stat', target: { classes: ['cavalry'], kind: 'unit' }, stat: 'attack', op: 'add', value: 1 },
        ],
        bonusText: ['Las Banderas: caballería +10% de PV y +1 de ataque', 'Unidad única: Jinete de las Ocho Banderas', 'Edificio único: Hong de Cantón (solo uno)', 'Tecnología única: Cantón'],
      },
    },
  },
];

/** Todas las civilizaciones, con la capa de la era 5 de las que venían de antes y Persia y Etiopía (eras 0–5). */
export const civs: CivDef[] = [
  ...baseCivs.map(c => industrialLayers[c.id] ? { ...c, eras: { ...c.eras, 5: industrialLayers[c.id] } } : c),
  persiaCiv, ethiopiaCiv,
];
