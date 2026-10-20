#!/usr/bin/env node
/**
 * Capturas de la interfaz en móvil y tableta, con el porcentaje de pantalla en el que se ve el mapa.
 * Usa Chrome sin ventana por el protocolo de DevTools (sin dependencias: WebSocket nativo de Node).
 *
 *   npm run dev                      (en otra terminal)
 *   node scripts/mobile-shots.mjs --url http://localhost:5173/ --prefix despues
 *
 * Genera docs/movil/<prefijo>-<dispositivo>-<escena>.png e imprime una tabla con el % de mapa visible
 * (puntos de la pantalla donde lo de encima es el lienzo del juego; la interfaz semitransparente cuenta como tapado).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => {
  const [k, ...v] = s.trim().split(/\s+/);
  return [k, v.join(' ') || true];
}));
const URL = args.url ?? 'http://localhost:5173/';
const PREFIX = args.prefix ?? 'captura';
const OUT = args.out ?? 'docs/movil';
const CHROME = args.chrome ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DPR = Number(args.dpr ?? 1);
const PORT = 9300 + Math.floor(Math.random() * 500);

const DEVICES = [
  { id: 'movil-horizontal', width: 844, height: 390, dpr: 2, mobile: true, touch: true },
  { id: 'movil-vertical', width: 390, height: 844, dpr: 2, mobile: true, touch: true },
  { id: 'tableta', width: 1024, height: 768, dpr: 2, mobile: true, touch: true },
];
if (args.desktop) DEVICES.push({ id: 'escritorio', width: 1440, height: 900, dpr: 1, mobile: false, touch: false });

/**
 * Escenas: código que se ejecuta en la página antes de la captura.
 * only: dispositivos en los que se captura · mobileOnly: solo si la interfaz móvil está activa.
 */
const pickVillager = `const g = game, v = g.units.find(u => u.owner === g.humanId && g.unitDef(u).builder); app.session.ui.setSelection([v.id]); app.session.renderer.cam.centerOn(v.x, v.y);`;
const SCENES = [
  // En vertical, primero el aviso de girar; las demás escenas, tras pulsar «Seguir en vertical»
  { id: 'aviso', only: ['movil-vertical'], js: `app.session.ui.setSelection([])` },
  { id: 'nada', js: `(document.getElementById('btn-rotate-ok')?.click(), app.session.ui.setSelection([]))` },
  { id: 'aldeano', js: `(() => { ${pickVillager} })()` },
  { id: 'construir', mobileOnly: true, js: `(() => { ${pickVillager} setTimeout(() => document.querySelector('[data-b="t0"]')?.click(), 400); })()`, wait: 1300 },
  { id: 'colocar', mobileOnly: true, only: ['movil-horizontal', 'movil-vertical'], js: `document.querySelector('#m-sheet [data-b="s1"]')?.click()` },
  { id: 'centro', only: ['movil-horizontal', 'tableta', 'escritorio'], js: `(() => { const g = game, b = g.buildings.find(x => x.owner === g.humanId); app.session.ui.setSelection([b.id]); })()` },
  { id: 'menu', mobileOnly: true, only: ['movil-horizontal'], js: `(app.session.ui.setSelection([]), document.querySelector('[data-a="menu"]').click())` },
  { id: 'ajustes', mobileOnly: true, only: ['movil-horizontal'], js: `document.querySelector('[data-screen="settings"]').click()` },
  { id: 'ayuda', mobileOnly: true, only: ['movil-horizontal'], js: `(document.querySelector('[data-a="screen-close"]').click(), app.session.mobile.showHint())` },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'aoe-shots-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank',
], { stdio: 'ignore' });

let ws, nextId = 1;
const pending = new Map();
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params, sessionId: send.session }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

async function main() {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
  }
  if (!target) throw new Error('No se pudo arrancar Chrome');
  ws = new WebSocket(target);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    }
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  send.session = sessionId;
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const d of DEVICES) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: d.width, height: d.height, deviceScaleFactor: d.mobile ? DPR : 1, mobile: d.mobile,
      screenOrientation: d.width > d.height ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: d.touch, maxTouchPoints: d.touch ? 5 : 0 });
    await send('Emulation.setEmitTouchEventsForMouse', { enabled: d.touch, configuration: d.touch ? 'mobile' : 'desktop' });
    const load = async () => {
      await send('Page.navigate', { url: URL });
      for (let i = 0; i < 60 && !(await evaluate('!!window.app').catch(() => false)); i++) await sleep(250);
      await sleep(500);
    };
    await load();
    // Pista de gestos ya vista (que no tape las capturas) e interfaz automática
    await evaluate(`localStorage.setItem('aoe-ui-v1', JSON.stringify({ layout: 'auto', scale: 1, haptics: true, hintSeen: true })), 1`);
    await load();
    await evaluate(`(app.start(app.menu.buildOptions()), 1)`);
    await sleep(2500);
    await evaluate(`window.__measure = () => {
      const W = innerWidth, H = innerHeight; let n = 0, m = 0;
      for (let y = 2; y < H; y += 4) for (let x = 2; x < W; x += 4) {
        n++; const el = document.elementFromPoint(x, y);
        if (el && (el.id === 'game' || el.id === 'terrain')) m++;
      }
      return Math.round(m / n * 1000) / 10;
    }; 1`);
    for (const sc of SCENES) {
      if (sc.only && !sc.only.includes(d.id)) continue;
      if (sc.mobileOnly && !(await evaluate(`!!document.querySelector('.ui-movil')`))) continue;
      await evaluate(sc.js);
      await sleep(sc.wait ?? 900);
      const pct = await evaluate('__measure()');
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const file = join(OUT, `${PREFIX}-${d.id}-${sc.id}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      rows.push({ dispositivo: `${d.id} (${d.width}×${d.height})`, escena: sc.id, mapa: `${pct} %`, archivo: file });
    }
  }
  console.table(rows);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { try { ws?.close(); } catch {} chrome.kill(); });
