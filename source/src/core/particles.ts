// Partikel-Objekt: ein 3D-Körper, dessen Oberfläche aus vielen leuchtenden Staubkörnern besteht. Auf den Beat
// fliegen sie auseinander und kehren zurück. Hier: Einstellungen je Ebene, die eingebauten Körper (im Code
// erzeugt, keine fremden Modelle) und die Abtastung der Oberfläche. Gezeichnet wird in src/engine/particles.ts.
// Verfahren (Lehrbuch): Dreiecke nach Fläche gewichtet abtasten, Punkte mit Normale, Reihenfolge gemischt.

/** Eingebaute Körper (Clip-ID = „pobj-…“). */
export const PARTICLE_OBJECTS = ["cross", "cube", "sphere", "torus", "star"] as const;
export type ParticleObject = typeof PARTICLE_OBJECTS[number];
export const PARTICLE_CLIP_PREFIX = "pobj-";
/** Eigene Modelle aus der Bibliothek (OBJ/STL): Clip „mdl:<id>“. */
export const MODEL_CLIP_PREFIX = "mdl:";

export const isParticleClip = (clip: string | null | undefined): boolean =>
  !!clip && (clip.startsWith(MODEL_CLIP_PREFIX) || (clip.startsWith(PARTICLE_CLIP_PREFIX) && PARTICLE_OBJECTS.includes(clip.slice(PARTICLE_CLIP_PREFIX.length) as ParticleObject)));
export const isModelClip = (clip: string | null | undefined): boolean => !!clip && clip.startsWith(MODEL_CLIP_PREFIX);
export const modelIdOf = (clip: string): string => clip.slice(MODEL_CLIP_PREFIX.length);

/** Wann die Partikel auseinanderfliegen. „hold“: Der Regler „Explosion“ hält sie direkt auseinander (Pult/Fader). */
/** „bass“: Je härter der Bass (Audio-Eingang oder LJ-Link), desto weiter fliegen die Partikel. */
export const PARTICLE_TRIGGERS = ["beat", "bar", "2bars", "4bars", "bass", "hold"] as const;
export type ParticleTrigger = typeof PARTICLE_TRIGGERS[number];
/** Beats zwischen zwei Explosionen. */
export const TRIGGER_BEATS: Record<Exclude<ParticleTrigger, "hold" | "bass">, number> = { beat: 1, bar: 4, "2bars": 8, "4bars": 16 };

/**
 * Verhalten des Objekts: „burst“ Partikel (zerfällt zu Staub und fliegt auseinander); die anderen verformen den
 * Körper als Ganzes: „melt“ Schmelzen (sackt zusammen und zerfließt zur Pfütze), „jelly“ (wabbelt), „dissolve“
 * Auflösen (brennt von oben weg, steigt als Rauch auf), „twist“ Verdrehen, „shatter“ Zersplittern (feste Stücke),
 * „still“ ohne Effekt.
 */
export const PARTICLE_MODES = ["burst", "melt", "jelly", "dissolve", "twist", "shatter", "still", "drift"] as const;
/** Reihenfolge in der Bedienung (die Liste oben bleibt so, gespeicherte Nummern im Shader ändern sich nicht). */
export const PARTICLE_MODE_ORDER: readonly ParticleMode[] = ["burst", "drift", "melt", "jelly", "dissolve", "twist", "shatter", "still"];
export type ParticleMode = typeof PARTICLE_MODES[number];
/** Anstieg des Effekts in Beats (Partikel: fester schneller Anstieg im Shader). */
export const MODE_ATTACK: Record<ParticleMode, number> = { burst: 0.12, drift: 1.6, melt: 1.4, jelly: 0, dissolve: 1.2, twist: 0.8, shatter: 0.12, still: 0 };

