import { describe, expect, it } from 'vitest';
import { explainConnectError, iceServers, parseTurn, STUN } from '../src/net/ice';

const p = (turnUrl: string, turnUser = '', turnPass = '') => ({ turnUrl, turnUser, turnPass });

describe('servidores ICE (STUN públicos y TURN del usuario)', () => {
  it('sin TURN, solo los STUN públicos', () => {
    expect(iceServers(p(''))).toEqual(STUN);
    expect(STUN.every(s => String(s.urls).startsWith('stun:'))).toBe(true);
  });

  it('una o varias direcciones TURN con usuario y contraseña', () => {
    const t = parseTurn(p('turn:mi.servidor:3478, turns:mi.servidor:5349?transport=tcp', 'ana', 'secreta'));
    expect(t.error).toBeUndefined();
    expect(t.servers).toEqual([{ urls: ['turn:mi.servidor:3478', 'turns:mi.servidor:5349?transport=tcp'], username: 'ana', credential: 'secreta' }]);
    expect(iceServers(p('turn:x:3478'))).toHaveLength(STUN.length + 1);
  });

  it('la lista JSON que dan Cloudflare o Metered', () => {
    const cf = JSON.stringify({ iceServers: [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }] });
    expect(parseTurn(p(cf)).servers[0]).toMatchObject({ username: 'u', credential: 'c' });
    expect(parseTurn(p('[{"urls":"turn:a:3478","username":"x","credential":"y"}]')).servers).toHaveLength(1);
  });

  it('avisa de lo que está mal escrito (y no lo usa)', () => {
    expect(parseTurn(p('http://mi.servidor')).error).toMatch(/turn:/);
    expect(parseTurn(p('[{"x":1}]')).error).toMatch(/urls/);
    expect(parseTurn(p('{roto')).error).toMatch(/JSON/);
    expect(iceServers(p('http://mal'))).toEqual(STUN);
  });

  it('explica en español por qué no conecta y qué probar', () => {
    const raw = 'could not connect to peer abc after exchanging SDP; configure TURN servers with turnConfig or rtcConfig.iceServers';
    expect(explainConnectError(raw, false)).toMatch(/misma wifi.*TURN/s);
    expect(explainConnectError(raw, true)).toMatch(/Probar TURN/);
  });
});
