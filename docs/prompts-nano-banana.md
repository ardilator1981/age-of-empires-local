# Prompts para generar el arte con Nano Banana

Catálogo de prompts para sustituir todos los gráficos procedurales por imágenes, pack a pack. Cada bloque
de código es **un prompt completo**: cópialo tal cual (están en inglés porque Nano Banana es más preciso así).

Lo marcado con 🔧 todavía no existe en el juego: el arte se puede generar ya, pero hace falta programar
la mecánica (caza, murallas, barcos...) para usarlo. Está aquí para enriquecer el juego más adelante.

## Cómo trabajar

1. **Una imagen por prompt, con 4–6 piezas como máximo.** Con más, baja el detalle y la escala se vuelve irregular.
2. Pide la **máxima resolución** (2K o 4K si lo permite).
3. **Coherencia entre imágenes:** cuando una salga bien, adjúntala como referencia en las siguientes del mismo
   pack ("match the style, palette, lighting and scale of the attached image").
4. Si una pieza sale mal (sombra en el suelo, luz desde la derecha, suelo debajo), pide solo esa pieza otra vez
   en vez de repetir la imagen entera.
5. Guarda las imágenes en `art-src/entrada/<pack>/` con un nombre descriptivo (`pack3-edad-oscura.png`,
   `pack2-robles.png`...). Claude se encarga del resto: quitar el fondo, separar las piezas, escalarlas,
   colocar el punto de apoyo, sacar la máscara del color del jugador y montar las hojas con su JSON.

### Reglas que llevan todos los prompts

