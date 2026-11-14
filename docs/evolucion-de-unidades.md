# Evolución de unidades, edificios y tecnologías por era (análisis de obsolescencia)

Documento de diseño para compartir con colegas. Leyenda: ✔ implementado · ⏳ pendiente (propuesto, no hecho) · 🔶 especulativo o por decidir. Fecha: noviembre de 2026. Fuentes: `docs/catalogo.md` (`npm run catalog`), `src/mods/core/*.ts`, `src/mods/extra-content/`, `docs/civilizaciones.md` (§2b, §5, §13, §14) y `docs/decisiones.md`.

## 0. En qué punto está el juego

| Fase (§10 de `civilizaciones.md`) | Estado |
| --- | --- |
| 1 Cimientos (`CivDef.eras`, Rusia 0–3) | ✔ |
| 2 Era 4 Pólvora + China, Francia, Gran Bretaña | ✔ |
| 3 Poderes activos y doctrinas excluyentes | ✔ |
| 4 Era 5 Industrial (hierro, carbón, fábrica, ferrocarril, aeródromo con biplano) + Persia y Etiopía 0–5 | ✔ |
| 5 Comercio, diplomacia y espionaje | ✔ (2026-10-23) |
| **6 Era 6 Contemporánea** (petróleo, energía, blindados, aviación completa, radar, giro de Rusia, traspaso a EE. UU.) | ⏳ **siguiente**: plan en [`docs/fase-6.md`](fase-6.md) |
| 7 Armas nucleares (prototipo) | ⏳ después de la 6 |
| 8 Era 7 Futuro próximo | 🔶 solo si la 6 es estable |
| 9 IA por civilización, victorias alternativas, pulido | ⏳ |

Además, hechos fuera de la numeración: asedio y artillería por era (§13), defensas lineales con puertas y paso de ronda (§14), fauna y ganado, arte con imágenes para casi todas las unidades y edificios hasta la Industrial. **Aplazado:** el mar (sin agua navegable, barcos ni astilleros). El juego tiene hoy **6 edades (0–5)**, 82 unidades, 69 edificios, 95 tecnologías y 6 civilizaciones, todas con capa en las eras 0–5.

## 1. Cómo evoluciona hoy una unidad (lo que ya da el motor)

- **Mejora en el sitio (`upgrade`)**: una tecnología con el efecto `{ type: 'upgrade', from, to }` hace dos cosas (`Player.addEffects` → `game.convertUnits`): **convierte gratis** todas las unidades `from` vivas en `to` y, a partir de ahí, el edificio **entrena siempre la versión más moderna** (`rules.resolveUnit`: el botón «Catapulta» pasa a llamarse «Trabuquete»). Es exactamente el modelo de AoE II y es el que usa el asedio (§13) y las seis líneas básicas.
- **Unidad nueva aparte**: lo que no es `upgrade` convive con lo anterior (mosquetero junto a mandoble, dragón junto a paladín). No hay ninguna mecánica de «retirar» una unidad: todo lo desbloqueado sigue en el botón de su edificio hasta el final de la partida.
- **Unidades únicas por era** (`civs` + `age`): se entrenan en el castillo (casi todas) y **no forman cadena**: el Druzhinnik sigue disponible en la Industrial al lado del Fusilero de la guardia. Es a propósito del diseño (§5: «las unidades de eras anteriores siguen siendo útiles por coste»), pero en la práctica el castillo acumula 6 botones de unidades de eras pasadas.
- **La IA** (`AISystem`, paso 7) entrena en cada edificio militar «la unidad de edad más alta que pueda pagar» el 60 % de las veces y una al azar el 40 %. Consecuencia directa: en la Industrial, el cuartel de la IA sigue sacando **espadachines de mandoble (era 2)**, la galería de tiro **ballesteros (era 2)** y el establo **dragones (era 4)**, porque son lo más moderno que esos edificios tienen. Esto es el hueco más grave del documento (§3).
- **Edificios**: no existe `upgrade` para edificios. La empalizada no se convierte en muralla, ni la torre de vigilancia en otra cosa (§14.7 lo tiene como pendiente).
- **Los modificadores de tecnologías** (`stat`, `cost`, `gatherRate`) se aplican por clase (`infantry`, `cavalry`, `archer`, `firearm`, `artillery`, `tower`, `wall`...), así que una unidad nueva hereda las mejoras de su clase sin más.

**Regla que propongo para todo el documento (qué pasa con las unidades viejas):**

