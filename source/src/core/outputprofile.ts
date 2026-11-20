// Ausgabeprofile („Club A“, „Hochzeit“): Anordnung, Mapping, Bildflächen und Namen aller Ausgänge, unabhängig vom
// Projekt gespeichert. Beim Laden findet VJ-Link die Bildschirme wieder: gleiche ID, sonst Name und Auflösung,
// sonst nur Name oder nur Auflösung. Was keinem angeschlossenen Bildschirm zugeordnet werden kann, meldet es als fehlend.

import type { OutputLayout } from "./layout";
import { parseLayout } from "./project";

/** Ein Bildschirm, wie er beim Speichern angeschlossen war. */
export interface ProfileDisplay { id: number; label: string; w: number; h: number }
export interface OutputProfile { name: string; layout: OutputLayout; displays: ProfileDisplay[] }

export const MAX_PROFILES = 24;
export const PROFILE_NAME_MAX = 40;

/** Gespeicherte Bildschirme den angeschlossenen zuordnen (alte ID → neue ID). Jeder angeschlossene höchstens einmal. */
export function matchDisplays(saved: readonly ProfileDisplay[], now: readonly ProfileDisplay[]): Map<number, number> {
  const map = new Map<number, number>(), used = new Set<number>();
  const same = (a: ProfileDisplay, b: ProfileDisplay) => a.w === b.w && a.h === b.h;
  const passes: ((a: ProfileDisplay, b: ProfileDisplay) => boolean)[] = [
    (a, b) => a.id === b.id && a.label === b.label,
    (a, b) => a.label === b.label && same(a, b),
    (a, b) => a.id === b.id && same(a, b),
    (a, b) => a.label === b.label,
    (a, b) => same(a, b),
  ];
  for (const pass of passes) for (const s of saved) {
    if (map.has(s.id)) continue;
    const hit = now.find(n => !used.has(n.id) && pass(s, n));
    if (hit) { map.set(s.id, hit.id); used.add(hit.id); }
  }
  return map;
}

/** IDs im Layout umschreiben; Ausgänge, die nicht in `map` stehen, fallen weg. Fenster- und NDI-Ausgang (< 0) bleiben. */
export function remapLayout(layout: OutputLayout, map: ReadonlyMap<number, number>): OutputLayout {
  const to = (id: number): number | undefined => id < 0 ? id : map.get(id);
  const keyed = <T>(rec: Record<number, T> | undefined): Record<number, T> | undefined => {
    if (!rec) return undefined;
    const out: Record<number, T> = {};
    for (const [k, v] of Object.entries(rec)) { const n = to(Number(k)); if (n !== undefined) out[n] = v; }
    return Object.keys(out).length ? out : undefined;
  };
  const screens = layout.screens.flatMap(s => { const id = to(s.id); return id === undefined ? [] : [{ ...s, id }]; });
  const surfaces = layout.surfaces?.flatMap(s => { const screen = to(s.screen); return screen === undefined ? [] : [{ ...s, screen }]; });
  const masks = layout.masks?.flatMap(m => { const screen = to(m.screen); return screen === undefined ? [] : [{ ...m, screen }]; });
  const stage = layout.stage && {
    ...layout.stage,
    outputs: layout.stage.outputs.flatMap(o => { const display = to(o.display); return display === undefined ? [] : [{ ...o, display }]; }),
  };
  const devices = keyed(layout.devices), deviceEffects = keyed(layout.deviceEffects), screenImages = keyed(layout.screenImages);
  const out: OutputLayout = { ...layout, screens, surfaces, masks, stage };
  if (devices) out.devices = devices; else delete out.devices;
  if (screenImages) out.screenImages = screenImages; else delete out.screenImages;
  if (deviceEffects) out.deviceEffects = deviceEffects; else delete out.deviceEffects;
  return out;
}

/** Profil auf die angeschlossenen Bildschirme anwenden. `missing`: Namen der Bildschirme, die nicht gefunden wurden. */
export function applyProfile(p: OutputProfile, now: readonly ProfileDisplay[]): { layout: OutputLayout; missing: string[] } {
  const map = matchDisplays(p.displays, now);
  const named = (id: number) => p.layout.stage?.outputs.find(o => o.display === id)?.name;
  const missing = p.displays.filter(d => !map.has(d.id)).map(d => named(d.id) || d.label);
  return { layout: remapLayout(p.layout, map), missing };
}

/** Gespeicherte Profile prüfen (aus den Einstellungen, also nicht vertrauenswürdig). */
export function parseProfiles(raw: unknown): OutputProfile[] {
  if (!Array.isArray(raw)) return [];
  const out: OutputProfile[] = [];
  for (const p of raw.slice(0, MAX_PROFILES)) {
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim().slice(0, PROFILE_NAME_MAX) : "";
    if (!name || out.some(o => o.name === name)) continue;
    const displays: ProfileDisplay[] = [];
    if (Array.isArray(r.displays)) for (const d of r.displays.slice(0, 16)) {
      if (!d || typeof d !== "object") continue;
      const x = d as Record<string, unknown>;
      const ok = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;
      if (!ok(x.id, 0, Number.MAX_SAFE_INTEGER) || !ok(x.w, 1, 65536) || !ok(x.h, 1, 65536) || typeof x.label !== "string") continue;
      displays.push({ id: x.id as number, label: x.label.slice(0, 80), w: x.w as number, h: x.h as number });
    }
    out.push({ name, layout: parseLayout(r.layout), displays });
  }
  return out;
}
