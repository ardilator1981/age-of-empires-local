# Fase 6: era Contemporánea (petróleo, blindados, aviación y antiaérea)

Plan detallado de la fase 6 de `docs/civilizaciones.md` §10. Diseño, no implementación. Leyenda: ✔ ya existe en el motor o en los datos · ⏳ pendiente (lo que propone este plan) · 🔶 especulativo o por decidir. Números indicativos: la fuente de verdad será `src/config/balance.ts` (reglas generales) y `src/mods/core/contemporary*.ts` (datos). Complementa [`docs/evolucion-de-unidades.md`](evolucion-de-unidades.md) (qué líneas de unidades llegan a la era 6 y cómo).

## 1. Punto de partida (verificado en el código)

| Qué | Estado | Dónde |
| --- | --- | --- |
| Edades 0–5 como datos; la 6 se añade con `reg.addAge` y una tecnología con `setsAge: 6` | ✔ | `mods/core/world.ts`, `industrial.ts` (`industrialAge` es el modelo) |
| Capas por era (`CivDef.eras[6]`, `replaces`, identidad visible, `applyEraOneOffs`) | ✔ | `core/types.ts`, `game/Player.ts`; `civIncomplete` marcará «incompleta» a cada civilización hasta que tenga la capa 6 |
| Recursos con `minAge` (la interfaz los oculta antes), nodos colocados por `setup.baseResources` | ✔ | `world.ts`; el HUD y el móvil ya respetan `minAge` |
| Aviación básica: `UnitDef.flying` (no choca con terreno ni tropas, va en línea recta sin A*, no sube a murallas, no se soborna, no sufre aceite) y `airRule` (solo lo alcanzan armas a distancia que no sean asedio ni artillería) | ✔ mínimo | `industrial.ts` (biplano, aeródromo, Aviación), `systems/core.ts`, `game/actions.ts`, `espionage.ts`, `defense.ts` |
| Sin altura de vuelo en el dibujo (el biplano se pinta a ras de suelo con su propio sprite) ni marca aparte en el minimapa | ⏳ | `render/Renderer.ts`, `Minimap.ts` |
| Daño de área (`splash`), `antiUnit`, `buildingsOnly`, dos tipos de daño (`melee`, `pierce`) y bonos por clase | ✔ | `combat.ts`, §13 |
| `maxAlive`, `retrainCooldown`, `aura`, `stealth` (con vigilancia de torres, castillos y centros urbanos), `shelter`, `walkway` | ✔ | `core/types.ts` |
| Poderes (`PowerDef`), doctrinas (`excludes`), diplomacia (`game.data.diplo`, tributo, embargo, alianza con visión compartida), comercio, espionaje | ✔ | fases 3 y 5 |
| IA: bucle general (entrena «lo de edad más alta» en cada edificio), plugins `gunpowder` (edificios y técnicas por era con `WANTS`), `siege`, `defense`, `powers`, `trade`, `diplomacy`, `spies` | ✔ | `AISystem.ts`, `gunpowder.ts`, `siege.ts`, `defenses.ts`, `trade.ts` |
| Guardado: `SAVE_VERSION = 2`; estado nuevo en `entity.data`/`player.data`/`game.data` no obliga a subirla; sistemas con estado implementan `save()`/`load()` | ✔ | `game/save.ts` |
| Red: toda acción del jugador es un `NetCommand`; órdenes de mod con `reg.addNetCommand`; determinismo con `fmath` y `game.rng()` | ✔ | `game/net/`, `docs/multijugador.md` |
| Mar: aplazado. **La era 6 no tendrá puerto militar ni portaaviones** hasta el paquete «mar» | aplazado | `docs/decisiones.md` 2026-10-21 |
| Armas nucleares: fase 7 (§8c). En la 6 solo la **central nuclear como energía** | fase 7 | — |

## 2. La era 6 en una frase

**Motor, petróleo y radio.** La economía gana un recurso (petróleo) y una capacidad (energía); el ejército se motoriza (blindados, artillería autopropulsada, infantería mecanizada) y gana la tercera dimensión (cazas, bombarderos, reconocimiento) con su contrapartida (antiaérea y radar). Cada civilización adopta su identidad del siglo XX, con el giro de Rusia (URSS o Rusia) y el traspaso de Gran Bretaña a Estados Unidos. Nada de lo anterior desaparece: las tropas de la 5 siguen sirviendo y son más baratas.

**Subir a la era:** tecnología `contemporaryAge` en el centro urbano (2000 alimento, 1500 oro, 400 hierro; 270 s; edad 5; `requiresBuildings: { ids: ['factory', 'laboratory', 'railwayStation', 'airfield'], count: 2 }` como las otras dos). `AgeDef { index: 6, id: 'contemporary', name: 'Edad Contemporánea' }`. `BALANCE.ai.villagersForAge` y `ratios` ganan una entrada (ratio con `oil`).

## 3. Recursos: petróleo y energía

### 3.1 Petróleo (recurso recolectado)

- `ResourceDef { id: 'oil', name: 'Petróleo', minAge: 6, start: { low: 0, standard: 0, high: 400 } }` y nodo `oilField` («Pozo de petróleo», 900 de cantidad, `gatherRate` 0,34, sprite de balancín/charca negra, `minimapColor` negro).
- Colocación: `setup.baseResources` añade `{ node: 'oilField', count: 3, minDist: 15, maxDist: 22 }` por jugador y los generadores `scatter` 1–2 campos por jugador lejos de las bases (como hierro y carbón hoy). **Riesgo:** los mapas reales (`mods/real-maps`) y los de mods (`oasis`, `treasure-hunt`) deben colocarlos también; un test recorre todos los mapas y comprueba que hay ≥ 2 pozos alcanzables por jugador (como `tests/relief.test.ts` hace con la conectividad).
- Depósito: **Refinería** (edificio de la era, `dropSite: ['oil']`, también hierro y carbón) y el centro urbano / estación (`ALL` crece con `oil`). El campamento minero **no** acepta petróleo (incentiva construir la refinería).
- Lo consume: vehículos, blindados y aviones (coste de entrenamiento), artillería autopropulsada, algunas técnicas, y el camión/tractor de la economía (`evolucion-de-unidades.md` 2.8). **Sin consumo por tick** (ver 3.3).
- **Compraventa (decidido: dentro de 6a):** orden de red `exchange { resource, amount, buy }` en el mercado (y en la compañía comercial y el banco, que son `tradePost`): vender o comprar 100 de un recurso por oro a un precio por recurso con deslizamiento (`BALANCE.trade.exchange`: precio base, +/−3 % por operación, que vuelve al base poco a poco; todo entero y determinista). Permite conseguir petróleo a quien no tiene pozos y da salida a los excedentes. Interfaz: botones en el mercado por `commandModel` (escritorio y móvil). La IA compra petróleo si tiene oro de sobra y le faltan pozos (`tradeAI`).

