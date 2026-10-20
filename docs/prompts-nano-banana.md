# Prompts para generar el arte con Nano Banana

Catálogo de prompts para sustituir los gráficos del juego por ilustraciones, pack a pack. Cada bloque de
código es **un prompt completo**: cópialo tal cual. Están en inglés porque Nano Banana es más preciso así.

Están escritos como encargos de **ilustración**, no de recursos para un videojuego: sin jerga técnica, sin
códigos de color, sin medidas en píxeles y sin listas numeradas. Palabras como "game assets", "game
development", "sprite sheet", "seamless tileable", "texture" u "orthographic" hacen que Nano Banana rechace la
petición ("I cannot create images of a seamless tileable texture... for game development"), y los códigos o
listas numeradas hacen que escriba textos y números en la imagen. Las
exigencias técnicas (recorte, escala, máscara de color) las resuelve después el script `npm run art-import`.

Lo marcado con 🔧 todavía no existe en el juego: el dibujo se puede hacer ya, pero hay que programar la
mecánica (caza, murallas, barcos...) para usarlo.

## Cómo trabajar

1. **Una imagen por prompt, con 4–6 objetos como máximo.** Con más, baja el detalle y la escala se vuelve irregular.
2. Pide la **máxima resolución** que permita.
3. **Coherencia:** cuando una imagen salga bien, adjúntala en las siguientes del mismo pack y añade al principio:
   *"Same illustration style, colors, lighting and viewing angle as the attached picture."*
4. Si un objeto sale mal (con sombra en el suelo, con hierba debajo, iluminado desde la derecha), pide solo ese
   objeto otra vez en lugar de repetir la imagen entera.
5. Guarda las imágenes sin tocar en `art-src/entrada/<pack>/` y avisa a Claude.

### Lo que tiene que cumplir cada imagen (ya va en los prompts)

- **Fondo blanco liso** y objetos bien separados entre sí y de los bordes.
- **Vista desde arriba en diagonal**, desde una esquina: la planta de los edificios se ve como un rombo el doble
  de ancho que de alto.
- **Sol desde arriba a la izquierda**: caras izquierdas iluminadas, derechas en sombra.
- **Sin sombra en el suelo y sin suelo debajo**: los objetos "flotan" sobre el blanco (la sombra y el terreno
  los pone el juego).
- **Telas de color del jugador en magenta** (rosa-púrpura intenso): banderas, estandartes, tabardos, escudos,
  toldos. El script detecta ese color y lo cambia por el de cada jugador. El magenta no debe aparecer en nada más.
- **Ni textos, ni números, ni marcos.**

Si aun así aparecen problemas, estas frases ayudan añadidas al final:

| Problema | Añade |
| --- | --- |
| Pone nombres o números | *"Absolutely no writing, letters or numbers anywhere."* |
| Dibuja sombras o suelo | *"The objects float on pure white paper: no shadow, no ground, no grass beneath them."* |
| Los objetos se tocan | *"Leave wide empty white gaps between the objects."* |
| Vista de frente o de lado | *"Seen from high above at a corner, like a model village photographed from a balcony."* |
| La luz viene de la derecha | *"The sun is in the upper left corner; the right-hand walls are in shade."* |
| Escalas muy distintas | *"All objects drawn at the same scale, as if standing in the same village."* |

---

## Pack 1 · Texturas de terreno

Una imagen por terreno, cuadrada. **No pidas que sea "seamless", "tileable", "texture", "orthographic" ni que sea
para un juego**: Nano Banana lo rechaza. Que se repita sin costuras lo hace después `npm run fix-textures`.
Plantilla (cambia la última frase):

```text
A square close-up painting of the ground, as if photographed looking straight down at your feet: no horizon, no sky, no perspective.
Soft, even daylight with no dark corners and no strong shadows.
The same kind of ground fills the whole square evenly, with no single large object, path or feature that stands out.
Detailed hand-painted illustration with natural colors and fine small details. No writing, no frame, no border.
The ground is: <descripción>
```