| Caso | Qué pasa con las ya entrenadas | Por qué |
| --- | --- | --- |
| Mismo papel, mismo edificio (milicia → hombre de armas, catapulta → trabuquete) | **Se mejoran gratis** al investigar (`upgrade`, como hoy) | Es lo que el jugador espera; el coste ya está en la tecnología |
| Cambio de arma o de papel (mandoble → mosquetero, ariete → carro) | **No se convierten**: las viejas quedan *obsoletas pero útiles* y el edificio pasa a entrenar la nueva (o la nueva vive en otro edificio) | Convertir cuerpo a cuerpo en fusil de golpe cambia el combate en curso y rompe la coherencia del arte |
| Unidades únicas de civilización | No se convierten; la de la era nueva se añade. 🔶 Opcional: ocultar del castillo las únicas de dos eras atrás (`CivDef.hides`, §13.6) | Mantiene la identidad por era sin saturar el castillo |
| 🔶 Reconversión pagada (`upgrade` con `convertCost` por unidad) | Solo si en pruebas se echa de menos; no existe en el motor | Evita que un ejército viejo quede sin valor en la era 6 |

## 2. Familias, línea por línea

Para cada familia: lo que hay, el hueco, la línea propuesta por era, cómo se desbloquea, qué pasa con lo viejo, riesgo y prioridad. Nombres y números son indicativos (se afinan con `npm run simulate` y `tests/`).

### 2.1 Infantería de espada (cuartel)

| Era | Hoy | Propuesta |
| --- | --- | --- |
| 0 | ✔ Milicia (60 ali, 20 oro) | — |
| 1 | ✔ Hombre de armas (`up_manAtArms`) | — |
| 2 | ✔ Espadachín de mandoble (`up_longSwordsman`) | — |
| 3 | **Nada** | ⏳ **Campeón** (`up_champion`, cuartel, 300 ali 100 oro; +2 ataque, +1/+1 armadura) |
| 4 | Nada (el mosquetero es otra unidad, de la fábrica de pólvora) | ⏳ **Infantería de línea**: el cuartel gana la mejora `up_lineInfantry` (requiere Fábrica de pólvora y Bayoneta) que hace que el **cuartel entrene mosqueteros** (añadir `barracks` a `trainedAt` del mosquetero, sin convertir a los campeones: caso «cambio de arma») |
| 5 | Nada (el fusilero es de la fábrica) | ⏳ `up_rifleman` (fábrica, 250 hierro 150 oro): mosquetero → fusilero **en el sitio y gratis** (mismo papel: infantería de fuego); con ello el cuartel y la fábrica de pólvora entrenan fusileros |
| 6 | — | ⏳ `up_assaultInfantry`: fusilero → **Infantería de asalto** (fusil semiautomático y granadas: +ataque, cadencia ×0,8, bono contra `machinegun`); ver `fase-6.md` |

Hueco detectado: **la línea se acaba en la era 2**; desde la 3 el cuartel es un edificio inútil salvo para lanceros, y la IA lo sigue usando. Viejas: campeones quedan como cuerpo a cuerpo barato y resistente (sin pólvora), útiles contra caballería ligera y como carne de cañón. Riesgo de balance: medio (el mosquetero en el cuartel adelanta su disponibilidad en número; compensar con que el cuartel no reciba el −15 % de «Producción en cadena»). **Prioridad: alta.**

### 2.2 Lanceros y antiinfantería / anticaballería (cuartel)

| Era | Hoy | Propuesta |
| --- | --- | --- |
| 1 | ✔ Lancero (+15 vs `cavalry`) | — |
| 2 | ✔ Piquero (`up_pikeman`, +22) | — |
| 3 | Nada | ⏳ **Alabardero** (`up_halberdier`, +32 vs caballería, +1 armadura) |
| 4–5 | Nada; el papel anticaballería lo cubre a medias el piquero y la artillería | ⏳ **Sin sucesor de asta**: la **Bayoneta** (ya existe, era 4) debería dar a la infantería de fuego un bono +8 contra `cavalry`. Requiere un efecto nuevo `{ type: 'bonus', target, vs, amount }` (hoy los `Bonus` solo viven en la definición) |
| 6 | — | ⏳ El «lancero» de la era 6 es la **Infantería antitanque** (cuartel, bazuca: +40 contra `armored`, frágil, cara en hierro); ver `fase-6.md` §4 |

Viejas: los alabarderos quedan como anticaballería sin oro hasta la era 6 (útiles contra dragones y cosacos). Riesgo: bajo. Prioridad: **media** (alabardero) / **alta** (efecto `bonus`, porque lo necesitan también los blindados).