### 3.2 Energía (capacidad producida, no recolectada)

§2b (observación 3) pide una energía que «la producen edificios y se consume». Dos modelos posibles:

| Modelo | Cómo | Pros | Contras |
| --- | --- | --- | --- |
| **A. Capacidad, como la población (recomendado)** | `BuildingDef.energyProvided` (central eléctrica 20, central nuclear 60) y `energyCost` en unidades/edificios de la era (fábrica de automóviles 10, radar 5, base aérea 10, carro pesado 2…). `Player` calcula `energy`/`energyMax` igual que `pop`/`popMax`; `rules.ts` rechaza lo que no cabe («Falta energía») | Determinista y gratis de guardar (se recalcula); el jugador ya entiende la población; la IA lo trata como «construir otra casa» | No hay apagones ni consumo variable; es un segundo tope de población |
| B. Flujo por tick (producción − consumo en `game.data`) | Sistema `EnergySystem` con `save()`/`load()`; déficit = unidades más lentas | Más rico (sabotaje de centrales) | Más balance, más estado, más riesgo en red y en la IA |

**Decisión propuesta: A.** Deja la puerta a B (el déficit se podría añadir después como penalización sin cambiar los datos). Interfaz: una celda más junto a la población en el HUD de escritorio y en `MobileHUD` (sale desde la era 6, `minAge` del recurso virtual). Al perder una central, las cosas con `energyCost` **no mueren**: solo se bloquea entrenar/construir más (como pasa con la población al perder casas). 🔶 Opcional: sin energía los radares dejan de detectar.

### 3.3 Combustible y mantenimiento: lo que NO se hace en la 6

§7.2 habla de «mantenimiento» de las tropas modernas por minuto. Se **descarta para esta fase**: un drenaje por tick cambia el balance de toda la era, castiga al que no encuentra pozos y la IA no sabe gestionarlo. En su lugar: (a) petróleo como coste de entrenamiento, (b) **autonomía** de los aviones (§5.3), que da la sensación de combustible sin tocar la economía, y (c) 🔶 revisar tras la fase 6e si hace falta.

### 3.4 Árbol común de edificios y tecnologías de la era 6 (de §2b, adaptado)

| Edificio | Función | Requiere | Notas |
| --- | --- | --- | --- |
| **Refinería** (`refinery`) | Depósito de petróleo (y hierro, carbón); investiga Craqueo y Motor diésel; entrena el camión 🔶 | Fábrica | Persia la tiene como único de §5.4: se convierte en bono (refinería −30 %) |
| **Central eléctrica** (`powerPlant`) | `energyProvided: 20`; cuesta carbón | Laboratorio | Con «Energía nuclear» se construye la **Central nuclear** (`energyProvided: 60`, `maxAlive: 1`, cara, sin armas) |
| **Fábrica de automóviles / parque de vehículos** (`motorPool`) | Entrena carro ligero (y sus mejoras), infantería mecanizada, lanzacohetes, AA móvil; investiga las mejoras de blindados | Refinería, energía 10 | Sustituye en la práctica al taller de asedio |
| **Base aérea** (`airBase`) | `replaces: ['airfield']` (se levanta sobre el aeródromo): entrena cazas, bombarderos y reconocimiento; refugio de aviones (`shelter: { classes: ['air'], capacity: 8 }`) | Aeródromo, energía 10 | Los aviones vuelven a ella a repostar (§5.3) |
| **Radar / centro de comunicaciones** (`radar`) | `detects: 14` (ve `stealth` y aviones en el radio; muestra aviones enemigos en el minimapa); +2 de visión a todo; investiga Radar, Electrónica, Computación | Central eléctrica | Un solo `maxAlive: 2` |
| **Laboratorio avanzado** 🔶 | Opcional: las técnicas de la era caben en laboratorio, fábrica y radar. **No se añade** (menos edificios que la IA deba aprender) | — | — |
| **Torre antiaérea** (`aaTower`, categoría defensa) | Edificio de 1 casilla con `targets: 'air'`, alcance 9, `splash` pequeño | Radar | Única defensa fija contra aviones; la torre normal con «Defensa antiaérea» también dispara a `air` con menos daño |
| **Búnker** (`bunker`, defensa) | Refugio de 1 casilla para 5 de infantería; `bombProof: true` (los bombarderos no lo dañan); armadura enorme | Hormigón (era 5 según §2b; aquí en la 6) | Preparado para la fase 7 (§8c: las nucleares no destruyen búnkeres) |
| Puerto militar | — | — | Fuera: mar aplazado |

| Tecnología | Dónde | Efecto |
| --- | --- | --- |
| Edad Contemporánea | Centro urbano | `setsAge: 6` |
| **Craqueo** | Refinería | Petróleo ×1,2 de recolección |
| **Motor diésel** | Refinería | Vehículos y blindados ×1,15 de velocidad; requiere Motor de combustión |
| **Electrónica** | Radar | Todas las unidades +1 visión; artillería +1 alcance |
| **Radar** | Radar | Radares y torres AA +4 de detección y alcance; desbloquea reconocimiento en el minimapa |
| **Cohetería** | Fábrica | Desbloquea el lanzacohetes múltiple; 🔶 base del antimisil de la fase 7 |
| **Energía nuclear** | Laboratorio | Desbloquea la central nuclear |
| **Computación** 🔶 | Radar | Tecnologías −10 % de coste; IA: nada más (evitar «automatización» de §2b.5) |
| **Blindaje de acero** | Fábrica de automóviles | `armored` +2/+2 |
| **Munición perforante** | Fábrica | Artillería y antitanque: +10 contra `armored` (efecto `bonus`) |
| **Cartucho sin humo** | Fábrica | `firearm` recarga ×0,85 |
| **Defensa antiaérea** | Fábrica | Torres, castillos y centros urbanos pueden disparar a `air` (clase `antiAir` a esos edificios: efecto `addClass` 🔶, o un `stat` nuevo `antiAir: 1`) |
| **Hormigón armado** | Centro urbano | `wall`, `tower`, `castle` +25 % PV; desbloquea el búnker |
| Mejoras `up_mediumTank`, `up_heavyTank`, `up_spHowitzer`, `up_fighter`, `up_assaultInfantry`, `up_heavyMG`, `up_motorizedScout` | Su edificio | Ver §4 y §5 y `evolucion-de-unidades.md` |

