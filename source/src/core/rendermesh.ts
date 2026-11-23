// Echter Körper für das Partikel-Objekt: das Modell selbst als Dreiecksnetz (nicht als Punktwolke), mit
// verschweißten Ecken, glatten Normalen (harte Kanten ab 45° bleiben hart), Farben und bis zu 4 Farbtexturen.
// Zu große Modelle werden per Gitter-Clustering vereinfacht. Eigener Code, keine Fremdbibliothek.

/** Mehr Dreiecke zeichnen wir nicht (Speicher je Ausgabefenster); größere Modelle werden vereinfacht. */
export const RENDER_MAX_TRIS = 400_000;
/**
 * Grobe Netze werden unterteilt, bis keine Kante länger als TESS_EDGE ist (Körper auf Radius 1), höchstens bis
 * TESS_MAX_TRIS: Schmelzen, Jelly und Verdrehen verformen die Ecken, und nur feine Netze verformen sich weich.
 */
export const TESS_EDGE = 0.05;
export const TESS_MAX_TRIS = 250_000;
/** Zellen je Einheit beim Zersplittern (Stückgröße etwa 0,45 des Körperradius). */
export const CELL = 2.2;
/** Höchstens so viele Farbtexturen je Modell, je Kantenlänge höchstens TEX_SIZE_MAX. */
export const RENDER_MAX_TEX = 4;
export const TEX_SIZE_MAX = 1024;
/** Ecken mit Flächen, die weniger als diesen Winkel auseinanderliegen, werden glatt schattiert. */
const CREASE_COS = Math.cos(45 * Math.PI / 180);

export interface RenderMesh {
  nv: number;
  /** Position und Normale je Ecke (3 Werte). */
  pos: Float32Array;
  nrm: Float32Array;
  /** RGBA je Ecke: Farbe, A = Textur-Ebene (255 = keine). null = keine Farben (die Slots der Ebene färben). */
  col: Uint8Array | null;
  /** UV je Ecke (2 Werte) oder null. */
  uv: Float32Array | null;
  /** Stück je Ecke beim Zersplittern (Zelle der Dreiecksmitte, 4 Werte Int8: x, y, z, 0). */
  cell: Int8Array;
  idx: Uint32Array;
  /** Texturen, alle texSize × texSize RGBA. */
  texSize: number;
  tex: Uint8Array[];
}

/** Eingabe: Dreiecke (bereits normiert wie die Punktwolke), optional je Ecke Normale, UV, Farbe 0–255, Textur-Ebene. */
export interface MeshInput {
  pos: Float32Array;
  nrm?: Float32Array;
  uv?: Float32Array;
  /** RGB 0–255 je Ecke (3 Werte). */
  rgb?: Uint8Array;
  /** Textur-Ebene je Dreieck (255 = keine). */
  layer?: Uint8Array;
  /** Texturen in beliebiger Größe (RGBA), Index = Ebene. */
  textures?: { w: number; h: number; data: Uint8Array }[];
}

type V3 = [number, number, number];

/** Zu viele Dreiecke: Ecken auf ein Gitter einrasten (Mittelwert je Zelle), entartete Dreiecke fallen weg. */
function simplify(inp: MeshInput, maxTris: number): MeshInput {
  const nt = inp.pos.length / 9;
  if (nt <= maxTris) return inp;
  // Zellgröße so, dass etwa maxTris übrig bleiben (Fläche ~ Zellen²): Startwert schätzen, dann nachregeln
  let res = Math.max(8, Math.round(Math.sqrt(maxTris / 2)));
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = clusterOnce(inp, res);
    if (out.pos.length / 9 <= maxTris || res <= 8) return out;
    res = Math.max(8, Math.floor(res * Math.sqrt(maxTris / (out.pos.length / 9)) * 0.95));
  }
  return clusterOnce(inp, 8);
}

