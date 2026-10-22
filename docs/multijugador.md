# Multijugador en red

Este documento tiene dos partes:
- **Lo construido** (rama `feat/multijugador`): cómo funciona, cómo probarlo y qué falta comprobar.
- **El informe de viabilidad** (rama `feat/multijugador-viabilidad`, 20 de octubre de 2026), con las
  mediciones que llevaron a la decisión.

## Lo construido

Pasos sincronizados deterministas (lockstep), como en el informe: cada dispositivo ejecuta la
partida entera y solo viajan las órdenes. Todo es gratis y sin servidor propio: la web sigue
siendo una PWA estática en GitHub Pages.

### Cómo se juega

**🌐 Jugar en red con amigos**, en el menú principal. Alguien crea la sala (el anfitrión), elige
mapa y opciones y puede añadir jugadores de la IA. Los demás se unen, y cada uno elige su nombre,
civilización y color. El anfitrión pulsa **Empezar** y todos cargan su partida. Funciona igual en
la interfaz de escritorio y en la móvil.

Hay tres formas de conectar:

| Forma | Para qué | Cómo |
| --- | --- | --- |
| 🌍 **Por internet** | Jugar con alguien en otra casa, o un móvil en wifi y otro con datos | Sala con código de 6 letras, enlace y QR. Los navegadores se encuentran por redes públicas y gratuitas ([Trystero](https://github.com/dmotz/trystero): relés de Nostr; si en 8 s no hay nadie, también rastreadores de BitTorrent y brókeres MQTT). Después hablan directamente (WebRTC, cifrado), y la señalización va cifrada con el código de la sala |
| 📷 **Sin intermediarios** | La misma wifi, o no depender de ningún servicio | El anfitrión crea una invitación por jugador (QR o enlace para copiar o compartir). El otro la abre y le devuelve su respuesta: escaneando su QR con la cámara (el enlace llega solo a la pestaña del juego), o copiándola y pegándola. Solo se usan los STUN públicos para que cada uno averigüe su dirección |
| 🗂 **En este navegador** | Probar sin red | Otra pestaña del mismo navegador (BroadcastChannel) |

En partida:
- Arriba a la derecha: **📶 latencia · ⏱ retardo** de las órdenes (verde si va bien).
- **Pausa para todos** desde el menú (escritorio) o ☰ → Partida (móvil); cualquiera la quita con
  **▶ Reanudar**. Abrir un menú no para el juego. La velocidad, en Ajustes, cambia para todos.
- **Nadie para a los demás.** El anfitrión cierra cada turno a su hora: si las órdenes de alguien
  llegan tarde (mala red), salen en el turno siguiente y la partida sigue para todos. Un invitado
  solo ve **"Esperando a…"** si lleva más de 1 s sin noticias del anfitrión. Si alguien deja de
  mandar órdenes (4 s si se ha desconectado o ha salido de la app, 12 s si sigue conectado pero no
  avanza), **la IA juega por él**. Al volver, recibe la partida de ese momento y retoma el mando él
  solo.
- Si un invitado **recarga la página** (o el móvil le cierra la pestaña), vuelve solo a la partida.
- Si **te derrotan**, puedes seguir mirando mientras los demás juegan.
- Si se **pierde al anfitrión**: esperar a que vuelva, **seguir solo contra la IA** (la IA juega
  por los demás) o salir. Si el anfitrión solo ha salido de la app, avisa y se le espera 2 minutos.
- Si dos partidas **se desincronizan** (no debería pasar), el invitado lo detecta en un segundo y
  carga la del anfitrión sin hacer nada.

### Cómo funciona

| Pieza | Archivo |
| --- | --- |
| Órdenes en JSON (incluidas pausa, velocidad, "la IA juega por…" y las de los mods con `reg.addNetCommand`) | `src/game/net/netCommands.ts` |
| Pasos sincronizados: turnos, retardo variable, jugadores que se van y vuelven | `src/game/net/lockstep.ts` |
| Huella del estado | `src/game/net/hash.ts` |
| Matemáticas iguales en todos los navegadores | `src/game/fmath.ts` |
| La partida en red de la sala al final, sin DOM (se prueba en Node) | `src/net/NetGame.ts`, `src/net/protocol.ts` |
| Transportes: pestañas, Trystero y código o QR; mensajes en trozos numerados | `src/net/transports/`, `src/net/framing.ts` |
| La interfaz da las órdenes a `session.orders` (al momento contra la IA, por la red en línea) | `src/app/orders.ts` |
| Sala, indicador en partida, menús | `src/ui/Lobby.ts`, `src/ui/NetHud.ts`, `src/ui/Menu.ts`, `src/ui/MobileHUD.ts` |

- **El anfitrión manda.** Los invitados solo hablan con él y él retransmite los turnos de todos
  (en estrella). Así decide sin ambigüedad quién juega en cada tick: si alguien se va, sabe cuál fue
  su último turno; si vuelve, le hace sitio unos ticks más adelante. Mientras le manda la partida,
  lo que le enviaría espera y va justo detrás. Si se va el anfitrión, la partida en red termina (no
  hay cambio de anfitrión); cada uno puede seguir solo contra la IA.
- **Todos empiezan con la partida guardada del anfitrión** (comprimida, 30 a 95 KB), no con la
  semilla. Además se compara una huella del contenido del juego: con versiones o mods distintos, no
  se empieza.
- **El anfitrión cierra cada tick a su hora.** Manda su turno de un tick al ejecutarlo, y esa es
  la señal de que el tick está cerrado: los invitados no lo ejecutan hasta recibirla. Si el turno
  de un invitado no ha llegado tras un margen de 120 ms, ese tick se cierra con su turno vacío (va
  en la lista `forced`) y sus órdenes salen en el siguiente; si sigue sin llegar, ya no se le espera
  en los siguientes ticks. Mientras dura el margen, el reloj del anfitrión sigue contando y luego
  recupera el tiempo, así que la mala red de uno no hace más lenta la partida de los demás.
- **Retardo por jugador, en tiempo real:** el anfitrión, el mínimo (2 ticks: él cierra los ticks);
  cada invitado, su ida y vuelta más su variación y dos fotogramas, en milisegundos reales (un tick
  dura 50 ms entre la velocidad: 33 ms a ×1,5, 17 ms a ×3). Sube al momento si más del 10 % de sus
  turnos llegan tarde y baja despacio. Tope: 1 s.
- **Respuesta inmediata:** la marca y el sonido de una orden salen al darla, aunque se ejecute
  unos ticks después.
- **Comprobación de sincronía:** la huella del anfitrión viaja cada segundo con sus turnos.
- **Trozos numerados:** cada mensaje se parte en trozos de 12 KB con número y se recompone en orden.
  Así nada adelanta a la partida guardada, aunque Trystero mande los mensajes grandes por otro
  camino.

### Gratis y sin servidor propio

- **Señalización:** relés públicos de Nostr, rastreadores de BitTorrent y brókeres MQTT (Trystero);
  el anfitrión espera en los tres. En el modo sin intermediarios no hay señalización: la hacen las
  personas, copiando o escaneando.
- **STUN:** públicos y gratuitos (Google y Cloudflare). Con ellos conecta la gran mayoría de redes.
- **TURN (opcional, propio):** solo hace falta si las dos redes no dejan conectar directamente
  (ver «Cuándo hace falta un TURN» más abajo). Se configura en **Opciones de conexión**, se prueba
  con **🔎 Probar TURN** y se guarda solo en ese navegador (nunca en el repositorio). Por defecto no
  hay ninguno: no existe un TURN público fiable sin cuenta (las credenciales públicas del Open Relay
  de Metered ya no funcionan: su servidor ni siquiera resuelve, comprobado en octubre de 2026), y un
  relé ajeno ve las direcciones IP de los jugadores.
- **Tamaño:** Trystero añade unos 330 KB a la descarga (MQTT, el más grande, se carga solo si hace
  falta). Todo queda en la caché sin conexión de la PWA.

### Cómo probarlo

**1. Dos pestañas en el ordenador** (sin red):
```bash
npm run dev
```
1. Abre http://localhost:5173 → **🌐 Jugar en red** → **🗂 En este navegador** → **Crear sala**.
2. Copia el enlace de la sala y ábrelo en **otra ventana** (no en otra pestaña de la misma ventana).
   Ponlas una al lado de la otra: una pestaña oculta no avanza y, como en un móvil que sale de la
   app, a los 4 s la IA juega por ella.
3. Elige civilización y color en cada una, y **Empezar** en la del anfitrión.

**2. Dos móviles, uno en wifi y otro con datos** (por internet): hace falta la web publicada
(GitHub Pages, https) o el APK.
1. Móvil A: **🌐 Jugar en red** → **🌍 Por internet** → **Crear sala**.
2. Móvil B: escanea el QR de la sala (botón **▦ QR**) con la cámara, o ábrelo con el enlace
   (**📤 Compartir** por WhatsApp, por ejemplo), o escribe el código en **Unirme**.
3. Si no se encuentran en unos 20 s, prueba otra señalización en **Opciones de conexión**. Si se
   encuentran pero no conectan ("could not connect… configure TURN"), alguna de las dos redes
   bloquea la conexión directa: hace falta un TURN.

**3. Dos móviles en la misma wifi, sin intermediarios:**
1. Móvil A: **📷 Sin intermediarios** → **Crear sala** → **➕ Crear invitación**.
2. Móvil B: escanea el QR con la cámara. Se abre el juego con su respuesta en pantalla.
3. Móvil A: escanea el QR de la respuesta con la cámara. Llega sola a la pestaña del juego (en el
   mismo navegador; con la app instalada en iPhone, mejor copiar y pegar). La respuesta también se
   puede copiar y pegar en **Pega aquí su respuesta**.

**Automático:** `npm test` incluye `tests/netgame.test.ts`: sala, 3 humanos y la IA, retardo
adaptable, pausa y velocidad, corte y vuelta, segundo plano del invitado y del anfitrión,
desincronización, versiones distintas y anfitrión perdido, todo con un transporte en memoria con
latencia.

### Cuándo hace falta un TURN y cómo tener uno

**Cuándo:** el aviso de la sala dice «Os habéis encontrado, pero vuestras redes no dejan conectar
directamente». Los dos navegadores se han encontrado por la señalización pública, pero WebRTC no ha
podido abrir un camino directo: pasa con algunos datos móviles (CGNAT simétrico), redes de empresa,
de hotel o universidad, y algunos routers. Antes de montar nada, probad: los dos en la misma wifi, o
el del móvil con wifi en vez de datos, o cambiar quién crea la sala. Si con alguna combinación
conecta, no hace falta TURN.

**Qué poner en Opciones de conexión:** una o varias direcciones (`turn:servidor:3478`,
`turns:servidor:5349`, separadas por comas) con usuario y contraseña, o la lista JSON de
`iceServers` que dan algunos servicios (se pega tal cual; usuario y contraseña van dentro). Los dos
jugadores deben ponerlo (o al menos el que está en la red difícil). **🔎 Probar TURN** dice si
responde, si rechaza las credenciales o si no llega desde esa red.

**Opciones, de menos a más trabajo:**
- **[Cloudflare Realtime TURN](https://developers.cloudflare.com/realtime/pricing/):** 1.000 GB al
  mes gratis (una partida gasta unos 0,7 KB/s por jugador: sobra). Hace falta una cuenta de
  Cloudflare y crear una clave TURN en el panel. La clave no se pone en el juego: con ella se piden
  credenciales temporales ([guía](https://developers.cloudflare.com/calls/turn/generate-credentials)):
  ```bash
  curl -X POST "https://rtc.live.cloudflare.com/v1/turn/keys/ID_DE_LA_CLAVE/credentials/generate-ice-servers" -H "Authorization: Bearer TOKEN_DE_LA_CLAVE" -H "Content-Type: application/json" -d '{"ttl": 86400}'
  ```
  La respuesta (`{"iceServers": [...]}`) se pega tal cual en el campo TURN y vale 24 horas. Fiable
  y rápido, pero hay que renovarla para cada día de partidas.
- **Metered:** tiene un plan gratuito pequeño con panel que da el JSON de `iceServers` (comprobad
  la cuota actual en su web).
- **Un `coturn` propio** (lo más controlado): en cualquier servidor con IP pública. Sirve un VPS de
  los más pequeños (unos 4–5 €/mes, o la capa gratuita de algún proveedor de nube) o un ordenador de
  casa con puertos abiertos en el router.
  ```bash
  sudo apt install coturn
  ```
  En `/etc/turnserver.conf`:
  ```
  listening-port=3478
  fingerprint
  lt-cred-mech
  user=jugador:una-contraseña-larga
  realm=aoe.local
  external-ip=IP.PUBLICA.DEL.SERVIDOR
  min-port=49160
  max-port=49200
  no-cli
  ```
  Abrid en el cortafuegos el 3478 (UDP y TCP) y el rango 49160–49200 (UDP). Activad el servicio
  (`TURNSERVER_ENABLED=1` en `/etc/default/coturn`) y arrancadlo con
  `sudo systemctl restart coturn`. En el juego: `turn:IP.PUBLICA.DEL.SERVIDOR:3478`, usuario
  `jugador` y la contraseña. Con un dominio y certificado se puede añadir TLS (`turns:` en el puerto
  5349 o 443), que pasa casi cualquier cortafuegos.

El TURN solo reenvía los paquetes, que van cifrados de punta a punta (DTLS): no puede leer la
partida, pero sí ve las direcciones IP de los dos.

### Pruebas con dos ordenadores y con móvil y ordenador (octubre de 2026)

Primeras pruebas reales con la web publicada (rama `fix/multijugador-pruebas`):

**1. Dos ordenadores por internet: iba muy lento y salía «Esperando al otro jugador» todo el
rato.** Simulado con `npm run lockstep` (red con latencia, variación y paquetes tardíos), las
causas eran tres:
- **El retardo de las órdenes no contaba la velocidad de juego.** Se calculaba en ticks de 50 ms,
  pero a la velocidad Normal (×1,5) un tick dura 33 ms y a ×3, 17 ms: salía entre un 33 y un 67 %
  más corto de lo necesario, y los turnos llegaban tarde una y otra vez.
- **Un turno tardío paraba a todos.** En los pasos sincronizados puros nadie avanza sin el turno
  de todos; cada pico de la red de uno congelaba a los demás, y ese tiempo no se recuperaba.
- **El aviso «Esperando a…» mentía:** un cliente que iba justo a tiempo (un tick por fotograma, y
  al acabar el fotograma ya esperando el siguiente) acumulaba «espera» sin parar, y el aviso salía
  aunque la partida avanzara bien.

No eran la simulación, ni el render, ni la huella: dos copias del juego completo (con render) en
el navegador, conectadas por Trystero y WebRTC, van al 100 % del tiempo real con menos de 1 ms de
CPU por fotograma.

Arreglos: retardo en milisegundos reales y por jugador, cierre de cada tick por el anfitrión a su
hora (los turnos tardíos salen en el siguiente, sin parar a nadie) y aviso solo tras 1 s sin poder
avanzar (ver «Cómo funciona»). Velocidad real del juego, partida completa (NetGame) con dos
jugadores durante 40–60 s:

| Red simulada | `main` antes, ×1,5 / ×3 | Ahora, ×1,5 / ×3 | Retardo ahora (anfitrión / invitado), ×1,5 |
| --- | --- | --- | --- |
| Misma wifi (3 ms) | 100 / 100 %, pero aviso de espera el 50 % del tiempo a ×3 | 100 / 100 %, sin aviso | 67 / 100 ms |
| Fibra, misma ciudad (15 ms) | 99,5 / 97,4 % | 99,9 / 100 % | 67 / 133 ms |
| Otro país (45 ms, 1 % de picos de 200 ms) | 95 / **74 %** | 99,9 / 100 % | 67 / 265 ms |
| Lejos: 100–300 ms y 2 % de tardíos de 300 ms | 87 / **54 %** | 100 / 99,9 % | 67 / 699 ms |
| 4G (60 ms + 0–60, 2 % de picos de 400 ms) | 82 / **69 %** | 100 / 100 % | 67 / 541 ms |
| 2 invitados, uno con muy mala red | 75 / **42 %** | 99,7 / 100 % | 67 / 1.000 ms (el de la mala red) |

En ningún caso sale ya el aviso «Esperando…», ni hay desincronizaciones. El precio: el retardo de
un invitado es ahora su ida y vuelta con el anfitrión (antes, solo la ida, pero con parones). En
internet normal, unos 250–300 ms; en redes muy lejanas o malas, más. El anfitrión responde casi al
momento.

**2. Móvil + ordenador: «No se pudo conectar (could not connect to peer … configure TURN
servers)».** Se encontraban por la señalización, pero sus redes no dejaban abrir una conexión
directa (NAT). Hace falta un TURN (ver arriba). Ahora el aviso lo explica en español, con qué
probar y un botón **🔄 Reintentar**, y la sala enseña si cada conexión es directa o por TURN.

**Cómo probar con móvil y ordenador** (con la web publicada en https, o el APK):
1. En el ordenador: **🌐 Jugar en red** → **🌍 Por internet** → **Crear sala** → **▦ QR**.
2. En el móvil: escanea el QR con la cámara (se abre el juego y entra en la sala). En la sala,
   junto a cada jugador, sale **📶 directa** o **🔁 TURN**.
3. Si sale «vuestras redes no dejan conectar directamente»: prueba primero con el móvil en la
   misma wifi que el ordenador (debería conectar, directa). Si con datos móviles no conecta, hace
   falta un TURN: ponlo en **Opciones de conexión** en los dos, pulsa **🔎 Probar TURN** y
   **🔄 Reintentar**.
4. Ya en partida: el indicador **📶 · ⏱** dice la latencia y el retardo de tus órdenes. Si el del
   móvil va con mala red, sus órdenes tardan algo más, pero la partida no se para para nadie.

### Qué queda por comprobar en dispositivos reales

- **WebRTC entre dispositivos distintos.** Probado de punta a punta en el navegador, por Trystero
  (Nostr) y WebRTC, entre dos copias del juego en el mismo ordenador (conexión directa). Falta
  repetirlo entre dos ordenadores por internet y entre un móvil con datos y un ordenador, ya con
  los arreglos de esta rama, y probar un TURN real (Cloudflare o un `coturn`).
- **Safari en iOS:** que las conexiones WebRTC sobreviven a salir un momento de la app (si se
  cortan, el invitado vuelve solo cuando Trystero reconecta; en el modo sin intermediarios hay que
  crear otra invitación). También que con la app instalada en la pantalla de inicio el QR de
  respuesta no llega a la app (otra caché): ahí se copia y pega.
- **Firefox:** el determinismo entre motores se midió en V8 y JavaScriptCore, no en SpiderMonkey.
- **Rendimiento en un móvil de gama media** con 4 a 8 jugadores: la huella cuesta unos 2 ms por
  segundo en un ordenador.
- **Redes con CGNAT estricto** sin TURN.

### Límites conocidos

- No hay cambio de anfitrión: si el anfitrión cierra el juego, la partida en red termina (cada
  uno puede seguir contra la IA).
- Todo pasa por el anfitrión: el retardo de cada invitado es su ida y vuelta con el anfitrión. Si
  el anfitrión tiene mala red, la notan todos los invitados (mejor que sea el que tenga mejor
  conexión, por ejemplo el ordenador con cable o wifi y no el móvil con datos).
- Quien quiera hacer trampas puede ver todo el mapa (cada uno tiene la partida entera). Para jugar
  entre amigos es aceptable.
- Las partidas en red no se guardan solas ni se pueden continuar después.

---

# Informe de viabilidad

Informe de la rama `feat/multijugador-viabilidad` (20 de octubre de 2026). La pregunta era si se
podía añadir un modo multijugador en red al juego tal como estaba, cómo hacerlo y cuánto costaba.

## Resumen

**Es viable, y el camino es el de los pasos sincronizados deterministas (lockstep), como en los Age
of Empires originales.** Cada cliente ejecuta la simulación completa y solo se envían las órdenes de los
jugadores. La simulación ya estaba casi preparada: el paso es fijo (20 ticks/s), el generador
aleatorio es determinista y guardable, todas las órdenes pasan por `Commands` y el guardado
reproduce la partida exactamente.

Lo que se ha medido en esta rama:

- **Entre motores de JavaScript la simulación no era determinista.** V8 (Chrome, Android, Node) y
  JavaScriptCore (Safari y todos los navegadores de iOS) dan resultados distintos en `Math.hypot`,
  `Math.sin` y `Math.cos`. La misma partida divergía entre los dos motores enseguida: en 4 de 5
  mapas, entre el primer y el tercer segundo de juego; en el otro, a los 2 minutos. Esto ya está
  arreglado (`src/game/fmath.ts`): en las 14 partidas probadas, de 20 minutos con 4 IA y en 7 mapas
  (entre ellos 2 reales), la huella del estado coincide en cada segundo entre los dos motores.
- **Con el mismo motor, la simulación sí es determinista**, una vez quitado `Math.random()` de
  `Entity.variant`. Dos clientes con 2 humanos que dan órdenes por una red simulada (4G con
  pérdidas y tirones) y 2 IA mantienen la misma huella en los 12.000 ticks de 10 minutos.
- **Unirse a una partida empezada funciona** con la partida guardada del anfitrión más los turnos
  pendientes: el espectador sigue igual que los demás en los 6.000 ticks comparados. Para eso hubo
  que arreglar un fallo del guardado: al cargar se recalculaba la niebla.
- **Una desincronización se detecta** en el siguiente intercambio de huellas (un segundo como
  mucho). Una prueba cambia 0,001 de alimento en un cliente y se detecta en el tick siguiente.
- **Con un retardo de entrada de 200 ms (4 ticks), la partida casi no se para** en redes
  domésticas, a través de un relé o en 4G (entre el 98 y el 100 % de la velocidad). Con 100 ms, las
  redes de más de 40 ms de latencia se paran a menudo. En una 4G mala o en 3G el lockstep sufre: ni
  con 500 ms va fluida (91 % de la velocidad, parones de casi 1 s). Ver la tabla de redes.
- **Tráfico mínimo:** unos 0,7 KB/s por jugador. Un TURN o un relé cuesta prácticamente cero.

**Recomendación:** lockstep determinista, con un retardo de entrada adaptable (200 ms por defecto,
de 100 a 500 ms según la red) y un transporte intercambiable. Primero dos pestañas del mismo
navegador (sin red), luego WebRTC entre pares con señalización gratuita (Trystero sobre Nostr o
MQTT, sin servidor propio), y más adelante, si hace falta, un relé en Cloudflare Workers. El
servidor con autoridad no compensa: exige un servidor de verdad, que hoy no existe, y para una
partida entre amigos no aporta lo bastante. Esfuerzo estimado: unos 10 a 14 días de trabajo hasta
jugar con un amigo por internet, y de 15 a 20 con la robustez que necesita el móvil (ver las fases).

## 1. Determinismo de la simulación

Para el lockstep, todos los clientes deben llegar al mismo estado, bit a bit, con las mismas
órdenes. Esto es lo que se revisó en `src/game/` y en los mods.

### Lo que ya estaba bien

- **Paso fijo:** `Game.update(TICK_DT)` siempre con 1/20 s. El acumulador de `App` solo decide
  cuántos ticks se ejecutan en cada fotograma.
- **Aleatoriedad:** `game.rng()` (mulberry32 con `rngState` guardable). Las operaciones con enteros
  de 32 bits (`Math.imul`, `>>>`) son exactas en todas partes.
- **Orden de iteración:** `game.list`, `Map` y `Set` recorren en orden de inserción, y
  `Object.keys` sigue el orden que fija el estándar. Todo es igual en todos los motores.
- **Ordenaciones:** `Array.prototype.sort` es estable por estándar desde ES2019, así que con un
  comparador coherente el resultado es único. Las ordenaciones de la simulación tienen
  comparadores coherentes: distancias, edades y déficits, sin aleatoriedad.
- **Reloj:** nada de la simulación usa `Date.now` ni `performance.now`. La única excepción es
  `savedAt`, un dato para el menú.
- **Coma flotante básica:** `+ − × ÷` y `Math.sqrt` están obligadas por IEEE 754 a redondear
  igual. JavaScript no fusiona multiplicaciones y sumas (FMA) por su cuenta. `Math.round`,
  `Math.floor`, `Math.fround` y `Float32Array` también son exactas.
- **La IA** usa solo `game.rng()` y el estado de la partida, así que en red no necesita nada: se
  ejecuta dentro de la simulación en todos los clientes y da lo mismo en todos.

### Lo que lo rompía (arreglado en esta rama)

| Problema | Efecto | Arreglo |
| --- | --- | --- |
| `Entity.variant = Math.random()` | Dos copias de la misma partida tienen estados distintos desde el primer tick. Solo afecta al dibujo de árboles y rocas, pero viaja en la partida guardada y estropea cualquier comparación de huellas. | Sale del id de la entidad (`idNoise`). |
| `Math.hypot` (109 usos), `Math.sin`, `Math.cos` en la simulación | Cada motor usa su propia aproximación (medido abajo). Entre Chrome y Safari, la partida diverge en segundos. | `src/game/fmath.ts`: `hypot` con `Math.sqrt` (exacta y, de paso, más rápida que `Math.hypot`) y `sin`/`cos` de fdlibm hechos solo con sumas y productos. Un test impide volver a usar en `src/game` funciones de `Math` que cambian entre motores, `Math.random` o el reloj. |
| Al cargar una partida, `VisionSystem` recalculaba la niebla con las posiciones de ese instante | Cambiaba `visible`, `visionVersion` y a veces `explored`, que decide dónde puede construir un humano. La partida cargada no era exactamente la original: el test de guardado no lo veía porque no compara la niebla. | Se guarda la niebla visible de los humanos y solo se calcula al empezar. El test de guardado compara ahora la huella completa. |
| `VictorySystem` acababa la partida cuando caía `game.human` | En red cada cliente tiene su `humanId`: uno acabaría la partida y otro no. | Termina cuando caen todos los humanos o solo queda un jugador. Contra la IA, el resultado es el mismo que antes. |

### Mediciones entre motores (`npm run engines`)

Resultados de las funciones de `Math` con 20.000 entradas fijas, en V8 (Node 24) y en JavaScriptCore
(el `jsc` de macOS, el motor de Safari):

| Función | Resultados distintos entre V8 y JavaScriptCore |
| --- | --- |
| `Math.hypot` | 7.388 (36,9 %) |
| `Math.atan2` | 3.620 (18,1 %) |
| `Math.exp` | 1.958 (9,8 %) |
| `Math.atan` | 1.150 (5,8 %) |
| `Math.cos` | 929 (4,6 %) |
| `Math.sin` | 819 (4,1 %) |
| `Math.log10` | 354 (1,8 %) |
| `Math.pow` | 0 |
| `Math.sqrt` | 0 (exacta por IEEE) |

Partidas de 4 IA difíciles, con la huella completa del estado cada segundo:

| Mapa (semilla) | Antes (con `Math` del motor) | Después (`fmath`), 20 min |
| --- | --- | --- |
| arabia (7) | difieren a los 3 s | iguales, desde semilla y desde partida guardada |
| arabia (3) | difieren al 1 s | iguales, desde semilla y desde partida guardada |
| pyrenees (5) | difieren a los 117 s | iguales, desde semilla y desde partida guardada |
| lakes (5) | difieren a los 3 s | iguales, desde semilla y desde partida guardada |
| oasis (5) | difieren al 1 s | iguales, desde semilla y desde partida guardada |
| val-daran (5, mapa real) | — | iguales, desde semilla y desde partida guardada |
| termopilas (5, mapa real) | — | iguales, desde semilla y desde partida guardada |

"Antes" se midió con la variación visual ya arreglada y `fmath` llamando a `Math`. Al acabar, las
partidas de "antes" tenían hasta 14 entidades de diferencia: el resultado de la partida cambia.

La generación del mapa usa todavía `Math.atan2`, `Math.exp`, `Math.atan` y `Math.log10`. En los 7
mapas salió igual en los dos motores, porque los resultados pasan por `Math.round` o `Math.floor`,
pero no está garantizado. Por eso **una partida en red debe empezar con la partida guardada del
anfitrión**, no con la semilla. Eso además asegura que todos tienen el mismo mapa real y los
mismos mods, y cuesta poco: entre 30 y 95 KB con gzip.

**Sin medir:** SpiderMonkey (Firefox), que no está en este equipo. Usa las mismas reglas IEEE para
las operaciones básicas y `sqrt`, que es lo único que queda en cada tick, así que el riesgo es
bajo. Conviene comprobarlo con una página de prueba en el navegador (fase 1).

### Lo que queda por vigilar

- **Código nuevo:** cualquier `Math.random`, `Math.sin` o `Date.now` en la simulación vuelve a
  romperlo. El test `tests/lockstep.test.ts` lo vigila en `src/game`. Los mods mezclan simulación y
  dibujo en los mismos archivos, así que en ellos hay que vigilarlo a mano (la regla está en las
  convenciones de CLAUDE.md). Conviene ejecutar `npm run engines` en un runner de macOS en CI.
- **Estado fuera de la simulación que influye en ella:** no hay, salvo `humanId` (arreglado en
  `VictorySystem`). `p.isHuman` sí decide cosas (niebla, exploración, dónde se puede construir),
  pero es igual en todos los clientes.
- **Mods con órdenes propias:** el panel de Guerra declarada llama directamente a `declareWar` y a
  `moveInFormation`, sin pasar por `Commands`. En red, esas órdenes tienen que ir por la cola de
  turnos (ver el apartado 2).

## 2. Entrada de órdenes

`Commands` ya es el único punto de entrada de las acciones, pero recibe objetos `Entity` y se
ejecuta en el momento del clic, entre dos ticks. Para la red hacen falta tres cosas, y las dos
primeras ya están en el prototipo:

1. **Órdenes en datos simples** (`src/game/net/netCommands.ts`): un `NetCommand` por cada función
   de `Commands`, con las entidades por id. `applyNetCommand(game, pid, cmd)` comprueba quién
   manda la orden: solo usa unidades y edificios vivos de ese jugador, cosa que `Commands.move` o
   `Commands.attack` no comprobaban. Si el objetivo muere mientras la orden viaja, la orden se
   descarta o, en el clic derecho, se convierte en mover. Las coordenadas viajan en JSON sin
   perder nada: los números de 64 bits se escriben y se leen exactos.
2. **Ejecución en un tick acordado** (`src/game/net/lockstep.ts`, `LockstepPeer`): una orden dada
   en el tick t se ejecuta en todos los clientes en el tick t + retardo. Cada cliente manda un
   turno por tick, aunque esté vacío, y nadie avanza sin los turnos de todos. Las órdenes de un
   mismo tick se ejecutan por orden de jugador.
3. **Que la interfaz no llame a `Commands` directamente:** hay unas 20 llamadas repartidas entre
   `Input` (6), `commandModel` (5), `StrategyScreen` (5), `HUD`, `MobileHUD` y el panel de Guerra
   declarada. Hay que cambiarlas por un "destino de órdenes": contra la IA ejecuta al momento y en
   red crea un `NetCommand`. Las órdenes de los mods (`declareWar`) necesitan un punto de
   extensión nuevo, `reg.addNetCommand(id, handler)`.

**Detección de desincronización:** `stateHash(game)` (`src/game/net/hash.ts`) es un hash de 32 bits
de todo lo que guarda `save.ts` más la niebla, con los decimales a 64 bits exactos. Cada segundo,
los turnos llevan la huella del cliente, y si no coincide con la propia se anota la
desincronización. Cuesta unos 2 ms con unas 1.000 entidades en un ordenador, unas 50 veces lo que
un tick. Una vez por segundo es asumible, pero en un móvil de gama media habría que repartirlo o
usar una huella más ligera en los ticks intermedios. Cuando ocurra, lo útil es guardar la partida
de los dos clientes para compararlas campo a campo.

**Unirse a una partida empezada, reconectar y resincronizar** con `save.ts`: la partida guardada
del anfitrión (280 a 710 KB en JSON, 30 a 95 KB con gzip) más los turnos que se enviaron desde
entonces. Medido en el prototipo: el espectador sigue igual que los demás. Es el mismo mecanismo
para empezar la partida (todos cargan la del anfitrión), para reconectar y para recuperarse de una
desincronización (todos cargan la de un cliente). El cliente que se une pone su `humanId` después
de cargar, porque la partida guardada trae el del anfitrión.

## 3. Arquitecturas

### Medición del prototipo (`npm run lockstep`)

Dos clientes, cada uno con un "humano" que da órdenes como lo haría la interfaz (aldeanos,
edificios, tropas, ataques, posturas y formaciones), y dos IA difíciles, en arabia. Los turnos
viajan como JSON por un canal fiable y ordenado, como un canal de datos de WebRTC o un WebSocket,
con latencia, variación y pérdidas que se reenvían. En 4G, además, hay tirones del dispositivo.
Cuando le falta un turno, un cliente se para ("Esperando a…") y sigue desde ahí.

Resultados de `npm run lockstep -- 10`: 10 minutos por fila, 2 humanos con guion y 2 IA. En todas
las filas, las huellas de los dos clientes coinciden de principio a fin.

| Red | Latencia de ida (+ variación), pérdidas | Retardo de entrada | Orden → efecto | Velocidad del juego | Tiempo parado | Parón más largo |
| --- | --- | --- | --- | --- | --- | --- |
| Red local (misma wifi) | 3 ms (+0 a 4), 0 % | 100 ms | 100 ms | 100 % | 0 % | — |
| Fibra, misma ciudad | 15 ms (+0 a 10), 0,2 % | 100 ms | 100 ms | 100 % | 0 % | — |
| Wifi doméstica, otro país | 45 ms (+0 a 30), 1 % | 100 ms | 102 ms | 97,7 % | 4,5 % | 215 ms |
| | | **200 ms** | 200 ms | 100 % | 0,1 % | 105 ms |
| | | 300 ms | 300 ms | 100 % | 0 % | — |
| Por un relé TURN | 80 ms (+0 a 30), 1 % | 100 ms | 107 ms | 90,1 % | 16,9 % | 360 ms |
| | | **200 ms** | 203 ms | 98,4 % | 3,1 % | 265 ms |
| | | 300 ms | 300 ms | 99,9 % | 0,1 % | 175 ms |
| 4G, con tirones de 300 ms (2 % de los segundos) | 60 ms (+0 a 60), 1 % | 100 ms | 113 ms | 88 % | 21,3 % | 420 ms |
| | | **200 ms** | 207 ms | 98 % | 2,7 % | 390 ms |
| | | 300 ms | 304 ms | 98,7 % | 1,1 % | 295 ms |
| 4G mala o 3G, con tirones de 600 ms (5 %) | 150 ms (+0 a 150), 3 % | 200 ms | 322 ms | 61,8 % | 61,2 % | 1.040 ms |
| | | 300 ms | 381 ms | 78,1 % | 35,9 % | 1.145 ms |
| | | 500 ms | 549 ms | 91,3 % | 11,6 % | 890 ms |
| | | 700 ms | 728 ms | 94,1 % | 5,5 % | 585 ms |

"Orden → efecto" es lo que tarda una orden en ejecutarse, en tiempo real. "Velocidad del juego" es
el tiempo de juego entre el tiempo real: menos del 100 % quiere decir que la partida se ha parado a
esperar. En todos los casos hay unos 0,7 KB/s por jugador y destinatario: un turno JSON por tick,
casi siempre vacío. Agrupando 2 o 3 ticks por mensaje bajaría a la mitad o a un tercio. Con 4
jugadores en malla, cada uno envía a 3.

Lo que dice la tabla:

- El **retardo de entrada** tiene que cubrir la latencia de ida más su variación. Si no, la partida
  se para a menudo. Con 200 ms basta para casi todo. En móvil, lo que más se nota son los tirones
  del dispositivo (recolector de basura, cambio de app), porque paran a todos.
- 200 ms entre la orden y la respuesta son jugables en un juego de estrategia: el Age of Empires
  original se diseñó para que de 250 a 500 ms siguieran siendo jugables. Para que no se note, la interfaz responde en el acto, con el sonido y
  la marca del destino, aunque la unidad empiece a moverse 200 ms después.
- El retardo debe **adaptarse** a la latencia medida (ping) y subir si hay paradas. El prototipo
  lo usa fijo.
- En una red muy mala, el lockstep entre pares llega a su límite: o mucho retardo, o parones para
  todos. Ahí ayuda el relé con turnos con plazo (fase 5): el turno se cierra a su hora y las órdenes
  del que llega tarde pasan al siguiente, así que solo las suyas se retrasan.
- La red simulada es algo pesimista: cada pérdida bloquea el canal hasta el reenvío. WebRTC permite
  un canal sin orden, con el que solo se retrasaría el turno perdido.

### Comparación

| | Lockstep entre pares (WebRTC) | Lockstep con relé (WebSocket) | Servidor con autoridad | Mismo dispositivo o red local |
| --- | --- | --- | --- | --- |
| Qué viaja | Órdenes (≈0,7 KB/s) | Órdenes (≈0,7 KB/s) | Estado de las unidades (≈10 a 50 KB/s por cliente) | Órdenes |
| Retardo de las órdenes | Retardo de entrada: 100 a 500 ms (200 en casi todas las redes) | Igual, más ~10 a 40 ms del salto por el relé | Ida y vuelta al servidor (con predicción en el cliente, casi nada) | 100 ms |
| Móvil con mala red | El más lento para a todos. El retardo adaptable y expulsar tras un tiempo lo mitigan | El relé puede cerrar cada turno a su hora y dar un turno vacío al que no llega: el lento no frena a los demás | Bien: el lento solo se ve peor él | — |
| NAT y conexión | STUN, y TURN en aproximadamente un 10 a 20 % de los casos (más en datos móviles) | Siempre conecta (WebSocket) | Siempre conecta | Misma wifi, sin TURN. Puede hacerse sin servidor, con un código QR |
| La IA | Va dentro de la simulación, gratis | Igual | En el servidor | Igual |
| Pausa | Una orden más: se pausa en el tick acordado (con límite por jugador) | Igual | La decide el servidor | Igual |
| Trampas | Ve todo el mapa: se puede quitar la niebla. No se pueden falsear órdenes | Igual | El servidor solo manda lo visible | Da igual |
| Alojamiento | GitHub Pages + señalización gratuita + TURN | Cloudflare Workers + Durable Objects | Un servidor con CPU siempre encendido | Nada |
| Coste | 0 € (Trystero sobre Nostr o MQTT; TURN de Cloudflare: 1.000 GB/mes gratis) | 0 € en el plan gratuito con pocas partidas; 5 $/mes en el de pago | VPS u hosting de juegos: desde 5 a 20 €/mes, y crece con las partidas | 0 € |
| Esfuerzo | Medio | Medio (más un Worker pequeño) | Alto: estado por diferencias, predicción, interpolación, servidor | Bajo, si ya existe el lockstep |

Notas sobre el coste:

- **Señalización sin servidor propio:** [Trystero](https://github.com/dmotz/trystero) conecta pares
  WebRTC usando redes públicas (Nostr por defecto, o MQTT, BitTorrent, Firebase o Supabase) como
  punto de encuentro. Después, los datos van directos y cifrados entre los pares. Encaja con una
  PWA estática en GitHub Pages. Riesgo: depende de relés públicos que no garantizan nada.
- **TURN:** el de [Cloudflare Realtime](https://developers.cloudflare.com/realtime/pricing/) cuesta
  0,05 $/GB, con 1.000 GB al mes gratis. A 0,7 KB/s por jugador, una partida de una hora gasta unos
  2,5 MB por jugador: son cientos de miles de horas de juego gratis. Pero sus credenciales se piden
  con una clave secreta, así que hace falta un Worker pequeño que las reparta.
- **Relé en [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/):**
  ya están en el plan gratuito de Workers, con 100.000 peticiones al día, y los mensajes de
  WebSocket entrantes cuentan 20 a 1. A 20 turnos por segundo y jugador, una partida de 4
  jugadores y una hora son unos 290.000 mensajes, que cuentan como ≈14.400 peticiones: caben unas 7
  partidas al día. Con turnos cada 2 ticks, el doble. Si se juega más, el plan de pago (5 $/mes)
  da de sobra.
- **Mismo dispositivo:** jugar dos en una misma pantalla no tiene sentido en un juego de
  estrategia con niebla de guerra. Lo útil de "local" es **la misma wifi**: el mismo lockstep con
  WebRTC, que se conecta directo entre los dos aparatos. La señalización puede hacerse sin
  internet, enseñando un código QR con la oferta de conexión. Lo más barato de todo es **dos
  pestañas del mismo navegador** (`BroadcastChannel`): no sirve para jugar con nadie, pero sí para
  desarrollar y probar todo el multijugador sin red.

### La IA y la pausa en red

- **IA:** igual que contra la máquina. Va dentro de la simulación y cada cliente la ejecuta igual.
  Si un jugador se desconecta, una orden "lo lleva la IA" en un tick acordado puede pasarle el
  control. Para eso `AISystem` necesita poder añadir un controlador a mitad de partida (ahora los
  crea al empezar) y guardarlo.
- **Pausa:** ya existe `opts.online`, que hace que la pantalla de estrategia no pare el tiempo. En
  red, además: el menú de pausa no puede parar la simulación (`App` la para al abrir el menú), la
  pausa de verdad es una orden con tick acordado y con límite de usos o de tiempo, la velocidad se
  fija al crear la partida, y la cámara lenta de la pantalla de estrategia queda desactivada. Si
  el navegador pasa la pestaña a segundo plano (el móvil cambia de app), el cliente deja de
  avanzar y los demás esperan: hace falta un plazo, y después dar ese jugador por desconectado.
- **`App` en red:** ahora, si se acumulan más de 10 ticks, los descarta (`acc = 0`). En red no se
  puede descartar ninguno: el cliente que se retrasa tiene que ponerse al día ejecutando más ticks
  por fotograma, y si no tiene turnos, esperar.

## 4. Riesgos y esfuerzo

### Riesgos

| Riesgo | Cuánto | Qué hacer |
| --- | --- | --- |
| Alguien vuelve a meter algo no determinista en la simulación | Alto: es fácil y no se nota contra la IA | El test de `src/game` que ya existe; `npm run engines` en CI (runner de macOS); detección en partida con informe |
| Firefox (SpiderMonkey) no se ha medido | Bajo | Página de prueba en el navegador con la misma partida (fase 1) |
| Un móvil lento o con mala red frena a todos | Medio | Retardo adaptable, plazo y expulsión (luego, IA), relé con turnos con plazo (fase 5) |
| Pestaña en segundo plano (cambiar de app) | Alto en móvil | Plazo; reconexión con la partida guardada |
| Rendimiento: cada cliente simula todo, y la huella cuesta 2 ms | Bajo: un tick cuesta ~0,05 ms en un ordenador; en un móvil, unas 10 veces más | Huella repartida o más ligera; medir en un móvil real |
| Versiones o mods distintos entre clientes | Medio | La sala compara la versión del juego y una huella del registro de contenido; se empieza siempre con la partida guardada del anfitrión |
| Trampas (quitar la niebla) | Bajo entre amigos | Aceptarlo. Solo un servidor con autoridad lo evita |
| Señalización pública que deja de funcionar | Medio | El transporte es intercambiable: Trystero tiene varias estrategias, y si no, un Worker propio |

### Esfuerzo por fases

| Fase | Qué | Días |
| --- | --- | --- |
| 0 | Este análisis, el prototipo y los arreglos de determinismo | hecha |
| 1 | Motor preparado para la red: un "destino de órdenes" en la interfaz (≈20 llamadas), `reg.addNetCommand` para los mods, bucle de `App` sin descartar ticks y con "Esperando a…", pausa y velocidad como órdenes, `humanId` local y pantalla de derrota para quien cae mientras los demás siguen. Página de prueba de determinismo en el navegador (Firefox, Safari en iOS) | 4 a 5 |
| 2 | Transporte local entre dos pestañas (`BroadcastChannel`) y una sala sencilla: el anfitrión elige mapa y opciones, cada uno su civilización y color, y todos empiezan con la partida guardada del anfitrión | 2 a 3 |
| 3 | WebRTC entre pares con Trystero: sala por código o enlace, ping, retardo adaptable, detección de desincronización con informe | 4 a 6 |
| 4 | Robustez: desconexión, plazo, IA que toma el control y reconexión con la partida guardada; segundo plano en móvil; pruebas en Android e iOS reales | 5 a 8 |
| 5 (opcional) | Worker en Cloudflare: relé de turnos con plazo (el lento no frena), credenciales de TURN, de 3 a 8 jugadores, partidas públicas | 5 a 10 |
| — | En vez de lo anterior, servidor con autoridad | 20 a 40, y coste fijo de servidor |

**Hasta jugar con un amigo por internet (fases 1 a 3): unos 10 a 14 días. Con la robustez para móvil
(fase 4): 15 a 20.**

## 5. Recomendación

1. **Camino:** lockstep determinista. La simulación ya da lo mismo en V8 y en JavaScriptCore, y el
   coste de alojamiento es cero con la PWA estática que hay. El servidor con autoridad necesitaría
   un servidor de pago y reescribir media interfaz, y solo aporta frente a las trampas.
2. **Por dónde empezar:** la fase 1, que no necesita red y deja el motor listo, y enseguida las dos
   pestañas de la fase 2. Así se prueba la integración completa (interfaz, pausa, final de
   partida, desincronizaciones) sin pelearse con WebRTC. Después, WebRTC con Trystero para 2
   jugadores, que es el caso más común.
3. **Qué cambiar en el motor** (además de lo ya hecho en esta rama):
   - La interfaz manda órdenes a un "destino" en vez de llamar a `Commands`. Sale de `ui/` y del
     panel de Guerra declarada.
   - Punto de extensión `reg.addNetCommand` para las órdenes de los mods.
   - `App`: modo de red sin descartar ticks, sin pausa local y con espera de turnos.
   - `AISystem`: añadir un controlador a mitad de partida (jugador desconectado).
   - Seguir la regla: en el código que corre cada tick, `hypot`, `sin` y `cos` de `fmath`, nunca
     `Math.random` ni el reloj.

## Cómo probar el prototipo

| Comando | Qué hace |
| --- | --- |
| `npm test` | Incluye `tests/lockstep.test.ts`: `fmath` frente a `Math`, el test que impide código no determinista, dos partidas iguales tick a tick, el final de la partida con `humanId` distintos, dos clientes por red simulada, la detección de una desincronización provocada y un espectador que se une a mitad de partida |
| `npm run engines -- [minutos]` | Compara `Math` y 7 partidas de 4 IA entre Node y el `jsc` de macOS, desde semilla y desde partida guardada (sin `jsc`, compara V8 consigo mismo). Unos 3 minutos con 20 |
| `npm run lockstep -- [minutos] [semilla]` | Las mediciones del apartado 3: determinismo, espectador, desincronización y la tabla de redes. Unos 3 minutos con 10 |

Archivos: `src/game/net/hash.ts` (huella), `src/game/net/netCommands.ts` (órdenes serializables),
`src/game/net/lockstep.ts` (pasos sincronizados, sin transporte), `src/game/fmath.ts`
(matemáticas deterministas), `tests/net/simnet.ts` (jugador con guion y red simulada),
`scripts/engines.ts` y `scripts/engines-compare.mjs` (motores), `scripts/lockstep.ts` (redes).
