// ffmpeg als eigenes Programm (mitgeliefert unter resources/ffmpeg, GPL, siehe THIRD_PARTY_LICENSES): Videos beim
// Import prüfen und bei Bedarf umwandeln. Aufruf immer mit Argumentliste, nie über eine Shell.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { convertArgs, parseFfmpegInfo, parseProgress, planImport, type ImportPlan, type VideoInfo } from "../core/videoformat";

/** Pfad zum ffmpeg-Programm oder null. Entwicklung: vendor/ffmpeg/<system>, sonst ein installiertes ffmpeg. */
export function ffmpegPath(): string | null {
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const list = app.isPackaged
    ? [path.join(process.resourcesPath, "ffmpeg", exe)]
    : [process.env.VJLINK_FFMPEG ?? "", path.join(app.getAppPath(), "vendor", "ffmpeg", `${process.platform}-${process.arch}`, exe),
       "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  return list.find(p => p && existsSync(p)) ?? null;
}

function run(bin: string, args: string[], onOut?: (s: string) => void, timeoutMs = 0): Promise<{ code: number | null; err: string }> {
  return new Promise(resolve => {
    const p = spawn(bin, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    const timer = timeoutMs ? setTimeout(() => p.kill("SIGKILL"), timeoutMs) : null;
    p.stdout.on("data", d => onOut?.(String(d)));
    p.stderr.on("data", d => { err += String(d); if (err.length > 200_000) err = err.slice(-100_000); });
    p.on("error", e => { if (timer) clearTimeout(timer); resolve({ code: -1, err: String(e) }); });
    p.on("close", code => { if (timer) clearTimeout(timer); resolve({ code, err }); });
  });
}

/** Angaben zu einer Videodatei (null = ffmpeg fehlt oder kein Video). */
export async function probeVideo(file: string): Promise<VideoInfo | null> {
  const bin = ffmpegPath();
  if (!bin) return null;
  const r = await run(bin, ["-hide_banner", "-nostdin", "-i", file], undefined, 20_000);
  return parseFfmpegInfo(r.err);
}

export { planImport };
export type { ImportPlan, VideoInfo };

/** Umwandeln; `onProgress` bekommt 0…1. Gibt null bei Erfolg oder eine Fehlermeldung zurück. */
export async function convertVideo(src: string, dst: string, plan: Exclude<ImportPlan, "copy">, info: VideoInfo, onProgress: (p: number) => void): Promise<string | null> {
  const bin = ffmpegPath();
  if (!bin) return "Umwandeln nicht möglich: ffmpeg fehlt.";
  const r = await run(bin, convertArgs(src, dst, plan, info.audio), s => { const p = parseProgress(s, info.duration); if (p !== null) onProgress(p); });
  if (r.code === 0 && existsSync(dst)) return null;
  const last = r.err.trim().split(/\r?\n/).filter(l => !/^\s*(frame|size|time|bitrate|speed)=/.test(l)).slice(-2).join(" ").slice(0, 200);
  return `Umwandeln fehlgeschlagen${last ? `: ${last}` : "."}`;
}
