# Age of Empires II · Edición local

Un juego de estrategia en tiempo real inspirado en **Age of Empires II**, que se juega en el navegador y corre
entero en tu ordenador. Está pensado para **crecer**: todo el contenido (unidades, edificios, tecnologías,
civilizaciones, mapas, reglas) son datos registrados por *mods*, así que añadir cosas nuevas no exige tocar el motor.

> Los gráficos se dibujan por código; no se usa ningún archivo del juego original.

## Cómo jugar

**Opción fácil (macOS):** doble clic en `Jugar.command`. La primera vez instala las dependencias; después abre
el juego en el navegador.

**Desde la terminal:**

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:5173>.

### Qué incluye

- 4 edades (Oscura, Feudal, Castillos, Imperial) con requisitos de edificios, como en el original.
- Economía completa: aldeanos, comida (bayas y granjas), madera, oro y piedra, edificios de depósito, población y casas.
- 17 unidades: milicia y sus mejoras, lanceros, arqueros, hostigadores, caballería, ariete y una unidad única por civilización.
- 13 edificios, incluidos torres, centro urbano y castillos que disparan flechas.
- Más de 30 tecnologías: economía, herrería, mejoras de unidades y tecnologías únicas.
- 4 civilizaciones (británicos, francos, godos y mongoles) con bonificaciones propias.
- Combate con tipos de ataque (cuerpo a cuerpo y perforante), armaduras, bonificaciones contra clases y proyectiles.
- IA enemiga en tres dificultades, que gestiona la economía, avanza de edad, investiga, se defiende y ataca en oleadas.
- Mapas: Arabia, Selva Negra, Lagos y **Pirineos** (cordillera nevada con puertos de montaña, ríos con vados y pinares), más Oasis (en el mod de ejemplo).
- Relieve: colinas y montañas con iluminación, y ventaja de altura en combate (+25 % desde arriba, -25 % desde abajo).
- Estética inspirada en el original: terreno con texturas detalladas y agua animada, edificios que cambian con la edad (madera y paja → entramado y tejas → piedra), retratos de unidades e interfaz de piedra y oro.
- Música medieval generativa (laúd, flauta dulce, viela, zanfona, arpa y tambores) que se compone sobre la marcha: nunca se repite, suma instrumentos con cada edad, cambia a un tema de batalla en combate y tiene fanfarrias al subir de edad, ganar o perder.
- Niebla de guerra, minimapa, grupos de unidades, puntos de reunión, ataque-movimiento y colas de producción.
- Opciones de partida: rivales (hasta 5), mapa, tamaño, recursos, edad inicial, victoria, visibilidad, población y velocidad.

### Controles

| Acción | Control |
| --- | --- |
| Seleccionar | Clic izquierdo; arrastrar para seleccionar varias unidades |
| Todas las unidades de un tipo en pantalla | Doble clic |
| Ordenar (mover / atacar / recolectar / construir / reunión) | Clic derecho |
| Añadir a la selección, encadenar construcciones o entrenar 5 | Mayús |
| Mover la cámara | Flechas, bordes de la pantalla o botón central |
| Zoom | Rueda del ratón |
| Botones de comando | `Q W E R T` / `A S D F G` / `Z X C V B` |
| Centro urbano / aldeano inactivo / ejército inactivo | `H` / `.` / `,` |
| Crear grupo / seleccionar grupo | `Ctrl+1…9` / `1…9` (pulsado dos veces centra la cámara) |
| Centrar en la selección | `Espacio` |
| Eliminar | `Supr` |
| Pausa | `P`, `F10` o `Esc` |
| Activar / silenciar la música | `M` (volumen en el menú) |

## Estructura del proyecto

```
src/
  core/        Tipos de datos, Registry (registro de contenido), eventos y constantes
  game/        Simulación: Game, entidades, jugadores, mapa, caminos (A*), combate,
               órdenes de unidades, comandos y reglas de disponibilidad
    systems/   Sistemas que se ejecutan cada tick (movimiento, producción, combate, IA...)
  audio/       Música generativa con Web Audio (sin archivos de sonido)
  render/      Cámara isométrica con relieve, terreno en WebGL (TerrainGL), texturas procedurales,
               sprites, retratos de la interfaz y minimapa
  ui/          HUD, menús y entrada de ratón y teclado
  app/         Ciclo de vida: menú → partida → menú
  mods/
    core/            Todo el contenido base (datos puros, fácil de leer y editar)
    extra-content/   Mod de ejemplo: unidad, tecnología, sprite y mapa nuevos
    treasure-hunt/   Mod de ejemplo: reglas nuevas mediante un sistema propio
scripts/
  simulate.ts  Partida IA contra IA sin gráficos, para probar cambios rápidamente
```

