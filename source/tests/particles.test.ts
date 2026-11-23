import { describe, expect, it } from "vitest";
import {
  OBJECT_RADIUS, PARTICLE_OBJECTS, builtinMesh, defaultParticles, explodeState, isParticleClip, parseParticles, sampleSurface,
} from "../src/core/particles";
import { decodePointCloud, encodePointCloud, meshToPointCloud, parseMtl, parseObj, parseStl } from "../src/core/meshfile";

describe("Partikel-Objekt: Körper und Abtastung", () => {
  it("alle eingebauten Körper sind normiert und haben eine Oberfläche", () => {
    for (const o of PARTICLE_OBJECTS) {
      const m = builtinMesh(o);
      let r = 0;
      for (let i = 0; i < m.pos.length; i += 3) r = Math.max(r, Math.hypot(m.pos[i]!, m.pos[i + 1]!, m.pos[i + 2]!));
      expect(r, o).toBeLessThanOrEqual(OBJECT_RADIUS * 1.25);
      expect(r, o).toBeGreaterThan(OBJECT_RADIUS * 0.7);
      expect(sampleSurface(m, 500), o).not.toBeNull();
    }
  });

  it("Punkte liegen auf der Kugel und die Normalen zeigen nach außen", () => {
    const pts = sampleSurface(builtinMesh("sphere"), 2000)!;
    expect(pts.length).toBe(12000);
    for (let i = 0; i < 2000; i++) {
      const p = [pts[i * 6]!, pts[i * 6 + 1]!, pts[i * 6 + 2]!], n = [pts[i * 6 + 3]!, pts[i * 6 + 4]!, pts[i * 6 + 5]!];
      expect(Math.hypot(...p)).toBeGreaterThan(OBJECT_RADIUS * 0.98);
      expect(Math.hypot(...n)).toBeCloseTo(1, 3);
      expect(p[0]! * n[0]! + p[1]! * n[1]! + p[2]! * n[2]!).toBeGreaterThan(0);
    }
  });

  it("flache Körper: Normalen zeigen nach außen (Würfel, Kreuz, Stern)", () => {
    for (const o of ["cube", "cross", "star"] as const) {
      const pts = sampleSurface(builtinMesh(o), 3000)!;
      let out = 0;
      for (let i = 0; i < 3000; i++) {
        const d = pts[i * 6]! * pts[i * 6 + 3]! + pts[i * 6 + 1]! * pts[i * 6 + 4]! + pts[i * 6 + 2]! * pts[i * 6 + 5]!;
        if (d > 0) out++;
      }
      // Beim Kreuz zeigen die Innenecken der Arme zur Mitte, das sind wenige
      expect(out / 3000, o).toBeGreaterThan(0.85);
    }
  });

  it("die ersten Punkte decken schon die ganze Oberfläche ab (gemischt)", () => {
    const pts = sampleSurface(builtinMesh("cube"), 20000)!;
    const faces = new Set<string>();
    for (let i = 0; i < 200; i++) faces.add([3, 4, 5].map(k => Math.round(pts[i * 6 + k]!)).join(","));
    expect(faces.size).toBe(6);
  });

  it("gleiche Punkte bei gleichem Startwert (alle Fenster sehen dasselbe)", () => {
    expect(sampleSurface(builtinMesh("torus"), 100)).toEqual(sampleSurface(builtinMesh("torus"), 100));
  });

  it("ohne Fläche: null", () => {
    expect(sampleSurface({ pos: new Float32Array(9) }, 10)).toBeNull();
  });
});

