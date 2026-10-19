import { ELEV_PX, HALF_H, HALF_W } from '../core/constants';
import type { Game } from '../game/Game';
import type { Camera } from './Camera';
import { TEX, averageColor, buildNoise, buildPattern } from './terrainPatterns';

/**
 * Terreno en WebGL2: una malla de alturas texturizada con mezcla suave entre
 * terrenos, iluminación según la pendiente, agua animada y niebla de guerra.
 * Las entidades se dibujan encima en un canvas 2D.
 */

const VS = `#version 300 es
in vec2 a_pos;
in float a_h;
in float a_light;
uniform vec2 u_cam;
uniform float u_zoom;
uniform vec2 u_view;
uniform float u_elev;
out vec2 v_tile;
out float v_light;
out float v_h;
void main() {
  float ix = (a_pos.x - a_pos.y) * ${HALF_W.toFixed(1)};
  float iy = (a_pos.x + a_pos.y) * ${HALF_H.toFixed(1)} - a_h * u_elev;
  vec2 s = (vec2(ix, iy) - u_cam) * u_zoom + u_view * 0.5;
  gl_Position = vec4(s.x / u_view.x * 2.0 - 1.0, 1.0 - s.y / u_view.y * 2.0, 0.0, 1.0);
  v_tile = a_pos;
  v_light = a_light;
  v_h = a_h;
}`;

const FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray u_detail;
uniform sampler2D u_ids;
uniform sampler2D u_tint;
uniform sampler2D u_fog;
uniform sampler2D u_water;
uniform sampler2D u_noise;
uniform vec2 u_map;
uniform float u_time;
uniform int u_rock;
uniform float u_contours;
in vec2 v_tile;
in float v_light;
in float v_h;
out vec4 o;

vec3 layer(int id, vec2 p) {
  vec3 a = texture(u_detail, vec3(p / 3.0, float(id))).rgb;
  vec3 b = texture(u_detail, vec3(p * 0.137 + vec2(0.31, 0.17), float(id))).rgb;
  return mix(a, b, 0.35);
}
int idAt(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(u_map) - 1);
  return int(texelFetch(u_ids, c, 0).r * 255.0 + 0.5);
}
void main() {
  vec2 p = v_tile;
  vec2 uv = p / u_map;
  float n1 = texture(u_noise, p * 0.21).r - 0.5;
  float n2 = texture(u_noise, p * 0.83 + 0.5).r - 0.5;
  vec2 q = p - 0.5 + vec2(n1 + n2 * 0.4, n2 - n1 * 0.5) * 0.7;
  ivec2 b = ivec2(floor(q));
  vec2 f = smoothstep(0.12, 0.88, fract(q));
  int i00 = idAt(b), i10 = idAt(b + ivec2(1, 0)), i01 = idAt(b + ivec2(0, 1)), i11 = idAt(b + ivec2(1, 1));
  vec3 c;
  if (i00 == i10 && i00 == i01 && i00 == i11) c = layer(i00, p);
  else c = mix(mix(layer(i00, p), layer(i10, p), f.x), mix(layer(i01, p), layer(i11, p), f.x), f.y);
  c *= texture(u_tint, uv).rgb * 2.0;

  // Cantiles: borde oscuro entre la roca y el suelo transitable (se reconocen los pasos de un vistazo)
  if (u_rock >= 0) {
    float r = mix(mix(float(i00 == u_rock), float(i10 == u_rock), f.x), mix(float(i01 == u_rock), float(i11 == u_rock), f.x), f.y);
    float edge = r * (1.0 - r) * 4.0;
    c *= 1.0 - 0.45 * edge;
    c = mix(c, c * vec3(0.9, 0.88, 0.86), r * 0.4);
  }

  vec2 wv = texture(u_water, uv).rg;
  if (wv.r > 0.01) {
    float t = u_time;
    float deep = wv.g;
    float wave = sin(p.x * 2.7 + p.y * 1.3 + t * 1.5) * sin(p.y * 2.1 - p.x * 0.9 + t * 1.1);
    c = mix(c, c * vec3(0.55, 0.68, 0.84), deep * wv.r);
    c += vec3(0.035, 0.05, 0.06) * wave * wv.r;
    float g = texture(u_noise, p * 0.45 + vec2(t * 0.035, t * 0.02)).r;
    float g2 = texture(u_noise, p * 0.7 - vec2(t * 0.02, -t * 0.03)).r;
    c += vec3(0.28, 0.3, 0.3) * smoothstep(0.7, 0.86, g * g2 * 1.6) * wv.r;
    float foam = (1.0 - smoothstep(0.0, 0.3, deep)) * wv.r * (0.55 + 0.45 * sin(t * 1.8 + p.x * 3.0 + p.y * 2.0));
    c = mix(c, vec3(0.84, 0.88, 0.86), foam * 0.4);
  }
  c *= v_light;
  // Curvas de nivel suaves (una por nivel de elevación), fuera del agua
  if (u_contours > 0.0 && wv.r < 0.5) {
    float lv = abs(fract(v_h + 0.5) - 0.5) / max(fwidth(v_h), 1e-4);
    c *= 1.0 - u_contours * (1.0 - smoothstep(0.0, 1.2, lv));
  }
  // Gradación cálida, como en AoE2 DE
  c = pow(max(c, 0.0), vec3(0.96)) * vec3(1.05, 1.0, 0.9);
  float fog = texture(u_fog, uv).r;
  o = vec4(c * (1.0 - fog), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
  return s;
}

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x: number, y: number, s: number): number {
  const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy);
  let tx = fx - ix, ty = fy - iy;
  tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Iluminación de un vértice según la pendiente (luz de arriba a la izquierda). */