export interface ParticleSettings {
  /** Effekt (fehlt in älteren Projekten = Partikel). */
  mode: ParticleMode;
  /** Weite der Explosion 0–1 (0 = ruhig). */
  explode: number;
  trigger: ParticleTrigger;
  /** Dauer des Zurückkehrens in Beats. */
  ret: number;
  /** Streuung der Flugrichtung 0–1 (0 = genau entlang der Normalen). */
  scatter: number;
  /** Drehung an/aus. */
  spin: boolean;
  /** Drehtempo um die senkrechte Achse (Y) in Umdrehungen pro Minute, negativ = andersherum. */
  rpm: number;
  /** Drehtempo um X (Kippen) und Z (Rollen), U/min. Fehlt in älteren Projekten = 0. */
  rpmX: number;
  rpmZ: number;
  /** Feste Lage in Grad je Achse (dazu kommt die Drehung). */
  angX: number;
  angY: number;
  angZ: number;
  /** Dicke der Partikel, 1 = normal. */
  size: number;
  /** Anzahl in Tausend. */
  count: number;
  /**
   * Form deckend: in Ruhe eine geschlossene, beleuchtete Fläche (Logo sieht aus wie das Logo), erst beim Sprengen
   * zerfällt sie in leuchtenden Staub. Fehlt = Vorgabe: an für eigene Modelle und alle Körper-Verhalten, aus beim
   * Partikel-Effekt der eingebauten Körper.
   */
  solid?: boolean;
}

/** Gilt „Form deckend“ für diesen Clip? */
export const particleSolid = (p: ParticleSettings, clip: string | null | undefined): boolean =>
  p.solid ?? ((p.mode ?? "burst") !== "burst" || (!!clip && isModelClip(clip)));

export const PARTICLE_LIMITS = {
  explode: [0, 1], ret: [0.25, 4], scatter: [0, 1], rpmX: [-30, 30], rpm: [-30, 30], rpmZ: [-30, 30],
  angX: [-180, 180], angY: [-180, 180], angZ: [-180, 180], size: [0.3, 3], count: [5, 200],
} as const;
export type ParticleNumKey = keyof typeof PARTICLE_LIMITS;

/** Vorgabe: ruhig für 3 Ausgänge mit 60 fps ab Apple M2 (siehe Hinweis im Bedienfeld). */
export const PARTICLE_DEFAULT_COUNT = 40;
export const defaultParticles = (): ParticleSettings =>
  ({ mode: "burst", explode: 0.45, trigger: "bar", ret: 0.75, scatter: 0.6, spin: true, rpm: 4, rpmX: 0, rpmZ: 0, angX: 10, angY: 20, angZ: 0, size: 1, count: PARTICLE_DEFAULT_COUNT });

/** Höchstzahl, die je Körper abgetastet wird (die Anzahl zeichnet davon die ersten N). */
export const PARTICLE_MAX = PARTICLE_LIMITS.count[1] * 1000;

const clampN = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Einstellungen aus einer Projektdatei prüfen (kaputte Felder → Vorgabe). */
export function parseParticles(v: unknown): ParticleSettings | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>, d = defaultParticles(), L = PARTICLE_LIMITS;
  const n = (k: ParticleNumKey) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? clampN(o[k] as number, L[k][0], L[k][1]) : d[k]);
  return {
    explode: n("explode"), ret: n("ret"), scatter: n("scatter"), rpm: n("rpm"), rpmX: n("rpmX"), rpmZ: n("rpmZ"),
    angX: n("angX"), angY: n("angY"), angZ: n("angZ"), size: n("size"), count: n("count"),
    trigger: PARTICLE_TRIGGERS.includes(o.trigger as ParticleTrigger) ? o.trigger as ParticleTrigger : d.trigger,
    spin: typeof o.spin === "boolean" ? o.spin : d.spin,
    mode: PARTICLE_MODES.includes(o.mode as ParticleMode) ? o.mode as ParticleMode : d.mode,
    ...(typeof o.solid === "boolean" ? { solid: o.solid } : {}),
  };
}