### 2.3 Arqueros, hostigadores y tiradores (galería de tiro, fábrica)

| Era | Hoy | Propuesta |
| --- | --- | --- |
| 1 | ✔ Arquero · ✔ Hostigador (+3 vs `archer`) | — |
| 2 | ✔ Ballestero (`up_crossbowman`) · Hostigador sin mejora | ⏳ **Hostigador de élite** (`up_eliteSkirmisher`, +1 ataque, +1 armadura pierce) |
| 3 | Nada | ⏳ **Arbalestero** (`up_arbalester`, +1 ataque, +1 alcance) |
| 4 | Nada en la galería; el mosquetero (fábrica de pólvora) ocupa el papel de tirador | ⏳ **Cazador** (`up_jaeger`: arbalestero → cazador, infantería ligera con fusil de caza, 30 madera 45 oro, alcance 7, poca armadura, +4 contra `firearm`): la galería de tiro sigue siendo el edificio de la **infantería ligera a distancia** frente a la línea (mosquetero) de la fábrica de pólvora. **Conversión gratis** (mismo edificio y papel: tirador a distancia) |
| 5 | ✔ Ametralladora (fábrica, aparte). Tirador británico único | ⏳ `up_marksman`: cazador → **Tirador escogido** (alcance 8, +ataque). El Tirador británico queda como único más potente (conviven) |
| 6 | — | ⏳ `up_sniper`: → **Francotirador** 🔶 (alcance 9, `stealth` opcional). Hostigador de élite: **la línea termina en la era 2** (su papel anti-arquero desaparece con los arcos) ✔ no necesita sucesor |

Hueco: la galería de tiro (y el arte de sus tres edades de imagen) deja de servir desde la era 3. Viejas: arqueros obsoletos pero baratos; los hostigadores de élite siguen sirviendo contra únicos con arco (Arquero de tiro largo, Ballestero de repetición, Arquero a caballo timúrida). Riesgo: medio (dos líneas de tirador en la era 4; hay que separarlas por coste —el cazador sin alimento— y papel). **Prioridad: alta** (arbalestero y cazador), media el resto.

### 2.4 Caballería (establo)

| Era | Hoy | Propuesta |
| --- | --- | --- |
| 1 | ✔ Caballería de exploración (explora y caza) | — |
| 2 | ✔ Caballería ligera (`up_lightCavalry`) · ✔ Caballero | — |
| 3 | ✔ Paladín (`up_cavalier`) · ligera sin mejora | ⏳ **Húsar** (`up_hussar`: ligera → húsar, +ataque, +1 visión; mantiene `hunting` y `autoExplore`) |
| 4 | ✔ Dragón (unidad aparte, `cavalry`+`firearm`) · paladín sin mejora | ⏳ **Coracero** (`up_cuirassier`: paladín → coracero, +2 armadura pierce; último de la línea pesada). El dragón es la línea nueva de **caballería de fuego** |
| 5 | ✔ Cosaco del Don (Rusia), Cosaco persa (únicos) | ⏳ `up_carabineer`: dragón → **Carabinero** (alcance 5, +ataque). El húsar y el coracero **terminan aquí** ✔ (la caballería de choque muere con la ametralladora: es coherente que la línea acabe) |
| 6 | — | ⏳ `up_motorizedScout`: húsar → **Explorador motorizado** (vehículo ligero sobre ruedas: velocidad 2,2, visión 10, cuesta petróleo; clases `vehicle`, `scout`). El carabinero → **Infantería mecanizada** no: esa es unidad propia del parque de vehículos (`fase-6.md`). El establo en la era 6 solo entrena el explorador; el coracero queda obsoleto pero útil (rápido y barato en petróleo: 0) |

Hueco: la ligera se queda en la era 2 y la pesada en la 3; en la Industrial el establo de la IA solo saca dragones. Viejas: conversión gratis en las tres mejoras (mismo papel). Riesgo: bajo. Prioridad: **media** (húsar, coracero), **alta** la del carabinero (el establo de la era 5 necesita algo) y la del explorador en la fase 6.

Nota de coherencia (decisión del 2026-10-23): Persia, China y Etiopía tienen Caballero/Paladín europeos; `CivDef.hides` (⏳) debe ocultarlos y dejar a esas civilizaciones sus jinetes únicos. Si se hace, sus únicos necesitan equivalentes de mejora (p. ej. Savaran → Qizilbash ya lo hace por eras).