## 4. Blindados y tropas motorizadas (§13 hasta la era 6)

### 4.1 Unidades comunes

| Unidad | Edificio | Clases | Coste (indicativo) | Papel | Contra |
| --- | --- | --- | --- | --- | --- |
| **Carro ligero** (`lightTank`) | Fábrica de automóviles | `armored`, `vehicle`, `antiUnit` | 120 hierro, 60 petróleo, 40 oro; pop 2 | Rápido (1,3), cañón corto (alcance 5, 18 de ataque, +20 vs `building`), armadura pierce 8 | Antitanque, carro medio, bombardero |
| **Carro medio** (`mediumTank`, `up_mediumTank`) | mismo | mismo | mejora: 400 hierro 200 petróleo | 1,0 de velocidad; 26 de ataque; +35 vs `building`; `splash` 0,6; armadura 10 | Antitanque, carro pesado |
| **Carro pesado** (`heavyTank`, `up_heavyTank`) | mismo | mismo, `siege` | mejora: 600 hierro 300 petróleo | 0,75; 36; +50 vs `building`; armadura 13; pop 3; `maxAlive: 6` | Antitanque, bombarderos, minas 🔶 |
| **Infantería mecanizada** (`mechInfantry`) | Fábrica de automóviles | `infantry`, `firearm`, `vehicle` | 60 ali, 40 hierro, 20 petróleo | Fusileros en semioruga: velocidad 1,4, +armadura, mismo ataque que el fusilero; **puede subir a murallas** (es `infantry` con alcance) | Ametralladora pesada, artillería |
| **Infantería antitanque** (`atInfantry`) | Cuartel | `infantry`, `antiTank` | 50 ali, 60 hierro | Bazuca: alcance 3, +40 vs `armored`, poca vida; el «lancero» de la era | Infantería, ametralladora |
| **Cañón antitanque** (`atGun`) | Fábrica | `artillery`, `antiTank`, `antiUnit` | 120 hierro, 40 carbón | Remolcado (0,55), alcance 8, +45 vs `armored`, poco vs edificios | Infantería, bombarderos |
| **Obús autopropulsado** (`spHowitzer`, `up_spHowitzer` desde el obús) | Fábrica (mejora) | `siege`, `artillery`, `armored`, `vehicle`, `antiUnit` | mejora: 300 hierro 150 petróleo | El obús sobre chasis: 0,9 de velocidad, armadura 7 | Antitanque, aviación |
| **Lanzacohetes múltiple** (`rocketLauncher`) | Fábrica de automóviles, requiere Cohetería | `artillery`, `vehicle`, `antiUnit` | 150 hierro, 60 petróleo, 60 oro; pop 3 | `splash` radio 2,5, `scatter` 1,5, recarga 12 s, 20 de ataque ×8 cohetes 🔶 (o un solo impacto de 60) | Todo lo que le llegue: 70 PV |
| **Antiaéreo móvil** (`aaVehicle`) | Fábrica de automóviles | `vehicle`, `antiAir` | 100 hierro, 40 petróleo | `targets: 'air'`, alcance 8, cadencia rápida; **no ataca tierra** | Carros, infantería |
| **Explorador motorizado** (`motorScout`, `up_motorizedScout` desde el húsar) | Establo (mejora) | `vehicle`, `scout`, `cavalry` 🔶 | mejora: 200 hierro 100 petróleo | 2,2 de velocidad, 10 de visión, `autoExplore`, `hunting: false` | Todo |

**Daño:** no se añade un tercer tipo de daño. Los blindados tienen mucha armadura `pierce` (las balas no los tocan: 18 − 10 = mínimo 1) y los antitanque llevan `bonus: [{ vs: 'armored' }]`, que ignora la armadura (como hoy `vs: 'building'`). Si en pruebas hace falta algo más fino, se añade `attackType: 'explosive'` después (ampliar `AttackType` y `armor` es un cambio de tipos que llega a todos los datos: mejor no ahora).

**Blindados contra edificios:** el carro medio/pesado sustituye al ariete cubierto como rompe-muros (bono vs `building`), y la IA de asedio (`siegeAI`) debe contarlos en «una pieza por cada tres tropas» (añadir `armored` a sus líneas con peso ×1,5 en la era 6).

**Límites para que sea jugable:** pop 2–3, `maxAlive` solo en el pesado y el lanzacohetes, coste de petróleo (3 pozos de 900 dan unos 15 carros pesados en toda la partida: el petróleo escasea a propósito), velocidad por relieve (los vehículos sufren el doble la pendiente: `BALANCE.movement.uphillSlowPerGrade` ×2 para `vehicle` 🔶; la roca sigue siendo intransitable).

### 4.2 Qué pasa con lo viejo

- Obús → autopropulsado y húsar → explorador: conversión gratis (mismo papel). Biplano → caza: gratis (§5).
- Ariete cubierto, cañón de campaña, coracero, carabinero: quedan **obsoletos pero útiles** (sin petróleo; sirven de escolta y de masa). No se convierten.

## 5. Aviación completa y defensa antiaérea

### 5.1 Unidades aéreas

| Unidad | Edificio | Ataca | Coste | Papel |
| --- | --- | --- | --- | --- |
| **Biplano** (era 5) ✔ | Aeródromo | tierra y aire (débil) | ✔ | Se mejora a caza (`up_fighter`, base aérea): gratis |
| **Caza** (`fighter`) | Base aérea | **aire** (bono +15 vs `air`) y tierra solo a unidades (ametralla: 10 de ataque, no edificios: `buildingsOnly: false`, `noBuildings: true` 🔶) | 120 hierro, 60 petróleo, 60 oro; pop 2; `maxAlive: 8` | Superioridad aérea y escolta; velocidad 3,2; autonomía 60 s |
| **Bombardero** (`bomber`) | Base aérea | **solo tierra**: edificios (+80 vs `building`) y tropas con `splash` radio 1,5; **no puede atacar aire** (`targets: 'ground'`) | 200 hierro, 120 petróleo, 80 oro; pop 3; `maxAlive: 6` | Lento (2,0), 90 PV, 3 bombas por salida (`ammo: 3`), luego vuelve; autonomía 90 s |
| **Avión de reconocimiento** (`reconPlane`) | Base aérea | nada | 80 hierro, 40 petróleo; pop 1; `maxAlive: 3` | Visión 14, velocidad 3,4, `stealth: true` (solo lo ven radares y torres AA en su radio de detección) y `detects: 8` (ve espías y otros aviones furtivos 🔶); autonomía 120 s. Orden «explorar» ya existe |
| Transporte aéreo 🔶 | — | — | — | **No en la 6**: cargar unidades en una unidad exige un refugio móvil (el refugio es de edificios); fase posterior |
| Helicóptero 🔶 | — | — | — | Fuera: se solapa con el caza y el reconocimiento |