| Archivo | Descripción |
| --- | --- |
| `grass` | a lush green meadow with small tufts of grass and a few tiny yellow and white wildflowers, with gentle variation between fresh green and olive patches |
| `dirt` | packed brown earth with small pebbles, faint cracks and a few dry grass blades, a natural brown rather than orange |
| `forest` | a forest floor of dark soil, fallen leaves, pine needles, moss patches and small twigs |
| `sand` | pale beach sand with soft ripples from the wind and a few tiny shells and pebbles |
| `desert` | dry ochre desert ground, hard cracked clay with scattered small stones |
| `snow` | fresh snow with gentle drifts, soft blue shade in the hollows and a few sparkling ice crystals |
| `rock` | rugged grey mountain rock with cracks, layers and spots of lichen |
| `water` | deep calm lake water, dark blue-green, with small gentle ripples and no reflections |
| `shallows` | clear shallow water over a sandy bottom with visible pebbles and soft rippling light |

Extras para enriquecer el mapa (se añaden como terrenos nuevos en un mod, es fácil):

| Archivo | Descripción |
| --- | --- |
| `dry-grass` | dry yellowed late-summer grass with seed heads |
| `mud` | wet dark mud with small puddles |
| `road` | a worn cobblestone road of irregular rounded stones with grass growing between them |
| `autumn-forest` | a forest floor covered with orange, red and brown autumn leaves |
| `pebbles` | a riverbank of rounded grey and brown pebbles |

---

## Pack 2 · Naturaleza y recursos

### 2a · Robles (variantes para repartir por el mapa)

```text
A hand-painted illustration of six separate oak trees on a plain white background, arranged in two rows of three, each tree standing on its own with wide empty white space around it.
Seen from high above at an angle, as in a model landscape viewed from a balcony.
Sunlight comes from the upper left: the left side of each crown is bright, the lower right side darker.
The trees float on the white background: no shadow on the ground, no grass or soil around the trunks.
Four full-grown oaks with slightly different shapes (round, tall, wide, a little lopsided), one young oak and one old gnarled oak, all drawn at the same scale.
Detailed leaves and branches, crisp clean outlines, rich natural greens. No writing, no numbers, no frame.
```

### 2b · Pinos y pinos nevados

```text
A hand-painted illustration of six separate pine trees on a plain white background, two rows of three, each with wide empty white space around it.
Seen from high above at an angle, like a model landscape viewed from a balcony.
Sunlight from the upper left. The trees float on the white background: no shadow on the ground, no grass or snow piles at their feet.
In the top row, three green mountain pines of different heights; in the bottom row, the same three pines with fresh snow resting on their branches.
Detailed needles, crisp outlines, same scale for all. No writing, no numbers, no frame.
```

### 2c · Más árboles (variedad de paisajes)

```text
A hand-painted illustration of six different trees on a plain white background, two rows of three, each with wide empty white space around it.
Seen from high above at an angle, sunlight from the upper left; the trees float on the white background with no shadow and no ground beneath them.
A white birch, a tall slim poplar, a date palm, a dead leafless tree, an oak with orange and red autumn leaves, and an olive tree with silvery-green leaves, all at the same scale as a normal oak.
Crisp outlines, natural colors. No writing, no numbers, no frame.
```

### 2d · Tocones y troncos

```text
A hand-painted illustration of six separate wooden objects on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow and no ground beneath them.
A freshly cut oak stump with wood chips, a pine stump, an old mossy stump, a felled oak log, a small pile of chopped firewood and a neat stack of three logs.
Crisp outlines, natural wood colors. No writing, no numbers, no frame.
```

### 2e · Yacimientos de oro y piedra (de lleno a casi agotado)

```text
A hand-painted illustration of six separate piles of rocks on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left. The rocks float on the white background: no shadow, no soil or grass around them.
Top row: grey rocks with shining veins and nuggets of gold, first as a large heap, then half the size, then only a few small rocks left.
Bottom row: pale grey granite boulders from a stone quarry, in the same three sizes: large heap, half, almost gone.
The gold must glitter clearly. Crisp outlines. No writing, no numbers, no frame.
```

### 2f · Arbustos de bayas y arbustos decorativos

```text
A hand-painted illustration of six separate bushes on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow and no ground beneath them.
Top row: a bush full of bright red berries, the same bush with only half its berries, and the same bush with no berries left.
Bottom row: a round green bush, a bush with small white flowers, and a dry brown shrub.
All the same scale, crisp outlines. No writing, no numbers, no frame.
```

