// Herkunft: Link-Suite, Hinweis „Link-Suite laden“ (Baustein 1.0, 16.11.2026), unverändert übernommen aus
// Suite-Launcher design/launcher-hinweis/ (gleicher Autor, Eclipse Public License 2.0). Änderungen nur dort, dann neu kopieren.
// Link-Suite · Erkennung „Ist der Launcher Link-Suite installiert?“ (Baustein 1.0, 16.11.2026).
// Für den HAUPTPROZESS von VJ-Link, VD-Link, NET Link, PL Link, Crew Link und dB Link (Node ≥ 18, nur node:-Module).
// Lokal, ohne Netz, ohne Adminrechte. Ziel < 200 ms: zuerst feste Orte (Dateizugriff, < 5 ms), Spotlight bzw. Registry
// nur als Rückfall und mit Zeitlimit. Ergebnis für die Oberfläche: { installed, path, version, via, ms } per IPC.
// Tests: launcher-detect.test.ts (node --test --experimental-strip-types launcher-detect.test.ts).

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const BUNDLE_ID = "de.nextphilm.linksuite";       // package.json build.appId des Launchers
export const PRODUCT = "Link-Suite";                      // productName

export interface LauncherInfo {
  installed: boolean;
  /** .app (macOS) bzw. Ordner/EXE (Windows) */
  path?: string;
  /** CFBundleShortVersionString bzw. DisplayVersion */
  version?: string;
  /** woran erkannt */
  via: "path" | "mdfind" | "registry" | "none" | "unsupported";
  /** Dauer der Prüfung */
  ms: number;
}

/** Zugriff auf das System – austauschbar für Tests. */
export interface DetectEnv {
  platform: NodeJS.Platform;
  home: string;
  env: Record<string, string | undefined>;
  exists(p: string): boolean;
  read(p: string): string | null;
  /** Programm mit Zeitlimit; bei Fehler/Zeitüberschreitung null */
  run(cmd: string, args: string[], timeoutMs: number): Promise<string | null>;
}

export const nodeEnv = (): DetectEnv => ({
  platform: process.platform,
  home: homedir(),
  env: process.env,
  exists: p => { try { return existsSync(p); } catch { return false; } },
  read: p => { try { return readFileSync(p, "utf8"); } catch { return null; } },
  run: (cmd, args, timeoutMs) => new Promise(res => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true, encoding: "utf8", maxBuffer: 1 << 20 }, (err, out) => res(err ? null : out));
  }),
});

export interface DetectOptions {
  /** Spotlight (macOS) bzw. Registry (Windows) als Rückfall erlauben. Standard true */
  search?: boolean;
  /** Zeitlimit für mdfind/reg, Standard 150 ms (mdfind) bzw. 400 ms (reg.exe startet langsamer) */
  timeoutMs?: number;
}

/** Wert eines Schlüssels aus einer XML-Info.plist (electron-builder schreibt XML). Binär-plist → null. */
export function plistValue(xml: string, key: string): string | null {
  if (xml.startsWith("bplist")) return null;
  const m = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m?.[1] !== undefined ? m[1].trim() : null;
}

/** Prüft eine .app: Info.plist lesbar und Bundle-ID = de.nextphilm.linksuite. */
export function checkApp(e: DetectEnv, app: string): { version?: string } | null {
  const xml = e.read(join(app, "Contents", "Info.plist"));
  if (xml === null) return null;
  const id = plistValue(xml, "CFBundleIdentifier");
  if (id !== null && id !== BUNDLE_ID) return null;      // anderes Programm mit gleichem Namen
  if (id === null && !xml.startsWith("bplist")) return null;
  return { version: plistValue(xml, "CFBundleShortVersionString") ?? undefined };
}