### 2.5 Armas de fuego de infantería y máquinas (fábrica de pólvora, fábrica)

| Unidad | Hoy | Propuesta |
| --- | --- | --- |
| Mosquetero (4) | ✔ sin sucesor por `upgrade`; el fusilero (5) es otra unidad | ⏳ `up_rifleman` (ver 2.1): mosquetero → fusilero gratis; el mosquetero desaparece de los botones. Resuelve un «doble botón» igual que se hizo con cañón → cañón de campaña |
| Fusilero (5) | ✔ | ⏳ era 6: → Infantería de asalto (2.1) |
| Ametralladora (5, `machinegun`) | ✔ exige Producción en cadena | ⏳ era 6: `up_heavyMG`: → **Ametralladora pesada** (refrigerada por agua: +alcance, +armadura); 🔶 en la 6 también podría pasar a ser un arma sobre vehículo (ver mecanizada) |
| Únicos con arma de fuego (Strelets, Arcabuceros, Tofangchi, Casaca roja, Fusileros únicos de la 5...) | ✔ uno por era y civilización, sin cadena | Sin cadena (por diseño). ⏳ Los de la era 6 (Marine, Legionario, Patriota, Infantería mecanizada china...) en `fase-6.md` |

Tecnologías de arma de fuego: Balística, Pólvora refinada, Bayoneta (4) ✔; Estriado, Acero Bessemer, Intercambiabilidad (5) ✔. Hueco: nada en la 6 → ⏳ **Cartucho sin humo** (recarga ×0,85), **Blindaje de acero** (`armored` +2/+2), **Munición perforante** (bono contra `armored` para artillería y antitanque; necesita el efecto `bonus`). Prioridad: media.

### 2.6 Asedio y artillería (taller de asedio, fábrica de pólvora, fábrica)

Ya diseñado e implementado en §13 de `civilizaciones.md`: ariete → cubierto (3); catapulta → trabuquete (3) → bombarda (4) → obús (5); escorpión → pesado (3); cañón (4) → cañón de campaña (5). Lo que falta:

| Línea | Hueco | Propuesta (fase 6) |
| --- | --- | --- |
| Ariete cubierto | Termina en la 3; en la 4–5 sigue siendo el único rompe-muros cuerpo a cuerpo, muy vulnerable a bala | ✔ decidido en §13: **lo sustituyen los blindados** (línea propia, no `upgrade`: cambio de arma). El ariete queda obsoleto pero útil hasta la 6 |
| Escorpión pesado | Termina en la 3 ✔ a propósito (lo sustituye la ametralladora) | Nada |
| Obús | Termina en la 5 | ⏳ `up_spHowitzer`: → **Obús autopropulsado** (clases `artillery`, `armored`, `vehicle`; velocidad 0,9; cuesta petróleo) |
| Cañón de campaña | Termina en la 5 | ⏳ `up_atGun`: → **Cañón antitanque** 🔶 (o unidad aparte: el cañón de campaña sigue siendo útil contra tropas). Propuesta: **unidad aparte** en la fábrica, porque el papel cambia (antiblindado) |
| Nueva | — | ⏳ **Lanzacohetes múltiple** (fábrica de automóviles; `splash` radio 2,5, `scatter` 1,5, recarga 12 s; Katiusha rusa como único mejor) |

Viejas: mismo papel → gratis (obús → autopropulsado). Riesgo: medio-alto (balance del área grande). Prioridad: **alta** en la fase 6 (es la parte visible de la era).

### 2.7 Héroes y especiales

