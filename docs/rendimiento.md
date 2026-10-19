# Mediciones de rendimiento

`npm run bench` (simulación sin gráficos, Node 24, MacBook Air). Cifras en milisegundos.

## Relieve y mapas reales (feat/relieve-mapas-reales)

### Antes (main, commit bbd213e)

| Prueba | Resultado |
| --- | --- |
| A* Pirineos 144×144 (400 consultas) | 0,295 ms/consulta, camino medio de 79 casillas |
| A* Val d'Aran 144×144 | 0,039 ms/consulta (muchas consultas en regiones distintas) |
| Partida 4 IA, Pirineos 120×120, 25 min | 0,077 ms/tick, peor tick 10,2 ms |
| Estrés: 300 unidades cruzan los Pirineos | 0,252 ms/tick, **peor tick 327 ms** (todas calculan el camino a la vez), 281 de 282 llegan, 1 atascada |
| Visión (150 unidades) | 0,05 ms por recálculo |
| Navegador, vista de móvil 740×360, Pirineos 120×120 con 4 jugadores (15 min) | 1,03 ms de render + 0,12 ms de simulación por fotograma |
| Navegador, vista de móvil, Arabia 120×120 | 0,70 ms de render + 0,12 ms de simulación por fotograma |

### Después (feat/relieve-mapas-reales)

| Prueba | Antes | Después |
| --- | --- | --- |
| A* Pirineos 144×144 | 0,295 ms/consulta | 0,51 ms/consulta (el coste por pendiente hace que explore más) |
| Partida 4 IA, Pirineos 120×120, 25 min | 0,077 ms/tick, peor 10,2 ms | 0,081 ms/tick, peor 11,9 ms |
| Estrés: 300 unidades cruzan los Pirineos | peor tick **327 ms**, 0 atascadas* | peor tick **48,7 ms** (caminos repartidos entre ticks), 0 atascadas |
| Visión (150 unidades) | 0,05 ms | 0,15 ms (rayos de horizonte con crestas) |
| Navegador, vista de móvil 740×360, Pirineos 120×120 | 1,03 + 0,12 ms por fotograma | 1,06 + 0,14 ms por fotograma |
| Navegador, vista de móvil, Arabia 120×120 | 0,70 + 0,12 ms | 0,74 + 0,16 ms |
| Navegador, vista de móvil, Val d'Aran 120×120 (5.200 entidades) | — | 0,92 + 0,13 ms |

| Estrés: 300 unidades cruzan Gran San Bernardo (real, 144×144) | — | peor tick 32,5 ms, 0 atascadas, 0 sobre roca |
| Estrés: 300 unidades cruzan Montserrat (real, 144×144) | — | peor tick 28,6 ms, 0 atascadas, 0 sobre roca |

\* En la primera medición contaba como atascada 1 unidad que en realidad estaba quieta atacando; se corrigió el criterio.

**FPS:** en el Mac, un fotograma completo cuesta ~1,2 ms, muy por debajo de los 16,7 ms de 60 FPS. No se ha medido en un móvil real. Un móvil de gama media suele ser entre 5 y 10 veces más lento que este Mac en JavaScript, así que se estiman 6–12 ms por fotograma: 60 FPS en la mayoría de casos, y en todo caso por encima de los 30 FPS exigidos. La simulación va aparte, a 20 ticks por segundo. Los cambios del relieve añaden menos de un 10 % al coste por fotograma.

### Partidas completas en las regiones reales

`npm run simulate -- 60 <mapa> 7 easy` (IA difícil contra IA fácil, conquista). Las 12 regiones, Arabia y Pirineos terminan con un ganador: 10 de ellas en 34–56 minutos de juego; Gran San Bernardo (61:42) y Hastings (67:19) necesitan algo más de una hora. Cada partida tarda 3–13 s en simularse.
