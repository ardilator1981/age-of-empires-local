# CLAUDE.md

Guía para trabajar en este proyecto: nuestra versión propia de Age of Empires II, un juego de estrategia en tiempo real que corre en el navegador.

## Arquitectura

TypeScript estricto + Vite, sin framework de interfaz. La **simulación** (`src/game/`) no depende del DOM: corre a paso fijo de 20 ticks por segundo (`TICK_DT`) en `Game.update()`, que ejecuta en orden de prioridad una lista de **sistemas** (estadísticas de jugador, IA, órdenes, movimiento, producción, combate, visión, victoria). Todo el **contenido** (recursos, terrenos, unidades, edificios, tecnologías, civilizaciones, edades, mapas, condiciones de victoria, sprites, órdenes y sistemas) se registra en un `Registry` desde **mods**. El juego base es el mod `core`, y nada del motor usa ids de contenido fijos. Las unidades son entidades con una `order` (move, attack, attackMove, gather, build) que ejecuta un `OrderHandler`. Los caminos se calculan con A* en rejilla de 8 direcciones, con suavizado y un mapa de regiones conectadas para saber al instante si algo es alcanzable. Las estadísticas son "valor base de la definición + modificadores" (civilización, tecnologías). Todas las acciones de jugadores, humano o IA, pasan por `Commands`. El **render** es doble: el terreno con relieve se dibuja en WebGL2 (`TerrainGL`: malla de alturas, texturas procedurales, agua animada y niebla), y las entidades, la decoración y las sombras en un Canvas 2D superpuesto, en proyección isométrica 2:1 con sprites procedurales. Si no hay WebGL2, se usa un render plano en 2D. La **interfaz** es HTML/CSS y tiene dos capas sobre el mismo motor: la de escritorio (`HUD`, `Menu`) y la móvil (`MobileHUD`: mapa a pantalla completa con controles flotantes). `ui/layout.ts` elige una u otra según la entrada y la pantalla (clase `ui-movil` en `<html>`, forzable en ajustes o con `?ui=movil`), y las dos sacan los comandos de la selección de `ui/commandModel.ts`. La la **entrada** (`Input`) admite ratón, teclado y táctil (tocar, arrastrar, pellizcar, dos dedos y pulsación larga). El **sonido** sale todo de `src/audio/AudioManager.ts`, que escucha los eventos del juego (`orderIssued`, `actionRejected`, `underAttack`, `resourceDepleted`...) y comparte el `AudioContext` con la música generativa (`Music.ts`); los efectos son sintéticos (`sfx.ts`). El resto del código nunca reproduce sonidos: solo emite eventos.

```
src/
  config/      balance.ts: TODOS los valores de balance generales (relieve, altura, visión, movimiento, IA...)
  core/        Tipos de datos, Registry, EventBus, constantes
  game/        Simulación pura: Game, Entity, Player, GameMap (alturas, regiones),
               MapGenerator, pathfinding, combat, orders, commands, rules,
               relief (roca, pasos, conectividad), heightRules (ventaja de altura), vision
    army/      formations (formas y huecos), groups (formaciones en marcha y órdenes tácticas),
               stances (posturas)
    save.ts    guardar y cargar partidas (formato versionado)
    fmath.ts   hypot, sin y cos deterministas (iguales en todos los navegadores)
    net/       multijugador: huella del estado (hash), órdenes en JSON (netCommands) y pasos
               sincronizados (lockstep); ver docs/multijugador.md
  net/         partida en red sin DOM (NetGame: sala, turnos por el anfitrión, retardo, desconexiones),
               protocolo, trozos numerados y transportes (pestañas, Trystero, código o QR)
    systems/   core.ts (sistemas básicos) y AISystem.ts (IA por jugador)
  render/      Camera (con relieve), Renderer (2D), TerrainGL (WebGL2), quality (calidad gráfica), terrainPatterns,
               sprites, decorations, icons (retratos), Minimap, imageSprite
  ui/          HUD, Menu, Input, UIState, svgIcons, StrategyScreen (pantalla de estrategia),
               SettingsPanel (ajustes unificados), layout (preferencias de interfaz)
  audio/       AudioManager (eventos → sonido, volúmenes, desbloqueo móvil), Music (generativa), sfx (efectos sintéticos)
  mods/real-maps/  Mapas a partir de relieve y datos reales (JSON en data/)
  app/         App (ciclo menú → partida, guardado automático, partidas en red), Session (todo lo de una partida),
               saves (ranuras en IndexedDB), orders (adónde van las órdenes del jugador)
  mods/        core/ (contenido base: datos), extra-content/, treasure-hunt/, declared-war/ (modo Guerra declarada)
scripts/       simulate.ts (partida IA contra IA sin gráficos), real-map.mjs, make-icons.mjs
.github/       Workflows de GitHub Pages y del APK de Android
docs/          decisiones.md (decisiones de diseño), riesgos.md (riesgos técnicos), multijugador.md (viabilidad)
```

