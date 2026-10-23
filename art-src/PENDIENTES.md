# Arte pendiente

> Generado por `npm run art-todo` a partir del contenido registrado (mods), `src/mods/art/index.ts` y `public/sprites/`.
> **No lo edites a mano**: vuelve a ejecutar el comando después de importar arte nuevo o de añadir contenido.
> `npm test` falla si este archivo está desactualizado. Flujo y plantillas: README («Arte con imágenes») y `docs/prompts-nano-banana.md`.

## Resumen

| Tipo | Hecho | Sin animar | Pendiente |
| --- | ---: | ---: | ---: |
| unidad | 2 | 14 | 64 |
| edificio | 0 | 12 | 47 |
| recurso | 6 | 0 | 6 |
| terreno | 9 | 0 | 0 |
| decoración | 9 | 0 | 0 |
| efecto | 8 | 0 | 5 |
| interfaz | 11 | 0 | 94 |

## Siguiente en generar (por prioridad)

1. Aldeano: recoger, llevar carga y construir · 2. Unidades de combate: andar y atacar · 3. Muerte y edificios por edad · 4. Variantes por edad restantes · 5. Decoración, efectos e interfaz (necesitan además soporte en el motor).

- P1 · **unidad villager**: attack, work-iron, carry-iron, work-coal, carry-coal
- P2 · **unidad longSwordsman**: walk, attack, death
- P2 · **unidad pikeman**: walk, attack, death
- P2 · **unidad batteringRam**: walk, attack, death
- P2 · **unidad druzhinnik**: idle, walk, attack, death
- P2 · **unidad boyarSon**: idle, walk, attack, death
- P2 · **unidad strelets**: idle, walk, attack, death
- P2 · **unidad cossack**: idle, walk, attack, death
- P2 · **unidad deer**: idle, walk, death
- P2 · **unidad boar**: idle, walk, attack, death
- P2 · **unidad sheep**: idle, walk, death
- P2 · **unidad musketeer**: idle, walk, attack, death
- P2 · **unidad cannon**: idle, walk, attack, death
- P2 · **unidad dragoon**: idle, walk, attack, death
- P2 · **unidad grenadier**: idle, walk, attack, death

