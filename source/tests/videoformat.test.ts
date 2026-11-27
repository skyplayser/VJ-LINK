// MOV-Import: Formate erkennen und entscheiden, was kopiert und was umgewandelt wird; Masken-Formen im Mapping.
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { convertArgs, parseFfmpegInfo, parseProgress, planImport } from "../src/core/videoformat";
import { MASK_SHAPES, MAX_MASK_POINTS, inMask, newMask, setMaskShape, shapeMask, shapeUnit, type Mask } from "../src/core/layout";
import { Storage } from "../src/main/storage";

// Ausgaben von `ffmpeg -hide_banner -i` (gekürzt, echte Zeilen)
const OUT = {
  prores4444: `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'logo.mov':
  Duration: 00:00:03.00, start: 0.000000, bitrate: 2036 kb/s
  Stream #0:0[0x1]: Video: prores (4444) (ap4h / 0x68347061), yuva444p12le(progressive), 640x360, 2035 kb/s, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 12800 tbn (default)`,
  prores422: `  Duration: 00:01:10.52, start: 0.000000, bitrate: 147000 kb/s
  Stream #0:0[0x1](eng): Video: prores (HQ) (apch / 0x68637061), yuv422p10le(tv, bt709, progressive), 1920x1080, 145000 kb/s, 25 fps (default)
  Stream #0:1[0x2](eng): Audio: pcm_s24le (in24 / 0x34326E69), 48000 Hz, stereo, s32 (24 bit), 2304 kb/s (default)`,
  qtrle: `  Duration: 00:00:03.00, start: 0.000000, bitrate: 219 kb/s
  Stream #0:0[0x1]: Video: qtrle (rle  / 0x20656C72), argb(progressive), 640x360, 216 kb/s, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 12800 tbn (default)`,
  h264: `  Duration: 00:00:03.00, start: 0.000000, bitrate: 11 kb/s
  Stream #0:0[0x1]: Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 640x360 [SAR 1:1 DAR 16:9], 6 kb/s, 25 fps, 25 tbr, 12800 tbn (default)`,
  h264_422: `  Duration: 00:00:10.00, start: 0.000000, bitrate: 9000 kb/s
  Stream #0:0[0x1]: Video: h264 (High 4:2:2) (avc1 / 0x31637661), yuv422p10le(progressive), 1920x1080, 9000 kb/s, 25 fps (default)`,
  vp9alpha: `  Duration: 00:00:03.00, start: 0.000000, bitrate: 18 kb/s
  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, progressive), 640x360, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 1k tbn
    Metadata:
      alpha_mode      : 1`,
  hevc: `  Duration: 00:00:03.00, start: 0.000000, bitrate: 48 kb/s
  Stream #0:0[0x1]: Video: hevc (Main) (hvc1 / 0x31637668), yuv420p(tv, progressive), 640x360 [SAR 1:1 DAR 16:9], 45 kb/s, 25 fps, 25 tbr, 12800 tbn (default)`,
};

describe("MOV-Import: Format erkennen", () => {
  it("liest Codec, Pixelformat, Größe, Länge, Ton und Alpha", () => {
    expect(parseFfmpegInfo(OUT.prores4444)).toEqual({ codec: "prores", pixFmt: "yuva444p12le", duration: 3, width: 640, height: 360, audio: false, alpha: true });
    expect(parseFfmpegInfo(OUT.prores422)).toMatchObject({ codec: "prores", pixFmt: "yuv422p10le", width: 1920, height: 1080, audio: true, alpha: false });
    expect(parseFfmpegInfo(OUT.prores422)!.duration).toBeCloseTo(70.52, 2);
    expect(parseFfmpegInfo(OUT.qtrle)).toMatchObject({ codec: "qtrle", pixFmt: "argb", alpha: true });
    expect(parseFfmpegInfo(OUT.vp9alpha)).toMatchObject({ codec: "vp9", alpha: true });
    expect(parseFfmpegInfo(OUT.h264)).toMatchObject({ codec: "h264", pixFmt: "yuv420p", alpha: false });
    expect(parseFfmpegInfo("kein Video")).toBeNull();
  });

  it("kopiert, was Chromium abspielt, und wandelt den Rest um (mit Alpha → WebM, ohne → MP4)", () => {
    const plan = (k: keyof typeof OUT, os = "darwin") => planImport(parseFfmpegInfo(OUT[k])!, os);
    expect(plan("h264")).toBe("copy");
    expect(plan("vp9alpha")).toBe("copy");
    expect(plan("hevc", "darwin")).toBe("copy");
    expect(plan("hevc", "win32")).toBe("plain");
    expect(plan("prores4444")).toBe("alpha");
    expect(plan("qtrle")).toBe("alpha");
    expect(plan("prores422")).toBe("plain");
    expect(plan("h264_422")).toBe("plain");
  });

  it("baut die ffmpeg-Argumente ohne Shell, mit Ton nur wenn vorhanden", () => {
    const a = convertArgs("/a/logo.mov", "/b/x.part.webm", "alpha", false);
    expect(a).toContain("libvpx-vp9"); expect(a).toContain("yuva420p"); expect(a).not.toContain("0:a:0");
    expect(a[a.length - 1]).toBe("/b/x.part.webm");
    const p = convertArgs("/a/film.mov", "/b/x.part.mp4", "plain", true);
    expect(p).toContain("libx264"); expect(p).toContain("aac"); expect(p).toContain("0:a:0");
  });

  it("liest den Fortschritt", () => {
    expect(parseProgress("frame=10\nout_time_us=1500000\n", 3)).toBeCloseTo(0.5);
    expect(parseProgress("frame=10\n", 3)).toBeNull();
    expect(parseProgress("out_time_us=9000000\n", 3)).toBe(1);
  });
});