| Unidad | Hoy | ¿Evoluciona? |
| --- | --- | --- |
| General (modo Guerra declarada, era 2, `hero`, aura, `maxAlive: 1`) | ✔ | **No hace falta** una cadena: es un caso especial de modo. ⏳ Solo arte por era (sprite de jinete → oficial a caballo → oficial con vehículo) y 🔶 una tecnología «Estado mayor» (era 5, laboratorio) que amplíe el radio del aura. Juana de Arco como General francés (§5.3) sigue sin hacerse |
| Rey (Matar al rey, no entrenable) | ✔ | **No**. Solo arte por era (corona → presidente/jefe de Estado 🔶 en la 6: decisión política sensible, mejor dejar al rey como figura abstracta) |
| Espía (era 2, mercado, `stealth`) | ✔ | ⏳ Por era, sin cadena de `upgrade`: la **tecnología** mejora al mismo espía (§8b: mensajeros 0–1, agentes 2–3, servicios 4–5, agencia 6). Propuesta: tres tecnologías en el mercado/centro de comunicaciones que suban éxito y bajen enfriamiento; en la 6 el **radar/centro de comunicaciones** detecta espías (contraespionaje como edificio, pendiente de la fase 5) |
| Caravana (era 1, `trader`) | ✔ (el catálogo la marca ⚠ porque no ataca; es correcto) | ⏳ Mismo modelo que el aldeano: **sin unidad nueva**, tecnologías que la aceleran (Casas de cambio ✔ era 4; ⏳ **Ferrocarril comercial** era 5: velocidad ×1,3; **Camión** era 6: ×1,5 y carga). 🔶 Arte por era (camello → carro → vagón → camión) con `spriteParams` por edad del dueño |
| Elefante de guerra (Persia y Etiopía, era 2) y Elefante timúrida | ✔ | **No**: línea especial que termina en la 2–3 ✔ (históricamente desaparece con la pólvora). Pendiente de §13.6: moverlo a la Oscura |
| Ganado (oveja) y fauna | ✔ | No |

### 2.8 Aldeanos y economía

El aldeano no cambia de unidad en ninguna era (como en AoE): evoluciona por **tecnologías** y por **arte** (hoja por edad, ya prevista en `art-src/PENDIENTES.md`). El hueco está en que casi todas las cadenas económicas se acaban en la era 2:

| Cadena | Hoy | Hueco | Propuesta |
| --- | --- | --- | --- |
| Aldeano (vida, carga, velocidad) | Telar (0), Carretilla (1), Carro de mano (2); Ferrocarril (5: +5 carga, ×1,15 velocidad) ✔ | Eras 3, 4 y 6 vacías | ⏳ **Caminos reales** (3, centro urbano: velocidad ×1,1), **Correos y postas** (4: +3 carga) 🔶, **Camión** (6, refinería: +8 carga, ×1,15 velocidad; cuesta petróleo) |
| Madera | Hacha de doble filo (1), Sierra de arco (2) ✔ | Eras 3–6 | ⏳ **Sierra de dos manos** (3), **Aserradero de vapor** (5, laboratorio: ×1,2; requiere Máquina de vapor), **Motosierra** (6, ×1,25) |
| Granjas | Collera (1), Arado pesado (2) ✔ · granja de 175 de comida | Eras 3–6; y la granja se agota y hay que reconstruirla a mano | ⏳ **Rotación de cultivos** (3: +75 de comida por granja), **Segadora mecánica** (5: ×1,15), **Tractor y fertilizantes** (6: granja ×2 de cantidad; cuesta petróleo). 🔶 **Resiembra automática** (era 4, molino: la granja se replanta sola cobrando su coste; necesita un gancho en `gather` o en el molino: motor, pequeño) |
| Minería | Minería de oro y Cantería (1), Mina profunda (4) ✔, Máquina de vapor (5: hierro y carbón) ✔ | Era 6 | ⏳ **Excavadora** (6: todo lo minero ×1,15). El **petróleo** (6) tiene su propia cadena: pozo → refinería → **Craqueo** (×1,2) |
| Caza y ganado | Corral y Cría selectiva (2) ✔ | Eras 3+ | ✔ No hace falta: la comida pasa a granjas; 🔶 «Ganadería industrial» (5: ovejas ×1,5 de comida) solo si se nota |
| Depósitos (molino, maderero, minero, estación) | ✔ uno por recurso, con arte por edad | Ninguno | ✔ **No evolucionan como edificio**: la estación de ferrocarril (5) ya es el depósito universal. En la 6 el **centro logístico** 🔶 sería redundante: no se propone |
| Comercio | Mercado (1), Caravasar (2), Casas de cambio (4), Compañía comercial (4), Banco (GB) ✔ | Eras 5–6 | ⏳ **Bolsa de valores** 🔶 (6: `tradeYield` ×1,2) y la venta/compra de recursos en el mercado (hoy no existe: sería una orden de red `exchange`, motor pequeño; útil para el petróleo) |

Prioridad: **media**. Riesgo: bajo (son `gatherRate` y `stat`). Lo único que toca el motor: resiembra automática y compraventa en el mercado.

### 2.9 Barcos

Aplazado por decisión (2026-10-21): no hay agua navegable. **No hay nada que evolucionar** y no conviene diseñar la línea naval (galera → galeón → fragata → acorazado → portaaviones) hasta que exista el paquete «mar». Solo se anota aquí el hueco: Gran Bretaña, Rusia y China tienen bonos de barcos en texto que no hacen nada.

