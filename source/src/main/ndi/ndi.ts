// NDI®-Ausgang im Hauptprozess: startet den NDI-Prozess erst, wenn der Nutzer den NDI-Ausgang öffnet (vorher wird
// nichts geladen und nichts ins Netz gesendet), und reicht die Bilder des unsichtbaren Ausgangsfensters weiter.
// Höchstens zwei Bilder unterwegs (eins wird komprimiert, eins wartet); weitere fallen weg.
// Nach VD-Link electron/ndi/ndi.ts (gleicher Autor, EPL-2.0). NDI® ist eine eingetragene Marke der Vizrt NDI AB.

import { utilityProcess, type UtilityProcess } from "electron";
import path from "node:path";
import { findRuntime } from "./ndi-paths";

export interface NdiState {
  /** Sender läuft. */
  live: boolean;
  /** Gesendete Bilder je Sekunde und verbundene Empfänger (letzte Sekunde). */
  fps: number;
  conns: number;
  version?: string;
  error?: string;
}

/** Zwei Bilder unterwegs: Kopieren/Übergeben des nächsten läuft, während NDI das vorige komprimiert. */
const IN_FLIGHT = 2;

export class NdiSender {
  private child: UtilityProcess | null = null;
  /** Bilder beim NDI-Prozess, die noch nicht gesendet sind (höchstens IN_FLIGHT). */
  private inFlight = 0;
  private busySince = 0;
  private startWait: ((r: { ok: boolean; version?: string; error?: string }) => void) | null = null;
  state: NdiState = { live: false, fps: 0, conns: 0 };

  /** `env`: Zusätze für den NDI-Prozess, z. B. NDI_CONFIG_DIR für die gewählte Netzwerkkarte (gilt ab dem nächsten Start). */
  constructor(private onState: (s: NdiState) => void, private env: () => Record<string, string> = () => ({})) {}

  private worker(): UtilityProcess {
    if (this.child) return this.child;
    const c = forkWorker(this.env());
    c.on("message", (m: { t: string; ok?: boolean; version?: string; error?: string; fps?: number; conns?: number; ms?: number }) => {
      if (m.t === "started") { this.startWait?.({ ok: !!m.ok, version: m.version, error: m.error }); this.startWait = null; }
      else if (m.t === "sent") this.inFlight = Math.max(0, this.inFlight - 1);
      else if (m.t === "stat") {
        this.state = { ...this.state, fps: m.fps ?? 0, conns: m.conns ?? 0 }; this.onState(this.state);
        if (process.env.VJLINK_DEBUG) console.log(`[ndi] gesendet ${m.fps}/s, NDI-Aufruf ${(m.ms ?? 0).toFixed(1)} ms, Empfänger ${m.conns}`);
      }
      else if (m.t === "error") console.error("NDI:", m.error);
    });
    c.on("exit", code => {
      // Ein absichtlich beendeter alter Prozess (Neustart) darf den neuen nicht abmelden
      if (this.child !== c) return;
      if (code) console.error("NDI-Prozess beendet", code);
      this.child = null; this.inFlight = 0;
      this.startWait?.({ ok: false, error: "process" }); this.startWait = null;
      if (this.state.live) { this.state = { live: false, fps: 0, conns: 0, error: "process" }; this.onState(this.state); }
    });
    this.child = c;
    return c;
  }

  /** Sender unter diesem Namen starten (im Netz: „RECHNERNAME (name)“). */
  async start(name: string, fps: number): Promise<NdiState> {
    const file = findRuntime();
    if (!file) { this.state = { live: false, fps: 0, conns: 0, error: "runtime-missing" }; this.onState(this.state); return this.state; }
    const r = await new Promise<{ ok: boolean; version?: string; error?: string }>(res => {
      this.startWait?.({ ok: false, error: "restart" });
      this.startWait = res;
      this.worker().postMessage({ t: "start", file, name, fps });
      setTimeout(() => { if (this.startWait === res) { this.startWait = null; res({ ok: false, error: "timeout" }); } }, 8000);
    });
    this.inFlight = 0;
    this.state = r.ok ? { live: true, fps: 0, conns: 0, version: r.version } : { live: false, fps: 0, conns: 0, error: r.error };
    this.onState(this.state);
    return this.state;
  }

  /** NDI nimmt gerade ein Bild an (sonst gar nicht erst kopieren). */
  ready(): boolean { return this.state.live && !!this.child && (this.inFlight < IN_FLIGHT || Date.now() - this.busySince >= 2000); }

  /** Ein Bild (BGRA, Zeilen ohne Lücke) senden, wenn NDI frei ist. */
  frame(data: Buffer, w: number, h: number): void {
    if (!this.ready()) return;
    // Hängt ein Aufruf (sollte nie passieren), nach 2 s trotzdem weiter
    if (this.inFlight >= IN_FLIGHT) this.inFlight = 0;
    this.inFlight++; this.busySince = Date.now();
    this.child!.postMessage({ t: "frame", data, w, h });
  }

  stop(): void {
    if (this.state.live || this.state.error) { this.state = { live: false, fps: 0, conns: 0 }; this.onState(this.state); }
    this.child?.postMessage({ t: "stop" });
  }

  /** Beim Beenden: NDI-Prozess beenden (gibt den Sender frei). */
  kill(): void { const c = this.child; this.child = null; this.inFlight = 0; c?.kill(); }

  /**
   * NDI-Prozess neu starten (z. B. andere Netzwerkkarte: NDI liest seine Konfiguration nur beim Start des Prozesses).
   * Nur wenn er gerade sendet; sonst gilt die Änderung beim nächsten Öffnen.
   */
  async restart(name: string, fps: number): Promise<void> {
    if (!this.state.live && !this.state.error) return;
    this.kill();
    await this.start(name, fps);
  }
}

function forkWorker(env: Record<string, string>): UtilityProcess {
  return utilityProcess.fork(path.join(__dirname, "ndi-worker.js"), [], { serviceName: "VJ-Link NDI", stdio: "inherit", env: { ...process.env, ...env } });
}

/** Version der installierten NDI-Laufzeit, ohne etwas zu senden (eigener kurzer NDI-Prozess). */
export function probeNdiVersion(): Promise<{ version?: string; error?: string }> {
  const file = findRuntime();
  if (!file) return Promise.resolve({ error: "runtime-missing" });
  return new Promise(res => {
    const c = forkWorker({});
    const done = (r: { version?: string; error?: string }) => { clearTimeout(t); res(r); c.kill(); };
    const t = setTimeout(() => done({ error: "timeout" }), 8000);
    c.on("message", (m: { t: string; ok?: boolean; version?: string; error?: string }) => { if (m.t === "version") done(m.ok ? { version: m.version } : { error: m.error }); });
    c.on("exit", () => done({ error: "process" }));
    c.postMessage({ t: "version", file });
  });
}
