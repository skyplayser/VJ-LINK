import { MAX_LAYERS, type Rgb } from "./show";

export const REMOTE_COLORS = [
  ["Eis", "#52e7ff"], ["Blau", "#4874ff"], ["Violett", "#a76eff"], ["Pink", "#ff55ae"],
  ["Rot", "#ff484f"], ["Amber", "#ffaa42"], ["Gelb", "#ffe45e"], ["Grün", "#5cf598"],
  ["Warmweiß", "#ffe8c7"], ["Weiß", "#ffffff"],
] as const;

export const REMOTE_EFFECTS = ["strobe", "white", "blinder"] as const;
export type RemoteEffect = typeof REMOTE_EFFECTS[number];
export type RemoteCommand =
  | { kind: "clip"; stack: string; layer: number; id: string | null }
  | { kind: "color"; slot: number; preset: number }
  | { kind: "assign"; stack: string; layer: number; slot: number }
  | { kind: "tap" }
  | { kind: "strobeValue"; control: "speed" | "intensity"; value: number }
  | { kind: "hold"; effect: RemoteEffect; active: boolean; seq: number }
  | { kind: "scene"; index: number }
  | { kind: "show"; action: RemoteShowAction }
  /** Regler aus der Liste unten (gleiche IDs wie MIDI und OSC), Wert 0–1. */
  | { kind: "control"; id: string; value: number }
  | { kind: "bpm"; value: number }
  /** Text eines Text-Clips auf einer Ebene ändern. */
  | { kind: "text"; layer: number; clip: string; text: string }
  /** Zeit-Clip einer Ebene: Ziel-Uhrzeit, Minuten, Zeilen oder neu starten. */
  | { kind: "time"; layer: number; field: RemoteTimeField; value: string }
  /** SHOW: diesen Cue als nächsten setzen. */
  | { kind: "cueNext"; index: number }
  /** Mehrere Bilder: dieses Bild bearbeiten. */
  | { kind: "stack"; id: string };
export const REMOTE_TIME_FIELDS = ["target", "minutes", "label", "end", "restart"] as const;
export type RemoteTimeField = typeof REMOTE_TIME_FIELDS[number];

/**
 * Regler, die das Handy stellen darf (alles andere bleibt am Rechner): Master, Blackout, Effekte, Szenen-Übergang,
 * Auto, Szene weiter/zurück, Testbild, Strobe/Blinder Dauer-An, Timecode-Uhr und je Ebene Deckkraft und Mischmodus.
 */
export const REMOTE_CONTROL = /^(master|blackout|fx\.master|transition\.(beats|style)|scene\.(next|prev|auto)|test\.(toggle|next|prev)|strobe\.(on|white)|blinder\.on|tc\.(start|stop|zero)|layer\.([1-9]|1\d|20)\.(opacity|blend))$/;
/** Regler, deren Stand das Handy angezeigt bekommt (ohne Ebenen; die kommen je Ebene mit). */
export const REMOTE_STATE_CONTROLS = ["master", "blackout", "fx.master", "transition.beats", "transition.style", "scene.auto", "test.toggle", "strobe.on", "strobe.white", "blinder.on"] as const;

/** Stand eines Reglers fürs Handy: Wert 0–1 und, wenn Prozent nicht passt, die Anzeige („2 Beats“). */
export interface RemoteControlValue { v: number; text?: string; /** Stufen (z. B. Übergangsarten), für ◀ ▶ auf dem Handy. */ steps?: number }
export const REMOTE_SHOW_ACTIONS = ["go", "back", "stop"] as const;
export type RemoteShowAction = typeof REMOTE_SHOW_ACTIONS[number];

/** SHOW-Ablauf für das Handy: wie viele Cues, was läuft (mit Restzeit), was als Nächstes kommt. */
export interface RemoteShow {
  count: number;
  /** Laufender Cue („3 · Intro“), leer wenn nichts läuft. */
  current: string;
  /** Restzeit des laufenden Cues in Sekunden (null = läuft bis WEITER). */
  remaining: number | null;
  /** Nächster Cue („4 · Logo groß“), leer am Ende. */
  next: string;
  /** Alle Cues („1 · Intro“ …) mit dem laufenden und dem nächsten (Index ab 0, −1 = keiner). */
  list?: string[];
  currentIndex?: number;
  nextIndex?: number;
  /** Was WEITER tut, wie im Programm („startet Cue 4 „Logo groß““). */
  goLabel: string;
}

