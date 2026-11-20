// Die Installer für Mac (Apple-Chip und Intel) und Windows entstehen auf einem Rechner, npm installiert aber nur das
// native Modul von koffi für dessen eigenes System. Die anderen holen wir nach (gleiche Version, aus der npm-Registry),
// damit jede App ein funktionierendes koffi für den NDI®-Ausgang enthält.
// Nach VD-Link scripts/koffi-mac.mjs (gleicher Autor, Eclipse Public License 2.0). Aufruf: node scripts/koffi-native.mjs mac|win
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const which = process.argv[2];
const targets = which === "win" ? ["win32-x64"] : which === "mac" ? ["darwin-arm64", "darwin-x64"] : [];
if (!targets.length) throw new Error("Aufruf: node scripts/koffi-native.mjs mac|win");
const version = JSON.parse(readFileSync("node_modules/koffi/package.json", "utf8")).version;
for (const t of targets) {
  const name = `@koromix/koffi-${t}`;
  const dest = path.join("node_modules", name);
  if (existsSync(path.join(dest, "package.json"))) continue;
  const tmp = mkdtempSync(path.join(tmpdir(), "koffi-"));
  const file = execFileSync("npm", ["pack", `${name}@${version}`, "--silent", "--pack-destination", tmp], { encoding: "utf8" }).trim().split("\n").pop();
  mkdirSync(dest, { recursive: true });
  execFileSync("tar", ["-xzf", path.join(tmp, file), "-C", dest, "--strip-components=1"]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`koffi: ${name}@${version} ergänzt`);
}
