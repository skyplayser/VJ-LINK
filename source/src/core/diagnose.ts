// Suite-Diagnose v1 für VJ-Link (id „vj“): was in diagnose/vj.json steht. Spezifikation:
// Suite-Launcher/design/diagnose/SPEC.md. Hier nur Zahlen, Zustände und feste Wörter – keine Namen von Ebenen,
// Szenen, Cues oder Medien, keine Pfade, keine Geräte- oder Rechnernamen. Freie Texte (Fehlermeldungen) laufen
// durch cleanDiagText: nur die erste Zeile, Pfade, Adressen und Kennungen werden ersetzt.
import type { NetStatus } from "./frame";

export interface DiagCheck { name: string; ok: boolean; detail?: string }
export interface DiagState { summary?: Record<string, string>; checks?: DiagCheck[] }

/** Was die Oberfläche meldet (nur Zahlen, Schalter und Wörter aus festen Listen). */
export interface VjDiagRenderer {
  layers: number; scenes: number; images: number; cues: number; cueLive: boolean;
  mode: "mirror" | "canvas" | "separate" | "mapping";
  tempo: "ljlink" | "link" | "osc" | "midi" | "audio" | "tap" | "manual"; bpm: number;
  fps: number; frameMs: number; shadersPending: number;
  tcReceive: boolean; tcSend: boolean; tcRunning: boolean; tcWays: ("artnet" | "mtc" | "ltc")[];
  audioIn: boolean; videos: number; missingVideos: number; blackout: boolean; testPattern: boolean; masks: number;
}

/** Was der Hauptprozess selbst weiß. */
export interface VjDiagMain {
  outputs: { kind: "display" | "window" | "ndi"; w: number; h: number }[];
  net: NetStatus | null;
  phone: boolean;
  ffmpeg: boolean;
}

const MODES = ["mirror", "canvas", "separate", "mapping"] as const;
const TEMPOS = ["ljlink", "link", "osc", "midi", "audio", "tap", "manual"] as const;
const WAYS = ["artnet", "mtc", "ltc"] as const;

/** Meldung der Oberfläche prüfen: nur bekannte Felder mit passendem Typ, Texte nur aus festen Listen. */
export function parseRendererDiag(v: unknown): VjDiagRenderer | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (k: string, max = 1e6) => { const x = o[k]; return typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(max, x)) : 0; };
  const b = (k: string) => o[k] === true;
  const pick = <T extends string>(k: string, list: readonly T[], d: T): T => (list.includes(o[k] as T) ? (o[k] as T) : d);
  return {
    layers: n("layers", 1000), scenes: n("scenes", 1000), images: n("images", 100), cues: n("cues", 10000), cueLive: b("cueLive"),
    mode: pick("mode", MODES, "mirror"), tempo: pick("tempo", TEMPOS, "manual"), bpm: n("bpm", 999),
    fps: n("fps", 1000), frameMs: n("frameMs", 10000), shadersPending: n("shadersPending", 10000),
    tcReceive: b("tcReceive"), tcSend: b("tcSend"), tcRunning: b("tcRunning"),
    tcWays: Array.isArray(o.tcWays) ? (o.tcWays as unknown[]).filter((w): w is typeof WAYS[number] => WAYS.includes(w as typeof WAYS[number])) : [],
    audioIn: b("audioIn"), videos: n("videos", 100000), missingVideos: n("missingVideos", 100000),
    blackout: b("blackout"), testPattern: b("testPattern"), masks: n("masks", 1000),
  };
}

