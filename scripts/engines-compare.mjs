/**
 * Compara la simulación entre motores de JavaScript (ver scripts/engines.ts).
 * Uso: npm run engines -- [minutos]
 *
 * Usa Node (V8, el de Chrome y Android) y, si está, el `jsc` de macOS (JavaScriptCore, el de
 * Safari y todos los navegadores de iOS). Sin `jsc`, ejecuta V8 dos veces (determinismo en un
 * mismo motor).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const minutes = Number(process.argv[2] ?? 10);
const JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc';
const engines = [['V8', a => ['node', ['.sim/engines.js', ...a]]]];
if (existsSync(JSC)) engines.push(['JavaScriptCore', a => [JSC, ['-m', '.sim/engines.js', '--', ...a]]]);
else {
  console.log('No hay jsc (solo en macOS): se compara V8 consigo mismo.');
  engines.push(['V8 (2.ª vez)', a => ['node', ['.sim/engines.js', ...a]]]);
}
const run = (engine, args) => {
  const [cmd, argv] = engine[1](args);
  return execFileSync(cmd, argv, { encoding: 'utf8', maxBuffer: 1 << 30 }).trim().split('\n');
};
const [A, B] = engines;
console.log(`Comparando ${A[0]} con ${B[0]}\n`);

// 1. Funciones de Math con las mismas entradas
const ma = run(A, ['math']), mb = run(B, ['math']);
const diff = {}, total = {};
ma.forEach((l, i) => {
  const [, fn] = l.split(' ');
  total[fn] = (total[fn] ?? 0) + 1;
  if (l !== mb[i]) diff[fn] = (diff[fn] ?? 0) + 1;
});
console.log('| Función | Resultados distintos |\n| --- | --- |');
for (const fn of Object.keys(total)) console.log(`| Math.${fn} | ${diff[fn] ?? 0} de ${total[fn]} (${(100 * (diff[fn] ?? 0) / total[fn]).toFixed(1)} %) |`);

// 2. Partidas de 4 IA: desde la semilla (cada motor genera el mapa) y desde una partida guardada
console.log(`\n| Mapa | Inicio | Mapa generado | Simulación (${minutes} min, huella cada segundo) |\n| --- | --- | --- | --- |`);
for (const [map, seed] of [['arabia', 7], ['arabia', 3], ['pyrenees', 5], ['lakes', 5], ['oasis', 5], ['val-daran', 5], ['termopilas', 5]]) {
  const snap = `.sim/snap-${map}-${seed}.json`;
  execFileSync('sh', ['-c', `node .sim/engines.js snap ${seed} ${map} > ${snap}`]);
  for (const [label, args] of [['semilla', ['sim', minutes, seed, map]], ['guardada', ['sim', minutes, seed, map, snap]]]) {
    const a = run(A, args.map(String)), b = run(B, args.map(String));
    const mapSame = a[0] === b[0] ? 'igual' : 'distinto';
    const i = a.findIndex((l, k) => l !== b[k]);
    const res = i < 0 ? `iguales (${a.length - 2} huellas)` : `difieren desde el tick ${a[i].split(' ')[1]} (${(Number(a[i].split(' ')[1]) / 20).toFixed(0)} s)`;
    console.log(`| ${map} (${seed}) | ${label} | ${mapSame} | ${res} |`);
  }
}

// 3. Con los poderes activos (todas las IA empiezan en la era 4 y los usan)
console.log(`\n| Mapa | Inicio | Mapa generado | Poderes activos (era 4, ${Math.min(minutes, 10)} min) |\n| --- | --- | --- | --- |`);
for (const [map, seed] of [['arabia', 7], ['arabia', 3]]) {
  const args = ['sim', Math.min(minutes, 10), seed, map, '-', 4].map(String);
  const a = run(A, args), b = run(B, args);
  const i = a.findIndex((l, k) => l !== b[k]);
  const res = i < 0 ? `iguales (${a.length - 2} huellas)` : `difieren desde el tick ${a[i].split(' ')[1]} (${(Number(a[i].split(' ')[1]) / 20).toFixed(0)} s)`;
  console.log(`| ${map} (${seed}) | era 4 | ${a[0] === b[0] ? 'igual' : 'distinto'} | ${res} |`);
}

// 4. Comercio, diplomacia y espionaje (las IA empiezan en la era 3: mercados, caravanas, tratados y espías)
const tm = Math.min(minutes, 20);
console.log(`\n| Mapa | Inicio | Mapa generado | Comercio, diplomacia y espionaje (era 3, ${tm} min) |\n| --- | --- | --- | --- |`);
for (const [map, seed] of [['arabia', 2], ['arabia', 7]]) {
  const args = ['sim', tm, seed, map, '-', 3].map(String);
  const a = run(A, args), b = run(B, args);
  const i = a.findIndex((l, k) => l !== b[k]);
  const res = i < 0 ? `iguales (${a.length - 2} huellas)` : `difieren desde el tick ${a[i].split(' ')[1]} (${(Number(a[i].split(' ')[1]) / 20).toFixed(0)} s)`;
  console.log(`| ${map} (${seed}) | era 3 | ${a[0] === b[0] ? 'igual' : 'distinto'} | ${res} |`);
}