- **Fondo blanco liso** y piezas bien separadas entre sí y de los bordes (se separan automáticamente).
- **Isométrico 2:1**: la huella en el suelo es un rombo el doble de ancho que de alto.
- **Luz desde arriba a la izquierda**: caras izquierdas iluminadas, derechas en sombra.
- **Sin sombra proyectada ni suelo debajo** (la sombra la pone el motor, y el terreno es el del mapa).
- **Color del jugador en magenta puro (#FF00FF)**: banderas, estandartes, tabardos, escudos, toldos. El script
  detecta el magenta, crea la máscara y lo sustituye por el color de cada jugador. El magenta no debe
  aparecer en nada más.
- Sin texto, etiquetas, marcos ni marcas de agua. Diseño original, sin copiar ningún juego existente.

### Tamaños de referencia

| Pieza | Huella | Nota |
| --- | --- | --- |
| Centro urbano, castillo | 4×4 casillas | |
| Cuartel, galería de tiro, establo, herrería, taller de asedio | 3×3 | |
| Casa, molino, campamentos, granja | 2×2 | |
| Torre de vigilancia, árbol, mina, arbusto | 1×1 | |
| Persona | ~⅓ de la altura de una casa | caballería ~½ |

No hace falta que Nano Banana acierte el tamaño exacto: el script escala cada pieza según su huella. Lo
importante es que **dentro de cada imagen** las proporciones sean coherentes.

---

## Pack 1 · Texturas de terreno

Una imagen por textura, **cuadrada**. Después se ejecuta `npm run fix-textures` para hacerlas repetibles.
Plantilla (sustituye la línea `SURFACE`):

```text
Seamless tileable ground texture for a medieval strategy game, square 1:1, highest resolution.
Viewed straight from above: orthographic top-down, no perspective, no horizon, no camera tilt.
Flat, even lighting with no vignette and no dark corners; only subtle micro-shading as if lit softly from the upper left.
Uniform density across the whole image: no single large feature, no path, no object that would repeat noticeably when tiled.
Hand-painted 2D game art, rich natural colors, crisp small details. No text, no frame, no border.
SURFACE: <descripción>
```

| Archivo | `SURFACE` |
| --- | --- |
| `grass` | lush meadow grass with small tufts, a few tiny yellow and white wildflowers, slight variation between green and olive patches |
| `dirt` | packed brown earth with small pebbles, faint cracks and sparse dry grass blades, warm but not orange |
| `forest` | forest floor: dark soil, fallen leaves, pine needles, moss patches, small twigs |
| `sand` | pale beach sand with soft wind ripples and a few tiny shells and pebbles |
| `desert` | dry ochre desert ground, hard cracked clay, scattered small stones and dry shrub fragments |
| `snow` | fresh snow with gentle drifts, soft blue shadows in hollows, a few ice crystals |
| `rock` | rugged grey mountain rock surface, cracks, lichen spots, stratified stone |
| `water` | deep lake water seen from above, dark blue-teal, gentle small ripples, no reflections of sky objects, no foam |
| `shallows` | clear shallow water over sandy bottom with visible pebbles and soft caustic light patterns |

Extras para enriquecer el mapa (se añaden como terrenos nuevos en un mod, es fácil):

| Archivo | `SURFACE` |
| --- | --- |
| `dry-grass` | dry yellowed late-summer grass with seed heads |
| `mud` | wet dark mud with puddles and footprints-free smooth patches |
| `road` | worn cobblestone road, irregular rounded stones with grass in the joints |
| `autumn-forest` | forest floor covered with orange, red and brown autumn leaves |
| `pebbles` | river bank of rounded grey and brown pebbles |

---

## Pack 2 · Naturaleza y recursos

Común a todos los prompts de este pack (ya va incluido en cada uno): vista isométrica, luz arriba-izquierda,
sin sombra ni suelo debajo, fondo blanco.

### 2a · Robles (4 variantes, se reparten al azar por el mapa)

```text
Game asset sheet for an original medieval strategy game: 6 separate deciduous trees on a pure flat white background (#FFFFFF), arranged in a 3x2 grid with generous empty space between them, nothing touching another tree or the image edges.
Isometric 3/4 view from above, as in classic isometric strategy games. Each tree stands on a single map tile; only the trunk base touches the ground.
Lighting: sun from the upper left, lit foliage on the left, darker foliage on the lower right. NO cast shadows, NO grass or ground under the trees.
Trees: 4 broadleaf oaks of slightly different shapes and sizes (round, tall, wide, slightly lopsided), 1 young oak, 1 old gnarled oak.
Hand-painted 2D game art, dense detailed leaves, visible branches, crisp clean silhouette, rich natural greens. Same scale for all. No text, no labels, no frames.
```

### 2b · Pinos y pinos nevados

```text
Game asset sheet for an original medieval strategy game: 6 separate conifer trees on a pure flat white background (#FFFFFF), 3x2 grid, generous empty space, nothing touching.
Isometric 3/4 view from above. Each tree occupies one map tile; only the trunk base touches the ground.
Sun from the upper left, NO cast shadows, NO ground or snow piles under the trees.
Top row: 3 green mountain pines of different heights and shapes. Bottom row: the same 3 pines covered with fresh snow on the branches.
Hand-painted 2D game art, detailed needles, crisp silhouettes, consistent scale. No text, no labels.
```

### 2c · Más árboles (variedad de biomas)

```text
Game asset sheet for an original medieval strategy game: 6 separate trees on a pure flat white background (#FFFFFF), 3x2 grid, generous space, nothing touching.
Isometric 3/4 view from above, one map tile each, only the trunk base touches the ground. Sun from the upper left, NO cast shadows, NO ground.
1. White birch with light foliage. 2. Tall slim poplar. 3. Date palm for an oasis. 4. Dead leafless tree. 5. Autumn oak with orange and red leaves. 6. Olive tree with silver-green leaves.
Hand-painted 2D game art, crisp silhouettes, same scale as a typical oak. No text.
```

### 2d · Tocones y troncos (árbol talado)

```text
Game asset sheet for an original medieval strategy game: 6 separate objects on a pure flat white background (#FFFFFF), 3x2 grid, generous space.
Isometric 3/4 view, sun from the upper left, NO cast shadows, NO ground.
1. Fresh oak stump with a few wood chips. 2. Pine stump. 3. Old mossy stump. 4. Felled oak log. 5. Small pile of chopped firewood. 6. Stack of three logs.
Hand-painted 2D game art, crisp edges, natural wood colors. No text.
```

### 2e · Minas de oro y piedra (3 fases de agotamiento)

```text
Game asset sheet for an original medieval strategy game: 6 separate resource deposits on a pure flat white background (#FFFFFF), 3x2 grid, generous empty space, nothing touching.
Isometric 3/4 view from above, each deposit fits on one map tile. Sun from the upper left, NO cast shadows, NO ground or grass around them.
Top row: a gold ore deposit (grey rocks with shiny gold veins and nuggets) in three stages: full large pile, half depleted, almost depleted (a few small rocks).
Bottom row: a stone quarry deposit (pale grey granite boulders) in the same three stages: full, half, almost depleted.
Hand-painted 2D game art, crisp edges, gold must glitter clearly. No text, no labels.
```

### 2f · Arbustos de bayas (3 fases) y arbustos decorativos

```text
Game asset sheet for an original medieval strategy game: 6 separate bushes on a pure flat white background (#FFFFFF), 3x2 grid, generous space.
Isometric 3/4 view, each bush fits on one map tile. Sun from the upper left, NO cast shadows, NO ground.
Top row: a forage bush full of bright red berries, the same bush with half the berries, the same bush with no berries left.
Bottom row: three decorative shrubs without berries (round green bush, flowering bush with small white flowers, dry brown shrub).
Hand-painted 2D game art, crisp edges, consistent scale. No text.
```

### 2g · Animales 🔧 (caza y pastoreo)

Primero una imagen de referencia con los animales quietos; las animaciones se piden después como en el Pack 6.

```text
Game asset sheet for an original medieval strategy game: 6 separate animals on a pure flat white background (#FFFFFF), 3x2 grid, generous space, nothing touching.
Isometric 3/4 view from above, all facing toward the lower right of the image, standing still. Sun from the upper left, NO cast shadows, NO ground.
1. Red deer stag. 2. Wild boar. 3. White sheep. 4. Grey wolf. 5. Brown cow. 6. Domestic chicken (small).
Realistic proportions relative to each other (a sheep is about knee-high to a person, a boar slightly bigger, a cow much bigger).
Hand-painted 2D game art, crisp clean edges. No text.
```

### 2h · Recursos del agua 🔧 (pesca)

```text
Game asset sheet for an original medieval strategy game: 6 separate objects on a pure flat white background (#FFFFFF), 3x2 grid, generous space.
Isometric 3/4 view from above, sun from the upper left, NO cast shadows.
1-3. A shoal of fish seen just below a small patch of water surface, in three stages: many fish, fewer fish, almost none (the water patch is round and soft-edged).
4. A small wooden fishing trap with a float. 5. A cluster of reeds growing out of water. 6. Floating lily pads with two white flowers.
Hand-painted 2D game art. No text.
```

---

## Pack 3 · Edificios económicos (Edad Oscura)

### 3a · Seis edificios

```text
Game asset sheet for an original medieval real-time strategy game. Six separate buildings on a pure flat white background (#FFFFFF), arranged in a 3x2 grid with generous empty white space between them; nothing touches another building or the image edges.

Camera: isometric 2:1 dimetric view, the ground footprint of every building is a diamond twice as wide as it is tall. All buildings at the same scale: one map tile is a 2:1 diamond, the large building covers 4x4 tiles, the medium one 3x3, the small ones 2x2.

Lighting: sun from the upper left. Left-facing walls brightly lit, right-facing walls in shade. NO cast shadows on the ground, NO ground, grass, pavement or terrain under the buildings, only a thin stone or timber foundation exactly on the footprint.

Era: early medieval, "dark age" village: rough timber, wattle and daub, thatched roofs, stone footings, weathered wood.
1. Town center (4x4): large timber hall with a central lookout tower, thatched roofs, a banner pole.
2. House (2x2): small thatched cottage with one door and a window.
3. Mill (2x2): wooden windmill-style granary with sails, sacks of grain.
4. Lumber camp (2x2): open timber shed with stacked logs and an axe stump.
5. Mining camp (2x2): open shed with carts of stone and ore, pickaxes.
6. Barracks (3x3): long timber training hall with a fenced yard and weapon racks.

Player color: every flag, banner, pennant and cloth awning is painted in a single flat pure magenta (#FF00FF) with light shading only; magenta appears nowhere else.

Style: detailed hand-painted 2D game art, crisp clean edges, rich but natural colors, high resolution, consistent level of detail. No text, no labels, no UI, no people, no animals, no frames.
```

### 3b · Granja (4 fases)

```text
Game asset sheet for an original medieval strategy game: 4 separate farm fields on a pure flat white background (#FFFFFF), 2x2 grid, generous space, nothing touching.
Isometric 2:1 view: each field is a flat diamond-shaped plot of 2x2 map tiles (twice as wide as tall), bordered by a low wooden fence or stone edge, seen from above.
Sun from the upper left, NO cast shadows, NO grass or ground outside the plot.
1. Freshly ploughed and sown soil with neat furrows. 2. Young green wheat sprouts. 3. Ripe golden wheat ready for harvest. 4. Harvested field with stubble and a few straw bundles.
All four plots identical in size, shape and fence; only the crop changes. Hand-painted 2D game art. No text, no people.
```

### 3c · Obras en construcción (opcional; si no, el edificio aparece de abajo arriba)

```text
Game asset sheet for an original medieval strategy game: 4 separate construction sites on a pure flat white background (#FFFFFF), 2x2 grid, generous space.
Isometric 2:1 view, each site is a diamond footprint: 1x1, 2x2, 3x3 and 4x4 map tiles, at the same scale.
Each site shows a levelled earth foundation with wooden stakes and rope marking the corners, a few planks, stones and tools, and a partial wooden scaffold.
Sun from the upper left, NO cast shadows, NO ground outside the footprint. Hand-painted 2D game art. No text, no people.
```

---

## Pack 4 · Edificios militares y especiales

### 4a · Militares (Edad Feudal)

```text
Game asset sheet for an original medieval real-time strategy game. Six separate buildings on a pure flat white background (#FFFFFF), 3x2 grid, generous empty space; nothing touches another building or the image edges.
Camera: isometric 2:1 dimetric view, footprints are diamonds twice as wide as tall. Same scale for all: 1 map tile = one 2:1 diamond.
Lighting: sun from the upper left, left walls lit, right walls in shade. NO cast shadows, NO ground or terrain under the buildings, only a thin foundation on the footprint.
Era: high medieval, timber framing on stone ground floors, wooden shingles and clay tiles.
1. Archery range (3x3): open yard with straw targets, a covered stand and a small hall.
2. Stable (3x3): long wooden stable with horse stalls, hay bales, a water trough.
3. Blacksmith (3x3): stone forge with a big chimney, anvil, glowing furnace under an awning.
4. Siege workshop (3x3): large open timber workshop with logs, beams and a half-built siege frame.
5. Watch tower (1x1): tall narrow stone tower with a wooden lookout platform and roof.
6. Castle (4x4): compact stone keep with corner towers and battlements.
Player color: every flag, banner and awning in flat pure magenta (#FF00FF) with light shading; magenta nowhere else.
Detailed hand-painted 2D game art, crisp edges, consistent detail. No text, no people, no animals.
```

### 4b · Torres por edad

```text
Game asset sheet for an original medieval strategy game: 4 separate defensive towers on a pure flat white background (#FFFFFF), in one row with generous space, nothing touching.
Isometric 2:1 view, each tower stands on a 1x1 diamond footprint, same scale. Sun from the upper left, NO cast shadows, NO ground.
1. Wooden palisade watch tower with a thatched lookout (dark age). 2. Stone watch tower with a wooden roof (feudal). 3. Tall stone guard tower with a tiled conical roof (castle age). 4. Massive stone keep tower with battlements and a slate roof (imperial).
Player color: a small flag on each tower in flat pure magenta (#FF00FF); magenta nowhere else.
Hand-painted 2D game art. No text, no people.
```

### 4c · Murallas y puertas 🔧

```text
Game asset sheet for an original medieval strategy game: wall segments on a pure flat white background (#FFFFFF), arranged in a grid with generous space, nothing touching.
Isometric 2:1 view: every segment covers exactly one map tile (a 2:1 diamond) and is aligned with the isometric grid. Sun from the upper left, NO cast shadows, NO ground.
Stone wall with battlements: 1. straight segment running from upper left to lower right. 2. straight segment running from upper right to lower left. 3. corner piece. 4. T-junction. 5. small square wall tower. 6. gate (2 tiles wide) with closed wooden doors. 7. the same gate open. 8. wooden palisade straight segment (sharpened logs).
Player color: a small pennant above the gate in flat pure magenta (#FF00FF).
Hand-painted 2D game art, crisp edges. No text.
```

### 4d · Edificios nuevos 🔧 (monasterio, mercado, muelle, universidad)

```text
Game asset sheet for an original medieval real-time strategy game. Four separate buildings on a pure flat white background (#FFFFFF), 2x2 grid, generous space, nothing touching.
Isometric 2:1 dimetric view, footprints are diamonds twice as wide as tall, same scale (1 tile = one 2:1 diamond). Sun from the upper left, NO cast shadows, NO ground.
1. Monastery (3x3): stone chapel with a bell tower and a small cloister garden.
2. Market (4x4): covered market hall with stalls, crates, barrels and cloth awnings.
3. Dock (3x3): wooden pier on stilts with a crane and stacked nets (stilts end where the water would be; no water drawn).
4. University (4x4): stone building with a dome and arched windows.
Player color: flags and awnings in flat pure magenta (#FF00FF); magenta nowhere else.
Hand-painted 2D game art. No text, no people.
```

---

## Pack 5 · Variantes por edad

Un prompt por edad con los mismos edificios. Adjunta la imagen del Pack 3a como referencia para que
mantengan forma y huella.

```text
Using the attached image as reference for layout, footprints, scale and lighting, redraw the same six buildings in the AGE_STYLE.
Keep each building's footprint size and overall silhouette recognisable so the player sees it is the same building, now upgraded.
Pure flat white background (#FFFFFF), same 3x2 grid and spacing, isometric 2:1 view, sun from the upper left, NO cast shadows, NO ground.
Player color: every flag, banner and awning in flat pure magenta (#FF00FF); magenta nowhere else.
Detailed hand-painted 2D game art. No text, no people.
AGE_STYLE: <estilo>
```

| Edad | `AGE_STYLE` |
| --- | --- |
| Feudal | feudal age: half-timbered walls on stone ground floors, steep red clay tile roofs, chimneys with smoke vents, wooden shutters |
| Castillos | castle age: dressed stone walls, slate roofs, arched windows, iron fittings, small decorative banners |
| Imperial | imperial age: large ornate stone and brick buildings, blue-grey slate roofs, towers with spires, carved details, glass windows |

Repite lo mismo con la imagen del Pack 4a para los edificios militares.

---

## Pack 6 · Unidades

Las animaciones son lo más difícil de mantener coherentes. El método que mejor funciona:

1. **Hoja de referencia** con todas las unidades quietas (6a, 6b). De aquí salen también los retratos.
2. **Animaciones de una en una** (6c), adjuntando la imagen de la unidad elegida y pidiendo los fotogramas
   en una tira horizontal. Si un fotograma sale distinto, pídelo suelto con la referencia.

Dirección: una sola (mirando hacia abajo a la derecha); el juego la refleja para el otro lado. Más adelante
se pueden pedir las otras direcciones con el mismo método.

### 6a · Infantería y arqueros (quietos)

```text
Character sheet for an original medieval real-time strategy game: 9 separate soldiers on a pure flat white background (#FFFFFF), 3x3 grid, generous space, nothing touching.
Each character is shown full body in isometric 3/4 view from above, facing toward the lower right of the image, standing in an idle ready pose, feet on the ground.
Sun from the upper left. NO cast shadows, NO ground.
1. Male villager: simple tunic, belt, leather boots, holding an axe.
2. Female villager: dress with apron and headscarf, holding a basket.
3. Militia: padded tunic, simple round helmet, short sword.
4. Man-at-arms: chainmail, nasal helmet, sword and round shield.
5. Long swordsman: mail and plate, great helm, long sword, kite shield.
6. Spearman: padded armour, kettle hat, long spear.
7. Pikeman: breastplate, very long pike.
8. Archer: hood, leather jerkin, longbow, quiver.
9. Crossbowman: mail, brimmed helmet, crossbow.
Player color: tabards, tunics, shield faces and hood linings painted in flat pure magenta (#FF00FF) with light shading; magenta nowhere else (not on skin, weapons or hair).
All at the same scale and height (an adult is about 1.8 m). Detailed hand-painted 2D game art, crisp outlines. No text, no labels.
```

### 6b · Caballería, asedio y unidades únicas (quietos)

```text
Character sheet for an original medieval real-time strategy game: 8 separate units on a pure flat white background (#FFFFFF), 4x2 grid, generous space, nothing touching.
Isometric 3/4 view from above, all facing toward the lower right of the image, idle pose. Sun from the upper left, NO cast shadows, NO ground.
1. Skirmisher: light tunic, bundle of javelins, small shield.
2. Scout cavalry: light rider on a fast brown horse, leather armour.
3. Knight: armoured rider on a barded warhorse, lance raised.
4. Paladin: rider in full plate on a heavily barded black horse, ornate helmet.
5. Battering ram: wheeled wooden siege engine with a hide-covered roof and an iron-capped log.
6. Longbowman: tall archer with a very long yew bow, green hood.
7. Throwing axeman: bearded warrior with helmet, shield and throwing axes.
8. Horse archer: light rider with a composite bow on a small steppe horse.
Player color: rider tabards, horse caparisons, shield faces and pennants in flat pure magenta (#FF00FF) with light shading; magenta nowhere else.
Same scale (a rider on horseback is about 1.5 times as tall as a standing soldier). Detailed hand-painted 2D game art. No text.
```

Unidades de mods y nuevas: huscarle (godo con hacha y escudo grande), elefante de guerra, monje 🔧,
barco de pesca 🔧, galera 🔧, mangonel 🔧. Se piden igual, de 4 a 6 por imagen.

### 6c · Animación de una unidad (plantilla)

```text
Using the attached character as the exact reference (same face, body proportions, clothes, colors, weapon and magenta player-color areas), draw an animation strip of ANIMATION.
FRAMES frames in a single horizontal row, evenly spaced, on a pure flat white background (#FFFFFF); frames do not touch each other.
Same isometric 3/4 view from above, facing toward the lower right, same size in every frame, feet on the same baseline.
Sun from the upper left, NO cast shadows, NO ground, NO motion blur, NO speed lines.
Detailed hand-painted 2D game art, crisp outlines. No text, no frame numbers.
```

| Estado | `ANIMATION` | `FRAMES` |
| --- | --- | --- |
| `walk` | a looping walk cycle (contact, passing, contact, passing with the opposite leg) | 8 |
| `attack` | a melee attack: wind-up, strike, follow-through, recover (archers: draw, aim, release, recover) | 6 |
| `death` | falling down: hit, stagger, knees buckle, falling, lying on the ground, lying still | 6 |
| `idle` | a subtle breathing idle (optional) | 4 |

Solo para el aldeano (adjunta la referencia del hombre o la mujer):

| Estado | `ANIMATION` | `FRAMES` |
| --- | --- | --- |
| `work-wood` | chopping a tree trunk with an axe (the tree itself is not drawn) | 6 |
| `work-gold` / `work-stone` | swinging a pickaxe down at rocks (the rocks are not drawn) | 6 |
| `work-food` | picking berries from a bush and placing them in a basket (bush not drawn) | 6 |
| `work-farm` | hoeing the ground with a hoe | 6 |
| `work-build` | hammering with a mallet, crouched | 6 |
| `carry-wood` | walking while carrying logs on the shoulder | 8 |
| `carry-food` | walking while carrying a full basket of food | 8 |
| `carry-gold` / `carry-stone` | walking while carrying a sack of ore over the shoulder | 8 |

---

## Pack 7 · Proyectiles, efectos y restos

```text
Game asset sheet for an original medieval strategy game: small separate objects on a pure flat white background (#FFFFFF), grid with generous space, nothing touching.
Side view for projectiles (pointing to the right), isometric 3/4 view for the rest. Sun from the upper left, NO cast shadows, NO ground.
Row 1: an arrow, a crossbow bolt, a javelin, a throwing axe, a round catapult stone.
Row 2: a burning arrow; four frames of a small orange fire flame (looping).
Row 3: four frames of a puff of grey dust; four frames of rising dark smoke.
Hand-painted 2D game art, crisp edges. No text.
```

```text
Game asset sheet for an original medieval strategy game: 4 separate piles of building rubble on a pure flat white background (#FFFFFF), 2x2 grid, generous space.
Isometric 2:1 view, each pile covers a diamond footprint of 1x1, 2x2, 3x3 and 4x4 map tiles at the same scale: broken stones, charred beams, scattered roof tiles, a little smoke.
Sun from the upper left, NO cast shadows, NO ground outside the debris. Hand-painted 2D game art. No text.
```

```text
Game asset sheet for an original medieval strategy game: 6 separate objects on a pure flat white background (#FFFFFF), 3x2 grid, generous space.
Isometric 3/4 view, sun from the upper left, NO cast shadows, NO ground.
1. Rally point flag on a pole (flag in flat pure magenta #FF00FF). 2. Small treasure chest, closed. 3. The same chest open with gold coins. 4. Broken wooden cart. 5. Scattered bones and a helmet (battlefield remains, not gory). 6. A burnt campfire.
Hand-painted 2D game art. No text.
```

---

## Pack 8 · Decoración del terreno

Detalles pequeños que el motor reparte por el mapa (ya hay decoración procedural: estas imágenes la sustituyen).

```text
Game asset sheet for an original medieval strategy game: 12 small separate ground decorations on a pure flat white background (#FFFFFF), 4x3 grid, generous space, nothing touching.
Isometric 3/4 view from above, each object much smaller than a map tile. Sun from the upper left, NO cast shadows, NO ground patch under the objects.
Grass tufts (3 shapes), a clump of yellow wildflowers, a clump of white daisies, a clump of purple heather, two small grey stones, a mossy rock, red-capped mushrooms, a fern, a fallen branch.
Hand-painted 2D game art, crisp edges, natural colors. No text.
```

```text
Game asset sheet for an original medieval strategy game: 12 small separate decorations on a pure flat white background (#FFFFFF), 4x3 grid, generous space.
Isometric 3/4 view from above, small objects, sun from the upper left, NO cast shadows, NO ground.
Shore and water: reeds (2 sizes), cattails, water lilies, a rock half in water, driftwood.
Snow and mountain: snowy rock, frozen bush, small ice crystals cluster.
Desert: dry thorny shrub, animal skull, sandstone rocks.
Hand-painted 2D game art. No text.
```

```text
Game asset sheet for an original medieval strategy game: 8 village props on a pure flat white background (#FFFFFF), 4x2 grid, generous space.
Isometric 3/4 view from above, sun from the upper left, NO cast shadows, NO ground.
A haystack, a stone well, stacked barrels, wooden crates, a straight wooden fence section, a wooden signpost, a wheelbarrow, a wooden bench.
Hand-painted 2D game art, same scale as each other (a barrel is about waist-high). No text.
```

---

## Pack 9 · Interfaz

Los iconos son cuadrados y llevan su propio fondo pintado (no se recortan). El juego usa ahora emojis:
cambiarlos por imágenes requiere un pequeño cambio en la interfaz 🔧.

```text
Set of 12 square game icons for an original medieval strategy game interface, arranged in a 4x3 grid on a pure white background with white gaps between icons.
Each icon: square, painted illustration with a dark bevelled stone frame, readable at 48x48 pixels, strong silhouette, warm medieval palette, light from the upper left.
Icons: food (bread and meat), wood (log pile), gold (coins), stone (cut blocks), population (two villagers), idle villager, house, attack, stop, delete (red cross), build (hammer), rally point (flag).
No text, no letters, no numbers.
```

```text
Set of 12 square technology icons for an original medieval strategy game, 4x3 grid on a pure white background with white gaps.
Each icon: square painted illustration with a dark bevelled stone frame, readable at 48x48 pixels, warm medieval palette.
Icons: loom (spinning wheel), wheelbarrow, hand cart, double-bit axe, bow saw, horse collar, heavy plough, gold mining (pickaxe with gold), stone mining (chisel on stone), forging (hammer on anvil), iron casting (molten iron), fletching (arrow feathers).
No text, no letters, no numbers.
```

```text
Set of 8 square technology icons for an original medieval strategy game, 4x2 grid on a pure white background with white gaps, same frame and style as before:
bodkin arrow, scale mail armour, scale barding (horse armour), padded archer armour, conscription (marching soldiers), husbandry (horse head), feudal age emblem (wooden shield with a tower), castle age emblem (stone castle).
No text, no letters, no numbers.
```

```text
Medieval strategy game interface textures, 4 separate square tiles on a pure white background with white gaps:
1. Dark carved grey stone panel, seamless. 2. Dark polished wood panel, seamless. 3. Aged parchment, seamless. 4. Ornate gold and stone corner piece for a frame.
Flat front view, even lighting, no text.
```
