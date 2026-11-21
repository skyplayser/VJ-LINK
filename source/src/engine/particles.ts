// Partikel-Objekt zeichnen: viele Stäbchen bzw. Punkte auf der Oberfläche eines Körpers, die auf den Beat
// auseinanderfliegen. Ein instanzierter Aufruf; jedes Stäbchen ist ein zur Kamera gedrehtes Rechteck, das der
// Fragment-Shader als Kapsel mit Licht zeichnet (2 Dreiecke statt eines echten Zylinders: viel weniger Arbeit,
// damit auch 3 Ausgänge flüssig laufen). Eigene Formeln (Lambert, Blinn-Glanz, Randlicht), keine Fremdshader.
import {
  PARTICLE_MAX, PARTICLE_CLIP_PREFIX, PARTICLE_OBJECTS, BassEnvelope, bassTarget, builtinMesh, explodeState, isModelClip, modelIdOf,
  particleAngles, particleRandoms, sampleSurface, defaultParticles, type ParticleObject, type ParticleSettings,
} from "../core/particles";
import { decodePointCloud } from "../core/meshfile";

const VS = `#version 300 es
layout(location=0) in vec2 aC;
layout(location=1) in vec3 aP0; layout(location=2) in vec3 aN0;
layout(location=3) in vec3 aP1; layout(location=4) in vec3 aN1;
layout(location=5) in vec4 aR;
layout(location=6) in vec4 aK0; layout(location=7) in vec4 aK1;
uniform mat4 uProj; uniform mat3 uRot; uniform float uDist, uScale;
uniform vec4 uRegion;
uniform vec2 uOff;
uniform float uMorph, uHitT, uHitAmp, uHitRet, uPulseT, uPulseAmp, uHold, uHoldVel, uScatter, uLen, uRad;
/** Höhe des ganzen Ziels in Pixeln und kleinster Radius in Pixeln. */
uniform float uVpH, uMinPx;
out vec2 vQ;
flat out float vL;
flat out vec3 vSide; flat out vec3 vAlong; flat out vec3 vCam;
flat out float vFace;
flat out vec4 vCol;
flat out float vR;
float env(float t, float ret){
  const float a = 0.12;
  if (t < 0.0) return 0.0;
  if (t < a) { float x = 1.0 - t / a; return 1.0 - x*x*x; }
  float r = clamp((t - a) / ret, 0.0, 1.0); return 1.0 - r*r*(3.0 - 2.0*r);
}
// Weite je Partikel: die meisten wenig, wenige weit (sonst verdeckt die Wolke die Form)
float reach(){ return 0.3 + pow(fract(aR.x * 13.37 + aR.w * 7.91), 10.0) * 5.0; }
vec3 disp(float dt, vec3 D){
  float s = aR.x * 0.12;
  float e = uHitAmp * env(uHitT + dt - s, uHitRet) * reach()
          + uPulseAmp * env(uPulseT + dt - s * 0.5, 0.55) * (0.4 + aR.z * 0.8)
          + max(0.0, uHold + uHoldVel * dt) * reach();
  return D * e * 0.7;
}
void main(){
  float m = smoothstep(0.0, 1.0, clamp((uMorph - aR.w * 0.45) / 0.55, 0.0, 1.0));
  vec3 P = mix(aP0, aP1, m);
  vec3 Nn = mix(aN0, aN1, m); Nn = length(Nn) < 1e-3 ? normalize(aN1 + vec3(1e-3)) : normalize(Nn);
  P += Nn * sin(3.14159 * m) * (0.2 + aR.y * 0.4);
  vec3 J = aR.yzw * 2.0 - 1.0;
  vec3 D = normalize(Nn * (1.0 - uScatter * 0.6) + J * uScatter + vec3(1e-4));
  vec3 d0 = disp(0.0, D), d1 = disp(0.04, D);
  vec3 vel = (d1 - d0) / 0.04; float sp = length(vel);
  float e = clamp(length(d0), 0.0, 3.0);
  vec3 ax = normalize(Nn + normalize(J + vec3(1e-3)) * e * 1.2);
  if (sp > 1e-4) ax = normalize(mix(ax, vel / sp, clamp(sp * 0.12, 0.0, 0.85)));
  float L0 = uLen * (0.75 + aR.x * 0.5);
  float L = L0 * (1.0 + min(sp * 0.3, 1.6));
  // Fuß etwas unter der Oberfläche, Bewegungsstreckung mittig um den Partikel
  vec3 A = P + d0 - ax * (0.15 * L0 + (L - L0) * 0.5);
  vec3 B = A + ax * L;
  A = uRot * A * uScale; B = uRot * B * uScale;
  A.z -= uDist; B.z -= uDist;
  vec3 M = (A + B) * 0.5, toCam = normalize(-M), d = B - A;
  vec3 dp = d - toCam * dot(d, toCam);
  float lp = length(dp);
  vec3 along = lp > 1e-6 ? dp / lp : normalize(cross(toCam, vec3(0.31, 0.95, 0.07)));
  vec3 side = normalize(cross(toCam, along));
  float r = uRad * uScale, hl = lp * 0.5;
  // Mindestens knapp 1 Pixel Radius: sonst decken kleine Punkte und dünne Stäbchen nie ganz (halb durchsichtig, flimmern)
  float cw = max((uProj * vec4(M, 1.0)).w, 1e-3);
  float px = r * uProj[1][1] / cw * uVpH * 0.5;
  r *= max(1.0, uMinPx / max(px, 1e-4));
  float y = aC.y * 2.0 - 1.0;
  vec3 w = M + side * aC.x * r + along * y * (hl + r);
  vQ = vec2(aC.x, y * (hl + r) / r); vL = hl / r;
  vSide = side; vAlong = along; vCam = toCam;
  vFace = clamp(dot(normalize(d + vec3(1e-6)), toCam), 0.0, 1.0);
  vCol = mix(aK0, aK1, m); vR = aR.x;
  vec4 c = uProj * vec4(w, 1.0);
  c.xy += uOff * c.w;
  // Nur den Ausschnitt um das Objekt rechnen (spart Speicher bei breiten Leinwänden)
  c.xy = (c.xy - uRegion.xy * c.w) / uRegion.zw;
  gl_Position = c;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vQ;
flat in float vL;
flat in vec3 vSide; flat in vec3 vAlong; flat in vec3 vCam;
flat in float vFace;
flat in vec4 vCol;
flat in float vR;
uniform int uColorMode; uniform vec3 uColA, uColB, uBase, uRim; uniform vec3 uPal[5]; uniform int uPalN;
uniform float uHue;
layout(location=0) out vec4 o;
/** Deckung (1 in jeder getroffenen Abtastung): ergibt nach dem Auflösen die echte Deckkraft der Kante. */
layout(location=1) out vec4 oCov;
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
void main(){
  float dy = sign(vQ.y) * max(abs(vQ.y) - vL, 0.0);
  float dd = vQ.x * vQ.x + dy * dy;
  // Rand in Pixeln (Abstand statt Abstand², sonst ist der Übergang je nach Größe verschieden breit)
  float dl = sqrt(dd);
  float fw = max(fwidth(dl), 1e-4);
  float a = clamp((1.0 - dl) / fw, 0.0, 1.0);
  if (a <= 0.0) discard;
  vec3 n = normalize(vSide * vQ.x + vAlong * dy + vCam * sqrt(max(0.0, 1.0 - dd)));
  vec3 L1 = normalize(vec3(-0.5, 0.8, 0.9));
  float dif = max(dot(n, L1), 0.0);
  float spc = pow(max(dot(n, normalize(L1 + vCam)), 0.0), 40.0);
  float rim = pow(1.0 - max(dot(n, vCam), 0.0), 3.0);
  // Fuß dunkel, Spitze hell (Ersatz für Umgebungsverdeckung): ergibt die dichte Struktur
  float t = clamp(vQ.y / (vL + 1.0) * 0.5 + 0.5, 0.0, 1.0);
  float ao = mix(mix(0.18, 1.0, smoothstep(0.0, 1.0, t)), 1.0, vFace);
  vec3 base = uBase, rc = uRim;
  if (uColorMode == 0) { if (vCol.a > 0.5) { base = vCol.rgb; rc = vCol.rgb; } }
  else if (uColorMode == 1) { base = uColA; rc = uColB; }
  else if (uColorMode == 2) { base = mix(uColA, uColB, vR); rc = uColB; }
  else if (uColorMode == 3) { base = hue(vR + uHue); rc = hue(vR + uHue + 0.3); }
  else { int i = int(floor(vR * float(uPalN))); base = uPal[clamp(i, 0, 4)]; rc = uPal[clamp((i + 1) % max(uPalN, 1), 0, 4)]; }
  base *= 0.85 + vR * 0.3;
  vec3 c = base * (0.1 + dif * 0.95) * ao + vec3(1.0) * spc * 0.45 * ao + rc * rim * 0.5;
  // Weiche Schulter statt hartem Abschneiden bei 100 %: Glanz und Randlicht fressen sonst weiß aus (übersteuert)
  float mx = max(c.r, max(c.g, c.b));
  if (mx > 0.8) c *= (0.8 + 0.2 * (1.0 - exp(-(mx - 0.8) / 0.2))) / mx;
  // Alpha nur für die Abtast-Deckung (Alpha-to-Coverage); die Deckkraft kommt aus oCov
  o = vec4(c, a);
  oCov = vec4(1.0);
}`;

