import { describe, expect, it } from "vitest";
import { defaultShow, soloLayer, MAIN_STACK } from "../src/core/show";
import { MONITOR_VIEWS, monitorPanes } from "../src/core/monitor";

describe("Vorschau-Fenster", () => {
  it("Ebenen-Vorschau: nur die gewählte Ebene, voll sichtbar, ohne Master/Blackout/Strobe/Ablauf", () => {
    const s = defaultShow();
    s.layers.forEach(l => { l.opacity = 0.4; });
    s.layers[1]!.opacity = 0;
    Object.assign(s, { master: 0.2, blackout: true, blinder: 1, testCard: true });
    s.strobe.on = true; s.strobe.white = true;
    const p = soloLayer(s, 1);
    expect(p.layers.map(l => l.opacity)).toEqual(s.layers.map((_, i) => (i === 1 ? 1 : 0)));
    expect(p.stacks?.[MAIN_STACK]).toBe(p.layers);
    expect(p.master).toBe(1); expect(p.blackout).toBe(false); expect(p.blinder).toBe(0); expect(p.testCard).toBe(false);
    expect(p.strobe.on || p.strobe.white || p.strobe.flash || p.strobe.whiteFlash).toBe(false);
    expect(p.cues).toEqual([]); expect(p.transition).toBeNull();
    // Original bleibt unverändert
    expect(s.layers[1]!.opacity).toBe(0); expect(s.blackout).toBe(true);
  });
  it("unbekannte Ebene: alles aus", () => {
    const p = soloLayer(defaultShow(), 99);
    expect(p.layers.every(l => l.opacity === 0)).toBe(true);
  });
  it("Ansichten: nur sichtbare Bilder werden gerechnet", () => {
    expect(MONITOR_VIEWS).toEqual(["side", "stack", "preview", "live"]);
    expect(monitorPanes("side")).toEqual({ preview: true, live: true });
    expect(monitorPanes("stack")).toEqual({ preview: true, live: true });
    expect(monitorPanes("preview")).toEqual({ preview: true, live: false });
    expect(monitorPanes("live")).toEqual({ preview: false, live: true });
  });
});