export interface RemoteState {
  /** Sprache von VJ-Link: die Handyseite folgt ihr. */
  lang?: "de" | "en";
  bpm: number;
  tempoSource: string;
  stack: string;
  stackName: string;
  layers: {
    name: string; active: string | null; clips: { id: string; name: string }[];
    opacity?: number; blend?: string; color?: string;
    /** Text-Clips der Zeile mit ihrem Text (zum Ändern vom Handy). */
    texts?: { id: string; text: string }[];
    /** Zeit-Clip der Ebene (wenn einer in der Zeile ist). */
    time?: { clip: string; name: string; target: string; minutes: number; label: string; end: string };
  }[];
  slots: Rgb[];
  speed: number;
  intensity: number;
  /** Szenen (Namen) und die aktive (Index ab 0, −1 = keine). */
  scenes?: string[];
  scene?: number;
  show?: RemoteShow;
  controls?: Record<string, RemoteControlValue>;
  /** Mehrere Bilder (Mapping, Getrennt): zum Wählen, welches bearbeitet wird. */
  images?: { id: string; name: string }[];
  /** Testbild: Name des gewählten. */
  testPattern?: string;
  /** Offene Ausgänge (Anzahl) für den Überblick. */
  outputs?: number;
}

export interface RemoteInfo {
  addresses: string[];
  address?: string;
  url?: string;
  code?: string;
  error?: string;
}

/** Der Kopplungscode ist ein Fragment; der Browser sendet ihn erst im Kopplungs-POST. */
export function remotePairingUrl(address: string, code: string): string {
  const url = new URL(address);
  url.hash = new URLSearchParams({ pair: code }).toString();
  return url.href;
}

export function remotePairingCode(hash: string): string | null {
  const code = new URLSearchParams(hash.replace(/^#/, "")).get("pair");
  return code && /^[0-9]{8}$/.test(code) ? code : null;
}

export const presetRgb = (index: number): Rgb => {
  const hex = REMOTE_COLORS[index]![1];
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return [channel(1), channel(3), channel(5)];
};

export function remoteCommand(raw: unknown): RemoteCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const index = (value: unknown, limit: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value < limit;
  const stack = typeof r.stack === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(r.stack) ? r.stack : null;
  switch (r.kind) {
    case "tap": return { kind: "tap" };
    case "clip": return stack && index(r.layer, MAX_LAYERS) && (r.id === null || (typeof r.id === "string" && r.id.length <= 160))
      ? { kind: "clip", stack, layer: r.layer, id: r.id } : null;
    case "color": return index(r.slot, 5) && index(r.preset, REMOTE_COLORS.length)
      ? { kind: "color", slot: r.slot, preset: r.preset } : null;
    case "assign": return stack && index(r.layer, MAX_LAYERS) && index(r.slot, 5)
      ? { kind: "assign", stack, layer: r.layer, slot: r.slot } : null;
    case "strobeValue": return (r.control === "speed" || r.control === "intensity") && typeof r.value === "number" && r.value >= 0 && r.value <= 1
      ? { kind: "strobeValue", control: r.control, value: r.value } : null;
    case "hold": return REMOTE_EFFECTS.includes(r.effect as RemoteEffect) && typeof r.active === "boolean" && index(r.seq, Number.MAX_SAFE_INTEGER)
      ? { kind: "hold", effect: r.effect as RemoteEffect, active: r.active, seq: r.seq } : null;
    case "scene": return index(r.index, 1000) ? { kind: "scene", index: r.index } : null;
    case "show": return REMOTE_SHOW_ACTIONS.includes(r.action as RemoteShowAction) ? { kind: "show", action: r.action as RemoteShowAction } : null;
    case "control": return typeof r.id === "string" && REMOTE_CONTROL.test(r.id) && typeof r.value === "number" && r.value >= 0 && r.value <= 1
      ? { kind: "control", id: r.id, value: r.value } : null;
    case "bpm": return typeof r.value === "number" && r.value >= 20 && r.value <= 300 ? { kind: "bpm", value: Math.round(r.value * 100) / 100 } : null;
    case "text": return index(r.layer, MAX_LAYERS) && typeof r.clip === "string" && /^img:[\w-]{1,80}$/.test(r.clip) && typeof r.text === "string" && r.text.length <= 240
      ? { kind: "text", layer: r.layer, clip: r.clip, text: r.text.replace(/[\u0000-\u0009\u000b-\u001f]/g, "") } : null;
    case "time": return index(r.layer, MAX_LAYERS) && REMOTE_TIME_FIELDS.includes(r.field as RemoteTimeField) && typeof r.value === "string" && r.value.length <= 60
      ? { kind: "time", layer: r.layer, field: r.field as RemoteTimeField, value: r.value.replace(/[\u0000-\u001f]/g, " ") } : null;
    case "cueNext": return index(r.index, 1000) ? { kind: "cueNext", index: r.index } : null;
    case "stack": return stack ? { kind: "stack", id: stack } : null;
    default: return null;
  }
}
