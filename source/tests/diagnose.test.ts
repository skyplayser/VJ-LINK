// Suite-Diagnose v1 (id „vj“): Datei, Format, Größe, Datenschutz, atomares Schreiben, Schreibfehler.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { startDiagnose } from "../src/main/diagnose-writer";
import { buildVjDiag, cleanDiagText, isShowIp, parseRendererDiag, type VjDiagRenderer } from "../src/core/diagnose";
import type { NetStatus } from "../src/core/frame";

const dirs: string[] = [];
const temp = () => { const d = mkdtempSync(path.join(tmpdir(), "vjdiag-")); dirs.push(d); return d; };
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const read = (dir: string) => JSON.parse(readFileSync(path.join(dir, "diagnose", "vj.json"), "utf8"));

const R: VjDiagRenderer = { layers: 8, scenes: 14, images: 1, cues: 3, cueLive: true, mode: "mapping", tempo: "ljlink", bpm: 128, fps: 60, frameMs: 2.1,
  shadersPending: 0, tcReceive: false, tcSend: true, tcRunning: true, tcWays: ["artnet", "ltc"], audioIn: false, videos: 4, missingVideos: 1, blackout: false, testPattern: false, masks: 2 };
const NET: NetStatus = {
  artnet: { listening: true, packets: 1200, lastFrom: "2.0.0.1" }, sacn: { listening: false, packets: 0, off: true },
  osc: { listening: true, port: 8000, packets: 0 }, lj: { listening: true, port: 4545, clients: 0, pro: { host: "studio-mac.local", connected: true } },
};

describe("Suite-Diagnose: Schreiber", () => {
  it("legt diagnose/vj.json beim Start an und schreibt beim Beenden running: false", () => {
    const dir = temp();
    const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0.1.18", dir });
    vi.advanceTimersByTime(1100);
    const a = read(dir);
    expect(a).toMatchObject({ suite: "diagnose", v: 1, id: "vj", app: "VJ-Link", version: "0.1.18", running: true });
    expect(new Date(a.at).toISOString()).toBe(a.at);
    d.report(buildVjDiag(R, { outputs: [{ kind: "display", w: 1920, h: 1080 }], net: NET, phone: false, ffmpeg: true }));
    vi.advanceTimersByTime(1100);
    expect(read(dir).summary["Anordnung"]).toBe("Projektionsmapping, 2 Masken");
    d.stop();
    expect(read(dir).running).toBe(false);
    // atomar: keine liegengebliebene .tmp
    expect(readdirSync(path.join(dir, "diagnose"))).toEqual(["vj.json"]);
  });

  it("bleibt unter 16 KB, auch mit vielen langen Fehlern, und behält die letzten 20", () => {
    const dir = temp();
    const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0.1.18", dir });
    for (let i = 0; i < 60; i++) d.error(`Fehler ${i} ` + "x".repeat(400));
    d.report({ summary: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`Feld ${i}`, "y".repeat(500)])) });
    d.stop();
    const text = readFileSync(path.join(dir, "diagnose", "vj.json"), "utf8");
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(16 * 1024);
    const doc = JSON.parse(text);
    expect(doc.errors.length).toBeLessThanOrEqual(20);
    expect(doc.errors[doc.errors.length - 1].text.startsWith("Fehler 59")).toBe(true);
    expect(Object.keys(doc.summary).length).toBeLessThanOrEqual(20);
  });

  it("schreibt höchstens 1× pro Sekunde und sonst alle 30 s", () => {
    const dir = temp();
    const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0.1.18", dir });
    vi.advanceTimersByTime(1100);
    d.error("a"); vi.advanceTimersByTime(10);       // eine Sekunde nach dem Start: sofort geschrieben
    const first = read(dir).at;
    expect(read(dir).errors.length).toBe(1);
    d.error("b"); d.error("c");
    vi.advanceTimersByTime(500);
    expect(read(dir).at).toBe(first);               // innerhalb einer Sekunde nicht noch einmal
    vi.advanceTimersByTime(600);
    expect(read(dir).errors.length).toBe(3);
    // ohne Meldungen: nach 30 s von selbst wieder
    const before = read(dir).at;
    vi.advanceTimersByTime(36_000);
    expect(read(dir).at).not.toBe(before);
    d.stop();
  });

  it("legt den Link-Suite-Ordner nie selbst an (Link-Suite nicht installiert: keine Datei)", () => {
    const dir = path.join(temp(), "Link-Suite");
    const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0.1.19", dir });
    vi.advanceTimersByTime(1100); d.error("x"); vi.advanceTimersByTime(1100); d.stop();
    expect(existsSync(dir)).toBe(false);
  });

  it("stört nicht, wenn der Ordner nicht beschreibbar ist", () => {
    const dir = temp();
    writeFileSync(path.join(dir, "diagnose"), "keine Mappe"); // Datei statt Ordner
    const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0.1.18", dir });
    expect(() => { vi.advanceTimersByTime(1100); d.error("x"); vi.advanceTimersByTime(1100); d.stop(); }).not.toThrow();
  });
});

