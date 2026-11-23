// Eigene 3D-Modelle für das Partikel-Objekt: OBJ (mit MTL-Farben und Texturen) und STL (binär und ASCII)
// lesen, Oberfläche einmal abtasten und als kompakte Punktwolke speichern (eigenes Format „VJPC“).
// Eigener Code, keine Fremdbibliothek. Die Ausgabefenster laden nur noch die fertige Punktwolke.
import { PARTICLE_MAX, normalizeMesh, sampleSurfaceColored, type TriMesh } from "./particles";
import { buildRenderMesh, decodeRenderMesh, encodeRenderMesh, meshBytes, RENDER_MAX_TEX, type RenderMesh } from "./rendermesh";

export const MODEL_EXTS = ["obj", "stl"] as const;
/** Größte Modelldatei (Text-OBJ werden schnell groß). */
export const MODEL_MAX_BYTES = 80 * 1024 * 1024;
/** Mehr Dreiecke lesen wir nicht (Speicher und Ladezeit). */
export const MODEL_MAX_TRIS = 3_000_000;

export interface ObjMaterial { name: string; kd: [number, number, number] | null; mapKd: string | null }

/** Gelesenes Modell: Dreiecke plus je Ecke UV, Farbe (falls vorhanden) und Material je Dreieck. */
export interface ParsedMesh {
  pos: Float32Array;
  nrm?: Float32Array;
  /** 6 Werte je Dreieck (u, v je Ecke) oder fehlt. */
  uv?: Float32Array;
  /** Eckfarben 0–1 (9 Werte je Dreieck), z. B. „v x y z r g b“. */
  col?: Float32Array;
  /** Material-Nummer je Dreieck (Index in `materials`, -1 = keins). */
  mat?: Int32Array;
  materials: string[];
  mtllib: string[];
}

export class MeshError extends Error {}

/** OBJ-Text lesen. Vielecke werden als Fächer zerlegt, negative Indizes gelten relativ zum Ende. */
export function parseObj(text: string): ParsedMesh {
  const vs: number[] = [], vt: number[] = [], vn: number[] = [], vc: number[] = [];
  let hasVc = false;
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [], col: number[] = [], mat: number[] = [];
  let anyUv = false, allN = true;
  const materials: string[] = [], mtllib: string[] = [];
  let cur = -1;
  const lines = text.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li]!;
    // Fortsetzungszeilen („\“ am Ende)
    while (line.endsWith("\\") && li + 1 < lines.length) line = line.slice(0, -1) + " " + lines[++li]!;
    const s = line.trim();
    if (!s || s[0] === "#") continue;
    const sp = s.indexOf(" ");
    const kw = sp < 0 ? s : s.slice(0, sp), rest = sp < 0 ? "" : s.slice(sp + 1).trim();
    if (kw === "v") {
      const a = rest.split(/\s+/).map(Number);
      vs.push(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
      if (a.length >= 6 && a.slice(3, 6).every(Number.isFinite)) { vc.push(a[3]!, a[4]!, a[5]!); hasVc = true; } else vc.push(1, 1, 1);
    } else if (kw === "vt") {
      const a = rest.split(/\s+/).map(Number); vt.push(a[0] ?? 0, a[1] ?? 0);
    } else if (kw === "vn") {
      const a = rest.split(/\s+/).map(Number); vn.push(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
    } else if (kw === "usemtl") {
      cur = materials.indexOf(rest);
      if (cur < 0) { cur = materials.length; materials.push(rest); }
    } else if (kw === "mtllib") {
      if (rest) mtllib.push(rest);
    } else if (kw === "f") {
      const nV = vs.length / 3, nT = vt.length / 2, nN = vn.length / 3;
      const idx = rest.split(/\s+/).map(tok => {
        const [a, b, c] = tok.split("/");
        const res = (x: string | undefined, n: number) => {
          if (!x) return -1;
          const k = parseInt(x, 10);
          if (!Number.isFinite(k) || k === 0) return -1;
          const r = k > 0 ? k - 1 : n + k;
          return r >= 0 && r < n ? r : -1;
        };
        return [res(a, nV), res(b, nT), res(c, nN)] as const;
      });
      if (idx.length < 3 || idx.some(i => i[0] < 0)) continue;
      for (let k = 1; k + 1 < idx.length; k++) {
        if (mat.length >= MODEL_MAX_TRIS) throw new MeshError("Das Modell hat zu viele Dreiecke (höchstens 3 Mio.).");
        for (const c of [idx[0]!, idx[k]!, idx[k + 1]!]) {
          pos.push(vs[c[0] * 3]!, vs[c[0] * 3 + 1]!, vs[c[0] * 3 + 2]!);
          col.push(vc[c[0] * 3]!, vc[c[0] * 3 + 1]!, vc[c[0] * 3 + 2]!);
          if (c[1] >= 0) { uv.push(vt[c[1] * 2]!, vt[c[1] * 2 + 1]!); anyUv = true; } else uv.push(0, 0);
          if (c[2] >= 0) nrm.push(vn[c[2] * 3]!, vn[c[2] * 3 + 1]!, vn[c[2] * 3 + 2]!); else { nrm.push(0, 0, 0); allN = false; }
        }
        mat.push(cur);
      }
    }
  }
  if (!mat.length) throw new MeshError("Keine Flächen im Modell gefunden.");
  if (!pos.every(Number.isFinite)) throw new MeshError("Das Modell enthält ungültige Zahlen.");
  return {
    pos: new Float32Array(pos),
    ...(allN ? { nrm: new Float32Array(nrm) } : {}),
    ...(anyUv ? { uv: new Float32Array(uv) } : {}),
    ...(hasVc ? { col: new Float32Array(col) } : {}),
    ...(materials.length ? { mat: new Int32Array(mat) } : {}),
    materials, mtllib,
  };
}

