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

  /** Defensas lineales: empalizadas, murallas, puertas y zanjas (`game/defense.ts`, docs/civilizaciones.md «Defensas»). */
  defense: {
    /** Máximo de segmentos de una línea (o poligonal) trazada de una vez. */
    maxLine: 160,
    /** Mejora en el sitio (`game/wallUpgrade.ts`): la obra dura este factor del tiempo de construir el tramo nuevo. */
    upgradeTimeFactor: 0.6,
    /** Tramos que se mejoran como máximo con una orden. */
    maxUpgrade: 200,
    /** Aldeanos que se mandan a la obra si el jugador no da ninguno (también la IA). */
    upgradeBuilders: 4,
    /** Tramos que la IA empieza a mejorar como máximo en cada turno de pensar. */
    aiUpgradePerThink: 8,
    /** El daño «al pie» del muro (aceite hirviendo) se aplica cada tantos ticks (20 = cada segundo). */
    footEveryTicks: 20,
    /** La IA rodea su centro urbano con una empalizada (con puertas) a esta distancia, según la dificultad: [easy, normal, hard]; 0 = no. */
    aiRingRadius: [0, 9, 9] as number[],
    /** La IA solo levanta muros si algún enemigo tiene al menos tantas tropas de combate. */
    aiThreatArmy: 8,
    /** La IA empieza a pensar en muros pasados estos segundos de partida, y repasa su anillo cada `aiEvery` segundos. */
    aiStartAt: 540,
    aiEvery: 10,
    /** Lo que la IA se deja sin gastar de cada recurso al levantar muros (la economía y la edad van primero). */
    aiKeep: { wood: 60, stone: 60, gold: 150, food: 150 } as Record<string, number>,
    /** Segmentos que la IA coloca como máximo por turno de pensar. */
    aiSegmentsPerThink: 4,
    /** Puertas de la IA en su anillo (por los cuatro lados: norte, este, sur, oeste). */
    aiGates: 4,
    /** Un ataque a un muro con tropas a pie: la IA sigue atacando muros si no tiene asedio, pero prefiere la puerta. */
    wallTargetPenalty: 3,
    /** Tiradores que la IA sube al paso de ronda de sus murallas, según la dificultad: [easy, normal, hard]. */
    aiWallShooters: [0, 4, 6] as number[],
  },

  /** Caza y ganadería: animales salvajes y ganado. */
  wildlife: {
    /** Segundos entre dos paseos de un animal, mínimo y máximo. */
    wanderEvery: [6, 16] as [number, number],
    /** Un animal herido que huye se aleja tantas casillas. */
    fleeDistance: 8,
    /** Un animal que contraataca deja de perseguir si el agresor se aleja más de esto de él. */
    chaseGiveUp: 9,
    /** Casillas a la redonda donde un cazador busca otro cadáver tras abatir una pieza. */
    carcassSearch: 10,
    /** Casillas a la redonda de la base donde la IA caza. */
    aiHuntRange: 24,
    /** Ovejas que la IA mantiene por corral. */
    aiSheepPerCorral: 4,
  },

  /** Ejércitos: formaciones, posturas y órdenes tácticas. */
  army: {
    /** Separación entre huecos de una formación (casillas). */
    spacing: 0.9,
    /** La formación dispersa multiplica la separación por esto. */
    looseFactor: 2,
    /** Dónde va cada tipo de tropa: front (delante), back (detrás), flank (flancos), rear (al fondo). */
    placement: { infantry: 'front', ranged: 'back', cavalry: 'flank', siege: 'rear' } as Record<string, 'front' | 'back' | 'flank' | 'rear'>,
    /** Formación por defecto al mover varias tropas. */
    defaultFormation: 'line' as 'line' | 'column' | 'box' | 'wedge' | 'loose',
    /** Postura por defecto de las unidades nuevas. */
    defaultStance: 'aggressive' as 'aggressive' | 'defensive' | 'hold' | 'passive',
    /** Postura defensiva: cuánto se aleja de su sitio persiguiendo (casillas). */
    defensiveLeash: 5,
    /** Si la tropa va de media más lejos que esto de su hueco, la formación espera. */
    regroupDistance: 3,
    /** Velocidad del centro de la formación mientras espera a los rezagados (fracción). */
    regroupSpeed: 0.3,
    /** Segundos sin enemigos a la vista para que una formación detenida por el combate siga. */
    resumeAfter: 1.5,
    /** Escolta: distancia a la que se pone detrás de la unidad protegida y radio en el que la defiende. */
    escortDistance: 2.5,
    escortRadius: 6,
    /** Mantener zona: radio por defecto. */
    zoneRadius: 6,
  },

  /** Modo "Matar al rey" (mod regicide). Las estadísticas del rey y los edificios de refugio son datos del mod. */
  regicide: {
    /** La IA esconde a su rey si hay tropas enemigas a menos de esta distancia (casillas), y lo mueve lejos de ellas si no tiene refugio. */
    aiDangerRadius: 16,
    /** El ejército de la IA que ya está a más de esta distancia de su base va a por el rey rival (o su edificio). */
    aiHuntDistance: 25,
    /** Segundos entre los avisos de que el rey propio está siendo atacado fuera de un refugio. */
    exposedWarnEvery: 12,
  },

  /** Modo "Guerra declarada" (mod declared-war). */
  war: {
    /** Edad necesaria para declarar la guerra (índice: 2 = Edad de los Castillos). */
    requiredAge: 2,
    /** Cuenta atrás de preparación por defecto (minutos de juego; se elige al crear la partida). */
    prepMinutes: 30,
    /** Radio del círculo de combate, en casillas. */
    circleRadius: 12,
    /** Distancia mínima del punto de batalla a cualquier centro urbano. */
    minDistFromTownCenter: 20,
    /** Duración máxima de la batalla (minutos). Al acabar gana quien tenga más ejército en el círculo. */
    battleMaxMinutes: 12,
    /** Segundos seguidos sin tropas en el círculo para perder la batalla por abandono. */
    abandonSeconds: 30,
    /** Conquista: si el ganador de la batalla pasa estos segundos sin ejército, fracasa y vuelve la paz. */
    conquestFailSeconds: 120,
    /** Conquista: si en estos minutos no ha caído el pueblo, fracasa y vuelve la paz. */
    conquestMaxMinutes: 20,
    /** Tras unas tablas, segundos hasta poder declarar otra guerra. */
    redeclareCooldown: 300,
    general: {
      /** Radio del aura del General (casillas). */
      auraRadius: 7,
      /** Multiplicador de ataque de las tropas propias dentro del aura. */
      auraAttackMul: 1.2,
      /** Moral: armadura extra (cuerpo a cuerpo y a distancia) dentro del aura. */
      auraArmorAdd: 1,
      /** Segundos de espera para entrenar otro General si muere. */
      retrainCooldown: 180,
    },
    /** IA: en paz no pasa de este ejército (fracción del límite de población), para seguir creciendo y avanzando de edad. */
    aiPeaceArmyShare: 0.5,
    /** IA: tropas mínimas (con el General) para declarar la guerra. */
    aiMinArmy: 14,
    /** IA: si espera más que esto (s) con las condiciones cumplidas, declara igualmente. */
    aiMaxWait: 420,
  },

  /**
   * Capa táctica (mod battle, docs/batalla-tactica.md). Cifras de la fase 0 (prototipo descartable, ya borrado: `git show 585060c:scripts/battle-proto.ts`,
   * sección «Resultados de la fase 0» del documento).
   */
  battle: {
    /** Factor del daño entre tropas con regimiento (ablanda el combate para que la moral actúe) y para los golpes con bono de clase (lanza contra caballería). */
    damageMul: 0.16,
    bonusMul: 0.6,
    /** Tamaño de regimiento por clase (la primera clase que coincida) y moral base. `hero` = el General (regimiento de 1). */
    kinds: [
      { cls: 'hero', size: 1, morale: 100 },
      { cls: 'cavalry', size: 8, morale: 80 },
      { cls: 'spear', size: 10, morale: 55 },
      { cls: 'archer', size: 12, morale: 50 },
      { cls: 'infantry', size: 10, morale: 60 },
    ] as { cls: string; size: number; morale: number }[],
    /** Un soldado sin regimiento se une a uno del mismo tipo con hueco a menos de esta distancia (casillas). */
    joinRadius: 6,
    /** Cada cuántos segundos se actualiza la moral (la regla de huida y recuperación se evalúa a ese ritmo). */
    step: 0.25,
    /** Moral perdida por cada 5 % de efectivos que cae. */
    perLoss: 2,
    /** Moral por segundo perdida por golpes cuerpo a cuerpo de flanco / retaguardia (dura `hitLingers` s tras el golpe). */
    flankPerSec: 2,
    rearPerSec: 5,
    hitLingers: 1.5,
    /** Daño por ángulo: frente si el golpe llega dentro de ±60° (cos 0,5), retaguardia pasados 120° (cos −0,5). */
    flankMul: 1.3,
    rearMul: 1.6,
    /** Giro de un regimiento parado hacia sus atacantes (grados por segundo), memoria de golpes (s) y peso de los disparos. */
    turnRate: 60,
    /** Velocidad del centro (casillas por segundo) por encima de la cual el regimiento «marcha» y mira hacia donde va; el giro en marcha es el doble de rápido. */
    marchSpeed: 0.5,
    turnMemory: 2,
    rangedWeight: 0.3,
    /** Carga: segundos a ≥ speedFraction de la velocidad hacia un regimiento enemigo a menos de chargeRange para tener ímpetu; primer golpe ×chargeMul; golpe de moral; duración. */
    chargeBuildUp: 2,
    chargeSpeedFraction: 0.8,
    chargeRange: 14,
    chargeMul: 2.5,
    chargeHit: 10,
    chargeLasts: 3,
    /** Contra lanceros de frente la carga se anula y cada jinete recibe este daño. */
    spearCounter: 50,
    /** Contagio (vecino propio que huye a ≤ contagionRadius), ver huir al enemigo (≤ sightRadius). */
    contagion: 5,
    contagionRadius: 8,
    enemyRouts: 5,
    sightRadius: 12,
    /** Inferioridad numérica: enemigos cuerpo a cuerpo ≥ outnumbered × propios a ≤ nearRadius: −outnumberedPerSec por segundo. */
    outnumbered: 2,
    outnumberedPerSec: 0.5,
    nearRadius: 8,
    /** General caído: golpe de moral, techo de moral y daño del aura propio de la batalla. */
    generalDead: 30,
    generalDeadCap: 50,
    auraAttackMul: 1.05,
    auraArmorAdd: 0.25,
    /** Subidas por segundo: General a ≤ auraRadius, lejos del enemigo (> farRadius), en reserva (> reserveRadius). */
    generalPerSec: 0.1,
    auraRadius: 7,
    farPerSec: 2,
    farRadius: 12,
    reservePerSec: 1,
    reserveRadius: 8,
    /** Vacilante (< wavering): daño ×waveringDamage. Los que huyen reciben ×routedDamage. */
    wavering: 25,
    waveringDamage: 0.85,
    routedDamage: 1.2,
    /** Huida: recuperación tras recoverAfter s sin enemigos a ≤ pursuitRadius y a > farRadius; vuelve a recoverTo. Distancia a la que corre. */
    recoverAfter: 6,
    recoverTo: 45,
    pursuitRadius: 6,
    fleeDistance: 30,
    /** Fuego amigo de la artillería y el asedio: moral perdida por impacto propio. */
    friendlyFireMorale: 3,
    /** Correr: velocidad ×runMul; se cancela tras runStill s parado. */
    runMul: 1.4,
    runStill: 1.5,
    /** Cansancio (0–100 por regimiento) por segundo: correr (×fatigueCavMul la caballería), cuerpo a cuerpo; se recupera caminando o quieto. */
    fatigueRun: 4,
    fatigueCavMul: 1.5,
    fatigueMelee: 1,
    fatigueWalkRest: 3,
    fatigueRest: 5,
    /** Cansado (> tired): daño ×tiredDamage, velocidad ×tiredSpeed, moral −tiredMorale por segundo. A 100 no puede correr. */
    tired: 70,
    tiredDamage: 0.8,
    tiredSpeed: 0.85,
    tiredMorale: 0.5,
    /** Arengar (orden del General): moral que da a los regimientos propios a ≤ harangueRadius del General, y enfriamiento (s). */
    harangue: 20,
    harangueRadius: 14,
    harangueCooldown: 60,
    /** Munición (andanadas por unidad a distancia): la primera clase que coincida, o la de `ammoById`; sin ella pelean cuerpo a cuerpo con `noAmmoDamage` (el asedio, `noAmmoSiegeDamage`). */
    ammo: [
      { cls: 'machinegun', ammo: 150 },
      { cls: 'artillery', ammo: 20 },
      { cls: 'firearm', ammo: 20 },
      { cls: 'archer', ammo: 25 },
    ] as { cls: string; ammo: number }[],
    ammoById: { crossbowman: 18, repeatingCrossbowman: 40, rifleman: 40, guardRifleman: 40, regionalRifleman: 40, shewanRifleman: 40, enfieldRifleman: 40, sharpshooter: 40 } as Record<string, number>,
    ammoDefault: 25,
    noAmmoDamage: 0.5,
    noAmmoSiegeDamage: 0.1,
    /** Se recupera munición tras ammoRest s sin disparar (ammoRefillPerSec por segundo); con ammoBack o más vuelve a disparar. */
    ammoRest: 10,
    ammoRefillPerSec: 0.4,
    ammoBack: 3,
    /** IA: retira un regimiento por debajo de aiRetreatBelow de moral (a aiRegroupDistance casillas del enemigo) y lo devuelve a la línea al llegar a aiRejoinAbove. */
    aiRetreatBelow: 25,
    aiRejoinAbove: 50,
    aiRegroupDistance: 12,
    /** IA: solo se repliega si el enemigo está a más de aiDisengage casillas (con él encima la retirada es una matanza por la espalda); si le alcanzan, vuelve a luchar. */
    aiDisengage: 5,
    aiCaught: 3,
    /** Sin General las órdenes de movimiento y ataque de las tropas tardan estos segundos en cumplirse. */
    noGeneralDelay: 4,
  },

  /** Poderes activos de las civilizaciones (docs/civilizaciones.md §5, `game/powers.ts`). Valores indicativos. */
  powers: {
    /** Tributo a la Horda: tregua mutua con todos los enemigos (segundos) y su oro. */
    tribute: { cost: 300, duration: 60, cooldown: 420 },
    /** Flota del Tesoro: se paga y, pasado el viaje, vuelve con más. */
    treasureFleet: { cost: 250, delay: 90, returns: 600, cooldown: 360 },
    /** Crédito: oro ya, a devolver con interés. Mientras haya deuda no se puede pedir otro. */
    credit: { loan: 500, repay: 650, delay: 150, retryEvery: 20, cooldown: 420 },
    /** Tierra quemada: radio (casillas), duración y velocidad de los enemigos dentro. */
    scorchedEarth: { radius: 7, duration: 90, enemySpeed: 0.6, cooldown: 300 },
    /** Leva: infantería que aparece junto al centro urbano. */
    levy: { count: 6, unit: 'musketeer', cooldown: 300 },
    /** Gran Saqueo (Persia): oro por cada baja causada, hasta un máximo, y las bajas mínimas para poder usarlo. */
    greatPlunder: { perKill: 6, max: 800, minKills: 15, cooldown: 420 },
    /** Bazar (Persia): comida que se cambia por oro, al momento. */
    bazaar: { food: 300, gold: 450, cooldown: 240 },
    /** Resistencia (Etiopía): las tropas junto al centro urbano recuperan esta parte de la vida que les falta. */
    resistance: { radius: 14, heal: 0.6, cooldown: 360 },
    /** Nagarit (Etiopía): milicia que aparece de golpe junto al centro urbano. */
    nagarit: { count: 10, unit: 'pikeman', cooldown: 600 },
    /** Legión Extranjera (Francia): fusileros contratados con oro. */
    foreignLegion: { cost: 500, count: 5, unit: 'rifleman', cooldown: 420 },
    /** La IA: enemigos cerca de su base para recurrir al poder de defensa; oro de sobra para la Flota; oro bajo para pedir crédito. */
    ai: { threatRadius: 16, threatCount: 6, fleetSurplus: 1600, creditBelow: 120 },
  },

  ai: {
    difficulty: {
      easy: { gather: 0.75, maxVillagers: 18, firstAttack: 900, wave: 5, waveGrow: 1, villagersForAge: [14, 20, 26, 99, 99], think: 2 },
      normal: { gather: 1.0, maxVillagers: 28, firstAttack: 600, wave: 8, waveGrow: 2, villagersForAge: [18, 24, 30, 28, 28], think: 1 },
      hard: { gather: 1.15, maxVillagers: 40, firstAttack: 420, wave: 10, waveGrow: 3, villagersForAge: [20, 26, 32, 36, 36], think: 0.6 },
    } as Record<string, { gather: number; maxVillagers: number; firstAttack: number; wave: number; waveGrow: number; villagersForAge: number[]; think: number }>,
    /** Reparto de aldeanos por recurso en cada edad. */
    ratios: [
      { food: 0.55, wood: 0.4, gold: 0.05, stone: 0 },
      { food: 0.45, wood: 0.35, gold: 0.15, stone: 0.05 },
      { food: 0.4, wood: 0.3, gold: 0.25, stone: 0.05 },
      { food: 0.38, wood: 0.27, gold: 0.28, stone: 0.07 },
      { food: 0.36, wood: 0.3, gold: 0.24, stone: 0.1 },
      { food: 0.3, wood: 0.27, gold: 0.17, stone: 0.04, iron: 0.14, coal: 0.08 },
    ] as Record<string, number>[],
    /** Con más de esto en el almacén, la IA aparta aldeanos de ese recurso. */
    stockpileEnough: 1200,
  },

  /** Diplomacia (docs/civilizaciones.md §8, `game/diplomacy.ts`). Tiempos en segundos de partida. */
  diplomacy: {
    /** Una propuesta sin respuesta caduca pasado esto. */
    proposalTtl: 120,
    /** Tras firmar o romper un tratado no se puede romper otra vez hasta pasado esto. */
    treatyLock: 90,
    /** Parte del tributo que se pierde por el camino. */
    tributeFee: 0.25,
    tributeMin: 50,
    /** IA: la paz se acepta si el rival tiene al menos esta proporción de su ejército, o si ya hay buena voluntad. */
    aiPeaceRatio: 1.2,
    /** IA: no pide la paz mientras el ejército rival sea menor que esto (los primeros escarceos no cuentan). */
    aiPeaceMinArmy: 10,
    /** IA: oro (valor del tributo recibido) que equivale a una buena voluntad que inclina a aceptar la paz. */
    aiGoodwill: 150,
    /** IA: rompe la paz si su ejército supera al del otro por esta proporción y lleva este tiempo de tratado. */
    aiBreakRatio: 2.2,
    aiBreakAfter: 420,
    /** IA: edad mínima a la que se plantea romper un tratado y mínimo de soldados. */
    aiBreakAge: 3,
    aiBreakArmy: 12,
    /** IA: cada cuánto propone (s). */
    aiProposeEvery: 90,
  },

  /** Comercio (`game/trade.ts`): caravanas entre puestos comerciales. Oro por casilla de distancia. */
  trade: {
    perTile: 0.35,
    /** Multiplicadores según con quién se comercia. */
    domesticMul: 0.5,
    foreignMul: 1.3,
    allyMul: 1.6,
    /** Distancia mínima (casillas) de una ruta propia, y máxima que se paga. */
    minDist: 15,
    maxDist: 90,
    /** Parte de la ganancia que cobra el puesto extranjero. */
    partnerShare: 0.5,
    /** Cada caravana extra en la misma ruta cobra esto menos, con un mínimo. */
    saturation: 0.15,
    saturationMin: 0.4,
    /** Bono por edad del dueño (por edad). */
    ageBonus: 0.08,
    /** La IA: caravanas que mantiene según su edad. */
    aiCaravans: [0, 2, 3, 4, 5, 6],
  },

  /** Espionaje (`game/espionage.ts`). */
  espionage: {
    /** Radio (casillas) en que un edificio de vigilancia o un espía enemigo descubre al espía. */
    detectRadius: 4,
    /** Informe: radio revelado en el mapa y segundos que dura. */
    intelRadius: 9,
    intelDuration: 45,
    cooldown: 60,
    /** Probabilidades de éxito (0–1). */
    successIntel: 0.9,
    successSteal: 0.55,
    successSabotage: 0.65,
    successBribe: 0.5,
    /** Robar tecnología: parte del coste que se paga y enfriamiento del jugador (s). */
    stealCostFrac: 0.4,
    stealCooldown: 150,
    /** Sabotaje: parte de la vida que se pierde y del avance de la cola. */
    sabotageHp: 0.2,
    sabotageQueue: 0.5,
    /** Sobornar: oro por unidad y radio de búsqueda. */
    bribeCost: 120,
    /** Agente doble: cada cuánto se comprueba si lo descubren y probabilidad. */
    agentCheckEvery: 2,
    agentDiscoverChance: 0.25,
    /** La IA: oro mínimo para ordenar un robo o un informe. */
    aiMinGold: 350,
  },

  /** Partidas en red (pasos sincronizados; ver docs/multijugador.md). Tiempos en ms salvo que se diga. */
  net: {
    /** Jugadores como mucho en una sala (humanos e IA). */
    maxPlayers: 8,
    /**
     * Retardo de entrada (lo que tarda una orden en ejecutarse): al empezar y como mucho, en ms
     * reales; como poco, en ticks. Se adapta a la latencia medida y a las esperas de verdad. En ms
     * porque un tick dura 50 ms entre la velocidad de juego (33 ms a ×1,5; 17 ms a ×3).
     */
    delayStartMs: 200,
    delayMin: 2,
    delayMaxMs: 1000,
    /** Margen sobre la latencia de ida: unos dos fotogramas (los mensajes se atienden entre fotogramas). */
    delayMargin: 50,
    /** Cuántas veces la variación de la latencia se suma a la latencia media al calcular el retardo. */
    jitterFactor: 0.5,
    /** Cada cuántos ms se recalcula el retardo; para bajarlo hace falta que sobre varias veces seguidas. */
    delayEvery: 2000,
    delayLowerAfter: 2,
    /** Si el anfitrión cierra sin el turno de alguien más de esta fracción de los ticks, el retardo sube al momento. */
    waitRaise: 0.1,
    /** Solo se baja el retardo si los turnos tardíos no pasan de esta fracción. */
    waitLowerOk: 0.03,
    /**
     * El anfitrión cierra cada tick a su hora: si el turno de alguien no ha llegado tras este margen
     * (ms; como poco un tick), queda vacío y sus órdenes salen en el siguiente. Así un jugador con
     * mala red no para a los demás.
     */
    closeGrace: 120,
    /** Tras irse, volver o salir de la app alguien, durante esto (ms) las esperas no suben el retardo. */
    delayCalm: 6000,
    /** Huella del estado cada tantos ticks (comprobación de sincronía). */
    hashEvery: 20,
    pingEvery: 1000,
    /** Esperando a un jugador desconectado o en segundo plano: la IA juega por él pasado esto. */
    dropAway: 4000,
    /** Esperando a un jugador que sigue conectado pero no manda sus turnos. */
    dropSilent: 12000,
    /** Sin noticias del anfitrión durante esto, se da por perdido. */
    hostLost: 10000,
    /** Si el anfitrión ha avisado de que sale de la app, se le espera más. */
    hostAwayLost: 120000,
    /** "Esperando a..." aparece tras esta espera (las cortas solo se notan como un tirón). */
    waitNotice: 1000,
    /** Al ir por detrás, como mucho tantos ms de CPU por fotograma para ponerse al día. */
    catchUpBudget: 14,
  },
};
