import { describe, expect, it } from "vitest";
import { modActive, modulate, newModulation, parseMods, rangeValue } from "../src/core/modulation";

describe("Modulation: Bewegungsrahmen von–bis", () => {
  it("neue Modulation: ±10 % um die jetzige Stellung statt Vollausschlag", () => {
    const m = newModulation("layer.1.opacity", 0.7);
    expect(m.range!.lo).toBeCloseTo(0.6);
    expect(m.range!.hi).toBeCloseTo(0.8);
    expect(newModulation("layer.1.opacity", 0.02).range!.lo).toBe(0);
    expect(newModulation("layer.1.opacity").range).toBeUndefined();
  });

  it("der Wert bleibt im Rahmen, egal wo der Regler steht", () => {
    const m = { ...newModulation("layer.1.opacity"), range: { lo: 0.2, hi: 0.4 } };
    for (let b = 0; b < 8; b += 0.13) {
      const v = modulate(m, 1, b, []);
      expect(v).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(v).toBeLessThanOrEqual(0.4 + 1e-9);
    }
    expect(rangeValue({ lo: 0.8, hi: 0.2 }, 1)).toBeCloseTo(0.2); // umgekehrt geht auch
  });

  it("Audio: Stille = von, voller Pegel = bis", () => {
    const m = { ...newModulation("layer.1.opacity"), source: "bass" as const, range: { lo: 0.1, hi: 0.5 } };
    expect(modulate(m, 0.9, 0, [0, 0, 0, 0, 0, 0, 0, 0])).toBeCloseTo(0.1);
    expect(modulate(m, 0.9, 0, [1, 1, 0, 0, 0, 0, 0, 0])).toBeCloseTo(0.5);
  });

  it("aktiv nur mit Ausschlag; Rahmen übersteht Speichern und Laden", () => {
    expect(modActive({ ...newModulation("layer.1.opacity"), range: { lo: 0.3, hi: 0.3 } })).toBe(false);
    const [p] = parseMods([{ target: "layer.1.opacity", source: "sine", beats: 4, depth: 0.5, on: true, range: { lo: -1, hi: 0.4 } }]);
    expect(p!.range).toEqual({ lo: 0, hi: 0.4 });
    expect(parseMods([{ target: "layer.1.opacity", range: { lo: "x" } }])[0]!.range).toBeUndefined();
  });
});
