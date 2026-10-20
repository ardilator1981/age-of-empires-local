# Age of Empires II · Edición local

Un juego de estrategia en tiempo real inspirado en **Age of Empires II**, que se juega en el navegador y corre
entero en tu ordenador. Está pensado para **crecer**: todo el contenido (unidades, edificios, tecnologías,
civilizaciones, mapas, reglas) son datos registrados por *mods*, así que añadir cosas nuevas no exige tocar el motor.

> Los gráficos se dibujan por código o salen de imágenes propias (ver [Arte con imágenes](#arte-con-imágenes));
> no se usa ningún archivo del juego original.

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
    art/       Carga de imágenes: texturas de terreno, hojas de sprites y color del jugador
  ui/          HUD, menús y entrada de ratón y teclado
  app/         Ciclo de vida: menú → partida → menú
  mods/
    core/            Todo el contenido base (datos puros, fácil de leer y editar)
    extra-content/   Mod de ejemplo: unidad, tecnología, sprite y mapa nuevos
    treasure-hunt/   Mod de ejemplo: reglas nuevas mediante un sistema propio
    art/             Qué unidades, edificios y recursos usan imágenes en vez de sprites procedurales
scripts/
  simulate.ts      Partida IA contra IA sin gráficos, para probar cambios rápidamente
  fix-textures.mjs Hace repetibles las texturas de terreno (npm run fix-textures)
public/sprites/    Imágenes del juego (texturas, hojas de sprites) y ejemplos
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

Para sustituir los dibujos por imágenes pieza a pieza (generadas con IA o dibujadas a mano) mira la sección
[Arte con imágenes](#arte-con-imágenes).

## Arte con imágenes

Los prompts para generar todo el arte con Nano Banana (terreno, árboles, recursos, animales, edificios por
edad, unidades y sus animaciones, efectos, decoración e interfaz) están en
[docs/prompts-nano-banana.md](docs/prompts-nano-banana.md).

El motor puede usar imágenes en lugar de los gráficos procedurales, **pieza a pieza**: lo que tenga imagen se
dibuja con ella y todo lo demás sigue dibujándose por código. Si falta un archivo, o tiene un error, el juego
avisa en la consola (`[arte] ...`) y usa el dibujo procedural, así que nunca se rompe nada.

### Dónde va cada cosa

```
public/sprites/
  terrain/      Texturas de terreno: grass, dirt, forest, water, sand, shallows, snow, rock, desert (.png/.jpg/.webp)
  units/        Hojas de unidades: militia.png + militia.json (+ militia-mask.png)
  buildings/    Hojas de edificios: house.png + house.json (+ variantes por edad y máscara)
  resources/    Árboles, minas, arbustos...
  ejemplo/      Hojas y textura de prueba (ver «Comprobar el resultado»)
art-src/terrain/  Originales de las texturas antes de hacerlas repetibles (lo crea npm run fix-textures)
src/mods/art/     Lista de qué unidades, edificios y recursos usan qué hoja
```

Especificaciones comunes: vista isométrica 2:1, luz desde arriba a la izquierda, dibujado **a 2x** (el doble de
lo que ocupa en pantalla a zoom 1), fondo recortado a PNG con transparencia. Los edificios van **sin sombra
proyectada**: la pone el motor.

### 1. Texturas de terreno

1. Guarda cada textura como `public/sprites/terrain/<patrón>.png` (también vale `.jpg` o `.webp`), donde
   `<patrón>` es el `pattern` del terreno: `grass`, `dirt`, `forest`, `water`, `sand`, `shallows`, `snow`, `rock`
   o `desert`. Son imágenes **cuadradas vistas desde arriba**, idealmente de 1024x1024.
2. Hazlas repetibles:

   ```bash
   npm run fix-textures
   ```

   Desplaza cada imagen un 50 %, funde las costuras e iguala la luz (las imágenes generadas suelen traer una
   viñeta que, repetida, formaría una cuadrícula). Avisa si alguna no es cuadrada. Guarda el original en
   `art-src/terrain/` y recuerda qué ha procesado, así que puedes ejecutarlo cada vez que añadas texturas.
   Con `-- --check` solo informa (tamaño y si la costura se nota), con `-- --force` lo rehace todo desde los
   originales y con `-- --no-flatten` no toca la luz.
3. Recarga el juego. Cada textura se reduce a 512x512 (con mipmaps) y se repite cada 3 casillas, con una
   segunda capa a otra escala para que no se note la repetición. El motor le añade el relieve, la iluminación,
   las olas del agua y las manchas de color, igual que a las procedurales. El minimapa toma su color medio.

Un terreno de un mod puede usar otra ruta con `texture: 'sprites/mi-mod/lava.png'` en su `TerrainDef`.

### 2. Hojas de sprites

Una hoja es un PNG dividido en **celdas iguales**: cada fila es un estado (quieto, andar, atacar...) y cada
columna un fotograma. Junto al PNG va un JSON (el *manifiesto*) que la describe. Plantilla para una unidad
(celdas de 128x128 a 2x, es decir, 64x64 en pantalla):

```json
{
  "image": "militia.png",
  "mask": "militia-mask.png",
  "cell": { "w": 128, "h": 128 },
  "anchor": { "x": 64, "y": 122 },
  "scale": 2,
  "facing": "right",
  "directions": 1,
  "states": {
    "idle":   { "row": 0, "frames": 1 },
    "walk":   { "row": 1, "frames": 8, "fps": 10 },
    "attack": { "row": 2, "frames": 6 },
    "work":   { "row": 3, "frames": 6, "fps": 8 },
    "carry":  { "row": 4, "frames": 8, "fps": 10 },
    "death":  { "row": 5, "frames": 6, "fps": 8 }
  }
}
```

| Campo | Qué es |
| --- | --- |
| `image` | PNG de la hoja, con ruta relativa al JSON. |
| `mask` | (Opcional) máscara del color del jugador, del mismo tamaño que `image`. |
| `cell` | Ancho y alto de cada celda, en píxeles de la imagen. |
| `anchor` | Punto de la celda que va en el suelo: **los pies** de la unidad, la base del tronco de un árbol... En edificios, el **centro del rombo de la base** (si no se indica, se supone que la punta de abajo del rombo toca el borde inferior de la celda). |
| `scale` | Píxeles de imagen por píxel de pantalla a zoom 1. Generando a 2x: `2`. |
| `facing` | Hacia dónde mira el dibujo (`right` o `left`); el motor lo refleja para el otro lado. |
| `directions` | `1` = una dirección reflejada (MVP). `5` = S, SO, O, NO, N (el este se refleja). `8` = S, SO, O, NO, N, NE, E, SE. Con 5 u 8, cada dirección ocupa la fila siguiente dentro del estado (`row` + n.º de dirección). |
| `states` | Estados con `row` y `col` (primera celda), `frames`, `fps` (8 por defecto) o `duration` (segundos), `loop` y, si hace falta, `image`/`mask`/`cell`/`anchor` propios (una imagen por estado). |
| `ages` | (Edificios) variantes por edad: `{ "1": { "image": "house-feudal.png" }, "2": { ... } }`. Se usa la mayor edad ≤ la del jugador (0 Oscura, 1 Feudal, 2 Castillos, 3 Imperial). Pueden cambiar `image`, `mask`, `states` y `portrait`. |
| `portrait` | (Opcional) imagen para el retrato de la interfaz. Si no hay, se recorta el primer fotograma de `idle`. |
| `shadow` | Radio (px a zoom 1) de la sombra elíptica bajo unidades y recursos, o `false`. Por defecto 10 en infantería y 17 en caballería. |

Cómo elige el motor el estado de una unidad: `attack` mientras da un golpe (dura 0,35 s, los fotogramas se
reparten en ese tiempo); `walk` si se mueve, o `carry` si además lleva recursos; `work` mientras recolecta o
construye; `idle` en otro caso; y `death` al morir (se queda en el último fotograma y se desvanece como el
cadáver). Para el aldeano se pueden afinar por tarea: `work-wood`, `work-gold`, `work-stone`, `work-food`,
`work-build`, `carry-wood`, `carry-food`... Si un estado no existe se usa el siguiente más parecido
(`work-wood` → `work` → `idle`; `carry` → `walk`).

**Edificios.** El rombo de la base mide `N*128 x N*64` px a 2x para un edificio de `N`x`N` casillas (casa: 2,
cuartel: 3, centro urbano: 4). Estados: `idle` (terminado), `work` (opcional, mientras produce; p. ej. humo) y
`construction` (opcional): si existe, sus fotogramas se reparten según el progreso de la obra; si no, el edificio
terminado aparece de abajo arriba como ahora.

**Recursos.** `"pick": "variant"` elige un fotograma distinto para cada árbol (variedad sin animación) y
`"pick": "amount"` cambia de fotograma según lo que queda (mina llena → casi agotada).

### 3. La máscara del color del jugador

Un PNG del mismo tamaño que la hoja, **transparente** salvo en las zonas que deben llevar el color del jugador
(estandartes, tabardos, escudos, tejas de banderas), que se pintan en **blanco opaco** (los bordes pueden ser
semitransparentes para suavizar). El motor pasa esas zonas de la imagen a gris y las multiplica por el color del
jugador, conservando las luces y sombras del dibujo; por eso conviene generarlas en un tono **claro y neutro**
(blanco o gris claro).

Cómo hacerla en cualquier editor con capas (Photopea, GIMP, Krita, Photoshop):

1. Abre la hoja ya recortada y añade una capa nueva, transparente, encima.
2. Pinta en blanco, sobre la capa nueva, las zonas de color de jugador (la varita mágica sobre la capa de la hoja
   ayuda a seleccionarlas).
3. Oculta la hoja y exporta solo esa capa como `nombre-mask.png` (mismo tamaño, con transparencia).

### 4. Declarar qué usa cada hoja

En `src/mods/art/index.ts`, añade una línea por hoja a la lista `ART`:

```ts
export const ART: ArtEntry[] = [
  unitArt('villager', 'units/villager'),       // public/sprites/units/villager.json
  unitArt('militia', 'units/militia'),
  buildingArt('house', 'buildings/house'),
  resourceArt('tree', 'resources/oak'),
];
```

Los ids son los de `src/mods/core/` (`villager`, `militia`, `manAtArms`, `archer`, `knight`, `house`,
`barracks`, `townCenter`, `tree`, `goldMine`, `berries`...). Una misma hoja puede servir para varias
definiciones. Los retratos de la interfaz salen automáticamente de la hoja.

### Importar imágenes generadas (varias piezas sobre fondo blanco)

Las imágenes de Nano Banana se dejan sin tocar en `art-src/entrada/<pack>/`. Para cada una se crea una
configuración en `art-src/import/` (mira `pack3-edad-oscura.json`: cuadrícula, id y tamaño en casillas de cada
pieza, y edad) y se ejecuta:

```bash
npm run art-import -- art-src/import/pack3-edad-oscura.json
```

Quita el fondo blanco (también los huecos cerrados, como entre las aspas del molino) sin dejar halo, separa las
piezas por la cuadrícula, sustituye el magenta por gris claro y genera con él la máscara del color del jugador,
escala cada pieza a su huella y escribe PNG, máscara y JSON en `public/sprites/<out>/`. Con `"age": 1` (2, 3)
añade la imagen como variante de esa edad al JSON existente. En `art-src/preview/` deja una vista previa con la
huella dibujada; si una pieza queda desplazada, se corrige con `fit` (tamaño) y `dx`/`dy` (apoyo) en la
configuración. Después hay que añadir la hoja a `ART` en `src/mods/art/index.ts`.

### 5. Comprobar el resultado

```bash
npm run dev
```

- `http://localhost:5173/?arte=ejemplo` activa las imágenes de prueba de `public/sprites/ejemplo/` (milicia y
  hombre de armas con color de jugador y animaciones, casa con variante de la Edad Feudal, arbusto de bayas que
  cambia al agotarse y textura de adoquines para la tierra). Sirven de modelo para tus propios archivos.
- `http://localhost:5173/?arte=no` dibuja todo procedural, para comparar.
- Abre la consola del navegador: cualquier hoja que no se pueda cargar aparece como `[arte] ...` con el motivo.
- Prueba el ancla con zoom máximo: los pies deben quedar justo sobre el anillo de selección y el rombo del
  edificio sobre su huella verde al colocarlo.


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