/** Explosion jetzt: Beats seit dem letzten Auslöser und Weite (Hüllkurve rechnet der Shader). */
export function explodeState(p: ParticleSettings, beat: number): { since: number; amp: number; ret: number; pulseSince: number; pulseAmp: number; hold: number; atk: number } {
  const ex = clampN(p.explode, 0, 1);
  const mode = p.mode ?? "burst";
  if (mode === "still") return { since: 99, amp: 0, ret: 1, pulseSince: 99, pulseAmp: 0, hold: 0, atk: 0 };
  // Zwischen-Puls nur beim Sprengen und beim Jelly (die anderen Körper bleiben bis zum Auslöser ruhig)
  const pulse = mode === "burst" || mode === "jelly";
  if (p.trigger === "hold") return { since: 99, amp: 0, ret: 1, pulseSince: 99, pulseAmp: 0, hold: ex, atk: MODE_ATTACK[mode] };
  // Bass: Weite kommt aus der Hüllkurve (BassEnvelope), nicht aus dem Takt
  if (p.trigger === "bass") return { since: 99, amp: 0, ret: 1, pulseSince: 99, pulseAmp: 0, hold: 0, atk: MODE_ATTACK[mode] };
  const per = TRIGGER_BEATS[p.trigger];
  const since = beat - Math.floor(beat / per) * per;
  // Anstieg und Rückkehr müssen vor dem nächsten Auslöser fertig sein
  const atk = Math.min(MODE_ATTACK[mode], per * 0.45);
  const ret = Math.max(0.1, Math.min(clampN(p.ret, 0.25, 4), per - 0.15 - (mode === "burst" ? 0 : atk)));
  // Zwischen den Explosionen ein leichter Puls auf jedem Beat
  const pb = beat - Math.floor(beat);
  const onHit = per === 1 || since < 1;
  return { since, amp: ex, ret, pulseSince: onHit ? 99 : pb, pulseAmp: onHit || !pulse ? 0 : ex * 0.12, hold: 0, atk };
}

/** Drehwinkel je Achse in Bogenmaß: feste Lage plus Drehtempo (U/min) mal Ebenen-Zeit. */
export function particleAngles(p: ParticleSettings, timeSec: number): { x: number; y: number; z: number } {
  const turn = (rpm: number) => (p.spin ? timeSec * (rpm || 0) / 60 * Math.PI * 2 : 0);
  const rad = (deg: number) => ((deg || 0) * Math.PI) / 180;
  return { x: rad(p.angX) + turn(p.rpmX), y: rad(p.angY) + turn(p.rpm), z: rad(p.angZ) + turn(p.rpmZ) };
}

/** Wie weit der Bass die Partikel auseinandertreibt: unter einer Schwelle nichts, harte Bässe mehr als „Explosion“. */
export function bassTarget(p: ParticleSettings, bass: number): number {
  const x = clampN((bass - 0.12) / 0.7, 0, 1.4);
  return clampN(p.explode, 0, 1) * Math.pow(x, 1.5) * 0.75;
}

/**
 * Hüllkurve für den Bass-Auslöser: schnell hinaus (fast sofort), weich zurück in „Rückkehr“ (Beats).
 * Liefert Weite und Geschwindigkeit (je Beat).
 */
export class BassEnvelope {
  private v = 0;
  private at = -1;
  step(target: number, nowMs: number, retBeats: number, bpm: number): { value: number; vel: number } {
    const beatSec = 60 / Math.max(20, bpm || 120);
    const dt = this.at < 0 ? 0 : Math.min(0.25, Math.max(0, (nowMs - this.at) / 1000));
    this.at = nowMs;
    const old = this.v;
    if (target > this.v) this.v += (target - this.v) * (1 - Math.exp(-dt / 0.025));
    else this.v = target + (this.v - target) * Math.exp(-dt / Math.max(0.05, (clampN(retBeats, 0.25, 4) * beatSec) / 3));
    const vel = dt > 0 ? ((this.v - old) / dt) * beatSec : 0;
    return { value: this.v, vel };
  }
}

