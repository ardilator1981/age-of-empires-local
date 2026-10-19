# CLAUDE.md

Guía para trabajar en este proyecto: nuestra versión propia de Age of Empires II, un juego de estrategia en tiempo real que corre en el navegador.

## Arquitectura

TypeScript estricto + Vite, sin framework de interfaz. La **simulación** (`src/game/`) no depende del DOM: corre a paso fijo de 20 ticks por segundo (`TICK_DT`) en `Game.update()`, que ejecuta en orden de prioridad una lista de **sistemas** (estadísticas de jugador, IA, órdenes, movimiento, producción, combate, visión, victoria). Todo el **contenido** (recursos, terrenos, unidades, edificios, tecnologías, civilizaciones, edades, mapas, condiciones de victoria, sprites, órdenes y sistemas) se registra en un `Registry` desde **mods**. El juego base es el mod `core`, y nada del motor usa ids de contenido fijos. Las unidades son entidades con una `order` (move, attack, attackMove, gather, build) que ejecuta un `OrderHandler`. Los caminos se calculan con A* en rejilla de 8 direcciones, con suavizado y un mapa de regiones conectadas para saber al instante si algo es alcanzable. Las estadísticas son "valor base de la definición + modificadores" (civilización, tecnologías). Todas las acciones de jugadores, humano o IA, pasan por `Commands`. El **render** es doble: el terreno con relieve se dibuja en WebGL2 (`TerrainGL`: malla de alturas, texturas procedurales, agua animada y niebla), y las entidades, la decoración y las sombras en un Canvas 2D superpuesto, en proyección isométrica 2:1 con sprites procedurales. Si no hay WebGL2, se usa un render plano en 2D. La **interfaz** es HTML/CSS (`HUD`, `Menu`), adaptable a móvil con media queries, y la **entrada** (`Input`) admite ratón, teclado y táctil (tocar, arrastrar, pellizcar, dos dedos y pulsación larga). La música es generativa con Web Audio (`src/audio/Music.ts`).

```
src/
  core/        Tipos de datos, Registry, EventBus, constantes
  game/        Simulación pura: Game, Entity, Player, GameMap (alturas, regiones),
               MapGenerator, pathfinding, combat, orders, commands, rules
    systems/   core.ts (sistemas básicos) y AISystem.ts (IA por jugador)
  render/      Camera (con relieve), Renderer (2D), TerrainGL (WebGL2), terrainPatterns,
               sprites, decorations, icons (retratos), Minimap, imageSprite
  ui/          HUD, Menu, Input, UIState, svgIcons
  audio/       Music (Web Audio generativa)
  mods/real-maps/  Mapas a partir de relieve y datos reales (JSON en data/)
  app/         App (ciclo menú → partida) y Session (todo lo de una partida)
  mods/        core/ (contenido base: datos), extra-content/, treasure-hunt/
scripts/       simulate.ts (partida IA contra IA sin gráficos), real-map.mjs, make-icons.mjs
.github/       Workflows de GitHub Pages y del APK de Android
docs/          decisiones.md (decisiones de diseño), riesgos.md (riesgos técnicos)
```

## Estado de las ramas (actualizar al fusionar)

- `main`: juego base, relieve y Pirineos, terreno orgánico y música.
- `feat/fusion-movil-mapas`: `main` + **versión móvil** (controles táctiles, interfaz adaptable, PWA con `vite-plugin-pwa`, despliegue en GitHub Pages y APK con Capacitor) + **mapas reales** (`scripts/real-map.mjs` + mod `src/mods/real-maps/`). Pendiente de fusionar en `main`. La rama de origen era `claude/upbeat-ishizaka-5d23f0`; de ella salieron la web publicada y la Release v0.1.0.
- Remoto: `origin` = github.com/ardilator1981/age-of-empires-local.

## Comandos

| Qué | Comando |
| --- | --- |
| Instalar | `npm install` |
| Jugar / desarrollo | `npm run dev` → http://localhost:5173 (o doble clic en `Jugar.command`) |
| Comprobar tipos | `npm run typecheck` |
| Build | `npm run build` (incluye la comprobación de tipos) |
| Prueba de humo | `npm run simulate -- <minutos> <mapa> <semilla> [dificultad]`: partida IA contra IA sin gráficos; debe terminar sin errores, y las IAs deben avanzar de edad y combatir |
| Tests | **No hay tests unitarios todavía.** Cuando se añadan, usar Vitest (`npm test`) |
| Mapa real | `npm run real-map -- ...` (ver README): descarga relieve del ICGC o de Copernicus y datos de OpenStreetMap, y genera `src/mods/real-maps/data/<id>.json` |
| Despliegue | Al hacer push a `main`, GitHub Actions publica la PWA en Pages (`.github/workflows/pages.yml`). Al crear una etiqueta `v*`, genera el APK con Capacitor y lo adjunta a una Release (`android.yml`). Es una **PWA**: `vite.config.ts` con `base: './'` y caché sin conexión |

Depuración en el navegador: `window.app` y `window.game` están accesibles desde la consola.

## Convenciones

- Código e identificadores en inglés; **textos visibles y comentarios en español**.
- Contenido nuevo = **datos en un mod**, no ifs en el motor. Si el motor necesita algo nuevo, se añade como punto de extensión del `Registry` (orden, sistema, sprite, tipo de mapa, victoria...).
- La simulación (`src/game/`) no toca el DOM ni el render, y debe seguir funcionando en Node (`npm run simulate`).
- Usa `game.units`, `game.buildings`, `game.nodes` y `game.actors` en vez de recorrer `game.list` en código que se ejecute cada tick. Comprueba siempre `e.dead`.
- Las acciones de jugadores van por `Commands`. Las comprobaciones de disponibilidad (edad, coste, requisitos) van en `rules.ts`.
- Aleatoriedad de la simulación: `game.rng()` (determinista por semilla), nunca `Math.random()`.
- Sprites: funciones registradas por id. La luz viene de arriba a la izquierda. Casilla de 64×32 px a zoom 1, y `ELEV_PX` píxeles por nivel de elevación.

## Reglas de trabajo

- **Una rama de git por mejora** (`feat/...`), con commits pequeños y mensajes claros en español.
- **No romper lo que ya funciona:** antes de dar algo por terminado, ejecuta `npm run build` y `npm run simulate -- 20 arabia 1` (y los tests cuando existan). Añade tests a la lógica nueva cuando tenga sentido.
- **Mobile-first:** todo debe funcionar con táctil en un móvil de gama media, a 30 FPS o más.
- **Decisiones ambiguas:** elige un valor por defecto razonable, anótalo en `docs/decisiones.md` y sigue. Solo pregunta si algo te bloquea.
- **Balance en un solo sitio:** daños, costes, tiempos y bonus viven en un único archivo de configuración, no repartidos por el código. Hoy no se cumple del todo (ver `docs/riesgos.md`): mientras tanto, no añadas números de balance nuevos fuera de los datos de los mods.
- **Al terminar cada tarea:** resumen corto de qué cambió, cómo probarlo y qué decisiones tomaste.
- No toques cambios ajenos sin commit ni ramas de otras sesiones. Las ramas de otras sesiones solo se fusionan cuando el usuario lo pide.
