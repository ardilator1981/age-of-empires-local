# Batalla táctica «tipo Shogun» en Guerra declarada (diseño)

Documento de diseño para quien no conozca el código. Describe cómo convertir la batalla del modo **Guerra declarada** en una batalla aparte, al estilo de *Total War: Shogun*: cuando acaba la cuenta atrás, los dos ejércitos pasan a un **mapa de batalla**, cada jugador **despliega** sus tropas, se combate con **regimientos**, moral, flancos y cargas, y al terminar se **vuelve al mapa de la partida** con las consecuencias aplicadas.

Leyenda: ✔ ya existe en el juego · ⏳ pendiente (hay que hacerlo) · 🔶 especulativo o por decidir. Todos los números son indicativos: los definitivos irían a `src/config/balance.ts` (reglas generales) y a los datos de cada unidad en `src/mods/`.

Relacionado: `docs/civilizaciones.md` (eras, asedio §13, defensas §14), `docs/multijugador.md` (red por pasos sincronizados), `docs/flujo-de-trabajo.md` (modelos y esfuerzo), `docs/decisiones.md`.

---

## 0. Resumen

- **Qué se propone.** Guerra declarada ya tiene cuenta atrás, círculo de batalla y General ✔. La propuesta añade tres cosas: (1) una **capa táctica** de combate (regimientos, orientación, flancos, carga, moral y huida, cansancio y munición); (2) una **fase de despliegue** antes de luchar; (3) un **mapa de batalla aparte**, generado a partir del terreno real donde se ha fijado la batalla, al que se va y del que se vuelve.
- **Recomendación principal.** Hacerlo **en ese orden y no al revés**: primero la capa táctica sobre el mapa que ya hay (sirve en cualquier partida, se prueba sola con `npm run simulate`, no toca la red ni el guardado), después el despliegue y la interfaz de batalla, y solo al final el mapa aparte. El mapa aparte es lo más vistoso, pero también lo más caro y lo que más riesgos acumula (red, guardado, dos interfaces); tenerlo el último permite parar en cualquier fase con algo jugable.
- **Arquitectura recomendada.** El mapa de batalla es **una segunda instancia del motor (`Game`) «hija» de la partida**: mismo `Registry` y mismos sistemas de movimiento, combate, visión, formaciones y relieve, con un mod `battle` que añade las reglas tácticas y quita la economía. La partida de campaña queda congelada mientras dura la batalla y **comparte el reloj, la cola de órdenes de red y el guardado** con la hija, de modo que el multijugador y el «guardar en medio de una batalla» salen casi gratis.
- **Escala.** Batallas de **hasta ~150 unidades por bando** agrupadas en **regimientos de 6–12**, que es lo que el motor ya mueve con holgura en un móvil de gama media (hoy: 300 unidades cruzando los Pirineos a la vez, peor tick 48 ms; 5.200 entidades en pantalla a ~1 ms por fotograma en el Mac).
- **Lo que más decide el usuario** (§7): si el jugador controla la batalla en vivo o solo despliega y mira; si la campaña se congela por completo; qué unidades entran; y si la primera versión tiene que funcionar en red.

---

## 1. Qué hay hoy (✔)

Lo que ya existe y en lo que se apoya todo lo demás. Sirve para calibrar cuánto es nuevo de verdad.

| Pieza | Estado | Dónde | Qué da |
| --- | --- | --- | --- |
| **Guerra declarada** | ✔ | `src/mods/declared-war/` | Paz hasta declarar; condiciones (Edad de los Castillos, rival descubierto, General); quien declara elige el **punto** de batalla; cuenta atrás (por defecto 30 min, ajustable al crear la partida); **círculo** de 12 casillas de radio donde solo se puede combatir; la batalla dura 12 min como máximo; se pierde al caer el General o al pasar 30 s sin tropas dentro; después, **conquista** (el ganador puede arrasar el pueblo) o tablas. `battlePointInfo` ya analiza el terreno del punto elegido: alturas, roca, **pasos de entrada** y **cima**, y el jugador lo ve al elegir |
| **General** | ✔ | mismo mod | Unidad única (`maxAlive: 1`) con **aura**: +20 % de ataque y +1 de armadura («moral») a 7 casillas; si muere hay que esperar 3 min para otro |
| **Formaciones y grupos** | ✔ | `src/game/army/` | Grupos persistentes con centro «virtual» que va al paso del más lento; **cinco formas** (línea, columna, caja, cuña, dispersa) con **papeles** (infantería delante, tiradores detrás, caballería en los flancos, asedio atrás); **orientación** (`facing`, con «hacia dónde mirar al llegar»); se estrechan en los pasos; **seis órdenes tácticas** (mover, avanzar atacando, patrullar, retirada, escoltar, mantener zona) |
| **Posturas** | ✔ | `army/stances.ts` | Agresiva, defensiva (correa de 5 casillas), mantener posición, pasiva |
| **Pantalla de estrategia** | ✔ | `ui/StrategyScreen.ts` | Mapa táctico para dar formación, postura y rutas al ejército; **contra la IA pausa o pone cámara lenta** mientras está abierta; en red no toca el tiempo. Compartida por escritorio y móvil |
| **Relieve y altura** | ✔ | `heightRules.ts`, `relief.ts` | Alcance +1 por nivel, daño +15 % por nivel, visión con crestas; roca, pasos y regiones conectadas |
| **Defensas** | ✔ | `defense.ts`, `walkway.ts` | Empalizadas, zanjas, murallas, puertas por jugador, torres de muralla; tiradores en el **paso de ronda** (altura, armadura, solo se les alcanza a distancia); aceite hirviendo |
| **Asedio y artillería** | ✔ | `mods/core/siege.ts`, `gunpowder.ts`, `industrial.ts` | Ariete, catapulta, escorpión, trabuquete, bombarda, cañón, cañón de campaña, obús; **daño de área** que cae donde estaba el blanco; sin fuego amigo |
| **Combate** | ✔ | `combat.ts` | Daño = ataque − armadura + bonos por clase; dos tipos (cuerpo a cuerpo, perforante); reglas de quién ataca a quién ampliables por mods (`addCombatRule`) |
| **Eras y civilizaciones** | ✔ (eras 0–5) | `mods/core/civ-*.ts` | Identidad y bonos por era; unidades únicas; Pólvora e Industrial (mosquete, fusil, ametralladora, aviación básica). Era 6 (blindados) ⏳ |
| **Red** | ✔ | `game/net/`, `src/net/` | Pasos sincronizados (lockstep): cada cliente simula todo; las órdenes viajan por turnos; huella del estado cada segundo; `game.rng()` y `fmath` deterministas; probado en Node y en el motor de Safari |
| **Guardado** | ✔ | `game/save.ts` | Instantánea completa versionada (entidades, jugadores, `game.data`, estado de los sistemas); guardado automático; `tests/save.test.ts` comprueba que la carga es idéntica |
| **Simulación sin gráficos** | ✔ | `scripts/simulate.ts`, `tests/` | IA contra IA en Node; tests de Guerra declarada, formaciones, altura, defensas, red y guardado |

**Lo que no hay** (y es el corazón de este diseño): moral y huida, flancos y retaguardia, cargas, cansancio, munición, regimientos como unidad de mando, fase de despliegue, un segundo mapa, una IA que piense una batalla campal, y una interfaz de batalla.

---

## 2. Flujo completo

### 2.1 Cuenta atrás y cierre de la preparación

Como hoy ✔: alguien declara la guerra, elige el punto y arranca la cuenta atrás. Lo que cambia es **qué pasa al llegar a cero**:

