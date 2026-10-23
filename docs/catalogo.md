# Catálogo de contenido

> Generado por `npm run catalog` (`scripts/catalog.ts`); no lo edites a mano. Las anotaciones manuales van en `docs/catalogo-notas.json`
> y la explicación de los desarrollos en `docs/catalogo-desarrollos.md`. El mismo cálculo alimenta la pantalla **Catálogo** del juego
> (menú → 📚 Catálogo, o `?catalogo` en la URL).

## Cómo leerlo

- **Estado**: ✔ integrado (tiene lógica detrás) · ⚠ sin usar (le falta algo, ver «Qué le falta») · 🛠 en desarrollo / pendiente de una fase (anotado a mano) · 🎨 solo decorativo.
- **Qué hace** y **Implicaciones**: se calculan de los datos (qué entrena, qué requiere, qué desbloquea, a quién contrarresta...).
- **IA**: ✔ si la IA lo usa por sí sola; ✗ si nunca lo construye, entrena o lanza (aviso, no error: puede ser a propósito).
- **Arte**: «imagen» si tiene hoja de sprites declarada en `src/mods/art`; «procedural» si se dibuja por código.

## Resumen

| Tipo | Total | ✔ Integrado | ⚠ Sin usar | 🛠 En desarrollo | 🎨 Decorativo |
| --- | ---: | ---: | ---: | ---: | ---: |
| 🧍 Unidades | 82 | 81 | 1 | 0 | 0 |
| 🏛️ Edificios | 60 | 60 | 0 | 0 | 0 |
| 📜 Tecnologías | 91 | 90 | 1 | 0 | 0 |
| 🪙 Recursos | 6 | 6 | 0 | 0 | 0 |
| 🌲 Nodos del mapa | 12 | 12 | 0 | 0 | 0 |
| ⚡ Poderes | 10 | 10 | 0 | 0 | 0 |
| 🚩 Civilizaciones | 6 | 6 | 0 | 0 | 0 |
| 🏆 Victorias | 3 | 3 | 0 | 0 | 0 |
| 🗺️ Terrenos | 9 | 9 | 0 | 0 | 0 |
| ⚙️ Motor y mods | 44 | 44 | 0 | 0 | 0 |

## Desarrollos, implicaciones y aplicaciones

Cada desarrollo del motor, con **qué es**, sus **implicaciones** (qué toca, qué reglas hay que respetar) y sus **aplicaciones** (para qué sirve en la partida y en el diseño). Los que dicen «fase 5» los está construyendo otra sesión; este catálogo se actualizará cuando se fusionen.

| Desarrollo | Qué es | Implicaciones | Aplicaciones |
| --- | --- | --- | --- |
| Simulación a paso fijo | `Game.update()` ejecuta a 20 ticks/s una lista de sistemas por prioridad, sin DOM. | Todo lo que corre cada tick debe ser determinista: `hypot`/`sin`/`cos` de `fmath.ts`, `game.rng()`, nunca reloj ni `Math.random`. | Partidas reproducibles, multijugador por turnos sincronizados, pruebas sin gráficos (`npm run simulate`). |
| Contenido como datos (Registry y mods) | Recursos, terrenos, unidades, edificios, tecnologías, civilizaciones, poderes y victorias se registran desde mods. | El motor no usa ids fijos; el contenido nuevo es un dato, no un `if`. Una definición mal enlazada queda «huérfana» (este catálogo la detecta). | Añadir civilizaciones, modos y mapas sin tocar el motor. |
| Edades y civilizaciones por era | `CivDef.eras`: la identidad y los bonos cambian con la edad (Rusia, China, Francia, Gran Bretaña, Persia, Etiopía; seis edades hasta la Industrial). | `Player.rebuildModifiers` recalcula bonos al subir de edad y al cargar; no se guardan. | Cada civilización cuenta su historia y cambia de estilo de juego durante la partida; la comparativa de abajo permite ver si se equilibran. |
| Estadísticas = base + modificadores | El valor final de vida, ataque, coste... sale de la definición más bonos de civilización, edad y tecnologías (`Effect`). | Las tecnologías cuyo efecto no encuentra objetivo no hacen nada: la auditoría las marca. | Mejoras de herrería, doctrinas, bonos económicos. |
| Doctrinas excluyentes | `TechDef.excludes`: elegir una tecnología cierra otras. | La IA decide con `aiWeight`. | Decisiones estratégicas irreversibles que diferencian partidas. |
| Poderes activos | `PowerDef`: habilidad de civilización con coste, enfriamiento y efecto (Tributo a la Horda, Tierra quemada...). | Viajan por la cola de turnos; estado en `player.data`/`game.data` para guardarse y entrar en la huella de red. | Momentos tácticos propios de cada civilización. |
| Pathfinding A* y regiones | Caminos en rejilla de 8 direcciones con suavizado y mapa de regiones conectadas. | Saber al instante si algo es alcanzable evita unidades atascadas. | Movimiento fiable de ejércitos grandes; mapas reales con montañas y ríos. |
| Relieve y ventaja de altura | Alturas, roca, pasos y conectividad (`relief.ts`, `heightRules.ts`). | Los mapas deben ser conexos (un test lo comprueba); la altura da ventaja al que dispara desde arriba. | Posiciones defensivas, pasos de montaña estratégicos. |
| Visión y niebla | `vision.ts` con línea de visión de cada entidad. | Las unidades dentro de un refugio no se ven. | Exploración, emboscadas, torres y observatorios útiles. |
| Combate y reglas de combate | Ataque cuerpo a cuerpo/distancia, bonificaciones por clase y `addCombatRule`. | Los modos pueden restringir quién ataca a quién. | Contadores (lanceros contra caballería...), Guerra declarada. |
| Refugio (guarnición) | `BuildingDef.shelter`: unidades propias de ciertas clases entran y no se las ve ni ataca. | Si el edificio cae, salen. | Proteger al rey en Matar al rey; defensa de aldeanos. |
| Fauna | Animales salvajes y ganado (`WildlifeDef`) que dejan cadáveres recolectables. | Algunos contraatacan: la IA no los caza. | Comida temprana, caza, ganado en corrales. |
| Formaciones, posturas y órdenes tácticas | `src/game/army/`: formas en marcha, posturas y pantalla de estrategia. | Se ordenan por `Commands`, nunca desde la interfaz directamente. | Control fino de ejércitos en escritorio y móvil. |
| Modos de juego (mods) | Guerra declarada, Matar al rey y Búsqueda del tesoro cambian reglas y victoria. | Solo se activan si se eligen; los tests los piden explícitamente. | Variedad de partidas con el mismo motor. |
| IA y extensiones de IA | `AISystem` más `AIPlugin` (edificios, unidades, reserva de recursos, ejército). | Lo que la IA no construye no puede usarlo contra el jugador (el catálogo lo marca con ✗ en «IA»). | Rivales que usan el contenido de su civilización; cada plugin declara `uses`. |
| Mapas procedurales y reales | Generadores (Arabia, etc.) y 12 regiones reales (relieve y OpenStreetMap). | Los nodos de recurso deben colocarlos un generador o un mod. | Rejugabilidad y escenarios históricos. |
| Render doble (WebGL2 + Canvas 2D) y arte con imágenes | Terreno en WebGL2, entidades en 2D isométrico; sprites procedurales sustituibles por hojas de imágenes. | El arte se declara en `src/mods/art`; sin hoja se dibuja por código. | Mejorar el aspecto pieza a pieza sin romper nada; ver `art-src/PENDIENTES.md`. |
| Interfaz de escritorio y móvil | `HUD` y `MobileHUD` comparten `commandModel.ts`. | Cada comando nuevo debe salir en ambas. | Jugar con ratón o con táctil a 30 FPS en gama media. |
| Sonido y música | Efectos sintéticos y música generativa que escuchan eventos del juego. | Nada reproduce sonido directamente: se emiten eventos. | Retroalimentación sin archivos con copyright. |
| Guardado | Formato versionado (`SAVE_VERSION`); todo el estado son datos simples. | Un sistema con estado implementa `save()`/`load()`. | Continuar, ranuras manuales y autoguardado. |
| Multijugador en red | Turnos sincronizados (lockstep) con trozos numerados y transportes P2P. | Falta probar WebRTC en dispositivos reales; exige determinismo. | Partidas con amigos sin servidor propio. |
| Comercio, diplomacia y espionaje (fase 5) | Rutas de caravanas, relaciones entre civilizaciones y espías. En desarrollo en otra sesión. | Hoy el contenido «comercial» (Compañía comercial, Caravasar, Monopolio de la seda...) solo da oro o depósito. | Con quién se comercia, en qué condiciones y qué se gana: ver la sección «Comercio, diplomacia y espionaje». |
| Catálogo (este documento) | Auditoría automática del Registry (`src/catalog/audit.ts`) con pantalla en el juego. | `docs/catalogo.md` se regenera con `npm run catalog`; un test falla si está desactualizado. | Controlar qué contenido tiene lógica detrás, detectar huérfanos y comparar civilizaciones. |

## Huérfanos y pendientes

Todo lo que no está plenamente integrado, con lo que le falta.

| Tipo | Elemento | Estado | Qué le falta / nota |
| --- | --- | --- | --- |
| Unidades | 🐪 Caravana (`caravan`) | ⚠ Sin usar | No ataca, no recolecta, no construye y no tiene habilidad: solo ocupa población. |
| Tecnologías | 🔍 Contraespionaje (`counterespionage`) | ⚠ Sin usar | No tiene efectos. |

## Contenido que la IA nunca usa

Un rival controlado por la IA no lo construye, entrena, investiga ni lanza: solo lo aprovecha un jugador humano. Conviene revisarlo al equilibrar civilizaciones.

- **Edificios** (16): Gorodishche [Rusia], Monasterio-fortaleza [Rusia], Ostrog [Rusia], Granero estatal [China], Casa de moneda [China], Gran Canal [China], Villa real [Francia], Catedral gótica [Francia], Château [Francia], Burh [Británicos], Castillo de mota [Británicos], Castillo concéntrico [Británicos], Qanat [Persia], Caravasar [Persia], Estela [Etiopía], Iglesia rupestre [Etiopía]
- **Tecnologías** (1): Billete jiaozi [China]

## Comercio, diplomacia y espionaje

Qué dice hoy el contenido sobre comerciar (y temas afines) y qué infraestructura de juego hay detrás.

**Infraestructura de motor encontrada** (órdenes, sistemas, órdenes de red, IA): Orden «trade», Orden «spy», Sistema «diplomacy», Sistema «espionage», Orden de red «trade», Orden de red «spy», IA: trade, IA: diplomacy, Panel «diplomacy»

| Elemento | Qué dice | Estado |
| --- | --- | --- |
| 🏦 Compañía comercial (building) | Factoría de la compañía: depósito de oro y piedra, y comercio con el exterior. | ✔ Integrado |
| 🕌 Maidan (building) | Edificio único persa (Imperial): la plaza real de Isfahán. Depósito de oro, aloja población; investiga el Monopolio de la seda. | ✔ Integrado |
| 🏪 Mercado (building) | Puesto comercial: sus caravanas viajan a otros puestos y cobran oro según la distancia (más con un rival en paz o aliado). Aquí se entrenan caravanas y espías. | ✔ Integrado |
| 🐪 Caravana (unit) | Va y viene entre dos puestos comerciales cobrando oro por la distancia. Elige un puesto propio lejano o de alguien que no esté en guerra contigo. Indefensa: escóltala. | ⚠ Sin usar |
| 🕵️ Espía (unit) | Invisible salvo junto a torres, castillos, centros urbanos o espías enemigos. Informa, roba tecnología, sabotea y soborna. Si falla, cae. Descansa un rato tras cada misión. | ✔ Integrado |
| 🚢 Cantón (tech) | Tecnología única china (Pólvora): el comercio exterior pasa por un solo puerto. El oro se recoge un 25% más rápido. | ✔ Integrado |
| ⚖️ Colbertismo (tech) | Tecnología única francesa (Pólvora): manufacturas, aranceles y comercio. El oro se recoge un 15% más rápido. | ✔ Integrado |
| 🧵 Monopolio de la seda (tech) | Tecnología única persa (Imperial): Shah Abbas compra toda la seda del reino. El oro se recoge un 10% más rápido. | ✔ Integrado |
| 🛖 Caravasar (tech) | Posadas de ruta: las caravanas cobran un 20% más. | ✔ Integrado |
| 🔍 Contraespionaje (tech) | Patrullas e informantes: la vigilancia descubre a los espías al doble de distancia. | ⚠ Sin usar |
| 💱 Casas de cambio (tech) | Letras de cambio: las caravanas cobran un 25% más. | ✔ Integrado |
| 🕊️ Tributo a la Horda (power) | Pagas el tributo al jan: durante 60 s nadie te ataca, pero tus tropas tampoco atacan a nadie. | ✔ Integrado |
| 🚩 Persia (civ) | Encrucijada de rutas: caballería rápida, comercio y ciencia. De los sasánidas a los qayar (después, hacia el Irán del petróleo). | ✔ Integrado |

