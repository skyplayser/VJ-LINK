// NDI®-Ausgang: wo die NDI-Laufzeit liegt und woher man sie bekommt. Ohne koffi, damit der Hauptprozess nur prüft,
// ob die Datei da ist (nichts geladen, nichts im Netz), bis jemand den NDI-Ausgang öffnet.
//
// VJ-Link liefert keine NDI-Dateien mit. Die Laufzeit (libndi.dylib / Processing.NDI.Lib.x64.dll) installiert der
// Nutzer selbst von NDI; so empfiehlt es NDI für Open-Source-Projekte. Nach VD-Link electron/ndi (gleicher Autor,
// Eclipse Public License 2.0). NDI® ist eine eingetragene Marke der Vizrt NDI AB.

import { existsSync } from "node:fs";
import path from "node:path";

/** Offizielle Download-Seiten der NDI-Laufzeit (NDI SDK, Software Distribution) und die Website von NDI. */
export const ndiRuntimeUrl = (platform = process.platform): string => platform === "darwin" ? "https://ndi.link/NDIRedistV6Apple" : "https://ndi.link/NDIRedistV6";
export const NDI_HOME_URL = "https://ndi.video/";

const libName = (platform: string) => platform === "win32" ? "Processing.NDI.Lib.x64.dll" : "libndi.dylib";

/** Orte, an die die Installer von NDI die Laufzeit legen (neueste API zuerst). */
export function runtimeCandidates(env: NodeJS.ProcessEnv = process.env, platform: string = process.platform): string[] {
  const lib = libName(platform);
  const join = platform === "win32" ? path.win32.join : path.posix.join;
  const out: string[] = [];
  for (const v of ["NDI_RUNTIME_DIR_V6", "NDI_RUNTIME_DIR_V5"]) { const d = env[v]; if (d) out.push(join(d, lib)); }
  if (platform === "darwin") out.push("/usr/local/lib/libndi.dylib", "/Library/NDI SDK for Apple/lib/macOS/libndi.dylib");
  else if (platform === "win32") {
    const pf = env.ProgramFiles || "C:\\Program Files";
    out.push(join(pf, "NDI", "NDI 6 Runtime", "v6", lib), join(pf, "NDI", "NDI 5 Runtime", "v5", lib));
  }
  return [...new Set(out)];
}

/** Erste vorhandene Laufzeit oder null. Testinstanzen können mit VJLINK_TEST_NDI=missing so tun, als fehle sie. */
export function findRuntime(env: NodeJS.ProcessEnv = process.env, platform: string = process.platform, exists: (p: string) => boolean = existsSync): string | null {
  if (env.VJLINK_DATA && env.VJLINK_TEST_NDI === "missing") return null;
  return runtimeCandidates(env, platform).find(p => exists(p)) ?? null;
}

export { NDI_FPS_CHOICES as NDI_FPS } from "../../core/frame";
