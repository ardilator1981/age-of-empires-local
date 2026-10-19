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
