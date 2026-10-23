# Civilizaciones que evolucionan con las eras (diseño)

Estado: **diseño aprobado. Fase 1 (cimientos del motor y Rusia en las eras 0–3), fase 2 (era 4 Pólvora; China, Francia y Gran Bretaña en las eras 0–4) y fase 3 (poderes activos y doctrinas excluyentes; el mar se aplaza) hechas, ver `docs/decisiones.md`; el resto, pendiente.** Decidido: opción A de §2b (8 eras, la 6 se llama **Contemporánea** y la 7 es el **Futuro próximo**). Decisiones ya tomadas por el usuario: **el juego debe llegar a la era Contemporánea** (7 eras, sin recortar) y **se añade la línea británica, que termina en EE. UU. como potencia actual** (§5.6). Todo lo marcado con 🔶 es especulativo o discutible (decisión de diseño, no hecho histórico). Los hechos históricos están elegidos para ser comprobables; ante la duda se ha preferido omitir.

## 1. La idea

Hoy una civilización es fija (`CivDef`: unos pocos bonos y una unidad única). La propuesta: **seis linajes históricos cuya identidad cambia al subir de era**. Al pasar de Feudal a Castillos, los rusos dejan de ser «Rus de Kiev» y pasan a ser «Principado de Moscú», con otros bonos, otra unidad única y otro estilo, reflejando a los actores que dominaron cada momento de ese linaje.

Principios de diseño:

1. **Cada era conserva un núcleo y añade/sustituye una capa.** Un linaje tiene un *eje permanente* (geografía, forma de jugar) y *capas por era*. Así el jugador siente continuidad y no empieza de cero cada vez.
2. **No es solo una carrera.** Subir de era da acceso a más cosas, pero (a) cada civilización tiene un *pico* en una era concreta, (b) las unidades de eras anteriores siguen siendo útiles por coste/mantenimiento, (c) hay decisiones excluyentes («doctrinas») al cambiar de era y (d) mecánicas que premian algo distinto a ir más rápido (comercio, diplomacia, territorio, resistencia).
3. **Rigor sin estereotipos.** Cada civilización se define por instituciones y hechos concretos (sistemas fiscales, formas de reclutar, rutas, tecnologías), no por «carácter nacional». Las eras recientes son políticamente sensibles: el juego modela *mecánicas* (planificación, exportación de recursos, guerrilla), no juicios.
4. **Datos en mods, no ifs en el motor** (como pide CLAUDE.md): todo se expresa con `Registry`; los pocos huecos del motor se listan en §8.

## 2. Las eras

Hoy: Oscura, Feudal, Castillos, Imperial (índices 0–3, `src/mods/core/world.ts`). Propuesta de **7 eras** (🔶 los nombres y los cortes son revisables; los años son orientativos y *distintos para cada civilización*: lo que importa es el orden):

| # | Era | Años orientativos | Notas |
| --- | --- | --- | --- |
| 0 | Oscura | c. 500–1000 | Ya existe |
| 1 | Feudal | c. 1000–1250 | Ya existe |
| 2 | Castillos | c. 1250–1450 | Ya existe |
| 3 | Imperial | c. 1450–1650 | Ya existe. Primeras armas de fuego, grandes estados centralizados |
| 4 | **Pólvora** (nueva) | c. 1650–1800 | Ejércitos permanentes, fortalezas abaluartadas, mosquete con bayoneta, mercantilismo |
| 5 | **Industrial** (nueva) | c. 1800–1914 | Fusil, artillería de campaña, ferrocarril, carbón y hierro |
| 6 | **Contemporánea** (nueva) | c. 1914–hoy | Motor, petróleo, blindados, aviación; aquí se ofrece un *giro* (§7) |

Alternativas: (a) 6 eras, fundiendo Pólvora en Imperial; (b) 8 eras, partiendo la Contemporánea en «Guerras mundiales» (1914–1945) y «Contemporánea» (1945–hoy). **Decidido: 7 eras, llegando a la Contemporánea.** Se reservaría la Contemporánea para 2–3 unidades muy potentes en vez de cubrir toda la tecnología del siglo XX. Aviación, armas nucleares y espionaje **se incluirán más adelante** (decisión del usuario, §8b); la ciberguerra queda fuera.

## 2b. Árbol de edificios y tecnologías propuesto por el usuario (8 eras)

El usuario aportó su propio esquema de **8 eras** con edificios y tecnologías por era (Prehistoria, Antigüedad, Clásica, Medieval, Moderna, Industrial, Contemporánea, Futuro próximo). Se integra aquí como **el esqueleto de contenido común** sobre el que se colocan las civilizaciones: lo de cada era lo tienen todas, y la identidad de cada civilización (§5) se suma encima con sus únicos.

### Cómo casa con el juego actual y con las 7 eras de §2

El juego ya tiene Oscura, Feudal, Castillos e Imperial (equivalentes a la Edad Media y el inicio de la Moderna del esquema). Hay dos formas de encajarlo (🔶 decisión del usuario, §11):

| Opción | Eras del juego | Comentario |
| --- | --- | --- |
| **A (recomendada)** | 0 Oscura · 1 Feudal · 2 Castillos · 3 Imperial · 4 Pólvora · 5 Industrial · 6 Moderna (=«Contemporánea» del esquema) · **7 Futuro próximo** | Sin tocar lo existente. Prehistoria, Antigüedad y Clásica no son eras: sus edificios y tecnologías (granja, cantera, molino, mina, mercado, muralla, biblioteca, banco, puerto, astillero…) se reparten entre Oscura–Imperial, como en AoE2 |
| **B** | 0 Prehistoria · 1 Antigüedad · 2 Clásica · 3 Medieval(Oscura→Feudal→Castillos como subetapas) · 4 Moderna(Imperial+Pólvora) · 5 Industrial · 6 Contemporánea · 7 Futuro | Fiel al esquema, pero obliga a rehacer la base actual y a inventar tres eras anteriores a todos los linajes de §5 (las civilizaciones tendrían una identidad genérica «tribal» en las primeras) |

Opción A: añade solo una era nueva sobre §2 (Futuro). Las civilizaciones **dejan de cambiar de identidad en el Futuro próximo** (se fija la última identidad; en esa era mandan la tecnología y los edificios comunes). 🔶

### Reparto del esquema del usuario (opción A)

| Era del juego | Del esquema del usuario | Notas |
| --- | --- | --- |
| 0 Oscura | Granja, vivienda, molino, cantera; tecnologías de fuego (comida) y herramientas de piedra (recolección) → renombradas «Dominio del fuego» y «Herramientas» | Base del juego ya hecha |
| 1 Feudal | Mina (oro y cobre), granja ganadera, **mercado**, muralla, templo; Agricultura, Metalurgia del bronce, Escritura | El **mercado** es la puerta del comercio (§8) |
| 2 Castillos | Carretera, **biblioteca**, **banco**, **puerto comercial**, astillero, taller de asedio; Ingeniería, Arquitectura, Moneda, Matemáticas, Feudalismo | Donde el esquema coloca la base económica «clásica» |
| 3 Imperial | Castillo, torre, muralla fortificada, gremio, **universidad**, taller de pólvora, taller de asedio avanzado; Armadura, Pólvora, Arquitectura gótica | Ya parcialmente existe (castillo, asedio) |
| 4 Pólvora | «Moderna» del esquema: astillero oceánico, fortaleza, fábrica de pólvora, **imprenta**, observatorio, mina profunda (hierro), **compañía comercial**; Imprenta, Navegación oceánica, Cartografía, Metalurgia avanzada | «Moderna» en la historiografía hispana = 1492–1789, coincide con Pólvora |
| 5 Industrial | Fábrica, estación de ferrocarril, **refinería**, laboratorio, fábrica de armas, búnker, **aeródromo**; Máquina de vapor, Electricidad, Motor de combustión, Producción en cadena, Aviación | Aquí aparece la primera aviación (coincide con §8b) |
| 6 Moderna (=Contemporánea) | Refinería petrolífera, **central nuclear**, fábrica de automóviles, laboratorio avanzado, centro de comunicaciones, base aérea, puerto militar; Electrónica, Radar, Cohetería, **Energía nuclear**, Computación | Radar = «detecta unidades ocultas» (contraespionaje y aviones, §8b); Energía nuclear abre las armas nucleares |
| 7 Futuro próximo | Centro de IA, fábrica de robots, centro de drones, laboratorio de nanotecnología, reactor de fusión, mina de tierras raras, centro espacial, centro de mando cuántico; IA, Robótica, Drones, Fusión, Nanotecnología, Computación cuántica | Especulativo; ver advertencia abajo |

### Observaciones y conflictos a resolver

1. **Nombre «Moderna»:** en el esquema significa la Edad Moderna historiográfica (1492–1789), mientras que en §2 «Moderna» es el siglo XX. En el juego, para evitar confusión: *Pólvora* (o «Moderna temprana») y *Contemporánea*. Se propone renombrar la era 6 como **Contemporánea** y retirar el nombre «Moderna». Los textos de este documento que digan «Moderna» se leerán como «Contemporánea» si se acepta.
2. **Aviones aparecen en tres eras** del esquema (placeholders): se propone Aeródromo y primeras aeronaves en Industrial, y base aérea y reactores en Contemporánea. Con ello se alinea con §8b.
3. **Recursos nuevos** que el esquema implica: cobre, hierro, **petróleo**, **energía** y **tierras raras**. Petróleo, hierro y cobre son nodos de recurso como el oro (datos). La **energía** (central nuclear, reactor de fusión) es distinta: no se recolecta, la *producen edificios* y se consume. Requiere un sistema de producción/consumo de recurso por edificio (🔶 verificar si el motor actual lo admite; si no, un sistema nuevo con `save()`/`load()`).
4. **Edificios que dan información** (observatorio, centro de comunicaciones, radar, satélites, centro de IA): se apoyan en visión compartida/ampliada y ya anticipan el espionaje de §8b.
5. **Edificios que automatizan** (centro de IA, fábrica de robots, drones): afectan a la producción automática y a la IA; ojo con la determinismo en red y con el coste en tick. Riesgo alto; dejar para el final.
6. **Volumen:** el esquema son ~60 edificios y ~55 tecnologías además de las unidades de las civilizaciones. Es contenido de muchas semanas; conviene hacerlo **por eras, en orden**, probando cada era con `npm run simulate`.
7. **Dos ejes que no hay que mezclar:** (a) el *árbol común* de edificios y tecnologías (este §2b) y (b) la *identidad de civilización* por era (§5). Cada civilización añade a (a) sus unidades únicas, un edificio único y tecnologías únicas por era; y modifica costes y bonos de (a).

## 3. Elección de las civilizaciones

Criterios: (1) *continuidad de linaje* documentable durante 1.500 años o más (aunque cambie de dinastía/régimen); (2) variedad geográfica; (3) variedad de estilo de juego; (4) que cada era tenga una identidad reconocible y diferenciada; (5) que cubran los puntos de extensión que queremos probar (comercio, diplomacia, terreno).

