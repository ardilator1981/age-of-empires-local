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
- 2026-10-19 · Render del relieve: se mantiene la malla 3D en WebGL2 que ya existía (una sola llamada de dibujo, iluminación por vértice) y se añaden bordes oscuros en los cantiles y curvas de nivel suaves en el shader · Es lo más barato que se ve bien en móvil: el coste está en la GPU, no en JavaScript, y no hay que dibujar nada casilla a casilla en el Canvas 2D.
- 2026-10-19 · Roca: se deriva de la pendiente (`relief.cliffSlope` = 2,2 niveles por casilla) y del tipo de terreno roca. Bloquea movimiento y construcción a todas las unidades (también el asedio) · Un único criterio para mapas aleatorios y reales.
- 2026-10-19 · La roca **no** bloquea la vista por sí misma: lo que tapa es el relieve (las crestas), con independencia del tipo de terreno · Desde una cumbre se ve el valle, que es lo natural, y el cálculo es uno solo.
- 2026-10-19 · Pasos: ancho mínimo `relief.passMinWidth` = 3 casillas, medido erosionando el terreno transitable. Si dos bases no están unidas, se abre un paso por la ruta más barata (premia lo bajo y lo suave: la silla de montaña) y se suaviza su perfil por debajo del umbral de acantilado. También se garantiza el acceso a madera, comida, oro y piedra desde cada base · No hace falta rechazar mapas.
- 2026-10-19 · Ventaja de altura: un "nivel de altura" es 1 nivel de elevación (`relief.levelStep`). A distancia: +1 de alcance (máx. +2) y +15 % de daño (máx. +45 %) por nivel por encima del objetivo. Cuesta arriba: −5 % por nivel (máx. −15 %) para cualquier ataque. El cuerpo a cuerpo no gana nada desde arriba · Lo pedido; el cuerpo a cuerpo neutral evita que todo gire en torno a las colinas.
- 2026-10-19 · Edificios defensivos (torres, centro urbano, castillo): usan las mismas reglas que las unidades a distancia · Coherente y sencillo.
- 2026-10-19 · Visión: +1 casilla por nivel por encima del terreno de alrededor (media de 8 puntos a 4 casillas, máx. +3). Ojos a 0,6 niveles en unidades, 1,5 en edificios y 3 en torres y castillos. Las crestas tapan con rayos de horizonte. La IA sigue viéndolo todo · Barato y entendible.
- 2026-10-19 · Movimiento: cuesta arriba −30 % por nivel de subida por casilla (mínimo 60 % de la velocidad). Cuesta abajo no acelera · Suficiente para notarlo sin desesperar.
- 2026-10-19 · Pathfinding: coste extra de 1,2 por nivel de desnivel entre casillas. Máximo 30 caminos largos por tick; el resto espera al siguiente · Evita congelaciones con órdenes masivas (peor tick: de 327 ms a ~50 ms con 300 unidades).
- 2026-10-19 · Pasos estrechos: dos unidades que avanzan a la vez se empujan un 65 % menos, así que se solapan un poco y se encolan en vez de bloquearse · Como en AoE2, sin un sistema de colas explícito.
- 2026-10-19 · IA: torres y castillos en el sitio válido más alto; el ejército espera a reunir la oleada en un punto alto de cara al enemigo · Mínimo útil.
- 2026-10-19 · Mapas aleatorios: Arabia y Lagos tienen mesetas con cantiles y una rampa de al menos ~4 casillas · Ponen en juego la roca y la altura también fuera de los mapas de montaña.