## Comparativa entre civilizaciones

Para revisar las diferencias, el equilibrio estratégico y la jugabilidad. Los recuentos son **acumulados** hasta cada edad e incluyen el contenido común más el propio de la civilización. «Mejor unidad» = la unidad militar con más vida × daño por segundo disponible (un índice grueso, no un simulador de combate).

### Unidades entrenables

| Civilización | Edad Oscura | Edad Feudal | Edad de los Castillos | Edad Imperial | Edad de la Pólvora | Edad Industrial |
| --- | --- | --- | --- | --- | --- | --- |
| Británicos | 3 | 10 | 21 | 26 | 31 | 38 |
| Francia | 3 | 10 | 21 | 26 | 32 | 39 |
| Rusia | 3 | 9 | 20 | 26 | 32 | 39 |
| China | 3 | 10 | 22 | 27 | 32 | 38 |
| Persia | 3 | 10 | 23 | 29 | 34 | 41 |
| Etiopía | 3 | 10 | 22 | 27 | 32 | 39 |

### Edificios

| Civilización | Edad Oscura | Edad Feudal | Edad de los Castillos | Edad Imperial | Edad de la Pólvora | Edad Industrial |
| --- | --- | --- | --- | --- | --- | --- |
| Británicos | 7 | 14 | 18 | 18 | 24 | 29 |
| Francia | 7 | 14 | 18 | 19 | 26 | 31 |
| Rusia | 7 | 14 | 18 | 19 | 25 | 30 |
| China | 7 | 14 | 18 | 19 | 25 | 30 |
| Persia | 7 | 14 | 18 | 19 | 25 | 30 |
| Etiopía | 7 | 14 | 18 | 19 | 25 | 30 |

### Tecnologías

| Civilización | Edad Oscura | Edad Feudal | Edad de los Castillos | Edad Imperial | Edad de la Pólvora | Edad Industrial |
| --- | --- | --- | --- | --- | --- | --- |
| Británicos | 3 | 16 | 30 | 36 | 49 | 60 |
| Francia | 3 | 16 | 31 | 37 | 52 | 63 |
| Rusia | 2 | 15 | 28 | 34 | 46 | 56 |
| China | 3 | 17 | 31 | 37 | 50 | 61 |
| Persia | 3 | 16 | 31 | 37 | 50 | 61 |
| Etiopía | 3 | 16 | 31 | 37 | 50 | 61 |

### Mejor unidad militar (índice)

| Civilización | Edad Oscura | Edad Feudal | Edad de los Castillos | Edad Imperial | Edad de la Pólvora | Edad Industrial |
| --- | --- | --- | --- | --- | --- | --- |
| Británicos | Fyrdman (120) | Caballero normando (379) | General (2489) | General (2489) | General (2489) | General (2489) |
| Francia | Guerrero franco (150) | Caballero cruzado (403) | General (2489) | General (2489) | General (2489) | General (2489) |
| Rusia | Druzhinnik (150) | Druzhinnik (150) | General (2489) | General (2489) | General (2489) | General (2489) |
| China | Fubing (113) | Lancero de fuego (173) | General (2489) | General (2489) | General (2489) | General (2489) |
| Persia | Savaran (379) | Savaran (379) | Elefante de guerra (3600) | Elefante de guerra (3600) | Elefante de guerra (3600) | Elefante de guerra (3600) |
| Etiopía | Guerrero axumita (125) | Guardia de Lalibela (228) | Elefante de guerra (3600) | Elefante de guerra (3600) | Elefante de guerra (3600) | Elefante de guerra (3600) |

### Composición del ejército (en la última edad)

| Civilización | Funciones |
| --- | --- |
| Británicos | infantería 12 · arqueros 4 · caballería 7 · asedio 10 · armas de fuego 8 · aire 1 |
| Francia | infantería 11 · arqueros 3 · caballería 8 · asedio 12 · armas de fuego 7 · aire 1 |
| Rusia | infantería 11 · arqueros 3 · caballería 9 · asedio 11 · armas de fuego 6 · aire 1 |
| China | infantería 11 · arqueros 4 · caballería 7 · asedio 11 · armas de fuego 6 · aire 1 |
| Persia | infantería 10 · arqueros 4 · caballería 13 · asedio 10 · armas de fuego 7 · aire 1 |
| Etiopía | infantería 12 · arqueros 3 · caballería 8 · asedio 11 · armas de fuego 6 · aire 1 |

### Identidad, contenido único y poderes

| Civilización | Bonos | Identidad por eras | Unidades únicas | Edificios únicos | Tecnologías únicas | Poderes |
| --- | --- | --- | --- | --- | --- | --- |
| Británicos | Arqueros +1 de alcance · Centros urbanos cuestan -50% de madera · Unidad única: Arquero de tiro largo · Compañías de comercio: caravanas +10% de ganancia | Anglosajones · Inglaterra normanda · Inglaterra Plantagenet · Inglaterra Tudor · Gran Bretaña · Reino Unido y Estados Unidos emergente | Arquero de tiro largo · Fyrdman · Caballero normando · Arcabucero Tudor · Casaca roja · Fusilero Enfield · Tirador | Burh · Castillo de mota · Castillo concéntrico · Banco · Ferrocarril transcontinental | Arqueros ingleses · Reforma de Alfredo · Domesday · Carta de compañía · Deuda nacional · Intercambiabilidad de piezas | Crédito |
| Francia | Caballería +20% de PV · Mejoras del molino gratis · Castillos -25% de coste · Unidad única: Lanzador de hachas | Francos · Francia capeta · Francia medieval tardía · Renacimiento francés · Antiguo Régimen · Revolución, Napoleón y la República | Guerrero franco · Caballero cruzado · Gendarme · Arcabucero de la ordenanza · Fusilero con bayoneta · Cañón Gribeauval · Guardia Vieja · Gran Batería | Villa real · Catedral gótica · Bastida · Château · Fortaleza de Vauban · Manufactura real · École Polytechnique | Hacha barbada · Capitulares · Carta urbana · Taille · Contratar mercenarios · Colbertismo · Doctrina de Vauban · Doctrina de Gribeauval · Sistema de cuerpos | Leva en masa · Legión Extranjera |
| Rusia | La caza da además oro (pieles) · Madera +10% de recolección · Unidad única: Druzhinnik (Edad Oscura) · Edificio único: Gorodishche | Eslavos orientales y Rus' de Kiev · Rus' de Kiev cristiana · Principado de Moscú · Zarato ruso · Imperio ruso · Imperio ruso industrializándose | Druzhinnik · Hijo de boyardo · Strelets · Cosaco · Granadero · Unicornio · Fusilero de la guardia · Cosaco del Don | Gorodishche · Monasterio-fortaleza · Kremlin de piedra · Ostrog · Academia de ingenieros · Transiberiano | Russkaya Pravda · Marcha a Siberia | Tributo a la Horda · Tierra quemada |
| China | Economía de granjas estatal: alimento +5% de recolección · Unidad única: Fubing (Edad Oscura) · Edificio único: Granero estatal · Gran Canal: caravanas +15% de ganancia | Sui-Tang · Song del Norte · Song del Sur y Yuan · Ming · Qing · Qing tardío y primera república | Fubing · Lancero de fuego · Ballestero de repetición · Trabuquete de contrapeso · Arcabucero de las divisiones divinas · Jinete de las Ocho Banderas · Fusilero de ejército regional | Granero estatal · Casa de moneda · Gran Canal · Ciudad Prohibida · Hong de Cantón · Arsenal de Jiangnan | Exámenes imperiales · Arroz de Champa · Billete jiaozi · Bomba trueno · Pato mandarín · Cantón · Autofortalecimiento | Flota del Tesoro |
| Persia | Ejército móvil: caballería +5% de velocidad · Unidad única: Savaran (Edad Oscura) · Edificio único: Qanat · Rutas de la Seda: caravanas +25% de ganancia | Persia sasánida · Irán islámico · Ilkanato y timúridas · Persia safávida · Afsháridas y zand · Persia qayar | Savaran · Ghulam · Arquero a caballo timúrida · Elefante timúrida · Qizilbash · Tofangchi · Zamburakchi · Sarbaz · Cosaco persa · Elefante de guerra | Qanat · Caravasar · Observatorio de Maragha · Maidan · Ordu · Dar ul-Funun | Regadío · Iqta · Astronomía · Monopolio de la seda · Guerra móvil · Nizam-i Jadid · Colmillos de hierro | Gran Saqueo · Bazar |
| Etiopía | Infantería +10% de PV · Unidad única: Guerrero axumita (Edad Oscura) · Edificio único: Estela · Ruta del incienso y el oro: caravanas +10% de ganancia | Reino de Axum · Dinastía Zagüe · Dinastía salomónica · Guerras de Adal y Gondar · Era de los príncipes · Tewodros II y Menelik II | Guerrero axumita · Guardia de Lalibela · Soldado real · Mosquetero etíope-portugués · Jinete oromo · Fusilero shewano · Artillería de montaña · Elefante de guerra | Estela · Iglesia rupestre · Katama · Castillo de Gondar · Palacio del ras · Ferrocarril de Yibuti | Moneda de Axum · Prestes Juan · Corte itinerante · Alianza portuguesa · Cría de caballos · Importación de armas · Colmillos de hierro | Resistencia · Nagarit |

## Avisos sobre las notas

- Notas que ya no hacen falta (lo anotado existe ya; bórralas de `docs/catalogo-notas.json`): building:tradingCompany, building:caravanserai, building:maidan, tech:silkMonopoly, tech:cantonSystem, tech:colbertism, power:hordeTribute

