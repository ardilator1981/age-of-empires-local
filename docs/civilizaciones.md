# Civilizaciones que evolucionan con las eras (diseño)

Estado: **propuesta de diseño, nada implementado.** Decisiones ya tomadas por el usuario: **el juego debe llegar a la era Moderna** (7 eras, sin recortar) y **se añade la línea británica, que termina en EE. UU. como potencia actual** (§5.6). Todo lo marcado con 🔶 es especulativo o discutible (decisión de diseño, no hecho histórico). Los hechos históricos están elegidos para ser comprobables; ante la duda se ha preferido omitir.

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
| 6 | **Moderna** (nueva) | c. 1914–hoy | Motor, petróleo, blindados, aviación; aquí se ofrece un *giro* (§7) |

Alternativas: (a) 6 eras, fundiendo Pólvora en Imperial; (b) 8 eras, partiendo Moderna en «Guerras mundiales» (1914–1945) y «Contemporánea» (1945–hoy). **Decidido: 7 eras, llegando a la Moderna.** Se reservaría la Moderna para 2–3 unidades muy potentes en vez de cubrir toda la tecnología del siglo XX. Aviación, armas nucleares y espionaje **se incluirán más adelante** (decisión del usuario, §8b); la ciberguerra queda fuera.

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
| 6 Moderna | **Giro (🔶 elegir al pasar de era):** **URSS** (1922–1991) o **Rusia posterior a 1991** | Producción en masa planificada, o potencia exportadora de energía | **URSS:** planes quinquenales (primero 1928): +producción en masa, costes bajos, bono por trasladar fábricas lejos del frente (evacuación industrial de 1941, hecho real). **Rusia:** exportaciones de gas y petróleo dan oro; ejército profesional más pequeño y de calidad. (Ambos pasivos excluyentes) | U: **T-34** (carro medio), **Katiusha** (lanzacohetes múltiple BM-13). E: **Kombinat** (planta industrial) |

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
| 6 Moderna | **China moderna** (1912–hoy; reformas desde 1978; zonas económicas especiales, p. ej. Shenzhen 1980) | Taller del mundo | Pasivo: producción en masa y comercio abundante: unidades baratas, bono por tener varios centros comerciales. Pasivo: exportaciones (el comercio da mucho más oro) | U: **Infantería mecanizada**, **Carro ligero**. E: **Zona económica especial**. T: **Reforma y apertura** |

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
| 6 Moderna | **Francia del s. XX** (Primera Guerra Mundial; carro Renault FT 1917; V República 1958; disuasión propia, 🔶 opcional) | Independencia estratégica | Pasivo: tecnología y diseño propios (menos dependencia de comercio: costes bajos de investigar). Pasivo: ejército profesional con unidades caras pero resistentes | U: **Carro ligero Renault FT**, **Legionario**. E: **Arsenal moderno**. T: **Independencia estratégica** |

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
| 6 Moderna | **Irán del s. XX** (dinastía Pahlavi 1925–1979, nacionalización del petróleo 1951, fundación de la OPEP 1960, guerra Irán-Irak 1980–88) | Recurso estratégico | Pasivo: **petróleo** da mucho oro (+) y combustible a vehículos. Poder: boicot/embargo | U: **Camión blindado**, **Misil táctico** 🔶. E: **Refinería**. T: **Nacionalización** |

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
| 6 Moderna | **Etiopía del s. XX** (Haile Selassie 1930–74; invasión italiana 1935–41; Organización de la Unidad Africana en Addis Abeba, 1963; Derg 1974–91) | Resistencia y diplomacia | Pasivo: resistencia: más fuerza cuanto más territorio se pierda («patriotas»/*arbegnoch* contra la ocupación). Pasivo: diplomacia: aliados dan bono de comercio | U: **Patriota (arbegnoch)** (guerrilla), **Carro ligero**. E: **Sede diplomática** (Addis Abeba). T: **Organización de la Unidad Africana** |

**Estilo.** Defensa en las alturas con remontada y movilización, y dependencia de tecnología comprada. **Fuertes:** terreno elevado, remontadas, milicias baratas, diplomacia. **Débiles:** pocas fuentes de oro; el comercio es limitado; poca élite propia. **Contraataque natural:** asedio y artillería a distancia, ataque a la corte móvil. **Contra:** ejércitos que dependen de la llanura o atacar en grupos dispersos.

**Transiciones.** Se conserva: el relieve como ventaja, la movilización y el bono defensivo. Se sustituye: la unidad (guardia → chewa → mosquetero → fusilero → patriota), la economía (puerto → corte → alianza → compras).

---

### 5.6 Británicos → Estados Unidos

**Matiz de rigor (importante).** Inglaterra/Reino Unido y EE. UU. no son un linaje de Estado continuo como los otros: EE. UU. nace en 1776 de una ruptura con Gran Bretaña. Lo que sí hay es una **continuidad de tradición** (derecho común, instituciones representativas, lengua, finanzas y poder marítimo anglófonos) y un **relevo del liderazgo mundial** (Gran Bretaña hasta 1914–45, EE. UU. después; el sistema de Bretton Woods de 1944 lo escenifica). El juego lo modela como un **traspaso de testigo** 🔶: al llegar a la era Moderna el jugador pasa de la identidad británica a la americana, conservando los pilares (mar, crédito, logística) y cambiando el resto. Se evita presentar a EE. UU. como «heredero natural» o juzgar su papel: es una mecánica.

**Eje permanente:** poder naval y comercio marítimo, **crédito** (financiación de la guerra mediante deuda y banca: Banco de Inglaterra 1694) y logística a larga distancia. Economía de mercado con comercio; ejército pequeño y de calidad antes de la era 5.

| Era | Identidad | Frase | Bonos / poderes | Únicos |
| --- | --- | --- | --- | --- |
| 0 Oscura | **Anglosajones** (Alfredo de Wessex, 871–899; red de *burhs* fortificados; la *fyrd* o leva; Danelaw) | Resistir con ciudades fortificadas | Pasivo: *burhs* (muros y torres de madera baratos). Pasivo: *fyrd*: milicia de aldeanos que aparece al ser atacada una aldea | U: **Fyrdman** (milicia), **Thegn** (guerrero de élite local). E: **Burh**. T: **Reforma de Alfredo** |
| 1 Feudal | **Inglaterra normanda y angevina** (Hastings 1066; Domesday Book 1086; Magna Carta 1215) | Castillos de piedra y administración | Pasivo: castillos más baratos; censo (Domesday) = más oro por aldea. Pasivo: caballería normanda | U: **Caballero normando**. E: **Castillo de motte-and-bailey** (castillo de mota). T: **Domesday** |
| 2 Castillos | **Inglaterra Plantagenet** (Eduardo I y los castillos de Gales; arco largo en Crécy 1346 y Agincourt 1415; Parlamento) | El arco largo | Pasivo: arqueros +alcance (el bono actual de Británicos). Pasivo: centros urbanos más baratos | U: **Arquero de tiro largo** (existente). E: **Castillo concéntrico**. T: **Arco largo de tejo** |
| 3 Imperial | **Inglaterra Tudor** (Armada española derrotada en 1588; East India Company 1600; astilleros reales) | Surge la marina | Pasivo: barcos más baratos; compañías con carta real (comercio marítimo). Primer galeón artillado | U: **Galeón** (marina), **Arcabucero Tudor**. E: **Astillero real**. T: **Carta de compañía** |
| 4 Pólvora | **Gran Bretaña** (Unión de 1707; Banco de Inglaterra 1694; guerra de los Siete Años 1756–63) + **Trece Colonias** (milicia colonial) | Estado fiscal-militar | Pasivo: **crédito**: pedir oro prestado a devolver con interés 🔶. Pasivo: la Royal Navy bloquea puertos rivales. Pasivo (colonias): milicia local barata | U: **Casaca roja** (infantería de línea con mosquete Brown Bess), **Fragata**. E: **Banco**. T: **Deuda nacional** |
| 5 Industrial | **Reino Unido** (carbón y hierro; ferrocarril; *Pax Britannica*) y **EE. UU. emergente** (guerra de Secesión 1861–65; ferrocarril transcontinental 1869) | El taller del mundo y el continente que se hace | Pasivo: carbón y hierro con bono de recolección; ferrocarril baratea transporte. Pasivo: la guerra de Secesión es la primera guerra industrial: producción en masa de fusiles (fusil estriado) y buques acorazados | U: **Fusilero Enfield**, **Tirador (rifleman)**, **Acorazado de casco de hierro**. E: **Fábrica**, **Ferrocarril transcontinental** (Maravilla). T: **Intercambiabilidad de piezas** |
| 6 Moderna | **Estados Unidos como superpotencia** (Primera y Segunda Guerra Mundial; *Lend-Lease* 1941; Bretton Woods 1944; Plan Marshall 1948) | Arsenal de las democracias | Sustituye: bonos de crédito ahora son **ayuda a aliados** (enviar recursos a un aliado le da bono de lealtad) y logística global. Pasivo: producción en masa de vehículos (cadena de montaje); petróleo propio | U: **Carro Sherman**, **Infantería de marina (Marine)**, **Ranger**. E: **Arsenal** (producción en masa), **Base avanzada** (puerto logístico). T: **Préstamo y arriendo** (Lend-Lease), **Plan Marshall** |

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

1. **Doctrinas excluyentes:** al subir de era, el jugador elige una de dos técnicas (p. ej. Francia en Pólvora: Vauban o Gribeauval; Rusia en Moderna: URSS o Rusia posterior a 1991). Requiere una propiedad `excludes` en `TechDef` 🔶 (ver §8).
2. **Mantenimiento:** las unidades de eras superiores cuestan *mantenimiento* de recursos (alimento/oro/petróleo), así que ir deprisa tiene un precio. La actual infraestructura de población puede reutilizarse.
3. **Hitos de era:** además del oro, para avanzar hay que poseer N edificios distintos (la `TechDef` ya tiene `requiresBuildings`).
4. **Pico de civilización:** cada civilización tiene su mejor era (tabla); algunas eligen *quedarse* en una era para aprovecharla.
5. **Era global opcional (🔶):** en un modo «Cronología» el reloj marca la era del mundo, y todos avanzan a la vez; ya no es carrera sino reparto de decisiones.

## 8. Mecánicas transversales (sin rehacer el motor)

| Idea | Descripción | Cómo encaja |
| --- | --- | --- |
| **Comercio** | Mercado + caravana/carro/barco entre dos mercados propios o de aliados; ganancia proporcional a la distancia. Persia/China/Etiopía lo aprovechan de forma distinta | Edificio `market`, unidad `caravan`, **orden nueva `trade`** vía `reg.addOrder`. Rutas visibles con `addWorldOverlay` |
| **Diplomacia** | Estados: guerra / neutral / alianza; tributo; embargo; pacto comercial | El mod `declared-war` ya tiene `addCombatRule` y `addNetCommand`: se generaliza a una tabla de relaciones entre jugadores |
| **Recursos modernos** | Hierro y carbón (Industrial), **petróleo** (Moderna), con depósitos en el mapa | `ResourceDef` y `ResourceNodeDef` son datos; el generador de mapas necesita colocarlos (`SetupConfig`) |
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
| **Espionaje** | Espías que se infiltran (ven recursos y edificios enemigos, sabotean, roban tecnología, envenenan el suministro, convierten unidades). Contraespionaje. Desde la era 1 en versión simple (mensajeros, informantes) hasta la Moderna (agencia) | Unidad `spy` invisible salvo contra contraespionaje (necesita una capa de visión nueva en `vision`); órdenes `infiltrate` y `sabotage`; la niebla de guerra ya existe, lo cual ayuda |

**Decidido: el espionaje existe desde las primeras eras.** Dos vías, escalando con la era:

1. **Agentes convertidos (eras 0–3):** un aldeano o soldado enemigo puede ser *sobornado o convertido* (cuesta oro, tiene probabilidad, y exige un edificio como la taberna/posada o el monasterio) y pasa a ser un **agente doble**: sigue pareciendo del enemigo, pero comparte con su dueño real la visión de lo que ve (su campo de visión se suma al mapa del espía). Puede ser descubierto: al ser inspeccionado o por un contraespionaje (patrulla, torre), vuelve a su dueño o muere. Encaja con la niebla de guerra y la visión actual (`vision`); lo nuevo es un *«propietario de visión»* distinto del propietario de la unidad.
2. **Espías propios (eras 1+):** unidad invisible salvo contra contraespionaje, con órdenes de infiltrar y sabotear. Entre sus acciones:
   - **Robar tecnología:** copiar una tecnología que el enemigo ya tenga y tú no (a coste de un porcentaje y un tiempo; con cooldown), sujeto a edad igual o menor para evitar saltos de era. Efecto: fomenta una carrera tecnológica menos lineal.
   - **Ver recursos y edificios:** información del enemigo.
   - **Sabotear:** retrasar producción, incendiar almacenes (más tarde).
3. **Escalado por era (🔶):** mensajeros e informantes (0–1), espías de corte y agentes de compañía (2–3), servicios de inteligencia y cifrado (4–5), agencias y satélites (6).

**Contrapesos para que no rompa la partida:** probabilidad de fallo, enfriamiento largo, coste en oro, que los conversos puedan ser descubiertos, y contraespionaje barato (el mismo edificio o tecnología que los detecta). Un jugador con espías fuertes debería notarse más lento en la economía.

Cada civilización podría tener su **versión histórica** del espionaje (🔶 y con cuidado): informantes y espías bizantinos del mundo mediterráneo, el sistema postal y de información del Estado chino (*yizhan*), servicios de seguridad de las cortes persas, el *Cabinet Noir* francés del s. XVIII, el Servicio Secreto británico (Walsingham en los Tudor), la Cheka/KGB, la CIA/OSS. Solo hace falta una mecánica común más un par de variantes por civilización.

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

## 10. Orden de implementación por fases

| Fase | Contenido | Riesgo | Hecho cuando |
| --- | --- | --- | --- |
| **0** | Decisiones del §11 y revisión de este documento | — | Usuario aprueba eras y civilizaciones |
| **1** | **Eras nuevas (4–6)** como datos vacíos pero con tecnologías de era; sin civilizaciones nuevas aún. Revisar IA y UI para 7 eras | Medio (la IA y el balance asumen 4) | `npm run simulate` llega a la era 6 |
| **2** | **Bonos por era** (`CivDef.eras`, `rebuildModifiers`, guardado) con una sola civilización: **Rus → Rusia**, solo con datos (unidades únicas, edificios y bonos) | Bajo-medio | Rusia cambia de identidad al subir de era, guardar/cargar sin diferencias |
| **3** | **Poderes activos** (Tierra quemada, Nagarit…) y `excludes` para doctrinas | Medio | Un poder activo y una doctrina funcionan en red |
| **4** | **China, Francia y Británicos → EE. UU.** (solo datos más lo de fases 2–3; el crédito y la ayuda a aliados quedan para la fase 5) | Bajo | Simulaciones IA contra IA equilibradas |
| **5** | **Comercio y diplomacia** (mercado, caravana, relaciones, crédito, ayuda a aliados). **Persia** y **Etiopía** (que lo aprovechan) y la rama EE. UU. completa | Alto | Rutas funcionan en red y guardado |
| **6** | **Recursos modernos y mantenimiento**; era Moderna completa | Alto (balance) | Partida completa a la era 6 sin bloqueos |
| **7** | **Aviación y armas nucleares** (§8b); el **espionaje** puede adelantarse a la fase 5 junto al comercio y la diplomacia (comparte la visión y las órdenes) | Alto (render, visión, balance) | Aviones, un arma de área y espías funcionan en red y guardado |
| **8** | **IA por civilización/era**, victorias alternativas, pulido de interfaz y arte | Medio | Todas las civilizaciones juegan con la IA |

Cada fase se hace en su propia rama (`feat/...`) y pasa `npm run build`, `npm run simulate -- 20 arabia 1` y `npm test`.

## 11. Decisiones que debe tomar el usuario

1. ~~Cuántas eras~~ **Decidido: llegar a la Moderna (7 eras).** Queda por ver si la Moderna se parte en dos (guerras mundiales / contemporánea) y los nombres.
2. **Lista de civilizaciones:** Rus, China, Francia, Persia, Etiopía y Británicos → EE. UU. (decidido). ¿Se añade Japón o Turcos como séptima?
3. ~~Civilizaciones actuales~~ **Decidido:** Británicos → línea británica/EE. UU., Francos → Francia, Godos y Mongoles se eliminan. **Las partidas guardadas con civilizaciones antiguas se descartan (decidido):** basta subir `SAVE_VERSION` sin escribir migración.
3b. **Traspaso británico → EE. UU.:** ¿automático al llegar a la Moderna, o el jugador elige en la era 5 entre seguir como Reino Unido o dar el salto a EE. UU.? (Por defecto, automático.)
4. ~~Giro de la era Moderna~~ **Decidido: el giro político está bien** (URSS / Rusia posterior a 1991, y los equivalentes de otras civilizaciones). Se modela como mecánicas, sin juicios.
5. ~~Armas nucleares, aviación~~ **Decidido: se incluirán más adelante, junto con espionaje.** Pendiente: ¿en qué fase, y las nucleares como victoria, como disuasión o como poder de civilización?
6. **Carreras de eras:** ¿doctrinas excluyentes, mantenimiento, era global «Cronología»? ¿Cuál de ellas?
7. **Civilizaciones de ciclo corto** (mexicas, incas, Mali): ¿se admiten civilizaciones que terminan en la era 3 o 4?
8. **Comercio y diplomacia:** ¿son prioridad (fase 5) o se adelantan?
9. ~~Escala del trabajo~~ **Decidido: Rusia como piloto** (fase 2) para validar el sistema de eras antes de las demás.

## 12. Notas de rigor

- Los hechos citados se limitan a fechas y sucesos de amplio consenso; las unidades con 🔶 son extrapolaciones razonables, no unidades documentadas con ese nombre.
- «Zemene Mesafint», «chewa», «Prestes Juan» y los detalles de ciertos reclutamientos (Zagüe, ras) se tratan con prudencia: antes de implementar, contrastar con bibliografía (p. ej. Henze, *Layers of Time*; Mote, *Imperial China*; Daryaee, *Sasanian Persia*; Hellie, *Enserfment and Military Change in Muscovy*; Kennedy, *The Prophet and the Age of the Caliphates*).
- La representación de periodos de dominio extranjero (Yuan, Qing, Horda de Oro, ocupación italiana) no implica valoración: son parte del linaje del territorio.