/** Aufgelöstes Bild an seinen Platz im Ziel: Farbe (schon mit der Deckung gewichtet) und Deckkraft aus der Deckung. */
const CVS = `#version 300 es
void main(){ gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0); }`;
const CFS = `#version 300 es
precision highp float;
uniform sampler2D uC, uA;
uniform vec2 uO;
out vec4 o;
void main(){
  ivec2 q = ivec2(gl_FragCoord.xy - uO);
  float a = texelFetch(uA, q, 0).r;
  o = vec4(min(texelFetch(uC, q, 0).rgb, vec3(a)), a);
}`;

interface PObj { pts: WebGLBuffer; col: WebGLBuffer | null; n: number }
interface Msaa {
  fb: WebGLFramebuffer; color: WebGLRenderbuffer; cov: WebGLRenderbuffer; depth: WebGLRenderbuffer; w: number; h: number; samples: number; used: number;
  /** Aufgelöstes Bild und aufgelöste Deckung (MSAA darf nur deckungsgleich aufgelöst werden, danach an seinen Platz). */
  rfb: WebGLFramebuffer; rtex: WebGLTexture; rcov: WebGLTexture;
}
/** Ziel der Engine (Textur + Framebuffer). */
export interface PTarget { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }

export interface ParticleFrame {
  /** Zeit der Ebene in Sekunden (mit Ebenen-Tempo). */
  time: number;
  beat: number;
  /** Farbmodus wie bei den Generatoren: 0 Original, 1 Slot, 2 Verlauf, 3 Regenbogen, 4 mehrere Slots. */
  colorMode: number;
  colA: readonly number[]; colB: readonly number[];
  pal: readonly (readonly number[])[];
  /** Overlay-Ebene: Hintergrund durchsichtig. Basis: schwarz. */
  key: boolean;
  /** Lage wie bei allen Visuals (Laser-Regler): Verschiebung -1…1, Größe, Drehung in Grad. */
  x: number; y: number; size: number; rot: number;
  /** Bass-Pegel 0–1 aus echtem Audio (Eingang oder LJ-Link), 0 ohne Audio. */
  bass: number;
  /** Tempo (für die Rückkehrzeit beim Bass-Auslöser). */
  bpm: number;
}