1. ⏳ **Cierre de la lista de batalla.** En el instante en que acaba la cuenta atrás, el juego decide **qué unidades entran** (§2.3) y las «congela»: dejan de recibir órdenes de campaña. Es el momento en que se fija todo lo que la batalla necesita (tropas, mejoras investigadas, edificios del recorte). Que sea **un instante concreto de la simulación** (un tick) es lo que lo hace determinista en red: todos los clientes toman la misma foto.
2. ⏳ **Transición.** Fundido a negro de 1–2 s con un resumen («Batalla de *nombre del lugar*: 84 tropas contra 97; terreno: colina al oeste, bosque al sur») y se entra en el mapa de batalla. El nombre del lugar 🔶 puede salir del tipo de terreno de la cima o del número de guerra («Batalla del paso», «Segunda batalla de la colina»).
3. ⏳ **La campaña se congela.** Nada avanza en el mapa de campaña mientras dura la batalla (economía, producción, otras IA). Alternativa 🔶: dejar que corra para los jugadores que no participan (en partidas de 3 o más). No se recomienda en la primera versión: obliga a resolver qué pasa si un tercero ataca al pueblo del que está luchando, y el reloj compartido (§4.7) se complica. Ver pregunta 4 en §7.

**Aviso previo.** ⏳ Dos minutos antes del cierre, un aviso: «Reúne tu ejército cerca del punto de batalla: solo entrarán las tropas a N casillas». Hoy los avisos de cuenta atrás ya existen (10 min, 5 min, 1 min, 10 s) ✔; se añade el texto.

### 2.2 El mapa de batalla

Tres opciones:

| Opción | Cómo | Ventajas | Inconvenientes |
| --- | --- | --- | --- |
| **A. Recorte del terreno real** | Se copia el relieve y el terreno de la campaña alrededor del punto de batalla (un cuadrado de 2× el radio del círculo, ~24–32 casillas) y se **amplía** ×2 o ×3 (cada casilla pasa a ser 2×2 o 3×3, con el relieve interpolado) para que las formaciones tengan sitio | Coherente: lo que el jugador vio al elegir el punto (cima, pasos, bosque) es lo que se encuentra; los **muros y edificios** cercanos entran tal cual; `battlePointInfo` ya calcula lo que hace falta; determinista sin esfuerzo (sale del estado de la campaña) | Hay que escribir el «ampliador» de relieve y terreno; una zona plana y vacía da una batalla plana y vacía (pero es lo que el jugador eligió) |
| **B. Escenario tipo** | Un mapa de batalla generado por plantilla («llanura», «colina», «vado», «desfiladero», «asedio») elegido según el terreno del punto | Batallas siempre interesantes y controladas; más fácil de equilibrar | Rompe la coherencia (el jugador eligió una cima y le sale otra); los muros reales no encajan; hay que diseñar y mantener las plantillas |
| **C. Híbrido** | Recorte real (A) **más** retoques: si el recorte es demasiado plano y vacío, el generador añade pequeñas ondulaciones y algún bosquecillo (con `game.rng()`); si hay un río o un muro, se respetan | Lo mejor de A con red de seguridad | Un poco más de trabajo que A |

**Recomendación: A en la primera versión, dejando la puerta abierta a C.** El punto de batalla ya es una decisión del jugador con información sobre el terreno ✔; que el mapa de batalla sea ese terreno le da sentido a elegirlo bien (quien declara busca un paso o una colina). La ampliación ×2 es el valor razonable: un círculo de radio 12 pasa a un campo de ~50×50 casillas, suficiente para dos líneas de 10 regimientos con flancos.

Detalles del recorte (⏳):
- **Terreno y relieve:** se copia `terrain` y `heights` del cuadrado y se interpola al ampliarlos (`GameMap` guarda alturas por vértice ✔, así que la interpolación es directa). Agua y roca se conservan; los bosques (nodos de árbol) se copian como nodos (sin recolección).
- **Edificios y murallas del recorte:** se copian como edificios del mismo dueño, con sus puntos de vida actuales. Las murallas, puertas y torres funcionan igual ✔ (bloquean, se asedian, se suben). Hoy el punto no puede estar a menos de 20 casillas de un centro urbano ✔, así que lo normal es que entren pocos edificios; una batalla **de asedio** (bajo las murallas) sería 🔶 una variante futura que relaje esa distancia.
- **Bordes:** el campo tiene un borde no transitable de 2 casillas, salvo las **zonas de huida** (§3.4) en el lado de cada ejército.
- **Meteorología** 🔶: no en la primera versión. Si se añade: elegida con `game.rng()` al cerrar la lista (determinista); lluvia (−30 % de alcance y cadencia de las armas de pólvora, barro: −15 % velocidad), niebla (visión reducida), noche (visión y moral). El render ya tiene niebla de guerra y agua animada ✔; lluvia y noche serían efectos de dibujo nuevos.
- **Hora del día** 🔶: solo cosmética (tono de luz), a partir del tiempo de partida.

### 2.3 Despliegue

⏳ Fase de 60–90 s (ajustable) antes de luchar, con botón «Listo». Cuando los dos están listos o se acaba el tiempo, empieza la batalla.

**Zonas de despliegue.** Cada bando tiene una franja de 8–10 casillas de fondo en el lado del campo por el que llega: la dirección **desde su centro urbano** al punto de batalla (`homeOf` ya la calcula ✔). Si los dos llegan por el mismo lado 🔶 se reparten por el perpendicular. Entre las dos franjas queda tierra de nadie. El defensor (a quien le declararon la guerra) 🔶 podría tener la franja ligeramente más adelantada o el lado alto si lo hay, como compensación por no elegir el punto; en la primera versión, simétrico.

**Qué unidades entran.** Tres criterios posibles:

| Criterio | Pros | Contras |
| --- | --- | --- |
| **Todas las tropas del jugador**, estén donde estén | Sencillo; nadie se queda fuera por despiste | Vacía la defensa del pueblo; absurdo si las tropas están al otro lado del mapa |
| **Las que están dentro del círculo** al cerrar (como hoy ✔) | Ya funciona; obliga a llegar a tiempo | Castiga mucho un retraso de segundos; el círculo es pequeño |
| **Las que están a una distancia de marcha** del punto (radio de reunión, p. ej. 25 casillas o «lo que recorre una tropa en 2 min») | Tolerante pero premia ir con tiempo; deja reservas en casa a propósito | Un número más que equilibrar |

**Recomendación: radio de reunión**, con el círculo pintado en el mapa durante la cuenta atrás ✔ (hoy ya se dibuja el círculo de combate; se dibujaría además el de reunión). Las que no entran se quedan en la campaña donde estaban (§2.5).

**Límites y exclusiones.**
- Solo unidades **militares** (`isMilitary` ✔: con ataque y no recolectoras). Civiles, comerciantes, espías y exploradores sin ataque no entran. El **General entra siempre** si está vivo y en el radio; si no está, el ejército lucha sin aura y 🔶 con moral base más baja.
- Tope por bando (`BALANCE.battle.maxUnits`, p. ej. 150; en móvil la calidad gráfica automática ✔ podría bajarlo a 100). Si hay más, entran las de mayor valor (coste) y el resto se queda de reserva en la campaña. Ver pregunta 1 en §7.
- Las unidades de **refugio** o en el **paso de ronda** de un muro copiado entran en el mismo estado.
- 🔶 **Refuerzos**: tropas que llegan al radio durante la batalla entran por su borde a los N minutos. No en la primera versión (complica la foto determinista y la red).

**Cómo se despliega.** El jugador coloca **regimientos** (§3.1), no unidades sueltas: arrastra la tarjeta del regimiento a un punto de su franja y gira su orientación (§3.10). Lo que no coloque antes de «Listo» se coloca solo con la plantilla por defecto (la de la IA, §4.6). Hay un botón «Colocar automáticamente» que aplica la plantilla y deja retocar.