/** MTL-Text lesen: Grundfarbe (Kd) und Farbtextur (map_Kd) je Material. */
export function parseMtl(text: string): ObjMaterial[] {
  const out: ObjMaterial[] = [];
  let m: ObjMaterial | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const s = raw.trim();
    if (!s || s[0] === "#") continue;
    const sp = s.indexOf(" ");
    const kw = sp < 0 ? s : s.slice(0, sp), rest = sp < 0 ? "" : s.slice(sp + 1).trim();
    if (kw === "newmtl") { m = { name: rest, kd: null, mapKd: null }; out.push(m); }
    else if (!m) continue;
    else if (kw === "Kd") { const a = rest.split(/\s+/).map(Number); if (a.length >= 3 && a.slice(0, 3).every(Number.isFinite)) m.kd = [a[0]!, a[1]!, a[2]!]; }
    else if (kw === "map_Kd") {
      // Optionen wie „-s 1 1 1“ oder „-bm 0.5“ überspringen; der Dateiname ist der Rest (darf Leerzeichen haben)
      const tok = rest.split(/\s+/);
      let i = 0;
      const argc: Record<string, number> = { "-blendu": 1, "-blendv": 1, "-bm": 1, "-boost": 1, "-cc": 1, "-clamp": 1, "-imfchan": 1, "-mm": 2, "-o": 3, "-s": 3, "-t": 3, "-texres": 1 };
      while (i < tok.length && tok[i]!.startsWith("-") && argc[tok[i]!] !== undefined) i += 1 + argc[tok[i]!]!;
      const f = tok.slice(i).join(" ");
      if (f) m.mapKd = f;
    }
  }
  return out;
}

/** STL lesen (binär oder ASCII). Normalen kommen aus den Dreiecken (die Angaben in STL sind oft falsch). */
export function parseStl(buf: Uint8Array): ParsedMesh {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const binN = buf.byteLength >= 84 ? dv.getUint32(80, true) : -1;
  const isBinary = binN >= 0 && 84 + binN * 50 === buf.byteLength;
  if (isBinary) {
    if (binN > MODEL_MAX_TRIS) throw new MeshError("Das Modell hat zu viele Dreiecke (höchstens 3 Mio.).");
    const pos = new Float32Array(binN * 9);
    for (let i = 0; i < binN; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) pos[i * 9 + k] = dv.getFloat32(o + k * 4, true);
    }
    if (!binN) throw new MeshError("Keine Flächen im Modell gefunden.");
    if (!pos.every(Number.isFinite)) throw new MeshError("Das Modell enthält ungültige Zahlen.");
    return { pos, materials: [], mtllib: [] };
  }
  const text = new TextDecoder().decode(buf);
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
  const v: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) {
    v.push(Number(m[1]), Number(m[2]), Number(m[3]));
    if (v.length / 9 > MODEL_MAX_TRIS) throw new MeshError("Das Modell hat zu viele Dreiecke (höchstens 3 Mio.).");
  }
  const n = Math.floor(v.length / 9);
  if (!n) throw new MeshError("Keine Flächen im Modell gefunden (weder binäres noch Text-STL).");
  const pos = new Float32Array(v.slice(0, n * 9));
  if (!pos.every(Number.isFinite)) throw new MeshError("Das Modell enthält ungültige Zahlen.");
  return { pos, materials: [], mtllib: [] };
}