### 2.10 Edificios

| Edificio | Hoy | ¿Evoluciona? | Propuesta |
| --- | --- | --- | --- |
| Casa (+5 pob., arte por edad ✔) | ✔ | **No como edificio**. Tecnología sí | ⏳ **Urbanismo** (5, centro urbano: casas +3 de población) y **Bloque de viviendas** 🔶 (6: casa nueva de +10, 3×3) |
| Centro urbano (y Kremlin, Bastida, Ciudad Prohibida) | ✔ arte por edad; Fortificación abaluartada (4) le da PV | No | ⏳ Era 6: **Búnker de mando** 🔶 (tecnología: +armadura, refugio de 10 aldeanos). Que el centro urbano dispare balas desde la 4 (`projectile` por edad: motor pequeño, 🔶) |
| Molino, maderero, minero | ✔ | No | — |
| Cuartel, galería, establo | ✔ arte por edad hasta la 5 | **No como edificio**, pero vacíos de contenido desde la 2–3: ver 2.1–2.4 | Las mejoras propuestas los mantienen vivos hasta la 6 |
| Herrería | ✔ Forja (1), Fundición (2), Metalurgia avanzada (4); armaduras solo de la era 1; Emplumado (1), Flecha punzante (2) | Huecos en las eras 2–3 (armadura) y 3 (ataque, arco) | ⏳ **Alto horno** (3: +1 ataque infantería/caballería), **Cota de malla** (2) y **Armadura de placas** (3) para infantería y caballería, **Brazal** (3: arqueros +1/+1 alcance-ataque). Desde la 4 la herrería pasa el testigo a la fábrica de pólvora y la fábrica ✔ |
| Taller de asedio | ✔ entrena la última de cada línea | No | En la 6 no entrena nada nuevo: los blindados van a la **fábrica de automóviles** (`fase-6.md`) |
| Torre de vigilancia (1) | ✔ **Única torre**; Ostrog/Gorodishche únicos; torre de muralla (2) | **Sí: hueco claro** | ⏳ Cadena por `upgrade` de edificio (no existe; ver motor): **Torre de guardia** (2: +PV, +1 ataque) → **Torreón** (3: 2 flechas) → **Bastión** (4: balas, +alcance) → **Torre de hormigón** (6: ametralladora) y, aparte, la **Torre antiaérea** (6). Hasta que exista `upgrade` de edificios, se pueden hacer como edificios nuevos que **reemplazan en el sitio** con `replaces` (como el puente sobre la zanja): `replaces: ['watchTower']` ✔ ya funciona |
| Castillo (2) → Fortaleza (4, edificio aparte, requiere castillo) | ✔ | Ya evoluciona por edificio nuevo | ⏳ Era 6: **Base militar** 🔶 (refugio + entrena únicos de la 6 en vez del castillo; o seguir con el castillo y la fortaleza, que es lo simple). Recomiendo **seguir con el castillo** y dejar la base militar para la aviación (base aérea) |
| Murallas: empalizada (0) → piedra (2) → fortificada (3); puertas; zanja/puente | ✔ | Sí, por tramos | ⏳ **Mejora en el sitio con `replaces`** (muralla de piedra sobre tramo de empalizada propio: ya lo hace el puente) y la orden de red `placeLine` sobre tramos existentes. §14.7 lo pide. Eras 4–5: **Glacis** (tecnología: muros +3 armadura pierce contra artillería), **Trinchera** (zanja mejorada que protege a la infantería dentro 🔶 motor), era 6: **Alambrada** (barrera barata con `footDamage`) y **Búnker** (refugio pequeño de 1 casilla, inmune a bombas) |
| Fábrica de pólvora (4), Fábrica (5), Laboratorio (5), Aeródromo (5), Estación (5), Imprenta, Observatorio, Compañía | ✔ | No | Era 6 añade los suyos (refinería, central eléctrica, fábrica de automóviles, base aérea, radar, laboratorio avanzado): `fase-6.md` |
| Únicos por civilización (uno por era) | ✔ todos; la IA no construye 19 de ellos (catálogo) | No | ⏳ Fase 9: `gunpowderAI.WANTS` ya cubre algunos; añadir el resto es un dato por edificio |
| Maravillas (Transiberiano, Transcontinental) | ✔ `maxAlive: 1` | No | — |

### 2.11 Defensas (tecnologías)