**Únicos de civilización en el aire (decidido: todas las civilizaciones tienen uno).** Es una variante mejor de caza, bombardero o reconocimiento, no un tipo nuevo, para no multiplicar reglas. Nombres históricos (decisión 12); los marcados 🔶 hay que contrastar antes de implementarlos:

| Civilización | Unidad aérea única | Tipo | Rasgo | Base histórica |
| --- | --- | --- | --- | --- |
| Rusia | **Il-2 Shturmovik** | Caza de ataque a tierra | Ataca tierra con `splash` pequeño y +bono contra `armored`; blindado (armadura alta); peor contra aviones | Avión de ataque soviético más producido (1941–45) |
| China | **J-10** 🔶 | Caza | Barato y rápido (taller del mundo); menos vida | Caza de fabricación china (primer vuelo 1998); alternativa menos moderna: **Chengdu J-7** |
| Francia | **SPAD XIII** | Caza | +ataque y +velocidad; caro | Caza francés de la Primera Guerra Mundial (1917) |
| Persia / Irán | **F-14 Tomcat** | Caza | Alcance y detección (`detects`) mayores; `maxAlive: 2`; requiere Importación 🔶 | Irán adquirió F-14 en 1976 y los opera desde entonces |
| Etiopía | **Potez 25** 🔶 | Reconocimiento armado | Reconocimiento que además puede atacar tierra levemente; barato | Biplanos importados por Etiopía en los años 30 (contrastar modelos exactos) |
| Gran Bretaña → EE. UU. | **B-17 Fortaleza volante** | Bombardero | +PV, +1 bomba por salida, se defiende de cazas (ataca aire con poco daño) | Bombardero pesado estadounidense (1935–45) |

### 5.2 Reglas de combate (datos en vez de `airRule`)

Hoy `airRule` codifica «aviones: solo armas a distancia que no sean asedio ni artillería». Se sustituye por datos:

- `UnitDef.targets?: 'ground' | 'air' | 'both'` (por defecto `'ground'`; los aviones y los AA lo declaran). `BaseDef.canHitAir?: boolean` 🔶 o, más simple, la **clase `antiAir`**: puede atacar a `air` quien tenga la clase `antiAir` o sea `air` con `targets` ≠ `'ground'`. Las armas a distancia normales (fusiles, torres) **ya no alcanzan aviones** salvo con «Defensa antiaérea» (torres/castillos/centros) o las clases `machinegun` (que sí: una ametralladora sirve de AA ligera, históricamente cierto) 🔶. Decisión: `machinegun` y `firearm` con alcance ≥ 6 hacen daño a los aviones **a la mitad** (regla de combate `airDamageRule` con `DamageInfo.mul`), para que un ejército sin AA no esté indefenso pero la AA sea mucho mejor.
- `airRule` nueva (en `mods/core/air.ts`): `canAttack(a, t)`: si `t` vuela → `a` es `antiAir` o `a.targets` incluye aire; si `t` no vuela y `a` vuela → `a.targets` incluye tierra; bombardero contra `bunker` → falso.
- **Objetivo preferente:** `orders.nextTarget` elige hoy lo más cercano alcanzable. Para que el caza vaya a por aviones antes que a por infantería: `UnitDef.preferClasses?: string[]` (el motor multiplica por 0,5 la distancia de esos blancos, como `wallTargetPenalty` hace al revés). Pequeño y reutilizable (el antitanque prefiere `armored`, la ametralladora `infantry`).
- **Altura y relieve:** los aviones ignoran `heightRules` (ni ventaja ni penalización) y no sufren pendiente ✔ (ya en `systems/core.ts`). Las torres en alto no ganan alcance contra aviones 🔶.
- **Bombardeo de un punto:** orden nueva `attackGround { x, y }` (`reg.addOrder`): la unidad con `splash` dispara al punto aunque no haya nada visible (sirve también para la artillería contra la niebla). Netcommand `attackGround`. La bomba usa `projectiles` con `fixed` ✔.

### 5.3 Autonomía, munición y base (lo que da sensación de combustible)

- `UnitDef.endurance?: number` (segundos en el aire) y `ammo?: number` (disparos por salida). Estado en `entity.data.fuel` (ticks restantes) y `entity.data.ammo`; `homeBase` = id de la base aérea más cercana al despegar.
- Sistema **`AirSystem`** (prioridad después de órdenes, antes de movimiento; `save()`/`load()` no hacen falta: todo está en `entity.data`): cada segundo baja `fuel`; al llegar a 0 o `ammo` a 0, la unidad recibe la orden interna `returnToBase` (como `retaliate` de la fauna): va a su base, entra en el refugio (`garrison`, ya existe) y en 15 s sale con `fuel` y `ammo` llenos. Si no hay base: 🔶 cae (muere) al agotarse el combustible, con aviso «Sin combustible». Un avión **en la base no se ve ni se le ataca** (refugio ✔) salvo destruyendo la base, que los mata (como el refugio hoy: salen; aquí 🔶 mueren, porque un avión sin pista no vale: decidir en pruebas).
- Interfaz: barra de combustible bajo la barra de vida (como la carga de los aldeanos), botón «Volver a la base» (`commandModel`), y «Bombardear» (`ui.pickPoint` ✔). En el móvil, las mismas entradas salen solas por `commandModel.ts`; el botón de bombardeo usa el selector de punto que ya usan los poderes.
- Determinismo: contadores enteros en ticks; la base elegida por id menor entre las más cercanas (`hypot` de `fmath`).

### 5.4 Defensa antiaérea y radar

| Pieza | Qué hace |
| --- | --- |
| **Torre AA** (edificio) y **AA móvil** (unidad) | Clase `antiAir`, `targets: 'air'`, alcance 8–9, mucho daño contra `air` y `splash` pequeño (los aviones vuelan en grupo). Tecnología Radar: +alcance |
| **Defensa antiaérea** (tecnología) | Torres, castillos, centros urbanos y fortalezas ganan `antiAir` (daño normal, sin bono) |
| **Radar** (edificio) | `detects: 14`: revela `stealth` (espías y aviones de reconocimiento) en su radio, y **marca en el minimapa** cualquier avión enemigo dentro, aunque esté en la niebla (es información, no visión: `game.data.reveals` ya tiene el modelo de «zona revelada» del informe del espía) |
| **Caza** | El mejor AA es otro caza: `preferClasses: ['air']` |