**Despliegue simultáneo y oculto.** En la batalla real ninguno ve el despliegue del otro hasta que empieza. En el juego:
- Contra la IA: trivial, la IA despliega al instante y el jugador no la ve (niebla de la franja contraria).
- En red: las órdenes de despliegue viajan por la cola de turnos como cualquier otra, y cada cliente simula al otro, así que **técnicamente el otro cliente «sabe» el despliegue** (como hoy sabe todo el mapa: `docs/multijugador.md` lo acepta «para jugar entre amigos»). Lo que se oculta es la **vista**: la franja rival está en niebla hasta que empieza la batalla. Un esquema de compromiso y revelación (mandar primero una huella del despliegue y después el despliegue) 🔶 evitaría la trampa, pero no compensa en la primera versión; se anota como mejora.

### 2.4 Batalla

Ver §3. Dura como máximo `battleMaxMinutes` (hoy 12 ✔; en el mapa aparte probablemente 10–15) y termina por rotura del ejército, aniquilación, muerte del General (si se mantiene esa regla), retirada voluntaria o tiempo.

### 2.5 Resolución y regreso a la campaña

⏳ Al terminar: pantalla de resultado (bajas por tipo, regimientos huidos, botín, duración; «Victoria decisiva / ajustada / tablas») y vuelta al mapa de campaña con la campaña descongelada.

| Consecuencia | Qué pasa | Estado |
| --- | --- | --- |
| **Supervivientes** | Vuelven a la campaña **con los puntos de vida con que acabaron**, colocados en el círculo original, cada bando en su lado (el del que llegó), en formación. El ganador queda en el centro del círculo; el perdedor, en su borde | ⏳ |
| **Bajas** | Desaparecen de la campaña (se eliminan las entidades con su id de campaña) | ⏳ |
| **Huidos** | Los regimientos que huyeron del campo cuentan como supervivientes, pero vuelven con los puntos de vida que tenían y 🔶 un tiempo de «desorden» (no aceptan órdenes 30 s) | ⏳ / 🔶 |
| **Heridos** | 🔶 Un porcentaje de las bajas del ganador se «recupera» (vuelven con poca vida). Da ventaja a ganar, y es realista. No en la primera versión | 🔶 |
| **Botín** | El ganador recibe una fracción del coste de las bajas enemigas (p. ej. 20 %) en los recursos originales. Pequeño, para que la batalla no sea una mina de oro | ⏳ |
| **Moral de campaña** | 🔶 Un modificador temporal de moral (+/−) a las tropas del ganador/perdedor en la siguiente batalla. Solo si hay varias batallas por partida | 🔶 |
| **Edificios del recorte** | Vuelven con los puntos de vida que tenían al acabar; los destruidos desaparecen | ⏳ |
| **Unidades que no entraron** | Siguen en la campaña donde estaban, sin cambios | ⏳ |
| **General** | Si muere en la batalla, muere en la campaña (y aplica el enfriamiento de 3 min ✔) | ⏳ |
| **Después** | Como hoy ✔: victoria → **conquista** (el ganador puede atacar en todo el mapa; si arrasa el pueblo, gana la partida); tablas → paz y enfriamiento. **No cambia el final del modo**: la batalla es «cómo se decide», no «qué se decide» | ✔ |

**Determinismo de la aplicación.** El resultado **no se transmite ni se calcula aparte**: en red, los dos clientes simulan la batalla entera (como simulan todo lo demás) y al terminar los dos ejecutan la misma función `applyBattleResult(campaña, batalla)` en el mismo tick, que recorre las unidades de la batalla por su **id de campaña** (guardado al crearlas, §4.2) y actualiza o elimina las correspondientes. Es una transformación pura del estado, sin azar y sin reloj, así que la huella del estado sigue coincidiendo. Contra la IA es la misma función.

---

## 3. Mecánica de combate táctica

Principio de diseño: **no se rehace el combate**. El daño, la armadura, los bonos, el alcance, los proyectiles, el área y la altura siguen como hoy ✔ (así todo el contenido existente, del ariete a la ametralladora, vale sin tocar sus datos). Lo táctico se añade **encima**, como modificadores y como un estado nuevo por regimiento, en un mod `battle` activable (§4), y la mayoría de esas reglas pueden funcionar **también en el mapa de campaña**, no solo en el de batalla.

### 3.1 Regimientos

⏳ Un **regimiento** es un grupo de 6–12 unidades del **mismo tipo** que se manda como una sola pieza: tiene tarjeta en la interfaz, formación, orientación, moral, cansancio y munición. Encaja con los **grupos en formación** que ya existen ✔ (`Group`: miembros, forma, orientación, modo): un regimiento es un `Group` con tipo de unidad único y estado táctico nuevo (`morale`, `fatigue`, `ammo`, `charging`, `routed`). Las unidades siguen siendo entidades individuales (cada una con su vida y su ataque ✔); lo que cambia es que **el jugador no las manda sueltas** en la batalla.

- Se forman **automáticamente al cerrar la lista de batalla**: las tropas del radio se agrupan por tipo de unidad en regimientos de tamaño `BALANCE.battle.regimentSize` (12 para infantería y tiradores, 8 para caballería, 4 para asedio y artillería, 1 para el General). Los restos forman un regimiento menor. 🔶 Más adelante, regimientos de campaña persistentes (el jugador los forma en la pantalla de estrategia y conservan nombre e historial).
- Tamaño del regimiento por era (datos): en la Pólvora e Industrial los regimientos de línea pueden ser más grandes (16–20) y más finos.
- **Un regimiento mermado** sigue siendo un regimiento; dos del mismo tipo se pueden **fusionar** con un botón (no se dividen).

### 3.2 Formaciones y orientación

- Las cinco formas actuales ✔ (línea, columna, caja, cuña, dispersa) sirven de base. Cada regimiento tiene su formación propia; además hay **formaciones de ejército** 🔶 (mover varios regimientos manteniendo sus posiciones relativas), que la pantalla de estrategia ya sabe pintar ✔.
- ⏳ **Orientación explícita**: `facing` existe en los grupos ✔ y hoy sale de la dirección de marcha; en batalla el jugador la fija (arrastrar al dar la orden). Un regimiento quieto **gira** al enemigo más cercano que le ataca solo si está en postura agresiva o defensiva; en «mantener posición» no gira (es la gracia de flanquearlo).
- ⏳ Formaciones nuevas por datos: **muro de lanzas** (infantería con lanza: anula la carga de frente, lenta), **cuadro** (Pólvora: sin flancos ni retaguardia, no se mueve, −25 % de tiro), **línea fina** (Pólvora/Industrial: más frente de tiro, menos resistencia), **orden abierto** (Industrial: la dispersa, −50 % de daño de artillería). Cada una es una entrada en `FORMATIONS` con sus modificadores y quién puede usarla (`UnitDef.battle.formations`).
- La **anchura** de la línea es ajustable (hoy existe `fullWidth` y el estrechamiento en pasos ✔): más ancha = más tiradores disparan, menos filas = menos aguante.

### 3.3 Flancos, retaguardia y carga

⏳ Cuando una unidad golpea a otra, se calcula el **ángulo** entre la orientación del regimiento atacado y la dirección del golpe (con `fmath` ✔, determinista):

| Desde dónde | Daño recibido | Moral del atacado |
| --- | --- | --- |
| Frente (±60°) | ×1 | — |
| Flanco (60°–120°) | ×1,3 | −2 por segundo mientras dura |
| Retaguardia (>120°) | ×1,6 | −5 por segundo; probabilidad alta de huida |

Es un modificador del daño ya existente (§4.3: punto de extensión `addDamageModifier`), sin tocar las tablas de ataque y armadura.

**Carga.** Un regimiento de caballería (o de infantería de choque 🔶) que avanza **hacia** un enemigo a toda velocidad durante ≥ 2 s acumula «ímpetu»; el **primer golpe** de cada unidad al llegar hace ×2–×3 de daño y un golpe de moral al regimiento golpeado; después, el ímpetu se pierde y la caballería trabada pierde su ventaja (hay que retirarla y volver a cargar, como en Shogun). Contra un **muro de lanzas** de frente, la carga se anula y la caballería recibe daño extra. La orden «cargar» es «avanzar atacando» con una bandera `charge`; la velocidad de carga gasta cansancio (§3.5).