function clusterOnce(inp: MeshInput, res: number): MeshInput {
  const p = inp.pos, nt = p.length / 9;
  // Körper ist auf Radius ~1 normiert: Gitter über [-1.05, 1.05]
  const cell = 2.1 / res, key = (x: number, y: number, z: number) =>
    (Math.floor((x + 1.05) / cell) * (res + 1) + Math.floor((y + 1.05) / cell)) * (res + 1) + Math.floor((z + 1.05) / cell);
  const sum = new Map<number, [number, number, number, number]>();
  const ck = new Float64Array(nt * 3);
  for (let i = 0; i < nt * 3; i++) {
    const k = key(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!); ck[i] = k;
    const s = sum.get(k); if (s) { s[0] += p[i * 3]!; s[1] += p[i * 3 + 1]!; s[2] += p[i * 3 + 2]!; s[3]++; } else sum.set(k, [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!, 1]);
  }
  const keep: number[] = [];
  for (let t = 0; t < nt; t++) { const a = ck[t * 3]!, b = ck[t * 3 + 1]!, c = ck[t * 3 + 2]!; if (a !== b && b !== c && a !== c) keep.push(t); }
  const pos = new Float32Array(keep.length * 9);
  const nrm = inp.nrm ? new Float32Array(keep.length * 9) : undefined;
  const uv = inp.uv ? new Float32Array(keep.length * 6) : undefined;
  const rgb = inp.rgb ? new Uint8Array(keep.length * 9) : undefined;
  const layer = inp.layer ? new Uint8Array(keep.length) : undefined;
  keep.forEach((t, j) => {
    for (let c = 0; c < 3; c++) {
      const s = sum.get(ck[t * 3 + c]!)!;
      pos[j * 9 + c * 3] = s[0] / s[3]; pos[j * 9 + c * 3 + 1] = s[1] / s[3]; pos[j * 9 + c * 3 + 2] = s[2] / s[3];
    }
    if (nrm) nrm.set(inp.nrm!.subarray(t * 9, t * 9 + 9), j * 9);
    if (uv) uv.set(inp.uv!.subarray(t * 6, t * 6 + 6), j * 6);
    if (rgb) rgb.set(inp.rgb!.subarray(t * 9, t * 9 + 9), j * 9);
    if (layer) layer[j] = inp.layer![t]!;
  });
  return { pos, ...(nrm ? { nrm } : {}), ...(uv ? { uv } : {}), ...(rgb ? { rgb } : {}), ...(layer ? { layer } : {}), ...(inp.textures ? { textures: inp.textures } : {}) };
}

