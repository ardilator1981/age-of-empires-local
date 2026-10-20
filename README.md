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
- **Mapas reales** con el relieve, los ríos, los bosques y los pueblos de verdad: **Val d'Aran** y **Plana de Vic**, y un script para crear el de cualquier zona (ver «Un mapa de una zona real»).
- Relieve: colinas y montañas con iluminación, y ventaja de altura en combate (+25 % desde arriba, -25 % desde abajo).
- Estética inspirada en el original: terreno con texturas detalladas y agua animada, edificios que cambian con la edad (madera y paja → entramado y tejas → piedra), retratos de unidades e interfaz de piedra y oro.
- Música medieval generativa, tranquila y casi hipnótica (laúd, flauta dulce, viela, zanfona, arpa y tambores), que se compone sobre la marcha y cambia a un tema más tenso en combate.
- Efectos de sonido sintéticos, sin archivos: confirmación de órdenes, edificio terminado, unidad entrenada, tecnología y nueva edad, recurso agotado, alertas de ataque (cuerno para unidades, campana para edificios) y errores (sin recursos, mal sitio, población). Combate y ambiente a volumen bajo, según lo que se ve. Volumen general, de música, de efectos y de alertas, y botón de silencio (ver `CREDITS.md`).
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
| Activar / silenciar el sonido | `M` o el botón 🔊 (volúmenes en el menú) |

## Jugar en el móvil (iPhone y Android)

El juego es una **PWA**: se instala desde el navegador y funciona sin conexión.

- **iPhone / iPad:** abre la página en **Safari** › botón **Compartir** › **Añadir a pantalla de inicio**.
- **Android:** abre la página en **Chrome** › menú **⋮** › **Instalar app** (o *Añadir a pantalla de inicio*).
  También puedes instalar el **APK** que se adjunta a las Releases (activa *Instalar apps desconocidas*).
- **En local (misma wifi):** `npm run dev -- --host` y abre en el móvil la dirección `http://<IP-del-ordenador>:5173`.
  Para probar la instalación y el modo sin conexión usa el build: `npm run build` y `npm run preview -- --host`.

Se juega en horizontal. En pantallas táctiles el mapa por defecto es *Pequeño*.

En móviles y tabletas se usa la **interfaz móvil**: el mapa ocupa toda la pantalla y los controles flotan encima
(recursos en una línea arriba, minimapa en una esquina y una bandeja abajo solo cuando hay algo seleccionado).
Se elige sola según la pantalla y el tipo de entrada; en **☰ › Ajustes** (o en el menú de pausa en el ordenador) se
puede forzar la de escritorio o la móvil, y cambiar el tamaño de los controles. Para probarla en el ordenador: `?ui=movil`.

| Acción | Gesto |
| --- | --- |
| Seleccionar | Tocar |
| Todas las unidades de un tipo en pantalla | Tocar dos veces |
| Seleccionar varias | Arrastrar con un dedo (con el modo ✥ **Cámara**, arrastrar mueve el mapa) |
| Ordenar (mover / atacar / recolectar / construir / reunión) | Mantener pulsado en el mapa o en el minimapa |
| Mover la cámara / zoom | Dos dedos / pellizcar (o tocar el minimapa) |
| Construir | Bandeja › **Construir** › pestaña › edificio; arrastrar el fantasma y **✔ Construir** (✖ cancela) |
| Entrenar / investigar | Bandeja (las 4 primeras) o **⋯ Más** (pestañas Unidades, Tecnologías, Acciones) |
| Eliminar / quitar de la cola | Dos toques seguidos (el primero pide confirmación) |
| Grupos 1–5 | Tocar = seleccionar (dos veces: centrar) · Mantener pulsado = guardar la selección |
| Aldeano inactivo / ejército / alertas | 💤 / ⚔️ / 🔔 |
| Minimapa | ⇲ plegar · ⤢ a pantalla completa (tocar un punto para ir allí) |
| Ver coste y descripción de un botón | Mantenerlo pulsado |
| Pausa, estadísticas, tecnologías, diplomacia, ajustes | ☰ |

Capturas y medición de la interfaz en móvil: `docs/movil/` (`npm run shots:movil -- --url http://localhost:5173/ --prefix despues`).

### Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el proyecto (`git remote add origin …` y `git push -u origin main`).
2. En **Settings › Pages › Build and deployment › Source** elige **GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/pages.yml`, que construye y publica el juego en
   `https://<usuario>.github.io/<repositorio>/` (el build usa rutas relativas, así que funciona en cualquier subcarpeta).

