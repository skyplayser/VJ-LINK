import { describe, expect, it } from "vitest";
import { assignSeparate, imageForScreen, type OutputLayout } from "../src/core/layout";
import { remapLayout } from "../src/core/outputprofile";
import { parseProject, serializeProject } from "../src/core/project";
import { addImage, defaultScenes, defaultShow, imageList, MAIN_STACK, showForImage } from "../src/core/show";
import { applyEmpty } from "../src/core/starter";
import { TempoClock } from "../src/core/tempo";
import { newCueState } from "../src/core/video";
import { CLUB_STANDARD_RULES, newLjState } from "../src/core/ljlink";
import type { ControlContext } from "../src/core/control";

function ctx(): ControlContext {
  return { show: defaultShow(), tempo: new TempoClock(), scenes: defaultScenes(), lj: newLjState(),
    cues: newCueState(), rules: CLUB_STANDARD_RULES.map(r => ({ ...r })), bank: 1 };
}

const two = (mode: OutputLayout["mode"] = "separate"): OutputLayout => ({
  mode, screens: [{ id: 1, label: "Links", x: 0, y: 0, w: 1920, h: 1080 }, { id: 2, label: "Rechts", x: 1920, y: 0, w: 1920, h: 1080 }],
});

describe("Ausgabe-Modus „Getrennt“", () => {
  it("zeigt nur im Modus „Getrennt“ ein anderes Bild als Bild 1, unbekannte Bilder fallen auf Bild 1 zurück", () => {
    const l = { ...two(), screenImages: { 2: "b2" } };
    expect(imageForScreen(l, 2, ["main", "b2"])).toBe("b2");
    expect(imageForScreen(l, 1, ["main", "b2"])).toBe("main");
    expect(imageForScreen(l, 2, ["main"])).toBe("main");
    expect(imageForScreen({ ...l, mode: "mirror" }, 2, ["main", "b2"])).toBe("main");
    expect(imageForScreen({ ...l, mode: "mapping" }, 2, ["main", "b2"])).toBe("main");
  });

  it("gibt beim Wechsel jedem weiteren Ausgang ein eigenes Bild und legt fehlende an", () => {
    const s = defaultShow();
    const r = assignSeparate(two(), [1, 2], imageList(s).map(i => i.id), () => addImage(s));
    expect(r.created).toBe(1);
    expect(r.layout.screenImages).toEqual({ 1: "main", 2: "b2" });
    expect(imageList(s).map(i => i.id)).toEqual(["main", "b2"]);
    // zweimal wechseln legt nichts doppelt an und behält die Wahl
    const again = assignSeparate(r.layout, [1, 2], imageList(s).map(i => i.id), () => addImage(s));
    expect(again.created).toBe(0);
    expect(again.layout.screenImages).toEqual({ 1: "main", 2: "b2" });
  });

  it("nimmt vorhandene freie Bilder zuerst und hört bei fünf Bildern auf", () => {
    const s = defaultShow();
    addImage(s); // b2 gibt es schon
    const ids = [1, 2, 3, 4, 5, 6, 7];
    const r = assignSeparate({ mode: "separate", screens: [] }, ids, imageList(s).map(i => i.id), () => addImage(s));
    expect(r.created).toBe(3);
    expect(Object.values(r.layout.screenImages!)).toEqual(["main", "b2", "b3", "b4", "b5", "main", "main"]);
  });

  it("verwirft Zuordnungen zu gelöschten Bildern", () => {
    const s = defaultShow();
    const r = assignSeparate({ ...two(), screenImages: { 1: "weg", 2: "auch-weg" } }, [1, 2], ["main"], () => addImage(s));
    expect(r.layout.screenImages).toEqual({ 1: "main", 2: "b2" });
  });

  it("speichert die Zuordnung im Projekt und prüft sie beim Laden", () => {
    const c = ctx();
    const json = serializeProject(c, [], [], [], { ...two(), screenImages: { 1: "main", 2: "b2", [-2]: "b3" } });
    expect(parseProject(json)!.outputs).toMatchObject({ mode: "separate", screenImages: { 1: "main", 2: "b2", [-2]: "b3" } });
    const bad = JSON.parse(json);
    bad.outputs.screenImages = { 1: "../x", abc: "b2", 3: 7, 4: "b4" };
    expect(parseProject(JSON.stringify(bad))!.outputs.screenImages).toEqual({ 4: "b4" });
  });

  it("Ausgabeprofile nehmen die Bild-Zuordnung zu den wiedergefundenen Bildschirmen mit", () => {
    const l = remapLayout({ ...two(), screenImages: { 1: "main", 2: "b2", [-2]: "b3" } }, new Map([[1, 7], [2, 8]]));
    expect(l.screenImages).toEqual({ 7: "main", 8: "b2", [-2]: "b3" });
  });

  it("rechnet ein Bild als Hauptbild, Cues nur auf dem Bild des SHOW-Ablaufs", () => {
    const s = defaultShow();
    const id = addImage(s)!;
    s.stacks![id]![0]!.clip = "plasma";
    s.cues = [{ id: "x" } as unknown as typeof s.cues[number]];
    const on2 = showForImage(s, id, id);
    expect(on2.layers[0]!.clip).toBe("plasma");
    expect(on2.stacks![MAIN_STACK]![0]!.clip).toBe("plasma");
    expect(on2.cues.length).toBe(1);
    const on1 = showForImage(s, MAIN_STACK, id);
    expect(on1.layers[0]!.clip).toBe(s.layers[0]!.clip);
    expect(on1.cues.length).toBe(0);
  });
});

describe("Leeres Projekt", () => {
  it("vier leere Ebenen, keine Clips, keine Effekte, keine Szenen, nichts läuft", () => {
    const c = ctx();
    applyEmpty(c);
    expect(c.show.layers.length).toBe(4);
    for (const l of c.show.layers) { expect(l.clip).toBeNull(); expect(l.clips).toEqual([]); expect(l.effects).toEqual([]); }
    expect(c.scenes).toEqual([]);
    expect(c.show.scene).toBe(0);
    expect(c.show.autoVj).toBe(false);
  });
});
