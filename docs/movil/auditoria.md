# Interfaz móvil: auditoría (antes)

Capturas tomadas con `node scripts/mobile-shots.mjs --prefix antes` (Chrome sin ventana con emulación táctil real),
sobre `main` (bbd213e). El porcentaje es la fracción de puntos de la pantalla en los que lo que queda encima es el mapa
(la interfaz, aunque sea semitransparente, cuenta como tapado).

| Dispositivo | Nada seleccionado | Aldeano | Centro urbano |
| --- | --- | --- | --- |
| Móvil horizontal 844×390 | **61 %** | 61 % | 61 % |
| Móvil vertical 390×844 | 0 % (aviso de girar) · 68 % tras «Seguir en vertical» | 0 % | 0 % |
| Tableta 1024×768 | 68,6 % | 68,6 % | 68,6 % |

Capturas: `antes-<dispositivo>-<escena>.png` en esta carpeta.

## Qué ocupa más espacio y qué cuesta usar

1. El panel inferior (112 px + borde ≈ 30 % del alto en 844×390) está siempre visible, aunque no haya nada seleccionado.
2. La rejilla de 16 comandos muestra casillas vacías: con un aldeano solo se usan 4 (y con nada seleccionado, ninguna).
3. La barra superior es opaca y ocupa todo el ancho (30 px ≈ 8 %), con texto largo de edad y civilización.
4. Los tres botones flotantes (Ordenar, Inactivo, Panel, 56×52 px) tapan una franja del borde derecho del mapa.
5. El minimapa (94 px) va dentro del panel: no se puede ampliar ni plegar, y es pequeño para apuntar con el dedo.
6. Eliminar (❌) está a un toque, junto a Detener y sin confirmación; cancelar una cola de producción también es un toque.
7. Textos de 11 px en el panel de selección, miniaturas de selección múltiple de 34 px y cola de 32 px (< 44 px).
8. Colocar un edificio lo construye al levantar el dedo: el dedo tapa el fantasma y no hay confirmar/cancelar.
9. No hay grupos de control táctiles, ni botón de ejército, ni alertas; ordenar exige pulsación larga o el modo «Ordenar».
10. En vertical el aviso tapa todo; al seguir, el panel pasa a 214 px y la tableta reserva 196 px fijos (≈ 26 %).