## Arquitectura en 1 minuto

- **Registry** (`src/core/Registry.ts`): contiene todo el contenido y comportamiento enchufable. Cada partida
  construye uno nuevo a partir de los mods activos.
- **Mods** (`src/mods/`): cada mod tiene una función `register(reg)` que añade o modifica contenido. El propio
  juego base es un mod (`core`).
- **Definiciones** (`src/core/types.ts`): `UnitDef`, `BuildingDef`, `TechDef`, `CivDef`, `MapTypeDef`,
  `VictoryDef`... Son datos, sin lógica.
- **Efectos**: las tecnologías y las civilizaciones modifican estadísticas con efectos declarativos
  (`stat`, `gatherRate`, `cost`, `upgrade`, `grant` o `custom`). Las estadísticas se calculan como valor base + modificadores.
- **Sistemas**: cada tick (20 por segundo) se ejecutan en orden de prioridad. Se pueden añadir o sustituir.
- **Órdenes**: `move`, `attack`, `attackMove`, `gather` y `build` son manejadores registrados; puedes crear otras.
- **Comandos** (`src/game/commands.ts`): todas las acciones de los jugadores (humano o IA) pasan por aquí. Es el
  punto natural para añadir guardado de partida, repeticiones o multijugador.
- **Eventos** (`game.events`): `unitTrained`, `entityDied`, `ageReached`, `techResearched`, `buildingCompleted`...
  Los mods pueden escucharlos.

## Cómo añadir contenido

### 1. Crear un mod

Crea `src/mods/mi-mod/index.ts`:

```ts
import type { GameMod } from '../../core/types';

export const miMod: GameMod = {
  id: 'mi-mod',
  name: 'Mi mod',
  description: 'Lo que hace mi mod.',
  defaultEnabled: true,
  register(reg) {
    // aquí añades cosas (ver ejemplos de abajo)
  },
};
```

Y añádelo a la lista de `src/mods/index.ts`. Aparecerá en el menú principal para activarlo o desactivarlo.

### 2. Una unidad nueva

```ts
reg.addUnit({
  id: 'samurai', name: 'Samurái', icon: '🗡️', description: 'Infantería de élite.',
  classes: ['infantry'], cost: { food: 60, gold: 30 }, trainTime: 9, trainedAt: ['barracks'],
  hp: 60, attack: 8, attackType: 'melee', reloadTime: 1.9, armor: { melee: 1, pierce: 1 },
  bonus: [{ vs: 'unique', amount: 10 }], speed: 1, los: 4, pop: 1, age: 2,
  sprite: 'humanoid', spriteParams: { weapon: 'sword', helmet: true, armor: true },
});
```

El botón aparece solo en el edificio indicado en `trainedAt`. Con `civs: ['japanese']` la unidad sería exclusiva de esa civilización.

### 3. Un edificio nuevo

```ts
reg.addBuilding({
  id: 'market', name: 'Mercado', icon: '⚖️', category: 'economy', description: 'Comercio.',
  classes: ['building'], cost: { wood: 175 }, buildTime: 60, size: 4,
  hp: 2100, armor: { melee: 0, pierce: 7 }, los: 6, age: 1,
  sprite: 'building', spriteParams: { style: 'hall', wall: '#d8c49a', roof: '#3d6b8a' },
});
```

Estilos de edificio disponibles: `tc`, `house`, `hall` (con `stable`, `target` o `weapons`), `smithy`, `shed` (con `pile: 'wood' | 'stone'`),
`mill`, `tower` y `castle`. Los materiales cambian solos con la edad del jugador; `material: 'stone'` fuerza la piedra.

### 4. Una tecnología

```ts
reg.addTech({
  id: 'chainMail', name: 'Cota de malla', icon: '⛓️', description: 'Infantería +1/+1 armadura.',
  cost: { food: 200, gold: 100 }, researchTime: 55, age: 2, researchedAt: 'blacksmith',
  requiresTechs: ['scaleMail'],
  effects: [
    { type: 'stat', target: { classes: ['infantry'] }, stat: 'armorMelee', op: 'add', value: 1 },
    { type: 'stat', target: { classes: ['infantry'] }, stat: 'armorPierce', op: 'add', value: 1 },
  ],
});
```