### 3.4 Moral y huida

⏳ El cambio más importante respecto a hoy, donde todo lucha hasta la muerte. Cada regimiento tiene **moral 0–100** (base por tipo de unidad: milicia 50, caballería pesada 80, General 100, mercenarios 🔶).

Baja por: bajas propias (−1 por cada 5 % de efectivos perdidos en 10 s), flanco y retaguardia (§3.3), carga recibida, **muerte del General** (−30 a todos), vecinos que huyen (−10, el «contagio»), fuego de artillería (−3 por impacto de área), cansancio alto, inferioridad numérica cercana, luchar en terreno bajo contra enemigos en alto.
Sube por: General cerca (+0,5/s dentro del aura ✔ ya existe el radio), enemigos huyendo a la vista (+10), terreno alto, estar en reserva sin combatir (+1/s hasta la base), orden «arengar» del General (+20, enfriamiento 60 s).

Umbrales: por debajo de 25 «vacilante» (−15 % de daño); a 0 **huye**: el regimiento deja de aceptar órdenes y corre a la **zona de huida** de su lado del campo (orden nueva `rout`, que reutiliza el movimiento ✔ y la retirada ✔). Si nadie lo persigue 10 s y está a más de 15 casillas del enemigo, **se recupera** (vuelve a 30 de moral y acepta órdenes); si llega a la zona de huida, abandona el campo (cuenta como huido, §2.5). Las tropas que huyen son presa fácil (×1,5 de daño) y no se defienden: es la fase en que la caballería hace su trabajo, como en Shogun.

Lo que hoy existe se conserva y se reinterpreta: el **aura del General** ✔ (+ataque, +armadura) sigue, y además alimenta la moral.

Unidades sin moral: asedio, artillería y máquinas (huyen sus dotaciones: el regimiento de artillería se **abandona** y queda capturable 🔶), aviación, y 🔶 blindados de la era 6.

### 3.5 Cansancio

⏳ Valor 0–100 por regimiento. Lo gastan correr (orden «correr», ×1,4 de velocidad), cargar y combatir cuerpo a cuerpo; lo recupera estar quieto o caminar. Cansado (>70): −20 % de daño, −15 % de velocidad, −moral. Los blindados y la artillería no se cansan; la caballería se cansa más deprisa; en la Industrial 🔶 el ferrocarril no aplica aquí. Es lo que impide la táctica «todo corriendo todo el rato».

### 3.6 Munición

⏳ Los tiradores tienen **andanadas** limitadas (`UnitDef.battle.ammo`: arqueros 25, ballesteros 18, mosquetes 20, fusiles 40, artillería 15–30). Sin munición pasan a cuerpo a cuerpo con penalización (o, el asedio, a inútil). Hoy la recarga es solo tiempo entre disparos ✔; la munición es un contador más por regimiento. 🔶 Carros de munición (unidad de apoyo que recarga cerca). Deja a la artillería con un papel decisivo pero finito.

### 3.7 Tiro a distancia

- Altura ✔ (alcance y daño), visión con crestas ✔, daño de área que cae donde estaba el blanco ✔.
- ⏳ **Tiro en arco contra tiro tenso**: los arqueros y la artillería de obús disparan **por encima** de sus aliados ✔ (hoy todo lo hace); las armas de tiro tenso (ballesta, escorpión, mosquete, fusil, cañón) necesitan **línea despejada** de aliados en la primera fila: solo disparan las filas delanteras (en línea fina, todas). Se calcula con la línea de visión ya existente para el relieve (`lineClear` ✔) ampliada a unidades propias. Hace que las formaciones de la Pólvora tengan sentido.
- 🔶 **Fuego amigo**: hoy no existe (el área solo daña enemigos ✔). Añadirlo para la artillería es realista y castiga disparar sobre la melé, pero frustra en móvil. Recomendación: no en la primera versión; en todo caso, solo para la artillería y solo al jugador que lo active en ajustes.

### 3.8 Caballería, asedio y artillería

- **Caballería**: carga (§3.3), rapidez para flanquear y perseguir huidos, cansancio alto, débil trabada contra lanzas. Caballería arquera: tira moviéndose 🔶 (hoy se para a disparar) y «hostiga» (disparar y alejarse: orden táctica nueva, fácil con las existentes).
- **Asedio pesado** (ariete, trabuquete, bombarda): solo útil si en el recorte hay muros o edificios; si no, entra como lastre (y con un tope: el jugador decide si lo trae). Sin dotación visible: se abandona al huir.
- **Artillería de campaña** (cañón, cañón de campaña, obús, unicornio, Gribeauval, artillería de montaña): alcance largo, área, munición, **alcance mínimo** ⏳ (ya pedido en §13.6 de civilizaciones), lenta de mover, se **abandona** si la caballería la alcanza (su dotación huye). Contra formaciones cerradas, devastadora: incentiva el orden abierto de la Industrial.
- **Elefantes** (Persia, Etiopía ✔): carga pesada que empuja, moral baja al recibir fuego (🔶 «enloquecen»: se vuelven contra los propios; divertido pero caro).

### 3.9 General y héroes

- El General ✔ (aura 7 casillas) es el **centro de la moral**. Nuevas órdenes ⏳: «arengar» (+moral, enfriamiento) y «ponerse a salvo» (el regimiento va a la retaguardia). Es un regimiento de 1.
- **Su muerte**: hoy decide la batalla al instante ✔. En el mapa de batalla se recomienda **cambiarlo** por «−30 de moral a todos y sin recuperación»: una batalla puede seguir ganándose sin general, y es más Shogun. Mantener la regla actual como opción al crear la partida («Muerte súbita del General»). Ver pregunta 6 en §7.
- 🔶 Héroes de civilización (unidades únicas con aura propia: ya existe `aura` en `UnitDef` ✔) y rasgos del General que mejoran con batallas ganadas.

### 3.10 Control

Lo que el jugador hace en la batalla, en escritorio y en móvil:

| Acción | Escritorio | Móvil / táctil | Estado |
| --- | --- | --- | --- |
| Seleccionar regimiento | Clic en sus tropas o en su **tarjeta** de la barra inferior; cifras 1–9 | Tocar tarjeta (barra inferior desplazable) o tocar tropas; «Todos» | ⏳ (hoy la selección es por unidades ✔) |
| Mover | Clic derecho; **arrastrar** con el derecho para marcar la orientación y la anchura (como Total War) | Tocar destino; **pulsación larga y arrastrar** para orientar; pellizco ✔ ya hace zoom | ⏳ |
| Atacar | Clic derecho en enemigo | Tocar enemigo | ✔ (orden `attack`) |
| Formación y postura | Botones del panel (ya existen ✔ en la pantalla de estrategia y en `commandModel`) | Hoja de la pestaña | ✔ ampliar |
| Correr / caminar, cargar, arengar | Botones; teclas | Botones de la bandeja | ⏳ (`commandModel.ts`, para salir en las dos interfaces) |
| **Pausa táctica / cámara lenta** | Barra espaciadora pausa; se pueden dar órdenes en pausa (hoy la pantalla de estrategia ya pausa contra la IA ✔) | Botón de pausa flotante; órdenes en pausa | ✔ contra la IA · ⏳ en red: **no hay pausa de uno solo**; opción de «cámara lenta consensuada» (×0,5 fijo en batalla para todos) o nada. Ver pregunta 3 |
| Cámara | Como hoy ✔ (isométrica con relieve), con zoom mínimo más lejos para ver todo el campo; 🔶 «seguir al General» | Dos dedos ✔ | ✔ / ⏳ |
| Mapa táctico | La pantalla de estrategia ✔ como vista cenital del campo (ya dibuja grupos y rutas) | La misma | ✔ adaptar |
| Información | Tarjeta con efectivos, moral (barra), cansancio, munición; iconos de «flanqueado», «cargando», «huyendo» sobre el regimiento | Igual, más grande | ⏳ |

