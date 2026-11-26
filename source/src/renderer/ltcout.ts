// LTC über einen Audio-Ausgang: eigener AudioContext auf dem gewählten Gerät, Signal auf einem Kanal.
// Das Signal entsteht stückweise im Voraus (≈ 0,15 s) und wird lückenlos hintereinander abgespielt; jedes Bild trägt
// den Timecode der Uhr zu dem Zeitpunkt, an dem es aus dem Ausgang kommt.
import { LtcWriter, type LtcFrame } from "../core/ltc";
import { framesToTc, nominal, type TimecodeClock } from "../core/timecode";

export interface LtcOptions { device: string; channel: number; levelDb: number }
export interface LtcState { on: boolean; channels: number; error: string; frames: number | null }

const CHUNK = 1024;
const AHEAD = 0.15;

export class LtcOut {
  private ac: AudioContext | null = null;
  private merger: ChannelMergerNode | null = null;
  private writer: LtcWriter | null = null;
  private timer = 0;
  /** Audiozeit des ersten Samples des Writers (Bezug für die Sample-Zählung). */
  private base = 0;
  private baseSample = 0;
  private last: number | null = null;
  private amp = 0.25;
  private ch = 0;
  private opts: LtcOptions | null = null;
  private busy: Promise<void> = Promise.resolve();
  state: LtcState = { on: false, channels: 2, error: "", frames: null };
  /** Nur Tests: die zuletzt erzeugten Samples (≈ 1 s) mitschreiben. */
  tap: Float32Array[] | null = null;

  constructor(private clock: TimecodeClock) {}

  /** Starten bzw. mit neuen Einstellungen neu starten; `null` beendet die Ausgabe. */
  set(o: LtcOptions | null): Promise<void> {
    const same = !!o && !!this.opts && o.device === this.opts.device && o.channel === this.opts.channel && !!this.ac;
    this.opts = o;
    if (same && o) { this.amp = Math.pow(10, o.levelDb / 20); return this.busy; }
    this.busy = this.busy.then(() => this.restart()).catch(() => { /* Fehler steht im Zustand */ });
    return this.busy;
  }

  private async restart(): Promise<void> {
    this.stopNow();
    const o = this.opts;
    if (!o) return;
    try {
      const ac = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
      const sink = ac as AudioContext & { setSinkId?: (id: string) => Promise<void> };
      if (o.device && sink.setSinkId) {
        try { await sink.setSinkId(o.device); } catch { this.state.error = "device"; }
      }
      const max = Math.max(1, ac.destination.maxChannelCount || 2);
      const want = Math.max(1, Math.round(o.channel));
      this.ch = Math.min(want, max) - 1;
      const n = Math.max(2, Math.min(max, this.ch + 1));
      ac.destination.channelCount = n;
      ac.destination.channelCountMode = "explicit";
      ac.destination.channelInterpretation = "discrete";
      const merger = ac.createChannelMerger(n);
      merger.connect(ac.destination);
      this.ac = ac; this.merger = merger;
      this.amp = Math.pow(10, o.levelDb / 20);
      this.writer = new LtcWriter(ac.sampleRate, at => this.frameAt(at));
      this.base = ac.currentTime + 0.05; this.baseSample = 0; this.last = null;
      this.state = { on: true, channels: max, error: this.state.error === "device" ? "device" : want > max ? "channel" : "", frames: null };
      if (ac.state === "suspended") await ac.resume().catch(() => { /* ohne Benutzergeste evtl. erst später */ });
      this.timer = window.setInterval(() => this.pump(), 20);
      this.pump();
    } catch (e) {
      this.stopNow();
      this.state = { on: false, channels: 2, error: String((e as Error)?.message ?? e), frames: null };
    }
  }

  private stopNow(): void {
    clearInterval(this.timer); this.timer = 0;
    const ac = this.ac;
    this.ac = null; this.merger = null; this.writer = null;
    if (ac) void ac.close().catch(() => { /* schon zu */ });
    this.state = { on: false, channels: this.state.channels, error: "", frames: null };
  }

  /** Wanduhr (Epoch-ms), zu der ein Sample an Audiozeit `t` aus dem Ausgang kommt. */
  private wallAt(t: number): number {
    const ac = this.ac!;
    const ts = ac.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0)
      return performance.timeOrigin + ts.performanceTime + (t - ts.contextTime) * 1000;
    return Date.now() + (t - ac.currentTime + (ac.outputLatency || ac.baseLatency || 0)) * 1000;
  }

  /** Welcher Timecode im Bild ab Sample `at` steckt (null = Stille). */
  private frameAt(at: number): LtcFrame | null {
    if (!this.ac) return null;
    const t = this.base + (at - this.baseSample) / this.ac.sampleRate;
    const o = this.clock.outgoing(this.wallAt(t));
    if (!o || !o.running) { this.last = null; this.state.frames = null; return null; }
    let f = Math.floor(o.frames + 1e-6);
    // Gleichmäßig weiterzählen; nur bei echten Sprüngen (Springen, Cue-Wechsel) neu setzen
    const day = 24 * 3600 * nominal(o.fps);
    if (this.last !== null && Math.abs(f - (this.last + 1)) <= 1) f = this.last + 1;
    f = ((f % day) + day) % day;
    this.last = f;
    this.state.frames = f;
    return { tc: framesToTc(f, o.fps), fps: o.fps };
  }

  /** Stücke bis AHEAD Sekunden im Voraus einplanen. */
  private pump(): void {
    const ac = this.ac, w = this.writer, merger = this.merger;
    if (!ac || !w || !merger) return;
    const sr = ac.sampleRate;
    let next = this.base + (w.position - this.baseSample) / sr;
    if (next < ac.currentTime + 0.005) {
      // Aussetzer (z. B. Rechner ausgelastet): neu ansetzen, der nächste Timecode wird frisch gesetzt
      this.base = ac.currentTime + 0.03; this.baseSample = w.position; this.last = null;
      w.restart(w.position);
      next = this.base;
    }
    while (next < ac.currentTime + AHEAD) {
      const buf = ac.createBuffer(1, CHUNK, sr);
      w.render(buf.getChannelData(0), this.amp);
      if (this.tap) { this.tap.push(buf.getChannelData(0).slice()); if (this.tap.length > 50) this.tap.shift(); }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(merger, 0, this.ch);
      src.start(next);
      next += CHUNK / sr;
    }
  }
}

/** Ausgabegeräte für Audio (für die Auswahl in den Einstellungen). */
export async function audioOutputs(): Promise<{ id: string; label: string }[]> {
  try {
    const list = await navigator.mediaDevices.enumerateDevices();
    return list.filter(d => d.kind === "audiooutput" && d.deviceId !== "default" && d.deviceId !== "communications")
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Audio ${i + 1}` }));
  } catch { return []; }
}