// ---- Körper ------------------------------------------------------------------------------
// Dreiecke als Float32Array (9 Werte je Dreieck, gegen den Uhrzeigersinn von außen), optional mit
// Normalen je Ecke (gleiche Anordnung) für runde Körper.
export interface TriMesh { pos: Float32Array; nrm?: Float32Array }

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);

class Builder {
  p: number[] = []; n: number[] = [];
  tri(a: V3, b: V3, c: V3, na?: V3, nb?: V3, nc?: V3): void {
    this.p.push(...a, ...b, ...c);
    if (na && nb && nc) this.n.push(...na, ...nb, ...nc);
    else { const f = cross(sub(b, a), sub(c, a)), l = len(f) || 1; const nf: V3 = [f[0] / l, f[1] / l, f[2] / l]; this.n.push(...nf, ...nf, ...nf); }
  }
  quad(a: V3, b: V3, c: V3, d: V3): void { this.tri(a, b, c); this.tri(a, c, d); }
  mesh(): TriMesh { return { pos: new Float32Array(this.p), nrm: new Float32Array(this.n) }; }
}

/** Rechtecke in der Ebene z (Vorder- bzw. Rückseite) plus Seitenwände entlang des Umrisses. */
function extrude(b: Builder, rects: readonly [number, number, number, number][], outline: readonly [number, number][], d: number): void {
  for (const [x0, y0, x1, y1] of rects) {
    b.quad([x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d]);
    b.quad([x0, y0, -d], [x0, y1, -d], [x1, y1, -d], [x1, y0, -d]);
  }
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]!, [x1, y1] = outline[(i + 1) % outline.length]!;
    b.quad([x0, y0, -d], [x1, y1, -d], [x1, y1, d], [x0, y0, d]);
  }
}

function crossMesh(): TriMesh {
  const b = new Builder(), w = 0.28, top = 1.15, bot = -1.35, arm = 1.25, a0 = 0.08, a1 = 0.62;
  extrude(b, [[-w, bot, w, top], [-arm, a0, -w, a1], [w, a0, arm, a1]],
    [[-w, bot], [w, bot], [w, a0], [arm, a0], [arm, a1], [w, a1], [w, top], [-w, top], [-w, a1], [-arm, a1], [-arm, a0], [-w, a0]], 0.27);
  return b.mesh();
}

function cubeMesh(): TriMesh {
  const b = new Builder(), s = 0.8;
  const v = (x: number, y: number, z: number): V3 => [x * s, y * s, z * s];
  b.quad(v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1));
  b.quad(v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1));
  b.quad(v(1, -1, 1), v(1, -1, -1), v(1, 1, -1), v(1, 1, 1));
  b.quad(v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1));
  b.quad(v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), v(-1, 1, -1));
  b.quad(v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1));
  return b.mesh();
}

/** Fläche aus Parametern (u, v) → Punkt und Normale, als Gitter aus Dreiecken. */
function surface(b: Builder, nu: number, nv: number, f: (u: number, v: number) => { p: V3; n: V3 }): void {
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const A = f(i / nu, j / nv), B = f((i + 1) / nu, j / nv), C = f((i + 1) / nu, (j + 1) / nv), D = f(i / nu, (j + 1) / nv);
    b.tri(A.p, C.p, B.p, A.n, C.n, B.n); b.tri(A.p, D.p, C.p, A.n, D.n, C.n);
  }
}

function sphereMesh(): TriMesh {
  const b = new Builder(), r = 1;
  surface(b, 64, 32, (u, v) => {
    const th = u * Math.PI * 2, ph = v * Math.PI;
    const n: V3 = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
    return { p: [n[0] * r, n[1] * r, n[2] * r], n };
  });
  return b.mesh();
}

