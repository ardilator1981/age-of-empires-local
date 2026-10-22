/**
 * Servidores para atravesar NAT (ICE) y explicación de los fallos de conexión.
 *
 * - **STUN** (públicos y gratuitos, Google y Cloudflare): cada dispositivo averigua su dirección
 *   pública. Con eso conecta la mayoría de redes.
 * - **TURN** (opcional, del usuario): un relé por el que pasan los datos (cifrados) cuando las dos
 *   redes no dejan conectar directamente: datos móviles con CGNAT estricto, redes de empresa o
 *   algunos routers. No hay ninguno público y fiable sin cuenta (el Open Relay de Metered ya no
 *   acepta sus credenciales públicas: comprobado), así que se configura en "Opciones de conexión"
 *   y se guarda solo en este navegador. Cómo montar uno barato: docs/multijugador.md.
 */

export const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/** TURN propio, tal como lo escribe el usuario. */
export interface TurnPrefs { turnUrl: string; turnUser: string; turnPass: string }

/**
 * Lee el TURN: una o varias URL (`turn:` o `turns:`, separadas por comas, espacios o líneas) con
 * su usuario y contraseña, o una lista JSON de iceServers como la que dan Cloudflare o Metered
 * (entonces usuario y contraseña van dentro).
 */
export function parseTurn(p: TurnPrefs): { servers: RTCIceServer[]; error?: string } {
  const raw = p.turnUrl.trim();
  if (!raw) return { servers: [] };
  if (raw.startsWith('[') || raw.startsWith('{')) {
    let v: unknown;
    try { v = JSON.parse(raw); } catch { return { servers: [], error: 'La lista JSON no se puede leer' }; }
    const list = (Array.isArray(v) ? v : (v as { iceServers?: unknown }).iceServers ?? [v]) as RTCIceServer[];
    const ok = list.filter(s => s && (typeof s.urls === 'string' || Array.isArray(s.urls)));
    if (!ok.length) return { servers: [], error: 'La lista JSON no tiene servidores (falta "urls")' };
    return { servers: ok };
  }
  const urls = raw.split(/[\s,]+/).filter(Boolean);
  const bad = urls.find(u => !/^turns?:[^\s]+$/i.test(u));
  if (bad) return { servers: [], error: `"${bad}" no es una dirección TURN (empieza por turn: o turns:)` };
  return { servers: [{ urls, username: p.turnUser || undefined, credential: p.turnPass || undefined }] };
}

/** Todos los servidores ICE: los STUN públicos y el TURN del usuario, si lo hay y está bien escrito. */
export function iceServers(p: TurnPrefs): RTCIceServer[] {
  return [...STUN, ...parseTurn(p).servers];
}

/**
 * ¿Responde el TURN? Pide una dirección de relé (solo relé) y espera a que llegue. Si llega, el
 * servidor y las credenciales funcionan desde esta red.
 */
export async function testTurn(servers: RTCIceServer[], ms = 8000): Promise<{ ok: boolean; detail: string }> {
  if (!servers.length) return { ok: false, detail: 'No hay ningún TURN configurado' };
  const pc = new RTCPeerConnection({ iceServers: servers, iceTransportPolicy: 'relay' });
  const errors: string[] = [];
  try {
    const found = new Promise<boolean>(res => {
      const t = setTimeout(() => res(false), ms);
      pc.onicecandidate = e => {
        if (e.candidate?.candidate.includes(' typ relay')) { clearTimeout(t); res(true); }
        if (!e.candidate) { clearTimeout(t); res(false); }
      };
      pc.addEventListener('icecandidateerror', ev => {
        const e = ev as RTCPeerConnectionIceErrorEvent;
        errors.push(`${e.errorCode}${e.errorText ? ` ${e.errorText}` : ''}`);
      });
    });
    pc.createDataChannel('prueba');
    await pc.setLocalDescription(await pc.createOffer());
    if (await found) return { ok: true, detail: 'El TURN responde: si no conectáis directamente, iréis por él' };
    const auth = errors.some(e => e.startsWith('401') || /unauthor/i.test(e));
    return { ok: false, detail: auth ? 'El TURN rechaza el usuario o la contraseña' : `El TURN no responde desde esta red${errors.length ? ` (${errors[0]})` : ''}` };
  } finally { pc.close(); }
}

/** Cómo va una conexión ya establecida: directa (misma red o a través del router) o por el TURN. */
export async function connectionKind(pc: RTCPeerConnection): Promise<'directa' | 'turn' | null> {
  try {
    const stats = await pc.getStats();
    let pair: any = null;
    stats.forEach((s: any) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId);
    });
    if (!pair) stats.forEach((s: any) => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pair = s; });
    if (!pair) return null;
    const local = stats.get(pair.localCandidateId), remote = stats.get(pair.remoteCandidateId);
    return local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'turn' : 'directa';
  } catch { return null; }
}

/**
 * Explica en español un fallo de conexión de WebRTC o de la señalización (los mensajes de Trystero
 * vienen en inglés) y qué probar.
 */
export function explainConnectError(raw: string, hasTurn: boolean): string {
  if (/after exchanging SDP|ICE|connection failed|could not connect/i.test(raw)) {
    return hasTurn
      ? 'Os habéis encontrado, pero no se ha podido abrir la conexión ni a través de tu TURN. Prueba «Probar TURN» en Opciones de conexión, o conectad los dos a la misma wifi.'
      : 'Os habéis encontrado, pero vuestras redes no dejan conectar directamente (pasa con algunos datos móviles y redes de empresa o de hotel). Probad: los dos en la misma wifi, o el que tenga datos móviles con wifi, o configurad un servidor TURN en Opciones de conexión.';
  }
  if (/relay|websocket|socket/i.test(raw)) return 'No se llega a los servidores públicos de encuentro. Comprueba la conexión a internet o prueba otra señalización en Opciones de conexión.';
  return `No se pudo conectar (${raw})`;
}