### 2g · Animales 🔧 (caza y pastoreo)

Primero una imagen con los animales quietos; las animaciones se piden después como en el Pack 6.

```text
A hand-painted illustration of six separate animals on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, all animals facing toward the lower right corner of the picture and standing still.
Sunlight from the upper left. The animals float on the white background: no shadow, no grass under their feet.
A red deer stag, a wild boar, a white sheep, a grey wolf, a brown cow and a chicken, with realistic sizes relative to one another.
Crisp outlines, natural colors. No writing, no numbers, no frame.
```

### 2h · Pesca 🔧

```text
A hand-painted illustration of six separate small scenes on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow.
Three small round patches of water with fish swimming just below the surface: many fish, fewer fish, and almost none.
A small wooden fish trap with a float, a clump of reeds growing out of a little water, and floating lily pads with two white flowers.
No writing, no numbers, no frame.
```

---

## Pack 3 · Edificios del pueblo (Edad Oscura)

### 3a · Seis edificios

```text
A hand-painted illustration of six separate early medieval village buildings on a plain white background, arranged in two rows of three, each standing on its own with wide empty white space around it.

They are seen from high above at a corner, like a model village viewed from a balcony, so that the ground plan of every building looks like a diamond twice as wide as it is tall. All are drawn at the same scale, as if they stood in the same village.

Sunlight comes from the upper left: walls facing left are bright, walls facing right are in shade.
The buildings float on the white background: no shadow on the ground, no grass, paving or soil around them, only their own low stone or timber foundation.

The village is poor and rustic: rough timber, wattle and daub, thatched roofs, stone footings, weathered wood.
A large town hall with a wooden lookout tower in the middle and a tall banner pole, the biggest building of the set.
A small thatched cottage with one door and one window.
A wooden windmill with sails and sacks of grain.
An open woodcutter's shed with stacked logs and an axe in a stump.
An open miner's shed with carts full of stone and ore and some pickaxes.
A long timber training hall for soldiers with a fenced yard and weapon racks, larger than the cottage but smaller than the town hall.

Every flag, banner, pennant and cloth awning is made of bright magenta fabric (an intense pink-purple); magenta appears nowhere else in the picture.

Detailed painterly style, crisp clean outlines, rich natural colors. No people, no animals, no writing, no numbers, no frame.
```

### 3b · Campo de cultivo (de recién sembrado a cosechado)

```text
A hand-painted illustration of four separate small farm fields on a plain white background, in two rows of two, with wide white gaps.
Each field is a flat square plot with a low wooden fence, seen from high above at a corner so that it looks like a diamond twice as wide as it is tall. The four plots are identical in size and fence; only the crop changes.
Sunlight from the upper left. No shadow and no grass outside the fence.
A freshly ploughed and sown field with neat furrows, a field of young green wheat sprouts, a field of ripe golden wheat, and a harvested field with stubble and a few straw bundles.
No people, no writing, no numbers, no frame.
```

### 3c · Obras en construcción (opcional)

```text
A hand-painted illustration of four separate building sites on a plain white background, in two rows of two, with wide white gaps, from small to large.
Seen from high above at a corner, so that each site looks like a diamond twice as wide as it is tall. Sunlight from the upper left, no shadow, nothing outside the sites.
Each site shows levelled earth with wooden stakes and rope marking the corners, a few planks, stones and tools, and a partly built wooden scaffold.
No people, no writing, no numbers, no frame.
```

---

## Pack 4 · Edificios militares y especiales

### 4a · Militares

```text
A hand-painted illustration of six separate medieval military buildings on a plain white background, in two rows of three, each with wide empty white space around it.
Seen from high above at a corner, like a model village viewed from a balcony, so that each ground plan looks like a diamond twice as wide as it is tall. All at the same scale.
Sunlight from the upper left: left walls bright, right walls in shade. The buildings float on the white background: no shadow, no ground around them, only their own low foundation.
Timber-framed walls on stone ground floors, wooden shingles and clay tiles.
An archery range with straw targets in an open yard and a small covered stand.
A long wooden stable with horse stalls, hay bales and a water trough.
A stone smithy with a big chimney, an anvil and a glowing furnace under an awning.
A large open timber workshop with beams and the frame of a half-built siege engine.
A tall narrow stone watchtower with a wooden lookout and roof, standing on a small base.
A compact stone castle with a keep, corner towers and battlements, the largest of the set.
Every flag, banner and awning is bright magenta fabric (intense pink-purple); magenta appears nowhere else.
No people, no animals, no writing, no numbers, no frame.
```