| Línea | Región | Eje de juego | Por qué esta |
| --- | --- | --- | --- |
| **Rus → Rusia** (la pedida) | Europa oriental / Eurasia | Resistencia, territorio, masa tardía | Linaje claro y muy conocido; ocupa un espacio enorme con inviernos duros y economía de bosque/pieles |
| **China** (Tang → Song → Ming → Qing → China moderna) | Asia oriental | Economía y tecnología precoz, defensa y masa de disparo | El mayor linaje continuo; innovación temprana (pólvora, papel moneda) que invierte la narrativa «Occidente adelantado» |
| **Francia** (francos → Francia) | Europa occidental | Élite montada → fortificación y artillería → movilización | Linaje continuo; encaja con la actual «Francos» del juego; pasa de caballería a ingeniería a ejército de masas |
| **Persia / Irán** (sasánidas → … → Irán) | Oriente Medio y Asia central | Comercio, movilidad, arquero a caballo, recurso energético | Encrucijada de rutas; hace de banco de pruebas del comercio y de «petróleo» |
| **Etiopía** (Axum → Zagüe → Salomónica → Etiopía) | Cuerno de África | Defensa en altura, movilización, remontada | Estado cristiano de larga continuidad, uno de los dos estados africanos no colonizados; juega con el relieve (que el motor ya modela) y con la compra de tecnología |
| **Británicos → EE. UU.** (pedida) | Isla atlántica → Norteamérica | Poder naval, crédito y logística; arqueros → líneas de mosquete → proyección global | Cierra el juego con la superpotencia actual; ver el matiz del «traspaso» en §5.6 |

Alternativas razonadas (sin descartar nada, 🔶 a elegir con el usuario):

- **Mediterráneo:** el linaje romano → bizantino → Venecia → Italia tiene *rupturas fuertes* (no es un linaje único); por eso se propone en su lugar **Francia** para Europa occidental. Candidatos si se quiere más Mediterráneo: *Península Ibérica* (visigodos → Castilla/Aragón → España), o *Italia/Venecia* como civilización mercantil marítima.
- **Japón** (Yamato → Heian → Kamakura/Sengoku → Edo → Meiji → Japón): linaje excelente y estilo muy distinto (cambio brusco de reglas con la Restauración Meiji 1868). Primera candidata a sexta civilización.
- **Turcos** (göktürk → selyúcidas → otomanos → Turquía): comparte espacio con Persia; fuerte en artillería e infantería de élite (jenízaros).
- **India** (Gupta → sultanatos → mogoles → Raj → India): economía agrícola y comercial enorme; riesgo de cubrir demasiados periodos coloniales.
- **África occidental** (Ghana → Mali → Songhai → …): comercio transahariano muy rico en la Edad Media, pero el linaje se *rompe* en la era de la pólvora (conquista marroquí de Songhai, 1591) y la colonización. Se podría hacer una civilización «de ciclo corto» (eras 0–4).
- **Américas:** mexicas y andinos (incas) tienen gran interés, pero su linaje se *interrumpe* hacia la era 3 por la conquista y no hay una continuación comparable. Opciones: civilizaciones «de ciclo corto» (eras 0–3), o un linaje que *cambia de actor* (p. ej. Mesoamérica → Nueva España → México; 🔶 requiere tratar con cuidado la conquista). EE. UU. solo existiría desde la era 4 (civilización de «inicio tardío»).
- **Civilizaciones actuales** (Británicos, Francos, Godos, Mongoles): Británicos se absorben en la nueva línea británica → EE. UU. (decidido), Francos → Francia. **Godos y Mongoles se eliminan (decidido).** Las unidades y contenido existentes de ambos (huscarle, mangudai, etc.) pueden reutilizarse como piezas de otras líneas o de eventos futuros.

## 4. Convenciones de lectura

Cada civilización tiene: una **tabla de línea de eras** (identidad, frase que la define, bonos/poderes, únicos), su **estilo de juego**, **puntos fuertes/débiles/contraataque** y **cómo cambia al transitar de era**. Los nombres entre «» son nombres de juego propuestos. Los números de bonificación son *indicativos* (se afinarán con `npm run simulate`).

Tipos de atributo:
- **Pasivo**: bono permanente mientras dura la era (modificador de civilización).
- **Activo**: poder con enfriamiento que lanza el jugador (orden de mod con `NetCommand`).
- **Único**: unidad, edificio o tecnología exclusivos (`civs: [...]`).
- Los bonos de cada era *se acumulan con los de las anteriores, salvo los marcados como «sustituye»*.

---

## 5. Las civilizaciones

### 5.1 Rus → Rusia (eslavos orientales)

**Eje permanente:** mucho territorio y bosque, economía lenta al principio y fuerte en la defensa en profundidad, ejércitos de masa y logística. Recursos propios: madera barata, pieles (caza que da oro) y, después, hierro y energía.

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Eslavos orientales y Rus' de Kiev** (s. IX–X; Oleg unifica Nóvgorod y Kiev hacia 882) | Comerciantes-guerreros de los ríos | Pasivo: la caza da oro además de comida (las pieles eran un producto de exportación clave). Pasivo: madera y barcos fluviales ligeros más baratos | U: **Druzhinnik** (hombre de la druzhina, guardia armada del príncipe; hacha y escudo). E: **Gorodishche** (poblado fortificado de madera y tierra) |
| 1 Feudal | **Rus' de Kiev cristiana** (bautismo de Vladimiro 988; Yaroslav el Sabio; fragmentación en principados desde mediados s. XII) | Principados hermanos que se disputan Kiev | Pasivo: edificios religiosos dan aura de curación/«moral» (iglesia y monasterio). Poder pasivo: pueden fundarse *aldeas hermanas* (un segundo centro urbano barato) pero cada una consume lealtad 🔶 | T: **Russkaya Pravda** (primer código legal escrito de la Rus': reduce costes de mercado/comercio). E: **Monasterio-fortaleza** |
| 2 Castillos | **Principado de Moscú** bajo la Horda de Oro (Aleksandr Nevski y el lago Peipus 1242; Iván I «Kalitá» recoge el tributo; Kulikovo 1380; fin del «yugo» en 1480) | Reunir las tierras mientras se paga el tributo | Pasivo: recaudador de tributo: +oro por cada aldea y edificio religioso 🔶. Pasivo: caballería ligera barata (influjo de la steppe). Activo «**Tributo a la Horda**» 🔶: pagar oro para que ningún enemigo de la estepa ataque durante X minutos (mecánica de diplomacia) | U: **Hijo de boyardo** (caballería pesada de servicio señorial). E: **Kremlin de piedra** (centro urbano fortificado; el de Moscú se rehízo en piedra con arquitectos italianos hacia 1485–95) |
| 3 Imperial | **Zarato ruso** (Iván IV, coronación 1547; Kazán 1552, Astracán 1556; los cosacos de Yermak cruzan a Siberia a partir de 1581) | Imperio terrestre y de frontera | Pasivo: puestos fortificados (ostrog) de madera más baratos y con alcance mayor. Pasivo: territorio conquistado da recursos (pieles/oro). Sustituye: el tributo a la Horda desaparece | U: **Strelets** (arcabucero permanente, creados en 1550), **Cosaco** (jinete fronterizo). E: **Ostrog**. T: **Marcha a Siberia** (+visión y pieles) |
| 4 Pólvora | **Imperio ruso** (Pedro I, 1721; Poltava 1709; San Petersburgo; reclutamiento por quintas desde 1705; Catalina II) | Occidentalización forzada y ejército regular | Pasivo: reclutamiento por «quintas» (levas): unidades de infantería de línea muy baratas pero con menos entrenamiento. Pasivo: astillero y artillería baratos | U: **Granadero** de línea, **Unicornio** (obús ligero, Shuválov, años 1750). E: **Academia de ingenieros** y **Almirantazgo** |
| 5 Industrial | **Imperio ruso industrializándose** (1812; emancipación de los siervos 1861; Transiberiano 1891–1916) | Países enormes, ferrocarriles largos | Activo «**Tierra quemada**» (doctrina de repliegue de Barclay de Tolly y Kutúzov en 1812: destruye tus propios cultivos y almacenes en una zona para frenar el avance enemigo). Pasivo: ferrocarril baratea el movimiento de recursos entre ciudades | U: **Fusilero de la guardia**, **Cosaco del Don** (regular). E: **Maravilla: Transiberiano** (conecta centros urbanos: transporte instantáneo de recursos) |
| 6 Contemporánea | **Giro (🔶 elegir al pasar de era):** **URSS** (1922–1991) o **Rusia posterior a 1991** | Producción en masa planificada, o potencia exportadora de energía | **URSS:** planes quinquenales (primero 1928): +producción en masa, costes bajos, bono por trasladar fábricas lejos del frente (evacuación industrial de 1941, hecho real). **Rusia:** exportaciones de gas y petróleo dan oro; ejército profesional más pequeño y de calidad. (Ambos pasivos excluyentes) | U: **T-34** (carro medio), **Katiusha** (lanzacohetes múltiple BM-13). E: **Kombinat** (planta industrial) |

**Estilo.** Arranca lento (aldeanos baratos pero sin bonos de comida), invierte en defensa profunda y *se hace fuerte cuanto más se alarga la partida o más territorio ocupa*. Gana peleas largas por desgaste, mucho oro por caza/pieles. **Fuertes:** defensa, masa barata, recursos de bosque, recuperación. **Débiles:** apertura lenta; poca élite en Castillos; vulnerable al hostigamiento rápido a distancia en las primeras eras. **Contraataque natural:** la caballería de arqueros (como Persia y mongoles) y una presión temprana antes de que se asiente. **Contra quién es fuerte:** ejércitos de élite pequeños (Francia en Castillos) que no pueden mantener la presión.

**Transiciones.** Se conserva: bosque, pieles, castillo/kremlin y bono de masa. Se sustituye: la unidad de élite (druzhinnik → hijo de boyardo → strelets → granadero → fusilero → T-34), la fuente de oro (pieles → tributo → territorio → exportación) y la economía de lealtad de los principados (desaparece con el estado unificado).

---

### 5.2 China (linaje dinástico)

**Eje permanente:** economía de granjas masiva y estatal, tecnología precoz y barata, defensa con murallas y tiradores a distancia. Recursos propios: alimento (arroz), seda/porcelana (comercio).