/** Private IPv4 aus dem Show-Netz (10.x, 172.16–31.x, 192.168.x, 2.x für Art-Net, 127.x). */
export function isShowIp(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 10 || a === 2 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

/**
 * Freien Text für die Diagnose säubern: erste Zeile, Benutzerordner → ~, Temp-Ordner, file:-Adressen, Laufwerke
 * und Freigaben, Datenträgernamen, E-Mail, MAC, IPv6, öffentliche IPv4, lange Kennungen. Länge begrenzt.
 */
export function cleanDiagText(s: unknown, home = "", tmp = "", max = 300, host = ""): string {
  let t = String(s ?? "").split(/\r?\n/)[0]!;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const dir of [tmp.replace(/^\/var\//, "/private/var/"), tmp]) if (dir && dir.length > 3) t = t.replace(new RegExp(esc(dir), "gi"), "[tmp]");
  if (home && home.length > 1) t = t.replace(new RegExp(esc(home), "gi"), "~");
  if (host && host.length > 2) t = t.replace(new RegExp(esc(host), "gi"), "[Rechner]");
  t = t
    .replace(/file:\/\/[^\s"')]+/gi, "[Datei]")
    // C:\Users\name – Windows-Namen dürfen Leerzeichen haben (lieber zu viel ersetzen), auch Kurznamen wie PHILIP~1
    .replace(/\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/"']+/gi, "~")
    .replace(/\/(?:Users|home)\/[^/\s"']+/g, "~")
    .replace(/\/private\/var\/folders\/[^\s"']*/g, "[tmp]")
    .replace(/\/Volumes\/[^/\s"']+/g, "/Volumes/[Laufwerk]")
    .replace(/\\\\[^\\\s"']+\\[^\\\s"']+/g, "[Freigabe]")
    .replace(/\b[A-Za-z]:[\\/][^\s"']*/g, "[Pfad]")                   // übrige Windows-Pfade
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[E-Mail]")
    .replace(/\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/gi, "[MAC]")
    // IPv6 (auch Kurzform mit ::); Uhrzeiten und Timecodes wie 01:00:00:00 bleiben stehen
    .replace(/(?<![\w:.])[0-9a-f]*(?::[0-9a-f]*){2,}(?![\w:])/gi, m => (/::/.test(m) || m.split(":").length >= 6) && !/^\d{1,2}(?::\d{2}){1,3}$/.test(m) ? "[IPv6]" : m)
    .replace(/(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?!\.?\d)/g, ip => (isShowIp(ip) ? ip : "[IP]")) // nicht in Versionen wie 21.0.13.0.3
    .replace(/\b[\w-]+\.(?:local|lan|fritz\.box)\b/gi, "[Rechner]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[Kennung]");
  return t.replace(/[\t\r]+/g, " ").slice(0, max);
}

const MODE_DE: Record<VjDiagRenderer["mode"], string> = { mirror: "Gleiches Bild", canvas: "Leinwand", separate: "Getrennt", mapping: "Projektionsmapping" };
const TEMPO_DE: Record<VjDiagRenderer["tempo"], string> = { ljlink: "LJ-Link", link: "Ableton Link", osc: "OSC", midi: "MIDI-Clock", audio: "Audio", tap: "Tap", manual: "Manuell" };
const KIND_DE = { display: "Bildschirm", window: "Fenster", ndi: "NDI" } as const;

function netLine(name: string, s: { listening: boolean; packets: number; error?: string; off?: boolean } | undefined): { sum: string; check: DiagCheck } | null {
  if (!s) return null;
  if (s.off) return { sum: "aus", check: { name, ok: true, detail: "ausgeschaltet" } };
  if (s.error) return { sum: "Fehler", check: { name, ok: false, detail: cleanDiagText(s.error, "", "", 200) } };
  if (!s.listening) return { sum: "hört nicht", check: { name, ok: false, detail: "Port nicht offen" } };
  return { sum: s.packets > 0 ? `empfängt (${s.packets} Pakete)` : "hört, noch nichts empfangen", check: { name, ok: true, detail: s.packets > 0 ? "empfängt" : "hört, noch keine Pakete" } };
}

/** summary und checks für diagnose/vj.json. */
export function buildVjDiag(r: VjDiagRenderer | null, m: VjDiagMain): DiagState {
  const summary: Record<string, string> = {};
  const checks: DiagCheck[] = [];
  const outs = m.outputs;
  summary["Ausgänge"] = outs.length ? `${outs.length} (${outs.map(o => `${KIND_DE[o.kind]} ${Math.round(o.w)}×${Math.round(o.h)}`).join(", ")})` : "keiner offen";
  checks.push({ name: "Ausgänge", ok: outs.length > 0, detail: outs.length ? `${outs.length} offen` : "kein Ausgang offen (nur Vorschau)" });
  if (r) {
    summary["Anordnung"] = MODE_DE[r.mode] + (r.mode === "mapping" && r.masks ? `, ${r.masks} Masken` : "");
    summary["Takt"] = `${TEMPO_DE[r.tempo]}, ${r.bpm.toFixed(1)} BPM`;
    summary["Bildrate"] = `${Math.round(r.fps)} fps, ${r.frameMs.toFixed(1)} ms je Bild`;
    summary["Projekt"] = `${r.layers} Ebenen, ${r.scenes} Szenen, ${r.images} Bild${r.images === 1 ? "" : "er"}`;
    summary["Show"] = `${r.cues} Cues${r.cueLive ? ", läuft" : ""}`;
    summary["Videos"] = `${r.videos}${r.missingVideos ? `, ${r.missingVideos} fehlen` : ""}`;
    summary["Timecode"] = !r.tcReceive && !r.tcSend ? "aus"
      : [r.tcReceive ? "empfängt" : "", r.tcSend ? `sendet${r.tcWays.length ? ` (${r.tcWays.map(w => (w === "artnet" ? "Art-Net" : w === "mtc" ? "MTC" : "LTC")).join(" + ")})` : ""}` : ""].filter(Boolean).join(", ") + (r.tcRunning ? ", läuft" : ", steht");
    summary["Audio-Eingang"] = r.audioIn ? "an" : "aus";
    if (r.blackout) summary["Blackout"] = "an";
    if (r.testPattern) summary["Testbild"] = "an";
    checks.push({ name: "Grafik", ok: r.shadersPending === 0 && r.fps >= 25, detail: r.shadersPending ? `${r.shadersPending} Visuals werden noch übersetzt` : `${Math.round(r.fps)} fps` });
    checks.push({ name: "Videos", ok: r.missingVideos === 0, detail: r.missingVideos ? `${r.missingVideos} Datei(en) fehlen` : "alle da" });
  }
  const net = m.net;
  for (const [name, s] of [["Art-Net", net?.artnet], ["sACN", net?.sacn], ["OSC", net?.osc]] as const) {
    const l = netLine(name, s);
    if (!l) continue;
    summary[name] = l.sum;
    if (name === "Art-Net" && net?.artnet.lastFrom && isShowIp(net.artnet.lastFrom) && !net.artnet.off) l.check.detail = `Pakete von ${net.artnet.lastFrom}`;
    checks.push(l.check);
  }
  if (net?.lj) {
    const lj = net.lj, pro = lj.pro;
    summary["LJ-Link"] = lj.off ? "aus" : pro ? (pro.connected ? "verbunden" : "nicht verbunden") : `${lj.clients} verbunden`;
    if (!lj.off) checks.push({ name: "LJ-Link", ok: !lj.error && (!pro || pro.connected), detail: lj.error ? cleanDiagText(lj.error, "", "", 200) : pro ? (pro.connected ? "verbunden" : "sucht") : `${lj.clients} Verbindungen` });
  }
  summary["Handy-Fernsteuerung"] = m.phone ? "an" : "aus";
  checks.push({ name: "Video-Umwandlung (ffmpeg)", ok: m.ffmpeg, detail: m.ffmpeg ? "vorhanden" : "fehlt – ProRes/Animation-MOV lassen sich nicht umwandeln" });
  return { summary, checks: checks.slice(0, 20) };
}
