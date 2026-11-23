import { describe, expect, it } from "vitest";

describe("Beat-Raster aus LJ-Link (Takt-Eins, Phrase)", () => {
  it("liest bar und phraseBeat, verwirft Unsinn", async () => {
    const { parseLjMessage: parseLj } = await import("../src/core/ljlink");
    expect(parseLj(JSON.stringify({ t: "tempo", bpm: 128, beat: 10.5, bar: 3, phraseBeat: 7 }))).toMatchObject({ bar: 3, phraseBeat: 7 });
    const bad = parseLj(JSON.stringify({ t: "tempo", bpm: 128, beat: 10.5, bar: 9, phraseBeat: -1 }))!;
    expect("bar" in bad || "phraseBeat" in bad).toBe(false);
  });
  it("Takt-Eins: Zähler 10,5 bei Beat 1 im Takt → um 2 Beats verschoben (8 oder 12 = Eins)", async () => {
    const { alignBeat } = await import("../src/core/ljlink");
    const off = alignBeat(0, 10.5, 1);
    expect(Math.abs(off)).toBe(2);
    expect(Math.floor(10.5 + off) % 4).toBe(0);
    // passt schon: bleibt
    expect(alignBeat(off, 11.5, 2)).toBe(off);
  });
  it("Phrase: Beat 1 der Phrase liegt danach auf einem Vielfachen von 16 (Alle 4 Takte)", async () => {
    const { alignBeat } = await import("../src/core/ljlink");
    const off = alignBeat(0, 37.3, 1, 1);
    expect(((Math.floor(37.3 + off) % 16) + 16) % 16).toBe(0);
    expect(Math.abs(off)).toBeLessThanOrEqual(8);
    // nur noch bar (keine Phrase): das 16er-Raster bleibt, solange die Eins stimmt
    expect(alignBeat(off, 41.3, 1)).toBe(off);
  });
  it("an der Beat-Grenze nichts ändern (Rundung beim Sender)", async () => {
    const { alignBeat } = await import("../src/core/ljlink");
    expect(alignBeat(0, 10.99, 1)).toBe(0);
    expect(alignBeat(0, 11.01, 1)).toBe(0);
  });
  it("handleLj: Tempo-Beat kommt ausgerichtet bei der Uhr an", async () => {
    const { handleLj } = await import("../src/core/control");
    const { newLjState } = await import("../src/core/ljlink");
    const { TempoClock: Tempo } = await import("../src/core/tempo");
    const c = { lj: newLjState(), tempo: new Tempo(), show: { autoVj: false, audio: {} }, rules: [] } as never;
    handleLj(c, { t: "tempo", bpm: 120, beat: 21.5, bar: 1, phraseBeat: 1 }, 1000);
    expect(((Math.floor((c as { tempo: { beatAt(n: number): number } }).tempo.beatAt(1000)) % 16) + 16) % 16).toBe(0);
  });
});
