# Riesgos técnicos de las próximas mejoras

## Deuda general (conviene resolverla antes o al empezar)

- **No hay tests unitarios.** Solo existe la prueba de humo `npm run simulate`. Conviene añadir Vitest con tests de `rules.ts`, `combat.ts`, `pathfinding.ts`, `commands.ts` y la economía, antes de cambios grandes.
- **El balance está repartido.** Los datos de unidades, edificios, tecnologías y civilizaciones están en `src/mods/core/*.ts`, y hay números fijos en el código:
  - Ventaja de altura en `combat.ts`.
  - Alcances de recolección y cuerpo a cuerpo en `constants.ts`.
  - Velocidad de proyectil y ritmo de reparación.
  - Tabla de dificultad y proporciones de recursos de la IA en `AISystem.ts`.
  - Duración de los restos.

  Propuesta: un `src/config/balance.ts` único del que lean los datos y los sistemas.
- **Fusión pendiente.** La versión móvil y los mapas reales ya están fusionados con el trabajo de `main` en `feat/fusion-movil-mapas`. Falta llevarlo a `main`, porque el workflow de Pages solo publica desde `main`.
- **Rendimiento en móvil sin medir en un dispositivo real.** En escritorio el render cuesta menos de 3 ms por fotograma. En móvil preocupan:
  - El HUD, que reconstruye su HTML cada 200 ms.
  - Unas 15.000 decoraciones en los mapas grandes.
  - Que todas las entidades se dibujan en Canvas 2D en cada fotograma.

## 1. Relieve y mapas reales
- **Toca:** `GameMap` (alturas y regiones), `MapGenerator`, `TerrainGL`, `Camera` y el mod `real-maps` con `scripts/real-map.mjs` (en la rama móvil).
- **Riesgos:**
  - La escala casilla/metros y la exageración vertical no son configurables de forma global.
  - Los JSON de los mapas se incluyen todos en el bundle (`import.meta.glob` con `eager`), lo que pesa en la caché de la PWA.
  - El A* no tiene en cuenta la pendiente.
  - Los asentamientos históricos necesitan datos curados a mano.
- **Antes:** cargar los mapas reales de forma perezosa.

## 2. Interfaz móvil
- **Toca:** `Input` (unas 500 líneas en la rama, con ratón, táctil y teclado mezclados), `HUD`, `Menu`, `styles.css` y `index.html`.
- **Riesgos:**
  - Los gestos chocan entre sí (pulsación larga, arrastre, pellizco).
  - Rendimiento del HUD y del Canvas 2D en gama media.
  - En iOS la PWA tiene límites de pantalla completa y de audio.
- **Antes:** separar la entrada táctil en su propio módulo y medir FPS en un móvil real.

## 3. Guerra declarada con general
- **Toca:**
  - `Game.isEnemy`: hoy es todos contra todos, sin equipos ni estado diplomático.
  - `Player`, `VictorySystem` y `victories` en `mods/core/index.ts`.
  - `AISystem`, que supone que todo el mundo es enemigo.
  - `commands.ts`, `HUD` y `Menu`.
  - El general como unidad nueva, con aura o mando y condición de derrota si muere.
- **Antes:** añadir un modelo de diplomacia (equipos y estado guerra/paz por pareja de jugadores) y que IA, visión y combate lo consulten.

## 4. Sonidos
- **Toca:** `src/audio/Music.ts` (más de 800 líneas, con cambios sin commit en `main`), `App` y los eventos del `EventBus`.
- **Riesgos:**
  - Faltan eventos de disparo, golpe, inicio de construcción y recolección.
  - iOS exige desbloquear el `AudioContext` con un gesto.
  - Muchas voces simultáneas en batallas grandes.
  - Peso de los archivos de audio en la caché de la PWA.
- **Antes:** un gestor de audio central (música + efectos, con mezcla y límite de voces) que escuche eventos.

## 5. Aldeanos inactivos
- **Toca:** `HUD` (botón e indicador), `Input` (tecla `.` y gesto táctil), `orders.ts`, `actions.setOrder` y `AISystem`.
- **Riesgos:** pocos. No existe un evento "unidad inactiva", y hoy se detecta recorriendo la lista.
- **Antes:** emitir un evento al quedarse sin orden y mantener un contador por jugador.

## 6. Formaciones y pantalla de estrategia
- **Toca:**
  - `Commands.move`: la formación es una cuadrícula simple, sin velocidad común del grupo ni orientación.
  - `MovementSystem`: solo hay una separación sencilla entre unidades.
  - `orders.ts`, `UIState.groups` (solo ids), `Renderer` y `Minimap`, y una pantalla nueva superpuesta.
- **Riesgos:**
  - Un A* por unidad es caro con grupos grandes.
  - Las formaciones chocan con el terreno, los bosques y los vados.
  - En móvil hacen falta gestos para dibujar o orientar la formación.
- **Antes:** grupos persistentes con identidad propia y un camino compartido por grupo (líder + desplazamientos, o un campo de flujo para grupos grandes).