Generalizar la vigilancia: hoy `espionage.ts` tiene una lista fija de vigilantes (torres, castillos, centros urbanos, espías) y un radio en `BALANCE`. Se propone `BaseDef.detects?: number` (radio) que use la misma función para espías y aviones furtivos; las definiciones actuales lo declaran como dato (torre 4, castillo 4…) y la tecnología Contraespionaje lo dobla. Es la deuda «contraespionaje como edificio» de la fase 5 resuelta de paso.

### 5.5 Dibujo e interfaz

- `Renderer`: las unidades `flying` se dibujan desplazadas `BALANCE.render.airAltitudePx` hacia arriba con una **sombra en el suelo** (la elipse de sombra ya existe para todas las unidades), por encima de edificios y sin ordenar por profundidad con las de tierra (capa propia: última). El clic sobre un avión debe acertar en el sprite elevado: `Input` usa la caja del sprite, no la del suelo (ajuste pequeño en `pick`).
- Minimapa: punto con contorno para `air`; aviones enemigos detectados por radar con un parpadeo.
- Sprites procedurales nuevos (`fighter`, `bomber`, `recon`, `tank`, `halftrack`, `rocketTruck`, `aaGun`) y hojas de imagen después (`art-src/PENDIENTES.md` las listará solas). Edificios con imagen de la era 6 para **todos** los que ya tienen hoja (el test `arttodo` lo exige; se puede aceptar temporalmente la de la era 5 declarando el fallback).
- Sonido: eventos `takeoff`, `bombDrop`, `tankFire`, `aaFire` → efectos sintéticos nuevos en `sfx.ts` y `CREDITS.md`.
- Móvil: nada específico salvo los comandos por `commandModel` y que la hoja de «Defensas» incluya torre AA, búnker y alambrada; comprobar a 30 FPS con 20 aviones (el `AirSystem` es O(aviones)).

### 5.6 IA del aire (`airAI`, plugin)

- Construye la base aérea sobre el aeródromo cuando tiene energía y ≥ 28 aldeanos; un radar por base; torres AA solo si ha visto aviones enemigos (`game.data.reveals`/visión: cuenta de entidades `air` enemigas vistas en los últimos 60 s, en `player.data.airThreat`).
- Entrena: hasta 3 cazas por defecto; si el enemigo tiene aviones, iguala su número +1 (tope `maxAlive`); 2–4 bombarderos solo si tiene petróleo de sobra (> 300) y ejército de tierra ≥ 10.
- Usa: los bombarderos van con escolta (2 cazas en `attackMove` al mismo punto) contra el edificio militar enemigo más cercano a su base, cuando el ejército de tierra ataca (`controlArmy` emite ya un objetivo de oleada: el plugin lo lee de `ctx`). Los cazas patrullan sobre la base entre oleadas (`attackMove` al centro urbano). El reconocimiento: uno, con la orden `explore` ✔.
- `controlArmy` debe **excluir `air`** de las oleadas de tierra (hoy cuenta a cualquier unidad con ataque) y la IA general no debe entrenar aviones en el bucle del paso 7 (el plugin se encarga, como `siege`).
- Pruebas: `tests/air.test.ts`: (1) un caza mata a un bombardero sin escolta y pierde contra dos cazas; (2) una torre AA derriba cazas; un fusilero solo les hace la mitad; (3) un bombardero sin base cae al agotar la autonomía; (4) el radar revela un reconocimiento `stealth`; (5) dos IAs llegan a la era 6 con semilla fija y una entrena aviones; (6) guardar y cargar a mitad de salida es idéntico; (7) `lockstep` con aviones.

## 6. Identidad de cada civilización en la era 6 (§5, resumido para implementar)

Todas ganan `eras[6]` (identidad, bonos, texto), una unidad única (en el castillo o en la fábrica de automóviles), un edificio único y una tecnología única, como en las eras anteriores. Los poderes nuevos usan `PowerDef` ✔.

| Civilización | Identidad (`eras[6].name`) | Bonos (pasivos) | Únicos | Poder / doctrina |
| --- | --- | --- | --- | --- |
| **Rusia** | **Doctrina excluyente** al entrar en la era (`excludes`): **«Unión Soviética»** (vehículos y blindados −20 %, `trainTime` ×0,8 en la fábrica de automóviles; «evacuación industrial»: fábricas a más de 30 casillas del enemigo más cercano +25 % de velocidad 🔶 es difícil de medir: sustituir por «fábricas de automóviles +30 % PV») o **«Federación Rusa»** (petróleo ×1,3 de recolección y +oro por petróleo con `gatherYield`; unidades +10 % PV, +15 % coste). La identidad visible cambia con la doctrina (`CivEraDef` no lo admite: 🔶 `TechDef.setsIdentity` o dos capas 6a/6b elegidas por `custom`) | U: **T-34** (carro medio único: más barato, menos armadura), **Katiusha** (lanzacohetes único). E: **Kombinat** (fábrica de automóviles + refinería en uno). | Tierra quemada ✔ sigue |
| **China** | «China moderna» (taller del mundo) | Unidades de la fábrica de automóviles −15 %; `tradeYield` ×1,25; +1 ruta comercial 🔶 | U: **Infantería mecanizada** (versión única más barata), **Carro ligero** único (Tipo 59 🔶 nombre genérico «Carro ligero chino»). E: **Zona económica especial** (depósito + `tradePost` + energía 10). T: **Reforma y apertura** (comercio ×1,3) | Flota del Tesoro ✔ (ligarla a aliados, pendiente de la 5) |
| **Francia** | «Francia del siglo XX» (independencia estratégica) | Tecnologías −15 % (sustituye a Imprenta: `replaces` no, se acumula con tope 🔶); unidades +15 % PV, +10 % coste | U: **Renault FT** (carro ligero único, muy barato, disponible **sin** fábrica de automóviles: solo fábrica), **Legionario** (infantería de asalto única). E: **Arsenal moderno**. T: **Independencia estratégica** (energía +50 % por central) | Legión Extranjera ✔ (sube a la 6 con `maxAge`) |
| **Persia / Irán** | «Irán del siglo XX» (recurso estratégico) | Petróleo ×1,4 de recolección; `gatherYield` petróleo → oro 0,3; refinería −50 % | U: **Camión blindado** (mecanizada barata), 🔶 **Misil táctico** (lanzacohetes con alcance 14 y `maxAlive: 2`; o dejarlo para la fase 7). E: **Refinería nacional** (`maxAlive: 1`, energía 10). T: **Nacionalización** (petróleo +300 de golpe, `grant`) | Poder **Embargo** (diplomacia ✔: embargo comercial contra un rival durante 180 s sin su consentimiento) |
| **Etiopía** | «Etiopía del siglo XX» (resistencia y diplomacia) | **Resistencia** ✔ (ya existe como poder: ampliar a la 6); aliados: `tradeYield` ×1,3; unidades +armadura en terreno alto (ya `heightRules`) | U: **Patriota (arbegnoch)**: infantería `stealth` con fusil (guerrilla: invisible lejos de vigilancia, como el espía; ataca y se revela 10 s), **Carro ligero** (comprado: requiere Importación de armas, −25 %). E: **Sede diplomática** (propuestas de paz/alianza aceptadas por la IA con +buena voluntad; `maxAlive: 1`). T: **Organización de la Unidad Africana** (alianzas: visión compartida ya ✔; +oro por aliado) | Nagarit ✔ |
| **Gran Bretaña → Estados Unidos** | **«Estados Unidos»** (traspaso automático al entrar en la era; decisión §11.3b por defecto; la capa 6 `replaces: [4]` quita el crédito y mantiene la logística) | Producción en masa: vehículos y aviones −15 %; petróleo propio: pozos +1 por jugador 🔶 (colocación dependiente de civilización: no existe; sustituir por petróleo ×1,2) | U: **Sherman** (carro medio único: más barato y rápido), **Marine** (infantería de asalto única con bono contra `wall`/`bunker`), **Ranger** 🔶 (si sobra presupuesto). E: **Arsenal** (fábrica + fábrica de automóviles en uno, `trainTime` ×0,85), **Base avanzada** 🔶 (base aérea con más refugio). T: **Préstamo y arriendo** (Lend-Lease) | Poder **Ayuda a aliados**: envía 300 de cada recurso a un aliado (tributo ✔ sin comisión) y el aliado gana +10 % de velocidad de entrenamiento 90 s |