function torusMesh(): TriMesh {
  const b = new Builder(), R = 0.9, r = 0.38;
  surface(b, 96, 32, (u, v) => {
    const a = u * Math.PI * 2, c = v * Math.PI * 2;
    const n: V3 = [Math.cos(c) * Math.cos(a), Math.sin(c), Math.cos(c) * Math.sin(a)];
    return { p: [(R + r * Math.cos(c)) * Math.cos(a), r * Math.sin(c), (R + r * Math.cos(c)) * Math.sin(a)], n };
  });
  return b.mesh();
}

/** Fünfzackiger Stern mit Facetten: Umriss in der Ebene, Spitze vorne und hinten in der Mitte. */
function starMesh(): TriMesh {
  const b = new Builder(), ro = 1.25, ri = 0.5, depth = 0.38;
  const pts: V3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  const front: V3 = [0, 0, depth], back: V3 = [0, 0, -depth];
  for (let i = 0; i < 10; i++) {
    const p = pts[i]!, q = pts[(i + 1) % 10]!;
    b.tri(p, q, front); b.tri(q, p, back);
  }
  return b.mesh();
}

const BUILDERS: Record<ParticleObject, () => TriMesh> = { cross: crossMesh, cube: cubeMesh, sphere: sphereMesh, torus: torusMesh, star: starMesh };
export const builtinMesh = (o: ParticleObject): TriMesh => normalizeMesh(BUILDERS[o]());

/** Ziel-Radius aller Körper (Mittelpunkt im Ursprung). */
export const OBJECT_RADIUS = 1.3;

/** Mitte (Hüllquader) in den Ursprung, größter Abstand = OBJECT_RADIUS. */
export function normalizeMesh(m: TriMesh): TriMesh {
  const p = m.pos;
  if (p.length < 9) return m;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { const v = p[i + k]!; if (v < lo[k]!) lo[k] = v; if (v > hi[k]!) hi[k] = v; }
  const c = [0, 1, 2].map(k => (lo[k]! + hi[k]!) / 2);
  let r = 0;
  for (let i = 0; i < p.length; i += 3) r = Math.max(r, Math.hypot(p[i]! - c[0]!, p[i + 1]! - c[1]!, p[i + 2]! - c[2]!));
  const s = r > 0 ? OBJECT_RADIUS / r : 1;
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) out[i + k] = (p[i + k]! - c[k]!) * s;
  return m.nrm ? { pos: out, nrm: m.nrm } : { pos: out };
}

/** Kleiner, fester Zufallsgenerator (gleiche Punkte in allen Fenstern). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Oberfläche in n Punkte zerlegen: Dreiecke nach Fläche gewichtet (geschichtet gezogen, daher gleichmäßig),
 * Normale aus den Ecken interpoliert bzw. aus dem Dreieck. Ergebnis: 6 Werte je Punkt (Position, Normale),
 * in zufälliger Reihenfolge, damit auch die ersten k Punkte die ganze Oberfläche bedecken.
 * Gibt null zurück, wenn die Oberfläche keine Fläche hat.
 */
export function sampleSurface(m: TriMesh, n: number, seed = 7): Float32Array | null {
  return sampleSurfaceColored(m, n, seed)?.pts ?? null;
}

/** Farbe an einer Stelle eines Dreiecks (Schwerpunkt-Koordinaten w, u, v zu den Ecken 0, 1, 2), RGB 0–255. */
export type ColorAt = (tri: number, w: number, u: number, v: number) => readonly [number, number, number];