/** Ausgabe von `reg query <Uninstall> /s /f Link-Suite /d` → Einträge mit DisplayName „Link-Suite“ bzw. „Link-Suite 0.3.0“. */
export function parseRegQuery(out: string): { key: string; name: string; version?: string; location?: string; icon?: string }[] {
  const res: { key: string; name: string; version?: string; location?: string; icon?: string }[] = [];
  let cur: Record<string, string> & { key?: string } = {};
  const flush = () => {
    const name = cur.DisplayName;
    if (cur.key && name && /^Link-Suite(\s+\d[\w.\-]*)?$/i.test(name.trim()))
      res.push({ key: cur.key, name: name.trim(), version: cur.DisplayVersion, location: cur.InstallLocation, icon: cur.DisplayIcon });
    cur = {};
  };
  for (const raw of out.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^HKEY_/i.test(line)) { flush(); cur.key = line.trim(); continue; }
    const m = line.match(/^\s+(\S+)\s+REG_\w+\s+(.*)$/);
    if (m && m[1] && m[2] !== undefined) cur[m[1]] = m[2].trim();
  }
  flush();
  return res;
}

const UNINSTALL = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall";

/** Hauptfunktion. Wirft nie; im Zweifel installed:false. */
export async function detectLauncher(opts: DetectOptions = {}, e: DetectEnv = nodeEnv()): Promise<LauncherInfo> {
  const t0 = Date.now();
  const done = (r: Omit<LauncherInfo, "ms">): LauncherInfo => ({ ...r, ms: Date.now() - t0 });
  const search = opts.search !== false;
  try {
    if (e.platform === "darwin") {
      // 1 · feste Orte
      for (const app of ["/Applications/Link-Suite.app", join(e.home, "Applications", "Link-Suite.app")]) {
        const ok = checkApp(e, app);
        if (ok) return done({ installed: true, path: app, version: ok.version, via: "path" });
      }
      // 2 · Spotlight nach Bundle-ID, mit Zeitlimit (Spotlight kann aus sein → einfach nichts)
      if (search) {
        const out = await e.run("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`], opts.timeoutMs ?? 150);
        for (const app of (out ?? "").split("\n").map(s => s.trim()).filter(s => s.endsWith(".app"))) {
          if (app.includes("/.Trash/") || app.includes("/Volumes/")) continue;   // Papierkorb, DMG nicht zählen
          const ok = checkApp(e, app);
          if (ok) return done({ installed: true, path: app, version: ok.version, via: "mdfind" });
        }
      }
      return done({ installed: false, via: "none" });
    }
    if (e.platform === "win32") {
      // 1 · Standardordner von electron-builder (NSIS, perMachine:false bzw. true)
      const cands = [
        e.env.LOCALAPPDATA && join(e.env.LOCALAPPDATA, "Programs", PRODUCT),
        e.env.ProgramFiles && join(e.env.ProgramFiles, PRODUCT),
      ].filter((p): p is string => !!p);
      let hit = cands.find(dir => e.exists(join(dir, `${PRODUCT}.exe`)));
      // 2 · Registry: HKCU zuerst (Installation je Nutzer), HKLM als Rückfall – liefert auch die Version
      if (search || !hit) {
        for (const hive of ["HKCU", "HKLM"]) {
          const out = await e.run("reg", ["query", `${hive}\\${UNINSTALL}`, "/s", "/f", PRODUCT, "/d"], opts.timeoutMs ?? 400);
          const found = parseRegQuery(out ?? "")[0];
          if (found) {
            const loc = found.location || (found.icon ? found.icon.replace(/^"|"$/g, "").replace(/,\d+$/, "").replace(/\\[^\\]+$/, "") : undefined);
            if (!hit && loc && !e.exists(join(loc, `${PRODUCT}.exe`))) continue;   // Eintrag ohne Programm (Reste) nicht zählen
            return done({ installed: true, path: hit ?? loc, version: found.version, via: "registry" });
          }
        }
      }
      if (hit) return done({ installed: true, path: hit, via: "path" });
      return done({ installed: false, via: "none" });
    }
    return done({ installed: false, via: "unsupported" });   // Linux: Launcher gibt es nicht
  } catch {
    return done({ installed: false, via: "none" });
  }
}
