// Echter Körper: Dreiecksnetz aus dem Modell (Kanten, Glätten, Vereinfachen, Datei).
import { describe, expect, it } from "vitest";
import { buildRenderMesh, decodeRenderMesh, encodeRenderMesh, meshBytes } from "../src/core/rendermesh";
import { builtinMesh } from "../src/core/particles";
import { decodePointCloud, encodePointCloud, meshToPointCloud, parseObj } from "../src/core/meshfile";

describe("Render-Mesh", () => {
  it("Würfel: harte Kanten bleiben hart (Normalen zeigen genau auf die Seiten), Ecken werden geteilt", () => {
    const m = buildRenderMesh({ pos: builtinMesh("cube").pos })!;
    expect(m.idx.length % 3).toBe(0);
    for (let i = 0; i < m.nv; i++) {
      const n = [m.nrm[i * 3]!, m.nrm[i * 3 + 1]!, m.nrm[i * 3 + 2]!].map(Math.abs).sort((a, b) => b - a);
      expect(n[0]).toBeGreaterThan(0.99);
    }
    expect(m.nv).toBeLessThan(m.idx.length);
  });
  it("Kugel: glatte Normalen zeigen nach außen (wie die Lage)", () => {
    const m = buildRenderMesh({ pos: builtinMesh("sphere").pos })!;
    let worst = 1;
    for (let i = 0; i < m.nv; i++) {
      const p = [m.pos[i * 3]!, m.pos[i * 3 + 1]!, m.pos[i * 3 + 2]!], l = Math.hypot(...p);
      worst = Math.min(worst, (p[0]! * m.nrm[i * 3]! + p[1]! * m.nrm[i * 3 + 1]! + p[2]! * m.nrm[i * 3 + 2]!) / l);
    }
    expect(worst).toBeGreaterThan(0.95);
  });
  it("grobe Netze werden unterteilt: keine Kante länger als TESS_EDGE, gleiche Form", async () => {
    const { TESS_EDGE } = await import("../src/core/rendermesh");
    const m = buildRenderMesh({ pos: builtinMesh("star").pos })!;
    let longest = 0;
    for (let i = 0; i < m.idx.length; i += 3) for (let c = 0; c < 3; c++) {
      const a = m.idx[i + c]!, b = m.idx[i + (c + 1) % 3]!;
      longest = Math.max(longest, Math.hypot(m.pos[a * 3]! - m.pos[b * 3]!, m.pos[a * 3 + 1]! - m.pos[b * 3 + 1]!, m.pos[a * 3 + 2]! - m.pos[b * 3 + 2]!));
    }
    expect(longest).toBeLessThanOrEqual(TESS_EDGE + 1e-6);
  });
  it("zu viele Dreiecke werden vereinfacht", () => {
    const src = builtinMesh("sphere").pos;
    const m = buildRenderMesh({ pos: src }, Math.floor(src.length / 9 / 4))!;
    expect(m.idx.length / 3).toBeLessThanOrEqual(Math.floor(src.length / 9 / 4));
    expect(m.idx.length / 3).toBeGreaterThan(20);
  });
  it("Datei: hin und zurück gleich; kaputte Blöcke werden abgelehnt", () => {
    const m = buildRenderMesh({ pos: builtinMesh("star").pos, rgb: new Uint8Array(builtinMesh("star").pos.length).fill(200) })!;
    const buf = new Uint8Array(meshBytes(m));
    encodeRenderMesh(m, buf, 0);
    const d = decodeRenderMesh(buf.buffer, 0)!;
    expect(d.nv).toBe(m.nv); expect(Array.from(d.idx)).toEqual(Array.from(m.idx)); expect(d.col![0]).toBe(200);
    expect(decodeRenderMesh(buf.slice(0, buf.length - 4).buffer, 0)).toBeNull();
    const bad = buf.slice(); new DataView(bad.buffer).setUint32(24 + m.nv * 24 + m.nv * 4 + m.nv * 4, 0xffffffff, true);
    expect(decodeRenderMesh(bad.buffer, 0)).toBeNull();
  });
  it("OBJ mit Materialfarben: Modelldatei Version 2 trägt Punktwolke und Körper; Version 1 bleibt lesbar", () => {
    const obj = "mtllib a.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nv 0 0 1\nusemtl rot\nf 1 2 3\nf 1 3 4\nf 1 4 2\nf 2 4 3\n";
    const pc = meshToPointCloud(parseObj(obj), [{ name: "rot", kd: [1, 0, 0], mapKd: null }], new Map(), 1000);
    expect(pc.mesh!.col![0]).toBe(255); expect(pc.mesh!.col![1]).toBe(0);
    const back = decodePointCloud(encodePointCloud(pc).buffer as ArrayBuffer)!;
    // grobe Netze werden fein unterteilt (weiche Verformung)
    expect(back.n).toBe(1000); expect(back.mesh!.idx.length).toBeGreaterThan(12); expect(back.mesh!.idx.length).toBe(pc.mesh!.idx.length);
    const v1 = encodePointCloud({ ...pc, mesh: null });
    expect(new DataView(v1.buffer).getUint32(4, true)).toBe(1);
    expect(decodePointCloud(v1.buffer as ArrayBuffer)!.mesh).toBeNull();
  });
});

describe("Teilobjekte (Zersplittern)", () => {
  // zwei getrennte Dreiecke plus ein Quadrat aus zwei Dreiecken mit doppelten Ecken (wie an Kanten aufgetrennt)
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 0, 0, 6, 0, 0, 5, 1, 0, 6, 1, 0, 6, 0, 0, 5, 1, 0, 10, 0, 0, 11, 0, 0, 10, 1, 0]);
  const idx = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 8, 7, 9, 10, 11]);
  it("trennt zusammenhängende Teile, auch über doppelte Ecken hinweg", async () => {
    const { meshParts } = await import("../src/core/rendermesh");
    const p = meshParts({ nv: 12, pos, idx });
    const id = (v: number) => p[v * 4 + 3];
    expect(id(0)).toBe(id(1));
    expect(id(3)).toBe(id(6));
    expect(id(3)).not.toBe(id(0));
    expect(id(9)).not.toBe(id(3));
    expect(p[9 * 4]).toBeCloseTo(10 + 1 / 3);
  });
  it("ein einziger Körper bricht in Zellen (−1)", async () => {
    const { meshParts } = await import("../src/core/rendermesh");
    const p = meshParts({ nv: 3, pos: pos.slice(0, 9), idx: new Uint32Array([0, 1, 2]) });
    expect(p[3]).toBe(-1);
  });
});
