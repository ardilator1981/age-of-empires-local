# Créditos de sonido

Este juego **no incluye ningún archivo de audio**. Todo lo que suena (música, efectos, alertas y ambiente) se
genera en el navegador con la Web Audio API a partir de código original de este proyecto. No se usa
ningún sonido de *Age of Empires* ni de otros juegos comerciales, ni muestras de terceros.

| Sonido | Dónde se genera | Cómo se hace | Procedencia y licencia |
| --- | --- | --- | --- |
| Música (paz, batalla, menú, victoria y derrota) | `src/audio/Music.ts` | Composición generativa: cuerdas pulsadas (Karplus-Strong), flauta, viela, bordón, arpa, percusión y sala de reverberación sintéticas | Original del proyecto, misma licencia que el código |
| Confirmación de movimiento | `src/audio/sfx.ts` (`confirmMove`) | Dos notas de laúd sintético | Original del proyecto |
| Confirmación de recolección | `sfx.ts` (`confirmGather`) | Dos golpes de bloque de madera | Original del proyecto |
| Confirmación de construcción | `sfx.ts` (`confirmBuild`) | Dos martillazos (tono grave con caída y ruido filtrado) | Original del proyecto |
| Confirmación de ataque | `sfx.ts` (`confirmAttack`) | Roce metálico (ruido agudo y diente de sierra) y golpe de tambor | Original del proyecto |
| Edificio terminado | `sfx.ts` (`buildingDone`) | Acorde de tres campanas | Original del proyecto |
| Unidad entrenada | `sfx.ts` (`unitTrained`) | Dos notas de cuerno | Original del proyecto |
| Tecnología investigada | `sfx.ts` (`techDone`) | Arpegio de campanillas | Original del proyecto |
| Nueva edad | `sfx.ts` (`ageUp`) | Fanfarria de trompetas sintéticas con timbal | Original del proyecto |
| Recurso agotado | `sfx.ts` (`depleted`) | Dos notas graves descendentes y un golpe sordo | Original del proyecto |
| Ataque a unidades | `sfx.ts` (`alertUnits`) | Cuerno de guerra (dos toques graves) | Original del proyecto |
| Ataque a edificios | `sfx.ts` (`alertBuildings`) | Campana de alarma (tres toques) | Original del proyecto |
| Aldeano inactivo | `sfx.ts` (`villagerIdle`) | Dos campanillas suaves | Original del proyecto |
| Error: sin recursos | `sfx.ts` (`errResources`) | Dos notas graves descendentes y un tintineo apagado | Original del proyecto |
| Error: no se puede construir ahí | `sfx.ts` (`errPlacement`) | Zumbido grave corto | Original del proyecto |
| Error: límite de población | `sfx.ts` (`errPopulation`) | Tres golpes de madera que bajan | Original del proyecto |
| Error genérico (requisitos, cola llena) | `sfx.ts` (`errGeneric`) | Nota grave apagada | Original del proyecto |
| Combate: espada, flecha y golpe a edificio | `sfx.ts` (`hitMelee`, `hitArrow`, `hitBuilding`) | Parciales metálicos inarmónicos; golpe seco; golpe sordo de madera | Original del proyecto |
| Ambiente: pájaros | `sfx.ts` (`bird`) | Glissandos agudos cortos | Original del proyecto |
| Ambiente: viento | `src/audio/AudioManager.ts` | Ruido filtrado con ráfagas lentas | Original del proyecto |

Los créditos de los datos geográficos (relieve, OpenStreetMap, teselas del mapamundi) están en el juego, en
**Menú principal → Créditos y atribuciones**.
