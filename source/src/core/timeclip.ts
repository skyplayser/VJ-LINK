// Zeit-Clips: Uhrzeit, Countdown (bis zu einer Uhrzeit oder mit fester Dauer), Stoppuhr, Datum und BPM als Bild.
// Reine Logik: was gerade angezeigt wird. Jedes Fenster (Vorschau, Ausgänge) rechnet das selbst aus der eigenen
// Uhr, darum laufen alle Ausgänge gleich, ohne dass Bilder verschickt werden. Gezeichnet wird in engine/timeclip.ts.
import { t } from "./i18n";
import { formatFrames, type TcFps } from "./timecode";

export const TIME_CLIPS = ["time-clock", "time-countdown", "time-timer", "time-stopwatch", "time-date", "time-bpm", "time-timecode"] as const;
export type TimeClipId = typeof TIME_CLIPS[number];
export const isTimeClip = (id: string | null | undefined): id is TimeClipId => !!id && (TIME_CLIPS as readonly string[]).includes(id);

export const TIME_STYLES = ["clean", "digital", "led"] as const;
export type TimeStyle = typeof TIME_STYLES[number];

export interface TimeSettings {
  /** Klar (fette Schrift), Digital (gleich breite Ziffern), LED (Punktmatrix wie die Uhr oben). */
  style: TimeStyle;
  /** Sekunden zeigen (Uhrzeit, Countdown, Stoppuhr). */
  seconds: boolean;
  /** Countdown bis Uhrzeit: Ziel „HH:MM“ oder „HH:MM:SS“ (nächstes Mal, an dem es so weit ist). */
  target: string;
  /** Countdown mit Dauer: Minuten ab dem Moment, in dem der Clip startet. */
  minutes: number;
  /** Zeile über der Zeit, z. B. „DOORS OPEN IN“ (leer = keine). */
  label: string;
  /** Text, wenn der Countdown abgelaufen ist, z. B. „HAPPY NEW YEAR“ (leer = 00:00). */
  end: string;
  /** Größe: Anteil der Bildbreite, den die Zeit höchstens einnimmt (0,2–1). */
  size: number;
  /** Countdown: die letzten 10 Sekunden pulsieren. */
  pulse: boolean;
}

export const defaultTime = (): TimeSettings =>
  ({ style: "clean", seconds: true, target: "00:00", minutes: 10, label: "", end: "", size: 0.7, pulse: true });

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").slice(0, max) : "");

