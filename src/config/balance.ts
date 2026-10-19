/**
 * VALORES DE BALANCE en un único sitio.
 *
 * Aquí viven las reglas generales del motor: alcances de interacción, relieve,
 * ventaja de altura, visión, movimiento, pathfinding e IA. Las estadísticas de
 * cada unidad, edificio y tecnología siguen siendo datos de los mods
 * (src/mods/core/*.ts), porque cada mod debe poder traer las suyas.
 *
 * Un "nivel de altura" son `relief.levelStep` niveles de elevación del mapa
 * (un nivel de elevación sube ELEV_PX píxeles en pantalla).
 */
export const BALANCE = {
  /** Distancias de interacción (casillas, desde el borde del objetivo). */
  interaction: {
    gatherRange: 0.6,
    buildRange: 0.6,
    dropRange: 0.6,
    meleeRange: 0.35,
  },

  relief: {
    /** Diferencia de niveles dentro de una casilla a partir de la cual es acantilado infranqueable (se convierte en roca). */
    cliffSlope: 2.2,
    /** Pendiente máxima (diferencia de niveles en la huella) para poder construir. */
    buildMaxSlope: 1.6,
    /** Ancho mínimo, en casillas, de los pasos entre roca o agua. */
    passMinWidth: 3,
    /** Niveles de elevación que equivalen a "un nivel de altura" en las reglas de combate y visión. */
    levelStep: 1,
    /** Mapas reales: pendiente real (grados) a partir de la que el terreno es roca. */
    realRockSlopeDeg: 34,
  },

  /** Ventaja de altura. Se cuenta en niveles de diferencia entre atacante y objetivo. */
  highGround: {
    /** Unidades a distancia y edificios defensivos más altos que el objetivo. */
    rangePerLevel: 1,
    rangeCap: 2,
    damagePerLevel: 0.15,
    damageCap: 0.45,
    /** Penalización por atacar cuesta arriba (cualquier ataque). */
    uphillPenaltyPerLevel: 0.05,
    uphillPenaltyCap: 0.15,
    /** Diferencia mínima (en niveles) para que cuente. */
    minDiff: 0.75,
  },

  vision: {
    /** Casillas de visión extra por nivel por encima del terreno de alrededor. */
    bonusPerLevel: 1,
    bonusCap: 3,
    /** Altura de los ojos sobre el suelo, en niveles de elevación. */
    eyeUnit: 0.6,
    eyeBuilding: 1.5,
    eyeTower: 3,
    /** Altura de lo que se intenta ver (una unidad sobresale del suelo). */
    targetHeight: 0.5,
  },

  movement: {
    /** Pérdida de velocidad por cada nivel de subida por casilla recorrida. */
    uphillSlowPerGrade: 0.3,
    /** Velocidad mínima cuesta arriba (fracción de la normal). */
    minSpeedFactor: 0.6,
  },

  pathfinding: {
    /** Coste extra por nivel de desnivel entre casillas vecinas (los caminos prefieren el llano). */
    slopeCost: 1.2,
    /** Caminos largos calculados como máximo por tick (el resto espera al siguiente). */
    pathsPerTick: 30,
  },

  /** Avisos al jugador: segundos mínimos entre dos iguales. */
  alerts: {
    /** «Te están atacando» (por separado para unidades y edificios). */
    attackEvery: 10,
    /** Recurso de una zona agotado. */
    depletedEvery: 4,
  },

  combat: {
    projectileSpeed: 9,
    /** La reparación tarda este múltiplo del tiempo de construcción. */
    repairTimeFactor: 1.5,
  },

  ai: {
    difficulty: {
      easy: { gather: 0.75, maxVillagers: 18, firstAttack: 900, wave: 5, waveGrow: 1, villagersForAge: [14, 20, 26], think: 2 },
      normal: { gather: 1.0, maxVillagers: 28, firstAttack: 600, wave: 8, waveGrow: 2, villagersForAge: [18, 24, 30], think: 1 },
      hard: { gather: 1.15, maxVillagers: 40, firstAttack: 420, wave: 10, waveGrow: 3, villagersForAge: [20, 26, 32], think: 0.6 },
    } as Record<string, { gather: number; maxVillagers: number; firstAttack: number; wave: number; waveGrow: number; villagersForAge: number[]; think: number }>,
    /** Reparto de aldeanos por recurso en cada edad. */
    ratios: [
      { food: 0.55, wood: 0.4, gold: 0.05, stone: 0 },
      { food: 0.45, wood: 0.35, gold: 0.15, stone: 0.05 },
      { food: 0.4, wood: 0.3, gold: 0.25, stone: 0.05 },
      { food: 0.38, wood: 0.27, gold: 0.28, stone: 0.07 },
    ] as Record<string, number>[],
    /** Con más de esto en el almacén, la IA aparta aldeanos de ese recurso. */
    stockpileEnough: 1200,
  },
};