**Nota de rigor:** el «linaje» es de *civilización-estado* (sucesión de dinastías y regímenes), no de una sola casa gobernante. Los periodos de dominio extranjero (Yuan mongol, Qing manchú) son parte del territorio y de la administración china; se presentan como *cambios de élite*, no como ruptura.

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Sui-Tang** (581/618–907) | Reunificación con granero estatal | Pasivo: «**campos iguales**» (juntian, redistribución de tierra a las familias): granjas con más rendimiento al inicio. Pasivo: soldado-labrador (el sistema *fubing* tang): infantería barata que también puede trabajar la tierra 🔶 | U: **Fubing** (milicia campesina). E: **Granero estatal** (graneros «de nivelación»: guarda comida y ofrece compra/venta). T: **Exámenes imperiales** (keju; reduce el coste de investigación de la civilización) |
| 1 Feudal | **Song del Norte** (960–1127) | Papel moneda y primer fuego | Pasivo: tecnologías más baratas. Pasivo: arroz de Champa (introducido en 1012): granjas más productivas. Primera aparición de armas de pólvora, aún poco fiables (históricamente ya en el s. X–XI) | U: **Lancero de fuego** (huoqiang, «lanza de fuego»: tubo de pólvora en una lanza; muy corto alcance). E: **Casa de moneda** (billete jiaozi, Sichuan, s. XI: convierte excedente en oro). T: **Arroz de Champa** |
| 2 Castillos | **Song del Sur y China bajo los Yuan** (1127–1368) 🔶 | Marina y asedio con ingenieros de todo el mundo | Pasivo: barcos de ruedas de paletas (se usaron en el Yangtsé, 1161). Pasivo: el trabuquete de contrapeso llegó a China con ingenieros del mundo musulmán (asedio de Xiangyang, 1273): asedio más barato y bono de ingeniería extranjera | U: **Ballestero de repetición**, **Trabuquete de contrapeso**. E: **Gran Canal** (mejora el transporte entre ciudades; el canal se completó bajo los Yuan). T: **Bomba trueno** (zhentianlei, 1231) |
| 3 Imperial | **Ming** (1368–1644) | Muralla, tesoro y arcabuz | Pasivo: murallas y torres con +PV (la actual Gran Muralla se debe en gran parte a los Ming). Pasivo: formaciones (Qi Jiguang, «pato mandarín», s. XVI) dan bonos a cuadros mixtos de lanza y arcabuz. Activo «**Flota del Tesoro**»: las expediciones de Zheng He (1405–33) 🔶 dan una racha de oro por diplomacia con jugadores amistosos | U: **Arcabucero de las divisiones divinas** (Shenjiying). E: **Ciudad Prohibida** (capital 1420: centro urbano único que da prestigio) y **Muralla grande**. T: **Pato mandarín** |
| 4 Pólvora | **Qing en su apogeo** (1644–1800; Ocho Banderas; conquista de Zungaria 1750s) | Estado manchú-chino y comercio por un solo puerto | Pasivo: unidades montadas de las Banderas. Pasivo: el sistema de Cantón (desde 1757 solo Cantón admitía el comercio exterior) 🔶: un puerto de comercio exclusivo da mucho oro pero solo uno | U: **Jinete de las Ocho Banderas**. E: **Hong de Cantón** (gremio mercantil autorizado). T: **Cantón** |
| 5 Industrial | **Qing tardío y primera república** (1839–1912) | Autofortalecimiento bajo presión | Pasivo: ejércitos regionales (Xiang, Huai, Zeng Guofan y Li Hongzhang) = unidades baratas y numerosas. Penalización de partida: tratados desiguales tras las guerras del opio (1839–42, 1856–60) reducen los ingresos de ciertos recursos, pero otorgan una tecnología gratuita 🔶. Arsenales (Jiangnan, 1865) dan bono de producción | U: **Fusilero de ejército regional**. E: **Arsenal** y **Astillero Fuzhou** (1866). T: **Autofortalecimiento** |
| 6 Contemporánea | **China moderna** (1912–hoy; reformas desde 1978; zonas económicas especiales, p. ej. Shenzhen 1980) | Taller del mundo | Pasivo: producción en masa y comercio abundante: unidades baratas, bono por tener varios centros comerciales. Pasivo: exportaciones (el comercio da mucho más oro) | U: **Infantería mecanizada**, **Carro ligero**. E: **Zona económica especial**. T: **Reforma y apertura** |

**Estilo.** Economía masiva muy temprana, ejército de tiradores protegidos por murallas, pocas ofensivas rápidas. Gana por superioridad de recursos y tecnología barata. **Fuertes:** economía, defensa de ciudades, asedio y arqueros, tecnologías. **Débiles:** movilidad (necesita zonas cercanas defendibles), reacción ante incursiones de caballería; las eras 4–5 la ponen a la defensiva. **Contraataque natural:** caballería de arqueros hostigadora y raids a las granjas. **Contra:** ejércitos lentos y poco móviles.

**Transiciones.** Se conserva: granjas y bono de coste de tecnología, arsenal/murallas. Se sustituye: la unidad (lancero de fuego → ballesta → arcabuz → bandera → fusil regional → mecanizada), la fuente de oro (moneda → canal → flota → Cantón → … → exportación) y las murallas pasan a ser menos relevantes en la era 6.

---

### 5.3 Francia (francos → Francia)

**Eje permanente:** centralización progresiva del poder: caballería de élite → ingeniería de fortificación y artillería → movilización de masas. Recursos propios: alimento (agricultura), oro (impuestos).

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Francos** (merovingios 481–751, carolingios 751–987; Carlos Martel en Poitiers 732; Carlomagno emperador 800) | Reino de guerreros y monjes | Pasivo: infantería con hacha arrojadiza (la *francisca*). Pasivo: los condes administran (missi dominici): centros urbanos cuestan menos y dan más población | U: **Guerrero franco** (hacha arrojadiza y lanza). E: **Palacio de Aquisgrán / villa real** (recauda comida). T: **Capitulares** |
| 1 Feudal | **Francia capeta** (987–1223; cruzadas: los musulmanes llamaban «francos» a todos los cruzados; abadía de Cluny; catedrales góticas desde Saint-Denis, h. 1140) | Caballería y catedrales | Pasivo: caballeros más baratos y con más PV. Pasivo: catedral y abadía generan oro/fe | U: **Caballero cruzado**. E: **Catedral gótica**. T: **Carta urbana** |
| 2 Castillos | **Francia medieval tardía** (Felipe IV; guerra de los Cien Años 1337–1453; Juana de Arco 1429; ordenanzas de Carlos VII 1439, primeras compañías permanentes; artillería de los Bureau en Formigny 1450 y Castillon 1453) | De la caballería feudal al ejército permanente | Pasivo: compañías de ordenanza: unidades reclutadas con coste de oro pero sin población extra (🔶). Aura de héroe: **Juana de Arco** como General especial (utiliza la mecánica del General existente) | U: **Gendarme** (hombre de armas de las compañías de ordenanza). E: **Bastida** (ciudad fortificada nueva del s. XIII). T: **Taille** |
| 3 Imperial | **Renacimiento francés** (Francisco I; Marignano 1515; guerras de religión 1562–98; ordenanza de Villers-Cotterêts 1539) | Castillos de recreo y guerras de religión | Pasivo: más oro por centros urbanos y edificios cívicos (burocracia). Pasivo: mercenarios suizos y lansquenetes contratables con oro (se usaron de forma real) | U: **Arcabucero de la ordenanza**. E: **Château** (casa-fortaleza renacentista). T: **Contratar mercenarios** |
| 4 Pólvora | **Antiguo Régimen** (Luis XIV 1643–1715; Colbert; Vauban 1633–1707; reforma de la artillería de Gribeauval 1765) | Fortalezas, manufacturas y artillería estandarizada | Pasivo: **fortalezas abaluartadas** (Vauban) con +PV y más alcance; asedio con trincheras que baratea ataque a edificios. Pasivo: manufacturas reales (Colbert): bono de comercio. Pasivo: artillería estándar (Gribeauval) barata | U: **Fusilero con bayoneta**, **Cañón de campaña**. E: **Fortaleza de Vauban**, **Manufactura real**. T: **Colbertismo** |
| 5 Industrial | **Revolución y Napoleón, luego la República** (levée en masse 1793; Grande Armée y sistema de cuerpos; École Polytechnique 1794; Legión Extranjera 1831) | La nación en armas | Pasivo: «**levée en masse**»: gran cantidad de infantería barata en momentos de apuro (activo con enfriamiento). Pasivo: sistema de cuerpos (formaciones con bono de moral). Activo: **Legión Extranjera** (contratar tropas con oro) | U: **Voluntario / Guardia Vieja** (élite), **Artillería de campaña**. E: **École Polytechnique** (tecnología). T: **Sistema de cuerpos** |
| 6 Contemporánea | **Francia del s. XX** (Primera Guerra Mundial; carro Renault FT 1917; V República 1958; disuasión propia, 🔶 opcional) | Independencia estratégica | Pasivo: tecnología y diseño propios (menos dependencia de comercio: costes bajos de investigar). Pasivo: ejército profesional con unidades caras pero resistentes | U: **Carro ligero Renault FT**, **Legionario**. E: **Arsenal moderno**. T: **Independencia estratégica** |

**Estilo.** Élite primero (caballeros), después fortalezas y artillería, finalmente masa. **Fuertes:** unidades de élite, fortalezas, oro por burocracia, artillería. **Débiles:** economía lenta de comida antes de la era 3; unidades caras. **Contraataque natural:** ejércitos de masa barata (Rus, China) y hostigamiento rápido. **Contra:** civilizaciones de pocos efectivos o que dependen de arqueros sin armadura.

**Transiciones.** Se conserva: bono de caballería de élite y la burocracia. Se sustituye: la caballería deja de ser el eje (ahora lo es la artillería); las fortalezas dejan de ser el centro en la era 5 (movilidad), y el oro pasa de impuestos a manufactura y mercenarios.

---

### 5.4 Persia / Irán