/** Bild als RGBA-Pixel (z. B. aus nativeImage, umgerechnet). */
export interface Rgba { w: number; h: number; data: Uint8Array }

const to255 = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255)));

/**
 * Farbquelle für die Abtastung: Textur (map_Kd) an der UV-Stelle, sonst Kd des Materials, sonst Eckfarben.
 * Gibt undefined zurück, wenn das Modell keine Farben hat (dann färben die Slots der Ebene).
 */
export function colorSource(m: ParsedMesh, mats: readonly ObjMaterial[], textures: ReadonlyMap<string, Rgba>): ((tri: number, w: number, u: number, v: number) => [number, number, number]) | undefined {
  const byName = new Map(mats.map(x => [x.name, x]));
  const per = m.materials.map(n => byName.get(n));
  const hasMat = !!m.mat && per.some(x => x && (x.kd || (x.mapKd && textures.has(x.mapKd))));
  if (!hasMat && !m.col) return undefined;
  return (t, w, u, v) => {
    const mi = m.mat ? m.mat[t]! : -1;
    const mt = mi >= 0 ? per[mi] : undefined;
    const tex = mt?.mapKd ? textures.get(mt.mapKd) : undefined;
    if (tex && m.uv) {
      const o = t * 6;
      let s = w * m.uv[o]! + u * m.uv[o + 2]! + v * m.uv[o + 4]!;
      let r = w * m.uv[o + 1]! + u * m.uv[o + 3]! + v * m.uv[o + 5]!;
      s -= Math.floor(s); r -= Math.floor(r);
      const x = Math.min(tex.w - 1, Math.floor(s * tex.w)), y = Math.min(tex.h - 1, Math.floor((1 - r) * tex.h));
      const p = (y * tex.w + x) * 4;
      return [tex.data[p]!, tex.data[p + 1]!, tex.data[p + 2]!];
    }
    if (mt?.kd) return [to255(mt.kd[0]), to255(mt.kd[1]), to255(mt.kd[2])];
    if (m.col) {
      const o = t * 9;
      return [0, 1, 2].map(k => to255(w * m.col![o + k]! + u * m.col![o + 3 + k]! + v * m.col![o + 6 + k]!)) as [number, number, number];
    }
    return [200, 200, 200];
  };
}

// ---- Punktwolke „VJPC“ -----------------------------------------------------------------------
// Kopf (16 Bytes): „VJPC“, Version, Anzahl, Merkmale (Bit 0 = Farben). Dann Float32 Position+Normale
// (6 je Punkt), dann bei Farben 4 Bytes RGBA je Punkt. Version 2: danach der Körper als Dreiecksnetz
// (Block „VJMS“, siehe rendermesh.ts). Version 1 (ohne Netz) bleibt lesbar.
const MAGIC = 0x4350_4a56; // „VJPC“ little endian

export interface PointCloud { n: number; pts: Float32Array; col: Uint8Array | null; mesh?: RenderMesh | null }

export function encodePointCloud(pc: PointCloud): Uint8Array {
  const base = 16 + pc.n * 24 + (pc.col ? pc.n * 4 : 0);
  const bytes = base + (pc.mesh ? meshBytes(pc.mesh) : 0);
  const out = new Uint8Array(bytes), dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, pc.mesh ? 2 : 1, true); dv.setUint32(8, pc.n, true); dv.setUint32(12, pc.col ? 1 : 0, true);
  out.set(new Uint8Array(pc.pts.buffer, pc.pts.byteOffset, pc.n * 24), 16);
  if (pc.col) out.set(pc.col.subarray(0, pc.n * 4), 16 + pc.n * 24);
  if (pc.mesh) encodeRenderMesh(pc.mesh, out, base);
  return out;
}

