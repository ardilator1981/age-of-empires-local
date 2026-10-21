# Flujo de trabajo: áreas, modelos y esfuerzo

Cómo se reparte el trabajo de este proyecto entre sesiones de Claude para gastar lo justo. La
sesión **coordinadora** recibe cada petición, decide a qué área pertenece y abre una sesión nueva
con el modelo y el esfuerzo de esa área. Esa sesión trabaja en su propia rama (`feat/...`) y al
terminar la coordinadora revisa, fusiona en `main` y, cuando se le pide, publica.

## Áreas

| Área | Qué entra | Modelo | Esfuerzo | Subir a… |
| --- | --- | --- | --- | --- |
| **Coordinación** | Recibir peticiones, repartirlas, revisar, fusionar y publicar | Sonnet 5.5 | medio | — |
| **Retoques** | Un texto, un color, un valor de balance, un botón o una regla de CSS; corregir una errata | Haiku 5.5 | bajo | Sonnet medio si toca más de 2 o 3 archivos |
| **Contenido del juego** | Unidades, edificios, tecnologías, civilizaciones, mapas aleatorios, mods de reglas sencillos (datos en `src/mods/`) | Sonnet 5.5 | medio | alto si el motor necesita un punto de extensión nuevo |
| **Interfaz** | HUD de escritorio y móvil, menús, pantallas, gestos, ajustes, estilos | Sonnet 5.5 | medio | alto para rediseños de pantallas enteras |
| **Gráficos y arte** | Sprites procedurales, imágenes de IA, texturas, animaciones, prompts de Nano Banana | Sonnet 5.5 | medio | Opus medio para el terreno en WebGL o problemas de rendimiento |
| **Mapas reales** | Añadir una región (una entrada en `regions.json` y el script) | Haiku 5.5 | bajo | Sonnet medio para cambiar cómo se genera el terreno |
| **IA rival** | Comportamiento de la IA, oleadas, economía, dificultad | Sonnet 5.5 | alto | Opus alto si hay atascos que no se entienden |
| **Motor y reglas** | Combate, relieve, visión, formaciones, posturas, pathfinding, guardado, rendimiento de la simulación | Opus 5.5 | medio | alto para cambios de arquitectura |
| **Multijugador** | Red, salas, lockstep, desincronizaciones, determinismo | Opus 5.5 | alto | muy alto (xhigh) para depurar desincronizaciones |
| **Diseño de algo grande** | Viabilidad, arquitectura de un sistema nuevo, planes por fases | Opus 5.5 | alto | — |
| **Revisión y pruebas** | Pasar tests y simulaciones, revisar un diff, medir | Haiku 5.5 | bajo | Sonnet medio si hay que arreglar algo |

Regla práctica:
- Si la petición se puede describir en una frase y se sabe dónde está el cambio: **Haiku, bajo**.
- Si es una función nueva que encaja en lo que ya hay: **Sonnet, medio**.
- Si toca el corazón del motor, la red, el determinismo o la arquitectura: **Opus**.

## Cómo ahorrar créditos

- **Una sesión nueva para cada tarea.** Cada mensaje vuelve a enviar toda la conversación: una
  sesión con mucha historia cuesta más con cada pregunta, aunque la pregunta sea pequeña. Las
  sesiones de área se abren para una tarea y se archivan al fusionarla.
- **Encargos completos.** El encargo dice qué archivos o zona tocar y qué debe pasar al terminar,
  para que la sesión no tenga que explorar todo el proyecto. CLAUDE.md ya explica la arquitectura.
- **Agrupar retoques.** Cinco cambios pequeños en una sola petición de Haiku salen mucho más baratos
  que cinco sesiones.
- **Pruebas en el navegador solo cuando hacen falta.** Las capturas de pantalla son caras; los tests
  y las simulaciones (`npm test`, `npm run simulate`) son baratos.
- **Esfuerzo bajo para lo mecánico.** El esfuerzo alto solo compensa cuando hay que pensar mucho
  (motor, red, IA difícil).

## Ramas y publicación

- Una rama por mejora: `feat/<tema>`. Retoques: `fix/<tema>`. Documentación u orden: `chore/<tema>`.
- Nadie trabaja directamente en `main`. La coordinadora fusiona (preferiblemente sin conflictos, por
  avance rápido) después de comprobar `npm test` y `npm run build`.
- **Publicar** = hacer push de `main` (GitHub Actions publica la web en Pages en un minuto). Solo
  cuando el usuario lo pide.
- Las ramas fusionadas se borran; las sesiones terminadas se archivan.

## Sesiones abiertas

| Sesión | Área | Modelo y esfuerzo |
| --- | --- | --- |
| Gráficos con sprites generados por IA | Gráficos y arte | Sonnet 5.5, medio |
| Viabilidad del modo multijugador | Multijugador (para los fallos que salgan al probar en móviles) | Opus 5.5, alto |
