import { describe, expect, it } from 'vitest';
import { contentHash, pack, unpack } from '../src/net/codec';
import { Deframer, Framer } from '../src/net/framing';
import type { NetMessage } from '../src/net/protocol';
import { decodeSignal, encodeSignal } from '../src/net/transports/manual';
import { reg, warReg } from './helpers';

describe('transporte: trozos numerados y códigos', () => {
  it('los mensajes llegan enteros y en orden aunque los trozos se desordenen', () => {
    const f = new Framer(), d = new Deframer();
    const big: NetMessage = { k: 'resync', reason: 'x'.repeat(50_000) };
    const msgs: NetMessage[] = [{ k: 'ping', t: 1 }, big, { k: 'pong', t: 2 }, { k: 'away', on: true }];
    const frames = msgs.flatMap(m => f.encode(m));
    expect(frames.length).toBeGreaterThan(6);
    // Llegan desordenados (como cuando los grandes van por otro camino)
    const shuffled = [...frames].reverse();
    const got = shuffled.flatMap(fr => d.push(JSON.parse(JSON.stringify(fr))));
    expect(got).toEqual(msgs);
  });

  it('la partida guardada se comprime y se recupera igual', async () => {
    const text = JSON.stringify({ a: 'b'.repeat(10_000), n: [1, 2, 3] });
    const p = await pack(text);
    expect(p.z).toBe(true);
    expect(p.d.length).toBeLessThan(text.length / 10);
    expect(await unpack(p)).toBe(text);
  });

  it('códigos de conexión (sin intermediarios): ida y vuelta, también dentro de un enlace', async () => {
    const sdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n' + 'a=candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host\r\n'.repeat(4);
    const code = await encodeSignal('o', sdp);
    expect(code.length).toBeLessThan(sdp.length);
    expect(await decodeSignal(code)).toEqual({ k: 'o', s: sdp });
    expect(await decodeSignal(`https://ejemplo.github.io/juego/#unirse=${code}`)).toEqual({ k: 'o', s: sdp });
    await expect(decodeSignal('hola')).rejects.toThrow();
  });

  it('la huella del contenido distingue mods distintos', () => {
    expect(contentHash(reg)).toBe(contentHash(reg));
    expect(contentHash(reg)).not.toBe(contentHash(warReg));
  });
});
