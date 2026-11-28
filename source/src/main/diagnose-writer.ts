// Suite-Diagnose v1 – Schreiber für Electron/Node-Programme der Link-Suite.
// Herkunft: Suite-Launcher/design/diagnose/diagnose-writer.ts (EPL-2.0). Spezifikation: SPEC.md daneben.
// Kopieren, nicht ändern; Fragen an die Sitzung „Suite-Launcher“. Vorlage v1.2 (28.11.2026): Filter clean() erweitert (v1.1), IPv4 nicht in
// längeren Versionsnummern, Link-Suite-Ordner wird nie angelegt (v1.2).
//
// Einbau (Hauptprozess):
//   import { startDiagnose } from "./diagnose-writer";
//   const diag = startDiagnose({ id: "vj", app: "VJ-Link", version: app.getVersion() });
//   diag.report({ summary: { "Ausgänge": "2" }, checks: [{ name: "Art-Net", ok: true, detail: "…" }] });
//   diag.error("Renderer: WebGL context lost");
//   app.on("will-quit", () => diag.stop());
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface DiagCheck { name: string; ok: boolean; detail?: string }
export interface DiagState { summary?: Record<string, string>; checks?: DiagCheck[] }

const MAX_BYTES = 16 * 1024;
const home = os.homedir();

/** Datenordner der Link-Suite (dort liegt auch suite.json). */
export function suiteDataDir(): string {
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Link-Suite");
  if (process.platform === "darwin") return path.join(home, "Library", "Application Support", "Link-Suite");
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "Link-Suite");
}

const tmp = os.tmpdir();
const host = os.hostname().replace(/\.local$/i, "");

/** Show-Netz: privat, Loopback, Link-Local und Art-Net (2.x/10.x). Alles andere gilt als öffentlich. */
export function isShowIp(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 10 || a === 2 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Vorlage v1.1 (28.11.2026, nach den Funden von VJ-Link cleanDiagText und VD-Link diagText): was nie in die Diagnose
 * darf (SPEC.md), schon beim Schreiben entfernen – nur die erste Zeile (kein Stack), Temp- und Benutzerordner in jeder
 * Schreibweise, Rechnername, file:-Adressen, Windows-Pfade, /Volumes, UNC-Freigaben, E-Mail, MAC, IPv6 (Uhrzeiten und
 * Timecodes bleiben), öffentliche IPv4, Kennungen ab 32 Zeichen. Der Launcher filtert beim Lesen noch einmal.
 */
export function clean(s: unknown, max: number, env = { home, tmp, host }): string {
  let t = String(s ?? "").split(/\r?\n/)[0]!;
  for (const dir of [env.tmp.replace(/^\/var\//, "/private/var/"), env.tmp]) if (dir && dir.length > 3) t = t.replace(new RegExp(esc(dir), "gi"), "[tmp]");
  if (env.home && env.home.length > 1) t = t.replace(new RegExp(esc(env.home), "gi"), "~");
  if (env.host && env.host.length > 2) t = t.replace(new RegExp(esc(env.host), "gi"), "[Rechner]");
  t = t
    .replace(/file:\/\/[^\s"')]+/gi, "[Datei]")
    .replace(/\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/"']+/gi, "~")          // C:\Users\Name, auch Kurznamen wie PHILIP~1
    .replace(/\/(?:Users|home)\/[^/\s"']+/g, "~")
    .replace(/\/private\/var\/folders\/[^\s"']*/g, "[tmp]")
    .replace(/\/Volumes\/[^/\s"']+/g, "/Volumes/[Laufwerk]")
    .replace(/\\\\[^\\\s"']+\\[^\\\s"']+/g, "[Freigabe]")
    .replace(/\b[A-Za-z]:[\\/][^\s"']*/g, "[Pfad]")                   // übrige Windows-Pfade
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[E-Mail]")
    .replace(/\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/gi, "[MAC]")
    .replace(/(?<![\w:.])[0-9a-f]*(?::[0-9a-f]*){2,}(?![\w:])/gi, m => (/::/.test(m) || m.split(":").length >= 6) && !/^\d{1,2}(?::\d{2}){1,3}$/.test(m) ? "[IPv6]" : m)
    .replace(/(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?!\.?\d)/g, ip => (isShowIp(ip) ? ip : "[IP]")) // nicht in Versionen wie 21.0.13.0.3
    .replace(/\b[\w-]+\.(?:local|lan|fritz\.box)\b/gi, "[Rechner]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[Kennung]");
  return t.replace(/\t+/g, " ").slice(0, max);
}

function osName(): string {
  const v = typeof process.getSystemVersion === "function" ? process.getSystemVersion() : os.release();
  if (process.platform === "darwin") return `macOS ${v}`;
  if (process.platform === "win32") { const b = Number(v.split(".")[2]); return `Windows ${b >= 22000 ? 11 : 10} (${b || v})`; }
  return `${process.platform} ${v}`;
}

export function startDiagnose(o: { id: string; app: string; version: string; dir?: string }) {
  const base = o.dir ?? suiteDataDir();
  const dir = path.join(base, "diagnose");
  const file = path.join(dir, `${o.id}.json`);
  let state: DiagState = {};
  const errors: { at: string; text: string }[] = [];
  let lastWrite = 0;
  let pending: NodeJS.Timeout | null = null;
  let running = true;

  function write(): void {
    pending = null;
    lastWrite = Date.now();
    const summary: Record<string, string> = {};
    for (const [k, v] of Object.entries(state.summary ?? {}).slice(0, 20)) summary[clean(k, 60)] = clean(v, 200);
    const doc = {
      suite: "diagnose", v: 1, id: o.id, app: o.app, version: o.version, at: new Date().toISOString(), running,
      os: osName(), arch: process.arch, summary,
      checks: (state.checks ?? []).slice(0, 20).map(c => ({ name: clean(c.name, 60), ok: !!c.ok, detail: clean(c.detail, 200) })),
      errors: errors.slice(-20),
    };
    let text = JSON.stringify(doc, null, 1);
    while (Buffer.byteLength(text) > MAX_BYTES && doc.errors.length) { doc.errors.shift(); text = JSON.stringify(doc, null, 1); }
    try {
      if (!fs.existsSync(base)) return; // Link-Suite nicht installiert: nichts anlegen (v1.2)
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file + ".tmp", text);
      fs.renameSync(file + ".tmp", file);
    } catch { /* ohne Diagnose weiter – nie die Show stören */ }
  }
  /** Schreiben, aber höchstens 1×/s. */
  function soon(): void {
    if (pending) return;
    pending = setTimeout(write, Math.max(0, 1000 - (Date.now() - lastWrite)));
  }
  const tick = setInterval(() => { if (Date.now() - lastWrite >= 30_000) soon(); }, 5_000);
  tick.unref?.();
  soon();

  return {
    /** Zustand ersetzen (summary/checks); wird gebündelt geschrieben. */
    report(s: DiagState): void { state = { ...state, ...s }; soon(); },
    /** Fehler oder Warnung merken (die letzten 20). */
    error(text: string): void { errors.push({ at: new Date().toISOString(), text: clean(text, 300) }); if (errors.length > 20) errors.shift(); soon(); },
    /** Beim Beenden: running=false sofort schreiben. */
    stop(): void { running = false; clearInterval(tick); if (pending) clearTimeout(pending); write(); },
  };
}