/** Uhrzeit „H:MM“ oder „H:MM:SS“ → Sekunden seit Mitternacht; null, wenn ungültig. */
export function parseClock(s: string): number | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]), se = Number(m[3] ?? 0);
  return h < 24 && mi < 60 && se < 60 ? h * 3600 + mi * 60 + se : null;
}
/** Sekunden seit Mitternacht → „HH:MM“ bzw. „HH:MM:SS“ (Sekunden nur, wenn nicht 0 oder verlangt). */
export function formatClock(sec: number, withSeconds = sec % 60 !== 0): string {
  const s = ((Math.floor(sec) % 86400) + 86400) % 86400;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}${withSeconds ? `:${p(s % 60)}` : ""}`;
}

/** Angaben aus einer Datei prüfen; fehlt etwas, gilt die Vorgabe. */
export function parseTime(v: unknown): TimeSettings | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const o = v as Record<string, unknown>, d = defaultTime();
  const target = typeof o.target === "string" && parseClock(o.target) !== null ? o.target.trim() : d.target;
  return {
    style: (TIME_STYLES as readonly string[]).includes(o.style as string) ? o.style as TimeStyle : d.style,
    seconds: o.seconds !== false, target, minutes: num(o.minutes, d.minutes, 0.1, 1440),
    label: str(o.label, 60), end: str(o.end, 60), size: num(o.size, d.size, 0.2, 1), pulse: o.pulse !== false,
  };
}

export interface TimeView {
  /** Große Zeile (Zeit, Datum, BPM oder Ende-Text). */
  main: string;
  /** Kleine Zeile darüber (leer = keine). */
  label: string;
  /** Kleine Zeile darunter (z. B. Takt-Punkte bei BPM). */
  sub: string;
  /** Zeit in Ziffern (LED-Stil möglich); false bei Datum und Ende-Text. */
  digits: boolean;
  /** Countdown: Sekunden bis 0 (für das Pulsieren), sonst Infinity. */
  left: number;
}

const p2 = (n: number) => String(n).padStart(2, "0");
/** Dauer in Sekunden → „H:MM:SS“ ab einer Stunde, sonst „MM:SS“ (ohne Sekunden: „H:MM“ bzw. „0:MM“). */
export function formatDuration(sec: number, withSeconds = true): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60;
  if (!withSeconds) return `${h}:${p2(m)}`;
  return h > 0 ? `${h}:${p2(m)}:${p2(r)}` : `${p2(m)}:${p2(r)}`;
}

/** Bis so lange nach dem Ziel bleibt der Countdown bei 0 bzw. beim Ende-Text (danach zählt er auf das nächste Mal). */
export const COUNTDOWN_AFTER_S = 30 * 60;

/** Sekunden bis zur Ziel-Uhrzeit (lokale Zeit); kurz nach dem Ziel negativ (bis −30 min), sonst das nächste Mal. */
export function secondsUntil(target: string, now: Date): number {
  const goal = parseClock(target) ?? 0;
  const cur = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
  let d = goal - cur;
  if (d < -COUNTDOWN_AFTER_S) d += 86400;
  else if (d > 86400 - COUNTDOWN_AFTER_S) d -= 86400;
  return d;
}

/**
 * Was ein Zeit-Clip jetzt zeigt. `startMs`: wann der Clip auf dieser Ebene begonnen hat (für Dauer und Stoppuhr),
 * `beat`/`bpm` aus dem Takt, `lang` für das Datum.
 */
export function timeView(id: TimeClipId, s: TimeSettings, nowMs: number, startMs: number, bpm: number, beat: number, lang: "de" | "en",
  tc?: { frames: number; fps: number; running: boolean; at: number } | null): TimeView {
  const now = new Date(nowMs);
  const base = { label: s.label.trim(), sub: "", digits: true, left: Infinity };
  switch (id) {
    case "time-clock":
      return { ...base, main: `${p2(now.getHours())}:${p2(now.getMinutes())}${s.seconds ? `:${p2(now.getSeconds())}` : ""}` };
    case "time-countdown":
    case "time-timer": {
      const left = id === "time-timer" ? s.minutes * 60 - (nowMs - startMs) / 1000 : secondsUntil(s.target, now);
      // Aufrunden: „00:01“ steht die letzte Sekunde lang, 0 erst, wenn es so weit ist
      if (left <= 0) return s.end.trim() ? { ...base, main: s.end.trim(), digits: false, left: 0 } : { ...base, main: formatDuration(0, s.seconds), left: 0 };
      return { ...base, main: formatDuration(Math.ceil(left), s.seconds), left };
    }
    case "time-stopwatch":
      return { ...base, main: formatDuration((nowMs - startMs) / 1000, true) };
    case "time-date": {
      const loc = lang === "en" ? "en-GB" : "de-DE";
      return { ...base, digits: false, main: now.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }),
        label: base.label || now.toLocaleDateString(loc, { weekday: "long" }) };
    }
    case "time-timecode": {
      // Zwischen zwei Meldungen weiterzählen (läuft er, sonst steht er)
      if (!tc) return { ...base, main: "--:--:--:--", sub: t("kein Timecode") };
      const f = Math.max(0, Math.floor(tc.frames + (tc.running ? ((nowMs - tc.at) / 1000) * tc.fps : 0)));
      return { ...base, main: formatFrames(f, tc.fps as TcFps), sub: tc.running ? "" : t("angehalten") };
    }
    case "time-bpm": {
      const b = Math.round(bpm * 10) / 10;
      const inBar = ((Math.floor(beat) % 4) + 4) % 4;
      return { ...base, main: Number.isInteger(b) ? String(b) : b.toFixed(1), label: base.label || "BPM", sub: [0, 1, 2, 3].map(i => (i === inBar ? "●" : "○")).join(" ") };
    }
  }
}

/** Anzeigenamen (Bibliothek, Panel). */
export const TIME_CLIP_NAME: Record<TimeClipId, string> = {
  "time-clock": t("Uhrzeit"), "time-countdown": t("Countdown bis Uhrzeit"), "time-timer": t("Countdown (Dauer)"),
  "time-stopwatch": t("Stoppuhr"), "time-date": t("Datum"), "time-bpm": t("BPM-Anzeige"), "time-timecode": t("Timecode-Anzeige"),
};