const FOV = 32 * Math.PI / 180, DIST = 5.6;

function persp(asp: number): Float32Array {
  const f = 1 / Math.tan(FOV / 2), n = 0.3, far = 30;
  return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0]);
}

/** Drehung Y (Drehteller), dann Neigung X, dann Rollen Z (Spalten-Major für uniformMatrix3fv). */
function rotation(ay: number, ax: number, az: number): Float32Array {
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az);
  // R = Rz * Rx * Ry
  const rxy = [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy];
  const out = new Float32Array(9);
  for (let c = 0; c < 3; c++) {
    const x = rxy[c * 3]!, y = rxy[c * 3 + 1]!, z = rxy[c * 3 + 2]!;
    out[c * 3] = cz * x - sz * y; out[c * 3 + 1] = sz * x + cz * y; out[c * 3 + 2] = z;
  }
  return out;
}

export class ParticleRenderer {
  private prog: WebGLProgram;
  private u = new Map<string, WebGLUniformLocation | null>();
  private quad: WebGLBuffer;
  private rand: WebGLBuffer;
  private objs = new Map<string, PObj | "loading" | "failed">();
  private vaos = new Map<string, WebGLVertexArrayObject>();
  private msaa: Msaa[] = [];
  private morph = new Map<string, { cur: string; prev: string; since: number }>();
  /** Bass-Hüllkurve je Ebene bzw. Vorschau. */
  private bassEnv = new Map<string, BassEnvelope>();
  private maxSamples: number;
  /** Punktwolke eines eigenen Modells laden (Standard: aus der Bibliothek über vjmedia://model/<id>). */
  loadModel: (id: string) => Promise<ArrayBuffer | null> = async id => {
    try { const r = await fetch(`vjmedia://model/${id}`); return r.ok ? await r.arrayBuffer() : null; } catch { return null; }
  };
  /** Wird aufgerufen, wenn ein Modell geladen ist (z. B. um Vorschaubilder neu zu zeichnen). */
  onLoaded: () => void = () => {};