### 4b · Torres por época

```text
A hand-painted illustration of four separate defensive towers on a plain white background, in one row, with wide white gaps.
Seen from high above at a corner, all at the same scale, sunlight from the upper left, no shadow and no ground.
From left to right, the same tower improving over time: a wooden palisade watchtower with a thatched lookout; a stone watchtower with a wooden roof; a tall stone tower with a pointed tiled roof; a massive stone keep with battlements and a slate roof.
Each tower flies a small bright magenta flag (intense pink-purple); magenta appears nowhere else.
No people, no writing, no numbers, no frame.
```

### 4c · Murallas y puertas 🔧

```text
A hand-painted illustration of separate pieces of a medieval stone wall on a plain white background, arranged in rows with wide white gaps.
Seen from high above at a corner, like a model; sunlight from the upper left; no shadow and no ground.
A straight wall section running from upper left to lower right, the same section running from upper right to lower left, a corner, a T-shaped junction, a small square wall tower, a gatehouse with closed wooden doors, the same gatehouse with open doors, and a straight section of wooden palisade of sharpened logs.
A small bright magenta pennant flies above the gatehouse; magenta appears nowhere else.
No writing, no numbers, no frame.
```

### 4d · Edificios nuevos 🔧 (monasterio, mercado, muelle, universidad)

```text
A hand-painted illustration of four separate medieval buildings on a plain white background, in two rows of two, with wide white gaps.
Seen from high above at a corner, same scale for all, sunlight from the upper left, no shadow and no ground around them.
A stone monastery chapel with a bell tower and a small cloister garden.
A covered market hall with stalls, crates, barrels and cloth awnings.
A wooden pier on stilts with a small crane and stacked fishing nets (the stilts end in mid-air; no water is drawn).
A stone university with a dome and tall arched windows.
Flags and awnings are bright magenta fabric; magenta appears nowhere else.
No people, no writing, no numbers, no frame.
```

---

## Pack 5 · Los mismos edificios en cada época

Un prompt por época, **adjuntando la imagen del Pack 3a** (y después la del 4a) para que conserven forma y
tamaño. Cambia la última frase:

```text
Redraw the six buildings of the attached picture as they would look in a later, richer period, keeping the same arrangement, viewing angle, size and lighting, so that each one is clearly recognisable as the same building, now improved.
Plain white background with wide white gaps, sunlight from the upper left, no shadow and no ground around them.
Every flag, banner and awning stays bright magenta fabric; magenta appears nowhere else.
No people, no writing, no numbers, no frame.
The new period: <época>
```

| Época | Frase |
| --- | --- |
| Feudal | half-timbered walls on stone ground floors, steep red clay tile roofs, chimneys and wooden shutters |
| Castillos | dressed stone walls, slate roofs, arched windows, iron fittings and small decorative banners |
| Imperial | large ornate stone and brick buildings with blue-grey slate roofs, small towers with spires, carved details and glass windows |

---

## Pack 6 · Personajes

Las animaciones son lo más difícil de mantener iguales. El método que mejor funciona:

1. Una **imagen de referencia** con todos los personajes quietos (6a, 6b). De aquí salen también los retratos.
2. Las **animaciones de una en una** (6c), adjuntando el personaje elegido y pidiendo las posturas en una fila.
   Si una postura sale distinta, se pide sola con la referencia.

Todos miran hacia abajo a la derecha; el juego los refleja para el otro lado.

### 6a · Aldeanos e infantería

