// Videoformate beim Import: Was Chromium (Electron) selbst abspielt, wird nur kopiert. Alles andere – vor allem
// ProRes, Animation (QTRLE) und PNG-MOV, wie sie für transparente Logos exportiert werden – wandelt VJ-Link mit
// ffmpeg um: mit Transparenz in WebM (VP9 mit Alpha), ohne in MP4 (H.264). Beides spielt Chromium auf Mac und
// Windows ab, WebM mit echter Transparenz.

export interface VideoInfo {
  /** Codec des ersten Videostreams, z. B. „h264“, „prores“, „qtrle“. */
  codec: string;
  /** Pixelformat, z. B. „yuv420p“, „yuva444p12le“, „argb“. */
  pixFmt: string;
  /** Länge in Sekunden (0 = unbekannt). */
  duration: number;
  width: number;
  height: number;
  /** Hat einen Tonkanal. */
  audio: boolean;
  /** Durchsichtige Bereiche möglich (Pixelformat mit Alpha oder VP8/VP9 mit Alpha-Kanal). */
  alpha: boolean;
}

/** Pixelformate mit Alphakanal (ffmpeg-Namen). */
const ALPHA_FMT = /^(yuva|argb|rgba|bgra|abgr|ya\d|gbrap|rgba64|bgra64|pal8)/;

/** Liest die Angaben aus der Ausgabe von `ffmpeg -hide_banner -i <datei>` (stderr). null = kein Video gefunden. */
export function parseFfmpegInfo(text: string): VideoInfo | null {
  const v = /Stream #\d+:\d+[^:]*: Video: ([a-z0-9_]+)[^,\n]*,\s*([a-z0-9_]+)[^,\n]*(?:\([^)\n]*\))?[^\n]*?(\d{2,5})x(\d{2,5})/i.exec(text);
  if (!v) return null;
  const d = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(text);
  const duration = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  const codec = v[1]!.toLowerCase(), pixFmt = v[2]!.toLowerCase();
  // VP8/VP9 in WebM tragen Alpha in einem eigenen Strom; ffmpeg zeigt das als Metadaten „alpha_mode : 1“
  const alpha = ALPHA_FMT.test(pixFmt) || ((codec === "vp9" || codec === "vp8") && /alpha_mode\s*:\s*1/i.test(text));
  return { codec, pixFmt, duration, width: Number(v[3]), height: Number(v[4]), audio: /Stream #\d+:\d+[^:]*: Audio:/.test(text), alpha };
}

export type ImportPlan = "copy" | "alpha" | "plain";

/**
 * Was beim Import passiert: „copy“ = Datei unverändert übernehmen, „alpha“ = in WebM mit Transparenz umwandeln,
 * „plain“ = in MP4 (H.264) umwandeln.
 */
export function planImport(info: VideoInfo, platform: string): ImportPlan {
  const c = info.codec, f = info.pixFmt;
  // H.264 nur in 8 Bit 4:2:0 (High 4:2:2/4:4:4 und 10 Bit kann Chromium nicht dekodieren)
  if (c === "h264") return /^yuvj?420p$/.test(f) ? "copy" : "plain";
  if (c === "vp8" || c === "vp9" || c === "av1") return /^(yuva?420p|yuvj420p|yuv420p10le)$/.test(f) ? "copy" : info.alpha ? "alpha" : "plain";
  // HEVC (auch „HEVC mit Alpha“ aus Final Cut/Motion) spielt Chromium nur auf dem Mac, dort mit Transparenz
  if (c === "hevc") return platform === "darwin" && /^(yuv420p|yuv420p10le)$/.test(f) ? "copy" : info.alpha ? "alpha" : "plain";
  return info.alpha ? "alpha" : "plain";
}

/** ffmpeg-Argumente für die Umwandlung (ohne Programmpfad). Fortschritt kommt über `-progress pipe:1`. */
export function convertArgs(src: string, dst: string, plan: Exclude<ImportPlan, "copy">, audio: boolean): string[] {
  const even = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  const common = ["-hide_banner", "-nostdin", "-y", "-i", src, "-map", "0:v:0", ...(audio ? ["-map", "0:a:0"] : []), "-vf", even];
  const progress = ["-progress", "pipe:1", "-nostats"];
  if (plan === "alpha")
    return [...common, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "26", "-deadline", "good", "-cpu-used", "4",
      "-row-mt", "1", "-auto-alt-ref", "0", ...(audio ? ["-c:a", "libopus", "-b:a", "160k"] : []), ...progress, dst];
  return [...common, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    ...(audio ? ["-c:a", "aac", "-b:a", "192k"] : []), ...progress, dst];
}

/** Fortschritt aus der `-progress`-Ausgabe (0…1), null wenn keine Zeitangabe in diesem Stück steht. */
export function parseProgress(chunk: string, duration: number): number | null {
  const m = /out_time_(?:us|ms)=(\d+)/.exec(chunk);
  if (!m || !(duration > 0)) return null;
  return Math.max(0, Math.min(1, Number(m[1]) / 1e6 / duration));
}