**Eje permanente:** encrucijada de rutas comerciales, caballería y arquero a caballo, uso de recursos del subsuelo (agua por qanat, luego petróleo), ciudades-oasis. Recursos propios: comercio y, desde la era 6, **petróleo**.

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Persia sasánida** (224–651) | Jinetes acorazados y regadío | Pasivo: caballería pesada acorazada (savaran) con más armadura. Pasivo: **qanat** (galería subterránea de agua): las granjas junto a un qanat no se agotan (las del sasánida) | U: **Savaran** (catafracto), **Elefante de guerra**. E: **Qanat**, **Templo del fuego** (aura de curación). T: **Regadío** |
| 1 Feudal | **Irán islámico: samánidas, ghaznavíes, selyúcidas** (875–1194; Ferdowsi y el *Shahnameh* c. 1010; Nizam al-Mulk y las madrazas Nizamiyya) | Burocracia persa, ejércitos turcos | Pasivo: soldados esclavos (*ghulam*) como unidad profesional. Pasivo: iqta (tierra a cambio de servicio) abarata el mantenimiento 🔶. Pasivo: caravasares dan oro por tránsito de caravanas | U: **Ghulam**. E: **Caravasar** (posada de ruta; selyúcida), **Madrasa Nizamiyya** (tecnología). T: **Iqta** |
| 2 Castillos | **Ilkanato y Timúridas** (Hulagu 1256; Rashid al-Din; observatorio de Maragha 1259; Tamerlán 1370–1405; Ulug Beg en Samarcanda) | Ciencia, conquista y mecenazgo | Pasivo: observatorio reduce el coste de investigación. Pasivo: arqueros a caballo con alcance extra. Activo «**Gran Saqueo**» 🔶: botín al derrotar a ciudades | U: **Arquero a caballo timúrida**, **Elefante timúrida** (se usaron en Delhi 1398). E: **Observatorio**. T: **Astronomía** |
| 3 Imperial | **Safávidas** (1501–1736; Shah Abbas I 1588–1629; Isfahán capital 1598; New Julfa armenia) | Estado persa-chií centralizado con mosquetes | Pasivo: *qizilbash* (caballería tribal) y *ghulam* georgianos/armenios del shah, **tofangchi** (mosqueteros) y **topchi** (artilleros). Pasivo: monopolio de la seda: más oro por comercio. Activo: «**Bazar**» (mejora comercio) | U: **Qizilbash**, **Tofangchi**. E: **Maidan** (plaza real: aura económica), **Bazar**. T: **Monopolio de la seda** |
| 4 Pólvora | **Afsháridas, zand y primeros qayar** (Nader Shah 1736–47, saqueo de Delhi 1739) | Guerra móvil de caballería y camellos | Pasivo: unidades móviles: ejército muy veloz. Pasivo: **zamburak** (arma giratoria sobre camello) | U: **Zamburakchi** (camello con cañón giratorio). E: **Ordu** (campamento nómada). T: **Guerra móvil** |
| 5 Industrial | **Persia qayar** (guerras ruso-persas 1804–28; Amir Kabir, Dar ul-Funun 1851; Brigada Cosaca persa 1879; revolución constitucional 1905–11; petróleo de Masjed Soleymán 1908) | Entre dos imperios | Pasivo: «Gran Juego»: tiene una zona de amortiguación; pueden comprar tecnologías con oro. Penalización: **concesiones** (concesión del tabaco 1890; contratos petrolíferos) 🔶: parte del oro se escapa | U: **Sarbaz** (infantería regular), **Cosaco persa**. E: **Dar ul-Funun** (escuela politécnica). T: **Nizam-i Jadid / reformas** |
| 6 Contemporánea | **Irán del s. XX** (dinastía Pahlavi 1925–1979, nacionalización del petróleo 1951, fundación de la OPEP 1960, guerra Irán-Irak 1980–88) | Recurso estratégico | Pasivo: **petróleo** da mucho oro (+) y combustible a vehículos. Poder: boicot/embargo | U: **Camión blindado**, **Misil táctico** 🔶. E: **Refinería**. T: **Nacionalización** |

**Estilo.** Economía de tránsito (cuanto más largas las rutas, más oro) y ejército muy móvil, con poder de superioridad local. **Fuertes:** movilidad, comercio, jinetes. **Débiles:** infantería pesada, defensa estática, dependencia de rutas; vulnerable a asedio. **Contraataque natural:** raids a caravanas y a la economía; infantería de masa. **Contra:** defensas lentas (China, Francia en fortaleza) a las que puede evitar.

**Transiciones.** Se conserva: la caballería rápida y las rutas. Se sustituye: la infantería profesional (ghulam → qizilbash → tofangchi → sarbaz), la base económica (regadío → caravasar → seda → petróleo).

---

### 5.5 Etiopía