```text
A hand-painted illustration of nine separate medieval characters on a plain white background, in three rows of three, each with wide empty white space around them.
Each is shown full length, seen from slightly above, turned toward the lower right corner of the picture and standing calmly ready.
Sunlight from the upper left. They float on the white background: no shadow, no ground under their feet.
A peasant man in a simple tunic and boots holding an axe; a peasant woman in a dress with an apron and headscarf holding a basket; a militiaman in a padded tunic with a simple round helmet and short sword; a soldier in chainmail with a nose-guard helmet, sword and round shield; a heavy swordsman in mail and plate with a great helm, long sword and kite shield; a spearman with a padded coat, wide-brimmed iron hat and long spear; a pikeman with a breastplate and a very long pike; an archer with a hood, leather jerkin, longbow and quiver; a crossbowman in mail with a brimmed helmet and crossbow.
Their tunics, tabards, shield faces and hood linings are bright magenta cloth (intense pink-purple); magenta is never on skin, hair, metal or wood.
All the same height and scale. Crisp outlines, natural colors. No writing, no numbers, no frame.
```

### 6b · Caballería, asedio y guerreros especiales

```text
A hand-painted illustration of eight separate medieval figures on a plain white background, in two rows of four, with wide white gaps.
Seen from slightly above, all turned toward the lower right corner of the picture and standing still. Sunlight from the upper left; no shadow and no ground beneath them.
A light skirmisher with a bundle of javelins and a small shield; a light scout rider on a fast brown horse; an armoured knight on a horse wearing a cloth caparison, lance raised; a knight in full plate on a heavily armoured black horse; a wheeled battering ram with a hide-covered roof and an iron-capped log; a tall archer with a very long yew bow and green hood; a bearded warrior with a helmet, shield and throwing axes; a mounted archer with a short curved bow on a small steppe horse.
Tabards, horse caparisons, shield faces and pennants are bright magenta cloth; magenta appears nowhere else.
Riders on horseback are about one and a half times as tall as a standing soldier. Crisp outlines. No writing, no numbers, no frame.
```

Otros personajes (se piden igual, de 4 a 6 por imagen): guerrero godo con hacha y escudo grande, elefante de
guerra, monje 🔧, barca de pesca 🔧, galera 🔧, catapulta 🔧.

### 6c · Animación de un personaje (plantilla)

Adjunta la imagen del personaje elegido y cambia la última frase:

```text
Using the attached character as the exact model (same face, body, clothes, colors, weapon and magenta cloth), draw a row of poses showing the movement described below.
The poses are side by side in a single horizontal row on a plain white background, evenly spaced and not touching.
Same viewing angle from slightly above, turned toward the lower right, the same size in every pose, the feet on the same level.
Sunlight from the upper left; no shadow, no ground, no motion blur, no speed lines. No writing, no numbers, no frame.
The movement: <movimiento>
```

| Estado | Movimiento |
| --- | --- |
| `walk` | eight poses of one complete walking step that loops smoothly |
| `attack` | six poses of a sword blow: raising the weapon, striking, following through and recovering (archers: drawing, aiming, releasing, lowering the bow) |
| `death` | six poses of falling: being hit, staggering, knees giving way, falling, lying on the ground, lying still |
| `idle` | four poses of standing and breathing calmly (optional) |

Solo para los aldeanos (adjunta el hombre o la mujer):

| Estado | Movimiento |
| --- | --- |
| `work-wood` | six poses of chopping a tree trunk with an axe (the tree is not drawn) |
| `work-gold` / `work-stone` | six poses of swinging a pickaxe down at rocks (the rocks are not drawn) |
| `work-food` | six poses of picking berries from a bush and putting them in a basket (the bush is not drawn) |
| `work-farm` | six poses of working the soil with a hoe |
| `work-build` | six poses of hammering with a mallet, crouching |
| `carry-wood` | eight poses of walking while carrying logs on the shoulder |
| `carry-food` | eight poses of walking while carrying a full basket of food |
| `carry-gold` / `carry-stone` | eight poses of walking with a heavy sack of ore over the shoulder |

---

## Pack 7 · Proyectiles, efectos y restos

```text
A hand-painted illustration of small separate objects on a plain white background, in rows with wide white gaps between them.
Top row, seen from the side and pointing to the right: an arrow, a crossbow bolt, a javelin, a throwing axe, a round catapult stone.
Middle row: a burning arrow, and four stages of a small flickering orange flame.
Bottom row: four stages of a small puff of grey dust, and four stages of rising dark smoke.
No shadow, no ground. No writing, no numbers, no frame.
```