**APK de Android (opcional):** `.github/workflows/android.yml` lo genera con Capacitor al subir una etiqueta
(`git tag v1.0.0` y `git push origin v1.0.0`) y lo adjunta a la Release; también se puede lanzar a mano desde *Actions*.

Los iconos de la app están en `public/icons/` y se regeneran con `node scripts/make-icons.mjs`.

## Estructura del proyecto

```
src/
  core/        Tipos de datos, Registry (registro de contenido), eventos y constantes
  game/        Simulación: Game, entidades, jugadores, mapa, caminos (A*), combate,
               órdenes de unidades, comandos y reglas de disponibilidad
    systems/   Sistemas que se ejecutan cada tick (movimiento, producción, combate, IA...)
  audio/       AudioManager (único punto de salida del sonido), música generativa y efectos sintéticos
  render/      Cámara isométrica con relieve, terreno en WebGL (TerrainGL), texturas procedurales,
               sprites, retratos de la interfaz y minimapa
  ui/          HUD, menús y entrada de ratón y teclado
  app/         Ciclo de vida: menú → partida → menú
  mods/
    core/            Todo el contenido base (datos puros, fácil de leer y editar)
    extra-content/   Mod de ejemplo: unidad, tecnología, sprite y mapa nuevos
    treasure-hunt/   Mod de ejemplo: reglas nuevas mediante un sistema propio
    real-maps/       Mapas de zonas reales (data/*.json generados con scripts/real-map.mjs)
scripts/
  simulate.ts  Partida IA contra IA sin gráficos, para probar cambios rápidamente
  real-map.mjs Genera un mapa a partir de datos geográficos reales (ICGC / Copernicus + OpenStreetMap)
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

### Un mapa de una zona real

El mod **Mapas reales** (`src/mods/real-maps/`) convierte datos geográficos reales en mapas jugables. Incluye
**Val d'Aran** (8×8 km alrededor de Vielha) y **Plana de Vic** (8×8 km alrededor de Vic). Para crear el de
cualquier otra zona:

```bash
npm run real-map -- --id montserrat --name "Montserrat" --center 41.5933,1.8375 --size-km 8
```

El script (`scripts/real-map.mjs`) descarga el relieve y OpenStreetMap, y escribe
`src/mods/real-maps/data/<id>.json`. El mapa aparece en el menú en cuanto se recarga el juego (no hay que
tocar código). Opciones principales (`npm run real-map -- --help` para todas):

| Opción | Qué hace | Por defecto |
| --- | --- | --- |
| `--center LAT,LON` + `--size-km KM` | Centro y lado del cuadrado jugable | — / 8 |
| `--bbox S,W,N,E` o `--utm MINE,MINN,MAXE,MAXN` | Recuadro exacto en grados o en metros UTM (`--zone`, 31 por defecto) | — |
| `--tiles N` | Lado del mapa en casillas; el juego lo reescala al tamaño elegido en el menú | 144 |
| `--rotate 45` / `0` | 45 = el norte queda arriba en pantalla (por defecto con `--center`); 0 = recuadro exacto, norte arriba a la derecha | 45 |
| `--exaggeration X` | Exageración vertical respecto a la escala real | 1.5 |
| `--max-level L` | Altura máxima del juego; si el relieve no cabe se comprime | 10 |
| `--snow-line M` / `--pine-line M` | Cota de la nieve y de los pinares (m) | 2300 / 1400 |
| `--rock-slope GRADOS` | Pendiente real a partir de la que hay roca infranqueable | 40 |
| `--starts "A,B,C"` | Pueblos preferidos para colocar a los jugadores | los más grandes |
| `--dem auto\|icgc\|copernicus` | Fuente del relieve (auto = ICGC dentro de Cataluña) | auto |
| `--no-osm`, `--refresh` | Sin OpenStreetMap / ignorar la caché `.cache/real-maps/` | — |

**Escala recomendada:** de 40 a 80 m por casilla, es decir, zonas de 6 a 12 km para el tamaño de 144
casillas. Con zonas más grandes los pueblos quedan demasiado juntos y los ríos se vuelven muy anchos; con
zonas más pequeñas casi no hay relieve. En el tamaño 96 del menú cada casilla mide 1,5 veces más.

**Cómo se interpreta:** cotas por encima de la línea de nieve → nieve; pendientes reales fuertes y roca
desnuda o acantilados de OSM → roca infranqueable; bosques de OSM → árboles (pinos según `leaf_type` o la cota,
pinos nevados cerca de la nieve, frondosos abajo); ríos → agua con vados cada cierto trecho; arroyos con
nombre → vados; lagos y embalses → agua; cultivos y zonas urbanas → tierra. Los jugadores empiezan en los
pueblos reales (los demás pueblos quedan como recursos), unidos por caminos que siguen los valles, y el mod
comprueba que todas las bases se pueden alcanzar.

**Si falla una descarga:** el servidor público de Overpass se satura a menudo; el script reintenta con espera
creciente y otros servidores (`--overpass URL` para elegir uno). Lo descargado se guarda en caché, así que
basta con volver a ejecutar el comando. Si no hay forma de obtener OSM, `--no-osm` genera el mapa solo con el
relieve (los bosques se reparten según la altura).

**Licencias y atribución** (cada JSON guarda la suya y se muestra en la descripción del mapa):

- Relieve de Cataluña: [Model d'Elevacions del Terreny](https://www.icgc.cat/ca/Descarregues/Elevacions/Model-d-Elevacions-del-Terreny-de-Catalunya)
  del **Institut Cartogràfic i Geològic de Catalunya (ICGC)**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
  servido por su WCS (`geoserveis.icgc.cat/icc_mdt/wcs/service`).
- Relieve fuera de Cataluña: **Copernicus DEM GLO-30** © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH
  2014-2018, proporcionado bajo el programa COPERNICUS de la Unión Europea y la Agencia Espacial Europea
  (licencia de uso libre del DEM de Copernicus), leído del bucket público `copernicus-dem-30m` de AWS.
- Ríos, bosques, usos del suelo y núcleos de población: © colaboradores de
  [OpenStreetMap](https://www.openstreetmap.org/copyright), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/).
  Los JSON son una base de datos derivada y se distribuyen con la misma licencia.

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

## Relieve, roca y pasos

- **Roca:** las pendientes por encima de `relief.cliffSlope` (en `src/config/balance.ts`) son roca infranqueable para todas las unidades (también el asedio) y no se puede construir en ella. En pantalla se distingue por el gris y el borde oscuro de los cantiles.
- **Pasos:** tras generar cualquier mapa se comprueba, con un recorrido por regiones, que todas las bases están unidas por pasos de al menos `relief.passMinWidth` casillas y que llegan a madera, comida, oro y piedra. Si no, se abre automáticamente el paso por la silla de montaña más baja.
- **Ventaja de altura:** las unidades a distancia y los edificios defensivos más altos que su objetivo ganan alcance y daño (▲ dorado sobre la unidad y anillo de alcance ampliado). Atacar cuesta arriba penaliza (▼ rojo).
- **Visión:** desde lo alto se ve más lejos y las crestas tapan lo que hay detrás.
- **Movimiento:** cuesta arriba se va más despacio, y los caminos prefieren el llano y los pasos.

## Regiones reales

En el menú, **🌍 Elegir región real…** abre un mapamundi con 12 regiones: alta montaña con pasos, costa, valle fluvial, desierto, meseta y valle glaciar. Cada una muestra una vista previa del mapa antes de jugar. Los datos van incluidos en el juego, así que **no hace falta conexión**.

Para añadir una región, añade una entrada a `src/mods/real-maps/regions.json` y ejecuta:

```bash
npm run regions -- --only <id>
```

Descarga el relieve (Copernicus DEM GLO-30, o el ICGC en Cataluña) y los ríos, bosques y pueblos de OpenStreetMap. Las atribuciones aparecen en la pantalla de **Créditos** del juego.

## Guardar y continuar

- La partida se guarda sola cada 45 segundos y al cerrar el navegador o cambiar de app en el móvil. Al volver a abrir el juego, **▶ Continuar la partida** la recupera tal cual.
- En la pausa (o en ☰ → Partida en el móvil): **💾 Guardar partida** en 5 ranuras, y **📂 Cargar partida**. Las partidas guardadas se pueden borrar.
- Se guardan en el navegador (IndexedDB), comprimidas: unas decenas de KB por partida.

## Ajustes

⚙️ Ajustes, en el menú principal, en la pausa o en ☰ → Ajustes del móvil:
- **Sonido:** volumen general, música, efectos y alertas, y silencio.
- **Gráficos:** calidad automática, baja, media o alta (la automática baja sola si el juego va por debajo de 30 FPS), ahorro de batería (30 FPS y menos efectos) y contador de FPS.
- **Juego:** velocidad y qué hace la pantalla de estrategia con el tiempo.
- **Controles:** interfaz de escritorio o móvil, tamaño de los controles, duración de la pulsación larga, qué hace arrastrar con un dedo y vibración.

Todo se recuerda entre partidas.

## Ejércitos: formaciones, posturas y estrategia

- **Selección rápida:** ⚔️ selecciona todo el ejército (sin aldeanos). En la pantalla de estrategia también se puede seleccionar por tipo (infantería, a distancia, caballería, asedio) y usar los grupos 1–5. Los grupos de siempre siguen funcionando: Ctrl+número en el teclado, mantener pulsado en el móvil.
- **Formaciones** (línea, columna, caja, cuña y dispersa): al mover o atacar con dos o más tropas van en formación, al paso de la más lenta. La infantería va delante, los arqueros detrás, la caballería en los flancos, el asedio al fondo y el General en el centro (se puede cambiar en `BALANCE.army.placement`). No ponen a nadie en la roca. En un paso de montaña estrecho se hacen columna y al salir recuperan la formación.
- **Posturas:** agresiva (persigue), defensiva (persigue poco y vuelve a su sitio), mantener posición (no se mueve, solo ataca a lo que alcanza) y sin ataque.
- **Órdenes tácticas:** avanzar atacando en formación, mover, retirada ordenada (sin luchar; a la base si no eliges punto), patrullar por dos o más puntos, escoltar a una unidad (por ejemplo, el General) y mantener una zona.
- **Pantalla de estrategia:** 📜 en el HUD, en los comandos de las tropas o la tecla Tab. Trabaja sobre la selección o sobre todo el ejército. Las órdenes se dan tocando el mapa táctico: un punto, o varios para una patrulla. Contra la IA el juego se pausa o va a cámara lenta mientras está abierta (se elige en la propia pantalla).
- **IA:** espera en línea defensiva de cara al enemigo y ataca en grupo con postura agresiva, en línea o en cuña si lleva sobre todo caballería.

## Modo "Guerra declarada"

Se activa en el menú, en **Mods → Guerra declarada**. Al activarlo aparece la opción **Preparación**: el tiempo entre la declaración y la batalla (30 min por defecto). Desactivado, el juego funciona como siempre.

1. **Paz:** al principio nadie puede atacar a nadie. Un panel arriba a la izquierda muestra qué falta para poder declarar la guerra: llegar a la **Edad de los Castillos**, **descubrir el asentamiento enemigo** y tener un **General**. El General se entrena en el Castillo, solo puede haber uno y anima a las tropas cercanas: más ataque y +1 de armadura. Si muere, hay que esperar 3 min para entrenar otro.
2. **Declaración:** con todo en verde, pulsa **⚔️ Declarar la guerra** y toca el mapa donde quieras la batalla. La vista previa marca en rojo la roca, el agua y los bosques, en verde las entradas al círculo y con ▲ la cima. Confirma con **✔ Declarar aquí**. Manda el punto de quien declara.
3. **Preparación:** cuenta atrás visible en el panel, en el mapa y en el minimapa. Entrena, fortifica y coloca tu ejército; **🚩 Ejército al punto** lo lleva en formación a tu mitad del círculo.
4. **Batalla:** solo se combate **dentro del círculo**. Pierde la batalla quien pierde a su General o se queda 30 s sin tropas en el círculo. Al acabar el tiempo (12 min) gana quien tenga más ejército dentro, y si empatan hay tablas y vuelve la paz.
5. **Conquista:** quien gana la batalla puede atacar ya en todo el mapa y tiene 20 min para **arrasar el pueblo** del rival. El perdedor solo puede defenderse. Si cae el último edificio, gana la partida; si el pueblo resiste, vuelve la paz y se puede volver a declarar.

La IA juega con las mismas reglas: entrena su General, explora, declara la guerra eligiendo un punto con altura a su favor, espera en formación en lo alto de su mitad del círculo y va a la batalla.

Los valores (radio del círculo, tiempos, aura del General...) están en `war` dentro de `src/config/balance.ts`. Para probarlo sin gráficos: `npm run simulate -- 120 arabia 7 normal --guerra --prep=10`.

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