Tipos de efecto: `stat` (cualquier estadística), `gatherRate` (velocidad de recolección), `cost` (coste de
unidades, edificios o tecnologías), `upgrade` (convierte una unidad en otra), `grant` (da recursos) y `custom`
(cualquier función).

### 5. Una civilización

```ts
reg.addCiv({
  id: 'japanese', name: 'Japoneses', description: 'Civilización de infantería.',
  bonusText: ['Infantería ataca un 25% más rápido'],
  bonuses: [{ type: 'stat', target: { classes: ['infantry'], kind: 'unit' }, stat: 'reloadTime', op: 'mul', value: 0.75 }],
});
```

### 6. Un mapa

```ts
reg.addMapType({
  id: 'islas', name: 'Islas', description: 'Mucho agua.',
  generate(gen) {
    gen.fill('water');
    const starts = gen.startPositions(0.35);
    starts.forEach(s => gen.blob(s.x, s.y, 16, (x, y) => gen.set(x, y, 'grass')));
    gen.shores();
    gen.players.forEach((p, i) => gen.base(p, starts[i]));
    gen.forests(8, 2, 4, starts);
  },
});
```

`MapGenerator` (`src/game/MapGenerator.ts`) ofrece utilidades como `blob`, `forest`, `cluster`, `scatter`,
`protectCircle`, `protectLine`, `shores` o `base`, y para el relieve `hill`, `hills`, `addHeight`, `flatten`,
`smoothHeights` y `levelWater` (deja horizontal la superficie del agua). Mira `pyrenees` en
`src/mods/core/maps.ts` para un ejemplo completo con montañas, puertos y ríos.

### Un terreno nuevo

```ts
reg.addTerrain({ id: 'lava', name: 'Lava', color: [180, 60, 20], variance: 20, walkable: false, buildable: false, pattern: 'lava' });
```

La textura sale de `pattern`. Los patrones incluidos son `grass`, `dirt`, `forest`, `sand`, `desert`, `water`,
`shallows`, `snow` y `rock`; si el patrón no existe, se genera una textura a partir de `color`. Puedes registrar
patrones nuevos con `terrainPatterns.set('lava', (t, p) => { ... })` (ver `src/render/terrainPatterns.ts`). Con
`water: true` el terreno se anima como agua.

### 7. Reglas nuevas (sistemas y eventos)

```ts
reg.addSystem('regicida', game => ({
  update(dt) { /* se ejecuta 20 veces por segundo */ },
}), 70);

reg.onGameStart(game => {
  game.events.on('entityDied', ({ entity, killer }) => { /* ... */ });
});
```

Mira `src/mods/treasure-hunt/` para un ejemplo completo.

### 8. Modificar contenido existente

```ts
reg.patchUnit('knight', u => { u.hp = 120; u.cost = { food: 60, gold: 70 }; });
reg.patchCiv('franks', c => c.bonuses.push(/* ... */));
reg.setup.startingUnits.push({ unit: 'militia', count: 2 });
```

### 9. Gráficos propios

Los sprites son funciones de dibujo registradas con un id. Puedes crear otros (mira el elefante en
`src/mods/extra-content/`) o usar imágenes:

```ts
import { imageSprite } from '../../render/imageSprite';
reg.addSprite('mi-caballero', imageSprite('/sprites/caballero.png', { width: 48, height: 48, anchorX: 24, anchorY: 44, flip: true }));
```

Las imágenes van en una carpeta `public/` en la raíz del proyecto.

## Probar cambios sin gráficos

```bash
npm run simulate -- 30 arabia 123
```

Juega una partida IA contra IA de 30 minutos en el mapa Arabia (semilla 123) y muestra la evolución de cada
jugador. Tarda unos segundos y es útil para detectar errores o desequilibrios tras añadir contenido.

Si el navegador muestra un aviso en la consola al arrancar (`[mods] Problemas de contenido`), algún mod hace
referencia a algo que no existe (un edificio, una tecnología o un sprite).

## Ideas para seguir ampliando

- Murallas y puertas, guarnición en edificios
- Monjes (curar y convertir), mercado y comercio
- Barcos y mapas de agua
- Caza (ciervos, jabalíes) y pastoreo de ovejas
- Formaciones y posturas de combate
- Guardado y carga de partida (todas las acciones pasan por `Commands`)
- Efectos de sonido (golpes, flechas, construcción)
- Multijugador en red local