describe("Partikel-Objekt: Einstellungen und Explosion", () => {
  it("Projektwerte werden begrenzt, Unsinn ergibt die Vorgabe", () => {
    const p = parseParticles({ explode: 5, trigger: "nix", count: 1e9, spin: "ja", rpm: -100 })!;
    expect(p.explode).toBe(1);
    expect(p.trigger).toBe(defaultParticles().trigger);
    expect(p.count).toBe(200);
    expect(p.spin).toBe(defaultParticles().spin);
    expect(p.rpm).toBe(-30);
    expect(parseParticles("x")).toBeUndefined();
  });

  it("Takt 1: Explosion auf Beat 0, 4, 8 …, dazwischen Puls", () => {
    const p = { ...defaultParticles(), trigger: "bar" as const, explode: 1 };
    expect(explodeState(p, 8.25).since).toBeCloseTo(0.25);
    expect(explodeState(p, 8.25).pulseAmp).toBe(0);
    expect(explodeState(p, 10.5).since).toBeCloseTo(2.5);
    expect(explodeState(p, 10.5).pulseSince).toBeCloseTo(0.5);
    expect(explodeState(p, 10.5).pulseAmp).toBeGreaterThan(0);
  });

  it("Rückkehr ist vor dem nächsten Auslöser fertig", () => {
    expect(explodeState({ ...defaultParticles(), trigger: "beat", ret: 4 }, 3).ret).toBeLessThan(1);
  });

  it("„Halten“: der Regler bestimmt die Weite direkt", () => {
    const s = explodeState({ ...defaultParticles(), trigger: "hold", explode: 0.7 }, 3.2);
    expect(s.hold).toBeCloseTo(0.7);
    expect(s.amp).toBe(0);
  });

  it("Clip-IDs", () => {
    expect(isParticleClip("pobj-cross")).toBe(true);
    expect(isParticleClip("pobj-nope")).toBe(false);
    expect(isParticleClip("mdl:abc123")).toBe(true);
    expect(isParticleClip("tunnel")).toBe(false);
  });
});

