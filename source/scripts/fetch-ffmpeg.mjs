// ffmpeg für die Installer holen (eigenständiges Programm, wird nur zum Umwandeln von Videos beim Import aufgerufen).
// Quelle: fertige statische Builds aus ffmpeg-static (github.com/eugeneware/ffmpeg-static), Release b6.1.1, FFmpeg 6.1.1.
// Jede Datei wird gegen eine feste SHA-256-Prüfsumme geprüft; liegt sie schon richtig da, wird nichts geladen.
// Aufruf: node scripts/fetch-ffmpeg.mjs [mac|win|all]
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const BASE = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/";
const TARGETS = {
  "darwin-arm64": { gz: "ffmpeg-darwin-arm64.gz", sha: "8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa", exe: "ffmpeg" },
  "darwin-x64": { gz: "ffmpeg-darwin-x64.gz", sha: "929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106", exe: "ffmpeg" },
  "win32-x64": { gz: "ffmpeg-win32-x64.gz", sha: "8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77", exe: "ffmpeg.exe" },
};
const which = process.argv[2] ?? "all";
const want = Object.keys(TARGETS).filter(k => which === "all" || (which === "mac" ? k.startsWith("darwin") : which === "win" ? k.startsWith("win32") : k === which));
if (!want.length) { console.error("Aufruf: node scripts/fetch-ffmpeg.mjs [mac|win|all]"); process.exit(2); }

const sha = b => createHash("sha256").update(b).digest("hex");
async function get(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

for (const key of want) {
  const t = TARGETS[key];
  const dir = path.join("vendor", "ffmpeg", key);
  const exe = path.join(dir, t.exe), stamp = path.join(dir, "gz.sha256");
  if (existsSync(exe) && existsSync(stamp) && (await readFile(stamp, "utf8")).trim() === t.sha) { console.log(`ffmpeg ${key}: vorhanden`); continue; }
  await mkdir(dir, { recursive: true });
  const gz = await get(BASE + t.gz);
  if (sha(gz) !== t.sha) throw new Error(`ffmpeg ${key}: Prüfsumme stimmt nicht (${sha(gz)})`);
  await writeFile(exe, gunzipSync(gz));
  if (!t.exe.endsWith(".exe")) await chmod(exe, 0o755);
  // Lizenz und Build-Hinweise des Builds mitliefern
  for (const f of ["LICENSE", "README"]) await writeFile(path.join(dir, f), await get(`${BASE}${key}.${f}`));
  await writeFile(stamp, t.sha + "\n");
  console.log(`ffmpeg ${key}: geladen und geprüft`);
}