Arquitectura de defensa (1), Cuadrillas (1), Contrafuertes (2), Aceite hirviendo (2) ✔; Fortificación abaluartada (4) ✔ pero solo para torres, castillos y centro urbano, **no para `wall`**. Doctrina de Vauban (Francia, 4) ✔. Hueco: eras 3, 5 y 6. Propuesta ⏳: **Matacanes** (3: `footDamage` +4), **Glacis** (4: `wall` +3 pierce), **Hormigón** (5: `wall` y `tower` +25 % PV), **Defensa antiaérea** (6: torres y castillos pueden disparar a `air`, ver `fase-6.md`). Prioridad: media; riesgo: bajo.

### 2.12 Poderes y doctrinas

Los poderes (`PowerDef`) tienen `minAge`/`maxAge` ✔ y no evolucionan: cada era trae el suyo. Doctrinas (`excludes`) solo las tiene Francia en la 4; §5 pide una para Rusia en la 6 (URSS / Rusia) → `fase-6.md`.

## 3. Huecos detectados (resumen)

1. **Cuartel, galería de tiro y establo se quedan sin contenido nuevo desde la era 2–3**; la IA sigue entrenando allí unidades de la era 2 en la Industrial (verificado en `AISystem` paso 7). Es el hueco con más efecto en las partidas largas.
2. **Doble unidad para un mismo papel**: mosquetero (4) y fusilero (5) conviven como botones distintos (ya se resolvió el mismo problema con cañón → cañón de campaña).
3. **Herrería incompleta**: armaduras solo en la era 1; nada en la 3.
4. **Una sola torre** en todo el juego (la de vigilancia, era 1) y sin mejora de muralla en el sitio.
5. **Economía parada en la era 2** (aldeano, madera, granjas) hasta las dos técnicas de la 5.
6. **El castillo acumula** todas las unidades únicas de todas las eras (hasta 7 botones en la 5).
7. **Unidades comunes incoherentes** (caballero europeo en Persia/China/Etiopía): falta `CivDef.hides`.
8. **Líneas que terminan sin sucesor y conviene que terminen** ✔: escorpión pesado, hostigador de élite, elefantes, coracero/húsar (la caballería de choque muere con la ametralladora), ariete (lo sustituye el blindado). Está bien que acaben: la obsolescencia es parte del diseño («las unidades viejas siguen siendo útiles por coste»).
9. **Aviación de la 5 sin continuación** (biplano suelto): `fase-6.md`.
10. Sin tocar: barcos (aplazado), rey y general (especiales).

## 4. Qué necesita el motor para esto (resumen, detalle en `fase-6.md` §8)

| Necesidad | Tamaño | Lo usan |
| --- | --- | --- |
| Efecto `bonus` en tecnologías (`{ type: 'bonus', target, vs, amount }`) | Pequeño (`Player.getStat` tiene que devolver bonos combinados; `combat.ts` los lee) | Bayoneta anticaballería, munición perforante, defensa antiaérea |
| `upgrade` de edificios, o bien `replaces` + que la mejora se investigue | Pequeño si se usa `replaces` (ya existe) | Torres, murallas |
| `CivDef.hides` (ocultar definiciones comunes a una civilización) | Pequeño (`rules.unitAvail`/`buildingAvail` + catálogo) | Coherencia de Persia, China, Etiopía; retirar únicos viejos |
| `trainedAt` que crece con una tecnología (o `upgrade` que añade un edificio de entrenamiento) | Dato: basta con poner `barracks` en `trainedAt` del mosquetero y que la mejora `up_lineInfantry` sea un `requiresTechs` condicional | Infantería de línea en el cuartel (2.1) — ⚠ hoy `requiresTechs` se aplica a la unidad en todos los edificios, no por edificio: hace falta `trainedAt: [{ building, requiresTechs }]` o una unidad «mosquetero de cuartel» que `upgrade` resuelva |
| Resiembra automática de granjas; compraventa en el mercado | Pequeño | Economía 3–6 |

## 5. Tabla resumen final

Prioridad: A = antes de la fase 6 o dentro de 6a (poco riesgo, mucho efecto) · B = en la fase 6 · C = después (fase 9, pulido).