```text
A hand-painted illustration of four separate heaps of rubble from destroyed medieval buildings on a plain white background, in two rows of two, with wide white gaps, from small to large.
Seen from high above at a corner, sunlight from the upper left, nothing around the rubble: broken stones, charred beams, scattered roof tiles and a little smoke.
No shadow on the white background. No writing, no numbers, no frame.
```

```text
A hand-painted illustration of six separate small objects on a plain white background, two rows of three, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow and no ground.
A flag on a wooden pole made of bright magenta cloth, a small closed treasure chest, the same chest open and full of gold coins, a broken wooden cart, an old helmet lying among a few bones, and the ashes of a burnt-out campfire.
No writing, no numbers, no frame.
```

---

## Pack 8 · Decoración del terreno

Detalles pequeños que el juego reparte por el mapa (sustituyen a la decoración actual dibujada por código).

```text
A hand-painted illustration of twelve small separate plants and stones on a plain white background, in three rows of four, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left; they float on the white background with no shadow and no ground under them.
Three different tufts of grass, a clump of yellow wildflowers, a clump of white daisies, a clump of purple heather, two small grey stones, a mossy rock, red-capped mushrooms, a fern and a fallen branch.
Crisp outlines, natural colors. No writing, no numbers, no frame.
```

```text
A hand-painted illustration of twelve small separate natural details on a plain white background, in three rows of four, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow and no ground.
Two clumps of reeds of different sizes, bulrushes, water lilies, a rock half sunk in a little water, a piece of driftwood, a snowy rock, a frosted bush, a small cluster of ice crystals, a dry thorny shrub, an animal skull and a few sandstone rocks.
No writing, no numbers, no frame.
```

```text
A hand-painted illustration of eight separate village objects on a plain white background, in two rows of four, with wide white gaps.
Seen from high above at an angle, sunlight from the upper left, no shadow and no ground.
A haystack, a stone well, a stack of barrels, a pile of wooden crates, a straight section of wooden fence, a wooden signpost without writing, a wheelbarrow and a wooden bench, all at the same scale.
No writing, no numbers, no frame.
```

---

## Pack 9 · Interfaz

Los iconos llevan su propio fondo pintado (no se recortan). El juego usa ahora emojis: cambiarlos por estos
iconos requiere un pequeño cambio en la interfaz 🔧.

```text
Twelve small square paintings arranged in three rows of four on a plain white background, with white gaps between them.
Each painting is a single object on a dark, warm background inside a bevelled grey stone border, with a strong simple silhouette that is easy to recognise even when very small. Light from the upper left, warm medieval colors.
The objects: a loaf of bread with a ham, a pile of logs, a heap of gold coins, a few cut stone blocks, two peasants side by side, a sleeping peasant, a small cottage, a crossed sword and shield, a raised open hand, a red cross, a hammer, a flag on a pole.
No writing, no letters, no numbers.
```

```text
Twelve small square paintings arranged in three rows of four on a plain white background, with white gaps between them, each a single object on a dark warm background inside a bevelled grey stone border, easy to recognise when very small.
The objects: a spinning wheel, a wheelbarrow, a hand cart, a double-bladed axe, a bow saw, a horse collar, a heavy plough, a pickaxe with gold nuggets, a chisel on a stone block, a hammer on an anvil, molten iron being poured, a bundle of arrow feathers.
No writing, no letters, no numbers.
```

```text
Eight small square paintings arranged in two rows of four on a plain white background, with white gaps between them, in the same style: a single object on a dark warm background inside a bevelled grey stone border.
The objects: a sharp narrow arrowhead, a coat of scale armour, a horse wearing scale armour, a padded archer's jacket, a column of marching soldiers, a horse's head, a wooden shield with a tower on it, a stone castle.
No writing, no letters, no numbers.
```

```text
Four separate square surfaces on a plain white background with white gaps between them, seen straight on with even lighting:
a dark carved grey stone panel, a dark polished wooden panel, a sheet of aged parchment, and an ornate gold and stone corner piece for a picture frame.
No writing, no letters, no numbers.
```