## 🧍 Unidades (82)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `villager` | 🧑‍🌾 Aldeano | core | Edad Oscura | todas | 50 alimento | ✔ Integrado | ✔ | imagen | Se entrena en Centro urbano, Kremlin de piedra, Bastida, Ciudad Prohibida y 1 más · Unidad inicial · Ataca (3) · Recolecta · Construye | — | — |
| `militia` | 🗡️ Milicia | core | Edad Oscura | todas | 60 alimento, 20 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (4) | Se puede mejorar a Hombre de armas. · Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `manAtArms` | ⚔️ Hombre de armas | core | Edad Feudal | todas | 60 alimento, 20 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Mejora de Milicia · Ataca (6) | Se consigue investigando la mejora de Milicia. · Se puede mejorar a Espadachín de mandoble. · Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `longSwordsman` | 🤺 Espadachín de mandoble | core | Edad de los Castillos | todas | 60 alimento, 20 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Mejora de Hombre de armas · Ataca (9) | Se consigue investigando la mejora de Hombre de armas. · Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `spearman` | 🔱 Lancero | core | Edad Feudal | todas | 35 alimento, 25 madera | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (3) | Se puede mejorar a Piquero. · Hace daño extra contra: cavalry (+15). · Lo contrarrestan: Arquero, Ballestero, Unicornio, Ametralladora y 2 más. | — |
| `pikeman` | 🔱 Piquero | core | Edad de los Castillos | todas | 35 alimento, 25 madera | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Mejora de Lancero · Ataca (4) | Se consigue investigando la mejora de Lancero. · Hace daño extra contra: cavalry (+22). · Lo contrarrestan: Arquero, Ballestero, Unicornio, Ametralladora y 2 más. | — |
| `archer` | 🏹 Arquero | core | Edad Feudal | todas | 25 madera, 45 oro | ✔ Integrado | ✔ | imagen | Se entrena en Galería de tiro con arco · Ataca (4, alcance 4) | Se puede mejorar a Ballestero. · Hace daño extra contra: spear (+3). · Lo contrarrestan: Hostigador, Jinete oromo. | — |
| `crossbowman` | 🎯 Ballestero | core | Edad de los Castillos | todas | 25 madera, 45 oro | ✔ Integrado | ✔ | imagen | Se entrena en Galería de tiro con arco · Mejora de Arquero · Ataca (5, alcance 5) | Se consigue investigando la mejora de Arquero. · Hace daño extra contra: spear (+3). · Lo contrarrestan: Hostigador, Jinete oromo. | — |
| `skirmisher` | 🪃 Hostigador | core | Edad Feudal | todas | 25 alimento, 35 madera | ✔ Integrado | ✔ | imagen | Se entrena en Galería de tiro con arco · Ataca (2, alcance 4) | Hace daño extra contra: archer (+3). · Lo contrarrestan: Hostigador, Jinete oromo. | — |
| `scoutCavalry` | 🐎 Caballería de exploración | core | Edad Feudal | todas | 80 alimento | ✔ Integrado | ✔ | imagen | Se entrena en Establo · Unidad inicial · Ataca (3) · Explora sola · Caza | Se puede mejorar a Caballería ligera. · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `lightCavalry` | 🐎 Caballería ligera | core | Edad de los Castillos | todas | 80 alimento | ✔ Integrado | ✔ | imagen | Se entrena en Establo · Mejora de Caballería de exploración · Ataca (7) · Explora sola | Se consigue investigando la mejora de Caballería de exploración. · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `knight` | 🏇 Caballero | core | Edad de los Castillos | todas | 60 alimento, 75 oro | ✔ Integrado | ✔ | imagen | Se entrena en Establo · Ataca (10) | Se puede mejorar a Paladín. · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `cavalier` | 🏇 Paladín | core | Edad Imperial | todas | 60 alimento, 75 oro | ✔ Integrado | ✔ | imagen | Se entrena en Establo · Mejora de Caballero · Ataca (12) | Se consigue investigando la mejora de Caballero. · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `batteringRam` | 🪵 Ariete | core | Edad de los Castillos | todas | 160 madera, 75 oro | ✔ Integrado | ✔ | imagen | Se entrena en Taller de asedio · Ataca (2) | Se puede mejorar a Ariete cubierto. · Hace daño extra contra: building (+125). · Lo contrarrestan: Escorpión, Escorpión pesado. | — |
| `longbowman` | 🏹 Arquero de tiro largo | core | Edad de los Castillos | Británicos | 35 madera, 40 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (6, alcance 5) | Lo contrarrestan: Hostigador, Jinete oromo. | — |
| `throwingAxeman` | 🪓 Guerrero franco | core | Edad Oscura | Francia | 55 alimento, 25 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (6, alcance 3) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `druzhinnik` | 🪓 Druzhinnik | core | Edad Oscura | Rusia | 55 alimento, 25 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `boyarSon` | 🏇 Hijo de boyardo | core | Edad de los Castillos | Rusia | 70 alimento, 70 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (11) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `strelets` | 🔫 Strelets | core | Edad Imperial | Rusia | 55 alimento, 60 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (14, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `cossack` | 🐎 Cosaco | core | Edad Imperial | Rusia | 60 alimento, 35 madera | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (8) · Caza | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `deer` | 🦌 Ciervo | core | Edad Oscura | todas | — | ✔ Integrado | — | imagen | Aparece en el mapa · Animal (flee) | — | — |
| `boar` | 🐗 Jabalí | core | Edad Oscura | todas | — | ✔ Integrado | — | imagen | Aparece en el mapa · Ataca (5) · Animal (fight) | — | — |
| `sheep` | 🐑 Oveja | core | Edad Feudal | todas | 40 alimento | ✔ Integrado | ✔ | imagen | Se entrena en Corral · Animal (passive) | Máximo 12 vivos a la vez. | — |
| `musketeer` | 🔫 Mosquetero | core | Edad de la Pólvora | todas | 50 alimento, 40 oro | ✔ Integrado | ✔ | imagen | Se entrena en Fábrica de pólvora · Ataca (16, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `cannon` | 💣 Cañón | core | Edad de la Pólvora | todas | 180 madera, 120 oro | ✔ Integrado | ✔ | imagen | Se entrena en Fábrica de pólvora · Ataca (32, alcance 9) | Se puede mejorar a Cañón de campaña. · Hace daño extra contra: building (+28). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `dragoon` | 🏇 Dragón | core | Edad de la Pólvora | todas | 70 alimento, 50 oro | ✔ Integrado | ✔ | imagen | Se entrena en Establo · Ataca (9, alcance 4) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `grenadier` | 💥 Granadero | core | Edad de la Pólvora | Rusia | 55 alimento, 50 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (18, alcance 5) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `unicorn` | 💣 Unicornio | core | Edad de la Pólvora | Rusia | 160 madera, 140 oro | ✔ Integrado | ✔ | procedural | Se entrena en Academia de ingenieros · Ataca (26, alcance 10) | Hace daño extra contra: building (+22), infantry (+8). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `fubing` | 🌾 Fubing | core | Edad Oscura | China | 40 alimento, 10 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (5) | Hace daño extra contra: cavalry (+6). · Lo contrarrestan: Arquero, Ballestero, Unicornio, Ametralladora y 2 más. | — |
| `fireLance` | 🔥 Lancero de fuego | core | Edad Feudal | China | 50 alimento, 30 oro | ✔ Integrado | ✔ | imagen | Se entrena en Cuartel · Ataca (9, alcance 2) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `repeatingCrossbowman` | 🏹 Ballestero de repetición | core | Edad de los Castillos | China | 35 madera, 45 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (3, alcance 5) | Lo contrarrestan: Hostigador, Jinete oromo. | — |
| `counterweightTrebuchet` | 🪨 Trabuquete de contrapeso | core | Edad de los Castillos | China | 200 madera, 150 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Ataca (40, alcance 10) | Hace daño extra contra: building (+35). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `divineArquebusier` | 🔫 Arcabucero de las divisiones divinas | core | Edad Imperial | China | 55 alimento, 55 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (13, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `eightBannersRider` | 🏇 Jinete de las Ocho Banderas | core | Edad de la Pólvora | China | 70 alimento, 70 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (12) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `crusaderKnight` | 🏇 Caballero cruzado | core | Edad Feudal | Francia | 60 alimento, 60 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (9) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `gendarme` | 🏇 Gendarme | core | Edad de los Castillos | Francia | 70 alimento, 80 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (12) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `ordinanceArquebusier` | 🔫 Arcabucero de la ordenanza | core | Edad Imperial | Francia | 55 alimento, 55 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (13, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `bayonetFusilier` | 🔫 Fusilero con bayoneta | core | Edad de la Pólvora | Francia | 55 alimento, 45 oro | ✔ Integrado | ✔ | imagen | Se entrena en Castillo · Ataca (16, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `gribeauvalCannon` | 💣 Cañón Gribeauval | core | Edad de la Pólvora | Francia | 160 madera, 110 oro | ✔ Integrado | ✔ | imagen | Se entrena en Fábrica de pólvora · Ataca (36, alcance 10) | Hace daño extra contra: building (+28). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `fyrdman` | 🛡️ Fyrdman | core | Edad Oscura | Británicos | 45 alimento, 15 madera | ✔ Integrado | ✔ | procedural | Se entrena en Cuartel · Ataca (5) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `normanKnight` | 🏇 Caballero normando | core | Edad Feudal | Británicos | 65 alimento, 50 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (9) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `tudorArquebusier` | 🔫 Arcabucero Tudor | core | Edad Imperial | Británicos | 50 alimento, 55 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (13, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `redcoat` | 🔴 Casaca roja | core | Edad de la Pólvora | Británicos | 55 alimento, 45 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (15, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `rifleman` | 🔫 Fusilero | core | Edad Industrial | todas | 55 alimento, 40 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (18, alcance 7) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `fieldGun` | 💣 Cañón de campaña | core | Edad Industrial | todas | 100 madera, 80 hierro, 40 carbón | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Mejora de Cañón · Ataca (40, alcance 11) | Se consigue investigando la mejora de Cañón. · Hace daño extra contra: building (+30). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `gatlingGun` | 🔫 Ametralladora | core | Edad Industrial | todas | 70 hierro, 40 carbón, 50 oro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (8, alcance 6) | Hace daño extra contra: infantry (+3). · Ocupa 2 de población. | — |
| `biplane` | 🛩️ Biplano | core | Edad Industrial | todas | 60 hierro, 40 carbón, 40 oro | ✔ Integrado | ✔ | procedural | Se entrena en Aeródromo · Ataca (7, alcance 3) · Vuela | Ocupa 2 de población. | — |
| `guardRifleman` | 🔫 Fusilero de la guardia | core | Edad Industrial | Rusia | 60 alimento, 45 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (19, alcance 7) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `donCossack` | 🐎 Cosaco del Don | core | Edad Industrial | Rusia | 65 alimento, 40 oro, 20 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (12) · Caza | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `regionalRifleman` | 🔫 Fusilero de ejército regional | core | Edad Industrial | China | 40 alimento, 25 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica, Arsenal de Jiangnan · Ataca (16, alcance 7) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `oldGuard` | 🔫 Guardia Vieja | core | Edad Industrial | Francia | 70 alimento, 50 hierro, 40 oro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (21, alcance 7) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `grandeBatterie` | 💣 Gran Batería | core | Edad Industrial | Francia | 90 madera, 70 hierro, 30 carbón, 30 oro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (42, alcance 11) | Hace daño extra contra: building (+30). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `enfieldRifleman` | 🔫 Fusilero Enfield | core | Edad Industrial | Británicos | 55 alimento, 40 hierro, 15 oro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (19, alcance 8) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `sharpshooter` | 🎯 Tirador | core | Edad Industrial | Británicos | 60 alimento, 55 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (27, alcance 9) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `savaran` | 🏇 Savaran | core | Edad Oscura | Persia | 70 alimento, 55 oro | ✔ Integrado | ✔ | procedural | Se entrena en Cuartel · Ataca (8) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `ghulam` | 🗡️ Ghulam | core | Edad Feudal | Persia | 55 alimento, 40 oro | ✔ Integrado | ✔ | procedural | Se entrena en Cuartel · Ataca (8) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `timuridHorseArcher` | 🏹 Arquero a caballo timúrida | core | Edad de los Castillos | Persia | 40 madera, 60 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (6, alcance 5) | Lo contrarrestan: Lancero, Piquero, Hostigador, Fubing y 3 más. | — |
| `timuridElephant` | 🐘 Elefante timúrida | core | Edad de los Castillos | Persia | 110 alimento, 90 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (14) | Hace daño extra contra: building (+6). · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. · Ocupa 3 de población. | — |
| `qizilbash` | 🏇 Qizilbash | core | Edad Imperial | Persia | 70 alimento, 70 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (11) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `tofangchi` | 🔫 Tofangchi | core | Edad Imperial | Persia | 55 alimento, 55 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (14, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `zamburakchi` | 🐫 Zamburakchi | core | Edad de la Pólvora | Persia | 70 alimento, 70 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo, Ordu · Ataca (12, alcance 5) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `sarbaz` | 🔫 Sarbaz | core | Edad Industrial | Persia | 45 alimento, 30 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (16, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `persianCossack` | 🐎 Cosaco persa | core | Edad Industrial | Persia | 65 alimento, 45 oro, 15 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (11) | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `axumiteWarrior` | 🔱 Guerrero axumita | core | Edad Oscura | Etiopía | 50 alimento, 20 oro | ✔ Integrado | ✔ | procedural | Se entrena en Cuartel · Ataca (5) | Hace daño extra contra: cavalry (+10). · Lo contrarrestan: Arquero, Ballestero, Unicornio, Ametralladora y 2 más. | — |
| `lalibelaGuard` | 🗡️ Guardia de Lalibela | core | Edad Feudal | Etiopía | 55 alimento, 25 oro | ✔ Integrado | ✔ | procedural | Se entrena en Cuartel · Ataca (7) | Hace daño extra contra: cavalry (+6). · Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `royalChewa` | ⚔️ Soldado real | core | Edad de los Castillos | Etiopía | 60 alimento, 50 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (10) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `ethiopianMusketeer` | 🔫 Mosquetero etíope-portugués | core | Edad Imperial | Etiopía | 55 alimento, 60 oro | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (15, alcance 6) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `oromoRider` | 🐎 Jinete oromo | core | Edad de la Pólvora | Etiopía | 55 alimento, 40 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (9) · Caza | Hace daño extra contra: archer (+3). · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. | — |
| `shewanRifleman` | 🔫 Fusilero shewano | core | Edad Industrial | Etiopía | 50 alimento, 35 hierro | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (17, alcance 7) | Lo contrarrestan: Unicornio, Ametralladora, Escorpión, Escorpión pesado. | — |
| `mountainGun` | 💣 Artillería de montaña | core | Edad Industrial | Etiopía | 80 madera, 60 hierro, 20 carbón | ✔ Integrado | ✔ | procedural | Se entrena en Fábrica · Ataca (30, alcance 10) | Hace daño extra contra: building (+22). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `catapult` | ☄️ Catapulta | core | Edad de los Castillos | todas | 135 madera, 75 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Ataca (30, alcance 7) | Se puede mejorar a Trabuquete. · Hace daño extra contra: building (+22). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 2 de población. | — |
| `scorpion` | 🏹 Escorpión | core | Edad de los Castillos | todas | 75 madera, 75 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Ataca (14, alcance 8) | Se puede mejorar a Escorpión pesado. · Hace daño extra contra: siege (+10), infantry (+4). · Lo contrarrestan: Escorpión, Escorpión pesado. | — |
| `cappedRam` | 🪵 Ariete cubierto | core | Edad Imperial | todas | 170 madera, 90 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Mejora de Ariete · Ataca (3) | Se consigue investigando la mejora de Ariete. · Hace daño extra contra: building (+150). · Lo contrarrestan: Escorpión, Escorpión pesado. | — |
| `trebuchet` | 🏗️ Trabuquete | core | Edad Imperial | todas | 200 madera, 150 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Mejora de Catapulta · Ataca (45, alcance 11) | Se consigue investigando la mejora de Catapulta. · Se puede mejorar a Bombarda. · Hace daño extra contra: building (+60). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 3 de población. | — |
| `heavyScorpion` | 🏹 Escorpión pesado | core | Edad Imperial | todas | 90 madera, 90 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Mejora de Escorpión · Ataca (20, alcance 9) | Se consigue investigando la mejora de Escorpión. · Hace daño extra contra: siege (+14), infantry (+6). · Lo contrarrestan: Escorpión, Escorpión pesado. | — |
| `bombard` | 💣 Bombarda | core | Edad de la Pólvora | todas | 220 madera, 180 oro | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Mejora de Trabuquete · Ataca (70, alcance 12) | Se consigue investigando la mejora de Trabuquete. · Se puede mejorar a Obús. · Hace daño extra contra: building (+90). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 3 de población. | — |
| `howitzer` | 💥 Obús | core | Edad Industrial | todas | 150 madera, 100 hierro, 50 carbón | ✔ Integrado | ✔ | procedural | Se entrena en Taller de asedio · Mejora de Bombarda · Ataca (60, alcance 13) | Se consigue investigando la mejora de Bombarda. · Hace daño extra contra: building (+50). · Lo contrarrestan: Escorpión, Escorpión pesado. · Ocupa 3 de población. | — |
| `caravan` | 🐪 Caravana | core | Edad Feudal | todas | 100 madera, 50 oro | ⚠ Sin usar | ✔ | procedural | Se entrena en Mercado, Compañía comercial, Banco | — | No ataca, no recolecta, no construye y no tiene habilidad: solo ocupa población. |
| `spy` | 🕵️ Espía | core | Edad de los Castillos | todas | 90 oro | ✔ Integrado | ✔ | procedural | Se entrena en Mercado · La crea el código de un mod o del mapa | Máximo 3 vivos a la vez. | — |
| `warElephant` | 🐘 Elefante de guerra | extra-content | Edad de los Castillos | Persia, Etiopía | 170 alimento, 85 oro | ✔ Integrado | ✔ | procedural | Se entrena en Establo · Ataca (16) | Hace daño extra contra: building (+7). · Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. · Ocupa 2 de población. | — |
| `general` | 🎖️ General | declared-war | Edad de los Castillos | todas | 500 alimento, 300 madera | ✔ Integrado | ✔ | procedural | Se entrena en Castillo · Ataca (14) · Da un aura a las tropas cercanas | Lo contrarrestan: Lancero, Piquero, Fubing, Guerrero axumita y 1 más. · Máximo 1 vivo a la vez; si cae, 180 s de espera. | — |
| `king` | 👑 Rey | regicide | Edad Oscura | todas | — | ✔ Integrado | — | procedural | — | Máximo 1 vivo a la vez. | No se entrena en ningún edificio y nada la crea ni la mejora. · Nota: Lo crea el modo Matar al rey (mod regicide) al empezar la partida; por eso no se entrena en ningún edificio. |

## 🏛️ Edificios (60)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `townCenter` | 🏰 Centro urbano | core | Edad de los Castillos | todas | 275 madera, 100 piedra | ✔ Integrado | ✔ | imagen | Entrena: Aldeano · Investiga 24 tecnologías · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +5 población · Refugio (1) para king · Defensa: dispara a los enemigos · Centro urbano: punto de partida · Requisito de: Kremlin de piedra, Ciudad Prohibida, Bastida, Katama · Lo usa el código de un mod | Sin él no se pueden entrenar: Aldeano. · Aquí se investigan 24 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `house` | 🏠 Casa | core | Edad Oscura | todas | 25 madera | ✔ Integrado | ✔ | imagen | Aloja +5 población | Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `mill` | 🌾 Molino | core | Edad Oscura | todas | 100 madera | ✔ Integrado | ✔ | imagen | Investiga 3 tecnologías · Depósito de Alimento · Requisito de: Granja, Corral, Edad Feudal | Aquí se investigan 3 mejoras (hasta Edad de los Castillos). · Acorta el trayecto de los aldeanos que recogen Alimento: conviene construirlo junto a los nodos. | — |
| `lumberCamp` | 🪓 Campamento maderero | core | Edad Oscura | todas | 100 madera | ✔ Integrado | ✔ | imagen | Investiga 2 tecnologías · Depósito de Madera · Requisito de: Edad Feudal | Aquí se investigan 2 mejoras (hasta Edad de los Castillos). · Acorta el trayecto de los aldeanos que recogen Madera: conviene construirlo junto a los nodos. | — |
| `miningCamp` | ⛏️ Campamento minero | core | Edad Oscura | todas | 100 madera | ✔ Integrado | ✔ | imagen | Investiga 3 tecnologías · Depósito de Oro, Piedra, Hierro, Carbón · Requisito de: Edad Feudal | Aquí se investigan 3 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. | — |
| `farm` | 🌱 Granja | core | Edad Oscura | todas | 60 madera | ✔ Integrado | ✔ | procedural | Fuente renovable de Alimento · Lo usa el código de un mod | Para construirlo hace falta Molino. | — |
| `barracks` | 🛖 Cuartel | core | Edad Oscura | todas | 175 madera | ✔ Integrado | ✔ | imagen | Entrena: Milicia, Hombre de armas, Espadachín de mandoble, Lancero y 10 más · Investiga 3 tecnologías · Requisito de: Galería de tiro con arco, Establo, Edad Feudal | Sin él no se pueden entrenar: Milicia, Hombre de armas, Espadachín de mandoble, Lancero, Piquero y 9 más. · Aquí se investigan 3 mejoras (hasta Edad de los Castillos). | — |
| `archeryRange` | 🎯 Galería de tiro con arco | core | Edad Feudal | todas | 175 madera | ✔ Integrado | ✔ | imagen | Entrena: Arquero, Ballestero, Hostigador · Investiga 1 tecnología · Requisito de: Edad de los Castillos | Sin él no se pueden entrenar: Arquero, Ballestero, Hostigador. · Aquí se investigan 1 mejoras (hasta Edad de los Castillos). · Para construirlo hace falta Cuartel. | — |
| `stable` | 🐴 Establo | core | Edad Feudal | todas | 175 madera | ✔ Integrado | ✔ | imagen | Entrena: Caballería de exploración, Caballería ligera, Caballero, Paladín y 9 más · Investiga 3 tecnologías · Requisito de: Ordu, Edad de los Castillos | Sin él no se pueden entrenar: Caballería de exploración, Caballería ligera, Caballero, Paladín, Dragón y 8 más. · Aquí se investigan 3 mejoras (hasta Edad Imperial). · Para construirlo hace falta Cuartel. | — |
| `blacksmith` | ⚒️ Herrería | core | Edad Feudal | todas | 150 madera | ✔ Integrado | ✔ | imagen | Investiga 9 tecnologías · Requisito de: Taller de asedio, Fábrica de pólvora, Edad de los Castillos, Edad de la Pólvora | Aquí se investigan 9 mejoras (hasta Edad de la Pólvora). | — |
| `watchTower` | 🗼 Torre de vigilancia | core | Edad Feudal | todas | 25 madera, 125 piedra | ✔ Integrado | ✔ | imagen | Defensa: dispara a los enemigos | — | — |
| `siegeWorkshop` | 🛠️ Taller de asedio | core | Edad de los Castillos | todas | 200 madera | ✔ Integrado | ✔ | imagen | Entrena: Ariete, Trabuquete de contrapeso, Catapulta, Escorpión y 5 más · Investiga 4 tecnologías · Requisito de: Edad Imperial, Edad de la Pólvora | Sin él no se pueden entrenar: Ariete, Trabuquete de contrapeso, Catapulta, Escorpión, Ariete cubierto y 4 más. · Aquí se investigan 4 mejoras (hasta Edad de la Pólvora). · Para construirlo hace falta Herrería. | — |
| `castle` | 🏯 Castillo | core | Edad de los Castillos | todas | 650 piedra | ✔ Integrado | ✔ | imagen | Entrena: Arquero de tiro largo, Hijo de boyardo, Strelets, Cosaco y 15 más · Investiga 5 tecnologías · Aloja +20 población · Refugio (1) para king · Defensa: dispara a los enemigos · Requisito de: Fortaleza, Fortaleza de Vauban, Edad Imperial, Edad de la Pólvora | Sin él no se pueden entrenar: Arquero de tiro largo, Hijo de boyardo, Strelets, Cosaco, Granadero y 14 más. · Aquí se investigan 5 mejoras (hasta Edad Imperial). · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `gorodishche` | 🛖 Gorodishche | core | Edad Oscura | Rusia | 130 madera | ✔ Integrado | ✗ | procedural | Aloja +5 población · Defensa: dispara a los enemigos | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `monasteryFortress` | ⛪ Monasterio-fortaleza | core | Edad Feudal | Rusia | 150 madera, 100 piedra | ✔ Integrado | ✗ | procedural | Refugio (12) para villager/infantry/archer · Defensa: dispara a los enemigos | — | La IA no lo construye. |
| `kremlin` | 🏰 Kremlin de piedra | core | Edad de los Castillos | Rusia | 200 madera, 450 piedra | ✔ Integrado | ✔ | procedural | Entrena: Aldeano · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +15 población · Defensa: dispara a los enemigos · Centro urbano: punto de partida | Sin él no se pueden entrenar: Aldeano. · Para construirlo hace falta Centro urbano. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `ostrog` | 🗼 Ostrog | core | Edad Imperial | Rusia | 90 madera, 30 piedra | ✔ Integrado | ✗ | procedural | Defensa: dispara a los enemigos | — | La IA no lo construye. |
| `corral` | 🐑 Corral | core | Edad Feudal | todas | 100 madera | ✔ Integrado | ✔ | procedural | Entrena: Oveja · Investiga 1 tecnología | Sin él no se pueden entrenar: Oveja. · Aquí se investigan 1 mejoras (hasta Edad de los Castillos). · Para construirlo hace falta Molino. | — |
| `gunpowderWorks` | 💥 Fábrica de pólvora | core | Edad de la Pólvora | todas | 100 madera, 150 piedra, 50 oro | ✔ Integrado | ✔ | procedural | Entrena: Mosquetero, Cañón, Cañón Gribeauval · Investiga 1 tecnología · Requisito de: Academia de ingenieros, Fábrica, Arsenal de Jiangnan, Edad Industrial | Sin él no se pueden entrenar: Mosquetero, Cañón, Cañón Gribeauval. · Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Para construirlo hace falta Herrería. | — |
| `fortress` | 🏯 Fortaleza | core | Edad de la Pólvora | todas | 900 piedra | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Aloja +20 población · Defensa: dispara a los enemigos · Gran visión (12) · Requisito de: Edad Industrial | Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Para construirlo hace falta Castillo. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `printingHouse` | 📰 Imprenta | core | Edad de la Pólvora | todas | 100 madera, 150 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Requisito de: Edad Industrial | Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). | — |
| `observatory` | 🔭 Observatorio | core | Edad de la Pólvora | todas | 50 madera, 200 piedra | ✔ Integrado | ✔ | procedural | Investiga 2 tecnologías · Gran visión (14) · Requisito de: Edad Industrial | Aquí se investigan 2 mejoras (hasta Edad de la Pólvora). | — |
| `tradingCompany` | 🏦 Compañía comercial | core | Edad de la Pólvora | todas | 100 madera, 150 piedra, 50 oro | ✔ Integrado | ✔ | procedural | Entrena: Caravana · Investiga 1 tecnología · Depósito de Oro, Piedra · Requisito de: Edad Industrial | Sin él no se pueden entrenar: Caravana. · Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Oro, Piedra: conviene construirlo junto a los nodos. | — |
| `engineerAcademy` | 📐 Academia de ingenieros | core | Edad de la Pólvora | Rusia | 100 madera, 200 piedra | ✔ Integrado | ✔ | procedural | Entrena: Unicornio | Sin él no se pueden entrenar: Unicornio. · Para construirlo hace falta Fábrica de pólvora. | — |
| `stateGranary` | 🌾 Granero estatal | core | Edad Oscura | China | 120 madera | ✔ Integrado | ✗ | procedural | Depósito de Alimento · Aloja +5 población | Acorta el trayecto de los aldeanos que recogen Alimento: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `mint` | 🪙 Casa de moneda | core | Edad Feudal | China | 150 madera, 50 piedra | ✔ Integrado | ✗ | procedural | Investiga 1 tecnología · Depósito de Oro, Piedra | Aquí se investigan 1 mejoras (hasta Edad Feudal). · Acorta el trayecto de los aldeanos que recogen Oro, Piedra: conviene construirlo junto a los nodos. | La IA no lo construye. |
| `grandCanal` | 🛶 Gran Canal | core | Edad de los Castillos | China | 250 madera, 100 piedra | ✔ Integrado | ✗ | procedural | Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón | Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. | La IA no lo construye. |
| `forbiddenCity` | 🏮 Ciudad Prohibida | core | Edad Imperial | China | 300 madera, 500 piedra | ✔ Integrado | ✔ | procedural | Entrena: Aldeano · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +20 población · Defensa: dispara a los enemigos · Centro urbano: punto de partida | Sin él no se pueden entrenar: Aldeano. · Para construirlo hace falta Centro urbano. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `cantonHong` | 🏮 Hong de Cantón | core | Edad de la Pólvora | China | 100 madera, 300 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Oro | Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Solo se puede tener 1 a la vez. · Acorta el trayecto de los aldeanos que recogen Oro: conviene construirlo junto a los nodos. | — |
| `royalVilla` | 🏡 Villa real | core | Edad Oscura | Francia | 150 madera | ✔ Integrado | ✗ | procedural | Depósito de Alimento · Aloja +10 población | Acorta el trayecto de los aldeanos que recogen Alimento: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `gothicCathedral` | ⛪ Catedral gótica | core | Edad Feudal | Francia | 200 madera, 150 piedra | ✔ Integrado | ✗ | procedural | Refugio (15) para villager/infantry | — | La IA no lo construye. |
| `bastide` | 🏘️ Bastida | core | Edad de los Castillos | Francia | 150 madera, 250 piedra | ✔ Integrado | ✔ | procedural | Entrena: Aldeano · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +10 población · Defensa: dispara a los enemigos · Centro urbano: punto de partida | Sin él no se pueden entrenar: Aldeano. · Para construirlo hace falta Centro urbano. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `chateau` | 🏰 Château | core | Edad Imperial | Francia | 300 madera, 300 piedra | ✔ Integrado | ✗ | procedural | Aloja +15 población · Defensa: dispara a los enemigos | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `vaubanFortress` | ⭐ Fortaleza de Vauban | core | Edad de la Pólvora | Francia | 800 piedra | ✔ Integrado | ✔ | procedural | Aloja +20 población · Defensa: dispara a los enemigos · Gran visión (12) | Para construirlo hace falta Castillo. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `royalManufacture` | 🏭 Manufactura real | core | Edad de la Pólvora | Francia | 100 madera, 200 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Oro | Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Oro: conviene construirlo junto a los nodos. | — |
| `burh` | 🛖 Burh | core | Edad Oscura | Británicos | 90 madera | ✔ Integrado | ✗ | procedural | Defensa: dispara a los enemigos | — | La IA no lo construye. |
| `motteAndBailey` | 🏰 Castillo de mota | core | Edad Feudal | Británicos | 200 madera, 100 piedra | ✔ Integrado | ✗ | procedural | Aloja +5 población · Defensa: dispara a los enemigos | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `concentricCastle` | 🏯 Castillo concéntrico | core | Edad de los Castillos | Británicos | 750 piedra | ✔ Integrado | ✗ | procedural | Aloja +20 población · Defensa: dispara a los enemigos | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `bank` | 🏦 Banco | core | Edad de la Pólvora | Británicos | 100 madera, 250 piedra | ✔ Integrado | ✔ | procedural | Entrena: Caravana · Investiga 1 tecnología · Depósito de Oro | Sin él no se pueden entrenar: Caravana. · Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Oro: conviene construirlo junto a los nodos. | — |
| `factory` | 🏭 Fábrica | core | Edad Industrial | todas | 200 madera, 200 piedra | ✔ Integrado | ✔ | procedural | Entrena: Fusilero, Cañón de campaña, Ametralladora, Fusilero de la guardia y 8 más · Investiga 6 tecnologías | Sin él no se pueden entrenar: Fusilero, Cañón de campaña, Ametralladora, Fusilero de la guardia, Fusilero de ejército regional y 7 más. · Aquí se investigan 6 mejoras (hasta Edad Industrial). · Para construirlo hace falta Fábrica de pólvora. | — |
| `railwayStation` | 🚉 Estación de ferrocarril | core | Edad Industrial | todas | 150 madera, 100 piedra, 50 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +5 población · Requisito de: Transiberiano, Ferrocarril transcontinental | Aquí se investigan 1 mejoras (hasta Edad Industrial). · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `laboratory` | 🧪 Laboratorio | core | Edad Industrial | todas | 150 madera, 150 piedra, 100 oro | ✔ Integrado | ✔ | procedural | Investiga 4 tecnologías · Requisito de: Aeródromo | Aquí se investigan 4 mejoras (hasta Edad Industrial). | — |
| `airfield` | 🛩️ Aeródromo | core | Edad Industrial | todas | 200 madera, 100 piedra, 100 oro | ✔ Integrado | ✔ | procedural | Entrena: Biplano | Sin él no se pueden entrenar: Biplano. · Para construirlo hace falta Laboratorio. | — |
| `transSiberian` | 🚂 Transiberiano | core | Edad Industrial | Rusia | 500 madera, 500 piedra, 400 oro, 300 hierro | ✔ Integrado | ✔ | procedural | Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +15 población | Para construirlo hace falta Estación de ferrocarril. · Solo se puede tener 1 a la vez. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `jiangnanArsenal` | 🏭 Arsenal de Jiangnan | core | Edad Industrial | China | 200 madera, 150 piedra | ✔ Integrado | ✔ | procedural | Entrena: Fusilero de ejército regional · Investiga 1 tecnología | Sin él no se pueden entrenar: Fusilero de ejército regional. · Aquí se investigan 1 mejoras (hasta Edad Industrial). · Para construirlo hace falta Fábrica de pólvora. | — |
| `polytechnique` | 📐 École Polytechnique | core | Edad Industrial | Francia | 150 madera, 250 piedra, 100 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología | Aquí se investigan 1 mejoras (hasta Edad Industrial). | — |
| `transcontinental` | 🚂 Ferrocarril transcontinental | core | Edad Industrial | Británicos | 500 madera, 400 piedra, 400 oro, 300 hierro | ✔ Integrado | ✔ | procedural | Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +10 población | Para construirlo hace falta Estación de ferrocarril. · Solo se puede tener 1 a la vez. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `qanat` | 💧 Qanat | core | Edad Oscura | Persia | 80 madera, 40 piedra | ✔ Integrado | ✗ | procedural | Depósito de Alimento | Acorta el trayecto de los aldeanos que recogen Alimento: conviene construirlo junto a los nodos. | La IA no lo construye. |
| `caravanserai` | 🏪 Caravasar | core | Edad Feudal | Persia | 120 madera, 40 piedra | ✔ Integrado | ✗ | procedural | Depósito de Oro, Piedra, Madera · Aloja +5 población | Acorta el trayecto de los aldeanos que recogen Oro, Piedra, Madera: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `maraghaObservatory` | 🔭 Observatorio de Maragha | core | Edad de los Castillos | Persia | 100 madera, 200 piedra | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Gran visión (14) | Aquí se investigan 1 mejoras (hasta Edad de los Castillos). | — |
| `maidan` | 🕌 Maidan | core | Edad Imperial | Persia | 150 madera, 250 piedra | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Oro · Aloja +10 población | Aquí se investigan 1 mejoras (hasta Edad Imperial). · Acorta el trayecto de los aldeanos que recogen Oro: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `ordu` | ⛺ Ordu | core | Edad de la Pólvora | Persia | 200 madera, 100 piedra | ✔ Integrado | ✔ | procedural | Entrena: Zamburakchi · Investiga 1 tecnología · Aloja +10 población | Sin él no se pueden entrenar: Zamburakchi. · Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Para construirlo hace falta Establo. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `darulFunun` | 🎓 Dar ul-Funun | core | Edad Industrial | Persia | 150 madera, 200 piedra, 100 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología | Aquí se investigan 1 mejoras (hasta Edad Industrial). | — |
| `stele` | 🗿 Estela | core | Edad Oscura | Etiopía | 120 piedra | ✔ Integrado | ✗ | procedural | Aloja +8 población | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `rockChurch` | ⛪ Iglesia rupestre | core | Edad Feudal | Etiopía | 50 madera, 200 piedra | ✔ Integrado | ✗ | procedural | Aloja +5 población · Refugio (12) para villager/infantry | Sube el límite de población: sin él el ejército y la economía no crecen. | La IA no lo construye. |
| `katama` | 🏕️ Katama | core | Edad de los Castillos | Etiopía | 150 madera, 200 piedra | ✔ Integrado | ✔ | procedural | Entrena: Aldeano · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +10 población · Defensa: dispara a los enemigos · Centro urbano: punto de partida | Sin él no se pueden entrenar: Aldeano. · Para construirlo hace falta Centro urbano. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `gondarCastle` | 🏰 Castillo de Gondar | core | Edad Imperial | Etiopía | 250 madera, 350 piedra | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Aloja +15 población · Defensa: dispara a los enemigos | Aquí se investigan 1 mejoras (hasta Edad Imperial). · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `rasPalace` | 🏛️ Palacio del ras | core | Edad de la Pólvora | Etiopía | 150 madera, 150 piedra | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Alimento, Oro · Aloja +15 población | Aquí se investigan 1 mejoras (hasta Edad de la Pólvora). · Acorta el trayecto de los aldeanos que recogen Alimento, Oro: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `djiboutiRailway` | 🚂 Ferrocarril de Yibuti | core | Edad Industrial | Etiopía | 150 madera, 80 piedra, 50 oro | ✔ Integrado | ✔ | procedural | Investiga 1 tecnología · Depósito de Alimento, Madera, Oro, Piedra, Hierro, Carbón · Aloja +5 población | Aquí se investigan 1 mejoras (hasta Edad Industrial). · Solo se puede tener 1 a la vez. · Acorta el trayecto de los aldeanos que recogen Alimento, Madera, Oro, Piedra, Hierro, Carbón: conviene construirlo junto a los nodos. · Sube el límite de población: sin él el ejército y la economía no crecen. | — |
| `market` | 🏪 Mercado | core | Edad Feudal | todas | 150 madera, 50 piedra | ✔ Integrado | ✔ | procedural | Entrena: Caravana, Espía · Investiga 3 tecnologías | Sin él no se pueden entrenar: Caravana, Espía. · Aquí se investigan 3 mejoras (hasta Edad de la Pólvora). | — |

## 📜 Tecnologías (91)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `feudalAge` | 🏰 Edad Feudal | core | Edad Oscura | todas | 500 alimento | ✔ Integrado | ✔ | — | Sube a la edad: Edad Feudal | Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización. | — |
| `castleAge` | 🏯 Edad de los Castillos | core | Edad Feudal | todas | 800 alimento, 200 oro | ✔ Integrado | ✔ | — | Sube a la edad: Edad de los Castillos | Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización. | — |
| `imperialAge` | 👑 Edad Imperial | core | Edad de los Castillos | todas | 1000 alimento, 800 oro | ✔ Integrado | ✔ | — | Sube a la edad: Edad Imperial | Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización. | — |
| `loom` | 🧵 Telar | core | Edad Oscura | todas | 50 oro | ✔ Integrado | ✔ | — | hp +15: villager · armorMelee +1: villager · armorPierce +2: villager | — | — |
| `wheelbarrow` | 🛒 Carretilla | core | Edad Feudal | todas | 175 alimento, 50 madera | ✔ Integrado | ✔ | — | speed ×1.1: villager · carryCapacity +3: villager | Desbloquea: Carro de mano. | — |
| `handCart` | 🛞 Carro de mano | core | Edad de los Castillos | todas | 300 alimento, 200 madera | ✔ Integrado | ✔ | — | speed ×1.1: villager · carryCapacity +7: villager | Requiere antes: Carretilla. | — |
| `doubleBitAxe` | 🪓 Hacha de doble filo | core | Edad Feudal | todas | 100 alimento, 50 madera | ✔ Integrado | ✔ | — | Recolección de Madera ×1.2 | Desbloquea: Sierra de arco. | — |
| `bowSaw` | 🪚 Sierra de arco | core | Edad de los Castillos | todas | 150 alimento, 100 madera | ✔ Integrado | ✔ | — | Recolección de Madera ×1.2 | Requiere antes: Hacha de doble filo. | — |
| `horseCollar` | 🐂 Collera | core | Edad Feudal | todas | 75 alimento, 75 madera | ✔ Integrado | ✔ | — | Recolección de Alimento ×1.1 | Desbloquea: Arado pesado. | — |
| `heavyPlow` | 🚜 Arado pesado | core | Edad de los Castillos | todas | 125 alimento, 125 madera | ✔ Integrado | ✔ | — | Recolección de Alimento ×1.1 | Requiere antes: Collera. | — |
| `goldMining` | 🪙 Minería de oro | core | Edad Feudal | todas | 100 alimento, 75 madera | ✔ Integrado | ✔ | — | Recolección de Oro ×1.15 | Desbloquea: Mina profunda. | — |
| `stoneMining` | 🪨 Cantería | core | Edad Feudal | todas | 100 alimento, 75 madera | ✔ Integrado | ✔ | — | Recolección de Piedra ×1.15 | Desbloquea: Mina profunda. | — |
| `forging` | 🔨 Forja | core | Edad Feudal | todas | 150 alimento | ✔ Integrado | ✔ | — | attack +1: militia, manAtArms, longSwordsman y 50 más | Desbloquea: Fundición de hierro. | — |
| `ironCasting` | 🔥 Fundición de hierro | core | Edad de los Castillos | todas | 220 alimento, 120 oro | ✔ Integrado | ✔ | — | attack +1: militia, manAtArms, longSwordsman y 50 más | Requiere antes: Forja. · Desbloquea: Metalurgia avanzada. | — |
| `fletching` | 🪶 Emplumado | core | Edad Feudal | todas | 100 alimento, 50 oro | ✔ Integrado | ✔ | — | attack +1: archer, crossbowman, skirmisher y 19 más · range +1: archer, crossbowman, skirmisher y 19 más | Desbloquea: Flecha punzante. | — |
| `bodkinArrow` | ➶ Flecha punzante | core | Edad de los Castillos | todas | 200 alimento, 100 oro | ✔ Integrado | ✔ | — | attack +1: archer, crossbowman, skirmisher y 19 más · range +1: archer, crossbowman, skirmisher y 19 más | Requiere antes: Emplumado. | — |
| `scaleMail` | 🦺 Cota de escamas | core | Edad Feudal | todas | 100 alimento | ✔ Integrado | ✔ | — | armorMelee +1: militia, manAtArms, longSwordsman y 29 más · armorPierce +1: militia, manAtArms, longSwordsman y 29 más | — | — |
| `scaleBarding` | 🐎 Barda de escamas | core | Edad Feudal | todas | 150 alimento | ✔ Integrado | ✔ | — | armorMelee +1: scoutCavalry, lightCavalry, knight y 18 más · armorPierce +1: scoutCavalry, lightCavalry, knight y 18 más | — | — |
| `paddedArcherArmor` | 🧥 Armadura acolchada | core | Edad Feudal | todas | 100 alimento | ✔ Integrado | ✔ | — | armorMelee +1: archer, crossbowman, skirmisher y 3 más · armorPierce +1: archer, crossbowman, skirmisher y 3 más | — | — |
| `up_manAtArms` | ⚔️ Hombre de armas | core | Edad Feudal | todas | 100 alimento, 40 oro | ✔ Integrado | ✔ | — | Mejora Milicia → Hombre de armas | Desbloquea: Espadachín de mandoble. | — |
| `up_longSwordsman` | 🤺 Espadachín de mandoble | core | Edad de los Castillos | todas | 200 alimento, 65 oro | ✔ Integrado | ✔ | — | Mejora Hombre de armas → Espadachín de mandoble | Requiere antes: Hombre de armas. | — |
| `up_pikeman` | 🔱 Piquero | core | Edad de los Castillos | todas | 215 alimento, 90 oro | ✔ Integrado | ✔ | — | Mejora Lancero → Piquero | — | — |
| `up_crossbowman` | 🎯 Ballestero | core | Edad de los Castillos | todas | 125 alimento, 75 oro | ✔ Integrado | ✔ | — | Mejora Arquero → Ballestero | — | — |
| `up_lightCavalry` | 🐎 Caballería ligera | core | Edad de los Castillos | todas | 150 alimento, 50 oro | ✔ Integrado | ✔ | — | Mejora Caballería de exploración → Caballería ligera | — | — |
| `up_cavalier` | 🏇 Paladín | core | Edad Imperial | todas | 300 alimento, 300 oro | ✔ Integrado | ✔ | — | Mejora Caballero → Paladín | — | — |
| `yeomen` | 🏹 Arqueros ingleses | core | Edad de los Castillos | Británicos | 750 alimento, 450 madera | ✔ Integrado | ✔ | — | range +1: archer, crossbowman, skirmisher y 3 más · attack +2: watchTower, gorodishche, ostrog y 4 más | — | — |
| `beardedAxe` | 🪓 Hacha barbada | core | Edad de los Castillos | Francia | 400 alimento, 400 oro | ✔ Integrado | ✔ | — | range +1: throwingAxeman | — | — |
| `russkayaPravda` | 📜 Russkaya Pravda | core | Edad Feudal | Rusia | 200 alimento, 100 oro | ✔ Integrado | ✔ | — | Cambia el coste de house, mill, lumberCamp y 2 más | — | — |
| `siberianMarch` | 🧭 Marcha a Siberia | core | Edad Imperial | Rusia | 600 alimento, 400 oro | ✔ Integrado | ✔ | — | los +2: scoutCavalry, lightCavalry, knight y 18 más · Recolectar deerCarcass, boarCarcass da además Oro | — | — |
| `selectiveBreeding` | 🐏 Cría selectiva | core | Edad de los Castillos | todas | 150 alimento, 100 madera | ✔ Integrado | ✔ | — | Cambia el coste de sheep | — | — |
| `gunpowderAge` | 💥 Edad de la Pólvora | core | Edad Imperial | todas | 1400 alimento, 1000 oro | ✔ Integrado | ✔ | — | Sube a la edad: Edad de la Pólvora | Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización. | — |
| `printing` | 📰 Imprenta | core | Edad de la Pólvora | todas | 300 alimento, 200 oro | ✔ Integrado | ✔ | — | Cambia el coste de feudalAge, castleAge, imperialAge y 88 más | — | — |
| `cartography` | 🗺️ Cartografía | core | Edad de la Pólvora | todas | 200 alimento, 150 oro | ✔ Integrado | ✔ | — | los +1: villager, militia, manAtArms y 79 más | — | — |
| `ballistics` | 📐 Balística | core | Edad de la Pólvora | todas | 300 alimento, 300 oro | ✔ Integrado | ✔ | — | attack +1: musketeer, dragoon, grenadier y 17 más · range +1: cannon, unicorn, gribeauvalCannon y 4 más | — | — |
| `advancedMetallurgy` | 🔥 Metalurgia avanzada | core | Edad de la Pólvora | todas | 400 alimento, 250 oro | ✔ Integrado | ✔ | — | attack +1: militia, manAtArms, longSwordsman y 51 más | Requiere antes: Fundición de hierro. | — |
| `bayonet` | 🗡️ Bayoneta | core | Edad de la Pólvora | todas | 250 alimento, 150 oro | ✔ Integrado | ✔ | — | armorMelee +2: musketeer, dragoon, grenadier y 17 más | — | — |
| `refinedPowder` | ⚗️ Pólvora refinada | core | Edad de la Pólvora | todas | 350 alimento, 250 oro | ✔ Integrado | ✔ | — | attack +4: cannon, unicorn, gribeauvalCannon y 4 más · reloadTime ×0.9: musketeer, dragoon, grenadier y 17 más | — | — |
| `bastionTheory` | 📏 Fortificación abaluartada | core | Edad de la Pólvora | todas | 300 alimento, 400 piedra | ✔ Integrado | ✔ | — | hp ×1.15: townCenter, watchTower, castle y 13 más · armorMelee +1: townCenter, watchTower, castle y 13 más · armorPierce +1: townCenter, watchTower, castle y 13 más | — | — |
| `deepMining` | ⛏️ Mina profunda | core | Edad de la Pólvora | todas | 300 alimento, 200 madera | ✔ Integrado | ✔ | — | Recolección de Oro ×1.15 · Recolección de Piedra ×1.15 | Requiere antes: Minería de oro. · Requiere antes: Cantería. | — |
| `mercantilism` | ⚖️ Mercantilismo | core | Edad de la Pólvora | todas | 300 madera, 100 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.15 | — | — |
| `imperialExams` | 📜 Exámenes imperiales | core | Edad Oscura | China | 150 alimento, 50 oro | ✔ Integrado | ✔ | — | Cambia el coste de feudalAge, castleAge, imperialAge y 88 más | — | — |
| `champaRice` | 🌾 Arroz de Champa | core | Edad Feudal | China | 150 alimento, 100 madera | ✔ Integrado | ✔ | — | Recolección de Alimento ×1.15 | — | — |
| `jiaozi` | 💴 Billete jiaozi | core | Edad Feudal | China | 400 alimento, 100 madera | ✔ Integrado | ✗ | — | Regala recursos | — | La IA no la investiga: no construye Casa de moneda. |
| `thunderBomb` | 💣 Bomba trueno | core | Edad de los Castillos | China | 400 alimento, 300 oro | ✔ Integrado | ✔ | — | attack +3: batteringRam, cannon, unicorn y 12 más | — | — |
| `mandarinDuck` | 🦆 Pato mandarín | core | Edad Imperial | China | 500 alimento, 400 oro | ✔ Integrado | ✔ | — | armorMelee +1: spearman, pikeman, musketeer y 21 más · armorPierce +1: spearman, pikeman, musketeer y 21 más | — | — |
| `cantonSystem` | 🚢 Cantón | core | Edad de la Pólvora | China | 300 madera, 300 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.25 | — | — |
| `capitularies` | 📜 Capitulares | core | Edad Oscura | Francia | 150 alimento, 50 oro | ✔ Integrado | ✔ | — | Recolección de Alimento ×1.1 | — | — |
| `townCharter` | 📜 Carta urbana | core | Edad Feudal | Francia | 200 alimento, 100 oro | ✔ Integrado | ✔ | — | trainTime ×0.85: villager | — | — |
| `taille` | 🪙 Taille | core | Edad de los Castillos | Francia | 300 alimento, 100 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.1 | — | — |
| `hireMercenaries` | 🛡️ Contratar mercenarios | core | Edad Imperial | Francia | 600 oro | ✔ Integrado | ✔ | — | Efecto propio (código) | — | — |
| `colbertism` | ⚖️ Colbertismo | core | Edad de la Pólvora | Francia | 300 madera, 200 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.15 | — | — |
| `vaubanDoctrine` | ⭐ Doctrina de Vauban | core | Edad de la Pólvora | Francia | 350 alimento, 250 piedra | ✔ Integrado | ✔ | — | hp ×1.25: watchTower, castle, gorodishche y 8 más · range +1: watchTower, castle, gorodishche y 8 más | Doctrina excluyente: impide Doctrina de Gribeauval. | — |
| `gribeauvalDoctrine` | 💣 Doctrina de Gribeauval | core | Edad de la Pólvora | Francia | 350 alimento, 250 oro | ✔ Integrado | ✔ | — | attack +3: cannon, unicorn, gribeauvalCannon y 4 más · Cambia el coste de cannon, unicorn, gribeauvalCannon y 4 más | Doctrina excluyente: impide Doctrina de Vauban. | — |
| `alfredReform` | 📜 Reforma de Alfredo | core | Edad Oscura | Británicos | 150 alimento, 50 oro | ✔ Integrado | ✔ | — | hp ×1.15: watchTower, gorodishche, ostrog y 4 más · attack +1: watchTower, gorodishche, ostrog y 4 más | — | — |
| `domesday` | 📖 Domesday | core | Edad Feudal | Británicos | 250 alimento, 100 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.1 | — | — |
| `companyCharter` | 📜 Carta de compañía | core | Edad Imperial | Británicos | 400 alimento, 100 oro | ✔ Integrado | ✔ | — | Regala recursos · Recolección de Oro ×1.1 | — | — |
| `nationalDebt` | 💷 Deuda nacional | core | Edad de la Pólvora | Británicos | 200 alimento | ✔ Integrado | ✔ | — | Regala recursos · Cambia el coste de villager, militia, manAtArms y 79 más | — | — |
| `industrialAge` | 🏭 Edad Industrial | core | Edad de la Pólvora | todas | 1500 alimento, 1200 oro | ✔ Integrado | ✔ | — | Sube a la edad: Edad Industrial | Cambia de edad: desbloquea el contenido de la nueva edad y la identidad de la civilización. | — |
| `steamEngine` | ♨️ Máquina de vapor | core | Edad Industrial | todas | 300 alimento, 250 oro | ✔ Integrado | ✔ | — | Recolección de Hierro ×1.2 · Recolección de Carbón ×1.2 | Desbloquea: Motor de combustión, Acero Bessemer. | — |
| `electricity` | ⚡ Electricidad y telégrafo | core | Edad Industrial | todas | 350 alimento, 300 oro | ✔ Integrado | ✔ | — | los +1: villager, militia, manAtArms y 79 más · trainTime ×0.93: villager, militia, manAtArms y 79 más | — | — |
| `combustionEngine` | ⚙️ Motor de combustión | core | Edad Industrial | todas | 150 hierro, 150 carbón, 100 oro | ✔ Integrado | ✔ | — | speed ×1.1: scoutCavalry, lightCavalry, knight y 25 más | Requiere antes: Máquina de vapor. · Desbloquea: Aviación. | — |
| `aviation` | 🛩️ Aviación | core | Edad Industrial | todas | 250 hierro, 200 carbón, 200 oro | ✔ Integrado | ✔ | — | Desbloquea: Biplano | Requiere antes: Motor de combustión. · Permite entrenar: Biplano. | — |
| `rifling` | 🎯 Estriado | core | Edad Industrial | todas | 200 hierro, 150 oro | ✔ Integrado | ✔ | — | attack +2: musketeer, dragoon, grenadier y 17 más · range +1: musketeer, dragoon, grenadier y 17 más | — | — |
| `assemblyLine` | 🔩 Producción en cadena | core | Edad Industrial | todas | 250 hierro, 100 carbón, 150 oro | ✔ Integrado | ✔ | — | Desbloquea: Ametralladora · Cambia el coste de rifleman, fieldGun, gatlingGun | Permite entrenar: Ametralladora. | — |
| `bessemerSteel` | 🛡️ Acero Bessemer | core | Edad Industrial | todas | 250 hierro, 150 carbón | ✔ Integrado | ✔ | — | armorMelee +1: musketeer, cannon, dragoon y 24 más · armorPierce +1: musketeer, cannon, dragoon y 24 más | Requiere antes: Máquina de vapor. | — |
| `railway` | 🚂 Ferrocarril | core | Edad Industrial | todas | 250 madera, 150 oro, 100 hierro | ✔ Integrado | ✔ | — | carryCapacity +5: villager · speed ×1.15: villager | — | — |
| `selfStrengthening` | 🏭 Autofortalecimiento | core | Edad Industrial | China | 150 hierro, 150 oro | ✔ Integrado | ✔ | — | attack +1: musketeer, dragoon, grenadier y 17 más · trainTime ×0.85: rifleman, fieldGun, regionalRifleman | — | — |
| `corpsSystem` | 🎖️ Sistema de cuerpos | core | Edad Industrial | Francia | 300 alimento, 100 hierro, 200 oro | ✔ Integrado | ✔ | — | attack +1: militia, manAtArms, longSwordsman y 32 más · hp ×1.1: militia, manAtArms, longSwordsman y 32 más | — | — |
| `interchangeableParts` | 🔩 Intercambiabilidad de piezas | core | Edad Industrial | Británicos | 150 hierro, 100 carbón, 100 oro | ✔ Integrado | ✔ | — | Recolección de Hierro ×1.1 · Recolección de Carbón ×1.1 · reloadTime ×0.95: musketeer, dragoon, grenadier y 17 más | — | — |
| `irrigation` | 💧 Regadío | core | Edad Oscura | Persia | 150 alimento, 50 oro | ✔ Integrado | ✔ | — | Recolección de Alimento ×1.1 | — | — |
| `iqta` | 📜 Iqta | core | Edad Feudal | Persia | 200 alimento, 100 oro | ✔ Integrado | ✔ | — | Cambia el coste de militia, manAtArms, longSwordsman y 50 más | — | — |
| `astronomy` | 🌙 Astronomía | core | Edad de los Castillos | Persia | 250 alimento, 200 oro | ✔ Integrado | ✔ | — | los +1: villager, militia, manAtArms y 79 más · Cambia el coste de feudalAge, castleAge, imperialAge y 88 más | — | — |
| `silkMonopoly` | 🧵 Monopolio de la seda | core | Edad Imperial | Persia | 300 alimento, 250 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.1 | — | — |
| `mobileWarfare` | 🐫 Guerra móvil | core | Edad de la Pólvora | Persia | 400 alimento, 250 oro | ✔ Integrado | ✔ | — | speed ×1.1: scoutCavalry, lightCavalry, knight y 18 más · hp ×1.1: scoutCavalry, lightCavalry, knight y 18 más | — | — |
| `nizamJadid` | 🎖️ Nizam-i Jadid | core | Edad Industrial | Persia | 300 alimento, 100 hierro, 150 oro | ✔ Integrado | ✔ | — | armorMelee +1: militia, manAtArms, longSwordsman y 32 más · armorPierce +1: militia, manAtArms, longSwordsman y 32 más · trainTime ×0.85: militia, manAtArms, longSwordsman y 32 más | — | — |
| `axumCoinage` | 🪙 Moneda de Axum | core | Edad Oscura | Etiopía | 100 alimento, 50 oro | ✔ Integrado | ✔ | — | Recolección de Oro ×1.1 | — | — |
| `prestorJohn` | ✝️ Prestes Juan | core | Edad Feudal | Etiopía | 200 alimento, 100 oro | ✔ Integrado | ✔ | — | hp ×1.1: townCenter, house, mill y 57 más | — | — |
| `itinerantCourt` | 🏕️ Corte itinerante | core | Edad de los Castillos | Etiopía | 250 alimento, 100 oro | ✔ Integrado | ✔ | — | speed ×1.1: villager · trainTime ×0.9: villager | — | — |
| `portugueseAlliance` | 🤝 Alianza portuguesa | core | Edad Imperial | Etiopía | 400 alimento, 350 oro | ✔ Integrado | ✔ | — | attack +1: musketeer, dragoon, grenadier y 17 más · range +1: musketeer, dragoon, grenadier y 17 más | — | — |
| `horseBreeding` | 🐴 Cría de caballos | core | Edad de la Pólvora | Etiopía | 300 alimento, 150 oro | ✔ Integrado | ✔ | — | hp ×1.1: scoutCavalry, lightCavalry, knight y 18 más · speed ×1.05: scoutCavalry, lightCavalry, knight y 18 más | — | — |
| `armsImport` | 📦 Importación de armas | core | Edad Industrial | Etiopía | 300 alimento, 250 oro | ✔ Integrado | ✔ | — | Cambia el coste de musketeer, cannon, dragoon y 24 más | — | — |
| `up_cappedRam` | 🪵 Ariete cubierto | core | Edad Imperial | todas | 300 madera, 200 oro | ✔ Integrado | ✔ | — | Mejora Ariete → Ariete cubierto | — | — |
| `up_trebuchet` | 🏗️ Trabuquete | core | Edad Imperial | todas | 400 madera, 300 oro | ✔ Integrado | ✔ | — | Mejora Catapulta → Trabuquete | Desbloquea: Bombarda. | — |
| `up_heavyScorpion` | 🏹 Escorpión pesado | core | Edad Imperial | todas | 250 madera, 200 oro | ✔ Integrado | ✔ | — | Mejora Escorpión → Escorpión pesado | — | — |
| `up_bombard` | 💣 Bombarda | core | Edad de la Pólvora | todas | 300 alimento, 450 oro | ✔ Integrado | ✔ | — | Mejora Trabuquete → Bombarda | Requiere antes: Trabuquete. · Desbloquea: Obús. | — |
| `up_howitzer` | 💥 Obús | core | Edad Industrial | todas | 250 hierro, 150 carbón, 250 oro | ✔ Integrado | ✔ | — | Mejora Bombarda → Obús | Requiere antes: Bombarda. | — |
| `up_fieldGun` | 💣 Cañón de campaña | core | Edad Industrial | todas | 200 hierro, 100 carbón, 150 oro | ✔ Integrado | ✔ | — | Mejora Cañón → Cañón de campaña | — | — |
| `caravanserai` | 🛖 Caravasar | core | Edad de los Castillos | todas | 100 madera, 200 oro | ✔ Integrado | ✔ | — | — | Desbloquea: Casas de cambio. | — |
| `counterespionage` | 🔍 Contraespionaje | core | Edad de los Castillos | todas | 150 oro | ⚠ Sin usar | ✔ | — | — | — | No tiene efectos. |
| `bankingHouses` | 💱 Casas de cambio | core | Edad de la Pólvora | todas | 350 oro | ✔ Integrado | ✔ | — | — | Requiere antes: Caravasar. | — |
| `ironTusks` | 🦣 Colmillos de hierro | extra-content | Edad de los Castillos | Persia, Etiopía | 300 alimento, 200 oro | ✔ Integrado | ✔ | — | attack +4: warElephant · speed ×1.1: warElephant | — | — |

## 🪙 Recursos (6)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `food` | Alimento | core | — | todas | — | ✔ Integrado | — | — | Lo producen: Arbusto de bayas, Ciervo abatido, Jabalí abatido, Oveja sacrificada y 1 más · Lo gastan 126 elementos (Aldeano, Milicia, Hombre de armas y 123 más) | Limita 126 elementos del juego: es una restricción de ritmo y de estrategia. | — |
| `wood` | Madera | core | — | todas | — | ✔ Integrado | — | — | Lo producen: Árbol, Pino, Pino nevado · Lo gastan 103 elementos (Lancero, Piquero, Arquero y 100 más) | Limita 103 elementos del juego: es una restricción de ritmo y de estrategia. | — |
| `gold` | Oro | core | — | todas | — | ✔ Integrado | — | — | Lo producen: Mina de oro, Cofre del tesoro, Marcha a Siberia, Billete jiaozi y 3 más · Lo gastan 145 elementos (Milicia, Hombre de armas, Espadachín de mandoble y 142 más) | Limita 145 elementos del juego: es una restricción de ritmo y de estrategia. | — |
| `stone` | Piedra | core | — | todas | — | ✔ Integrado | — | — | Lo producen: Cantera de piedra · Lo gastan 44 elementos (Centro urbano, Torre de vigilancia, Castillo y 41 más) | Limita 44 elementos del juego: es una restricción de ritmo y de estrategia. | — |
| `iron` | Hierro | core | Edad Industrial | todas | — | ✔ Integrado | — | — | Lo producen: Mina de hierro · Lo gastan 30 elementos (Fusilero, Cañón de campaña, Ametralladora y 27 más) | Limita 30 elementos del juego: es una restricción de ritmo y de estrategia. · Obliga a llegar a Edad Industrial para empezar a recogerlo. | — |
| `coal` | Carbón | core | Edad Industrial | todas | — | ✔ Integrado | — | — | Lo producen: Mina de carbón · Lo gastan 13 elementos (Cañón de campaña, Ametralladora, Biplano y 10 más) | Limita 13 elementos del juego: es una restricción de ritmo y de estrategia. · Obliga a llegar a Edad Industrial para empezar a recogerlo. | — |

## 🌲 Nodos del mapa (12)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tree` | 🌳 Árbol | core | — | todas | — | ✔ Integrado | — | imagen | Se reparte junto a cada base · Da 100 de Madera | — | — |
| `pineTree` | 🌲 Pino | core | — | todas | — | ✔ Integrado | — | imagen | Lo coloca un generador de mapas · Da 100 de Madera | — | — |
| `snowPine` | 🌲 Pino nevado | core | — | todas | — | ✔ Integrado | — | imagen | Lo coloca un generador de mapas · Da 100 de Madera | — | — |
| `goldMine` | 🪙 Mina de oro | core | — | todas | — | ✔ Integrado | — | imagen | Se reparte junto a cada base · Da 800 de Oro | — | — |
| `stoneMine` | 🪨 Cantera de piedra | core | — | todas | — | ✔ Integrado | — | imagen | Se reparte junto a cada base · Da 350 de Piedra | — | — |
| `ironMine` | ⛓️ Mina de hierro | core | — | todas | — | ✔ Integrado | — | procedural | Se reparte junto a cada base · Da 700 de Hierro | — | — |
| `coalMine` | ⚫ Mina de carbón | core | — | todas | — | ✔ Integrado | — | procedural | Se reparte junto a cada base · Da 700 de Carbón | — | — |
| `berries` | 🫐 Arbusto de bayas | core | — | todas | — | ✔ Integrado | — | imagen | Se reparte junto a cada base · Da 125 de Alimento | — | — |
| `deerCarcass` | 🍖 Ciervo abatido | core | — | todas | — | ✔ Integrado | — | procedural | Cadáver de un animal · Da 100 de Alimento | — | — |
| `boarCarcass` | 🍖 Jabalí abatido | core | — | todas | — | ✔ Integrado | — | procedural | Cadáver de un animal · Da 340 de Alimento | — | — |
| `sheepCarcass` | 🍖 Oveja sacrificada | core | — | todas | — | ✔ Integrado | — | procedural | Cadáver de un animal · Da 100 de Alimento | — | — |
| `treasure` | 💰 Cofre del tesoro | treasure-hunt | — | todas | — | ✔ Integrado | — | procedural | Da 150 de Oro | — | Ningún generador de mapas ni animal lo coloca. · Nota: Lo reparte el mod Búsqueda del tesoro al empezar la partida, no los generadores de mapas. |

## ⚡ Poderes (10)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hordeTribute` | 🕊️ Tributo a la Horda | core | Edad de los Castillos | Rusia | 300 oro | ✔ Integrado | ✔ | — | Disponible desde Edad de los Castillos hasta Edad de los Castillos · Enfriamiento 420 s | Se lanza con la orden de mod «power»; el enfriamiento es de 420 s. · Solo para: Rusia. | — |
| `treasureFleet` | ⛵ Flota del Tesoro | core | Edad Imperial | China | 250 oro | ✔ Integrado | ✔ | — | Disponible desde Edad Imperial · Enfriamiento 360 s | Se lanza con la orden de mod «power»; el enfriamiento es de 360 s. · Solo para: China. | — |
| `credit` | 🏦 Crédito | core | Edad de la Pólvora | Británicos | — | ✔ Integrado | ✔ | — | Disponible desde Edad de la Pólvora · Enfriamiento 420 s | Se lanza con la orden de mod «power»; el enfriamiento es de 420 s. · Solo para: Británicos. | — |
| `scorchedEarth` | 🔥 Tierra quemada | core | Edad de la Pólvora | Rusia | — | ✔ Integrado | ✔ | — | Disponible desde Edad de la Pólvora · Enfriamiento 300 s · Se lanza sobre un punto del mapa | Se lanza con la orden de mod «power»; el enfriamiento es de 300 s. · Solo para: Rusia. | — |
| `levy` | 📯 Leva en masa | core | Edad de la Pólvora | Francia | — | ✔ Integrado | ✔ | — | Disponible desde Edad de la Pólvora · Enfriamiento 300 s | Se lanza con la orden de mod «power»; el enfriamiento es de 300 s. · Solo para: Francia. | — |
| `foreignLegion` | 🎖️ Legión Extranjera | core | Edad Industrial | Francia | 500 oro | ✔ Integrado | ✔ | — | Disponible desde Edad Industrial · Enfriamiento 420 s | Se lanza con la orden de mod «power»; el enfriamiento es de 420 s. · Solo para: Francia. | — |
| `greatPlunder` | 💰 Gran Saqueo | core | Edad de los Castillos | Persia | — | ✔ Integrado | ✔ | — | Disponible desde Edad de los Castillos hasta Edad Imperial · Enfriamiento 420 s | Se lanza con la orden de mod «power»; el enfriamiento es de 420 s. · Solo para: Persia. | — |
| `bazaar` | 🏺 Bazar | core | Edad Imperial | Persia | 300 alimento | ✔ Integrado | ✔ | — | Disponible desde Edad Imperial · Enfriamiento 240 s | Se lanza con la orden de mod «power»; el enfriamiento es de 240 s. · Solo para: Persia. | — |
| `resistance` | 🛡️ Resistencia | core | Edad Imperial | Etiopía | — | ✔ Integrado | ✔ | — | Disponible desde Edad Imperial · Enfriamiento 360 s | Se lanza con la orden de mod «power»; el enfriamiento es de 360 s. · Solo para: Etiopía. | — |
| `nagarit` | 🥁 Nagarit | core | Edad Industrial | Etiopía | — | ✔ Integrado | ✔ | — | Disponible desde Edad Industrial · Enfriamiento 600 s | Se lanza con la orden de mod «power»; el enfriamiento es de 600 s. · Solo para: Etiopía. | — |

## 🚩 Civilizaciones (6)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `britain` | 🚩 Británicos | core | — | Británicos | — | ✔ Integrado | — | — | 3 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Arquero de tiro largo, Fyrdman, Caballero normando, Arcabucero Tudor y 3 más · Edificios propios: Burh, Castillo de mota, Castillo concéntrico, Banco y 1 más · Tecnologías propias: 6 · Poderes: Crédito | Sus unidades únicas definen su estilo de ejército: Arquero de tiro largo, Fyrdman, Caballero normando, Arcabucero Tudor y 3 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |
| `france` | 🚩 Francia | core | — | Francia | — | ✔ Integrado | — | — | 3 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Guerrero franco, Caballero cruzado, Gendarme, Arcabucero de la ordenanza y 4 más · Edificios propios: Villa real, Catedral gótica, Bastida, Château y 3 más · Tecnologías propias: 9 · Poderes: Leva en masa, Legión Extranjera | Sus unidades únicas definen su estilo de ejército: Guerrero franco, Caballero cruzado, Gendarme, Arcabucero de la ordenanza y 4 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |
| `rus` | 🚩 Rusia | core | — | Rusia | — | ✔ Integrado | — | — | 2 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Druzhinnik, Hijo de boyardo, Strelets, Cosaco y 4 más · Edificios propios: Gorodishche, Monasterio-fortaleza, Kremlin de piedra, Ostrog y 2 más · Tecnologías propias: 2 · Poderes: Tributo a la Horda, Tierra quemada | Sus unidades únicas definen su estilo de ejército: Druzhinnik, Hijo de boyardo, Strelets, Cosaco y 4 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |
| `china` | 🚩 China | core | — | China | — | ✔ Integrado | — | — | 2 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Fubing, Lancero de fuego, Ballestero de repetición, Trabuquete de contrapeso y 3 más · Edificios propios: Granero estatal, Casa de moneda, Gran Canal, Ciudad Prohibida y 2 más · Tecnologías propias: 7 · Poderes: Flota del Tesoro | Sus unidades únicas definen su estilo de ejército: Fubing, Lancero de fuego, Ballestero de repetición, Trabuquete de contrapeso y 3 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |
| `persia` | 🚩 Persia | core | — | Persia | — | ✔ Integrado | — | — | 2 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Savaran, Ghulam, Arquero a caballo timúrida, Elefante timúrida y 6 más · Edificios propios: Qanat, Caravasar, Observatorio de Maragha, Maidan y 2 más · Tecnologías propias: 7 · Poderes: Gran Saqueo, Bazar | Sus unidades únicas definen su estilo de ejército: Savaran, Ghulam, Arquero a caballo timúrida, Elefante timúrida y 6 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |
| `ethiopia` | 🚩 Etiopía | core | — | Etiopía | — | ✔ Integrado | — | — | 2 bonos permanentes · Identidad por eras: Edad Oscura, Edad Feudal, Edad de los Castillos, Edad Imperial, Edad de la Pólvora, Edad Industrial · Unidades propias: Guerrero axumita, Guardia de Lalibela, Soldado real, Mosquetero etíope-portugués y 4 más · Edificios propios: Estela, Iglesia rupestre, Katama, Castillo de Gondar y 2 más · Tecnologías propias: 7 · Poderes: Resistencia, Nagarit | Sus unidades únicas definen su estilo de ejército: Guerrero axumita, Guardia de Lalibela, Soldado real, Mosquetero etíope-portugués y 4 más. · Cambia de nombre y de bonos con la era: la partida larga cuenta su historia. | — |

## 🏆 Victorias (3)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `conquest` | 🏆 Conquista | core | — | todas | — | ✔ Integrado | — | — | Se puede elegir al preparar la partida | — | — |
| `suddenDeath` | 🏆 Muerte súbita | core | — | todas | — | ✔ Integrado | — | — | Se puede elegir al preparar la partida | — | — |
| `regicide` | 🏆 Matar al rey | regicide | — | todas | — | ✔ Integrado | — | — | Se puede elegir al preparar la partida | — | — |

## 🗺️ Terrenos (9)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `grass` | 🗺️ Hierba | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `dirt` | 🗺️ Tierra | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `forest` | 🗺️ Suelo de bosque | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `sand` | 🗺️ Arena | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `water` | 🗺️ Agua | core | — | todas | — | ✔ Integrado | — | — | Intransitable · No se puede construir · Agua animada | — | — |
| `shallows` | 🗺️ Vado | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · No se puede construir · Agua animada | — | — |
| `desert` | 🗺️ Desierto | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `snow` | 🗺️ Nieve | core | — | todas | — | ✔ Integrado | — | — | Se puede caminar · Se puede construir | — | — |
| `rock` | 🗺️ Roca | core | — | todas | — | ✔ Integrado | — | — | Intransitable · No se puede construir | — | — |

## ⚙️ Motor y mods (44)

| Id | Nombre | Mod | Edad | Civilizaciones | Coste | Estado | IA | Arte | Qué hace | Implicaciones | Qué le falta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `order-move` | ⚙️ Orden «move» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-attack` | ⚙️ Orden «attack» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-attackMove` | ⚙️ Orden «attackMove» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-explore` | ⚙️ Orden «explore» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-formation` | ⚙️ Orden «formation» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-gather` | ⚙️ Orden «gather» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-build` | ⚙️ Orden «build» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-garrison` | ⚙️ Orden «garrison» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-retaliate` | ⚙️ Orden «retaliate» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-trade` | ⚙️ Orden «trade» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `order-spy` | ⚙️ Orden «spy» | core | — | todas | — | ✔ Integrado | — | — | Orden de unidad | — | — |
| `system-playerStats` | ⚙️ Sistema «playerStats» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-powers` | ⚙️ Sistema «powers» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-diplomacy` | ⚙️ Sistema «diplomacy» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-ai` | ⚙️ Sistema «ai» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-wildlife` | ⚙️ Sistema «wildlife» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-formations` | ⚙️ Sistema «formations» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-orders` | ⚙️ Sistema «orders» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-movement` | ⚙️ Sistema «movement» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-production` | ⚙️ Sistema «production» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-aura` | ⚙️ Sistema «aura» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-espionage` | ⚙️ Sistema «espionage» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-combat` | ⚙️ Sistema «combat» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-vision` | ⚙️ Sistema «vision» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-declared-war` | ⚙️ Sistema «declared-war» | declared-war | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-regicide` | ⚙️ Sistema «regicide» | regicide | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-victory` | ⚙️ Sistema «victory» | core | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `system-treasure-hunt` | ⚙️ Sistema «treasure-hunt» | treasure-hunt | — | todas | — | ✔ Integrado | — | — | Sistema de la simulación | — | — |
| `net-power` | ⚙️ Orden de red «power» | core | — | todas | — | ✔ Integrado | — | — | Orden de jugador | — | — |
| `net-trade` | ⚙️ Orden de red «trade» | core | — | todas | — | ✔ Integrado | — | — | Orden de jugador | — | — |
| `net-spy` | ⚙️ Orden de red «spy» | core | — | todas | — | ✔ Integrado | — | — | Orden de jugador | — | — |
| `net-diplo` | ⚙️ Orden de red «diplo» | core | — | todas | — | ✔ Integrado | — | — | Orden de jugador | — | — |
| `net-declare-war` | ⚙️ Orden de red «declare-war» | declared-war | — | todas | — | ✔ Integrado | — | — | Orden de jugador | — | — |
| `ai-gunpowder` | ⚙️ IA: gunpowder | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-siege` | ⚙️ IA: siege | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-powers` | ⚙️ IA: powers | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-trade` | ⚙️ IA: trade | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-diplomacy` | ⚙️ IA: diplomacy | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-spies` | ⚙️ IA: spies | core | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-declared-war` | ⚙️ IA: declared-war | declared-war | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `ai-regicide` | ⚙️ IA: regicide | regicide | — | todas | — | ✔ Integrado | — | — | Extensión de la IA | — | — |
| `panel-diplomacy` | ⚙️ Panel «diplomacy» | core | — | todas | — | ✔ Integrado | — | — | Panel de interfaz | — | — |
| `panel-declared-war` | ⚙️ Panel «declared-war» | declared-war | — | todas | — | ✔ Integrado | — | — | Panel de interfaz | — | — |
| `panel-regicide` | ⚙️ Panel «regicide» | regicide | — | todas | — | ✔ Integrado | — | — | Panel de interfaz | — | — |