Notas: (a) **nombres históricos en todo** (decisión 12): los únicos ya los tienen (T-34, Sherman, Renault FT, Katiusha); el «Carro ligero chino» pasa a **Tipo 59** 🔶 (carro medio de producción china desde 1959; contrastar) y las unidades comunes llevan el nombre de un modelo muy difundido de la época (§12); (b) **decidido:** la identidad de Rusia se llama «Rusia del siglo XX» y la doctrina (Unión Soviética / Federación Rusa) solo cambia bonos y unidades, sin dato nuevo en `CivEraDef`; (c) cada civilización suma además su **unidad aérea única** (§5.1).

## 7. Interfaz (escritorio y móvil), guardado y red

- **Comandos** nuevos en `ui/commandModel.ts` (salen en los dos HUD): Volver a la base, Bombardear punto, Atacar suelo (artillería), construir torre AA / búnker / alambrada (pestaña Defensas), mejoras `up_*` en sus edificios (automático).
- **HUD:** recurso petróleo (`minAge: 6` ✔ automático), celda de energía (nuevo), barra de combustible/munición en la unidad seleccionada, aviso «Sin energía» en el rechazo (`game.reject`).
- **Minimapa:** marca de aviones y radares (`addMinimapOverlay` ✔ para los radios de detección).
- **Selector de civilizaciones:** la línea de eras ya lista las capas ✔; mostrar la doctrina rusa como dos textos.
- **Guardado:** `fuel`, `ammo`, `homeBase`, `airThreat` son datos simples en `entity.data`/`player.data`; el recurso `oil` es una clave más en `p.res`; la energía se recalcula. **No hace falta subir `SAVE_VERSION`** salvo que se cambie `CivEraDef` (variantes) o se añada el tercer tipo de daño. `tests/save.test.ts` con una partida en la era 6.
- **Red:** órdenes nuevas `attackGround`, `returnToBase` (interna), `exchange` 🔶 son `NetCommand`/órdenes de mod; sin `Math.*` en `AirSystem`; `npm run lockstep` y `npm run engines` con `--edad=6`.
- **Catálogo:** `npm run catalog` tras cada sub-fase; las notas «pendiente de fase 6» con `until` en `catalogo-notas.json`.

## 8. Qué necesita el motor (puntos de extensión nuevos)

| # | Punto | Tamaño | Sub-fase | Área / modelo |
| --- | --- | --- | --- | --- |
| 1 | Energía como capacidad (`energyProvided`, `energyCost`, `Player.energy`, comprobación en `rules.ts`, HUD) | Pequeño-medio | 6a | Motor, Opus medio |
| 2 | Efecto `bonus` en tecnologías y capas (`Player.getBonuses(def)`, `combat.ts`) | Pequeño | 6a | Motor, Opus medio |
| 3 | `CivDef.hides` (`unitAvail`/`buildingAvail`, catálogo, IA) | Pequeño | 6a | Motor, Opus medio |
| 4 | `BaseDef.detects` generalizando la vigilancia de `espionage.ts`; `stealth` para unidades de combate (se revelan al atacar) | Pequeño-medio | 6c | Motor, Opus medio |
| 5 | `targets`, clase `antiAir`, `preferClasses`, regla de daño a la mitad; retirar `airRule` fija | Medio | 6c | Motor, Opus alto |
| 6 | `AirSystem`: `endurance`, `ammo`, `homeBase`, orden interna `returnToBase`, repostaje en refugio | Medio | 6c | Motor, Opus alto |
| 7 | Orden `attackGround` (+ `NetCommand`) | Pequeño | 6c | Motor, Opus medio |
| 8 | Render: altura de vuelo, sombra, capa aérea, `pick`, minimapa | Medio | 6c | Gráficos, Sonnet medio (Opus si toca `TerrainGL`: no debería) |
| 9 | `replaces` para mejorar en el sitio aeródromo → base aérea (ya existe ✔) y torres | Nada | 6a | — |
| 10 | `bombProof` (o regla de combate del mod) para búnkeres | Pequeño | 6c | Datos + regla |
| 11 | IA: `controlArmy` sin `air`; `siegeAI` con `armored`; `gunpowderAI.WANTS` con los edificios de la 6; `ratios` con petróleo; plugin `airAI` | Medio | 6b, 6c, 6e | IA, Sonnet alto |
| 12 | 🔶 `CivEraDef.variants` para la identidad por doctrina (solo si se quiere «URSS» como nombre) | Pequeño | 6d | Motor, Opus medio |
| 13 | Generadores (todos los mapas, reales incluidos) colocan `oilField`; test | Pequeño | 6a | Contenido, Sonnet medio |

Nada de lo anterior cambia la arquitectura: son campos en `types.ts`, un sistema con prioridad y una regla de combate de datos. Lo más delicado es el 5–6 (quién ataca a quién y el ciclo salida-vuelta), por el determinismo y porque toca `orders.ts`/`combat.ts`, el corazón del motor.

