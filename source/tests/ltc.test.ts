import { describe, expect, it } from "vitest";
import { LtcWriter, decodeLtc, ltcBits } from "../src/core/ltc";
import { framesToTc, tcToFrames, type TcFps } from "../src/core/timecode";

describe("LTC (SMPTE 12M)", () => {
  it("legt Ziffern, Sync-Wort und Drop-Frame-Bit richtig ab", () => {
    const b = ltcBits({ h: 23, m: 59, s: 58, f: 27 }, 29.97);
    const num = (at: number, n: number) => { let v = 0; for (let i = 0; i < n; i++) v |= b[at + i]! << i; return v; };
    expect([num(0, 4), num(8, 2), num(16, 4), num(24, 3), num(32, 4), num(40, 3), num(48, 4), num(56, 2)]).toEqual([7, 2, 8, 5, 9, 5, 3, 2]);
    expect(b[10]).toBe(1);
    expect([...b.slice(64)].join("")).toBe("0011111111111101");
  });

  it("hält die Zahl der Nullen in jedem Bild gerade (Polaritätsbit 27 bzw. 59 bei 25 fps)", () => {
    for (const fps of [24, 25, 29.97, 30] as TcFps[])
      for (let n = 0; n < 400; n += 7) {
        const b = ltcBits(framesToTc(n * 13, fps), fps);
        expect([...b].filter(x => x === 0).length % 2).toBe(0);
      }
  });

  for (const fps of [24, 25, 29.97, 30] as TcFps[]) {
    it(`erzeugt ein lesbares Signal bei ${fps} fps und 48 kHz, Bild für Bild fortlaufend`, () => {
      const start = tcToFrames({ h: 1, m: 9, s: 59, f: 20 }, fps);
      let k = 0;
      const w = new LtcWriter(48000, () => ({ tc: framesToTc(start + k++, fps), fps }));
      const all = new Float32Array(48000);
      for (let i = 0; i < all.length; i += 1024) { const part = new Float32Array(Math.min(1024, all.length - i)); w.render(part, 0.5); all.set(part, i); }
      const got = decodeLtc(all, 48000, fps);
      expect(got.length).toBeGreaterThan(Math.floor(fps) - 3);
      // Das allererste Bild hat keine Flanke davor und wird übersprungen; danach jedes Bild lückenlos
      const first = tcToFrames(got[0]!.tc, fps);
      expect(first - start).toBeLessThanOrEqual(1);
      got.forEach((g, i) => {
        expect(tcToFrames(g.tc, fps)).toBe(first + i);
        expect(g.dropFrame).toBe(fps === 29.97);
        expect(g.zerosEven).toBe(true);
      });
      expect(Math.max(...all)).toBeLessThanOrEqual(0.5 + 1e-6);
    });
  }

  it("sendet Stille, solange kein Timecode da ist, und läuft danach sauber weiter", () => {
    let k = 0;
    const w = new LtcWriter(44100, () => (k++ < 5 ? null : { tc: framesToTc(1000 + k, 25), fps: 25 as TcFps }));
    const a = new Float32Array(44100);
    w.render(a, 1);
    expect(a.slice(0, 44100 * 0.19).every(x => x === 0)).toBe(true);
    const got = decodeLtc(a, 44100, 25);
    expect(got.length).toBeGreaterThan(15);
    for (let i = 1; i < got.length; i++) expect(tcToFrames(got[i]!.tc, 25) - tcToFrames(got[i - 1]!.tc, 25)).toBe(1);
  });
});