describe("Suite-Diagnose: nichts, was nie hinein darf", () => {
  it("säubert freien Text: erste Zeile, Pfade, Adressen, Kennungen", () => {
    const home = "/Users/philipp", tmp = "/var/folders/x7/abc/T";
    const c = (s: string) => cleanDiagText(s, home, tmp);
    expect(c("Fehler in /Users/philipp/Shows/Kunde X/a.mov\n    at foo (bar.js:1)")).toBe("Fehler in ~/Shows/Kunde X/a.mov");
    expect(c("/users/PHILIPP/x")).toBe("~/x");
    expect(c("C:\\Users\\PHILIP~1\\AppData\\Local\\Temp\\x.mov")).not.toMatch(/PHILIP/);
    expect(c("C:\\Users\\Max Mustermann\\a")).not.toMatch(/Mustermann/);
    expect(c("/var/folders/x7/abc/T/vj-1/x")).toBe("[tmp]/vj-1/x");
    expect(c("geladen: file:///Users/anna/Kunde%20X/logo.mov")).toBe("geladen: [Datei]");
    expect(c("/Volumes/Kunde-Stick/show.vjlink")).toBe("/Volumes/[Laufwerk]/show.vjlink");
    expect(c("\\\\NAS\\Kunden\\a")).not.toMatch(/Kunden/);
    expect(c("an max@example.com")).toBe("an [E-Mail]");
    expect(c("Karte a4:83:e7:12:34:56")).toBe("Karte [MAC]");
    expect(c("fe80::1c2b:3cff:fe4d:5e6f")).toBe("[IPv6]");
    expect(c("2001:db8:85a3:0:0:8a2e:370:7334 weg")).toBe("[IPv6] weg");
    expect(c("Timecode 01:00:00:00 um 16:10:12")).toBe("Timecode 01:00:00:00 um 16:10:12");
    expect(c("von 8.8.8.8 und 2.0.0.1 und 192.168.1.20")).toBe("von [IP] und 2.0.0.1 und 192.168.1.20");
    expect(c("Java 21.0.13.0.3 und Electron 45.2.3")).toBe("Java 21.0.13.0.3 und Electron 45.2.3");
    expect(c("Karte a4-83-e7-12-34-56")).toBe("Karte [MAC]");
    expect(c("LJ-Link auf studio-mac.local")).toBe("LJ-Link auf [Rechner]");
    expect(cleanDiagText("Fehler auf Philipps-MBP", "", "", 300, "Philipps-MBP")).toBe("Fehler auf [Rechner]");
    expect(c("/private/var/folders/x7/abc/T/a")).toBe("[tmp]/a");
    expect(c("token abcdefghijklmnopqrstuvwxyz0123456789ABCD")).toBe("token [Kennung]");
    expect(c("ab ".repeat(200)).length).toBe(300);
  });

  it("Show-Netz-Adressen erkennen", () => {
    for (const ip of ["2.0.0.1", "10.0.0.5", "192.168.0.2", "172.16.1.1", "127.0.0.1"]) expect(isShowIp(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "85.1.2.3"]) expect(isShowIp(ip)).toBe(false);
  });

  it("nimmt von der Oberfläche nur Zahlen, Schalter und feste Wörter", () => {
    const p = parseRendererDiag({ ...R, mode: "Kunde X", tempo: "<script>", tcWays: ["ltc", "mein Pult"], projectName: "Silvester bei Anna", bpm: -5, layers: 1e9 })!;
    expect(p.mode).toBe("mirror"); expect(p.tempo).toBe("manual"); expect(p.tcWays).toEqual(["ltc"]);
    expect(p.bpm).toBe(0); expect(p.layers).toBe(1000);
    expect(JSON.stringify(p)).not.toMatch(/Anna|Silvester|Kunde|script|Pult/);
    expect(parseRendererDiag("text")).toBeNull();
  });

  it("die fertige Diagnose enthält keine Namen, Hostnamen, öffentlichen IPs oder Pfade", () => {
    const net: NetStatus = { ...NET, light: { name: "en7 (Thunderbolt von Anna)", address: "2.0.0.10" },
      artnet: { listening: true, packets: 5, lastFrom: "85.12.3.4" }, osc: { listening: false, packets: 0, port: 8000, error: "EADDRINUSE /Users/anna/x 8.8.4.4" } };
    const st = buildVjDiag(R, { outputs: [{ kind: "ndi", w: 1920, h: 1080 }, { kind: "display", w: 3840, h: 2160 }], net, phone: true, ffmpeg: false });
    const text = JSON.stringify(st);
    expect(text).not.toMatch(/Anna|anna|studio-mac|85\.12|8\.8\.4\.4|Thunderbolt|\/Users\//);
    expect(st.summary!["Ausgänge"]).toBe("2 (NDI 1920×1080, Bildschirm 3840×2160)");
    expect(st.summary!["Timecode"]).toBe("sendet (Art-Net + LTC), läuft");
    expect(st.checks!.find(c => c.name === "Videos")).toMatchObject({ ok: false });
    expect(st.checks!.find(c => c.name === "Video-Umwandlung (ffmpeg)")).toMatchObject({ ok: false });
    expect(Object.keys(st.summary!).length).toBeLessThanOrEqual(20);
    expect(st.checks!.length).toBeLessThanOrEqual(20);
    // Art-Net aus dem Show-Netz darf als Hinweis drin sein
    const ok = buildVjDiag(R, { outputs: [], net: NET, phone: false, ffmpeg: true });
    expect(ok.checks!.find(c => c.name === "Art-Net")!.detail).toBe("Pakete von 2.0.0.1");
  });
});

it("Testinstanzen schreiben nie in den echten Link-Suite-Ordner (eigener Datenordner)", () => {
  // main.ts gibt bei VJLINK_DATA einen eigenen Ordner mit; hier nur: mit dir wird genau dort geschrieben
  const dir = temp();
  mkdirSync(path.join(dir, "suite")); // wie main.ts bei VJLINK_DATA
  const d = startDiagnose({ id: "vj", app: "VJ-Link", version: "0", dir: path.join(dir, "suite") });
  vi.advanceTimersByTime(1100); d.stop();
  expect(existsSync(path.join(dir, "suite", "diagnose", "vj.json"))).toBe(true);
});
