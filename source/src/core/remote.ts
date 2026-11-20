import type { Rgb } from "./show";

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
  | { kind: "hold"; effect: RemoteEffect; active: boolean; seq: number };

export interface RemoteState {
  /** Sprache von VJ-Link: die Handyseite folgt ihr. */
  lang?: "de" | "en";
  bpm: number;
  tempoSource: string;
  stack: string;
  stackName: string;
  layers: { name: string; active: string | null; clips: { id: string; name: string }[] }[];
  slots: Rgb[];
  speed: number;
  intensity: number;
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
    case "clip": return stack && index(r.layer, 8) && (r.id === null || (typeof r.id === "string" && r.id.length <= 160))
      ? { kind: "clip", stack, layer: r.layer, id: r.id } : null;
    case "color": return index(r.slot, 5) && index(r.preset, REMOTE_COLORS.length)
      ? { kind: "color", slot: r.slot, preset: r.preset } : null;
    case "assign": return stack && index(r.layer, 8) && index(r.slot, 5)
      ? { kind: "assign", stack, layer: r.layer, slot: r.slot } : null;
    case "strobeValue": return (r.control === "speed" || r.control === "intensity") && typeof r.value === "number" && r.value >= 0 && r.value <= 1
      ? { kind: "strobeValue", control: r.control, value: r.value } : null;
    case "hold": return REMOTE_EFFECTS.includes(r.effect as RemoteEffect) && typeof r.active === "boolean" && index(r.seq, Number.MAX_SAFE_INTEGER)
      ? { kind: "hold", effect: r.effect as RemoteEffect, active: r.active, seq: r.seq } : null;
    default: return null;
  }
}
