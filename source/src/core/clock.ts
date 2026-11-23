// Uhrzeit-Leiste im Stil eines Lichtpults: Uhrzeit des Rechners oder (opt-in) der Art-Net-Timecode aus dem Netz.
// Gleiche Regeln wie in LJ-Link (Spezifikation „Uhrzeit-Leiste und Netz-Timecode“ der Link-Suite, gleicher Autor):
// 2 s ohne Timecode → wieder Uhrzeit; nur weiterzählen, solange der Timecode läuft (höchstens 200 ms);
// kleine Rücksprünge (≤ 5 Bilder) nicht zeigen; angehaltener Timecode zeigt genau sein Bild.
import { framesToTc, nominal, tcToFrames, type Tc, type TcFps } from "./timecode";

const p2 = (n: number): string => String(n).padStart(2, "0");

/** Uhrzeit als HH:MM:SS, 24 h. */
export const formatClock = (d: Date): string => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

/** Timecode als HH:MM:SS:FF, bei 29,97 Drop Frame HH:MM:SS;FF. */
export const formatTc = (tc: Tc, fps: TcFps): string => `${p2(tc.h)}:${p2(tc.m)}:${p2(tc.s)}${fps === 29.97 ? ";" : ":"}${p2(tc.f)}`;

/** Bildrate für die Anzeige: „25 fps“, „29.97df fps“. */
export const fpsLabel = (fps: TcFps): string => `${fps === 29.97 ? "29.97df" : fps} fps`;

/** Nach so vielen ms ohne gültiges Paket zeigt die Leiste wieder die Uhrzeit. */
export const TC_TIMEOUT_MS = 2000;
/** Höchstens so weit (ms) zwischen zwei Paketen selbst weiterzählen. */
const COAST_MS = 200;
/** Kleine Rücksprünge (Jitter, umgestellte Pakete) nicht zeigen. */
const BACK_JUMP = 5;

export function validTc(tc: Tc, fps: TcFps): boolean {
  return Number.isInteger(tc.h) && Number.isInteger(tc.m) && Number.isInteger(tc.s) && Number.isInteger(tc.f)
    && tc.h >= 0 && tc.h <= 23 && tc.m >= 0 && tc.m <= 59 && tc.s >= 0 && tc.s <= 59 && tc.f >= 0 && tc.f < nominal(fps);
}

/** Timecode aus dem Netz für die Anzeige (ohne Absender: die IP wird weder gespeichert noch gezeigt). */
export class NetTimecode {
  private last: { frames: number; fps: TcFps; at: number } | null = null;
  private running = false;

  /** Gültiges Paket übernehmen; ungültige und kleine Rücksprünge fallen weg. */
  feed(tc: Tc, fps: TcFps, nowMs: number): boolean {
    if (!validTc(tc, fps)) return false;
    const frames = tcToFrames(tc, fps), prev = this.last;
    if (prev && prev.fps === fps && frames < prev.frames && prev.frames - frames <= BACK_JUMP && nowMs - prev.at < TC_TIMEOUT_MS) return false;
    this.running = !!prev && prev.fps === fps && frames !== prev.frames && nowMs - prev.at < TC_TIMEOUT_MS;
    this.last = { frames, fps, at: nowMs };
    return true;
  }

  /** Kam in den letzten 2 s Timecode an? */
  live(nowMs: number): boolean { return !!this.last && nowMs - this.last.at <= TC_TIMEOUT_MS; }

  /** Anzuzeigender Timecode oder null (dann Uhrzeit). */
  current(nowMs: number): { tc: Tc; fps: TcFps } | null {
    const l = this.last;
    if (!l || nowMs - l.at > TC_TIMEOUT_MS) return null;
    const rate = l.fps === 29.97 ? 30000 / 1001 : l.fps;
    const extra = this.running ? Math.floor(Math.min(COAST_MS, Math.max(0, nowMs - l.at)) / 1000 * rate) : 0;
    return { tc: framesToTc(l.frames + extra, l.fps), fps: l.fps };
  }

  reset(): void { this.last = null; this.running = false; }
}

/** Was die Leiste zeigt: Uhrzeit oder Timecode, mit Label und rechtem Zusatz. */
export interface ClockView { mode: "time" | "timecode"; text: string; side: "" | "rate" | "none"; fps?: TcFps }

export function clockView(now: Date, nowMs: number, tcWanted: boolean, net: NetTimecode): ClockView {
  if (tcWanted) {
    const c = net.current(nowMs);
    if (c) return { mode: "timecode", text: formatTc(c.tc, c.fps), side: "rate", fps: c.fps };
    return { mode: "time", text: formatClock(now), side: "none" };
  }
  return { mode: "time", text: formatClock(now), side: "" };
}