/** Vorzeichenbehaftetes Volumen (×6) eines Dreiecksnetzes: positiv, wenn die Flächen nach außen zeigen. */
export function signedVolume(p: Float32Array): number {
  let v = 0;
  for (let o = 0; o + 8 < p.length; o += 9) {
    const ax = p[o]!, ay = p[o + 1]!, az = p[o + 2]!, bx = p[o + 3]!, by = p[o + 4]!, bz = p[o + 5]!, cx = p[o + 6]!, cy = p[o + 7]!, cz = p[o + 8]!;
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v;
}

/**
 * Wicklung je Dreieck (+1 / -1), sodass Nachbarn über gemeinsame Kanten gleich herum laufen und jedes
 * zusammenhängende Teil nach außen zeigt (Volumen des Teils positiv). Kanten mit mehr als zwei Flächen
 * werden übersprungen.
 */
export function orientFaces(p: Float32Array, wid: Int32Array, nt: number): Int8Array {
  const edges = new Map<string, number[]>();
  for (let t = 0; t < nt; t++) for (let c = 0; c < 3; c++) {
    const a = wid[t * 3 + c]!, b = wid[t * 3 + (c + 1) % 3]!;
    if (a === b) continue;
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    let l = edges.get(k); if (!l) { l = []; edges.set(k, l); } l.push(t);
  }
  // Richtung einer Kante in einem Dreieck: +1 wenn a→b in Wicklungsrichtung (a = kleinere Kennung)
  const dirIn = (t: number, a: number, b: number): number => {
    for (let c = 0; c < 3; c++) { const x = wid[t * 3 + c]!, y = wid[t * 3 + (c + 1) % 3]!; if (x === a && y === b) return 1; if (x === b && y === a) return -1; }
    return 0;
  };
  const f = new Int8Array(nt), seen = new Uint8Array(nt), queue = new Int32Array(nt);
  for (let s = 0; s < nt; s++) {
    if (seen[s]) continue;
    let qh = 0, qt = 0; queue[qt++] = s; seen[s] = 1; f[s] = 1;
    const part: number[] = [];
    while (qh < qt) {
      const t = queue[qh++]!; part.push(t);
      for (let c = 0; c < 3; c++) {
        const a0 = wid[t * 3 + c]!, b0 = wid[t * 3 + (c + 1) % 3]!;
        if (a0 === b0) continue;
        const a = Math.min(a0, b0), b = Math.max(a0, b0);
        const l = edges.get(`${a},${b}`)!;
        if (l.length !== 2) continue;
        const u = l[0] === t ? l[1]! : l[0]!;
        if (seen[u]) continue;
        // gleich herum heißt: die gemeinsame Kante läuft im Nachbarn andersherum
        f[u] = (-dirIn(t, a, b) * f[t]! * dirIn(u, a, b) > 0 ? 1 : -1) as 1 | -1;
        seen[u] = 1; queue[qt++] = u;
      }
    }
    // Volumen des Teils mit der gefundenen Wicklung: negativ = nach innen, alle umdrehen
    let vol = 0;
    for (const t of part) {
      const o = t * 9;
      const v = p[o]! * (p[o + 4]! * p[o + 8]! - p[o + 5]! * p[o + 7]!) - p[o + 1]! * (p[o + 3]! * p[o + 8]! - p[o + 5]! * p[o + 6]!) + p[o + 2]! * (p[o + 3]! * p[o + 7]! - p[o + 4]! * p[o + 6]!);
      vol += v * f[t]!;
    }
    if (vol < 0) for (const t of part) f[t] = -f[t]! as 1 | -1;
  }
  return f;
}

/** Textur auf texSize × texSize bringen (bilinear). */
function resample(t: { w: number; h: number; data: Uint8Array }, S: number): Uint8Array {
  const out = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = (x + 0.5) / S * t.w - 0.5, fy = (y + 0.5) / S * t.h - 0.5;
    const x0 = Math.max(0, Math.min(t.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(t.h - 1, Math.floor(fy)));
    const x1 = Math.min(t.w - 1, x0 + 1), y1 = Math.min(t.h - 1, y0 + 1);
    const ax = Math.max(0, Math.min(1, fx - x0)), ay = Math.max(0, Math.min(1, fy - y0));
    for (let k = 0; k < 4; k++) {
      const a = t.data[(y0 * t.w + x0) * 4 + k]!, b = t.data[(y0 * t.w + x1) * 4 + k]!;
      const c = t.data[(y1 * t.w + x0) * 4 + k]!, d = t.data[(y1 * t.w + x1) * 4 + k]!;
      out[(y * S + x) * 4 + k] = Math.round((a * (1 - ax) + b * ax) * (1 - ay) + (c * (1 - ax) + d * ax) * ay);
    }
  }
  return out;
}

/**
 * Lange Kanten halbieren (mehrere Durchgänge): Eine Kante wird geteilt, wenn sie länger als `edge` ist; jedes
 * Dreieck zerfällt je nach Zahl geteilter Kanten in 2, 3 oder 4. Geteilt wird je Kante an derselben Stelle,
 * also ohne Risse. Ecken-Werte (Normale, UV, Farbe) werden je Dreieck mitgeteilt.
 */
export function tessellate(inp: MeshInput, edge = TESS_EDGE, maxTris = TESS_MAX_TRIS): MeshInput {
  let cur = inp;
  for (let pass = 0; pass < 8; pass++) {
    const p = cur.pos, nt = p.length / 9;
    const q = (v: number) => Math.round(v * 1e5);
    const vkey = (i: number) => `${q(p[i * 3]!)},${q(p[i * 3 + 1]!)},${q(p[i * 3 + 2]!)}`;
    const long = new Set<string>();
    let splits = 0;
    const ek = (i: number, j: number) => { const a = vkey(i), b = vkey(j); return a < b ? `${a}|${b}` : `${b}|${a}`; };
    for (let t = 0; t < nt; t++) for (let c = 0; c < 3; c++) {
      const i = t * 3 + c, j = t * 3 + (c + 1) % 3;
      const d = Math.hypot(p[i * 3]! - p[j * 3]!, p[i * 3 + 1]! - p[j * 3 + 1]!, p[i * 3 + 2]! - p[j * 3 + 2]!);
      if (d > edge) long.add(ek(i, j));
    }
    if (!long.size) break;
    // Schätzung der neuen Dreiecke; zu viele: nicht weiter teilen
    for (let t = 0; t < nt; t++) { let k = 0; for (let c = 0; c < 3; c++) if (long.has(ek(t * 3 + c, t * 3 + (c + 1) % 3))) k++; splits += k; }
    if (nt + splits > maxTris) break;
    const P: number[] = [], N: number[] = [], U: number[] = [], C: number[] = [], L: number[] = [];
    const hasN = !!cur.nrm, hasU = !!cur.uv, hasC = !!cur.rgb, hasL = !!cur.layer;
    // Ecke als Werte-Satz: [x,y,z, nx,ny,nz, u,v, r,g,b]
    const corner = (i: number): number[] => [
      p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!,
      hasN ? cur.nrm![i * 3]! : 0, hasN ? cur.nrm![i * 3 + 1]! : 0, hasN ? cur.nrm![i * 3 + 2]! : 0,
      hasU ? cur.uv![i * 2]! : 0, hasU ? cur.uv![i * 2 + 1]! : 0,
      hasC ? cur.rgb![i * 3]! : 0, hasC ? cur.rgb![i * 3 + 1]! : 0, hasC ? cur.rgb![i * 3 + 2]! : 0,
    ];
    const mid = (a: number[], b: number[]) => a.map((v, k) => (v + b[k]!) / 2);
    const emit = (a: number[], b: number[], c: number[], layer: number) => {
      for (const v of [a, b, c]) {
        P.push(v[0]!, v[1]!, v[2]!);
        if (hasN) { const l = Math.hypot(v[3]!, v[4]!, v[5]!) || 1; N.push(v[3]! / l, v[4]! / l, v[5]! / l); }
        if (hasU) U.push(v[6]!, v[7]!);
        if (hasC) C.push(Math.round(v[8]!), Math.round(v[9]!), Math.round(v[10]!));
      }
      if (hasL) L.push(layer);
    };
    for (let t = 0; t < nt; t++) {
      const v = [corner(t * 3), corner(t * 3 + 1), corner(t * 3 + 2)];
      const ly = hasL ? cur.layer![t]! : 255;
      const s = [0, 1, 2].map(c => long.has(ek(t * 3 + c, t * 3 + (c + 1) % 3)));
      const m = [0, 1, 2].map(c => (s[c] ? mid(v[c]!, v[(c + 1) % 3]!) : null));
      const k = s.filter(Boolean).length;
      if (k === 0) emit(v[0]!, v[1]!, v[2]!, ly);
      else if (k === 3) {
        emit(v[0]!, m[0]!, m[2]!, ly); emit(m[0]!, v[1]!, m[1]!, ly); emit(m[2]!, m[1]!, v[2]!, ly); emit(m[0]!, m[1]!, m[2]!, ly);
      } else if (k === 1) {
        const c = s.indexOf(true), a = v[c]!, b = v[(c + 1) % 3]!, o = v[(c + 2) % 3]!, mm = m[c]!;
        emit(a, mm, o, ly); emit(mm, b, o, ly);
      } else {
        // zwei geteilte Kanten: die ungeteilte ist c0; Ecke gegenüber teilt den Rest in drei Dreiecke
        const c0 = s.indexOf(false), a = v[c0]!, b = v[(c0 + 1) % 3]!, o = v[(c0 + 2) % 3]!;
        const mb = m[(c0 + 1) % 3]!, ma = m[(c0 + 2) % 3]!;
        emit(a, b, mb, ly); emit(a, mb, ma, ly); emit(ma, mb, o, ly);
      }
    }
    cur = {
      pos: new Float32Array(P), ...(hasN ? { nrm: new Float32Array(N) } : {}), ...(hasU ? { uv: new Float32Array(U) } : {}),
      ...(hasC ? { rgb: new Uint8Array(C) } : {}), ...(hasL ? { layer: new Uint8Array(L) } : {}),
      ...(cur.textures ? { textures: cur.textures } : {}),
    };
  }
  return cur;
}

/** Dreiecke in ein Render-Mesh umwandeln (verschweißen, Normalen glätten, Ecken mit gleichen Werten teilen). */
export function buildRenderMesh(input: MeshInput, maxTris = RENDER_MAX_TRIS): RenderMesh | null {
  const simple = simplify(input, maxTris);
  const inp = simple.pos.length / 9 < Math.min(TESS_MAX_TRIS, maxTris) ? tessellate(simple, TESS_EDGE, Math.min(TESS_MAX_TRIS, maxTris)) : simple;
  const p = inp.pos, nt = p.length / 9;
  if (!nt) return null;
  // Ecken an gleicher Stelle verschweißen
  const q = (v: number) => Math.round(v * 1e5);
  const weld = new Map<string, number[]>();
  const wid = new Int32Array(nt * 3);
  for (let i = 0; i < nt * 3; i++) {
    const k = `${q(p[i * 3]!)},${q(p[i * 3 + 1]!)},${q(p[i * 3 + 2]!)}`;
    let g = weld.get(k); if (!g) { g = []; weld.set(k, g); }
    g.push(i);
  }
  let gi = 0; for (const g of weld.values()) { for (const i of g) wid[i] = gi; gi++; }
  // Wicklung einheitlich machen: Nachbarn über gemeinsame Kanten gleich herum drehen (Breitensuche je Teil),
  // dann zeigt das Volumen jedes Teils, ob es nach innen gewickelt ist
  const flipT = orientFaces(p, wid, nt);
  // Flächennormalen (nach Fläche gewichtet)
  const fn = new Float32Array(nt * 3), fu = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const o = t * 9, f = flipT[t]!;
    const e1: V3 = [p[o + 3]! - p[o]!, p[o + 4]! - p[o + 1]!, p[o + 5]! - p[o + 2]!];
    const e2: V3 = [p[o + 6]! - p[o]!, p[o + 7]! - p[o + 1]!, p[o + 8]! - p[o + 2]!];
    const c: V3 = [f * (e1[1] * e2[2] - e1[2] * e2[1]), f * (e1[2] * e2[0] - e1[0] * e2[2]), f * (e1[0] * e2[1] - e1[1] * e2[0])];
    const l = Math.hypot(c[0], c[1], c[2]);
    fn.set(c, t * 3);
    if (l > 0) { fu[t * 3] = c[0] / l; fu[t * 3 + 1] = c[1] / l; fu[t * 3 + 2] = c[2] / l; }
  }
  // Normale je Ecke: vorgegebene des Modells, sonst Mittel der Nachbarflächen mit kleinem Knickwinkel
  const cn = new Float32Array(nt * 9);
  const given = inp.nrm && inp.nrm.length === p.length && inp.nrm.some(v => v !== 0) ? inp.nrm : null;
  for (const g of weld.values()) for (const i of g) {
    const t = Math.floor(i / 3);
    let x = 0, y = 0, z = 0;
    if (given) { x = given[i * 3]!; y = given[i * 3 + 1]!; z = given[i * 3 + 2]!; }
    if (!given || x * x + y * y + z * z < 1e-12) {
      x = y = z = 0;
      for (const j of g) {
        const s = Math.floor(j / 3);
        if (fu[s * 3]! * fu[t * 3]! + fu[s * 3 + 1]! * fu[t * 3 + 1]! + fu[s * 3 + 2]! * fu[t * 3 + 2]! >= CREASE_COS) { x += fn[s * 3]!; y += fn[s * 3 + 1]!; z += fn[s * 3 + 2]!; }
      }
    }
    const l = Math.hypot(x, y, z) || 1;
    cn[i * 3] = x / l; cn[i * 3 + 1] = y / l; cn[i * 3 + 2] = z / l;
  }
  // Ecken mit gleicher Stelle, Normale, UV, Farbe und Ebene teilen sich einen Eintrag
  const hasCol = !!inp.rgb || !!inp.layer;
  const hasUv = !!inp.uv && !!inp.layer && inp.layer.some(l => l !== 255);
  const vmap = new Map<string, number>();
  const P: number[] = [], N: number[] = [], C: number[] = [], U: number[] = [], Z: number[] = [];
  const idxL: number[] = [];
  for (let i = 0; i < nt * 3; i++) {
    const t = Math.floor(i / 3);
    // Dreiecke ohne Fläche (z. B. an den Polen einer Kugel) weglassen: sie sind unsichtbar und stören die Normalen
    if (fu[t * 3] === 0 && fu[t * 3 + 1] === 0 && fu[t * 3 + 2] === 0) continue;
    const ly = inp.layer ? inp.layer[t]! : 255;
    const r = inp.rgb ? inp.rgb[i * 3]! : 255, g = inp.rgb ? inp.rgb[i * 3 + 1]! : 255, b = inp.rgb ? inp.rgb[i * 3 + 2]! : 255;
    const u = hasUv && ly !== 255 ? inp.uv![i * 2]! : 0, v = hasUv && ly !== 255 ? inp.uv![i * 2 + 1]! : 0;
    // Stück beim Zersplittern: Zelle der Dreiecksmitte (Ecken an Bruchkanten werden so doppelt angelegt)
    const o9 = t * 9, cz = [0, 1, 2].map(k => Math.floor((p[o9 + k]! + p[o9 + 3 + k]! + p[o9 + 6 + k]!) / 3 * CELL + 0.5));
    const k = `${cz.join(",")}|${wid[i]}|${Math.round(cn[i * 3]! * 1000)},${Math.round(cn[i * 3 + 1]! * 1000)},${Math.round(cn[i * 3 + 2]! * 1000)}|${r},${g},${b},${ly}|${Math.round(u * 1e4)},${Math.round(v * 1e4)}`;
    let vi = vmap.get(k);
    if (vi === undefined) {
      vi = P.length / 3; vmap.set(k, vi);
      P.push(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!);
      N.push(cn[i * 3]!, cn[i * 3 + 1]!, cn[i * 3 + 2]!);
      if (hasCol) C.push(r, g, b, ly);
      if (hasUv) U.push(u, v);
      Z.push(cz[0]!, cz[1]!, cz[2]!, 0);
    }
    idxL.push(vi);
  }
  const idx = new Uint32Array(idxL);
  const texIn = (inp.textures ?? []).slice(0, RENDER_MAX_TEX);
  const texSize = hasUv && texIn.length ? Math.min(TEX_SIZE_MAX, 1 << Math.ceil(Math.log2(Math.max(16, ...texIn.map(t => Math.max(t.w, t.h)))))) : 0;
  // Dreiecke gleich herum wie die Normalen (für das Wegschneiden von Rückseiten nicht nötig, aber stimmig)
  // Dreiecke gleich herum wie ihre Normalen (Wicklung aus orientFaces)
  for (let i = 0, t = 0; t < nt; t++) {
    if (fu[t * 3] === 0 && fu[t * 3 + 1] === 0 && fu[t * 3 + 2] === 0) continue;
    if (flipT[t]! < 0) { const x = idx[i + 1]!; idx[i + 1] = idx[i + 2]!; idx[i + 2] = x; }
    i += 3;
  }
  if (!idx.length) return null;
  return {
    nv: P.length / 3, pos: new Float32Array(P), nrm: new Float32Array(N),
    col: hasCol ? new Uint8Array(C) : null, uv: hasUv ? new Float32Array(U) : null, cell: new Int8Array(Z), idx,
    texSize, tex: texSize ? texIn.map(t => resample(t, texSize)) : [],
  };
}

