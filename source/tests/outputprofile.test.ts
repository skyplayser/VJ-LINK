import { describe, expect, it } from "vitest";
import { applyProfile, matchDisplays, parseProfiles, remapLayout, type OutputProfile } from "../src/core/outputprofile";
import { devicePlacement, type OutputLayout } from "../src/core/layout";

const beamer = { id: 11, label: "Beamer", w: 1920, h: 1080 };
const led = { id: 12, label: "LED-Controller", w: 1280, h: 1024 };

const ledLayout = (id: number, beamerId: number): OutputLayout => ({
  mode: "mapping",
  screens: [{ id: beamerId, label: "Beamer", x: 0, y: 0, w: 1920, h: 1080 }, { id, label: "LED-Controller", x: 1920, y: 0, w: 1280, h: 1024 }],
  surfaces: [{ id: "s1", screen: id, name: "Wand", corners: [[0, 0], [1, 0], [1, 1], [0, 1]], src: { x: 0, y: 0, w: 1, h: 1 }, on: true }],
  masks: [],
  devices: { [id]: { target: { x: 140, y: 56, w: 280, h: 112 }, source: null, fit: "stretch" } },
  deviceEffects: { [beamerId]: { kind: "projector", strobe: false, blinder: false } },
  stage: { name: "", outputs: [{ display: id, name: "LED-Wand" }] },
});

describe("Ausgabe-Bereich in Signalpixeln", () => {
  it("legt das Bild genau auf 140/56 · 280 × 112 eines 1280 × 1024-Ausgangs", () => {
    const p = devicePlacement({ target: { x: 140, y: 56, w: 280, h: 112 }, source: null, fit: "stretch" }, 1280, 1024, 1280, 1024);
    expect(p.image).toEqual({ x: 140, y: 56, w: 280, h: 112 });
    expect(p.region).toEqual([0, 0, 1, 1]);
  });
  it("hält beim Einpassen das Seitenverhältnis und zentriert im Bereich", () => {
    const p = devicePlacement({ target: { x: 140, y: 56, w: 280, h: 112 }, source: null, fit: "contain" }, 1920, 1080, 1280, 1024);
    expect(p.image.h).toBe(112);
    expect(p.image.w).toBe(199);
    expect(p.image.x).toBe(140 + Math.floor((280 - 199) / 2));
  });
});

describe("Ausgabeprofile", () => {
  it("findet Bildschirme über ID, dann Name und Auflösung, dann Auflösung", () => {
    const m = matchDisplays([beamer, led], [{ ...led, id: 99 }, { ...beamer }]);
    expect(m.get(11)).toBe(11);
    expect(m.get(12)).toBe(99);
    const byRes = matchDisplays([led], [{ id: 5, label: "Anderer Name", w: 1280, h: 1024 }]);
    expect(byRes.get(12)).toBe(5);
  });
  it("ordnet jeden angeschlossenen Bildschirm nur einmal zu", () => {
    const m = matchDisplays([{ ...led, id: 1 }, { ...led, id: 2 }], [{ ...led, id: 7 }]);
    expect([...m.values()]).toEqual([7]);
  });
  it("schreibt Mapping, Bereiche, Effekte und Namen auf die neuen IDs um", () => {
    const l = remapLayout(ledLayout(12, 11), new Map([[12, 40], [11, 41]]));
    expect(l.screens.map(s => s.id)).toEqual([41, 40]);
    expect(l.surfaces![0]!.screen).toBe(40);
    expect(Object.keys(l.devices!)).toEqual(["40"]);
    expect(l.deviceEffects![41]!.kind).toBe("projector");
    expect(l.stage!.outputs[0]).toEqual({ display: 40, name: "LED-Wand" });
  });
  it("meldet fehlende Bildschirme mit ihrem Namen und lässt ihre Einstellungen weg", () => {
    const p: OutputProfile = { name: "Club A", layout: ledLayout(12, 11), displays: [beamer, led] };
    const r = applyProfile(p, [{ id: 3, label: "Beamer", w: 1920, h: 1080 }]);
    expect(r.missing).toEqual(["LED-Wand"]);
    expect(r.layout.devices).toBeUndefined();
    expect(r.layout.screens.map(s => s.id)).toEqual([3]);
  });
  it("prüft gespeicherte Profile: ohne Namen, doppelt oder kaputt fällt weg", () => {
    const good = { name: "Club A", layout: ledLayout(12, 11), displays: [beamer, led] };
    const list = parseProfiles([good, { name: "  " }, { ...good }, { name: "Hochzeit", layout: "x", displays: [{ id: -1, label: 3 }] }, null]);
    expect(list.map(p => p.name)).toEqual(["Club A", "Hochzeit"]);
    expect(list[0]!.layout.devices?.[12]?.target).toEqual({ x: 140, y: 56, w: 280, h: 112 });
    expect(list[1]!.displays).toEqual([]);
    expect(list[1]!.layout.mode).toBe("mirror");
    expect(parseProfiles("kaputt")).toEqual([]);
  });
});