export function decodePointCloud(buf: ArrayBuffer): PointCloud | null {
  if (buf.byteLength < 16) return null;
  const dv = new DataView(buf);
  const ver = dv.getUint32(4, true);
  if (dv.getUint32(0, true) !== MAGIC || (ver !== 1 && ver !== 2)) return null;
  const n = dv.getUint32(8, true), hasCol = (dv.getUint32(12, true) & 1) === 1;
  const base = 16 + n * 24 + (hasCol ? n * 4 : 0);
  if (n === 0 || n > PARTICLE_MAX || (ver === 1 ? buf.byteLength !== base : buf.byteLength <= base)) return null;
  const pts = new Float32Array(buf, 16, n * 6);
  if (!pts.every(Number.isFinite)) return null;
  const mesh = ver === 2 ? decodeRenderMesh(buf, base) : null;
  if (ver === 2 && !mesh) return null;
  return { n, pts, col: hasCol ? new Uint8Array(buf, 16 + n * 24, n * 4) : null, mesh };
}

/**
 * Modell in eine Punktwolke umwandeln: Größe normieren, PARTICLE_MAX Punkte abtasten, Farben übernehmen.
 * `textures`: Bilder der map_Kd-Einträge (Schlüssel = Eintrag in der MTL).
 */
export function meshToPointCloud(m: ParsedMesh, mats: readonly ObjMaterial[] = [], textures: ReadonlyMap<string, Rgba> = new Map(), n = PARTICLE_MAX): PointCloud {
  const base: TriMesh = m.nrm ? { pos: m.pos, nrm: m.nrm } : { pos: m.pos };
  const norm = normalizeMesh(base);
  const src = colorSource(m, mats, textures);
  const s = sampleSurfaceColored(norm, n, 7, src);
  if (!s) throw new MeshError("Das Modell hat keine Oberfläche (alle Flächen sind leer).");
  return { n, pts: s.pts, col: s.col, mesh: modelRenderMesh(m, norm, mats, textures, src) };
}

/**
 * Der Körper als Dreiecksnetz: gleiche Normierung wie die Punktwolke; Farben je Ecke aus Material oder
 * Eckfarben, Texturen (bis zu RENDER_MAX_TEX) bleiben echte Texturen mit UV.
 */
export function modelRenderMesh(m: ParsedMesh, norm: TriMesh, mats: readonly ObjMaterial[], textures: ReadonlyMap<string, Rgba>,
  src = colorSource(m, mats, textures)): RenderMesh | null {
  const nt = norm.pos.length / 9;
  const byName = new Map(mats.map(x => [x.name, x]));
  const texNames: string[] = [];
  const layer = src ? new Uint8Array(nt).fill(255) : undefined;
  const rgb = src ? new Uint8Array(nt * 9) : undefined;
  for (let t = 0; t < nt && src; t++) {
    const mi = m.mat ? m.mat[t]! : -1;
    const mt = mi >= 0 ? byName.get(m.materials[mi]!) : undefined;
    const tn = mt?.mapKd && textures.has(mt.mapKd) && m.uv ? mt.mapKd : null;
    let li = tn ? texNames.indexOf(tn) : -1;
    if (tn && li < 0 && texNames.length < RENDER_MAX_TEX) { texNames.push(tn); li = texNames.length - 1; }
    if (li >= 0) { layer![t] = li; rgb!.fill(255, t * 9, t * 9 + 9); continue; }
    // ohne Textur (oder mehr Texturen als erlaubt): Farbe an jeder Ecke
    const corner = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const;
    corner.forEach(([w, u, v], c) => { const col = src(t, w, u, v); rgb![t * 9 + c * 3] = col[0]; rgb![t * 9 + c * 3 + 1] = col[1]; rgb![t * 9 + c * 3 + 2] = col[2]; });
  }
  return buildRenderMesh({
    pos: norm.pos, ...(norm.nrm ? { nrm: norm.nrm } : {}), ...(m.uv ? { uv: m.uv } : {}),
    ...(rgb ? { rgb } : {}), ...(layer ? { layer } : {}),
    ...(texNames.length ? { textures: texNames.map(nm => textures.get(nm)!) } : {}),
  });
}

/** Eintrag der Modell-Bibliothek (im Projekt gespeichert; die Punktwolke liegt im Ordner „models“). */
export interface ModelItem { id: string; name: string; colors: boolean }