La regla de la casa se mantiene: la interfaz **nunca cambia el estado**, da órdenes de red (`session.orders.send`) que ejecuta la simulación ✔; así las mismas órdenes valen contra la IA y en red.

### 3.11 Terreno

| Elemento | Efecto táctico | Estado |
| --- | --- | --- |
| **Altura** | Alcance, daño, visión ✔; además ⏳ +moral arriba, −moral abajo; carga cuesta abajo +ímpetu | ✔ / ⏳ |
| **Bosque** | ⏳ Oculta a los regimientos dentro (no se ven hasta estar cerca: encaja con la visión por casillas ✔), −50 % de velocidad a la caballería, anula la carga, −daño de tiro contra los de dentro. Hoy los árboles son nodos que bloquean el paso ✔: en batalla se copian como terreno **transitable pero lento** (bosque abierto) con claros | ⏳ |
| **Ríos y vados** | ⏳ Si el recorte tiene agua, hay vados (tramos poco profundos marcados ✔ como terreno) donde se cruza a −50 % de velocidad, sin formación y con −moral: quien defiende un vado tiene ventaja | ⏳ |
| **Murallas, puertas, torres, paso de ronda** | Como en la campaña ✔: bloquean, se asedian, los tiradores suben; el aceite hirviendo ✔ | ✔ |
| **Roca y agua profunda** | Intransitables ✔ | ✔ |
| **Zanjas** | Intransitables ✔; en batalla 🔶 trincheras (Industrial) como zanja que sí se ocupa | ✔ / 🔶 |

### 3.12 Fin de la batalla

| Final | Cuándo | Estado |
| --- | --- | --- |
| **Rotura del ejército** | ⏳ ≥ 70 % de los regimientos de un bando (por valor) están huyendo o fuera del campo durante 15 s seguidos. Es el final habitual de una batalla Shogun | ⏳ |
| **Aniquilación** | Un bando sin tropas en el campo (hoy, 30 s sin tropas en el círculo ✔) | ✔ |
| **Muerte del General** | Hoy decide ✔; propuesta: opcional (§3.9) | ✔ opcional |
| **Retirada voluntaria** | ⏳ Botón «Retirarse»: todo el ejército huye ordenadamente (sin pánico, con moral); el rival puede perseguir 60 s más. Cuenta como derrota pero salva tropas | ⏳ |
| **Tiempo** | Al agotarse gana quien tiene más ejército en el campo por valor ✔; propuesta ⏳: contar también la moral media (quien está entero pero huyendo no gana) | ✔ / ⏳ |

### 3.13 Civilizaciones y eras

La capa táctica es por **datos**: cada unidad lleva (o hereda por clase) un bloque `battle` con moral base, cansancio, munición, formaciones permitidas, bono de carga y vulnerabilidad de flanco; las **civilizaciones y sus eras** lo modifican con el mismo sistema de modificadores que ya aplica bonos de ataque o coste ✔ (`CivDef.eras`, tecnologías con efecto `stat` sobre clases). Nada de esto exige ifs por civilización en el motor.

| Era | Cómo se pelea | Qué aporta la capa táctica | Estado |
| --- | --- | --- | --- |
| 0–1 Oscura, Feudal | Masas de infantería ligera y arqueros; caballería escasa | Moral baja de la milicia; la cuña de caballería aterroriza | ✔ datos · ⏳ reglas |
| 2 Castillos | Caballeros, piqueros, arqueros, asedio ✔; elefantes (Persia, Etiopía ✔) | Carga pesada, muro de lanzas, altura; el General aparece aquí (`requiredAge: 2` ✔) | ⏳ |
| 3 Imperial | Primeras armas de fuego ✔, trabuquete ✔ | Mosquete lento pero con golpe de moral; artillería contra muros | ⏳ |
| 4 Pólvora | Mosquete con bayoneta, cañón ✔, dragones ✔; unidades únicas (Gribeauval, Unicornio ✔) | **Línea fina y cuadro**, tiro tenso con línea despejada, munición, la caballería ya no rompe cuadros de frente | ⏳ |
| 5 Industrial | Fusil, ametralladora, cañón de campaña, obús ✔, aviación básica ✔ | **Orden abierto**, artillería con alcance mínimo y área grande, cargas de caballería suicidas contra ametralladoras (moral del que carga baja al recibir fuego), aviación como golpe de moral | ⏳ |
| 6 Contemporánea | ⏳ Blindados (T‑34, Sherman, Renault FT…), artillería autopropulsada (§13 de civilizaciones) | Blindados sin moral ni cansancio, inmunes al tiro ligero, lentos de girar 🔶 (tienen «frente» de blindaje: flanco y retaguardia ×2), trincheras 🔶 | ⏳ (depende de la fase 6) |

Ejemplos de bonos por civilización (todos por datos, 🔶 cifras): Rusia +10 de moral base en defensa del propio lado del campo y en invierno 🔶; Francia: la Gran Batería ✔ recarga más deprisa y el General francés tiene aura más amplia; Gran Bretaña: línea fina sin penalización (la «línea roja»); China: ballesteros con más munición; Persia: elefantes con carga que empuja; Etiopía: artillería de montaña sin alcance mínimo. Con las **doctrinas excluyentes** ✔ (`TechDef.excludes`) se pueden ofrecer estilos: «Choque» (carga +) contra «Fuego» (munición y cadencia +).

---

## 4. Arquitectura técnica

### 4.1 Dónde vive la batalla: tres opciones

| | (a) **Otra instancia de `Game`** para la batalla, hija de la de campaña | (b) Mismo `Game` con una «capa de batalla» (reglas activas dentro del círculo, sin cambiar de mapa) | (c) Simulación aparte (un motor de batalla propio, distinto de `Game`) |
| --- | --- | --- | --- |
| Mapa aparte | Sí: su `GameMap` propio generado del recorte | No (o sí, con un «teletransporte» de todas las entidades y un segundo mapa dentro del mismo juego: muy invasivo) | Sí |
| Reutiliza motor | **Todo**: movimiento, A*, combate, visión, formaciones, relieve, muros, proyectiles, render, guardado, huella, órdenes de red | Todo | Casi nada: habría que reescribir movimiento, combate, render, red y guardado |
| Economía y producción | Se desactivan en la hija (no se registran esos sistemas, o el mod `battle` los apaga) | Hay que **pausar media partida** a mano (producción, recolección, IA de campaña) sin pausar la otra media: lo contrario del motor, que avanza todo o nada | No existen |
| Determinismo y red | La hija vive dentro del mismo reloj y la misma cola de órdenes (§4.7): **casi gratis** | Gratis | Hay que hacerlo de nuevo |
| Guardado en medio de la batalla | La instantánea de la campaña incluye la de la hija (§4.8): un campo más | Gratis | Formato nuevo |
| Riesgo técnico | Medio: `Game` nunca se ha anidado; hay que repasar lo que supone «el juego» global (`window.game`, `Session`, `App.update`, eventos de sonido) | Bajo para la capa táctica; **alto para el mapa aparte** (no encaja) | Muy alto |
| Sirve fuera de Guerra declarada | La capa táctica sí (es un mod); el mapa aparte, solo con un disparador | Sí | No |

**Recomendación: (a) para el mapa de batalla, construido sobre (b) para las reglas tácticas.** Es decir: las reglas de §3 son un mod `battle` que funciona en cualquier `Game` (incluido el de campaña dentro del círculo: eso es la fase 1 de §6 y la «alternativa barata» de §5); y el mapa aparte es una segunda instancia de `Game`, hija, con ese mod activo y la economía apagada. (c) se descarta: el motor actual ya es un motor de batalla razonable (formaciones, altura, muros, proyectiles) y hacer otro duplicaría todo, también el render.