**Eje permanente:** montañas, comunidad cristiana, movilización masiva con una sola orden y compra de tecnología exterior; **nunca fue colonizada** (con la excepción de la ocupación italiana de 1936–41, que acabó con la liberación). Recursos propios: ganado, grano en altura, café (🔶 recurso de comercio).

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Reino de Axum** (s. I–X; Ezana cristianiza 330s; puerto de Adulis; acuña moneda) | Puerto del mar Rojo y estelas | Pasivo: comercio marítimo por mar Rojo. Pasivo: las estelas dan prestigio. Pasivo: acuñación de moneda propia | U: **Guerrero axumita**, **Elefante de guerra** (se usaron). E: **Estela** (monumento: aura). T: **Moneda de Axum** |
| 1 Feudal | **Dinastía Zagüe** (c. 1137–1270; Lalibela y sus iglesias excavadas en roca) | Iglesias en la roca | Pasivo: unidades en terreno alto con ventaja extra (usa `heightRules`). Pasivo: edificios excavados (iglesia rupestre) no se pueden destruir por asedio 🔶 | U: **Guardia de Lalibela** 🔶. E: **Iglesia rupestre** (edificio en cima de roca). T: **Prestes Juan** 🔶 (leyenda europea del reino cristiano en África) |
| 2 Castillos | **Dinastía salomónica** (1270; Amda Seyon I 1314–44; Zara Yaqob 1434–68; delegación al Concilio de Florencia 1441) | Reino cristiano rodeado | Pasivo: **katama** (corte itinerante): el centro urbano puede plegarse y moverse 🔶 (punto de extensión). Pasivo: corte móvil cobra tributo en ganado/grano | U: **Soldado real (chewa)** 🔶. E: **Katama** (campamento real). T: **Corte itinerante** |
| 3 Imperial | **Guerras de Adal y llegada de portugueses** (Ahmad Gragn 1529–43; 400 mosqueteros portugueses al mando de Cristóvão da Gama, 1541; Gondar fundada en 1636 por Fasilides) | Recuperar el reino con fusil prestado | Pasivo: alianza con Portugal: mosqueteros contratables con oro. Poder: «**Resistencia**»: tropas defensivas ganan armadura cuando el centro urbano sufre daño | U: **Mosquetero etíope-portugués**. E: **Castillo de Gondar** (Fasil Ghebbi). T: **Alianza portuguesa** |
| 4 Pólvora | **Gondar y la era de los príncipes** (Zemene Mesafint 1769–1855) | Señores regionales y caballería de las tierras bajas | Pasivo: señores regionales (ras) con ejércitos semiautónomos (bono de reclutamiento pero sin controlar toda la economía) 🔶. Pasivo: caballería oromo | U: **Jinete oromo**. E: **Palacio del ras**. T: **Cría de caballos** |
| 5 Industrial | **Tewodros II y Menelik II** (1855–1913; Magdala 1868; Addis Abeba 1886; Adwa 1896) | Modernizar sin ser conquistado | Activo «**Nagarit**»: la llamada de guerra (el tambor del emperador): movilización instantánea de una gran milicia (única vez por era). Pasivo: compra tecnologías y armas a otras potencias (más baratas con alianzas). Pasivo: ferrocarril de Yibuti a Addis Abeba (iniciado 1894) | U: **Fusilero shewano** (Menelik adquirió fusiles Remington, Gras y Berthier), **Artillería de montaña**. E: **Ferrocarril**. T: **Importación de armas** |
| 6 Contemporánea | **Etiopía del s. XX** (Haile Selassie 1930–74; invasión italiana 1935–41; Organización de la Unidad Africana en Addis Abeba, 1963; Derg 1974–91) | Resistencia y diplomacia | Pasivo: resistencia: más fuerza cuanto más territorio se pierda («patriotas»/*arbegnoch* contra la ocupación). Pasivo: diplomacia: aliados dan bono de comercio | U: **Patriota (arbegnoch)** (guerrilla), **Carro ligero**. E: **Sede diplomática** (Addis Abeba). T: **Organización de la Unidad Africana** |

**Estilo.** Defensa en las alturas con remontada y movilización, y dependencia de tecnología comprada. **Fuertes:** terreno elevado, remontadas, milicias baratas, diplomacia. **Débiles:** pocas fuentes de oro; el comercio es limitado; poca élite propia. **Contraataque natural:** asedio y artillería a distancia, ataque a la corte móvil. **Contra:** ejércitos que dependen de la llanura o atacar en grupos dispersos.

**Transiciones.** Se conserva: el relieve como ventaja, la movilización y el bono defensivo. Se sustituye: la unidad (guardia → chewa → mosquetero → fusilero → patriota), la economía (puerto → corte → alianza → compras).

---

### 5.6 Británicos → Estados Unidos

**Matiz de rigor (importante).** Inglaterra/Reino Unido y EE. UU. no son un linaje de Estado continuo como los otros: EE. UU. nace en 1776 de una ruptura con Gran Bretaña. Lo que sí hay es una **continuidad de tradición** (derecho común, instituciones representativas, lengua, finanzas y poder marítimo anglófonos) y un **relevo del liderazgo mundial** (Gran Bretaña hasta 1914–45, EE. UU. después; el sistema de Bretton Woods de 1944 lo escenifica). El juego lo modela como un **traspaso de testigo** 🔶: al llegar a la era Contemporánea el jugador pasa de la identidad británica a la americana, conservando los pilares (mar, crédito, logística) y cambiando el resto. Se evita presentar a EE. UU. como «heredero natural» o juzgar su papel: es una mecánica.

**Eje permanente:** poder naval y comercio marítimo, **crédito** (financiación de la guerra mediante deuda y banca: Banco de Inglaterra 1694) y logística a larga distancia. Economía de mercado con comercio; ejército pequeño y de calidad antes de la era 5.

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Anglosajones** (Alfredo de Wessex, 871–899; red de *burhs* fortificados; la *fyrd* o leva; Danelaw) | Resistir con ciudades fortificadas | Pasivo: *burhs* (muros y torres de madera baratos). Pasivo: *fyrd*: milicia de aldeanos que aparece al ser atacada una aldea | U: **Fyrdman** (milicia), **Thegn** (guerrero de élite local). E: **Burh**. T: **Reforma de Alfredo** |
| 1 Feudal | **Inglaterra normanda y angevina** (Hastings 1066; Domesday Book 1086; Magna Carta 1215) | Castillos de piedra y administración | Pasivo: castillos más baratos; censo (Domesday) = más oro por aldea. Pasivo: caballería normanda | U: **Caballero normando**. E: **Castillo de motte-and-bailey** (castillo de mota). T: **Domesday** |
| 2 Castillos | **Inglaterra Plantagenet** (Eduardo I y los castillos de Gales; arco largo en Crécy 1346 y Agincourt 1415; Parlamento) | El arco largo | Pasivo: arqueros +alcance (el bono actual de Británicos). Pasivo: centros urbanos más baratos | U: **Arquero de tiro largo** (existente). E: **Castillo concéntrico**. T: **Arco largo de tejo** |
| 3 Imperial | **Inglaterra Tudor** (Armada española derrotada en 1588; East India Company 1600; astilleros reales) | Surge la marina | Pasivo: barcos más baratos; compañías con carta real (comercio marítimo). Primer galeón artillado | U: **Galeón** (marina), **Arcabucero Tudor**. E: **Astillero real**. T: **Carta de compañía** |
| 4 Pólvora | **Gran Bretaña** (Unión de 1707; Banco de Inglaterra 1694; guerra de los Siete Años 1756–63) + **Trece Colonias** (milicia colonial) | Estado fiscal-militar | Pasivo: **crédito**: pedir oro prestado a devolver con interés 🔶. Pasivo: la Royal Navy bloquea puertos rivales. Pasivo (colonias): milicia local barata | U: **Casaca roja** (infantería de línea con mosquete Brown Bess), **Fragata**. E: **Banco**. T: **Deuda nacional** |
| 5 Industrial | **Reino Unido** (carbón y hierro; ferrocarril; *Pax Britannica*) y **EE. UU. emergente** (guerra de Secesión 1861–65; ferrocarril transcontinental 1869) | El taller del mundo y el continente que se hace | Pasivo: carbón y hierro con bono de recolección; ferrocarril baratea transporte. Pasivo: la guerra de Secesión es la primera guerra industrial: producción en masa de fusiles (fusil estriado) y buques acorazados | U: **Fusilero Enfield**, **Tirador (rifleman)**, **Acorazado de casco de hierro**. E: **Fábrica**, **Ferrocarril transcontinental** (Maravilla). T: **Intercambiabilidad de piezas** |
| 6 Contemporánea | **Estados Unidos como superpotencia** (Primera y Segunda Guerra Mundial; *Lend-Lease* 1941; Bretton Woods 1944; Plan Marshall 1948) | Arsenal de las democracias | Sustituye: bonos de crédito ahora son **ayuda a aliados** (enviar recursos a un aliado le da bono de lealtad) y logística global. Pasivo: producción en masa de vehículos (cadena de montaje); petróleo propio | U: **Carro Sherman**, **Infantería de marina (Marine)**, **Ranger**. E: **Arsenal** (producción en masa), **Base avanzada** (puerto logístico). T: **Préstamo y arriendo** (Lend-Lease), **Plan Marshall** |

**Estilo.** Economía de mercado y crédito, ejército pequeño en la era 3 y gran capacidad de proyección. **Fuertes:** mar, crédito, logística; unidades a distancia. **Débiles:** infantería pesada poco numerosa; la deuda se vuelve un lastre si pierde guerras (el crédito debe devolverse). **Contraataque natural:** caballería rápida y raids en la era 2–3, masas baratas (Rusia, China) en eras 4–5. **Contra quién:** civilizaciones que dependen de rutas terrestres.

**Transiciones.** Se conserva: mar, crédito/comercio y logística. Se sustituye: la unidad (fyrdman → caballero normando → arquero → casaca roja → fusilero → marine/Sherman) y la fuente de oro (aldeas → colonias → banco → industria → ayuda y petróleo). El **traspaso** a EE. UU. conserva el mar y el crédito pero los convierte en logística global y ayuda a aliados.

---

## 6. Tabla comparativa

| | Rus → Rusia | China | Francia | Persia / Irán | Etiopía | Británicos → EE. UU. |
| --- | --- | --- | --- | --- | --- | --- |
| Región | Eurasia norte | Asia oriental | Europa occidental | Oriente Medio | Cuerno de África | Isla atlántica → Norteamérica |
| Eje | Desgaste y masa | Economía y tecnología | Élite → artillería → masa | Comercio y movilidad | Altura y remontada | Mar, crédito, logística |
| Apertura | Lenta | Rápida (granjas) | Media | Media (rutas) | Lenta | Media (arqueros) |
| Pico | Eras 4–6 | Eras 1–3 | Eras 2–5 | Eras 3–6 | Eras 2 y 5 | Eras 2 y 6 |
| Oro | Pieles → tributo → exportación | Moneda → Cantón → exportación | Impuestos → manufactura | Caravanas → seda → petróleo | Puerto → corte → alianzas | Aldeas → banco → ayuda y petróleo |
| Fuerte | Defensa, masa | Economía, tiradores | Élite, fortaleza | Movilidad, comercio | Terreno, milicias | Mar, crédito, tiradores |
| Débil | Apertura | Movilidad | Coste | Infantería | Oro | Masa de infantería, deuda |
| Contraataque | Caballería arquera | Caballería hostigadora | Masa barata | Raids al comercio | Asedio a distancia | Caballería y masas baratas |
| Mecánica propia | Tierra quemada | Granero / muralla | Levée / Legión | Rutas / petróleo | Nagarit / katama | Crédito / ayuda a aliados |
| Nueva necesidad del motor | Poderes activos | Ninguna importante | Mercenarios | Comercio | Edificio móvil | Préstamos, marina, ayuda diplomática |

## 7. Transiciones y «doctrinas» (anti-carrera)

Para que subir de era no sea solo «más rápido = mejor»:

1. **Doctrinas excluyentes:** al subir de era, el jugador elige una de dos técnicas (p. ej. Francia en Pólvora: Vauban o Gribeauval; Rusia en Contemporánea: URSS o Rusia posterior a 1991). Requiere una propiedad `excludes` en `TechDef` 🔶 (ver §8).
2. **Mantenimiento:** las unidades de eras superiores cuestan *mantenimiento* de recursos (alimento/oro/petróleo), así que ir deprisa tiene un precio. La actual infraestructura de población puede reutilizarse.
3. **Hitos de era:** además del oro, para avanzar hay que poseer N edificios distintos (la `TechDef` ya tiene `requiresBuildings`).
4. **Pico de civilización:** cada civilización tiene su mejor era (tabla); algunas eligen *quedarse* en una era para aprovecharla.
5. **Era global opcional (🔶):** en un modo «Cronología» el reloj marca la era del mundo, y todos avanzan a la vez; ya no es carrera sino reparto de decisiones.

## 8. Mecánicas transversales (sin rehacer el motor)

| Idea | Descripción | Cómo encaja |
| --- | --- | --- |
| **Comercio** | Mercado + caravana/carro/barco entre dos mercados propios o de aliados; ganancia proporcional a la distancia. Persia/China/Etiopía lo aprovechan de forma distinta | Edificio `market`, unidad `caravan`, **orden nueva `trade`** vía `reg.addOrder`. Rutas visibles con `addWorldOverlay` |
| **Diplomacia** | Estados: guerra / neutral / alianza; tributo; embargo; pacto comercial | El mod `declared-war` ya tiene `addCombatRule` y `addNetCommand`: se generaliza a una tabla de relaciones entre jugadores |
| **Recursos modernos** | Hierro y carbón (Industrial), **petróleo** (Contemporánea), con depósitos en el mapa | `ResourceDef` y `ResourceNodeDef` son datos; el generador de mapas necesita colocarlos (`SetupConfig`) |
| **Mantenimiento** | Las tropas modernas gastan combustible o dinero por minuto | Sistema nuevo vía `reg.addSystem`; guardable con `save()`/`load()` |
| **Victorias alternativas** | Económica (monopolio comercial), cultural (maravillas), diplomática | `reg.addVictory` ya existe |
| **Maravillas** | Una por civilización y era (Transiberiano, Ciudad Prohibida, Maidan…) | Edificios con `maxAlive`, efecto `custom` |
| **Lealtad / legitimidad** 🔶 | Recurso propio del estado (principados rusos, ras etíopes) | Recurso nuevo + sistema; solo si se necesita |
| **Eventos históricos** 🔶 | Sucesos opcionales (invasión mongola, peste…) | Sistema con `game.rng()`, determinista |
| **Estaciones / clima** 🔶 | Invierno que ralentiza (útil para Rusia y la defensa) | Alto coste de balance y renderizado; no recomendable en primeras fases |
| **Edificios móviles** | Katama etíope; Ordu persa | Orden `pack`/`unpack` nueva |

**Futuro previsto por el usuario (no entra en las primeras fases):** aviación, armas nucleares y espionaje. Quedan fuera de ciberguerra y de política interna detallada (partidos, elecciones). Ver §8b.

## 8b. Aviación, armas nucleares y espionaje (planeado, fase posterior)

Todo esto es la parte más cara del motor; se deja diseñado como hueco para no cerrarle la puerta, no para la primera entrega.

| Sistema | Idea | Encaje / hueco del motor |
| --- | --- | --- |
| **Aviación** | Unidades aéreas que ignoran terreno y relieve: caza, bombardero, transporte. Aeródromo como edificio; cuestan combustible (petróleo). Solo atacadas por antiaéreos y otros aviones | Clase `air` en `UnitDef`; el pathfinding las salta (movimiento en línea recta, sin A*); combate con regla `addCombatRule` (quién puede golpear a qué); visión y dibujo sobre las entidades terrestres (capa de render nueva) |
| **Armas nucleares** | Proyecto de varias etapas (investigación + edificio + coste enorme). Efecto: arma de área con enfriamiento largo. Variantes de diseño 🔶: *disuasión* (tenerla impide al rival atacar el centro urbano), *poder activo* limitado, o *amenaza de victoria* | Poder activo vía `addNetCommand`; daño en área; la guerra declarada ya tiene reglas para la paz que se pueden extender; añadir alerta y fin de partida distinto si se usa |
| **Espionaje** | Espías que se infiltran (ven recursos y edificios enemigos, sabotean, roban tecnología, envenenan el suministro, convierten unidades). Contraespionaje. Desde la era 1 en versión simple (mensajeros, informantes) hasta la Contemporánea (agencia) | Unidad `spy` invisible salvo contra contraespionaje (necesita una capa de visión nueva en `vision`); órdenes `infiltrate` y `sabotage`; la niebla de guerra ya existe, lo cual ayuda |

**Decidido: el espionaje existe desde las primeras eras.** Dos vías, escalando con la era:

1. **Agentes convertidos (eras 0–3):** un aldeano o soldado enemigo puede ser *sobornado o convertido* (cuesta oro, tiene probabilidad, y exige un edificio como la taberna/posada o el monasterio) y pasa a ser un **agente doble**: sigue pareciendo del enemigo, pero comparte con su dueño real la visión de lo que ve (su campo de visión se suma al mapa del espía). Puede ser descubierto: al ser inspeccionado o por un contraespionaje (patrulla, torre), vuelve a su dueño o muere. Encaja con la niebla de guerra y la visión actual (`vision`); lo nuevo es un *«propietario de visión»* distinto del propietario de la unidad.
2. **Espías propios (eras 1+):** unidad invisible salvo contra contraespionaje, con órdenes de infiltrar y sabotear. Entre sus acciones:
   - **Robar tecnología:** copiar una tecnología que el enemigo ya tenga y tú no (a coste de un porcentaje y un tiempo; con cooldown), sujeto a edad igual o menor para evitar saltos de era. Efecto: fomenta una carrera tecnológica menos lineal.
   - **Ver recursos y edificios:** información del enemigo.
   - **Sabotear:** retrasar producción, incendiar almacenes (más tarde).
3. **Escalado por era (🔶):** mensajeros e informantes (0–1), espías de corte y agentes de compañía (2–3), servicios de inteligencia y cifrado (4–5), agencias y satélites (6).

**Contrapesos para que no rompa la partida:** probabilidad de fallo, enfriamiento largo, coste en oro, que los conversos puedan ser descubiertos, y contraespionaje barato (el mismo edificio o tecnología que los detecta). Un jugador con espías fuertes debería notarse más lento en la economía.

Cada civilización podría tener su **versión histórica** del espionaje (🔶 y con cuidado): informantes y espías bizantinos del mundo mediterráneo, el sistema postal y de información del Estado chino (*yizhan*), servicios de seguridad de las cortes persas, el *Cabinet Noir* francés del s. XVIII, el Servicio Secreto británico (Walsingham en los Tudor), la Cheka/KGB, la CIA/OSS. Solo hace falta una mecánica común más un par de variantes por civilización.

### 8c. Armas nucleares: opciones de jugabilidad (**decidido: propuesta híbrida**)

El riesgo de un arma nuclear en un RTS es que sea un *botón de ganar*: acaba la partida, anula la defensa y deja de ser interesante. Tres enfoques, con sus problemas:

| Opción | Cómo funciona | Pros | Contras |
| --- | --- | --- | --- |
| **1. Disuasión (pasiva)** | Tener el arsenal no se usa: da un bono (el enemigo no puede atacar tu centro urbano sin pagar un coste; o frena guerras abiertas) | Sin riesgo de «botón de ganar»; encaja con la diplomacia | Poco emocionante; difícil de explicar y de que lo sienta el jugador |
| **2. Poder activo táctico** | Un arma de área con enfriamiento largo; destruye todo en un radio y deja una zona contaminada | Espectacular y fácil de entender | Riesgo de snowball y de partidas decididas por quien llega primero |
| **3. Proyecto de victoria** | Un proyecto largo y visible (como una Maravilla): al completarse ganas, salvo que te lo sabotéen o te destruyan la instalación | Crea un objetivo que obliga a reaccionar; casa con el espionaje | Puede ser monótono; hay que evitar que sea lo único que se haga |

**Propuesta híbrida (aprobada por el usuario; se sigue probando con prototipo):** proyecto en 3 etapas (investigación, instalación, ensamblaje) *visible para los rivales con espías*, que da **un solo misil por vez** y con medidas de contención:
- coste muy alto y mantenimiento de petróleo y energía;
- el misil destruye unidades y edificios en un radio, pero **no los búnkeres ni las maravillas**, y deja contaminación temporal (la zona cuesta recursos recolectar);
- lanzarlo revela la posición del lanzador, y todas las demás civilizaciones reciben una penalización diplomática (embargo) contra el que lo usa;
- contramedidas: tecnología antimisil (Radar + Cohetería) que lo intercepta con probabilidad, búnker y espionaje que ralentiza o roba el proyecto;
- máximo **uno vivo por jugador** (`maxAlive`) y un enfriamiento largo.

Mientras no se decida, **conviene retrasar la implementación** hasta que existan aviación, espionaje y diplomacia, porque las nucleares se apoyan en las tres. Mejor tratar una versión simple como *prototipo descartable* y probar si divierte.

## 9. Traducción al código actual

Estado actual (verificado en el código):

- `CivDef` = `{ id, name, description, bonuses: Effect[], bonusText[] }`. `Game` aplica `civ.bonuses` al crear el jugador con `p.addEffects(civ.bonuses, game)`. Las edades son datos (`AgeDef`) y `Registry.addAge` admite índices nuevos.
- Los modificadores del jugador (`player.modifiers`) **no se guardan**: al cargar se reaplican civilización y tecnologías (decisión del 2026-10-20), así que los bonos por era deben recalcularse desde la edad actual.
- `BaseDef.civs?: string[]` restringe unidades/edificios a civilizaciones; `TechDef.civs` igual. Existe el efecto `upgrade {from, to}` (cambia una unidad por otra), `setsAge` y `requiresBuildings`.
- Órdenes (`reg.addOrder`), sistemas (`reg.addSystem`), reglas de combate, `addNetCommand`, plugins de IA y paneles HUD ya son puntos de extensión.

### Qué se puede hacer con lo que hay (solo datos)

- **Unidades, edificios y tecnologías únicas por era:** `civs: ['rus']` + `age: N`. Las nuevas eras se añaden con `addAge`.
- **La mayoría de bonos:** `stat`, `cost`, `gatherRate`, `grant`.
- **Sustitución de unidad única:** con `upgrade` (druzhinnik → hijo de boyardo, etc.) a través de tecnologías de era.

### Qué requiere un punto de extensión nuevo

| # | Necesidad | Propuesta |
| --- | --- | --- |
| 1 | **Bonos por era** (con sustitución) | `CivDef.eras?: Record<number, { name, description, bonuses, bonusText }>`; y que `Player` los recalcule al cambiar de edad y al cargar una partida. La forma más limpia: `Player.rebuildModifiers()` = civilización + eras ≤ edad actual + tecnologías investigadas, en lugar de añadir encima |
| 2 | **Identidad visible por era** (nombre, icono, color) | Dato de la era en `CivDef`; la interfaz (`HUD`, `StrategyScreen`) muestra el nombre vigente |
| 3 | **Poderes activos** (Tierra quemada, Nagarit, Tributo, Levée) | Cada uno es un `NetCommand` de mod (`reg.addNetCommand`) con enfriamiento guardado en `player.data`; botón por `ui/commandModel.ts` |
| 4 | **Doctrinas excluyentes** | `TechDef.excludes?: string[]`; comprobación en `rules.ts` |
| 5 | **Comercio** | Orden `trade` + edificio y unidad; sistema de rutas |
| 6 | **Relaciones diplomáticas** | Tabla de relaciones entre jugadores (generalización de `declared-war`); la visión y la IA deben respetarla |
| 7 | **Recursos modernos** | Datos en `world.ts` y colocación en `MapGenerator` |
| 8 | **Mantenimiento** | Sistema nuevo con `save()` y `load()` |
| 9 | **Edificios móviles** | Orden `pack`/`unpack` y estado `building.data.packed` |
| 10 | **IA por civilización y era** | `reg.addAIPlugin`: construir/entrenar lo propio de cada civilización y era (hoy la IA asume contenido base) |
| 11 | **Arte** | Sprites e iconos de cada unidad nueva (`src/mods/art/`) y los prompts de `docs/prompts-nano-banana.md` |
| 12 | **Selector de civilizaciones** | Menú: línea de tiempo por civilización (la interfaz móvil también) |

Determinismo: los poderes y el comercio deben usar `fmath`, `game.rng()` y datos guardables. Guardado: subir `SAVE_VERSION` con migración cuando cambie `CivDef`/`player.data`. Balance: números de comercio, mantenimiento y doctrinas en `src/config/balance.ts`.

## 10. Orden de implementación: era por era

**Decidido por el usuario:** producir **una era cada vez**, con todos sus assets y recursos, y sumar la siguiente solo cuando la anterior esté lista. Esto sustituye al plan anterior por «tipo de sistema». Cada era es un «paquete» cerrado y jugable.

### Paquete de una era (definición de «lista»)

1. **Datos:** edificios y tecnologías comunes de la era (§2b), unidades, recursos nuevos de la era y su colocación en el mapa.
2. **Identidad por civilización:** para cada civilización ya incorporada, su capa de esa era (§5): bonos, unidad única, edificio único, tecnología única.
3. **Assets:** iconos, sprites (con imágenes o procedurales), prompts de arte (`docs/prompts-nano-banana.md`), sonidos (`sfx.ts` y `CREDITS.md`).
4. **IA:** que sepa construir e investigar lo de la era (`addAIPlugin` si hace falta).
5. **Interfaz:** nombres y textos en español, interfaz móvil (`commandModel.ts`).
6. **Pruebas:** `npm run build`, `npm test`, `npm run simulate -- 20 arabia 1` llegando a esa era; guardado/carga sin diferencias.
7. **Documentación:** una línea en `docs/decisiones.md`.

### Orden

| Fase | Contenido | Riesgo | Hecho cuando |
| --- | --- | --- | --- |
| **0** | Decisiones del §11 | — | Usuario aprueba el diseño |
| **1** | **Cimientos del motor**, solo lo necesario para la primera era nueva: `CivDef.eras` y recálculo de modificadores (con guardado), `SAVE_VERSION` nuevo (se descartan las partidas antiguas), eliminar Godos y Mongoles, y **Rusia como piloto** limitada a las eras ya existentes (0–3) | Medio | Rusia cambia de identidad de Oscura a Imperial; guardar/cargar iguales |
| **2** | **Era 4 Pólvora** completa (árbol común + Rusia) y primeras civilizaciones nuevas **solo en eras 0–4**: China, Francia, Británicos | Medio | Las 4 civilizaciones llegan a Pólvora con IA |
| **3** | **Poderes activos** y `excludes` (doctrinas), porque la era 4–5 los usa (Tierra quemada, levée) | Medio | Funcionan en red |
| **4** | **Era 5 Industrial** completa: hierro, carbón, ferrocarril, fábrica, aeródromo (aviación básica); Persia y Etiopía entran en eras 0–5 | Alto | Partida a Industrial sin bloqueos |
| **5** | **Comercio, diplomacia y espionaje** (§8, §8b), porque el árbol de Industrial y Contemporánea ya los necesita (mercado y banco existen en eras anteriores; aquí se activan las rutas) | Alto | Funcionan en red y guardado · **HECHA** (ver `docs/decisiones.md`, 2026-10-23) |
| **6** | **Era 6 Contemporánea**: petróleo, energía, central nuclear (sin armas todavía), aviación completa, radar; giro político de Rusia y traspaso EE. UU. | Alto (balance) | Partida completa hasta la 6 |
| **7** | **Armas nucleares** (prototipo descartable, §8c) | Alto | Decidido tras probar si divierte |
| **8** | **Era 7 Futuro próximo** (IA, robots, drones, fusión) | Muy alto | Solo si la 6 es estable |
| **9** | **IA por civilización/era**, victorias alternativas y pulido | Medio | Todas las civilizaciones juegan con la IA |

**Regla para sumar eras:** la era N+1 no se empieza hasta que la N cumpla las siete condiciones del paquete. Las civilizaciones se incorporan **con las eras que ya existen** y completan las siguientes a medida que se hacen (una civilización nueva puede entrar con eras 0–N aunque el juego ya llegue más lejos, y se marca «incompleta» en el selector).

Cada fase se hace en su propia rama (`feat/...`) y pasa `npm run build`, `npm run simulate -- 20 arabia 1` y `npm test`.

## 11. Decisiones que debe tomar el usuario

0. ~~Esquema de 8 eras~~ **Decidido: opción A, la era 6 se llama Contemporánea y la 7 es el Futuro próximo.** Pendiente: ¿las civilizaciones congelan su identidad en el Futuro próximo?

1. ~~Cuántas eras~~ **Decidido: llegar a la Contemporánea (7 eras).** Queda por ver si la Contemporánea se parte en dos (guerras mundiales / contemporánea) y los nombres.
2. **Lista de civilizaciones:** Rus, China, Francia, Persia, Etiopía y Británicos → EE. UU. (decidido). ¿Se añade Japón o Turcos como séptima?
3. ~~Civilizaciones actuales~~ **Decidido:** Británicos → línea británica/EE. UU., Francos → Francia, Godos y Mongoles se eliminan. **Las partidas guardadas con civilizaciones antiguas se descartan (decidido):** basta subir `SAVE_VERSION` sin escribir migración.
3b. **Traspaso británico → EE. UU.:** ¿automático al llegar a la Contemporánea, o el jugador elige en la era 5 entre seguir como Reino Unido o dar el salto a EE. UU.? (Por defecto, automático.)
4. ~~Giro de la era Contemporánea~~ **Decidido: el giro político está bien** (URSS / Rusia posterior a 1991, y los equivalentes de otras civilizaciones). Se modela como mecánicas, sin juicios.
5. ~~Armas nucleares, aviación~~ **Decidido: se incluirán más adelante (fase 7, tras aviación, espionaje y diplomacia) con la propuesta híbrida de §8c.**
6. **Carreras de eras:** ¿doctrinas excluyentes, mantenimiento, era global «Cronología»? ¿Cuál de ellas?
7. **Civilizaciones de ciclo corto** (mexicas, incas, Mali): ¿se admiten civilizaciones que terminan en la era 3 o 4?
8. **Comercio y diplomacia:** ¿son prioridad (fase 5) o se adelantan?
9. ~~Escala del trabajo~~ **Decidido: Rusia como piloto** (fase 2) para validar el sistema de eras antes de las demás.

## 12. Notas de rigor

- Los hechos citados se limitan a fechas y sucesos de amplio consenso; las unidades con 🔶 son extrapolaciones razonables, no unidades documentadas con ese nombre.
- «Zemene Mesafint», «chewa», «Prestes Juan» y los detalles de ciertos reclutamientos (Zagüe, ras) se tratan con prudencia: antes de implementar, contrastar con bibliografía (p. ej. Henze, *Layers of Time*; Mote, *Imperial China*; Daryaee, *Sasanian Persia*; Hellie, *Enserfment and Military Change in Muscovy*; Kennedy, *The Prophet and the Age of the Caliphates*).
- La representación de periodos de dominio extranjero (Yuan, Qing, Horda de Oro, ocupación italiana) no implica valoración: son parte del linaje del territorio.

## 13. Asedio, artillería y blindados por era

Esta sección describe cómo evolucionan las armas pesadas (asedio, artillería y, más adelante, blindados) a lo largo de las eras, qué civilización usa qué y por qué, y cómo se relaciona con el taller de asedio y la IA. Está pensada para quien no conozca el código. Leyenda: ✔ implementado, 🔶 especulativo o pendiente de decidir, ⏳ planeado para la fase 6 (era Contemporánea, aún sin implementar). Todos los valores numéricos son indicativos y viven en `src/mods/core/siege.ts` (asedio), `gunpowder.ts` (era 4) e `industrial.ts` (era 5).

### 13.1 Idea general

- Cada paso de la línea es una **mejora** (`upgrade`) de la unidad anterior, no una unidad aparte: se investiga una vez en un edificio, las unidades que ya existen se convierten y, a partir de ahí, el edificio entrena siempre la versión más moderna. El jugador ve un solo botón por línea («Catapulta», que pasa a llamarse «Trabuquete», «Bombarda»...).
- Hay **dos familias**: el *asedio pesado* (se fabrica en el taller de asedio; sirve para derribar edificios) y la *artillería de campaña* (cañón y sucesores, de la fábrica de pólvora y la fábrica; mueve más y también sirve contra tropas).
- Las civilizaciones comparten el árbol común; lo propio de cada una son **unidades únicas** (§5) que se añaden al árbol, no lo sustituyen.

### 13.2 Línea de evolución por era

| Era | Asedio pesado (taller de asedio) | Artillería de campaña | Notas |
| --- | --- | --- | --- |
| 2 Castillos | ✔ **Ariete** · ✔ **Catapulta** · ✔ **Escorpión** | — | El ariete rompe edificios cuerpo a cuerpo y es casi inmune a flechas. La catapulta lanza piedras con daño de área, imprecisa. El escorpión es una ballesta gigante de tiro tenso |
| 3 Imperial | ✔ **Ariete cubierto** · ✔ **Trabuquete** (mejora de la catapulta) · ✔ **Escorpión pesado** | — | El trabuquete tiene un alcance enorme pero solo ataca edificios por su cuenta |
| 4 Pólvora | ✔ **Bombarda** (mejora del trabuquete) | ✔ **Cañón** (fábrica de pólvora) | La bombarda es el cañón de asedio de tubo corto: destruye edificios desde lejos; el cañón es móvil y también daña tropas |
| 5 Industrial | ✔ **Obús** (mejora de la bombarda, se investiga en la fábrica) | ✔ **Cañón de campaña** (mejora del cañón, en la fábrica) · ✔ Ametralladora (aparte: es arma de infantería) | El obús dispara en trayectoria alta con área grande; el cañón de campaña es de retrocarga y estriado |
| 6 Contemporánea | ⏳ **Blindados**: carro ligero → carro medio → carro pesado (sustituyen al ariete cubierto como rompedores de edificios) | ⏳ Obús autopropulsado · lanzacohetes múltiple · cañón antitanque y antiaéreo | Necesitan petróleo (§8b) |
| 7 Futuro próximo | 🔶 Drones de combate y artillería guiada | 🔶 Misiles tácticos | Solo si se llega a la era 7; especulativo |

**Líneas que acaban:** el escorpión pesado no tiene sucesor (lo sustituyen las armas de fuego: ametralladora e infantería de fusil). El ariete cubierto lo reemplazará el blindado en la fase 6.

### 13.3 Qué civilización usa qué, y por qué

Las unidades **comunes** (ariete, catapulta, escorpión, trabuquete, bombarda, cañón, cañón de campaña, obús) las tienen todas las civilizaciones: el asedio fue universal en el mundo antiguo y medieval, y la artillería de pólvora se difundió por todo el mundo. Lo que cambia entre civilizaciones son las **únicas**, que reflejan una aportación real documentada:

| Civilización | Unidad única de asedio o artillería | Era | Estado | Razón histórica |
| --- | --- | --- | --- | --- |
| China | **Trabuquete de contrapeso** | Castillos | ✔ | Llegó con los ingenieros del mundo musulmán (Xiangyang, 1273). Coexiste con el trabuquete común, que llega después |
| Rusia | **Unicornio** (obús ligero, Academia de ingenieros) | Pólvora | ✔ | Obús de Shuválov, años 1750 |
| Francia | **Cañón Gribeauval** · **Gran Batería** | Pólvora · Industrial | ✔ | Reforma de la artillería de 1765 y la artillería concentrada napoleónica |
| Etiopía | **Artillería de montaña** | Industrial | ✔ | Cañón ligero de Menelik II, más móvil y barato (Adwa, 1896) |
| Rusia | **T-34** (carro medio) · **Katiusha** (lanzacohetes BM-13) | Contemporánea | ⏳ | Producción en masa soviética |
| Francia | **Carro ligero Renault FT** | Contemporánea | ⏳ | Primer carro moderno con torreta giratoria (1917) |
| China | **Carro ligero** · **Infantería mecanizada** | Contemporánea | ⏳ | Taller del mundo |
| Persia | **Camión blindado** · 🔶 **Misil táctico** | Contemporánea | ⏳ | Petróleo y vehículos |
| Etiopía | **Carro ligero** (comprado vía *Importación de armas*) | Contemporánea | ⏳ | Dependencia de tecnología importada |
| Gran Bretaña / EE. UU. | **Sherman** | Contemporánea | ⏳ | Arsenal de las democracias |

**Elefantes de guerra** (coherencia de unidades): solo **Persia** (sasánidas y timúridas, Delhi 1398) y **Etiopía** (Axum) los tienen ✔. Rusia, China, Francia y Gran Bretaña no los usaron y ya no los reciben. Persia conserva además el Elefante timúrida (único del castillo). 🔶 En el diseño de §5 el elefante pertenece a la Edad Oscura; hoy se entrena en la Edad de los Castillos porque el establo exige la Feudal.

### 13.4 Contadores: qué vence a qué

| Unidad | Fuerte contra | Débil contra | Cómo se defiende |
| --- | --- | --- | --- |
| Ariete / ariete cubierto | Edificios (daño enorme); casi inmune a flechas | Infantería y caballería cuerpo a cuerpo; escorpiones | Necesita escolta |
| Catapulta | Edificios y masas de tropas (daño de área) | Imprecisa contra unidades en movimiento; sin defensa cuerpo a cuerpo; caballería rápida | Ninguna: hay que protegerla |
| Escorpión / pesado | Infantería agrupada y asedio (bono contra `siege` e `infantry`) | Casi inútil contra edificios; frágil ante caballería | Poca vida |
| Trabuquete | Castillos, torres y fortalezas desde fuera de su alcance | Muy lento; solo edificios por su cuenta; caballería | Ninguna |
| Bombarda | Edificios y fortalezas (daño altísimo) | Lenta; poco útil contra tropas; caballería | Armadura media |
| Cañón / cañón de campaña | Edificios y tropas a distancia, con algo de área | Caballería y flanqueo; contrabatería de otra artillería | Armadura de pierce |
| Obús | Edificios y masas (área grande) | Caballería rápida y aviación | Armadura de pierce |
| Aviones (era 5) | Artillería y asedio (no pueden golpearles de vuelta cuerpo a cuerpo) | Solo los alcanzan armas a distancia que no sean asedio ni artillería (`airRule`) | — |
| ⏳ Blindados | Infantería y edificios | Cañón antitanque; daño `antiTank` 🔶 | Mucho blindaje contra `pierce` |

Reglas del motor que sostienen la tabla: el daño es *ataque − armadura* más los bonos por clase (`bonus: [{ vs: 'building', ... }]`). Hay dos tipos de daño (`melee`, `pierce`); ⏳ para los blindados se añadirá uno nuevo (`explosive`/`antiTank`) o bonos por clase `armored`.

### 13.5 Cómo funciona en el juego

- **Taller de asedio** (`siegeWorkshop`, desde la Edad de los Castillos, requiere herrería): entrena las unidades de asedio pesado. El botón muestra siempre la versión actual de cada línea. Las mejoras (`up_trebuchet`, `up_bombard`...) se investigan en el mismo taller; la del obús, en la fábrica (era 5), y la del cañón de campaña, también en la fábrica.
- **Fábrica de pólvora** (era 4) entrena el cañón; la **fábrica** (era 5) gestiona sus mejoras.
- **Daño de área:** el proyectil no sigue al blanco, cae donde estaba al disparar (más un error de puntería determinista) y daña a todos los enemigos del radio, algo menos hacia el borde. No hay fuego amigo. Por eso las catapultas fallan contra tropas que se mueven.
- **Clase `antiUnit`:** el asedio con ella elige también tropas por su cuenta (catapulta, escorpiones, toda la artillería); sin ella (ariete, trabuquete, bombarda), solo edificios.
- **IA** (plugin `siege`): con al menos seis tropas mantiene una pieza de asedio por cada tres (máximo `4 + 2×edad`), reparte entre las líneas disponibles con pesos (catapulta y artillería, más; ninguna línea pasa de la mitad), compra las mejoras de las líneas que usa, y no gasta si eso retrasa la edad siguiente o la fábrica clave de la era. La prueba `tests/siege.test.ts` lo verifica.
- **Guardado y red:** los proyectiles de área son datos simples y entran en el guardado y en la huella; no cambia `SAVE_VERSION`.

### 13.6 Pendiente para la fase 6 y después

- ⏳ **Blindados:** *fábrica de automóviles*, carro ligero → medio → pesado; clases `armored`, `siege`, `antiUnit`; petróleo como coste y combustible; `upgrade` desde el ariete cubierto o línea propia.
- ⏳ **Artillería moderna:** obús autopropulsado, lanzacohetes múltiple, cañón antitanque y antiaéreo (apoyado en `airRule`).
- ⏳ **Unidades únicas de §5 de la era 6** (tabla de 13.3): T-34, Katiusha, Renault FT, Infantería mecanizada, Camión blindado, Sherman... Cada una con `civs` propio.
- ⏳ **Tipo de daño nuevo** (`explosive`/`antiTank`) o bonos por `armored`.
- 🔶 **Quitar unidades comunes incoherentes** por civilización (p. ej. Caballero europeo en Persia, China o Etiopía): hoy `CivDef` solo añade. Propuesta: `CivDef.hides`.
- 🔶 **Alcance mínimo** del trabuquete y la bombarda (como en AoE II).
- 🔶 Mover el Elefante de guerra a la Edad Oscura junto a los demás únicos de Persia y Etiopía.

## 14. Defensas: empalizadas, zanjas, murallas y puertas

Cómo se defiende una base con construcciones lineales, qué se ha hecho y qué queda. Pensada para quien no conozca el código. Leyenda: ✔ implementado, ⏳ pendiente, 🔶 especulativo o por decidir. Los valores son indicativos y viven en `src/mods/core/defenses.ts` (contenido e IA) y `BALANCE.defense` (`src/config/balance.ts`).

### 14.1 Idea general

- Cada **tramo** es un edificio de **una casilla**. Se traza en línea (arrastrando de un punto a otro; en el móvil, «Inicio» y «Construir») y los aldeanos los levantan uno tras otro, pagando cada tramo. No hay un «edificio muralla» largo: así un muro se rompe por tramos, se repara por tramos y las regiones de conectividad se recalculan sin más.
- **Bloquean el paso** como cualquier otro edificio (`blocked` en el mapa): el A* los trata como obstáculos y `canReach` sabe al instante si algo queda dentro de un recinto. Las **puertas** son casillas que no estorban el paso, pero cuyo dueño decide quién cruza (ver 14.3).
- Todo es **dato del mod base** (`BuildingDef`): `line` (se traza en línea), `gate`, `replaces`, `footDamage`. El motor solo conoce eso, no ids de contenido. Clases: `wall` (empalizada, muros y puertas: reciben los bonos de PV y el aceite hirviendo), `barrier` (solo estorba el paso; no cuenta para la victoria por conquista), `gate`, `ditch`.

### 14.2 Qué hay por era

| Era | Contenido | Estado |
| --- | --- | --- |
| 0 Oscura | **Empalizada** (280 PV, armadura 2/5, 4 madera) y **Puerta de empalizada** | ✔ |
| 1 Feudal | **Zanja** (ninguna unidad de tierra la cruza; las flechas apenas la dañan) y **Puente** (se construye sobre un tramo de zanja propio y la sustituye) | ✔ |
| 2 Castillos | **Muralla de piedra** (1800 PV, armadura 8/10, 6 piedra), **Puerta de piedra** y **Torre de muralla** (dispara flechas, 1 casilla) | ✔ |
| 3 Imperial | **Muralla fortificada** (3000 PV, armadura 12/14) y **Puerta fortificada** | ✔ |
| 4–5 | Bastiones y fortines (Vauban, §5.3), muralla contra artillería, trincheras y alambradas | ⏳ / 🔶 |

**Tecnologías** (todas en el motor como efectos `stat` sobre las clases `wall` y `tower`):

| Tecnología | Edad | Dónde | Efecto | Estado |
| --- | --- | --- | --- | --- |
| Arquitectura de defensa | 1 | Centro urbano | +25 % PV a empalizadas, muros, puertas y torres | ✔ |
| Contrafuertes | 2 | Herrería | +25 % PV y +1/+1 de armadura (requiere la anterior) | ✔ |
| **Aceite hirviendo** | 2 | Herrería | Muros, puertas y torres hieren a los enemigos **a su pie**: 8 de daño por segundo que la armadura no reduce (`footDamage`, `DefenseSystem`) | ✔ |
| Cuadrillas de albañiles | 1 | Centro urbano | Aldeanos levantan **y reparan** empalizadas, muros, puertas y zanjas un 40 % más rápido (`buildTime` ×0,6; la reparación usa el mismo tiempo) | ✔ |

Para reparar basta con ordenar a un aldeano que «construya» sobre un tramo dañado (clic derecho): es la orden de construir de siempre.

### 14.3 Puertas y quién pasa

- Una puerta (`gate`) **deja pasar a su dueño y a sus aliados** (los que no son enemigos suyos, según `Game.isEnemy`) y **está cerrada a los enemigos**, como si fuera pared.
- Implementación: `GameMap.gate` guarda el dueño de cada puerta; `walkableFor(x, y, jugador)` lo tiene en cuenta; **cada jugador tiene su propio mapa de regiones** (`regionArr`) con las puertas ajenas cerradas, que solo se calcula si hay puertas en el mapa. El A*, el suavizado de caminos, el movimiento, las formaciones y `canReach` usan el dueño de la unidad. Cuando cambia la diplomacia (paz, alianza) se invalidan las regiones.
- La puerta se puede atacar y destruir desde fuera, y es el punto débil del muro (las tropas a pie prefieren la puerta antes que picar el muro: `BALANCE.defense.wallTargetPenalty`).
- ⏳ **Abrir y cerrar** a voluntad (abierta para todos) y puertas que dejan salir a un ejército en tropel (hoy hacen cola por una casilla).

### 14.4 Zanja, puente y relieve

- Decisión: la zanja es un **edificio lineal** (no una modificación del terreno guardable). Así se guarda con las entidades, se destruye y se repara como todo, y no toca el formato del mapa. Se **rellena** eliminándola (o la rellenan al atacarla) y se **cruza** con un puente, que la sustituye (`replaces`) y que, como la puerta, solo es de los suyos.
- Coherencia con el relieve: se puede construir donde se puede construir cualquier cosa (terreno edificable y pendiente ≤ `BALANCE.relief.buildMaxSlope`). Las pruebas de conectividad de los mapas no cambian: los muros los levantan los jugadores, no el generador, y un recinto cerrado solo aísla su interior (`tests/defense.test.ts` lo comprueba).

### 14.5 Cómo se ataca y cómo se defiende

- **Flechas y tropas a pie contra un muro:** casi nada (armadura 8/10: infantería hace el mínimo de 1 de daño). **El asedio** sí: el ariete, la catapulta, el trabuquete y la artillería llevan bono `vs: building`, que no reduce la armadura. Es la tabla de §13 aplicada a un edificio con mucha vida.
- **Tirar por encima:** quien dispara (arqueros, torres, escorpiones) elige como blanco lo que alcanza aunque no pueda llegar a pisarlo; las tropas cuerpo a cuerpo, solo lo que pueden alcanzar (`canReach`). Con un muro cerrado, el enemigo golpea el muro; los arqueros de dentro le disparan.
- **IA** (plugin `defense`, `defenseAI`): solo si algún enemigo tiene ≥ 8 tropas de combate (`aiThreatArmy`), desde los 9 min, con edad ≥ Feudal, ≥ 12 aldeanos y 3 edificios militares, y dificultad normal o difícil (en fácil, nunca). Rodea su centro urbano con un anillo cuadrado de radio 9 del mejor muro de su edad, con **cuatro puertas** (primero las puertas: sin ellas no pone ni un tramo), salta las casillas ocupadas, repone los tramos caídos y solo gasta lo que sobra (`aiKeep`). Investiga las tecnologías de defensa cuando ya hay 12 tramos. Para atacar muros usa el asedio de siempre (`siege`).
- **Civilizaciones** (`mods/core/civs.ts`): Gran Bretaña, era Anglosajona: torres, burhs y **empalizadas −25 % de madera** (`classes: ['tower', 'wall']`). China, era Ming: **murallas, torres y castillos +20 % de PV**. ⏳ El resto de §5 (Vauban con fortalezas abaluartadas, la Muralla grande y el Burh como edificios únicos, murallas «de tierra y madera» rusas) queda para cuando se haga la identidad de cada era.

### 14.6 En la interfaz, en el guardado y en la red

- Escritorio: botón nuevo «Construir defensas» (tercer botón de construir, tecla `E`). Con un edificio de línea elegido, se **pulsa donde empieza, se arrastra y se suelta donde acaba**; la vista previa pinta cada tramo en verde o rojo. Con táctil en escritorio funciona igual con un dedo. **Móvil** (`MobileHUD`): pestaña «Defensas»; el primer «Inicio» fija el comienzo, se arrastra el fantasma hasta el final y «Construir» coloca la línea. Los comandos salen de `ui/commandModel.ts`, así que están en las dos interfaces.
- Red: orden `placeLine` (`NetCommand`, hasta `BALANCE.defense.maxLine` = 40 tramos): cada casilla se valida y se cobra por separado.
- Guardado: todo son entidades, sin formato nuevo; el mapa de puertas y las regiones se recalculan al cargar (`adoptEntity`). No cambia `SAVE_VERSION`. `tests/defense.test.ts` comprueba que la partida cargada es idéntica.
- Sonido: `footBurn` (evento) → `oilHiss` (efecto sintético en `audio/sfx.ts`, en `CREDITS.md`).
- Dibujo: sprites procedurales `wall` y `ditch` (`render/defenseSprites.ts`), que se unen a sus vecinos con `spriteParams.link`. Arte de IA: pendiente, en `art-src/PENDIENTES.md`.

### 14.7 Pendiente

- ⏳ Abrir y cerrar puertas; reparar murallas de forma automática con aldeanos cercanos (hoy lo hace el jugador).
- ⏳ Mejora de empalizada a muralla de piedra sin demoler (la IA deja su anillo de empalizada aunque llegue a Castillos).
- ⏳ Escalada (escaleras, torres de asedio) para cruzar sin asedio; alcance mínimo de las catapultas contra el pie del muro.
- 🔶 Muros que mejoran con el relieve (más alcance o daño desde lo alto: ya funciona para torres por `heightRules`).
- 🔶 Defensas de la era 4 y posteriores (bastiones, trincheras, alambradas, minas) y unidades de ingeniería que las abran.