// ---- Block „VJMS“ (hinter der Punktwolke in der Modelldatei) --------------------------------------
// Kopf 24 Bytes: „VJMS“, Ecken, Indizes, Merkmale (Bit 0 Farben, Bit 1 UV), Texturen, Texturgröße.
// Dann Float32 Position (3) und Normale (3) je Ecke, bei Farben 4 Bytes je Ecke, bei UV Float32 (2) je Ecke,
// Stück je Ecke (4 × Int8), Uint32 Indizes, Texturen RGBA. Alle Teile sind auf 4 Bytes ausgerichtet.
const MESH_MAGIC = 0x534d_4a56; // „VJMS“ little endian

export function meshBytes(m: RenderMesh): number {
  return 24 + m.nv * 24 + (m.col ? m.nv * 4 : 0) + (m.uv ? m.nv * 8 : 0) + m.nv * 4 + m.idx.length * 4 + m.tex.length * m.texSize * m.texSize * 4;
}

export function encodeRenderMesh(m: RenderMesh, out: Uint8Array, at: number): number {
  const dv = new DataView(out.buffer, out.byteOffset);
  dv.setUint32(at, MESH_MAGIC, true); dv.setUint32(at + 4, m.nv, true); dv.setUint32(at + 8, m.idx.length, true);
  dv.setUint32(at + 12, (m.col ? 1 : 0) | (m.uv ? 2 : 0), true); dv.setUint32(at + 16, m.tex.length, true); dv.setUint32(at + 20, m.texSize, true);
  let o = at + 24;
  const put = (a: ArrayBufferView) => { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), o); o += a.byteLength; };
  const pn = new Float32Array(m.nv * 6);
  for (let i = 0; i < m.nv; i++) { pn.set(m.pos.subarray(i * 3, i * 3 + 3), i * 6); pn.set(m.nrm.subarray(i * 3, i * 3 + 3), i * 6 + 3); }
  put(pn);
  if (m.col) put(m.col);
  if (m.uv) put(m.uv);
  put(m.cell);
  put(m.idx);
  for (const t of m.tex) put(t);
  return o;
}