### 4.2 Cómo se crean las unidades de la batalla y cómo vuelven

⏳ Al cerrar la lista (§2.1), el sistema de Guerra declarada construye la **lista de batalla** (`BattleRoster`): por bando, `{ campaignId, defId, hp, maxHp, stance, onWall?, inside? }` de cada unidad que entra, más los edificios del recorte con su vida y su posición trasladada. Es un objeto de datos simples: se guarda, se hashea y se puede mirar en la pantalla de resumen.

Con ella se crea la hija: `new Game(reg, optsBatalla)` donde `optsBatalla` lleva `mapType: 'battle'` (un tipo de mapa registrado por el mod `battle` cuyo `generate` lee el recorte de `opts.battle.terrain`), los **dos jugadores** con su civilización, **edad** y **tecnologías investigadas** (`Player.rebuildModifiers` ✔ reconstruye todos los modificadores a partir de eso: así un mosquetero con «Bayonetas» pega igual en los dos mapas), recursos a cero y sin producción. Las unidades se crean con `game.spawnUnit` y los edificios con `game.placeBuilding` ✔ (id nuevo) y guardan `data.campaignId`; se agrupan en regimientos (§3.1). Los jugadores de la hija son copias **sin** economía: no hay aldeanos, no se cobra ni se entrena.

El `rng` de la hija se siembra con `semilla de la campaña ⊕ id de la guerra ⊕ tick de cierre`: determinista y distinto por batalla.

Al terminar, `applyBattleResult` (§2.5) recorre la lista de batalla: para cada `campaignId`, si su unidad de batalla murió → se elimina de la campaña (`Game.remove` ✔, que ya saca del refugio y de los muros); si vive → `hp` actualizado y recolocación; los edificios igual. Después se destruye la hija y la campaña sigue.

### 4.3 Sistemas: cuáles se reutilizan y cuáles son nuevos

| Sistema / pieza | En la hija | Notas |
| --- | --- | --- |
| `OrderSystem`, `MovementSystem`, A*, suavizado, regiones | ✔ reutilizado | Sin cambios |
| `CombatSystem`, proyectiles, área, altura, aura, `walkway`, `defense` (aceite) | ✔ reutilizado | Sin cambios |
| `VisionSystem` | ✔ reutilizado | Niebla en la franja rival durante el despliegue |
| `FormationSystem` (grupos) | ✔ ampliado | Estado táctico del regimiento; orientación fija; formaciones nuevas por datos |
| `AuraSystem` | ✔ reutilizado | El General |
| `ProductionSystem`, recolección, `PlayerStatsSystem` (economía), `AISystem` de campaña, `VictorySystem` de campaña, sistema de Guerra declarada, comercio, espionaje, fauna | **apagados** | El mod `battle` registra en la hija solo lo que toca; `Registry` ya permite elegir mods por partida ✔ (`opts.mods`) |
| ⏳ `BattleSystem` | nuevo | Fases (despliegue → batalla → fin), reloj, zonas, condiciones de final (§3.12), lista de batalla, `applyBattleResult` |
| ⏳ `MoraleSystem`, cansancio, munición | nuevos | Un sistema con `save()`/`load()` (como `AuraSystem` ✔) o estado en el `Group` (ya se guarda en `game.data.groups` ✔). Recomendación: en el `Group` |
| ⏳ Flancos y carga | nuevo punto de extensión | `reg.addDamageModifier(fn)`: igual que `addCombatRule` ✔ decide *si* se ataca, este multiplica el daño según el ángulo, la carga y la formación. Lo usa el mod `battle`; sin él, nada cambia |
| ⏳ Órdenes nuevas | `rout` (huir), `charge` (bandera de `attackMove`), `run`, `rally` (arengar), `withdraw` (retirada general) | Por `reg.addOrder` ✔ y `reg.addNetCommand` ✔ |
| ⏳ `BattleAISystem` | nuevo | §4.6 |
| ⏳ Tipo de mapa `battle` | nuevo | `MapTypeDef.generate` ✔ que copia y amplía el recorte |

### 4.4 Render

Mismo render ✔: la hija tiene un `GameMap` normal, así que `TerrainGL` (relieve en WebGL2), el Canvas 2D de entidades, los sprites procedurales y las imágenes de arte, las sombras, la niebla y el minimapa funcionan sin cambios. `Session` ✔ («todo lo que vive mientras dura una partida») se crearía **de nuevo para la hija** y se restauraría la de campaña al volver; `App` ya sabe empezar y terminar sesiones ✔. Cambios:

- ⏳ **Cámara**: zoom mínimo más alejado; empezar centrada en la propia franja; 🔶 inclinación o cámara libre: **no** (sería otro render).
- ⏳ **HUD de batalla**: barra de tarjetas de regimiento, panel de órdenes tácticas, reloj y fase, botón de pausa/cámara lenta. En escritorio y móvil, con `commandModel.ts` como fuente única ✔. Es el bloque de interfaz más grande.
- ⏳ Marcas sobre el terreno: franjas de despliegue, zonas de huida, orientación (flecha) y anchura de la formación al arrastrar (`addWorldOverlay` ✔).
- ⏳ Sonido: eventos nuevos (`charge`, `rout`, `rally`, `battlePhase`) → efectos en `sfx.ts`; la música generativa ✔ puede llevar un «modo batalla».

### 4.5 Contenido y catálogo

- `UnitDef.battle?` ⏳: `{ morale, fatigueRate, ammo, charge, formations, flankVuln, regimentSize }`, con valores por defecto por clase en `BALANCE.battle`. Modificable por civilización, era y tecnología con los efectos `stat` existentes ✔ (`moraleAdd`, `chargeMul`…). Los mods de contenido (`core`, `extra-content`) rellenan lo que sea distinto del valor por clase.
- `FormationDef` ⏳ con sus modificadores y requisitos (clase, era).
- Catálogo ✔: columnas nuevas (moral, munición, formaciones), un test que falle si falta el bloque en unidades militares, y una comparativa de civilizaciones en batalla.

### 4.6 IA de batalla

⏳ Un plugin aparte de la IA de campaña (que hoy manda oleadas con `attackMove` ✔ y, en Guerra declarada, lleva el ejército al círculo ✔). Por reglas, determinista, barato:

1. **Despliegue por plantilla**: `BALANCE.army.placement` ✔ ya dice dónde va cada papel (infantería delante, tiradores detrás, caballería en los flancos, asedio atrás); se añade: ocupar la altura propia si la hay, cubrir un paso, General en el centro detrás.
2. **Plan inicial** según la comparación de fuerzas: defender (quieto en lo alto, línea de tiradores, esperar), avanzar en línea, o doble envolvente (caballería a los dos flancos cuando la infantería trabe).
3. **Reglas de cada 2 s**: tiradores retroceden si les llega infantería; caballería carga a regimientos de tiro o a los de moral baja; retirar un regimiento vacilante a la retaguardia; perseguir huidos solo con caballería y solo si el centro aguanta; arengar cuando la moral media cae; retirada general si la batalla está perdida (salvar tropas: §3.12).
4. Dificultad: fácil no flanquea ni retira; difícil usa la altura, la carga de flanco y la retirada.

La IA de campaña decide además **qué llevar** a la batalla (hoy lleva todo al círculo ✔): con el radio de reunión bastará con que concentre el ejército a tiempo, dejando la guarnición de los muros ✔.

### 4.7 Determinismo y multijugador por pasos sincronizados

Lo esencial: **la hija no es otra partida en red; es parte de la misma**. Propuesta ⏳:

- `Game` gana un campo `child?: Game`. `Game.update(dt)` hace: si hay hija activa, **actualiza la hija y no la campaña** (la campaña queda congelada en el mismo tick, como ya ocurre con la pausa en red `data.netPause` ✔, que avanza ticks sin avanzar el tiempo). Así el `LockstepPeer` ✔, los turnos, el retardo de entrada, las esperas y las desconexiones **no cambian**: siguen hablando con el `Game` de campaña.
- Las órdenes de red de la batalla son órdenes de mod (`{ t: 'mod', id: 'battle', args }`) ✔ que el manejador reenvía a la hija. Las órdenes de campaña que lleguen durante la batalla se rechazan (la campaña está congelada).
- `stateHash` ✔ incluye la huella de la hija (`h.value(child)`), así una desincronización en la batalla se detecta igual.
- Todo el código nuevo cumple las reglas ✔ de la casa: `hypot`, `sin`, `cos` de `fmath`, `game.rng()`, nada de reloj. Los ángulos de flanco se calculan con producto escalar (sin `atan2`).
- **Despliegue**: cada cliente manda sus órdenes de despliegue como órdenes normales; el fin de la fase es un tick fijo (o el tick en que llega el segundo «Listo», que es una orden más y por tanto el mismo en todos). Ver §2.3 sobre la ocultación.
- **IA**: forma parte de la simulación ✔, da lo mismo en todos los clientes.
- **Pausa táctica**: en red no hay pausa individual ✔ (sería injusto); la pausa para todos ✔ ya existe (`pause`). Para la batalla se ofrece 🔶 cámara lenta fija consensuada en la creación de la partida.
- Riesgo propio de la red: la batalla es la fase de **más unidades por tick**; con el retardo de entrada de 2–6 ticks ✔ no hay problema, pero un móvil lento alargará el tick y los demás esperan. `npm run lockstep` ✔ y `npm run engines` ✔ se amplían con una batalla.
- 🔶 Jugadores que **no participan** en la batalla (partidas de 3+): ven la batalla como espectadores (reciben todo) o una pantalla de espera; no mandan órdenes. Preguntar (§7, pregunta 4).

### 4.8 Guardado

⏳ La instantánea de la campaña ✔ gana un campo `child` con la instantánea de la hija (la misma función `snapshot` ✔, recursiva) y `data.battleRoster`. Al cargar, se reconstruye la hija con `new Game(reg, child.opts, child)` ✔ (el constructor ya restaura sin generar el mapa) y se vuelve a enganchar. Sube `SAVE_VERSION` (2 → 3) con una migración trivial (sin `child`). El guardado automático ✔ funciona en medio de la batalla sin más. `tests/save.test.ts` ✔ se amplía con una partida guardada en pleno despliegue y en plena batalla.

### 4.9 Rendimiento en móvil

Objetivo ✔ de la casa: 30 FPS en un móvil de gama media. Datos actuales (`docs/rendimiento.md` ✔): 300 unidades cruzando los Pirineos a la vez, peor tick 48 ms (los caminos se reparten entre ticks ✔); partida de 4 IA, 0,08 ms/tick; render de 5.200 entidades, ~1 ms por fotograma en el Mac (×5–10 en móvil). Para la batalla:

- **Regimientos = un camino por grupo** ✔ (líder + huecos): 25 regimientos son 25 A*, no 300.
- El **combate** sigue siendo por unidad (búsqueda de blanco, golpe): es lo que hoy ya ocurre en las oleadas; 300 unidades trabadas es el caso a medir. Mitigación: la búsqueda de blancos por regimiento (el regimiento elige el enemigo, las unidades el individuo más cercano de ese regimiento) reduce el coste y además es más «Shogun».
- Moral, cansancio y munición son **por regimiento**, cada 0,5 s: coste despreciable.
- Render: tope de unidades por bando ajustado por la **calidad gráfica automática** ✔; 🔶 dibujo agrupado (una sombra por regimiento, menos detalle lejos).
- El mapa de batalla es pequeño (~50×50): visión y A* más baratos que en campaña.
- Criterio: `npm run bench` ✔ gana «batalla de 150 contra 150, 10 minutos»; se mide en un móvil real antes de dar la fase por terminada.

---

## 5. Riesgos y alternativas más baratas

### 5.1 Riesgos

| Riesgo | Por qué | Cómo se reduce |
| --- | --- | --- |
| **Es un segundo juego** | Interfaz de batalla (dos versiones), IA nueva, balance nuevo, arte de estado (iconos de moral, huida) | Fases con algo jugable al final de cada una (§6); la capa táctica primero, que vale aunque el mapa aparte no llegue |
| **Balance** | Moral, carga y flancos cambian todo el valor relativo de las unidades (la caballería sube, la milicia baja) | Valores en un sitio (`BALANCE.battle` y bloques `battle`); `npm run simulate` con batallas IA contra IA por era y una tabla de resultados; empezar con efectos **suaves** (×1,3, −2/s) |
| **Anidar `Game`** | Nunca se ha hecho; hay código que da por hecho «el juego» (`window.game`, sonido, `Session`, guardado automático, `App.update`) | Fase 3 con Opus; hacer primero un prototipo descartable en `scripts/` que cree una hija a partir de una partida y la simule sin interfaz |
| **Red** | La batalla concentra unidades; el despliegue y el reloj compartido son nuevos; un desincronismo en la batalla deja la campaña rota | Reutilizar el lockstep tal cual (§4.7); `npm run lockstep` con batalla; red en la última fase, no antes |
| **Móvil** | Dar órdenes a 20 regimientos con el dedo en 6 pulgadas; pausa táctica como muleta obligatoria | Tarjetas grandes, «todos», plantillas, pausa; probar en un móvil real al final de la fase 2 |
| **Frustración** | Ver huir a tu ejército sin poder hacer nada; batallas perdidas «por moral» sin entenderlo | Iconos claros, avisos («¡Tu flanco izquierdo cede!»), tutorial corto, y efectos suaves al principio |
| **La campaña congelada** | Partidas de 3+: dos luchan y el tercero espera 10 minutos | Opción de espectador; o permitir solo 1 contra 1 en la primera versión (§7, pregunta 4) |
| **Asedio sin sentido** | En un campo sin muros, el asedio pesado estorba | El jugador decide si lo lleva (radio de reunión) y la IA no lo lleva si no hay muros en el recorte |

### 5.2 Alternativas más baratas (de menos a más)

| Nivel | Qué es | Qué da | Qué cuesta |
| --- | --- | --- | --- |
| **A0. Batalla automática con despliegue** | Al cerrar la cuenta atrás, cada jugador despliega sus regimientos en su lado del **círculo actual** (sin cambiar de mapa) y da **un plan** (defender / avanzar / envolver); después la batalla se resuelve sola con la IA de batalla para los dos y el jugador solo mira (con cámara lenta y zoom) | Casi toda la sensación de «batalla campal» con muy poca interfaz; la IA de batalla se construye igualmente | Capa táctica + despliegue + IA; sin HUD de batalla |
| **A1. Capa táctica en el mapa de campaña** | Las reglas de §3 activas dentro del círculo de Guerra declarada (o siempre, como mod), con la interfaz y la pantalla de estrategia actuales | Jugable desde la fase 1; sirve también fuera del modo; se prueba con `npm run simulate` | Sin mapa aparte ni despliegue: la batalla sigue siendo «llegar al círculo y luchar» |
| **A2. Completa** | Todo lo de este documento | La experiencia pedida | Todas las fases |

**Recomendación:** A1 como primera entrega jugable, A0 como *modo de resolución* opcional que se queda para siempre (útil en móvil, en red y para quien no quiera controlar en vivo), y A2 como meta. A0 y A2 comparten casi todo salvo el HUD de batalla.

---

## 6. Hoja de ruta por fases

Modelos y esfuerzo según `docs/flujo-de-trabajo.md`. Tamaño: S (un día de sesión), M (2–4), L (5+). Cada fase deja algo que se puede probar y fusionar en `main` sin esperar a la siguiente.

