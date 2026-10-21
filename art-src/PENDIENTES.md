# Arte pendiente

> Generado por `npm run art-todo` a partir del contenido registrado (mods), `src/mods/art/index.ts` y `public/sprites/`.
> **No lo edites a mano**: vuelve a ejecutar el comando después de importar arte nuevo o de añadir contenido.
> `npm test` falla si este archivo está desactualizado. Flujo y plantillas: README («Arte con imágenes») y `docs/prompts-nano-banana.md`.

## Resumen

| Tipo | Hecho | Sin animar | Pendiente |
| --- | ---: | ---: | ---: |
| unidad | 0 | 16 | 30 |
| edificio | 0 | 12 | 27 |
| recurso | 6 | 0 | 4 |
| terreno | 9 | 0 | 0 |
| decoración | 0 | 0 | 9 |
| efecto | 0 | 0 | 12 |
| interfaz | 0 | 0 | 73 |

## Siguiente en generar (por prioridad)

1. Aldeano: recoger, llevar carga y construir · 2. Unidades de combate: andar y atacar · 3. Muerte y edificios por edad · 4. Variantes por edad restantes · 5. Decoración, efectos e interfaz (necesitan además soporte en el motor).

- P1 · **unidad villager**: attack, carry-food, carry-gold, carry-stone
- P2 · **unidad manAtArms**: walk, attack, death
- P2 · **unidad longSwordsman**: walk, attack, death
- P2 · **unidad spearman**: walk, attack, death
- P2 · **unidad pikeman**: walk, attack, death
- P2 · **unidad crossbowman**: walk, attack, death
- P2 · **unidad skirmisher**: walk, attack, death
- P2 · **unidad scoutCavalry**: walk, attack, death
- P2 · **unidad lightCavalry**: walk, attack, death
- P2 · **unidad knight**: walk, attack, death
- P2 · **unidad cavalier**: walk, attack, death
- P2 · **unidad batteringRam**: walk, attack, death
- P2 · **unidad longbowman**: walk, attack, death
- P2 · **unidad throwingAxeman**: walk, attack, death
- P2 · **unidad druzhinnik**: idle, walk, attack, death

