# Arte pendiente

> Generado por `npm run art-todo` a partir del contenido registrado (mods), `src/mods/art/index.ts` y `public/sprites/`.
> **No lo edites a mano**: vuelve a ejecutar el comando después de importar arte nuevo o de añadir contenido.
> `npm test` falla si este archivo está desactualizado. Flujo y plantillas: README («Arte con imágenes») y `docs/prompts-nano-banana.md`.

## Resumen

| Tipo | Hecho | Sin animar | Pendiente |
| --- | ---: | ---: | ---: |
| unidad | 0 | 16 | 10 |
| edificio | 7 | 5 | 6 |
| recurso | 6 | 0 | 4 |
| terreno | 9 | 0 | 0 |
| decoración | 9 | 0 | 0 |
| efecto | 7 | 0 | 2 |
| interfaz | 11 | 0 | 35 |

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
| throwingAxeman | Lanzador de hachas | 🟡 sin animar | walk, attack, death | units/throwingAxeman-walk.png (+ -mask.png)<br>units/throwingAxeman-attack.png (+ -mask.png)<br>units/throwingAxeman-death.png (+ -mask.png) | 2 | `anim:walk` `anim:attack` `anim:death` |
| druzhinnik | Druzhinnik | 🔴 pendiente | idle, walk, attack, death | units/druzhinnik.png (+ -mask.png)<br>units/druzhinnik-walk.png (+ -mask.png)<br>units/druzhinnik-attack.png (+ -mask.png)<br>units/druzhinnik-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| boyarSon | Hijo de boyardo | 🔴 pendiente | idle, walk, attack, death | units/boyarSon.png (+ -mask.png)<br>units/boyarSon-walk.png (+ -mask.png)<br>units/boyarSon-attack.png (+ -mask.png)<br>units/boyarSon-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| strelets | Strelets | 🔴 pendiente | idle, walk, attack, death | units/strelets.png (+ -mask.png)<br>units/strelets-walk.png (+ -mask.png)<br>units/strelets-attack.png (+ -mask.png)<br>units/strelets-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack` `anim:death` |
| cossack | Cosaco | 🔴 pendiente | idle, walk, attack, death | units/cossack.png (+ -mask.png)<br>units/cossack-walk.png (+ -mask.png)<br>units/cossack-attack.png (+ -mask.png)<br>units/cossack-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| deer | Ciervo | 🔴 pendiente | idle, walk, death | units/deer.png (+ -mask.png)<br>units/deer-walk.png (+ -mask.png)<br>units/deer-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |
| boar | Jabalí | 🔴 pendiente | idle, walk, attack, death | units/boar.png (+ -mask.png)<br>units/boar-walk.png (+ -mask.png)<br>units/boar-attack.png (+ -mask.png)<br>units/boar-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:attack-melee` `anim:death` |
| sheep | Oveja | 🔴 pendiente | idle, walk, death | units/sheep.png (+ -mask.png)<br>units/sheep-walk.png (+ -mask.png)<br>units/sheep-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |
| warElephant | Elefante de guerra | 🔴 pendiente | idle, walk, attack, death | units/warElephant.png (+ -mask.png)<br>units/warElephant-walk.png (+ -mask.png)<br>units/warElephant-attack.png (+ -mask.png)<br>units/warElephant-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| general | General | 🔴 pendiente | idle, walk, attack, death | units/general.png (+ -mask.png)<br>units/general-walk.png (+ -mask.png)<br>units/general-attack.png (+ -mask.png)<br>units/general-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk:mounted` `anim:attack-melee:mounted` `anim:death:mounted` |
| king | Rey | 🔴 pendiente | idle, walk, death | units/king.png (+ -mask.png)<br>units/king-walk.png (+ -mask.png)<br>units/king-death.png (+ -mask.png) | 2 | `unit:still` `anim:walk` `anim:death` |

*primero la imagen quieta (Pack 6a/6b) y luego las animaciones*

## Edificios

| id | nombre | estado | falta | archivos esperados (en public/sprites/) | prio | prompt |
| --- | --- | --- | --- | --- | ---: | --- |
| townCenter | Centro urbano | ✅ hecho | — | — | — | — |
| house | Casa | ✅ hecho | — | — | — | — |
| mill | Molino | ✅ hecho | — | — | — | — |
| lumberCamp | Campamento maderero | ✅ hecho | — | — | — | — |
| miningCamp | Campamento minero | ✅ hecho | — | — | — | — |
| farm | Granja | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial | buildings/farm.png (+ -mask.png)<br>buildings/farm-1.png (+ -mask.png)<br>buildings/farm-2.png (+ -mask.png)<br>buildings/farm-3.png (+ -mask.png) | 3 | `building:base` |
| barracks | Cuartel | ✅ hecho | — | — | — | — |
| archeryRange | Galería de tiro con arco | 🟡 sin animar | Edad de los Castillos, Edad Imperial | buildings/archeryRange-2.png (+ -mask.png)<br>buildings/archeryRange-3.png (+ -mask.png) | 4 | `building:age` |
| stable | Establo | 🟡 sin animar | Edad de los Castillos, Edad Imperial | buildings/stable-2.png (+ -mask.png)<br>buildings/stable-3.png (+ -mask.png) | 4 | `building:age` |
| blacksmith | Herrería | 🟡 sin animar | Edad de los Castillos, Edad Imperial | buildings/blacksmith-2.png (+ -mask.png)<br>buildings/blacksmith-3.png (+ -mask.png) | 4 | `building:age` |
| watchTower | Torre de vigilancia | ✅ hecho | — | — | — | — |
| siegeWorkshop | Taller de asedio | 🟡 sin animar | Edad Imperial | buildings/siegeWorkshop-3.png (+ -mask.png) | 4 | `building:age` |
| castle | Castillo | 🟡 sin animar | Edad Imperial | buildings/castle-3.png (+ -mask.png) | 4 | `building:age` |
| gorodishche | Gorodishche | 🔴 pendiente | imagen base (Edad Oscura), Edad Feudal, Edad de los Castillos, Edad Imperial | buildings/gorodishche.png (+ -mask.png)<br>buildings/gorodishche-1.png (+ -mask.png)<br>buildings/gorodishche-2.png (+ -mask.png)<br>buildings/gorodishche-3.png (+ -mask.png) | 3 | `building:base` |
| monasteryFortress | Monasterio-fortaleza | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial | buildings/monasteryFortress.png (+ -mask.png)<br>buildings/monasteryFortress-2.png (+ -mask.png)<br>buildings/monasteryFortress-3.png (+ -mask.png) | 3 | `building:base` |
| kremlin | Kremlin de piedra | 🔴 pendiente | imagen base (Edad de los Castillos), Edad Imperial | buildings/kremlin.png (+ -mask.png)<br>buildings/kremlin-3.png (+ -mask.png) | 3 | `building:base` |
| ostrog | Ostrog | 🔴 pendiente | imagen base (Edad Imperial) | buildings/ostrog.png (+ -mask.png) | 3 | `building:base` |
| corral | Corral | 🔴 pendiente | imagen base (Edad Feudal), Edad de los Castillos, Edad Imperial | buildings/corral.png (+ -mask.png)<br>buildings/corral-2.png (+ -mask.png)<br>buildings/corral-3.png (+ -mask.png) | 3 | `building:base` |

*huella 2x2*
*huella 3x3*
*huella 4x4*
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

### `effect`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw small separate objects or effect frames (projectiles seen from the side pointing right; flames, smoke and dust in 4 stages each) on a plain white background with wide gaps, no shadow. No writing, no numbers, no frame. (See Pack 7.)
```

### `resource`

```text
Same illustration style, bold dark outlines, painterly texture, warm rich colors and sunlight from the upper left as the picture of the characters you drew. Draw the resource, in stages from full to nearly exhausted, on a plain white background with wide gaps, no shadow, no ground, seen from high above at an angle. No writing, no numbers, no frame. (See Pack 2.)
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
