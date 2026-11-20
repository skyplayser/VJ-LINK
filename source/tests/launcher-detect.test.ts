// Herkunft: Link-Suite, Tests zum Hinweis „Link-Suite laden“ (Baustein 1.0, 16.11.2026), unverändert übernommen aus
// Suite-Launcher design/launcher-hinweis/ (gleicher Autor, Eclipse Public License 2.0). Änderungen nur dort, dann neu kopieren.
// Für vitest: test aus vitest statt node:test, Importe ohne .ts-Endung; sonst unverändert.
// Tests zu launcher-detect.ts. Ohne Abhängigkeiten: node --test --experimental-strip-types launcher-detect.test.ts
// (in den Programmen genauso mit vitest lauffähig: describe/it → test). Das System ist über DetectEnv vorgetäuscht;
// ein Test prüft zusätzlich die echte Installation, wenn /Applications/Link-Suite.app da ist.
import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { detectLauncher, parseRegQuery, plistValue, type DetectEnv } from "../src/main/suite/launcher-detect";

const PLIST = (id: string, v = "0.3.0") => `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key>
  <string>${id}</string>
  <key>CFBundleShortVersionString</key>
  <string>${v}</string>
</dict></plist>`;

function fake(p: Partial<DetectEnv> & { files?: Record<string, string>; runs?: Record<string, string | null> }): DetectEnv & { calls: string[] } {
  const files = p.files ?? {}, calls: string[] = [];
  return {
    platform: p.platform ?? "darwin", home: p.home ?? "/Users/dj", env: p.env ?? {},
    exists: f => f in files, read: f => files[f] ?? null,
    run: async (cmd, args) => { calls.push([cmd, ...args].join(" ")); const k = Object.keys(p.runs ?? {}).find(x => [cmd, ...args].join(" ").includes(x)); return k ? (p.runs![k] ?? null) : null; },
    calls,
  };
}

test("macOS: /Applications mit richtiger Bundle-ID → installiert, Version, ohne Spotlight", async () => {
  const e = fake({ files: { "/Applications/Link-Suite.app/Contents/Info.plist": PLIST("de.nextphilm.linksuite", "0.3.0") } });
  const r = await detectLauncher({}, e);
  assert.equal(r.installed, true); assert.equal(r.version, "0.3.0"); assert.equal(r.via, "path"); assert.equal(e.calls.length, 0);
});

test("macOS: ~/Applications wird gefunden", async () => {
  const r = await detectLauncher({}, fake({ files: { "/Users/dj/Applications/Link-Suite.app/Contents/Info.plist": PLIST("de.nextphilm.linksuite") } }));
  assert.equal(r.installed, true); assert.equal(r.path, "/Users/dj/Applications/Link-Suite.app");
});

test("macOS: gleicher Name, fremde Bundle-ID → nicht installiert", async () => {
  const r = await detectLauncher({ search: false }, fake({ files: { "/Applications/Link-Suite.app/Contents/Info.plist": PLIST("com.example.other") } }));
  assert.equal(r.installed, false);
});

test("macOS: nur Spotlight kennt es (anderer Ordner), Papierkorb und DMG zählen nicht", async () => {
  const e = fake({
    files: { "/Users/dj/Tools/Link-Suite.app/Contents/Info.plist": PLIST("de.nextphilm.linksuite", "0.2.0"),
             "/Volumes/Link-Suite 0.3.0/Link-Suite.app/Contents/Info.plist": PLIST("de.nextphilm.linksuite", "0.3.0") },
    runs: { mdfind: "/Users/dj/.Trash/Link-Suite.app\n/Volumes/Link-Suite 0.3.0/Link-Suite.app\n/Users/dj/Tools/Link-Suite.app\n" },
  });
  const r = await detectLauncher({}, e);
  assert.deepEqual([r.installed, r.via, r.path, r.version], [true, "mdfind", "/Users/dj/Tools/Link-Suite.app", "0.2.0"]);
});

test("macOS: Spotlight aus/Zeitlimit (null) → nicht installiert, kein Fehler", async () => {
  const r = await detectLauncher({}, fake({ runs: { mdfind: null } }));
  assert.deepEqual([r.installed, r.via], [false, "none"]);
});