| Fase | Qué | Toca | Tamaño | Riesgo | «Hecho» cuando | Modelo / esfuerzo |
| --- | --- | --- | --- | --- | --- | --- |
| **0. Prototipo descartable** | Un script `scripts/battle-proto.ts` (no se fusiona): dos ejércitos iguales en Arabia con moral, flancos y carga «a lo bruto», IA simple, 50 partidas por semilla; tabla de resultados (quién gana, duración, bajas) | `scripts/` | S | Bajo | Se ve que la moral y los flancos producen batallas con **final claro en 3–8 min** y que la caballería gana si flanquea y pierde de frente contra lanzas; se fijan las cifras iniciales de `BALANCE.battle` | Opus 5.5, medio (es diseño de reglas con números) |
| **1. Capa táctica en el motor** (= A1) | Mod `battle`: regimientos sobre `Group`, moral y huida (`rout`), flancos y carga (`addDamageModifier`), cansancio, orientación fija; iconos de estado sobre las tropas; activo dentro del círculo de Guerra declarada y, como opción de partida, siempre | `game/army/`, `combat.ts` (punto de extensión), `mods/battle/`, `balance.ts`, `commandModel.ts` (correr, cargar, arengar), tests | L | Medio | `npm test` con `tests/battle.test.ts` (flanco ×1,3, huida a 0, recuperación, carga anulada por lanzas, determinismo en Node y `jsc`); `npm run simulate` 20 min Guerra declarada termina con batalla «rota» y no por tiempo; guardado idéntico tras cargar; `npm run catalog` al día | **Opus 5.5, alto** (motor y reglas, afecta a todo el combate) |
| **2. Despliegue e interfaz de batalla** | Cierre de la lista, radio de reunión, franjas de despliegue en el círculo actual, tarjetas de regimiento, arrastrar para orientar (ratón y táctil), pausa/cámara lenta en batalla, pantalla de resultado, sonidos | `mods/declared-war/`, `ui/` (HUD, MobileHUD, StrategyScreen, Input), `audio/` | L | Medio | Se juega una Guerra declarada entera contra la IA en escritorio y en un móvil real a ≥30 FPS con 100 contra 100; las órdenes van por `session.orders.send`; en red no hay pausa individual | **Sonnet 5.5, alto** (interfaz; rediseño de pantalla) |
| **3. Mapa de batalla aparte** (= A2) | `Game` hija: tipo de mapa `battle` (recorte ampliado ×2 con relieve, muros y edificios), lista de batalla, `applyBattleResult`, `Session` de batalla, campaña congelada, guardado con `child` (`SAVE_VERSION` 3), huella con hija | `game/Game.ts`, `save.ts`, `net/hash.ts`, `app/`, `mods/battle/map.ts`, tests | L | **Alto** | Ida y vuelta completa contra la IA con bajas, vida, muros dañados y botín aplicados; guardar y cargar en pleno despliegue y en plena batalla; `tests/save.test.ts` y `war.test.ts` en verde; `npm run simulate` lo recorre sin gráficos | **Opus 5.5, alto** (arquitectura) |
| **4. IA de batalla** | Plugin: despliegue por plantilla, plan, reglas de cada 2 s, retirada, dificultades; la IA de campaña elige qué llevar | `mods/battle/ai.ts`, `AISystem` (qué llevar) | M | Medio | 30 batallas IA difícil contra IA fácil: gana ≥ 80 %; difícil contra difícil: < 20 % de finales por tiempo; sin ejércitos quietos | Sonnet 5.5, alto (IA rival); Opus si no sale |
| **5. Red** | Órdenes de batalla por la cola de turnos, hija bajo el mismo reloj, despliegue en red, espectadores, cámara lenta consensuada; `npm run lockstep` y `engines` con batalla | `game/net/`, `src/net/NetGame.ts`, `ui/NetHud.ts` | M | Alto | `npm run lockstep -- 20` con una Guerra declarada completa sin desincronización al ~100 % del tiempo real; prueba en dos dispositivos reales (`docs/multijugador.md` §pruebas) | **Opus 5.5, alto** (xhigh si hay desincronizaciones) |
| **6. Contenido por era y civilización** | Munición, formaciones nuevas (lanzas, cuadro, línea fina, orden abierto), tiro tenso con línea despejada, bloques `battle` por unidad, bonos por civilización y era, doctrinas, alcance mínimo de artillería, bosque y vados | `mods/core/*`, `balance.ts`, catálogo | M | Bajo | Catálogo al día; `simulate` por era (Castillos, Pólvora, Industrial) con finales claros; comparativa de civilizaciones en batalla documentada | Sonnet 5.5, medio (contenido) |
| **7. Pulido** | Meteorología, heridos, refuerzos, batalla de asedio bajo murallas, música de batalla, arte de estados, tutorial, nombres de batallas | varios | M | Bajo | Lo que se decida en §7 | Sonnet 5.5, medio; Haiku para retoques |

Orden y dependencias: 0 → 1 → 2 → 3 → 4 → 5; 6 puede ir en paralelo a 3–5 (solo datos) una vez acabada la 1; 7 al final. **Se puede parar después de la 1, la 2 o la 4** y tener algo redondo. Si el usuario prefiere ver antes el mapa aparte, la 3 se puede adelantar a la 2 (con la interfaz actual como HUD provisional), pero no antes de la 1.

Prototipo descartable: la **fase 0** (un script, sin interfaz, medio día) decide si las reglas de moral y flancos producen batallas interesantes antes de tocar el motor. Si no convence, se ajusta sobre el papel sin haber escrito nada permanente.

---

## 7. Preguntas abiertas para el usuario (por prioridad)

1. **Escala.** ¿Hasta cuántas tropas por bando en la batalla (propuesta: 150, en regimientos de 6–12)? ¿Y qué entra: todo el ejército, lo que esté en el círculo, o lo que esté a una distancia de marcha (propuesta)?
2. **Control en vivo o automático.** ¿El jugador manda los regimientos durante la batalla (A2), solo despliega y da un plan y luego mira (A0), o las dos cosas como opción? Decide el tamaño de la fase 2.
3. **Pausa táctica.** Contra la IA, ¿pausa total con órdenes en pausa, cámara lenta, o nada (tiempo real puro)? En red no hay pausa individual: ¿cámara lenta para todos o tiempo real?
4. **La campaña se congela por completo** durante la batalla (propuesta) ¿o sigue para quien no participa? Y en partidas de 3 o más, ¿los demás miran, esperan, o se limita Guerra declarada a 1 contra 1 en la primera versión?
5. **Red desde el principio o después.** ¿La primera versión tiene que jugarse en red (eso adelanta la fase 5 y encarece la 2 y la 3), o basta contra la IA y la red llega después?
6. **El General.** ¿Su muerte sigue decidiendo la batalla al instante (como hoy) o pasa a ser un golpe de moral (propuesta, con la regla actual como opción)?
7. **Mapa de batalla.** ¿Recorte del terreno real (propuesta), escenario tipo, o híbrido? ¿Ampliación ×2 (campo de ~50×50) o ×3?
8. **Dureza de la moral.** ¿Batallas que se rompen pronto (Shogun: a los 3–5 min un bando huye) o largas y sangrientas (más parecido a hoy)? Fija los valores de la fase 0.
9. **Fuego amigo de la artillería.** ¿Sí (realista, castiga), no (propuesta inicial), o como ajuste?
10. **Qué pasa con las bajas.** ¿Mueren todas (sencillo), o un porcentaje de heridos vuelve al ganador?

Las decisiones por defecto que toma este documento si no se contesta: 150 por bando y radio de reunión; control en vivo con A0 como opción; pausa total contra la IA y tiempo real en red; campaña congelada y batallas 1 contra 1; contra la IA primero; General como golpe de moral con la regla actual como opción; recorte real ×2; moral que rompe pronto pero con efectos suaves al principio; sin fuego amigo; sin heridos.