/** Mesh-Block lesen; null bei kaputten oder unplausiblen Daten. */
export function decodeRenderMesh(buf: ArrayBuffer, at: number): RenderMesh | null {
  if (buf.byteLength < at + 24) return null;
  const dv = new DataView(buf);
  if (dv.getUint32(at, true) !== MESH_MAGIC) return null;
  const nv = dv.getUint32(at + 4, true), ni = dv.getUint32(at + 8, true), fl = dv.getUint32(at + 12, true);
  const nTex = dv.getUint32(at + 16, true), S = dv.getUint32(at + 20, true);
  if (!nv || !ni || ni % 3 || ni > RENDER_MAX_TRIS * 3 || nv > RENDER_MAX_TRIS * 3 || nTex > RENDER_MAX_TEX || S > TEX_SIZE_MAX || (nTex && !S)) return null;
  const hasCol = (fl & 1) === 1, hasUv = (fl & 2) === 2;
  const need = 24 + nv * 24 + (hasCol ? nv * 4 : 0) + (hasUv ? nv * 8 : 0) + nv * 4 + ni * 4 + nTex * S * S * 4;
  if (buf.byteLength !== at + need) return null;
  let o = at + 24;
  const pn = new Float32Array(buf, o, nv * 6); o += nv * 24;
  const col = hasCol ? new Uint8Array(buf, o, nv * 4) : null; if (hasCol) o += nv * 4;
  const uv = hasUv ? new Float32Array(buf, o, nv * 2) : null; if (hasUv) o += nv * 8;
  const cell = new Int8Array(buf, o, nv * 4); o += nv * 4;
  const idx = new Uint32Array(buf, o, ni); o += ni * 4;
  const tex: Uint8Array[] = [];
  for (let i = 0; i < nTex; i++) { tex.push(new Uint8Array(buf, o, S * S * 4)); o += S * S * 4; }
  if (!pn.every(Number.isFinite) || (uv && !uv.every(Number.isFinite))) return null;
  for (let i = 0; i < ni; i++) if (idx[i]! >= nv) return null;
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) { pos.set(pn.subarray(i * 6, i * 6 + 3), i * 3); nrm.set(pn.subarray(i * 6 + 3, i * 6 + 6), i * 3); }
  return { nv, pos, nrm, col, uv, cell, idx, texSize: S, tex };
}