## Unidades

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| villager | Aldeano | 🟡 sin animar | attack, work-iron, carry-iron, work-coal, carry-coal | units/villager-attack.png (+ -mask.png)<br>units/villager-work-iron.png (+ -mask.png)<br>units/villager-carry-iron.png (+ -mask.png)<br>units/villager-work-coal.png (+ -mask.png)<br>units/villager-carry-coal.png (+ -mask.png) | 1 | `anim:attack-melee` `anim:work-iron` `anim:carry-iron` `anim:work-coal` `anim:carry-coal` |
| militia | Milicia | ✅ hecho | — | — | — | — |
| manAtArms | Hombre de armas | 🟡 sin animar | death | units/manAtArms-death.png (+ -mask.png) | 3 | `anim:death` |
| longSwordsman | Espadachín de mandoble | 🟡 sin animar | walk, attack, death | units/longSwordsman-walk.png (+ -mask.png)<br>units/longSwordsman-attack.png (+ -mask.png)<br>units/longSwordsman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| spearman | Lancero | 🟡 sin animar | death | units/spearman-death.png (+ -mask.png) | 3 | `anim:death` |
| pikeman | Piquero | 🟡 sin animar | walk, attack, death | units/pikeman-walk.png (+ -mask.png)<br>units/pikeman-attack.png (+ -mask.png)<br>units/pikeman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| archer | Arquero | ✅ hecho | — | — | — | — |
| crossbowman | Ballestero | 🟡 sin animar | death | units/crossbowman-death.png (+ -mask.png) | 3 | `anim:death` |
| skirmisher | Hostigador | 🟡 sin animar | death | units/skirmisher-death.png (+ -mask.png) | 3 | `anim:death` |
| scoutCavalry | Caballería de exploración | 🟡 sin animar | death | units/scoutCavalry-death.png (+ -mask.png) | 3 | `anim:death:mounted` |
| lightCavalry | Caballería ligera | 🟡 sin animar | death | units/lightCavalry-death.png (+ -mask.png) | 3 | `anim:death:mounted` |
| knight | Caballero | 🟡 sin animar | death | units/knight-death.png (+ -mask.png) | 3 | `anim:death:mounted` |
| cavalier | Paladín | 🟡 sin animar | death | units/cavalier-death.png (+ -mask.png) | 3 | `anim:death:mounted` |
| batteringRam | Ariete | 🟡 sin animar | walk, attack, death | units/batteringRam-walk.png (+ -mask.png)<br>units/batteringRam-attack.png (+ -mask.png)<br>units/batteringRam-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack-melee` `anim:death` |
| longbowman | Arquero de tiro largo | 🟡 sin animar | death | units/longbowman-death.png (+ -mask.png) | 3 | `anim:death` |
| throwingAxeman | Guerrero franco | 🟡 sin animar | death | units/throwingAxeman-death.png (+ -mask.png) | 3 | `anim:death` |
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
| rifleman | Fusilero | 🔴 pendiente | idle, walk, attack, death | units/rifleman.png (+ -mask.png)<br>units/rifleman-walk.png (+ -mask.png)<br>units/rifleman-attack.png (+ -mask.png)<br>units/rifleman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| fieldGun | Cañón de campaña | 🔴 pendiente | idle, walk, attack, death | units/fieldGun.png (+ -mask.png)<br>units/fieldGun-walk.png (+ -mask.png)<br>units/fieldGun-attack.png (+ -mask.png)<br>units/fieldGun-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| gatlingGun | Ametralladora | 🔴 pendiente | idle, walk, attack, death | units/gatlingGun.png (+ -mask.png)<br>units/gatlingGun-walk.png (+ -mask.png)<br>units/gatlingGun-attack.png (+ -mask.png)<br>units/gatlingGun-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| biplane | Biplano | 🔴 pendiente | idle, walk, attack, death | units/biplane.png (+ -mask.png)<br>units/biplane-walk.png (+ -mask.png)<br>units/biplane-attack.png (+ -mask.png)<br>units/biplane-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| guardRifleman | Fusilero de la guardia | 🔴 pendiente | idle, walk, attack, death | units/guardRifleman.png (+ -mask.png)<br>units/guardRifleman-walk.png (+ -mask.png)<br>units/guardRifleman-attack.png (+ -mask.png)<br>units/guardRifleman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| donCossack | Cosaco del Don | 🔴 pendiente | idle, walk, attack, death | units/donCossack.png (+ -mask.png)<br>units/donCossack-walk.png (+ -mask.png)<br>units/donCossack-attack.png (+ -mask.png)<br>units/donCossack-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| regionalRifleman | Fusilero de ejército regional | 🔴 pendiente | idle, walk, attack, death | units/regionalRifleman.png (+ -mask.png)<br>units/regionalRifleman-walk.png (+ -mask.png)<br>units/regionalRifleman-attack.png (+ -mask.png)<br>units/regionalRifleman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| oldGuard | Guardia Vieja | 🔴 pendiente | idle, walk, attack, death | units/oldGuard.png (+ -mask.png)<br>units/oldGuard-walk.png (+ -mask.png)<br>units/oldGuard-attack.png (+ -mask.png)<br>units/oldGuard-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| grandeBatterie | Gran Batería | 🔴 pendiente | idle, walk, attack, death | units/grandeBatterie.png (+ -mask.png)<br>units/grandeBatterie-walk.png (+ -mask.png)<br>units/grandeBatterie-attack.png (+ -mask.png)<br>units/grandeBatterie-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| enfieldRifleman | Fusilero Enfield | 🔴 pendiente | idle, walk, attack, death | units/enfieldRifleman.png (+ -mask.png)<br>units/enfieldRifleman-walk.png (+ -mask.png)<br>units/enfieldRifleman-attack.png (+ -mask.png)<br>units/enfieldRifleman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| sharpshooter | Tirador | 🔴 pendiente | idle, walk, attack, death | units/sharpshooter.png (+ -mask.png)<br>units/sharpshooter-walk.png (+ -mask.png)<br>units/sharpshooter-attack.png (+ -mask.png)<br>units/sharpshooter-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| savaran | Savaran | 🔴 pendiente | idle, walk, attack, death | units/savaran.png (+ -mask.png)<br>units/savaran-walk.png (+ -mask.png)<br>units/savaran-attack.png (+ -mask.png)<br>units/savaran-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| ghulam | Ghulam | 🔴 pendiente | idle, walk, attack, death | units/ghulam.png (+ -mask.png)<br>units/ghulam-walk.png (+ -mask.png)<br>units/ghulam-attack.png (+ -mask.png)<br>units/ghulam-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| timuridHorseArcher | Arquero a caballo timúrida | 🔴 pendiente | idle, walk, attack, death | units/timuridHorseArcher.png (+ -mask.png)<br>units/timuridHorseArcher-walk.png (+ -mask.png)<br>units/timuridHorseArcher-attack.png (+ -mask.png)<br>units/timuridHorseArcher-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack:mounted` `anim:death:mounted` |
| timuridElephant | Elefante timúrida | 🔴 pendiente | idle, walk, attack, death | units/timuridElephant.png (+ -mask.png)<br>units/timuridElephant-walk.png (+ -mask.png)<br>units/timuridElephant-attack.png (+ -mask.png)<br>units/timuridElephant-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| qizilbash | Qizilbash | 🔴 pendiente | idle, walk, attack, death | units/qizilbash.png (+ -mask.png)<br>units/qizilbash-walk.png (+ -mask.png)<br>units/qizilbash-attack.png (+ -mask.png)<br>units/qizilbash-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| tofangchi | Tofangchi | 🔴 pendiente | idle, walk, attack, death | units/tofangchi.png (+ -mask.png)<br>units/tofangchi-walk.png (+ -mask.png)<br>units/tofangchi-attack.png (+ -mask.png)<br>units/tofangchi-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| zamburakchi | Zamburakchi | 🔴 pendiente | idle, walk, attack, death | units/zamburakchi.png (+ -mask.png)<br>units/zamburakchi-walk.png (+ -mask.png)<br>units/zamburakchi-attack.png (+ -mask.png)<br>units/zamburakchi-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack:mounted` `anim:death:mounted` |
| sarbaz | Sarbaz | 🔴 pendiente | idle, walk, attack, death | units/sarbaz.png (+ -mask.png)<br>units/sarbaz-walk.png (+ -mask.png)<br>units/sarbaz-attack.png (+ -mask.png)<br>units/sarbaz-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| persianCossack | Cosaco persa | 🔴 pendiente | idle, walk, attack, death | units/persianCossack.png (+ -mask.png)<br>units/persianCossack-walk.png (+ -mask.png)<br>units/persianCossack-attack.png (+ -mask.png)<br>units/persianCossack-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| axumiteWarrior | Guerrero axumita | 🔴 pendiente | idle, walk, attack, death | units/axumiteWarrior.png (+ -mask.png)<br>units/axumiteWarrior-walk.png (+ -mask.png)<br>units/axumiteWarrior-attack.png (+ -mask.png)<br>units/axumiteWarrior-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| lalibelaGuard | Guardia de Lalibela | 🔴 pendiente | idle, walk, attack, death | units/lalibelaGuard.png (+ -mask.png)<br>units/lalibelaGuard-walk.png (+ -mask.png)<br>units/lalibelaGuard-attack.png (+ -mask.png)<br>units/lalibelaGuard-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| royalChewa | Soldado real | 🔴 pendiente | idle, walk, attack, death | units/royalChewa.png (+ -mask.png)<br>units/royalChewa-walk.png (+ -mask.png)<br>units/royalChewa-attack.png (+ -mask.png)<br>units/royalChewa-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| ethiopianMusketeer | Mosquetero etíope-portugués | 🔴 pendiente | idle, walk, attack, death | units/ethiopianMusketeer.png (+ -mask.png)<br>units/ethiopianMusketeer-walk.png (+ -mask.png)<br>units/ethiopianMusketeer-attack.png (+ -mask.png)<br>units/ethiopianMusketeer-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| oromoRider | Jinete oromo | 🔴 pendiente | idle, walk, attack, death | units/oromoRider.png (+ -mask.png)<br>units/oromoRider-walk.png (+ -mask.png)<br>units/oromoRider-attack.png (+ -mask.png)<br>units/oromoRider-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| shewanRifleman | Fusilero shewano | 🔴 pendiente | idle, walk, attack, death | units/shewanRifleman.png (+ -mask.png)<br>units/shewanRifleman-walk.png (+ -mask.png)<br>units/shewanRifleman-attack.png (+ -mask.png)<br>units/shewanRifleman-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| mountainGun | Artillería de montaña | 🔴 pendiente | idle, walk, attack, death | units/mountainGun.png (+ -mask.png)<br>units/mountainGun-walk.png (+ -mask.png)<br>units/mountainGun-attack.png (+ -mask.png)<br>units/mountainGun-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| catapult | Catapulta | 🔴 pendiente | idle, walk, attack, death | units/catapult.png (+ -mask.png)<br>units/catapult-walk.png (+ -mask.png)<br>units/catapult-attack.png (+ -mask.png)<br>units/catapult-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| scorpion | Escorpión | 🔴 pendiente | idle, walk, attack, death | units/scorpion.png (+ -mask.png)<br>units/scorpion-walk.png (+ -mask.png)<br>units/scorpion-attack.png (+ -mask.png)<br>units/scorpion-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| cappedRam | Ariete cubierto | 🔴 pendiente | idle, walk, attack, death | units/cappedRam.png (+ -mask.png)<br>units/cappedRam-walk.png (+ -mask.png)<br>units/cappedRam-attack.png (+ -mask.png)<br>units/cappedRam-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| trebuchet | Trabuquete | 🔴 pendiente | idle, walk, attack, death | units/trebuchet.png (+ -mask.png)<br>units/trebuchet-walk.png (+ -mask.png)<br>units/trebuchet-attack.png (+ -mask.png)<br>units/trebuchet-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| heavyScorpion | Escorpión pesado | 🔴 pendiente | idle, walk, attack, death | units/heavyScorpion.png (+ -mask.png)<br>units/heavyScorpion-walk.png (+ -mask.png)<br>units/heavyScorpion-attack.png (+ -mask.png)<br>units/heavyScorpion-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| bombard | Bombarda | 🔴 pendiente | idle, walk, attack, death | units/bombard.png (+ -mask.png)<br>units/bombard-walk.png (+ -mask.png)<br>units/bombard-attack.png (+ -mask.png)<br>units/bombard-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| howitzer | Obús | 🔴 pendiente | idle, walk, attack, death | units/howitzer.png (+ -mask.png)<br>units/howitzer-walk.png (+ -mask.png)<br>units/howitzer-attack.png (+ -mask.png)<br>units/howitzer-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| warElephant | Elefante de guerra | 🔴 pendiente | idle, walk, attack, death | units/warElephant.png (+ -mask.png)<br>units/warElephant-walk.png (+ -mask.png)<br>units/warElephant-attack.png (+ -mask.png)<br>units/warElephant-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| general | General | 🔴 pendiente | idle, walk, attack, death | units/general.png (+ -mask.png)<br>units/general-walk.png (+ -mask.png)<br>units/general-attack.png (+ -mask.png)<br>units/general-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| king | Rey | 🔴 pendiente | idle, walk, death | units/king.png (+ -mask.png)<br>units/king-walk.png (+ -mask.png)<br>units/king-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |

*primero la imagen quieta (Pack 6a/6b) y luego las animaciones*

## Edificios

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| townCenter | Centro urbano | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/townCenter-4.png (+ -mask.png)<br>buildings/townCenter-5.png (+ -mask.png) | 4 | `building:age` |
| house | Casa | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/house-4.png (+ -mask.png)<br>buildings/house-5.png (+ -mask.png) | 4 | `building:age` |
| mill | Molino | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/mill-4.png (+ -mask.png)<br>buildings/mill-5.png (+ -mask.png) | 4 | `building:age` |
| lumberCamp | Campamento maderero | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/lumberCamp-4.png (+ -mask.png)<br>buildings/lumberCamp-5.png (+ -mask.png) | 4 | `building:age` |
| miningCamp | Campamento minero | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/miningCamp-4.png (+ -mask.png)<br>buildings/miningCamp-5.png (+ -mask.png) | 4 | `building:age` |
| farm | Granja | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/farm.png (+ -mask.png)<br>buildings/farm-1.png (+ -mask.png)<br>buildings/farm-2.png (+ -mask.png)<br>buildings/farm-3.png (+ -mask.png)<br>buildings/farm-4.png (+ -mask.png)<br>buildings/farm-5.png (+ -mask.png) | 3 | `building:base` |
| barracks | Cuartel | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/barracks-4.png (+ -mask.png)<br>buildings/barracks-5.png (+ -mask.png) | 4 | `building:age` |
| archeryRange | Galería de tiro con arco | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/archeryRange-2.png (+ -mask.png)<br>buildings/archeryRange-3.png (+ -mask.png)<br>buildings/archeryRange-4.png (+ -mask.png)<br>buildings/archeryRange-5.png (+ -mask.png) | 4 | `building:age` |
| stable | Establo | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/stable-2.png (+ -mask.png)<br>buildings/stable-3.png (+ -mask.png)<br>buildings/stable-4.png (+ -mask.png)<br>buildings/stable-5.png (+ -mask.png) | 4 | `building:age` |
| blacksmith | Herrería | 🟡 sin animar | Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/blacksmith-2.png (+ -mask.png)<br>buildings/blacksmith-3.png (+ -mask.png)<br>buildings/blacksmith-4.png (+ -mask.png)<br>buildings/blacksmith-5.png (+ -mask.png) | 4 | `building:age` |
| watchTower | Torre de vigilancia | 🟡 sin animar | Edad de la Pólvora, Edad Industrial | buildings/watchTower-4.png (+ -mask.png)<br>buildings/watchTower-5.png (+ -mask.png) | 4 | `building:age` |
| siegeWorkshop | Taller de asedio | 🟡 sin animar | Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/siegeWorkshop-3.png (+ -mask.png)<br>buildings/siegeWorkshop-4.png (+ -mask.png)<br>buildings/siegeWorkshop-5.png (+ -mask.png) | 4 | `building:age` |
| castle | Castillo | 🟡 sin animar | Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/castle-3.png (+ -mask.png)<br>buildings/castle-4.png (+ -mask.png)<br>buildings/castle-5.png (+ -mask.png) | 4 | `building:age` |
| gorodishche | Gorodishche | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/gorodishche.png (+ -mask.png)<br>buildings/gorodishche-1.png (+ -mask.png)<br>buildings/gorodishche-2.png (+ -mask.png)<br>buildings/gorodishche-3.png (+ -mask.png)<br>buildings/gorodishche-4.png (+ -mask.png)<br>buildings/gorodishche-5.png (+ -mask.png) | 3 | `building:base` |
| monasteryFortress | Monasterio-fortaleza | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/monasteryFortress.png (+ -mask.png)<br>buildings/monasteryFortress-2.png (+ -mask.png)<br>buildings/monasteryFortress-3.png (+ -mask.png)<br>buildings/monasteryFortress-4.png (+ -mask.png)<br>buildings/monasteryFortress-5.png (+ -mask.png) | 3 | `building:base` |
| kremlin | Kremlin de piedra | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/kremlin.png (+ -mask.png)<br>buildings/kremlin-3.png (+ -mask.png)<br>buildings/kremlin-4.png (+ -mask.png)<br>buildings/kremlin-5.png (+ -mask.png) | 3 | `building:base` |
| ostrog | Ostrog | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora, Edad Industrial | buildings/ostrog.png (+ -mask.png)<br>buildings/ostrog-4.png (+ -mask.png)<br>buildings/ostrog-5.png (+ -mask.png) | 3 | `building:base` |
| corral | Corral | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/corral.png (+ -mask.png)<br>buildings/corral-2.png (+ -mask.png)<br>buildings/corral-3.png (+ -mask.png)<br>buildings/corral-4.png (+ -mask.png)<br>buildings/corral-5.png (+ -mask.png) | 3 | `building:base` |
| gunpowderWorks | Fábrica de pólvora | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/gunpowderWorks.png (+ -mask.png)<br>buildings/gunpowderWorks-5.png (+ -mask.png) | 3 | `building:base` |
| fortress | Fortaleza | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/fortress.png (+ -mask.png)<br>buildings/fortress-5.png (+ -mask.png) | 3 | `building:base` |
| printingHouse | Imprenta | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/printingHouse.png (+ -mask.png)<br>buildings/printingHouse-5.png (+ -mask.png) | 3 | `building:base` |
| observatory | Observatorio | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/observatory.png (+ -mask.png)<br>buildings/observatory-5.png (+ -mask.png) | 3 | `building:base` |
| tradingCompany | Compañía comercial | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/tradingCompany.png (+ -mask.png)<br>buildings/tradingCompany-5.png (+ -mask.png) | 3 | `building:base` |
| engineerAcademy | Academia de ingenieros | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/engineerAcademy.png (+ -mask.png)<br>buildings/engineerAcademy-5.png (+ -mask.png) | 3 | `building:base` |
| stateGranary | Granero estatal | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/stateGranary.png (+ -mask.png)<br>buildings/stateGranary-1.png (+ -mask.png)<br>buildings/stateGranary-2.png (+ -mask.png)<br>buildings/stateGranary-3.png (+ -mask.png)<br>buildings/stateGranary-4.png (+ -mask.png)<br>buildings/stateGranary-5.png (+ -mask.png) | 3 | `building:base` |
| mint | Casa de moneda | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/mint.png (+ -mask.png)<br>buildings/mint-2.png (+ -mask.png)<br>buildings/mint-3.png (+ -mask.png)<br>buildings/mint-4.png (+ -mask.png)<br>buildings/mint-5.png (+ -mask.png) | 3 | `building:base` |
| grandCanal | Gran Canal | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/grandCanal.png (+ -mask.png)<br>buildings/grandCanal-3.png (+ -mask.png)<br>buildings/grandCanal-4.png (+ -mask.png)<br>buildings/grandCanal-5.png (+ -mask.png) | 3 | `building:base` |
| forbiddenCity | Ciudad Prohibida | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora, Edad Industrial | buildings/forbiddenCity.png (+ -mask.png)<br>buildings/forbiddenCity-4.png (+ -mask.png)<br>buildings/forbiddenCity-5.png (+ -mask.png) | 3 | `building:base` |
| cantonHong | Hong de Cantón | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/cantonHong.png (+ -mask.png)<br>buildings/cantonHong-5.png (+ -mask.png) | 3 | `building:base` |
| royalVilla | Villa real | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/royalVilla.png (+ -mask.png)<br>buildings/royalVilla-1.png (+ -mask.png)<br>buildings/royalVilla-2.png (+ -mask.png)<br>buildings/royalVilla-3.png (+ -mask.png)<br>buildings/royalVilla-4.png (+ -mask.png)<br>buildings/royalVilla-5.png (+ -mask.png) | 3 | `building:base` |
| gothicCathedral | Catedral gótica | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/gothicCathedral.png (+ -mask.png)<br>buildings/gothicCathedral-2.png (+ -mask.png)<br>buildings/gothicCathedral-3.png (+ -mask.png)<br>buildings/gothicCathedral-4.png (+ -mask.png)<br>buildings/gothicCathedral-5.png (+ -mask.png) | 3 | `building:base` |
| bastide | Bastida | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/bastide.png (+ -mask.png)<br>buildings/bastide-3.png (+ -mask.png)<br>buildings/bastide-4.png (+ -mask.png)<br>buildings/bastide-5.png (+ -mask.png) | 3 | `building:base` |
| chateau | Château | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora, Edad Industrial | buildings/chateau.png (+ -mask.png)<br>buildings/chateau-4.png (+ -mask.png)<br>buildings/chateau-5.png (+ -mask.png) | 3 | `building:base` |
| vaubanFortress | Fortaleza de Vauban | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/vaubanFortress.png (+ -mask.png)<br>buildings/vaubanFortress-5.png (+ -mask.png) | 3 | `building:base` |
| royalManufacture | Manufactura real | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/royalManufacture.png (+ -mask.png)<br>buildings/royalManufacture-5.png (+ -mask.png) | 3 | `building:base` |
| burh | Burh | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/burh.png (+ -mask.png)<br>buildings/burh-1.png (+ -mask.png)<br>buildings/burh-2.png (+ -mask.png)<br>buildings/burh-3.png (+ -mask.png)<br>buildings/burh-4.png (+ -mask.png)<br>buildings/burh-5.png (+ -mask.png) | 3 | `building:base` |
| motteAndBailey | Castillo de mota | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/motteAndBailey.png (+ -mask.png)<br>buildings/motteAndBailey-2.png (+ -mask.png)<br>buildings/motteAndBailey-3.png (+ -mask.png)<br>buildings/motteAndBailey-4.png (+ -mask.png)<br>buildings/motteAndBailey-5.png (+ -mask.png) | 3 | `building:base` |
| concentricCastle | Castillo concéntrico | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/concentricCastle.png (+ -mask.png)<br>buildings/concentricCastle-3.png (+ -mask.png)<br>buildings/concentricCastle-4.png (+ -mask.png)<br>buildings/concentricCastle-5.png (+ -mask.png) | 3 | `building:base` |
| bank | Banco | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/bank.png (+ -mask.png)<br>buildings/bank-5.png (+ -mask.png) | 3 | `building:base` |
| factory | Fábrica | 🔴 pendiente | imagen base (Edad Industrial) | buildings/factory.png (+ -mask.png) | 3 | `building:base` |
| railwayStation | Estación de ferrocarril | 🔴 pendiente | imagen base (Edad Industrial) | buildings/railwayStation.png (+ -mask.png) | 3 | `building:base` |
| laboratory | Laboratorio | 🔴 pendiente | imagen base (Edad Industrial) | buildings/laboratory.png (+ -mask.png) | 3 | `building:base` |
| airfield | Aeródromo | 🔴 pendiente | imagen base (Edad Industrial) | buildings/airfield.png (+ -mask.png) | 3 | `building:base` |
| transSiberian | Transiberiano | 🔴 pendiente | imagen base (Edad Industrial) | buildings/transSiberian.png (+ -mask.png) | 3 | `building:base` |
| jiangnanArsenal | Arsenal de Jiangnan | 🔴 pendiente | imagen base (Edad Industrial) | buildings/jiangnanArsenal.png (+ -mask.png) | 3 | `building:base` |
| polytechnique | École Polytechnique | 🔴 pendiente | imagen base (Edad Industrial) | buildings/polytechnique.png (+ -mask.png) | 3 | `building:base` |
| transcontinental | Ferrocarril transcontinental | 🔴 pendiente | imagen base (Edad Industrial) | buildings/transcontinental.png (+ -mask.png) | 3 | `building:base` |
| qanat | Qanat | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/qanat.png (+ -mask.png)<br>buildings/qanat-1.png (+ -mask.png)<br>buildings/qanat-2.png (+ -mask.png)<br>buildings/qanat-3.png (+ -mask.png)<br>buildings/qanat-4.png (+ -mask.png)<br>buildings/qanat-5.png (+ -mask.png) | 3 | `building:base` |
| caravanserai | Caravasar | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/caravanserai.png (+ -mask.png)<br>buildings/caravanserai-2.png (+ -mask.png)<br>buildings/caravanserai-3.png (+ -mask.png)<br>buildings/caravanserai-4.png (+ -mask.png)<br>buildings/caravanserai-5.png (+ -mask.png) | 3 | `building:base` |
| maraghaObservatory | Observatorio de Maragha | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/maraghaObservatory.png (+ -mask.png)<br>buildings/maraghaObservatory-3.png (+ -mask.png)<br>buildings/maraghaObservatory-4.png (+ -mask.png)<br>buildings/maraghaObservatory-5.png (+ -mask.png) | 3 | `building:base` |
| maidan | Maidan | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora, Edad Industrial | buildings/maidan.png (+ -mask.png)<br>buildings/maidan-4.png (+ -mask.png)<br>buildings/maidan-5.png (+ -mask.png) | 3 | `building:base` |
| ordu | Ordu | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/ordu.png (+ -mask.png)<br>buildings/ordu-5.png (+ -mask.png) | 3 | `building:base` |
| darulFunun | Dar ul-Funun | 🔴 pendiente | imagen base (Edad Industrial) | buildings/darulFunun.png (+ -mask.png) | 3 | `building:base` |
| stele | Estela | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/stele.png (+ -mask.png)<br>buildings/stele-1.png (+ -mask.png)<br>buildings/stele-2.png (+ -mask.png)<br>buildings/stele-3.png (+ -mask.png)<br>buildings/stele-4.png (+ -mask.png)<br>buildings/stele-5.png (+ -mask.png) | 3 | `building:base` |
| rockChurch | Iglesia rupestre | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/rockChurch.png (+ -mask.png)<br>buildings/rockChurch-2.png (+ -mask.png)<br>buildings/rockChurch-3.png (+ -mask.png)<br>buildings/rockChurch-4.png (+ -mask.png)<br>buildings/rockChurch-5.png (+ -mask.png) | 3 | `building:base` |
| katama | Katama | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial, Edad de la Pólvora, Edad Industrial | buildings/katama.png (+ -mask.png)<br>buildings/katama-3.png (+ -mask.png)<br>buildings/katama-4.png (+ -mask.png)<br>buildings/katama-5.png (+ -mask.png) | 3 | `building:base` |
| gondarCastle | Castillo de Gondar | 🔴 pendiente | imagen base (Edad Imperial), Edad de la Pólvora, Edad Industrial | buildings/gondarCastle.png (+ -mask.png)<br>buildings/gondarCastle-4.png (+ -mask.png)<br>buildings/gondarCastle-5.png (+ -mask.png) | 3 | `building:base` |
| rasPalace | Palacio del ras | 🔴 pendiente | imagen base (Edad de la Pólvora), Edad Industrial | buildings/rasPalace.png (+ -mask.png)<br>buildings/rasPalace-5.png (+ -mask.png) | 3 | `building:base` |
| djiboutiRailway | Ferrocarril de Yibuti | 🔴 pendiente | imagen base (Edad Industrial) | buildings/djiboutiRailway.png (+ -mask.png) | 3 | `building:base` |

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
| ironMine | Mina de hierro | 🔴 pendiente | imagen | resources/ironMine.png | 3 | `resource` |
| coalMine | Mina de carbón | 🔴 pendiente | imagen | resources/coalMine.png | 3 | `resource` |
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
| tuft | tuft | ✅ hecho | — | — | — | — |
| dryTuft | dryTuft | ✅ hecho | — | — | — | — |
| flowers | flowers | ✅ hecho | — | — | — | — |
| shrub | shrub | ✅ hecho | — | — | — | — |
| pebbles | pebbles | ✅ hecho | — | — | — | — |
| fern | fern | ✅ hecho | — | — | — | — |
| reeds | reeds | ✅ hecho | — | — | — | — |
| dryShrub | dryShrub | ✅ hecho | — | — | — | — |
| snowRock | snowRock | ✅ hecho | — | — | — | — |

## Efectos

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| projectile-arrow | Proyectil: arrow | ✅ hecho | — | — | — | — |
| projectile-javelin | Proyectil: javelin | ✅ hecho | — | — | — | — |
| projectile-axe | Proyectil: axe | ✅ hecho | — | — | — | — |
| projectile-bullet | Proyectil: bullet | 🔴 pendiente | imagen | effects/projectile-bullet.png | 5 | `effect` |
| projectile-cannonball | Proyectil: cannonball | 🔴 pendiente | imagen | effects/projectile-cannonball.png | 5 | `effect` |
| projectile-rock | Proyectil: rock | 🔴 pendiente | imagen | effects/projectile-rock.png | 5 | `effect` |
| projectile-bolt | Proyectil: bolt | ✅ hecho | — | — | — | — |
| rubble | Escombros de edificio | ✅ hecho | — | — | — | — |
| fire | Llama | ✅ hecho | — | — | — | — |
| smoke | Humo | ✅ hecho | — | — | — | — |
| dust | Polvo | ✅ hecho | — | — | — | — |
| rally-flag | Bandera de punto de reunión | 🔴 pendiente | imagen | effects/rally-flag.png | 5 | `effect` |
| treasure-chest | Cofre del tesoro | 🔴 pendiente | imagen | effects/treasure-chest.png | 5 | `effect` |

*el motor todavía no usa estas imágenes (se dibuja por código)*

## Interfaz

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| icon-food | Icono de Alimento | ✅ hecho | — | — | — | — |
| icon-wood | Icono de Madera | ✅ hecho | — | — | — | — |
| icon-gold | Icono de Oro | ✅ hecho | — | — | — | — |
| icon-stone | Icono de Piedra | ✅ hecho | — | — | — | — |
| icon-iron | Icono de Hierro | 🔴 pendiente | imagen | ui/icon-iron.png | 5 | `ui:icon` |
| icon-coal | Icono de Carbón | 🔴 pendiente | imagen | ui/icon-coal.png | 5 | `ui:icon` |
| icon-population | Icono de población | ✅ hecho | — | — | — | — |
| icon-idle-villager | Aldeano inactivo | ✅ hecho | — | — | — | — |
| icon-attack | Atacar | ✅ hecho | — | — | — | — |
| icon-stop | Parar | ✅ hecho | — | — | — | — |
| icon-delete | Eliminar | ✅ hecho | — | — | — | — |
| icon-build | Construir | ✅ hecho | — | — | — | — |
| icon-rally | Punto de reunión | ✅ hecho | — | — | — | — |
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
| industrialAge | Tecnología: Edad Industrial | 🔴 pendiente | imagen | ui/tech/industrialAge.png | 5 | `ui:tech` |
| steamEngine | Tecnología: Máquina de vapor | 🔴 pendiente | imagen | ui/tech/steamEngine.png | 5 | `ui:tech` |
| electricity | Tecnología: Electricidad y telégrafo | 🔴 pendiente | imagen | ui/tech/electricity.png | 5 | `ui:tech` |
| combustionEngine | Tecnología: Motor de combustión | 🔴 pendiente | imagen | ui/tech/combustionEngine.png | 5 | `ui:tech` |
| aviation | Tecnología: Aviación | 🔴 pendiente | imagen | ui/tech/aviation.png | 5 | `ui:tech` |
| rifling | Tecnología: Estriado | 🔴 pendiente | imagen | ui/tech/rifling.png | 5 | `ui:tech` |
| assemblyLine | Tecnología: Producción en cadena | 🔴 pendiente | imagen | ui/tech/assemblyLine.png | 5 | `ui:tech` |
| bessemerSteel | Tecnología: Acero Bessemer | 🔴 pendiente | imagen | ui/tech/bessemerSteel.png | 5 | `ui:tech` |
| railway | Tecnología: Ferrocarril | 🔴 pendiente | imagen | ui/tech/railway.png | 5 | `ui:tech` |
| selfStrengthening | Tecnología: Autofortalecimiento | 🔴 pendiente | imagen | ui/tech/selfStrengthening.png | 5 | `ui:tech` |
| corpsSystem | Tecnología: Sistema de cuerpos | 🔴 pendiente | imagen | ui/tech/corpsSystem.png | 5 | `ui:tech` |
| interchangeableParts | Tecnología: Intercambiabilidad de piezas | 🔴 pendiente | imagen | ui/tech/interchangeableParts.png | 5 | `ui:tech` |
| irrigation | Tecnología: Regadío | 🔴 pendiente | imagen | ui/tech/irrigation.png | 5 | `ui:tech` |
| iqta | Tecnología: Iqta | 🔴 pendiente | imagen | ui/tech/iqta.png | 5 | `ui:tech` |
| astronomy | Tecnología: Astronomía | 🔴 pendiente | imagen | ui/tech/astronomy.png | 5 | `ui:tech` |
| silkMonopoly | Tecnología: Monopolio de la seda | 🔴 pendiente | imagen | ui/tech/silkMonopoly.png | 5 | `ui:tech` |
| mobileWarfare | Tecnología: Guerra móvil | 🔴 pendiente | imagen | ui/tech/mobileWarfare.png | 5 | `ui:tech` |
| nizamJadid | Tecnología: Nizam-i Jadid | 🔴 pendiente | imagen | ui/tech/nizamJadid.png | 5 | `ui:tech` |
| axumCoinage | Tecnología: Moneda de Axum | 🔴 pendiente | imagen | ui/tech/axumCoinage.png | 5 | `ui:tech` |
| prestorJohn | Tecnología: Prestes Juan | 🔴 pendiente | imagen | ui/tech/prestorJohn.png | 5 | `ui:tech` |
| itinerantCourt | Tecnología: Corte itinerante | 🔴 pendiente | imagen | ui/tech/itinerantCourt.png | 5 | `ui:tech` |
| portugueseAlliance | Tecnología: Alianza portuguesa | 🔴 pendiente | imagen | ui/tech/portugueseAlliance.png | 5 | `ui:tech` |
| horseBreeding | Tecnología: Cría de caballos | 🔴 pendiente | imagen | ui/tech/horseBreeding.png | 5 | `ui:tech` |
| armsImport | Tecnología: Importación de armas | 🔴 pendiente | imagen | ui/tech/armsImport.png | 5 | `ui:tech` |
| up_cappedRam | Tecnología: Ariete cubierto | 🔴 pendiente | imagen | ui/tech/up_cappedRam.png | 5 | `ui:tech` |
| up_trebuchet | Tecnología: Trabuquete | 🔴 pendiente | imagen | ui/tech/up_trebuchet.png | 5 | `ui:tech` |
| up_heavyScorpion | Tecnología: Escorpión pesado | 🔴 pendiente | imagen | ui/tech/up_heavyScorpion.png | 5 | `ui:tech` |
| up_bombard | Tecnología: Bombarda | 🔴 pendiente | imagen | ui/tech/up_bombard.png | 5 | `ui:tech` |
| up_howitzer | Tecnología: Obús | 🔴 pendiente | imagen | ui/tech/up_howitzer.png | 5 | `ui:tech` |
| up_fieldGun | Tecnología: Cañón de campaña | 🔴 pendiente | imagen | ui/tech/up_fieldGun.png | 5 | `ui:tech` |
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

### `anim:carry-coal`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 8 poses of walking with a heavy sack of coal over the shoulder. The 8 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:carry-iron`

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

### `anim:work-coal`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of swinging a pickaxe down at rocks (the rocks are not drawn). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `anim:work-iron`

```text
Draw a new picture: using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw 6 poses of swinging a pickaxe down at rocks (the rocks are not drawn). The 6 poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching. Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level. Sunlight from the upper left; no shadow, no ground, no motion blur. No writing, no numbers, no frame.
```

### `building:age`

```text
Redraw the attached building as it would look in a later, richer period (feudal: half-timbered walls, red clay tiles; castles: dressed stone, slate roofs; imperial: ornate stone and brick, spires), keeping the same viewing angle, size, footprint and lighting from the upper left. Plain white background, no shadow, no ground. Flags and awnings in bright magenta. No writing, no numbers, no frame.
```

### `building:base`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw the building seen from high above at a corner so that its ground plan looks like a diamond twice as wide as tall, floating on a plain white background with wide gaps, no shadow, no ground. Flags and awnings in bright magenta. No people, no writing, no numbers, no frame. (See Packs 3 and 4 in docs/prompts-nano-banana.md.)
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