describe("MOV-Import im Speicher", () => {
  it("wandelt mit dem Umwandler um und legt WebM an; kopiert unterstützte Dateien", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vjlink-"));
    try {
      const src = path.join(dir, "logo.mov"); writeFileSync(src, Buffer.alloc(4000, 1));
      const st = new Storage(path.join(dir, "data")); await st.init();
      const prog: number[] = [];
      st.converter = {
        probe: async f => parseFfmpegInfo(f.endsWith("logo.mov") ? OUT.prores4444 : OUT.h264),
        plan: i => planImport(i, "darwin"),
        convert: async (_s, dst, plan, _i, on) => { on(0.5); writeFileSync(dst, `fake ${plan}`); return null; },
      };
      const r = await st.addVideo(src, "Logo", p => prog.push(p));
      if (typeof r === "string") throw new Error(r);
      expect(r).toMatchObject({ ext: "webm", converted: "alpha", name: "Logo" });
      expect(prog).toEqual([0, 0.5, 1]);
      const files = readdirSync(path.join(dir, "data", "videos"));
      expect(files).toContain(`${r.id}.webm`);
      expect(files.some(f => f.includes(".part."))).toBe(false);
      // Unterstützt: nur kopieren
      const src2 = path.join(dir, "film.mov"); writeFileSync(src2, Buffer.alloc(4000, 2));
      const r2 = await st.addVideo(src2, "Film");
      if (typeof r2 === "string") throw new Error(r2);
      expect(r2).toMatchObject({ ext: "mov" }); expect(r2.converted).toBeUndefined();
      // Fehler beim Umwandeln: Meldung, keine halbe Datei
      st.converter.convert = async (_s, dst) => { writeFileSync(dst, "halb"); return "Umwandeln fehlgeschlagen."; };
      expect(await st.addVideo(src, "Logo 2")).toBe("Umwandeln fehlgeschlagen.");
      expect(readdirSync(path.join(dir, "data", "videos")).some(f => f.includes(".part."))).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("Maskenformen im Projektionsmapping", () => {
  it("jede Form hat höchstens so viele Punkte, wie der Shader kann, und liegt im Einheitsquadrat", () => {
    for (const s of MASK_SHAPES) {
      if (s === "free") continue;
      const p = shapeUnit(s);
      expect(p.length).toBeGreaterThanOrEqual(3);
      expect(p.length).toBeLessThanOrEqual(MAX_MASK_POINTS);
      for (const [x, y] of p) { expect(x).toBeGreaterThanOrEqual(-1e-9); expect(x).toBeLessThanOrEqual(1 + 1e-9); expect(y).toBeGreaterThanOrEqual(-1e-9); expect(y).toBeLessThanOrEqual(1 + 1e-9); }
    }
  });

  it("Kreis und Portal: Mitte innen, Ecken außen; Portal unten eckig", () => {
    const m = setMaskShape(newMask(1, 1), "circle");
    m.quad = [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6]]; shapeMask(m);
    expect(inMask(m.pts, 0.4, 0.4)).toBe(true);
    expect(inMask(m.pts, 0.21, 0.21)).toBe(false);
    const p = setMaskShape(newMask(1, 2), "portal");
    p.quad = [[0, 0], [1, 0], [1, 1], [0, 1]]; shapeMask(p);
    expect(inMask(p.pts, 0.02, 0.98)).toBe(true);   // unten links: eckig, innen
    expect(inMask(p.pts, 0.02, 0.02)).toBe(false);  // oben links: Bogen, außen
    expect(inMask(p.pts, 0.5, 0.05)).toBe(true);    // Scheitel
  });

  it("perspektivisch: die Form folgt den vier Ecken", () => {
    const m = setMaskShape(newMask(1, 1), "rect");
    m.quad = [[0.1, 0.1], [0.5, 0.2], [0.5, 0.8], [0.1, 0.9]]; shapeMask(m);
    expect(m.pts[0]![0]).toBeCloseTo(0.1); expect(m.pts[1]![1]).toBeCloseTo(0.2); expect(m.pts[3]![1]).toBeCloseTo(0.9);
  });

  it("frei ↔ Form: „frei“ behält die Punkte, eine Form nimmt das umschließende Rechteck", () => {
    const m: Mask = { id: "m1", screen: 1, name: "M", pts: [[0.3, 0.3], [0.7, 0.35], [0.5, 0.8]], invert: true, feather: 4, on: true };
    setMaskShape(m, "circle");
    expect(m.quad).toEqual([[0.3, 0.3], [0.7, 0.3], [0.7, 0.8], [0.3, 0.8]]);
    expect(m.pts.length).toBe(60);
    setMaskShape(m, "free");
    expect(m.shape).toBeUndefined(); expect(m.pts.length).toBe(60);
  });
});