## Estado de las ramas (actualizar al fusionar)

- `main`: juego base, terreno orgánico, música, **sonido** (efectos y alertas sintéticos con `AudioManager`, fusionado desde `feat/audio-efectos`), **versión móvil** (controles táctiles, interfaz adaptable, PWA con `vite-plugin-pwa`, Pages y APK con Capacitor) y **relieve con mapas reales**: roca infranqueable y pasos garantizados, reglas de altura, visión con crestas y 12 regiones reales sin conexión con selector en mapamundi (fusionado desde `feat/relieve-mapas-reales`), y el modo **Guerra declarada** (mod `declared-war`, desactivado por defecto; fusionado desde `feat/guerra-declarada`), **ejércitos**: formaciones, posturas, órdenes tácticas y pantalla de estrategia (fusionado desde `feat/ejercitos`), y **guardado, calidad gráfica y ajustes**: partidas guardadas y Continuar, calidad automática, ahorro de batería y panel de ajustes (fusionado desde `feat/guardado-rendimiento`).
- `feat/fusion-movil-mapas`, `feat/relieve-mapas-reales`, `feat/audio-efectos`, `feat/pequenos-cambios`, `feat/guerra-declarada`, `feat/ejercitos` y `feat/guardado-rendimiento`: ya están en `main`.
- `feat/interfaz-movil`: **interfaz móvil** (capa `MobileHUD`, elección automática de interfaz, gestos y grupos táctiles; capturas y medición en `docs/movil/`). Ya está en `main`. Al añadir comandos nuevos al HUD, añádelos en `ui/commandModel.ts` para que salgan también en el móvil.
- `claude/arte-ia`: gráficos con sprites generados por IA (otra sesión).
- `feat/multijugador-viabilidad`: informe de viabilidad del multijugador (`docs/multijugador.md`), prototipo de lockstep (`game/net/`) y arreglos de determinismo (`fmath`, niebla al cargar, fin de partida sin `humanId`). Sin fusionar.
- `feat/multijugador` (sale de la anterior): **multijugador en red** construido: sala, pestañas, Trystero (por internet) y código o QR (sin intermediarios), pausa y velocidad para todos, la IA juega por quien se va, reconexión con la partida del anfitrión. Sin fusionar; falta probar WebRTC en dispositivos reales (ver `docs/multijugador.md`).
- Remoto: `origin` = github.com/ardilator1981/age-of-empires-local. La web publicada y la Release v0.1.0 salieron de `claude/upbeat-ishizaka-5d23f0`.

## Comandos

| Qué | Comando |
| --- | --- |
| Instalar | `npm install` |
| Jugar / desarrollo | `npm run dev` → http://localhost:5173 (o doble clic en `Jugar.command`) |
| Comprobar tipos | `npm run typecheck` |
| Build | `npm run build` (incluye la comprobación de tipos) |
| Prueba de humo | `npm run simulate -- <minutos> <mapa> <semilla> [dificultad]`: partida IA contra IA sin gráficos; debe terminar sin errores, y las IAs deben avanzar de edad y combatir |
| Tests | `npm test` (Vitest, carpeta `tests/`): conectividad de todos los mapas, reglas de altura, visión, caminos, órdenes y Guerra declarada. Los modos de juego (`declared-war`) solo se activan en las pruebas que los piden (`newGame(map, { war: true })`) |
| Determinismo entre navegadores | `npm run engines -- [minutos]`: la misma partida en Node (V8) y en el `jsc` de macOS (JavaScriptCore, el de Safari); compara la huella del estado cada segundo |
| Multijugador (prototipo) | `npm run lockstep -- [minutos]`: dos clientes por red simulada; determinismo, retardo de las órdenes y paradas |
| Rendimiento | `npm run bench`: A*, partida con 4 IA, estrés de 300 unidades y visión. Resultados en `docs/rendimiento.md` |
| Regiones reales | `npm run regions` (todas las de `src/mods/real-maps/regions.json`, con `--all` u `--only <id>`); `npm run world-map` regenera el mapamundi del selector |
| Mapa real | `npm run real-map -- ...` (ver README): descarga relieve del ICGC o de Copernicus y datos de OpenStreetMap, y genera `src/mods/real-maps/data/<id>.json` |
| Despliegue | Al hacer push a `main`, GitHub Actions publica la PWA en Pages (`.github/workflows/pages.yml`). Al crear una etiqueta `v*`, genera el APK con Capacitor y lo adjunta a una Release (`android.yml`). Es una **PWA**: `vite.config.ts` con `base: './'` y caché sin conexión |

Depuración en el navegador: `window.app` y `window.game` están accesibles desde la consola.

## Puntos de extensión para mods (además de contenido, órdenes y sistemas)