/**
 * Teilobjekte für „Zersplittern“: zusammenhängende Teile des Netzes (Buchstaben, Schmetterling …). Ecken mit
 * gleicher Lage gelten als verbunden (das Netz ist an Kanten und Zellgrenzen aufgetrennt). Je Ecke 4 Werte:
 * Mitte des Teils (x, y, z) und eine Kennzahl 0…1; −1 heißt „in Zellen brechen“ (nur ein Teil, oder ein Teil
 * trägt mehr als die Hälfte des Körpers).
 */
export function meshParts(m: Pick<RenderMesh, "nv" | "pos" | "idx">): Float32Array {
  const nv = m.nv, out = new Float32Array(nv * 4);
  const grp = new Int32Array(nv), keys = new Map<string, number>();
  const q = (x: number) => Math.round(x * 1e4);
  for (let i = 0; i < nv; i++) {
    const k = `${q(m.pos[i * 3]!)},${q(m.pos[i * 3 + 1]!)},${q(m.pos[i * 3 + 2]!)}`;
    let g = keys.get(k); if (g === undefined) { g = keys.size; keys.set(k, g); }
    grp[i] = g;
  }
  const par = new Int32Array(keys.size); for (let i = 0; i < par.length; i++) par[i] = i;
  const find = (x: number) => { while (par[x] !== x) { par[x] = par[par[x]!]!; x = par[x]!; } return x; };
  const join = (a: number, b: number) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const nt = m.idx.length / 3;
  for (let t = 0; t < nt; t++) { const a = grp[m.idx[t * 3]!]!; join(a, grp[m.idx[t * 3 + 1]!]!); join(a, grp[m.idx[t * 3 + 2]!]!); }
  // Mitte (Mittel der Dreiecksmitten) und Größe je Teil
  const root = new Map<number, number>(), sum: number[] = [], cnt: number[] = [];
  for (let t = 0; t < nt; t++) {
    const r = find(grp[m.idx[t * 3]!]!);
    let p = root.get(r); if (p === undefined) { p = root.size; root.set(r, p); sum.push(0, 0, 0); cnt.push(0); }
    for (let c = 0; c < 3; c++) for (let j = 0; j < 3; j++) sum[p * 3 + j]! += m.pos[m.idx[t * 3 + c]! * 3 + j]! / 3;
    cnt[p]!++;
  }
  const parts = root.size;
  for (let i = 0; i < nv; i++) {
    const p = root.get(find(grp[i]!));
    const whole = p === undefined || parts < 2 || cnt[p]! > nt * 0.5;
    if (whole) { out[i * 4 + 3] = -1; continue; }
    for (let j = 0; j < 3; j++) out[i * 4 + j] = sum[p * 3 + j]! / cnt[p]!;
    out[i * 4 + 3] = ((p + 1) * 0.6180339887) % 1;
  }
  return out;
}