## 9. Sub-fases implementables por sesiones independientes

Orden, tamaño (S/M/L/XL en sesiones de trabajo), riesgo, criterio de «hecho», modelo y esfuerzo según `docs/flujo-de-trabajo.md`, y archivos para no pisarse. Cada una en su rama `feat/fase6-<letra>` y se fusiona en orden; las paralelas no tocan los mismos archivos.

| Sub-fase | Contenido | Tamaño | Riesgo | Depende de | Hecho cuando | Modelo / esfuerzo | Archivos propios |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **6-pre** (**decidido: se hace antes de la 6**; puede ir en paralelo a 6a porque no comparte archivos) | Líneas que terminan en la era 2–3 (`evolucion-de-unidades.md` §5, prioridad A): campeón, alabardero, arbalestero, cazador, húsar, coracero, carabinero, `up_rifleman`, herrería 2–3, economía 3–4 | M | Bajo | — | Cada edificio militar tiene algo de su edad en las eras 3–5; test de IA con cuartel de edad ≥ 3; `simulate` y `catalog` | Contenido · **Sonnet 5.5, medio** | `mods/core/lines.ts` (nuevo), `techs.ts` (solo añadir), `catalogo-notas.json` |
| **6a** Era, petróleo, energía y edificios comunes | `addAge(6)`, `contemporaryAge`, recurso `oil` + nodo + colocación en todos los mapas, energía (motor #1), efecto `bonus` (#2), `hides` (#3), **compraventa `exchange` en el mercado** (§3.1), refinería, central eléctrica y nuclear, radar (sin detección aérea todavía: solo `detects` de espías si #4 se adelanta), fábrica de automóviles **vacía**, base aérea (`replaces`) vacía, búnker, técnicas económicas de la 6, HUD de energía, `ratios`/`villagersForAge`, `gunpowderAI.WANTS` | L | Medio | 6-pre (decidido: antes) | Las 6 IAs llegan a la era 6 con semilla fija (`tests/contemporary.test.ts`) y construyen refinería y central; guardado idéntico; `civIncomplete` marca a todas | Motor y reglas para #1–#3 · **Opus 5.5, medio**; el resto es contenido (misma sesión, o una de **Sonnet 5.5, alto** tras los puntos del motor) | `mods/core/contemporary.ts` (nuevo), `world.ts`, `maps.ts`, `real-maps`, `game/Player.ts`, `rules.ts`, `types.ts`, `HUD.ts`/`MobileHUD.ts` (celda de energía), `balance.ts` |
| **6b** Blindados y artillería moderna | Carro ligero/medio/pesado, mecanizada, antitanque (infantería y cañón), obús autopropulsado, lanzacohetes, explorador motorizado, Blindaje, Munición perforante, Cartucho sin humo, Motor diésel; `siegeAI` con `armored`; sprites procedurales; sonidos | L | Medio-alto (balance) | 6a | `tests/armor.test.ts`: antitanque vence a carros, carros rompen murallas, fusileros no rascan; IA entrena carros y los usa contra edificios; `simulate` 30 min sin bloqueo | Contenido · **Sonnet 5.5, alto** (el balance exige pensar; no toca el motor si #2 está hecho) | `mods/core/armor.ts` (nuevo), `siege.ts` (plugin: añadir línea), `render/sprites` (vehículos), `sfx.ts` |
| **6c1** Motor del aire | #4–#8, #10: `targets`/`antiAir`/`preferClasses`, `AirSystem`, `attackGround`, `detects`, render con altura, minimapa; `airRule` por datos; biplano adaptado | L | **Alto** (toca `orders.ts`, `combat.ts`, determinismo) | 6a (solo por la era; podría empezar sobre `main` con el biplano de la 5 y fusionarse después) | `tests/air.test.ts` (1)–(4), (6), (7) con unidades de prueba del test; `lockstep` y `engines` verdes; render verificado en el navegador | Motor y reglas · **Opus 5.5, alto** | `game/air.ts` (nuevo), `systems/AirSystem.ts` (nuevo), `orders.ts`, `combat.ts`, `espionage.ts` (detección), `types.ts`, `render/Renderer.ts`, `Minimap.ts`, `Input.ts` (pick) |
| **6c2** Contenido del aire y antiaérea | Caza, bombardero, reconocimiento, `up_fighter`, torre AA, AA móvil, Radar/Electrónica/Cohetería/Defensa antiaérea, plugin `airAI`, comandos en `commandModel`, sprites y sonidos | M | Medio | 6c1, 6a (y 6b para el AA móvil: si no está, va a la fábrica) | `tests/air.test.ts` (5); IA con aviones gana a IA sin AA y pierde contra AA en escenario fijo; móvil a 30 FPS con 20 aviones | Contenido + IA · **Sonnet 5.5, alto** | `mods/core/air.ts` (nuevo), `commandModel.ts`, `sprites`, `sfx.ts` |
| **6d** Identidades de civilización | `eras[6]` de las seis, únicos (§6) incluida la **unidad aérea única de cada una** (§5.1), doctrina rusa (solo bonos), traspaso automático a EE. UU., poderes Embargo y Ayuda a aliados, Legión Extranjera y Resistencia a la 6 | M | Medio | 6a (bonos y edificios); 6b y 6c2 para los únicos de vehículos y aviones (se pueden añadir en dos commits) | Las seis civilizaciones dejan de ser «incompletas»; catálogo sin huérfanos; `tests/civEras.test.ts` ampliado; `simulate --civs` por pares | Contenido · **Sonnet 5.5, medio** | `mods/core/civ-contemporary.ts` (nuevo), `civs.ts`/`civ-*.ts` (solo añadir `eras[6]`), `powers.ts` |
| **6e** IA, balance y pulido | IA que usa todo lo de la era (únicos, energía, petróleo, aviación con escoltas), `defenseAI` con torre AA, balance con `simulate` largas y `bench`, catálogo, decisiones.md, `art-src/PENDIENTES.md`, prompts de arte | M | Medio | 6a–6d | 4 IAs en Arabia 40 min: todas en la 6, con vehículos y aviones, sin atascos; `bench` dentro de `docs/rendimiento.md`; `npm test` verde; comparativa del catálogo razonable | IA rival · **Sonnet 5.5, alto** (Opus alto si hay atascos raros) | `AISystem.ts` (ajustes), plugins, `balance.ts`, docs |
| **6f** Arte y sonido con imágenes | Hojas de imagen de vehículos, aviones y edificios de la 6; `ART` | M | Bajo | 6b, 6c2 | `arttodo` verde; lista en `PENDIENTES.md` | Gráficos y arte · **Sonnet 5.5, medio** | `mods/art/`, `public/sprites/`, `docs/prompts-nano-banana.md` |
| **6g** Revisión | Pasar `npm test`, `simulate`, `lockstep`, `engines`, revisar diffs y fusionar | S | Bajo | cada sub-fase | Verde | Revisión · **Haiku 5.5, bajo** | — |

**Paralelismo:**
- `6-pre` ∥ todo (archivos nuevos).
- Tras 6a: **6b ∥ 6c1 ∥ 6d(bonos)**. 6b no toca el motor; 6c1 no toca datos salvo el biplano; 6d solo `civ-*.ts`. Único choque posible: `types.ts` (6a lo deja cerrado antes) y `siege.ts` (6b añade una línea; 6c no lo toca).
- Tras 6c1: 6c2 ∥ 6f(vehículos). Tras 6b y 6c2: 6d(únicos de vehículos/aviones), 6e.
- Tamaño total: ~8–10 sesiones; la ruta crítica es 6a → 6c1 → 6c2 → 6e.

**Sesión «Diseño de algo grande» (Opus alto)** solo si al empezar 6c1 aparecen dudas sobre el ciclo de combate aéreo; este documento debería bastar.

## 10. Riesgos principales y cómo se contienen

| Riesgo | Contención |
| --- | --- |
| Balance de la era (blindados y bombarderos que lo arrasan todo) | `maxAlive`, petróleo escaso, antitanque y AA baratos; `tests/armor` y `tests/air` con escenarios de contadores; `simulate` de 40 min en 6e |
| Determinismo del aire (vuelo sin A*, repostaje, elección de base) | Contadores enteros en ticks, `fmath`, desempate por id; `lockstep` y `engines` con `--edad=6` |
| Rendimiento en móvil (más unidades rápidas y capa de render) | `AirSystem` O(aviones); capa aérea sin ordenación; `bench` con 20 aviones; tope de 8+6+3 por jugador |
| IA que no entiende la energía o el petróleo | Energía como población (la IA ya «construye casas»); petróleo en `ratios`; plugin con reserva (`reserve`) como `gunpowderAI` |
| Mapas sin petróleo (reales, mods) | Test de todos los mapas; fallback: si no hay pozos, el centro urbano de la era 6 produce 0,2 de petróleo/s 🔶 (evitar: es un parche) |
| Arte: cada edificio con hoja necesita la imagen de la era 6 (`arttodo` falla) | Fallback explícito a la hoja de la 5 declarado en `ART` hasta 6f |
| Sensibilidad política (URSS/Rusia, EE. UU., Irán) | Solo mecánicas y fechas (§1.3 de `civilizaciones.md`); textos revisados en 6d; nada de juicios ni banderas actuales en el arte 🔶 |

## 11. Decisiones del usuario (2026-11-14)

Las doce preguntas abiertas de la primera versión quedaron resueltas así (también en `docs/decisiones.md`):

1. **Energía como capacidad** (como la población), no como flujo por tick (§3.2).
2. **Sin mantenimiento** de petróleo por minuto: solo coste de entrenamiento y autonomía de los aviones (§3.3).
3. **Rusia:** la doctrina (Unión Soviética / Federación Rusa) solo cambia bonos y unidades; la identidad se llama «Rusia del siglo XX» (§6).
4. **Traspaso Gran Bretaña → EE. UU. automático** al entrar en la era 6 (cierra §11.3b de `civilizaciones.md`).
5. **Los aviones sin base caen** al agotar la autonomía (§5.3).
6. **Fusileros, ametralladoras y torres** hacen **la mitad de daño** a los aviones hasta tener antiaérea (§5.2).
7. **Las líneas que terminan en la era 2–3 se hacen antes de la fase 6** (sub-fase 6-pre, §9).
8. **Se mantienen los edificios por tipo de arma**: el cuartel termina en el Campeón; la infantería de fuego vive en la fábrica de pólvora y la fábrica (sin «infantería de línea en el cuartel»).
9. **Todas las civilizaciones tienen una unidad aérea única** (§5.1).
10. **La compraventa en el mercado (`exchange`) va dentro de 6a** (§3.1).
11. **Confirmado:** la fase 7 (armas nucleares) va antes que la era 7, y la central nuclear de la 6 es solo energía.
12. **Nombres históricos** también en lo común (§12).

## 12. Nombres históricos de las unidades comunes (decisión 12)

Lo común lo tienen todas las civilizaciones, así que no puede llevar el modelo de una sola de ellas. Criterio: **el modelo más difundido o exportado de su tipo en la época**, con el tipo genérico en la descripción («Carro ligero: Vickers 6-Ton…»). Todos 🔶 hasta contrastarlos en 6b/6c2; si alguno no convence, se cae al tipo genérico:

| Unidad común | Nombre propuesto | Por qué |
| --- | --- | --- |
| Carro ligero | **Vickers 6-Ton** | Carro ligero británico (1928) exportado a una docena de países y copiado (T-26, 7TP) |
| Carro medio | **Panzer IV** 🔶 | El carro medio más producido de Alemania (no jugable), presente en todos los frentes; alternativa neutra: «Carro medio» |
| Carro pesado | **Tiger I** 🔶 | El carro pesado más conocido; alternativa: «Carro pesado» |
| Infantería mecanizada | **Semioruga M3** | Transporte estadounidense producido en masa y cedido por *Lend-Lease* a muchos ejércitos |
| Infantería antitanque | **Bazuca** | Nombre común del lanzacohetes de infantería (M1, 1942) |
| Cañón antitanque | **Pak 40** 🔶 o «Cañón antitanque de 75 mm» | El antitanque remolcado más extendido |
| Obús autopropulsado | **M7 Priest** | Obús autopropulsado estadounidense de uso aliado generalizado |
| Lanzacohetes múltiple | **Lanzacohetes múltiple** (la Katiusha es el único ruso) | Sin modelo común neutro |
| Antiaéreo móvil | **Bofors de 40 mm** | Cañón AA sueco usado por casi todos los ejércitos del siglo XX |
| Explorador motorizado | **Jeep** | Vehículo ligero de reconocimiento producido en masa y exportado |
| Caza | **Caza monoplano** 🔶 (o **Hawker Hurricane**) | Difícil elegir un modelo común; el Hurricane se exportó mucho pero es británico |
| Bombardero | **Bombardero bimotor** 🔶 | Idem |
| Avión de reconocimiento | **Avión de reconocimiento** | Idem |
| Torre antiaérea | **Torre antiaérea** | Edificio |
| Ametralladora pesada (era 6) | **Ametralladora Maxim** | La ametralladora refrigerada por agua más difundida (1884–1945) |