- `reg.addCombatRule(fn)`: quién puede atacar a quién (`game.canAttack`). La usa Guerra declarada para la paz y el círculo de batalla.
- `reg.addNetCommand(id, fn)`: una orden de jugador propia del mod (en red viaja por la cola de turnos). La interfaz la da con `session.orders.send({ t: 'mod', id, args })`. La usa Guerra declarada para declarar la guerra.
- `reg.addAIPlugin(p)`: la IA le pregunta cada turno; puede pedir edificios y unidades, reservar recursos, frenar el entrenamiento o encargarse del ejército.
- `reg.addHudPanel(def)`, `reg.addWorldOverlay(fn)`, `reg.addMinimapOverlay(fn)`: paneles HTML y dibujos sobre el mapa y el minimapa. `ui.pickPoint` sirve para pedir un punto del mapa.
- En las unidades: `maxAlive`, `retrainCooldown` y `aura` (bonificación a las tropas cercanas, la aplica `AuraSystem`).
- `src/game/formation.ts`: formación sencilla en filas; es el gancho para formaciones de verdad.

## Guardado de partidas (importante al añadir cosas)

- Todo el estado de una partida tiene que poder guardarse: datos simples en `Entity`, `Player`, `game.data` o `entity.data` (números, textos, arrays, objetos, `Map`, `Set` y arrays tipados). Nada de funciones ni referencias a objetos: guarda ids.
- Un sistema con estado interno (contadores, temporizadores) implementa `save()` y `load()` (ver `AuraSystem`, `AISystem`, el mod `treasure-hunt`).
- Si cambias el formato de forma incompatible, sube `SAVE_VERSION` en `src/game/save.ts` y añade una migración en `MIGRATIONS`.
- `tests/save.test.ts` comprueba que una partida cargada sigue exactamente igual que la original.

## Convenciones

- Código e identificadores en inglés; **textos visibles y comentarios en español**.
- Contenido nuevo = **datos en un mod**, no ifs en el motor. Si el motor necesita algo nuevo, se añade como punto de extensión del `Registry` (orden, sistema, sprite, tipo de mapa, victoria...).
- La simulación (`src/game/`) no toca el DOM ni el render, y debe seguir funcionando en Node (`npm run simulate`).
- Usa `game.units`, `game.buildings`, `game.nodes` y `game.actors` en vez de recorrer `game.list` en código que se ejecute cada tick. Comprueba siempre `e.dead`.
- Las acciones de jugadores van por `Commands`. Las comprobaciones de disponibilidad (edad, coste, requisitos) van en `rules.ts`.
- La interfaz (también los paneles de los mods) **nunca** llama a `Commands` ni cambia el estado: da un `NetCommand` con `session.orders.send(...)` (contra la IA se ejecuta al momento; en red, unos ticks después en todos los dispositivos). Lo que la orden necesite saber va en ella (ids, coordenadas), no en referencias.
- Aleatoriedad de la simulación: `game.rng()` (determinista por semilla), nunca `Math.random()`.
- Determinismo (para el multijugador): en el código que corre cada tick, `hypot`, `sin` y `cos` de `src/game/fmath.ts`, nunca `Math.hypot`, `Math.sin`, `Math.cos`, `Math.atan2` ni `Math.exp`, que dan distinto en Chrome y Safari. Tampoco `Date.now` ni nada de la interfaz. Un test lo comprueba en `src/game`; en los mods, a mano. El dibujo puede usar `Math`.
- Sonido: para que algo suene, emite un evento del juego (o usa `game.reject` para los errores de una acción) y añade el efecto en `audio/sfx.ts` y su escucha en `AudioManager`. Nada de archivos con copyright; documenta cada sonido en `CREDITS.md`.
- Sprites: funciones registradas por id. La luz viene de arriba a la izquierda. Casilla de 64×32 px a zoom 1, y `ELEV_PX` píxeles por nivel de elevación.

## Reglas de trabajo

- **Una rama de git por mejora** (`feat/...`), con commits pequeños y mensajes claros en español.
- **No romper lo que ya funciona:** antes de dar algo por terminado, ejecuta `npm run build` y `npm run simulate -- 20 arabia 1` (y los tests cuando existan). Añade tests a la lógica nueva cuando tenga sentido.
- **Mobile-first:** todo debe funcionar con táctil en un móvil de gama media, a 30 FPS o más.
- **Decisiones ambiguas:** elige un valor por defecto razonable, anótalo en `docs/decisiones.md` y sigue. Solo pregunta si algo te bloquea.
- **Balance en un solo sitio:** las reglas generales (alcances, relieve, altura, visión, movimiento, pathfinding, IA) viven en `src/config/balance.ts`. Las estadísticas de cada unidad, edificio y tecnología son datos de los mods (`src/mods/core/`). No añadas números de balance sueltos en el código.
- **Al terminar cada tarea:** resumen corto de qué cambió, cómo probarlo y qué decisiones tomaste.
- No toques cambios ajenos sin commit ni ramas de otras sesiones. Las ramas de otras sesiones solo se fusionan cuando el usuario lo pide.