## Unidades

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| villager | Aldeano | 🟡 sin animar | attack, carry-food, carry-gold, carry-stone | units/villager-attack.png (+ -mask.png)<br>units/villager-carry-food.png (+ -mask.png)<br>units/villager-carry-gold.png (+ -mask.png)<br>units/villager-carry-stone.png (+ -mask.png) | 1 | `anim:attack-melee` `anim:carry-food` `anim:carry-gold` `anim:carry-stone` |
| militia | Milicia | 🟡 sin animar | death | units/militia-death.png (+ -mask.png) | 3 | `anim:death` |
| manAtArms | Hombre de armas | 🟡 sin animar | walk, attack, death | units/manAtArms-walk.png (+ -mask.png)<br>units/manAtArms-attack.png (+ -mask.png)<br>units/manAtArms-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| longSwordsman | Espadachín de mandoble | 🟡 sin animar | walk, attack, death | units/longSwordsman-walk.png (+ -mask.png)<br>units/longSwordsman-attack.png (+ -mask.png)<br>units/longSwordsman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| spearman | Lancero | 🟡 sin animar | walk, attack, death | units/spearman-walk.png (+ -mask.png)<br>units/spearman-attack.png (+ -mask.png)<br>units/spearman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| pikeman | Piquero | 🟡 sin animar | walk, attack, death | units/pikeman-walk.png (+ -mask.png)<br>units/pikeman-attack.png (+ -mask.png)<br>units/pikeman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| archer | Arquero | 🟡 sin animar | death | units/archer-death.png (+ -mask.png) | 3 | `anim:death` |
| crossbowman | Ballestero | 🟡 sin animar | walk, attack, death | units/crossbowman-walk.png (+ -mask.png)<br>units/crossbowman-attack.png (+ -mask.png)<br>units/crossbowman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack` `anim:death` |
| skirmisher | Hostigador | 🟡 sin animar | walk, attack, death | units/skirmisher-walk.png (+ -mask.png)<br>units/skirmisher-attack.png (+ -mask.png)<br>units/skirmisher-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack` `anim:death` |
| scoutCavalry | Caballería de exploración | 🟡 sin animar | walk, attack, death | units/scoutCavalry-walk.png (+ -mask.png)<br>units/scoutCavalry-attack.png (+ -mask.png)<br>units/scoutCavalry-death.png (+ -mask.png) | 2 | `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| lightCavalry | Caballería ligera | 🟡 sin animar | walk, attack, death | units/lightCavalry-walk.png (+ -mask.png)<br>units/lightCavalry-attack.png (+ -mask.png)<br>units/lightCavalry-death.png (+ -mask.png) | 2 | `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| knight | Caballero | 🟡 sin animar | walk, attack, death | units/knight-walk.png (+ -mask.png)<br>units/knight-attack.png (+ -mask.png)<br>units/knight-death.png (+ -mask.png) | 2 | `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| cavalier | Paladín | 🟡 sin animar | walk, attack, death | units/cavalier-walk.png (+ -mask.png)<br>units/cavalier-attack.png (+ -mask.png)<br>units/cavalier-death.png (+ -mask.png) | 2 | `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| batteringRam | Ariete | 🟡 sin animar | walk, attack, death | units/batteringRam-walk.png (+ -mask.png)<br>units/batteringRam-attack.png (+ -mask.png)<br>units/batteringRam-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| longbowman | Arquero de tiro largo | 🟡 sin animar | walk, attack, death | units/longbowman-walk.png (+ -mask.png)<br>units/longbowman-attack.png (+ -mask.png)<br>units/longbowman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack` `anim:death` |
| throwingAxeman | Guerrero franco | 🟡 sin animar | walk, attack, death | units/throwingAxeman-walk.png (+ -mask.png)<br>units/throwingAxeman-attack.png (+ -mask.png)<br>units/throwingAxeman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack` `anim:death` |
| druzhinnik | Druzhinnik | 🔴 pendiente | idle, walk, attack, death | units/druzhinnik.png (+ -mask.png)<br>units/druzhinnik-walk.png (+ -mask.png)<br>units/druzhinnik-attack.png (+ -mask.png)<br>units/druzhinnik-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| boyarSon | Hijo de boyardo | 🔴 pendiente | idle, walk, attack, death | units/boyarSon.png (+ -mask.png)<br>units/boyarSon-walk.png (+ -mask.png)<br>units/boyarSon-attack.png (+ -mask.png)<br>units/boyarSon-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| strelets | Strelets | 🔴 pendiente | idle, walk, attack, death | units/strelets.png (+ -mask.png)<br>units/strelets-walk.png (+ -mask.png)<br>units/strelets-attack.png (+ -mask.png)<br>units/strelets-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| cossack | Cosaco | 🔴 pendiente | idle, walk, attack, death | units/cossack.png (+ -mask.png)<br>units/cossack-walk.png (+ -mask.png)<br>units/cossack-attack.png (+ -mask.png)<br>units/cossack-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| deer | Ciervo | 🔴 pendiente | idle, walk, death | units/deer.png (+ -mask.png)<br>units/deer-walk.png (+ -mask.png)<br>units/deer-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |
| boar | Jabalí | 🔴 pendiente | idle, walk, attack, death | units/boar.png (+ -mask.png)<br>units/boar-walk.png (+ -mask.png)<br>units/boar-attack.png (+ -mask.png)<br>units/boar-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| sheep | Oveja | 🔴 pendiente | idle, walk, death | units/sheep.png (+ -mask.png)<br>units/sheep-walk.png (+ -mask.png)<br>units/sheep-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |
| musketeer | Mosquetero | 🔴 pendiente | idle, walk, attack, death | units/musketeer.png (+ -mask.png)<br>units/musketeer-walk.png (+ -mask.png)<br>units/musketeer-attack.png (+ -mask.png)<br>units/musketeer-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| cannon | Cañón | 🔴 pendiente | idle, walk, attack, death | units/cannon.png (+ -mask.png)<br>units/cannon-walk.png (+ -mask.png)<br>units/cannon-attack.png (+ -mask.png)<br>units/cannon-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| dragoon | Dragón | 🔴 pendiente | idle, walk, attack, death | units/dragoon.png (+ -mask.png)<br>units/dragoon-walk.png (+ -mask.png)<br>units/dragoon-attack.png (+ -mask.png)<br>units/dragoon-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack:mounted` `anim:death:mounted` |
| grenadier | Granadero | 🔴 pendiente | idle, walk, attack, death | units/grenadier.png (+ -mask.png)<br>units/grenadier-walk.png (+ -mask.png)<br>units/grenadier-attack.png (+ -mask.png)<br>units/grenadier-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| unicorn | Unicornio | 🔴 pendiente | idle, walk, attack, death | units/unicorn.png (+ -mask.png)<br>units/unicorn-walk.png (+ -mask.png)<br>units/unicorn-attack.png (+ -mask.png)<br>units/unicorn-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| fubing | Fubing | 🔴 pendiente | idle, walk, attack, death | units/fubing.png (+ -mask.png)<br>units/fubing-walk.png (+ -mask.png)<br>units/fubing-attack.png (+ -mask.png)<br>units/fubing-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| fireLance | Lancero de fuego | 🔴 pendiente | idle, walk, attack, death | units/fireLance.png (+ -mask.png)<br>units/fireLance-walk.png (+ -mask.png)<br>units/fireLance-attack.png (+ -mask.png)<br>units/fireLance-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| repeatingCrossbowman | Ballestero de repetición | 🔴 pendiente | idle, walk, attack, death | units/repeatingCrossbowman.png (+ -mask.png)<br>units/repeatingCrossbowman-walk.png (+ -mask.png)<br>units/repeatingCrossbowman-attack.png (+ -mask.png)<br>units/repeatingCrossbowman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| counterweightTrebuchet | Trabuquete de contrapeso | 🔴 pendiente | idle, walk, attack, death | units/counterweightTrebuchet.png (+ -mask.png)<br>units/counterweightTrebuchet-walk.png (+ -mask.png)<br>units/counterweightTrebuchet-attack.png (+ -mask.png)<br>units/counterweightTrebuchet-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| divineArquebusier | Arcabucero de las divisiones divinas | 🔴 pendiente | idle, walk, attack, death | units/divineArquebusier.png (+ -mask.png)<br>units/divineArquebusier-walk.png (+ -mask.png)<br>units/divineArquebusier-attack.png (+ -mask.png)<br>units/divineArquebusier-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| eightBannersRider | Jinete de las Ocho Banderas | 🔴 pendiente | idle, walk, attack, death | units/eightBannersRider.png (+ -mask.png)<br>units/eightBannersRider-walk.png (+ -mask.png)<br>units/eightBannersRider-attack.png (+ -mask.png)<br>units/eightBannersRider-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| crusaderKnight | Caballero cruzado | 🔴 pendiente | idle, walk, attack, death | units/crusaderKnight.png (+ -mask.png)<br>units/crusaderKnight-walk.png (+ -mask.png)<br>units/crusaderKnight-attack.png (+ -mask.png)<br>units/crusaderKnight-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| gendarme | Gendarme | 🔴 pendiente | idle, walk, attack, death | units/gendarme.png (+ -mask.png)<br>units/gendarme-walk.png (+ -mask.png)<br>units/gendarme-attack.png (+ -mask.png)<br>units/gendarme-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| ordinanceArquebusier | Arcabucero de la ordenanza | 🔴 pendiente | idle, walk, attack, death | units/ordinanceArquebusier.png (+ -mask.png)<br>units/ordinanceArquebusier-walk.png (+ -mask.png)<br>units/ordinanceArquebusier-attack.png (+ -mask.png)<br>units/ordinanceArquebusier-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| bayonetFusilier | Fusilero con bayoneta | 🔴 pendiente | idle, walk, attack, death | units/bayonetFusilier.png (+ -mask.png)<br>units/bayonetFusilier-walk.png (+ -mask.png)<br>units/bayonetFusilier-attack.png (+ -mask.png)<br>units/bayonetFusilier-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| gribeauvalCannon | Cañón Gribeauval | 🔴 pendiente | idle, walk, attack, death | units/gribeauvalCannon.png (+ -mask.png)<br>units/gribeauvalCannon-walk.png (+ -mask.png)<br>units/gribeauvalCannon-attack.png (+ -mask.png)<br>units/gribeauvalCannon-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| fyrdman | Fyrdman | 🔴 pendiente | idle, walk, attack, death | units/fyrdman.png (+ -mask.png)<br>units/fyrdman-walk.png (+ -mask.png)<br>units/fyrdman-attack.png (+ -mask.png)<br>units/fyrdman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| normanKnight | Caballero normando | 🔴 pendiente | idle, walk, attack, death | units/normanKnight.png (+ -mask.png)<br>units/normanKnight-walk.png (+ -mask.png)<br>units/normanKnight-attack.png (+ -mask.png)<br>units/normanKnight-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| tudorArquebusier | Arcabucero Tudor | 🔴 pendiente | idle, walk, attack, death | units/tudorArquebusier.png (+ -mask.png)<br>units/tudorArquebusier-walk.png (+ -mask.png)<br>units/tudorArquebusier-attack.png (+ -mask.png)<br>units/tudorArquebusier-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| redcoat | Casaca roja | 🔴 pendiente | idle, walk, attack, death | units/redcoat.png (+ -mask.png)<br>units/redcoat-walk.png (+ -mask.png)<br>units/redcoat-attack.png (+ -mask.png)<br>units/redcoat-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| warElephant | Elefante de guerra | 🔴 pendiente | idle, walk, attack, death | units/warElephant.png (+ -mask.png)<br>units/warElephant-walk.png (+ -mask.png)<br>units/warElephant-attack.png (+ -mask.png)<br>units/warElephant-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| general | General | 🔴 pendiente | idle, walk, attack, death | units/general.png (+ -mask.png)<br>units/general-walk.png (+ -mask.png)<br>units/general-attack.png (+ -mask.png)<br>units/general-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| king | Rey | 🔴 pendiente | idle, walk, death | units/king.png (+ -mask.png)<br>units/king-walk.png (+ -mask.png)<br>units/king-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |

*primero la imagen quieta (Pack 6a/6b) y luego las animaciones*

## Edificios

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| townCenter | Centro urbano | 🟡 sin animar | Edad de la Pólvora | buildings/townCenter-4.png (+ -mask.png) | 4 | `building:age` |
| house | Casa | 🟡 sin animar | Edad de la Pólvora | buildings/house-4.png (+ -mask.png) | 4 | `building:age` |
| mill | Molino | 🟡 sin animar | Edad de la Pólvora | buildings/mill-4.png (+ -mask.png) | 4 | `building:age` |
| lumberCamp | Campamento maderero | 🟡 sin animar | Edad de la Pólvora | buildings/lumberCamp-4.png (+ -mask.png) | 4 | `building:age` |
| miningCamp | Campamento minero | 🟡 sin animar | Edad de la Pólvora | buildings/miningCamp-4.png (+ -mask.png) | 4 | `building:age` |
| farm | Granja | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/farm.png (+ -mask.png)<br>buildings/farm-1.png (+ -mask.png)<br>buildings/farm-2.png (+ -mask.png)<br>buildings/farm-3.png (+ -mask.png)<br>buildings/farm-4.png (+ -mask.png) | 3 | `building:base` |
| barracks | Cuartel | 🟡 sin animar | Edad de la Pólvora | buildings/barracks-4.png (+ -mask.png) | 4 | `building:age` |
| archeryRange | Galería de tiro con arco | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/archeryRange-2.png (+ -mask.png)<br>buildings/archeryRange-3.png (+ -mask.png)<br>buildings/archeryRange-4.png (+ -mask.png) | 4 | `building:age` |
| stable | Establo | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/stable-2.png (+ -mask.png)<br>buildings/stable-3.png (+ -mask.png)<br>buildings/stable-4.png (+ -mask.png) | 4 | `building:age` |
| blacksmith | Herrería | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/blacksmith-2.png (+ -mask.png)<br>buildings/blacksmith-3.png (+ -mask.png)<br>buildings/blacksmith-4.png (+ -mask.png) | 4 | `building:age` |
| watchTower | Torre de vigilancia | 🟡 sin animar | Edad de la Pólvora | buildings/watchTower-4.png (+ -mask.png) | 4 | `building:age` |
| siegeWorkshop | Taller de asedio | 🟡 sin animar | Edad Imperial, Edad de la Pólvora | buildings/siegeWorkshop-3.png (+ -mask.png)<br>buildings/siegeWorkshop-4.png (+ -mask.png) | 4 | `building:age` |
| castle | Castillo | 🟡 sin animar | Edad Imperial, Edad de la Pólvora | buildings/castle-3.png (+ -mask.png)<br>buildings/castle-4.png (+ -mask.png) | 4 | `building:age` |
| gorodishche | Gorodishche | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/gorodishche.png (+ -mask.png)<br>buildings/gorodishche-1.png (+ -mask.png)<br>buildings/gorodishche-2.png (+ -mask.png)<br>buildings/gorodishche-3.png (+ -mask.png)<br>buildings/gorodishche-4.png (+ -mask.png) | 3 | `building:base` |
| monasteryFortress | Monasterio-fortaleza | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/monasteryFortress.png (+ -mask.png)<br>buildings/monasteryFortress-2.png (+ -mask.png)<br>buildings/monasteryFortress-3.png (+ -mask.png)<br>buildings/monasteryFortress-4.png (+ -mask.png) | 3 | `building:base` |
| kremlin | Kremlin de piedra | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora | buildings/kremlin.png (+ -mask.png)<br>buildings/kremlin-3.png (+ -mask.png)<br>buildings/kremlin-4.png (+ -mask.png) | 3 | `building:base` |
| ostrog | Ostrog | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora | buildings/ostrog.png (+ -mask.png)<br>buildings/ostrog-4.png (+ -mask.png) | 3 | `building:base` |
| corral | Corral | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/corral.png (+ -mask.png)<br>buildings/corral-2.png (+ -mask.png)<br>buildings/corral-3.png (+ -mask.png)<br>buildings/corral-4.png (+ -mask.png) | 3 | `building:base` |
| gunpowderWorks | Fábrica de pólvora | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/gunpowderWorks.png (+ -mask.png) | 3 | `building:base` |
| fortress | Fortaleza | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/fortress.png (+ -mask.png) | 3 | `building:base` |
| printingHouse | Imprenta | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/printingHouse.png (+ -mask.png) | 3 | `building:base` |
| observatory | Observatorio | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/observatory.png (+ -mask.png) | 3 | `building:base` |
| tradingCompany | Compañía comercial | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/tradingCompany.png (+ -mask.png) | 3 | `building:base` |
| engineerAcademy | Academia de ingenieros | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/engineerAcademy.png (+ -mask.png) | 3 | `building:base` |
| stateGranary | Granero estatal | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/stateGranary.png (+ -mask.png)<br>buildings/stateGranary-1.png (+ -mask.png)<br>buildings/stateGranary-2.png (+ -mask.png)<br>buildings/stateGranary-3.png (+ -mask.png)<br>buildings/stateGranary-4.png (+ -mask.png) | 3 | `building:base` |
| mint | Casa de moneda | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/mint.png (+ -mask.png)<br>buildings/mint-2.png (+ -mask.png)<br>buildings/mint-3.png (+ -mask.png)<br>buildings/mint-4.png (+ -mask.png) | 3 | `building:base` |
| grandCanal | Gran Canal | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora | buildings/grandCanal.png (+ -mask.png)<br>buildings/grandCanal-3.png (+ -mask.png)<br>buildings/grandCanal-4.png (+ -mask.png) | 3 | `building:base` |
| forbiddenCity | Ciudad Prohibida | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora | buildings/forbiddenCity.png (+ -mask.png)<br>buildings/forbiddenCity-4.png (+ -mask.png) | 3 | `building:base` |
| cantonHong | Hong de Cantón | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/cantonHong.png (+ -mask.png) | 3 | `building:base` |
| royalVilla | Villa real | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/royalVilla.png (+ -mask.png)<br>buildings/royalVilla-1.png (+ -mask.png)<br>buildings/royalVilla-2.png (+ -mask.png)<br>buildings/royalVilla-3.png (+ -mask.png)<br>buildings/royalVilla-4.png (+ -mask.png) | 3 | `building:base` |
| gothicCathedral | Catedral gótica | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/gothicCathedral.png (+ -mask.png)<br>buildings/gothicCathedral-2.png (+ -mask.png)<br>buildings/gothicCathedral-3.png (+ -mask.png)<br>buildings/gothicCathedral-4.png (+ -mask.png) | 3 | `building:base` |
| bastide | Bastida | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora | buildings/bastide.png (+ -mask.png)<br>buildings/bastide-3.png (+ -mask.png)<br>buildings/bastide-4.png (+ -mask.png) | 3 | `building:base` |
| chateau | Château | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora | buildings/chateau.png (+ -mask.png)<br>buildings/chateau-4.png (+ -mask.png) | 3 | `building:base` |
| vaubanFortress | Fortaleza de Vauban | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/vaubanFortress.png (+ -mask.png) | 3 | `building:base` |
| royalManufacture | Manufactura real | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/royalManufacture.png (+ -mask.png) | 3 | `building:base` |
| burh | Burh | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/burh.png (+ -mask.png)<br>buildings/burh-1.png (+ -mask.png)<br>buildings/burh-2.png (+ -mask.png)<br>buildings/burh-3.png (+ -mask.png)<br>buildings/burh-4.png (+ -mask.png) | 3 | `building:base` |
| motteAndBailey | Castillo de mota | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora | buildings/motteAndBailey.png (+ -mask.png)<br>buildings/motteAndBailey-2.png (+ -mask.png)<br>buildings/motteAndBailey-3.png (+ -mask.png)<br>buildings/motteAndBailey-4.png (+ -mask.png) | 3 | `building:base` |
| concentricCastle | Castillo concéntrico | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora | buildings/concentricCastle.png (+ -mask.png)<br>buildings/concentricCastle-3.png (+ -mask.png)<br>buildings/concentricCastle-4.png (+ -mask.png) | 3 | `building:base` |
| bank | Banco | 🔴 pendiente | imagen base (Edad de la Pólvora) | buildings/bank.png (+ -mask.png) | 3 | `building:base` |

*huella 4x4*
*huella 2x2*
*huella 3x3*
*huella 1x1*

## Recursos

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| tree | Árbol | ✅ hecho | — | — | — | — |
| pineTree | Pino | ✅ hecho | — | — | — | — |
| snowPine | Pino nevado | ✅ hecho | — | — | — | — |
| goldMine | Mina de oro | ✅ hecho | — | — | — | — |
| stoneMine | Cantera de piedra | ✅ hecho | — | — | — | — |
| berries | Arbusto de bayas | ✅ hecho | — | — | — | — |
| deerCarcass | Ciervo abatido | 🔴 pendiente | imagen | resources/deerCarcass.png | 3 | `resource` |
| boarCarcass | Jabalí abatido | 🔴 pendiente | imagen | resources/boarCarcass.png | 3 | `resource` |
| sheepCarcass | Oveja sacrificada | 🔴 pendiente | imagen | resources/sheepCarcass.png | 3 | `resource` |
| treasure | Cofre del tesoro | 🔴 pendiente | imagen | resources/treasure.png | 3 | `resource` |

## Terrenos

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| grass | Hierba | ✅ hecho | — | — | — | — |
| dirt | Tierra | ✅ hecho | — | — | — | — |
| forest | Suelo de bosque | ✅ hecho | — | — | — | — |
| sand | Arena | ✅ hecho | — | — | — | — |
| water | Agua | ✅ hecho | — | — | — | — |
| shallows | Vado | ✅ hecho | — | — | — | — |
| desert | Desierto | ✅ hecho | — | — | — | — |
| snow | Nieve | ✅ hecho | — | — | — | — |
| rock | Roca | ✅ hecho | — | — | — | — |

## Decoraciónes

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| tuft | tuft | 🔴 pendiente | imagen | decorations/tuft.png | 5 | `decoration` |
| dryTuft | dryTuft | 🔴 pendiente | imagen | decorations/dryTuft.png | 5 | `decoration` |
| flowers | flowers | 🔴 pendiente | imagen | decorations/flowers.png | 5 | `decoration` |
| shrub | shrub | 🔴 pendiente | imagen | decorations/shrub.png | 5 | `decoration` |
| pebbles | pebbles | 🔴 pendiente | imagen | decorations/pebbles.png | 5 | `decoration` |
| fern | fern | 🔴 pendiente | imagen | decorations/fern.png | 5 | `decoration` |
| reeds | reeds | 🔴 pendiente | imagen | decorations/reeds.png | 5 | `decoration` |
| dryShrub | dryShrub | 🔴 pendiente | imagen | decorations/dryShrub.png | 5 | `decoration` |
| snowRock | snowRock | 🔴 pendiente | imagen | decorations/snowRock.png | 5 | `decoration` |

*el motor todavía no usa estas imágenes (se dibuja por código)*

## Efectos

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| projectile-arrow | Proyectil: arrow | 🔴 pendiente | imagen | effects/projectile-arrow.png | 5 | `effect` |
| projectile-javelin | Proyectil: javelin | 🔴 pendiente | imagen | effects/projectile-javelin.png | 5 | `effect` |
| projectile-axe | Proyectil: axe | 🔴 pendiente | imagen | effects/projectile-axe.png | 5 | `effect` |
| projectile-bullet | Proyectil: bullet | 🔴 pendiente | imagen | effects/projectile-bullet.png | 5 | `effect` |
| projectile-cannonball | Proyectil: cannonball | 🔴 pendiente | imagen | effects/projectile-cannonball.png | 5 | `effect` |
| projectile-rock | Proyectil: rock | 🔴 pendiente | imagen | effects/projectile-rock.png | 5 | `effect` |
| rubble | Escombros de edificio | 🔴 pendiente | imagen | effects/rubble.png | 5 | `effect` |
| fire | Llama | 🔴 pendiente | imagen | effects/fire.png | 5 | `effect` |
| smoke | Humo | 🔴 pendiente | imagen | effects/smoke.png | 5 | `effect` |
| dust | Polvo | 🔴 pendiente | imagen | effects/dust.png | 5 | `effect` |
| rally-flag | Bandera de punto de reunión | 🔴 pendiente | imagen | effects/rally-flag.png | 5 | `effect` |
| treasure-chest | Cofre del tesoro | 🔴 pendiente | imagen | effects/treasure-chest.png | 5 | `effect` |

*el motor todavía no usa estas imágenes (se dibuja por código)*

## Interfaz

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| icon-food | Icono de Alimento | 🔴 pendiente | imagen | ui/icon-food.png | 5 | `ui:icon` |
| icon-wood | Icono de Madera | 🔴 pendiente | imagen | ui/icon-wood.png | 5 | `ui:icon` |
| icon-gold | Icono de Oro | 🔴 pendiente | imagen | ui/icon-gold.png | 5 | `ui:icon` |
| icon-stone | Icono de Piedra | 🔴 pendiente | imagen | ui/icon-stone.png | 5 | `ui:icon` |
| icon-population | Icono de población | 🔴 pendiente | imagen | ui/icon-population.png | 5 | `ui:icon` |
| icon-idle-villager | Aldeano inactivo | 🔴 pendiente | imagen | ui/icon-idle-villager.png | 5 | `ui:icon` |
| icon-attack | Atacar | 🔴 pendiente | imagen | ui/icon-attack.png | 5 | `ui:icon` |
| icon-stop | Parar | 🔴 pendiente | imagen | ui/icon-stop.png | 5 | `ui:icon` |
| icon-delete | Eliminar | 🔴 pendiente | imagen | ui/icon-delete.png | 5 | `ui:icon` |
| icon-build | Construir | 🔴 pendiente | imagen | ui/icon-build.png | 5 | `ui:icon` |
| icon-rally | Punto de reunión | 🔴 pendiente | imagen | ui/icon-rally.png | 5 | `ui:icon` |
| panel-stone | Panel de piedra | 🔴 pendiente | imagen | ui/panel-stone.png | 5 | `ui:panel` |
| panel-wood | Panel de madera | 🔴 pendiente | imagen | ui/panel-wood.png | 5 | `ui:panel` |
| panel-parchment | Pergamino | 🔴 pendiente | imagen | ui/panel-parchment.png | 5 | `ui:panel` |
| frame-corner | Esquina de marco | 🔴 pendiente | imagen | ui/frame-corner.png | 5 | `ui:panel` |
| feudalAge | Tecnología: Edad Feudal | 🔴 pendiente | imagen | ui/tech/feudalAge.png | 5 | `ui:tech` |
| castleAge | Tecnología: Edad de los Castillos | 🔴 pendiente | imagen | ui/tech/castleAge.png | 5 | `ui:tech` |
| imperialAge | Tecnología: Edad Imperial | 🔴 pendiente | imagen | ui/tech/imperialAge.png | 5 | `ui:tech` |
| loom | Tecnología: Telar | 🔴 pendiente | imagen | ui/tech/loom.png | 5 | `ui:tech` |
| wheelbarrow | Tecnología: Carretilla | 🔴 pendiente | imagen | ui/tech/wheelbarrow.png | 5 | `ui:tech` |
| handCart | Tecnología: Carro de mano | 🔴 pendiente | imagen | ui/tech/handCart.png | 5 | `ui:tech` |
| doubleBitAxe | Tecnología: Hacha de doble filo | 🔴 pendiente | imagen | ui/tech/doubleBitAxe.png | 5 | `ui:tech` |
| bowSaw | Tecnología: Sierra de arco | 🔴 pendiente | imagen | ui/tech/bowSaw.png | 5 | `ui:tech` |
| horseCollar | Tecnología: Collera | 🔴 pendiente | imagen | ui/tech/horseCollar.png | 5 | `ui:tech` |
| heavyPlow | Tecnología: Arado pesado | 🔴 pendiente | imagen | ui/tech/heavyPlow.png | 5 | `ui:tech` |
| goldMining | Tecnología: Minería de oro | 🔴 pendiente | imagen | ui/tech/goldMining.png | 5 | `ui:tech` |
| stoneMining | Tecnología: Cantería | 🔴 pendiente | imagen | ui/tech/stoneMining.png | 5 | `ui:tech` |
| forging | Tecnología: Forja | 🔴 pendiente | imagen | ui/tech/forging.png | 5 | `ui:tech` |
| ironCasting | Tecnología: Fundición de hierro | 🔴 pendiente | imagen | ui/tech/ironCasting.png | 5 | `ui:tech` |
| fletching | Tecnología: Emplumado | 🔴 pendiente | imagen | ui/tech/fletching.png | 5 | `ui:tech` |
| bodkinArrow | Tecnología: Flecha punzante | 🔴 pendiente | imagen | ui/tech/bodkinArrow.png | 5 | `ui:tech` |
| scaleMail | Tecnología: Cota de escamas | 🔴 pendiente | imagen | ui/tech/scaleMail.png | 5 | `ui:tech` |
| scaleBarding | Tecnología: Barda de escamas | 🔴 pendiente | imagen | ui/tech/scaleBarding.png | 5 | `ui:tech` |
| paddedArcherArmor | Tecnología: Armadura acolchada | 🔴 pendiente | imagen | ui/tech/paddedArcherArmor.png | 5 | `ui:tech` |
| up_manAtArms | Tecnología: Hombre de armas | 🔴 pendiente | imagen | ui/tech/up_manAtArms.png | 5 | `ui:tech` |
| up_longSwordsman | Tecnología: Espadachín de mandoble | 🔴 pendiente | imagen | ui/tech/up_longSwordsman.png | 5 | `ui:tech` |
| up_pikeman | Tecnología: Piquero | 🔴 pendiente | imagen | ui/tech/up_pikeman.png | 5 | `ui:tech` |
| up_crossbowman | Tecnología: Ballestero | 🔴 pendiente | imagen | ui/tech/up_crossbowman.png | 5 | `ui:tech` |
| up_lightCavalry | Tecnología: Caballería ligera | 🔴 pendiente | imagen | ui/tech/up_lightCavalry.png | 5 | `ui:tech` |
| up_cavalier | Tecnología: Paladín | 🔴 pendiente | imagen | ui/tech/up_cavalier.png | 5 | `ui:tech` |
| yeomen | Tecnología: Arqueros ingleses | 🔴 pendiente | imagen | ui/tech/yeomen.png | 5 | `ui:tech` |
| beardedAxe | Tecnología: Hacha barbada | 🔴 pendiente | imagen | ui/tech/beardedAxe.png | 5 | `ui:tech` |
| russkayaPravda | Tecnología: Russkaya Pravda | 🔴 pendiente | imagen | ui/tech/russkayaPravda.png | 5 | `ui:tech` |
| siberianMarch | Tecnología: Marcha a Siberia | 🔴 pendiente | imagen | ui/tech/siberianMarch.png | 5 | `ui:tech` |
| selectiveBreeding | Tecnología: Cría selectiva | 🔴 pendiente | imagen | ui/tech/selectiveBreeding.png | 5 | `ui:tech` |
| gunpowderAge | Tecnología: Edad de la Pólvora | 🔴 pendiente | imagen | ui/tech/gunpowderAge.png | 5 | `ui:tech` |
| printing | Tecnología: Imprenta | 🔴 pendiente | imagen | ui/tech/printing.png | 5 | `ui:tech` |
| cartography | Tecnología: Cartografía | 🔴 pendiente | imagen | ui/tech/cartography.png | 5 | `ui:tech` |
| ballistics | Tecnología: Balística | 🔴 pendiente | imagen | ui/tech/ballistics.png | 5 | `ui:tech` |
| advancedMetallurgy | Tecnología: Metalurgia avanzada | 🔴 pendiente | imagen | ui/tech/advancedMetallurgy.png | 5 | `ui:tech` |
| bayonet | Tecnología: Bayoneta | 🔴 pendiente | imagen | ui/tech/bayonet.png | 5 | `ui:tech` |
| refinedPowder | Tecnología: Pólvora refinada | 🔴 pendiente | imagen | ui/tech/refinedPowder.png | 5 | `ui:tech` |
| bastionTheory | Tecnología: Fortificación abaluartada | 🔴 pendiente | imagen | ui/tech/bastionTheory.png | 5 | `ui:tech` |
| deepMining | Tecnología: Mina profunda | 🔴 pendiente | imagen | ui/tech/deepMining.png | 5 | `ui:tech` |
| mercantilism | Tecnología: Mercantilismo | 🔴 pendiente | imagen | ui/tech/mercantilism.png | 5 | `ui:tech` |
| imperialExams | Tecnología: Exámenes imperiales | 🔴 pendiente | imagen | ui/tech/imperialExams.png | 5 | `ui:tech` |
| champaRice | Tecnología: Arroz de Champa | 🔴 pendiente | imagen | ui/tech/champaRice.png | 5 | `ui:tech` |
| jiaozi | Tecnología: Billete jiaozi | 🔴 pendiente | imagen | ui/tech/jiaozi.png | 5 | `ui:tech` |
| thunderBomb | Tecnología: Bomba trueno | 🔴 pendiente | imagen | ui/tech/thunderBomb.png | 5 | `ui:tech` |
| mandarinDuck | Tecnología: Pato mandarín | 🔴 pendiente | imagen | ui/tech/mandarinDuck.png | 5 | `ui:tech` |
| cantonSystem | Tecnología: Cantón | 🔴 pendiente | imagen | ui/tech/cantonSystem.png | 5 | `ui:tech` |
| capitularies | Tecnología: Capitulares | 🔴 pendiente | imagen | ui/tech/capitularies.png | 5 | `ui:tech` |
| townCharter | Tecnología: Carta urbana | 🔴 pendiente | imagen | ui/tech/townCharter.png | 5 | `ui:tech` |
| taille | Tecnología: Taille | 🔴 pendiente | imagen | ui/tech/taille.png | 5 | `ui:tech` |
| hireMercenaries | Tecnología: Contratar mercenarios | 🔴 pendiente | imagen | ui/tech/hireMercenaries.png | 5 | `ui:tech` |
| colbertism | Tecnología: Colbertismo | 🔴 pendiente | imagen | ui/tech/colbertism.png | 5 | `ui:tech` |
| vaubanDoctrine | Tecnología: Doctrina de Vauban | 🔴 pendiente | imagen | ui/tech/vaubanDoctrine.png | 5 | `ui:tech` |
| gribeauvalDoctrine | Tecnología: Doctrina de Gribeauval | 🔴 pendiente | imagen | ui/tech/gribeauvalDoctrine.png | 5 | `ui:tech` |
| alfredReform | Tecnología: Reforma de Alfredo | 🔴 pendiente | imagen | ui/tech/alfredReform.png | 5 | `ui:tech` |
| domesday | Tecnología: Domesday | 🔴 pendiente | imagen | ui/tech/domesday.png | 5 | `ui:tech` |
| companyCharter | Tecnología: Carta de compañía | 🔴 pendiente | imagen | ui/tech/companyCharter.png | 5 | `ui:tech` |
| nationalDebt | Tecnología: Deuda nacional | 🔴 pendiente | imagen | ui/tech/nationalDebt.png | 5 | `ui:tech` |
| ironTusks | Tecnología: Colmillos de hierro | 🔴 pendiente | imagen | ui/tech/ironTusks.png | 5 | `ui:tech` |

*el motor todavía no usa estas imágenes (se dibuja por código)*

## Prompts

Cada fila apunta a una plantilla por su clave. Adjunta la imagen del personaje o edificio indicado y pega el texto. Después: `npm run art-import` y `npm run art-todo`.

### `anim:attack`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of shooting toward the lower right: standing ready, drawing, aiming, releasing, and lowering the weapon. The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:attack-melee`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of one sword blow toward the lower right: standing ready, raising the weapon, weapon high, swinging down, follow-through, and recovering. The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:attack-melee:mounted`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of one sword blow from horseback toward the lower right: standing ready, raising the weapon, weapon high, swinging down, follow-through, and recovering (the horse moves, the rider stays in the saddle). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:attack:mounted`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of shooting toward the lower right: standing ready, drawing, aiming, releasing, and lowering the weapon (the horse moves, the rider stays in the saddle). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:carry-food`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 8 poses of walking while carrying a full basket of food. The 8 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:carry-gold`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 8 poses of walking with a heavy sack of ore over the shoulder. The 8 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:carry-stone`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 8 poses of walking with a heavy sack of ore over the shoulder. The 8 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:death`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of falling down: being hit, staggering, knees giving way, falling, lying on the ground, lying still. The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:death:mounted`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of falling down: being hit, staggering, knees giving way, falling, lying on the ground, lying still (the horse moves, the rider stays in the saddle). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:walk`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of one complete walking step that loops smoothly: right foot forward, passing, left foot forward, passing. The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:walk:mounted`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of one complete walking step that loops smoothly: right hoof forward, passing, left hoof forward, passing (the horse moves, the rider stays in the saddle). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `building:age`

```text
Redraw the attached building as it would look in a later, richer period (feudal: half-timbered walls, red clay tiles; castles: dressed stone, slate roofs; imperial: ornate stone and brick, spires), keeping the same viewing angle, size, footprint and lighting from the upper left. Plain white background, no shadow, no ground. Flags and awnings in bright magenta. No writing, no numbers, no frame.
```

### `building:base`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw the building seen from high above at a corner so that its ground plan looks like a diamond twice as wide as tall, floating on a plain white background with wide gaps, no shadow, no ground. Flags and awnings in bright magenta. No people, no writing, no numbers, no frame. (See Packs 3 and 4 in docs/prompts-nano-banana.md.)
```