| Familia | Estado hoy | Termina en | Propuesta de línea (eras) | Desbloqueo | Viejas | Riesgo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Infantería de espada | ✔ 0–2 | 2 | Campeón (3) → línea en cuartel = mosquetero (4) → fusilero (5) → asalto (6) | `up_*` en cuartel/fábrica | Gratis dentro del papel; campeones quedan al pasar a fuego | Medio | **A** (3–5), B (6) |
| Lanceros | ✔ 1–2 | 2 | Alabardero (3); bayoneta anticaballería (4); infantería antitanque (6) | `up_halberdier`, efecto `bonus` | Gratis | Bajo | A (3), B (6) |
| Arqueros | ✔ 1–2 | 2 | Arbalestero (3) → Cazador (4) → Tirador escogido (5) → Francotirador (6) | `up_*` en galería | Gratis (mismo papel) | Medio | **A** (3–4), C (6) |
| Hostigador | ✔ 1 | 1 | Élite (2) y termina ✔ | `up_eliteSkirmisher` | Gratis | Bajo | A |
| Caballería ligera | ✔ 1–2 | 2 | Húsar (3) y termina; explorador motorizado (6) | `up_hussar`, `up_motorizedScout` | Gratis; húsares quedan | Bajo | A (3), B (6) |
| Caballería pesada | ✔ 2–3 | 3 | Coracero (4) y termina ✔ | `up_cuirassier` | Gratis | Bajo | A |
| Caballería de fuego | ✔ 4 | 4 | Carabinero (5) y termina ✔ | `up_carabineer` | Gratis | Bajo | A |
| Infantería de fuego | ✔ 4, 5 | 5 | mosquetero → fusilero (5) → asalto (6) | `up_rifleman`, `up_assaultInfantry` | Gratis | Bajo | **A** (5), B (6) |
| Ametralladora | ✔ 5 | 5 | Pesada (6) | `up_heavyMG` | Gratis | Bajo | B |
| Asedio pesado | ✔ 2–5 | 5 (obús) | Obús autopropulsado (6); ariete termina ✔ (blindados) | `up_spHowitzer` | Gratis; arietes quedan | Medio | B |
| Artillería de campaña | ✔ 4–5 | 5 | Cañón antitanque (6, aparte); lanzacohetes (6, nuevo) | Unidades nuevas | — | Medio-alto | B |
| Blindados | — | — | Carro ligero → medio → pesado (6); mecanizada; AT | `fase-6.md` | — | Alto | B |
| Aviación | ✔ biplano (5) | 5 | Caza, bombardero, reconocimiento; AA; radar (6) | `fase-6.md` | Biplano → caza gratis | Alto | B |
| Héroes (general, rey) | ✔ | — | No evolucionan (arte por era) | — | — | — | C |
| Espía, caravana | ✔ | — | Por tecnología, sin unidad nueva | Técnicas 5–6 | — | Bajo | C |
| Elefantes | ✔ 2 | 2 | Termina ✔ | — | — | — | — |
| Aldeano y economía | ✔ 0–2, 5 | 2 | Técnicas en 3, 4, 6 (caminos, rotación, aserradero, tractor, camión) | Centro urbano, molino, lab., refinería | — | Bajo | A/B |
| Herrería | ✔ 1–2, 4 | 2 | Alto horno, malla, placas, brazal (2–3) | Herrería | — | Bajo | A |
| Torres | ✔ 1 | 1 | Guardia (2) → torreón (3) → bastión (4) → hormigón y AA (6) | `replaces` o `upgrade` de edificio | En el sitio | Medio | A (2–4), B (6) |
| Murallas | ✔ 0, 2, 3 | 3 | Mejora en el sitio; glacis (4), hormigón (5), alambrada y búnker (6) | `replaces`, técnicas | En el sitio | Medio | B |
| Castillo | ✔ 2, fortaleza 4 | 4 | Se queda (no base militar) | — | — | — | — |
| Casa, centro urbano, depósitos | ✔ | — | Solo técnicas (urbanismo, búnker) | — | — | Bajo | C |
| Barcos | aplazado | — | Nada hasta el paquete «mar» | — | — | — | — |
| Únicos por civilización | ✔ 0–5 | 5 | Uno por era; sin cadena (por diseño); `hides` opcional | `fase-6.md` para la 6 | Quedan | Medio | B |

**Recomendación de orden:** las filas **A** son datos puros (un archivo `src/mods/core/lines.ts` con las mejoras `up_*` nuevas, más dos técnicas de herrería y tres económicas) y las puede hacer una sesión de *Contenido del juego* (Sonnet 5.5, medio) antes o en paralelo a la fase 6a, con un test que compruebe que cada edificio militar tiene algo de su edad en las eras 3–5 y que la IA (semilla fija, 20 min) entrena unidades de edad ≥ 3 en el cuartel. Lo que toca el motor (efecto `bonus`, `hides`, `trainedAt` condicional) va con la fase 6a.