/** Wie sampleSurface, dazu optional eine Farbe je Punkt (4 Bytes RGBA) aus `colorAt`. */
export function sampleSurfaceColored(m: TriMesh, n: number, seed = 7, colorAt?: ColorAt): { pts: Float32Array; col: Uint8Array | null } | null {
  const p = m.pos, nt = Math.floor(p.length / 9);
  if (nt === 0 || n <= 0) return null;
  const cdf = new Float64Array(nt), fn = new Float32Array(nt * 3);
  // Nach innen gewickelte Netze (Volumen negativ): Flächennormalen umdrehen, damit sie nach außen zeigen
  let vol = 0;
  for (let o = 0; o + 8 < p.length; o += 9) vol += p[o]! * (p[o + 4]! * p[o + 8]! - p[o + 5]! * p[o + 7]!) - p[o + 1]! * (p[o + 3]! * p[o + 8]! - p[o + 5]! * p[o + 6]!) + p[o + 2]! * (p[o + 3]! * p[o + 7]! - p[o + 4]! * p[o + 6]!);
  const flip = vol < 0 ? -1 : 1;
  let tot = 0;
  for (let t = 0; t < nt; t++) {
    const o = t * 9;
    const e1: V3 = [p[o + 3]! - p[o]!, p[o + 4]! - p[o + 1]!, p[o + 5]! - p[o + 2]!];
    const e2: V3 = [p[o + 6]! - p[o]!, p[o + 7]! - p[o + 1]!, p[o + 8]! - p[o + 2]!];
    const c0 = cross(e1, e2), c: V3 = [c0[0] * flip, c0[1] * flip, c0[2] * flip], l = len(c);
    tot += Number.isFinite(l) ? l / 2 : 0;
    cdf[t] = tot;
    if (l > 0) { fn[t * 3] = c[0] / l; fn[t * 3 + 1] = c[1] / l; fn[t * 3 + 2] = c[2] / l; }
  }
  if (!(tot > 0)) return null;
  const R = rng(seed), out = new Float32Array(n * 6), nr = m.nrm && m.nrm.length === p.length ? m.nrm : null;
  const col = colorAt ? new Uint8Array(n * 4) : null;
  let t = 0;
  for (let i = 0; i < n; i++) {
    const x = ((i + R()) / n) * tot;
    while (t < nt - 1 && cdf[t]! < x) t++;
    let u = R(), v = R();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v, o = t * 9, q = i * 6;
    for (let k = 0; k < 3; k++) out[q + k] = w * p[o + k]! + u * p[o + 3 + k]! + v * p[o + 6 + k]!;
    let nx = fn[t * 3]!, ny = fn[t * 3 + 1]!, nz = fn[t * 3 + 2]!;
    if (nr) {
      nx = w * nr[o]! + u * nr[o + 3]! + v * nr[o + 6]!;
      ny = w * nr[o + 1]! + u * nr[o + 4]! + v * nr[o + 7]!;
      nz = w * nr[o + 2]! + u * nr[o + 5]! + v * nr[o + 8]!;
      const l = Math.hypot(nx, ny, nz);
      if (l > 1e-6) { nx /= l; ny /= l; nz /= l; } else { nx = fn[t * 3]!; ny = fn[t * 3 + 1]!; nz = fn[t * 3 + 2]!; }
    }
    out[q + 3] = nx; out[q + 4] = ny; out[q + 5] = nz;
    if (col && colorAt) { const c = colorAt(t, w, u, v); col[i * 4] = c[0]; col[i * 4 + 1] = c[1]; col[i * 4 + 2] = c[2]; col[i * 4 + 3] = 255; }
  }
  // Mischen (Fisher-Yates), damit jede Teilmenge vom Anfang gleichmäßig verteilt ist
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    if (j === i) continue;
    for (let k = 0; k < 6; k++) { const a = out[i * 6 + k]!; out[i * 6 + k] = out[j * 6 + k]!; out[j * 6 + k] = a; }
    if (col) for (let k = 0; k < 4; k++) { const a = col[i * 4 + k]!; col[i * 4 + k] = col[j * 4 + k]!; col[j * 4 + k] = a; }
  }
  return { pts: out, col };
}

/** Zufallswerte je Partikel (4 je Punkt), unabhängig vom Körper: beim Formwechsel bleibt jedes Korn es selbst. */
export function particleRandoms(n: number, seed = 99): Float32Array {
  const R = rng(seed), out = new Float32Array(n * 4);
  for (let i = 0; i < out.length; i++) out[i] = R();
  return out;
}