describe("Eigene Modelle: OBJ, MTL, STL, Punktwolke", () => {
  const OBJ = `# Test
mtllib a b.mtl
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vt 0 0
vt 1 0
vt 1 1
vt 0 1
usemtl rot
f 1/1 2/2 3/3 4/4
usemtl tex
f -4/-4 -2/-2 -1/-1
`;
  it("OBJ: Vierecke als Fächer, negative Indizes, Materialien, UV", () => {
    const m = parseObj(OBJ);
    expect(m.pos.length).toBe(27);
    expect([...m.mat!]).toEqual([0, 0, 1]);
    expect(m.materials).toEqual(["rot", "tex"]);
    expect(m.mtllib).toEqual(["a b.mtl"]);
    expect(m.uv!.length).toBe(18);
    expect(m.nrm).toBeUndefined();
    expect([...m.pos.slice(18, 27)]).toEqual([0, 0, 0, 1, 1, 0, 0, 1, 0]);
  });

  it("OBJ ohne Flächen: verständlicher Fehler", () => {
    expect(() => parseObj("v 0 0 0\n")).toThrow(/Keine Flächen/);
  });

  it("MTL: Kd und map_Kd mit Optionen und Leerzeichen", () => {
    const mats = parseMtl("newmtl rot\nKd 1 0 0\nnewmtl tex\nmap_Kd -s 1 1 1 -bm 0.5 Meine Textur.png\n");
    expect(mats[0]).toEqual({ name: "rot", kd: [1, 0, 0], mapKd: null });
    expect(mats[1]!.mapKd).toBe("Meine Textur.png");
  });

  it("Farben aus Material und Textur landen in der Punktwolke", () => {
    const m = parseObj(OBJ);
    const tex = { w: 2, h: 2, data: new Uint8Array([0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255]) };
    const pc = meshToPointCloud(m, parseMtl("newmtl rot\nKd 1 0 0\nnewmtl tex\nmap_Kd t.png\n"), new Map([["t.png", tex]]), 400);
    expect(pc.col).not.toBeNull();
    let red = 0, blue = 0;
    for (let i = 0; i < 400; i++) { if (pc.col![i * 4] === 255) red++; if (pc.col![i * 4 + 2] === 255) blue++; }
    expect(red + blue).toBe(400);
    expect(red).toBeGreaterThan(blue); // Material „rot“ hat die doppelte Fläche
  });

  it("STL binär und ASCII", () => {
    const bin = new Uint8Array(84 + 50);
    const dv = new DataView(bin.buffer);
    dv.setUint32(80, 1, true);
    [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, k) => dv.setFloat32(84 + 12 + k * 4, v, true));
    expect([...parseStl(bin).pos]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const asc = new TextEncoder().encode("solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t\n");
    expect([...parseStl(asc).pos]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(() => parseStl(new TextEncoder().encode("solid leer\nendsolid\n"))).toThrow();
  });

  it("Punktwolke: Hin und zurück, kaputte Dateien ergeben null", () => {
    const pc = meshToPointCloud(parseObj(OBJ), [], new Map(), 300);
    expect(pc.col).toBeNull();
    const bytes = encodePointCloud(pc);
    const back = decodePointCloud(bytes.slice().buffer)!;
    expect(back.n).toBe(300);
    expect([...back.pts]).toEqual([...pc.pts]);
    expect(decodePointCloud(bytes.slice(0, 40).buffer)).toBeNull();
    expect(decodePointCloud(new ArrayBuffer(8))).toBeNull();
  });
});

describe("Partikel-Objekt im Projekt", () => {
  it("Einstellungen der Ebene, Modell-Clips und Modell-Liste überstehen Speichern und Laden", async () => {
    const { parseProject } = await import("../src/core/project");
    const { projectRefs } = await import("../src/core/projectfile");
    const raw = {
      version: 1, layers: [{ clip: "mdl:abcdef123456", clips: ["pobj-cross", "mdl:abcdef123456", "mdl:../x"], particles: { explode: 0.9, trigger: "2bars", spin: false } }],
      scenes: [], slots: [[1, 0, 0], [0, 0, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], media: [], videos: [],
      models: [{ id: "abcdef123456", name: "Logo", colors: true }, { id: "../böse", name: "x" }],
    };
    const p = parseProject(JSON.stringify(raw))!;
    expect(p.layers[0]!.clip).toBe("mdl:abcdef123456");
    expect(p.layers[0]!.clips).toEqual(["pobj-cross", "mdl:abcdef123456"]);
    expect(p.layers[0]!.particles).toMatchObject({ explode: 0.9, trigger: "2bars", spin: false });
    expect(p.models).toEqual([{ id: "abcdef123456", name: "Logo", colors: true }]);
    expect(projectRefs(JSON.stringify(raw)).models).toEqual([{ id: "abcdef123456", name: "Logo" }]);
  });
});

describe("Partikel-Objekt: Bass-Auslöser und Drehung je Achse", () => {
  it("härterer Bass treibt weiter auseinander, leiser Bass gar nicht", async () => {
    const { bassTarget } = await import("../src/core/particles");
    const p = { ...defaultParticles(), trigger: "bass" as const, explode: 0.5 };
    expect(bassTarget(p, 0.05)).toBe(0);
    expect(bassTarget(p, 0.5)).toBeGreaterThan(0);
    expect(bassTarget(p, 0.95)).toBeGreaterThan(bassTarget(p, 0.5) * 2);
    expect(bassTarget({ ...p, explode: 0 }, 1)).toBe(0);
    expect(explodeState(p, 3.3).amp).toBe(0); // kein Takt-Auslöser
  });

  it("Hüllkurve: schnell hinaus, in „Rückkehr“ zurück", async () => {
    const { BassEnvelope } = await import("../src/core/particles");
    const e = new BassEnvelope();
    e.step(0, 0, 1, 120);
    const up = e.step(1, 100, 1, 120);
    expect(up.value).toBeGreaterThan(0.95);
    expect(up.vel).toBeGreaterThan(0);
    let v = up.value;
    for (let t = 200; t <= 700; t += 100) v = e.step(0, t, 1, 120).value; // 1 Beat = 0,5 s
    expect(v).toBeLessThan(0.1);
    const fast = new BassEnvelope(); fast.step(1, 0, 0.25, 120); fast.step(1, 50, 0.25, 120);
    const slow = new BassEnvelope(); slow.step(1, 0, 4, 120); slow.step(1, 50, 4, 120);
    expect(fast.step(0, 250, 0.25, 120).value).toBeLessThan(slow.step(0, 250, 4, 120).value);
  });

  it("Winkel je Achse plus Drehtempo, ohne Drehung nur die feste Lage", async () => {
    const { particleAngles } = await import("../src/core/particles");
    const p = { ...defaultParticles(), angX: 90, angY: 0, angZ: -45, rpmX: 0, rpm: 60, rpmZ: 30 };
    const a = particleAngles(p, 0.25);
    expect(a.x).toBeCloseTo(Math.PI / 2);
    expect(a.y).toBeCloseTo(Math.PI / 2); // 60 U/min = eine Umdrehung pro Sekunde
    expect(a.z).toBeCloseTo(-Math.PI / 4 + Math.PI / 4);
    expect(particleAngles({ ...p, spin: false }, 10).y).toBe(0);
  });

  it("ältere Projekte ohne Achsenwerte bekommen die Vorgabe", () => {
    const p = parseParticles({ explode: 0.3, trigger: "bass" })!;
    expect(p.trigger).toBe("bass");
    expect([p.angX, p.angY, p.angZ, p.rpmX, p.rpmZ]).toEqual([10, 20, 0, 0, 0]);
  });
});


describe("Form deckend", () => {
  it("Vorgabe: eigene Modelle (Logos) deckend, eingebaute Körper Staub; eingestellter Wert gilt immer und bleibt im Projekt", async () => {
    const { defaultParticles, parseParticles, particleSolid } = await import("../src/core/particles");
    const d = defaultParticles();
    expect(particleSolid(d, "mdl:abc")).toBe(true);
    expect(particleSolid(d, "pobj-sphere")).toBe(false);
    // Körper-Verhalten sind von sich aus deckend, auch bei eingebauten Körpern
    expect(particleSolid({ ...d, mode: "melt" }, "pobj-sphere")).toBe(true);
    expect(particleSolid({ ...d, solid: true }, "pobj-sphere")).toBe(true);
    expect(particleSolid({ ...d, solid: false }, "mdl:abc")).toBe(false);
    expect(parseParticles({ solid: true })!.solid).toBe(true);
    expect(parseParticles({ solid: "ja" })!.solid).toBeUndefined();
    expect(parseParticles({ length: 1 })).not.toHaveProperty("length");
  });
});

describe("Objekt-Effekte", () => {
  it("Vorgabe Partikel, ältere Projekte ohne Feld ebenso; Ohne hat keinen Auslöser; Puls nur bei Partikel und Jelly", async () => {
    const { defaultParticles, parseParticles, explodeState } = await import("../src/core/particles");
    expect(defaultParticles().mode).toBe("burst");
    expect(parseParticles({})!.mode).toBe("burst");
    expect(parseParticles({ mode: "melt" })!.mode).toBe("melt");
    expect(parseParticles({ mode: "lava" })!.mode).toBe("burst");
    const d = defaultParticles();
    const still = explodeState({ ...d, mode: "still" }, 0.05);
    expect(still.amp).toBe(0); expect(still.hold).toBe(0);
    // Zwischen-Beat (Takt 1 als Auslöser, Beat 2): Puls beim Sprengen und Jelly, nicht bei Wasser
    expect(explodeState({ ...d, mode: "burst" }, 2.1).pulseAmp).toBeGreaterThan(0);
    expect(explodeState({ ...d, mode: "jelly" }, 2.1).pulseAmp).toBeGreaterThan(0);
    expect(explodeState({ ...d, mode: "melt" }, 2.1).pulseAmp).toBe(0);
    // Verwehen: ruhig, ohne Zwischen-Puls; vorne in der Bedienung direkt nach Partikel
    expect(explodeState({ ...d, mode: "drift" }, 2.1).pulseAmp).toBe(0);
    expect(parseParticles({ mode: "drift" })!.mode).toBe("drift");
    const { PARTICLE_MODE_ORDER, PARTICLE_MODES } = await import("../src/core/particles");
    expect(PARTICLE_MODE_ORDER.slice(0, 2)).toEqual(["burst", "drift"]);
    expect([...PARTICLE_MODE_ORDER].sort()).toEqual([...PARTICLE_MODES].sort());
    // Flüssig: Anstieg + Rückkehr passen in den Takt
    const w = explodeState({ ...d, mode: "melt", ret: 4 }, 0.5);
    expect(w.atk + w.ret).toBeLessThanOrEqual(4);
  });
});