  constructor(private gl: WebGL2RenderingContext) {
    const vs = gl.createShader(gl.VERTEX_SHADER)!, fs = gl.createShader(gl.FRAGMENT_SHADER)!, p = gl.createProgram()!;
    gl.shaderSource(vs, VS); gl.compileShader(vs);
    gl.shaderSource(fs, FS); gl.compileShader(fs);
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    this.prog = p;
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.rand = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rand);
    gl.bufferData(gl.ARRAY_BUFFER, particleRandoms(PARTICLE_MAX), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.maxSamples = Math.max(1, Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number));
    const cvs = gl.createShader(gl.VERTEX_SHADER)!, cfs = gl.createShader(gl.FRAGMENT_SHADER)!, cp = gl.createProgram()!;
    gl.shaderSource(cvs, CVS); gl.compileShader(cvs);
    gl.shaderSource(cfs, CFS); gl.compileShader(cfs);
    gl.attachShader(cp, cvs); gl.attachShader(cp, cfs); gl.linkProgram(cp);
    this.comp = cp;
    this.emptyVao = gl.createVertexArray()!;
  }
  private comp: WebGLProgram;
  private emptyVao: WebGLVertexArrayObject;

  private ok: boolean | null = null;
  /** Shader übersetzt? (Fehler einmal melden.) */
  private ready(): boolean {
    if (this.ok !== null) return this.ok;
    const gl = this.gl;
    this.ok = !!gl.getProgramParameter(this.prog, gl.LINK_STATUS) && !!gl.getProgramParameter(this.comp, gl.LINK_STATUS);
    if (!this.ok) console.error("Partikel-Shader:", gl.getProgramInfoLog(this.prog), gl.getProgramInfoLog(this.comp));
    return this.ok;
  }

  private loc(name: string): WebGLUniformLocation | null {
    if (!this.u.has(name)) this.u.set(name, this.gl.getUniformLocation(this.prog, name));
    return this.u.get(name)!;
  }

  /** Schlüssel des Körpers zu einem Clip („pobj-cross“ bzw. „mdl:<id>“). */
  private obj(clip: string): PObj | null {
    const have = this.objs.get(clip);
    if (have === "loading" || have === "failed") return null;
    if (have) return have;
    const gl = this.gl;
    const upload = (pts: Float32Array, col: Uint8Array | null, n: number): PObj => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
      let c: WebGLBuffer | null = null;
      if (col) { c = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, c); gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW); }
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      return { pts: b, col: c, n };
    };
    if (isModelClip(clip)) {
      this.objs.set(clip, "loading");
      void this.loadModel(modelIdOf(clip)).then(buf => {
        const pc = buf ? decodePointCloud(buf) : null;
        if (!pc) { this.objs.set(clip, "failed"); return; }
        this.objs.set(clip, upload(pc.pts, pc.col, pc.n));
        this.onLoaded();
      });
      return null;
    }
    const o = clip.slice(PARTICLE_CLIP_PREFIX.length) as ParticleObject;
    if (!PARTICLE_OBJECTS.includes(o)) return null;
    const pts = sampleSurface(builtinMesh(o), PARTICLE_MAX);
    if (!pts) { this.objs.set(clip, "failed"); return null; }
    const p = upload(pts, null, PARTICLE_MAX);
    this.objs.set(clip, p);
    return p;
  }

  /** Ist der Körper geladen (bzw. endgültig nicht ladbar)? Startet das Laden, falls nötig. */
  objectReady(clip: string): boolean {
    if (this.obj(clip)) return true;
    return this.objs.get(clip) === "failed";
  }

  /** Eigenes Modell vergessen (gelöscht oder ersetzt). */
  forget(clip: string): void {
    const o = this.objs.get(clip);
    if (o && typeof o === "object") {
      this.gl.deleteBuffer(o.pts); if (o.col) this.gl.deleteBuffer(o.col);
      for (const [k, v] of this.vaos) if (k.split("|").includes(clip)) { this.gl.deleteVertexArray(v); this.vaos.delete(k); }
    }
    this.objs.delete(clip);
  }

  /** Zeichenzustand für ein Paar (Formwechsel von → zu). */
  private vao(a: string, A: PObj, b: string, B: PObj): WebGLVertexArrayObject {
    const key = `${a}|${b}`;
    const have = this.vaos.get(key);
    if (have) return have;
    const gl = this.gl, v = gl.createVertexArray()!;
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const pts = (buf: WebGLBuffer, lp: number, ln: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(lp, 1);
      gl.enableVertexAttribArray(ln); gl.vertexAttribPointer(ln, 3, gl.FLOAT, false, 24, 12); gl.vertexAttribDivisor(ln, 1);
    };
    pts(A.pts, 1, 2); pts(B.pts, 3, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rand);
    gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(5, 1);
    const col = (buf: WebGLBuffer | null, l: number) => {
      if (buf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.UNSIGNED_BYTE, true, 0, 0); gl.vertexAttribDivisor(l, 1);
      } else gl.disableVertexAttribArray(l);
    };
    col(A.col, 6); col(B.col, 7);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // Höchstens einige Paare behalten
    if (this.vaos.size > 24) { const [k0, v0] = this.vaos.entries().next().value as [string, WebGLVertexArrayObject]; gl.deleteVertexArray(v0); this.vaos.delete(k0); }
    this.vaos.set(key, v);
    return v;
  }

  /** Mehrfach abgetastetes Zwischenbild mit Tiefe in passender Größe (wenige im Speicher). */
  private target(w: number, h: number): Msaa {
    const gl = this.gl;
    let m = this.msaa.find(x => x.w === w && x.h === h);
    if (m) { m.used = performance.now(); return m; }
    // Große Flächen: weniger Abtastungen (Speicher)
    const samples = w * h > 4.2e6 ? Math.min(2, this.maxSamples) : this.maxSamples;
    const fb = gl.createFramebuffer()!, color = gl.createRenderbuffer()!, cov = gl.createRenderbuffer()!, depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, color);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, cov);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.R8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, cov);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    const tex = (fmt: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return t;
    };
    gl.activeTexture(gl.TEXTURE0);
    const rtex = tex(gl.RGBA8), rcov = tex(gl.R8), rfb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, rfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rtex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, rcov, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    m = { fb, color, cov, depth, w, h, samples, used: performance.now(), rfb, rtex, rcov };
    this.msaa.push(m);
    // Alte Größen freigeben (Fenster verkleinert, Vorschau gewechselt)
    if (this.msaa.length > 3) {
      this.msaa.sort((a, b) => b.used - a.used);
      for (const x of this.msaa.splice(3)) { gl.deleteFramebuffer(x.fb); gl.deleteRenderbuffer(x.color); gl.deleteRenderbuffer(x.cov); gl.deleteRenderbuffer(x.depth); gl.deleteFramebuffer(x.rfb); gl.deleteTexture(x.rtex); gl.deleteTexture(x.rcov); }
    }
    return m;
  }

  /**
   * Ebene mit Partikel-Objekt in `dst` zeichnen. `fbKey` unterscheidet Ebenen und Vorschauen (Formwechsel).
   * Gibt false zurück, solange das Objekt noch lädt.
   */
  render(dst: PTarget, clip: string, fbKey: string, settings: ParticleSettings | undefined, f: ParticleFrame): boolean {
    if (!this.ready()) return false;
    const cur = this.obj(clip);
    if (!cur) return false;
    const gl = this.gl, p = settings ?? defaultParticles();
    // Formwechsel: Clip der Ebene wechselt von einem Partikel-Objekt zum nächsten
    let st = this.morph.get(fbKey);
    if (!st) { st = { cur: clip, prev: clip, since: -1e9 }; this.morph.set(fbKey, st); }
    if (st.cur !== clip) { st.prev = st.cur; st.cur = clip; st.since = f.beat; }
    let morphAmt = Math.min(1, Math.max(0, (f.beat - st.since) / 1.5));
    let prevKey = st.prev, prev = prevKey === clip ? cur : this.obj(prevKey);
    if (!prev || morphAmt >= 1) { prev = cur; prevKey = clip; morphAmt = 1; }
    const n = Math.min(cur.n, prev.n, Math.round(p.count * 1000));
    if (n <= 0) return false;

    const { w, h } = dst;
    // Ausschnitt um das Objekt (in Pixeln): Höhe bzw. Breite nach Größe, mit Rand für die Explosion
    const scale = Math.max(0.05, f.size);
    const span = Math.ceil(h * Math.min(3, 1.75 * scale));
    const cx = (0.5 + f.x * 0.5) * w, cy = (0.5 + f.y * 0.5) * h;
    const x0 = Math.max(0, Math.floor(cx - span / 2)), x1 = Math.min(w, Math.ceil(cx + span / 2));
    const y0 = Math.max(0, Math.floor(cy - span / 2)), y1 = Math.min(h, Math.ceil(cy + span / 2));
    // Ziel leeren (durchsichtig bei Overlay, sonst schwarz)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, f.key ? 0 : 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const rw = x1 - x0, rh = y1 - y0;
    if (rw < 2 || rh < 2) return true;
    const ms = this.target(rw, rh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ms.fb);
    gl.viewport(0, 0, rw, rh);
    // Deckung: Overlay leer = 0 (durchsichtig), Basis = 1 (schwarz deckt)
    const bg = f.key ? 0 : 1;
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, bg]);
    gl.clearBufferfv(gl.COLOR, 1, [bg, 0, 0, 0]);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    gl.disable(gl.BLEND);
    if (ms.samples > 1) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.loc("uProj"), false, persp(w / h));
    // Drehung je Achse: feste Lage plus Drehtempo; dazu Rollen aus dem Regler „Drehung“ der Lage
    const an = particleAngles(p, f.time);
    gl.uniformMatrix3fv(this.loc("uRot"), false, rotation(an.y, an.x, an.z + f.rot * Math.PI / 180));
    gl.uniform1f(this.loc("uDist"), DIST);
    gl.uniform1f(this.loc("uScale"), scale);
    gl.uniform2f(this.loc("uOff"), f.x, f.y);
    // Ausschnitt in NDC: Mitte und halbe Größe
    gl.uniform4f(this.loc("uRegion"), ((x0 + x1) / w) - 1, ((y0 + y1) / h) - 1, rw / w, rh / h);
    gl.uniform1f(this.loc("uMorph"), morphAmt);
    const ex = explodeState(p, f.beat);
    gl.uniform1f(this.loc("uHitT"), ex.since); gl.uniform1f(this.loc("uHitAmp"), ex.amp); gl.uniform1f(this.loc("uHitRet"), ex.ret);
    gl.uniform1f(this.loc("uPulseT"), ex.pulseSince); gl.uniform1f(this.loc("uPulseAmp"), ex.pulseAmp);
    let hold = ex.hold, holdVel = 0;
    if (p.trigger === "bass") {
      let env = this.bassEnv.get(fbKey);
      if (!env) { env = new BassEnvelope(); this.bassEnv.set(fbKey, env); }
      const b = env.step(bassTarget(p, f.bass), performance.now(), p.ret, f.bpm);
      hold = b.value; holdVel = b.vel;
    }
    gl.uniform1f(this.loc("uHold"), hold);
    gl.uniform1f(this.loc("uHoldVel"), Math.max(-20, Math.min(20, holdVel)));
    gl.uniform1f(this.loc("uScatter"), Math.min(1, Math.max(0, p.scatter)));
    gl.uniform1f(this.loc("uLen"), 0.085 * p.length);
    gl.uniform1f(this.loc("uRad"), 0.0115 * p.size);
    gl.uniform1f(this.loc("uVpH"), h);
    gl.uniform1f(this.loc("uMinPx"), 0.85);
    gl.uniform1i(this.loc("uColorMode"), f.colorMode);
    gl.uniform3f(this.loc("uColA"), f.colA[0]!, f.colA[1]!, f.colA[2]!);
    gl.uniform3f(this.loc("uColB"), f.colB[0]!, f.colB[1]!, f.colB[2]!);
    gl.uniform3f(this.loc("uBase"), 0.62, 0.6, 0.68);
    gl.uniform3f(this.loc("uRim"), 0.9, 0.45, 0.75);
    const pal = new Float32Array(15);
    f.pal.slice(0, 5).forEach((c, i) => pal.set(c.slice(0, 3), i * 3));
    gl.uniform3fv(this.loc("uPal"), pal);
    gl.uniform1i(this.loc("uPalN"), Math.max(1, Math.min(5, f.pal.length)));
    gl.uniform1f(this.loc("uHue"), f.time * 0.05);
    // Ohne Farben im Modell: feste Vorgabe (gilt nur für abgeschaltete Attribute, Zustand des Kontexts)
    gl.vertexAttrib4f(6, 0, 0, 0, 0); gl.vertexAttrib4f(7, 0, 0, 0, 0);
    gl.bindVertexArray(this.vao(prevKey, prev, clip, cur));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    gl.bindVertexArray(null);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.disable(gl.DEPTH_TEST);
    // Glätten: Mehrfach-Abtastung in den Ausschnitt des Ziels auflösen
    // Farbe und Deckung getrennt auflösen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ms.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, ms.rfb);
    gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
    gl.blitFramebuffer(0, 0, rw, rh, 0, 0, rw, rh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.readBuffer(gl.COLOR_ATTACHMENT1); gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1]);
    gl.blitFramebuffer(0, 0, rw, rh, 0, 0, rw, rh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    // An seinen Platz im Ziel: Deckkraft = Anteil der getroffenen Abtastungen
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(x0, y0, rw, rh);
    gl.useProgram(this.comp);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ms.rcov);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ms.rtex);
    gl.uniform1i(gl.getUniformLocation(this.comp, "uC"), 0);
    gl.uniform1i(gl.getUniformLocation(this.comp, "uA"), 1);
    gl.uniform2f(gl.getUniformLocation(this.comp, "uO"), x0, y0);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.viewport(0, 0, w, h);
    return true;
  }

  /** Formwechsel-Zustand einer Vorschau vergessen. */
  reset(fbKey: string): void { this.morph.delete(fbKey); }
}
