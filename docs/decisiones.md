# Decisiones de diseño

Registro de decisiones tomadas cuando había ambigüedad. Formato: fecha · decisión · motivo.

- 2026-10-18 · Stack: TypeScript + Vite + Canvas 2D, sin motor externo · Corre en local en el navegador, sin instalar nada más que Node, y es fácil de ampliar.
- 2026-10-18 · Todo el contenido se define como datos en mods sobre un `Registry` · Poder añadir unidades, mapas o reglas sin tocar el motor.
- 2026-10-18 · Simulación a 20 ticks/s con paso fijo e interpolación en el render · Simulación determinista y animación fluida.
- 2026-10-18 · Gráficos procedurales; nunca se usan recursos del juego original · Evitar problemas de derechos de autor.
- 2026-10-18 · Mapa de regiones conectadas para saber al instante si algo es alcanzable · El A* fallido era carísimo en mapas con bosques cerrados.
- 2026-10-18 · Relieve por vértice, con 12 px por nivel; ventaja de altura +25 % / -25 % · Como en AoE2.
- 2026-10-18 · Terreno en WebGL2, con reserva plana en 2D · El relieve y las texturas detalladas no caben en el Canvas 2D.
- 2026-10-18 · Edificios con materiales por edad (madera y paja → entramado y tejas → piedra → pizarra) · Como en AoE2.
- 2026-10-18 · Diplomacia: todos contra todos, la naturaleza (jugador 0) es neutral · Lo más sencillo para empezar. Habrá que cambiarlo para equipos o guerras declaradas.
- 2026-10-19 · Arte por IA (Nano Banana): isométrico 2:1, generado a 2×, luz desde arriba a la izquierda, máscara aparte para el color de jugador, texturas de terreno cuadradas vistas desde arriba · Que las piezas encajen con el motor actual.