export function vertexLight(game: Game, vx: number, vy: number): number {
  const m = game.map;
  const hx = (m.vh(vx + 1, vy) - m.vh(vx - 1, vy)) / 2, hy = (m.vh(vx, vy + 1) - m.vh(vx, vy - 1)) / 2;
  const k = ELEV_PX / 35.8;
  let nx = -hx * k, ny = -hy * k, nz = 1;
  const nl = Math.hypot(nx, ny, nz);
  nx /= nl; ny /= nl; nz /= nl;
  const lx = -0.62, ly = -0.22, lz = 0.75;
  const d = (nx * lx + ny * ly + nz * lz) / lz;
  return Math.min(1.4, Math.max(0.55, 1 + (d - 1) * 2));
}

export class TerrainGL {
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private ibo: WebGLBuffer;
  private indexCount = 0;
  private tex: Record<string, WebGLTexture> = {};
  private u: Record<string, WebGLUniformLocation | null> = {};
  private heightVersion = -1;
  private terrainVersion = -1;
  /** Colores del terreno a 1 px por casilla, con relieve (para el minimapa). */
  minimap!: ImageData;

  static create(canvas: HTMLCanvasElement, game: Game): TerrainGL | null {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) return null;
    try { return new TerrainGL(canvas, gl, game); }
    catch (err) { console.warn('[terreno] WebGL2 no disponible, se usa el render plano:', err); return null; }
  }

  private constructor(public canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext, private game: Game) {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programa: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    for (const n of ['u_cam', 'u_zoom', 'u_view', 'u_elev', 'u_detail', 'u_ids', 'u_tint', 'u_fog', 'u_water', 'u_noise', 'u_map', 'u_time', 'u_rock', 'u_contours']) {
      this.u[n] = gl.getUniformLocation(p, n);
    }
    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;
    this.ibo = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(p, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 16, offset);
    };
    attr('a_pos', 2, 0);
    attr('a_h', 1, 8);
    attr('a_light', 1, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bindVertexArray(null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.buildStaticTextures();
  }

  // ------------------------------------------------------------ datos

  private texture(name: string, w: number, h: number, internal: number, format: number, data: ArrayBufferView, filter: number, wrap: number) {
    const gl = this.gl;
    const t = this.tex[name] ?? gl.createTexture()!;
    this.tex[name] = t;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  }

  private avgColors: [number, number, number][] = [];

  private buildStaticTextures() {
    const gl = this.gl, reg = this.game.reg;
    // Texturas de detalle de cada terreno en un array de texturas
    const layers = reg.terrains.length;
    const data = new Uint8Array(TEX * TEX * 4 * layers);
    reg.terrains.forEach((t, i) => {
      const px = buildPattern(t, 17 + i * 31);
      data.set(px, i * TEX * TEX * 4);
      this.avgColors[i] = averageColor(px);
    });
    const arr = gl.createTexture()!;
    this.tex.detail = arr;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, arr);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, TEX, TEX, layers, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    this.texture('noise', TEX, TEX, gl.R8, gl.RED, buildNoise(99), gl.LINEAR, gl.REPEAT);
    const m = this.game.map;
    this.texture('fog', m.w, m.h, gl.R8, gl.RED, new Uint8Array(m.w * m.h), gl.LINEAR, gl.CLAMP_TO_EDGE);
  }

  private buildTerrainTextures() {
    const gl = this.gl, m = this.game.map, reg = this.game.reg;
    this.terrainVersion = m.version;
    const N = m.w * m.h;
    const ids = new Uint8Array(N);
    const tint = new Uint8Array(N * 4);
    const water = new Uint8Array(N * 4);
    const isWater = reg.terrains.map(t => !!t.water);
    // Distancia a tierra firme (profundidad del agua)
    const dist = new Int32Array(N).fill(-1);
    const queue: number[] = [];
    for (let i = 0; i < N; i++) {
      ids[i] = m.terrain[i];
      if (!isWater[m.terrain[i]]) { dist[i] = 0; queue.push(i); }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const c = queue[qi], cx = c % m.w, cy = (c / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const n = ny * m.w + nx;
        if (dist[n] !== -1) continue;
        dist[n] = dist[c] + 1;
        queue.push(n);
      }
    }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      const t = reg.terrains[m.terrain[i]];
      const big = smoothNoise(x, y, 9) - 0.5, small = hash2(x, y) - 0.5;
      const k = t.water ? 0 : 1;
      tint[i * 4] = 128 * (1 + (big * 0.2 + small * 0.05) * k + big * 0.04 * k);
      tint[i * 4 + 1] = 128 * (1 + (big * 0.16 + small * 0.05) * k);
      tint[i * 4 + 2] = 128 * (1 + (big * 0.12 + small * 0.04) * k - big * 0.05 * k);
      tint[i * 4 + 3] = 255;
      if (t.water) {
        water[i * 4] = 255;
        const shallow = t.walkable;
        water[i * 4 + 1] = shallow ? 25 : Math.min(255, Math.round((Math.min(dist[i], 5) / 5) * 255));
      }
      water[i * 4 + 3] = 255;
    }
    this.texture('ids', m.w, m.h, gl.R8, gl.RED, ids, gl.NEAREST, gl.CLAMP_TO_EDGE);
    this.texture('tint', m.w, m.h, gl.RGBA8, gl.RGBA, tint, gl.LINEAR, gl.CLAMP_TO_EDGE);
    this.texture('water', m.w, m.h, gl.RGBA8, gl.RGBA, water, gl.LINEAR, gl.CLAMP_TO_EDGE);
    this.buildMinimap(tint);
  }

  private buildMinimap(tint: Uint8Array) {
    const m = this.game.map;
    const img = new ImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      const c = this.avgColors[m.terrain[i]];
      const light = (vertexLight(this.game, x, y) + vertexLight(this.game, x + 1, y + 1)) / 2;
      for (let k = 0; k < 3; k++) img.data[i * 4 + k] = c[k] * (tint[i * 4 + k] / 128) * light;
      img.data[i * 4 + 3] = 255;
    }
    this.minimap = img;
  }

  private buildMesh() {
    const gl = this.gl, m = this.game.map;
    this.heightVersion = m.heightVersion;
    const W = m.w + 1, H = m.h + 1;
    const v = new Float32Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      v[i] = x; v[i + 1] = y; v[i + 2] = m.heights[y * W + x]; v[i + 3] = vertexLight(this.game, x, y);
    }
    // Triángulos ordenados de atrás hacia delante (las colinas cercanas tapan a las lejanas)
    const idx = new Uint32Array(m.w * m.h * 6);
    let k = 0;
    for (let s = 0; s <= m.w + m.h - 2; s++) {
      for (let x = Math.max(0, s - (m.h - 1)); x <= Math.min(m.w - 1, s); x++) {
        const y = s - x;
        const a = y * W + x, b = a + 1, c = a + W + 1, d = a + W;
        idx[k++] = a; idx[k++] = b; idx[k++] = c;
        idx[k++] = a; idx[k++] = c; idx[k++] = d;
      }
    }
    this.indexCount = k;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  /** Niebla: 0 = visible, 255 = sin explorar. */
  updateFog(fog: Uint8Array) {
    const gl = this.gl, m = this.game.map;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.fog);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, m.w, m.h, gl.RED, gl.UNSIGNED_BYTE, fog);
  }

  /** Prepara las texturas y la malla si el mapa ha cambiado. */
  sync() {
    const m = this.game.map;
    if (m.version !== this.terrainVersion) this.buildTerrainTextures();
    if (m.heightVersion !== this.heightVersion) this.buildMesh();
  }

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  render(cam: Camera, time: number) {
    const gl = this.gl, m = this.game.map;
    this.sync();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.u_cam, cam.x, cam.y);
    gl.uniform1f(this.u.u_zoom, cam.zoom);
    gl.uniform2f(this.u.u_view, cam.viewW, cam.viewH);
    gl.uniform1f(this.u.u_elev, cam.elev);
    gl.uniform2f(this.u.u_map, m.w, m.h);
    gl.uniform1f(this.u.u_time, time);
    gl.uniform1i(this.u.u_rock, this.game.reg.terrains.findIndex(t => t.id === 'rock'));
    gl.uniform1f(this.u.u_contours, 0.1);
    const bind = (unit: number, name: string, target: number = gl.TEXTURE_2D) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, this.tex[name]);
      gl.uniform1i(this.u['u_' + name], unit);
    };
    bind(0, 'detail', gl.TEXTURE_2D_ARRAY);
    bind(1, 'ids'); bind(2, 'tint'); bind(3, 'fog'); bind(4, 'water'); bind(5, 'noise');
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}