test("macOS: search:false fragt Spotlight nie", async () => {
  const e = fake({});
  await detectLauncher({ search: false }, e);
  assert.equal(e.calls.length, 0);
});

const REG_HKCU = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\5f2a1c0e-1111-5b3e-9c3e-aaaaaaaaaaaa
    DisplayName    REG_SZ    Link-Suite 0.3.0
    DisplayVersion    REG_SZ    0.3.0
    InstallLocation    REG_SZ    C:\\Users\\dj\\AppData\\Local\\Programs\\Link-Suite
    DisplayIcon    REG_SZ    C:\\Users\\dj\\AppData\\Local\\Programs\\Link-Suite\\Link-Suite.exe,0

HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OtherApp
    DisplayName    REG_SZ    Link-Suite Helper Tools
    DisplayVersion    REG_SZ    9.9

End of search: 6 match(es) found.
`;

test("Registry-Ausgabe: nur „Link-Suite“ bzw. „Link-Suite <Version>“ zählt", () => {
  const r = parseRegQuery(REG_HKCU);
  assert.equal(r.length, 1); assert.equal(r[0]?.version, "0.3.0");
});

test("Windows: Standardordner + Registry HKCU → installiert mit Version", async () => {
  const exe = "C:\\Users\\dj\\AppData\\Local\\Programs\\Link-Suite";
  const e = fake({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\dj\\AppData\\Local" }, runs: { "HKCU": REG_HKCU } });
  // join() auf macOS nutzt „/“ – darum Datei unter beiden Schreibweisen anlegen
  (e as unknown as { exists: (f: string) => boolean }).exists = f => f.replace(/\//g, "\\").startsWith(exe) && f.endsWith("Link-Suite.exe");
  const r = await detectLauncher({}, e);
  assert.deepEqual([r.installed, r.version, r.via], [true, "0.3.0", "registry"]);
});

test("Windows: nur HKLM (Installation für alle) → installiert", async () => {
  const hklm = REG_HKCU.replace(/HKEY_CURRENT_USER/g, "HKEY_LOCAL_MACHINE");
  const e = fake({ platform: "win32", env: {}, runs: { HKLM: hklm } });
  e.exists = f => f.endsWith("Link-Suite.exe");
  const r = await detectLauncher({}, e);
  assert.equal(r.installed, true); assert.equal(e.calls.length, 2);
});

test("Windows: Registry-Rest ohne Programm → nicht installiert", async () => {
  const r = await detectLauncher({}, fake({ platform: "win32", env: {}, runs: { HKCU: REG_HKCU } }));
  assert.equal(r.installed, false);
});

test("Linux → unsupported, nicht installiert", async () => {
  const r = await detectLauncher({}, fake({ platform: "linux" }));
  assert.deepEqual([r.installed, r.via], [false, "unsupported"]);
});

test("plist: Binär-plist liefert null statt Unsinn", () => {
  assert.equal(plistValue("bplist00…", "CFBundleIdentifier"), null);
});

test("echt (nur auf einem Mac mit Link-Suite): unter 200 ms", { skip: !existsSync("/Applications/Link-Suite.app") }, async () => {
  const r = await detectLauncher();
  assert.equal(r.installed, true); assert.ok(r.ms < 200, `zu langsam: ${r.ms} ms`);
  console.log("  echt:", JSON.stringify(r));
});

test("echt (Mac): ohne Treffer an den festen Orten bleibt Spotlight unter dem Zeitlimit", { skip: process.platform !== "darwin" }, async () => {
  const { nodeEnv } = await import("../src/main/suite/launcher-detect");
  const real = nodeEnv(), t0 = Date.now();
  const r = await detectLauncher({}, { ...real, read: () => null });   // feste Orte „leer“, also Spotlight fragen
  const ms = Date.now() - t0;
  assert.ok(ms < 400, `Spotlight-Rückfall zu langsam: ${ms} ms`);
  console.log("  spotlight:", JSON.stringify(r), ms + " ms");
});