### `decoration`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw small separate ground decorations (about 12 per picture, 4 per row) on a plain white background with wide gaps, seen from high above at an angle, each much smaller than a map tile, no shadow, no ground patch. No writing, no numbers, no frame. (See Pack 8.)
```

### `effect`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw small separate objects or effect frames (projectiles seen from the side pointing right; flames, smoke and dust in 4 stages each) on a plain white background with wide gaps, no shadow. No writing, no numbers, no frame. (See Pack 7.)
```

### `resource`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw the resource, in stages from full to nearly exhausted, on a plain white background with wide gaps, no shadow, no ground, seen from high above at an angle. No writing, no numbers, no frame. (See Pack 2.)
```

### `ui:icon`

```text
Twelve small square paintings in three rows of four on a plain white background with white gaps, each a single object on a dark warm background inside a bevelled grey stone border, easy to recognise when very small, light from the upper left, warm medieval colors. No writing, no letters, no numbers. (See Pack 9.)
```

### `ui:panel`

```text
Twelve small square paintings in three rows of four on a plain white background with white gaps, each a single object on a dark warm background inside a bevelled grey stone border, easy to recognise when very small, light from the upper left, warm medieval colors. No writing, no letters, no numbers. (See Pack 9.)
```

### `ui:tech`

```text
Twelve small square paintings in three rows of four on a plain white background with white gaps, each a single object on a dark warm background inside a bevelled grey stone border, easy to recognise when very small, light from the upper left, warm medieval colors. No writing, no letters, no numbers. (See Pack 9.)
```

### `unit:still`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw the character(s) full length, seen from slightly above, turned toward the lower right and standing calmly ready, on a plain white background with wide empty white gaps, no shadow, no ground. Tunics, tabards, shields and cloth in bright magenta (intense pink-purple); magenta nowhere else. No writing, no numbers, no frame. (Several characters per picture, see Pack 6 in docs/prompts-nano-banana.md.)
```
