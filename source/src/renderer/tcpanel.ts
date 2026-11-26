import { t } from "../core/i18n";
// Einstellungen → Timecode. Empfangen und Senden sind getrennt einschaltbar:
// VJ-Link folgt einem Pult/Programm und kann gleichzeitig Timecode an eine MA schicken.
import {
  TC_RATES, buildArtTimecode, formatFrames, framesToTc, mtcQuarterFrames, parseTc, tcToFrames,
  type TcFps, type TcSendFrom, type TcSource, type TimecodeClock,
} from "../core/timecode";
import { LtcOut, audioOutputs } from "./ltcout";

export interface TcSettings {
  receive: boolean; send: boolean; sendFrom: TcSendFrom;
  source: TcSource; fps: TcFps; chase: boolean; offset: string; freewheel: number;
  via: "artnet" | "mtc" | "both"; host: string; midiOut: string; start: string;
  /** Wege zum Senden (unabhängig): Art-Net, MIDI (MTC), Audio (LTC). Ohne Angabe gilt `via` (ältere Einstellungen). */
  outArt?: boolean; outMtc?: boolean;
  ltc: boolean; ltcDevice: string; ltcChannel: number; ltcLevel: number;
  /** Alt (vor Version mit getrenntem Empfangen/Senden). */
  mode?: "off" | "receive" | "send";
}
export const defaultTcSettings = (): TcSettings => ({
  receive: false, send: false, sendFrom: "own",
  source: "artnet", fps: 25, chase: true, offset: "00:00:00:00", freewheel: 2,
  via: "artnet", host: "255.255.255.255", midiOut: "", start: "00:00:00:00",
  outArt: true, outMtc: false, ltc: false, ltcDevice: "", ltcChannel: 1, ltcLevel: -12,
});

export interface TcDeps {
  midiOutputs(): string[];
  sendMidi(device: string, bytes: number[]): void;
  sendArt(bytes: Uint8Array, host: string): void;
  toast(msg: string): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
const fpsLabel = (f: TcFps) => (f === 29.97 ? "29,97 DF" : String(f));
const realRate = (f: TcFps) => (f === 29.97 ? 30000 / 1001 : f);

export class TcPanel {
  private root: HTMLElement | null = null;
  private inBig = el("div", "tc-big");
  private inStatus = el("p", "am-hint");
  private outBig = el("div", "tc-big");
  private outStatus = el("p", "am-hint");
  private qf = 0;
  private latched = 0;
  private timer = 0;
  readonly ltc: LtcOut;

  constructor(private clock: TimecodeClock, private s: TcSettings, private save: () => void, private d: TcDeps) {
    // Alte Einstellung übernehmen
    if (s.mode) { s.receive = s.mode === "receive"; s.send = s.mode === "send"; delete s.mode; }
    if (s.outArt === undefined || s.outMtc === undefined) { s.outArt = s.via !== "mtc"; s.outMtc = s.via !== "artnet"; }
    this.ltc = new LtcOut(clock);
    this.apply();
  }

  /** Einstellungen auf die Uhr übertragen und den Sende-Takt anpassen. */
  apply(): void {
    const c = this.clock, s = this.s;
    c.receiveOn = s.receive; c.sendOn = s.send; c.sendFrom = s.sendFrom;
    c.source = s.source; c.chase = s.chase; c.freewheel = s.freewheel; c.sendFps = s.fps;
    // Bildanteil bis 29 erlauben; umgerechnet wird erst mit der Bildrate des empfangenen Signals
    c.offsetTc = parseTc(s.offset, 30);
    // Für ältere Versionen: `via` aus den Wegen ableiten
    s.via = s.outArt && s.outMtc ? "both" : s.outMtc ? "mtc" : "artnet";
    clearInterval(this.timer);
    if (s.send && (s.outArt || s.outMtc)) this.timer = window.setInterval(() => this.tick(), 1000 / (realRate(s.fps) * 4));
    void this.ltc.set(s.send && s.ltc ? { device: s.ltcDevice, channel: s.ltcChannel, levelDb: s.ltcLevel } : null).then(() => {
      // Kanalzahl des Geräts erst nach dem Start bekannt: Auswahl dann neu aufbauen
      if (this.root?.isConnected && this.s.ltc && this.ltc.state.channels !== this.builtCh) this.build(this.root);
      else this.update();
    });
  }

  /** Viermal pro Bild: MTC-Viertelbilder, einmal pro Bild Art-Net. */
  private tick(): void {
    const now = this.clock.outgoing(Date.now());
    if (!now || !now.running) return;
    const s = this.s, fps = now.fps;
    if (s.outMtc && s.midiOut) {
      if (this.qf === 0) this.latched = Math.floor(now.frames);
      this.d.sendMidi(s.midiOut, [0xf1, mtcQuarterFrames(framesToTc(this.latched, fps), fps)[this.qf]!]);
    }
    if (s.outArt && this.qf % 4 === 0) this.d.sendArt(buildArtTimecode(framesToTc(Math.floor(now.frames), fps), fps), s.host);
    this.qf = (this.qf + 1) % 8;
  }

  build(root: HTMLElement): void {
    this.root = root;
    root.replaceChildren();
    const s = this.s;
    const rebuild = () => { this.save(); this.apply(); this.build(root); };
    const seg = <T extends string>(label: string, opts: [T, string][], get: () => T, set: (v: T) => void) => {
      const r = el("div", "set-row"); r.append(el("span", "", label));
      const g = el("div", "seg2");
      for (const [k, lbl] of opts) {
        const b = el("button", get() === k ? "on" : "", lbl);
        b.addEventListener("click", () => { set(k); rebuild(); });
        g.append(b);
      }
      r.append(g); root.append(r);
    };
    const text = (label: string, get: () => string, set: (v: string) => boolean, hint = "", wide = false) => {
      const r = el("label", "set-row"); r.append(el("span", "", label));
      const w = el("span", "inline");
      const i = el("input", wide ? "tc-in wide" : "tc-in"); i.value = get();
      i.addEventListener("change", () => { if (set(i.value.trim())) { this.save(); this.apply(); } else { this.d.toast(t("Bitte die Eingabe prüfen.")); i.value = get(); } });
      w.append(i); if (hint) w.append(el("small", "muted", hint));
      r.append(w); root.append(r);
    };
    const onOff = (title: string, get: () => boolean, set: (v: boolean) => void, sub: string) => {
      const h = el("div", "tc-head");
      const hd = el("div"); hd.append(el("h3", "", title), el("p", "am-hint", sub));
      const b = el("button", `btn small-btn${get() ? " on" : ""}`, get() ? t("an") : t("aus"));
      b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); rebuild(); });
      h.append(hd, b); root.append(h);
    };

    // ---- Eingang
    onOff(t("Empfangen"), () => s.receive, v => { s.receive = v; }, t("Ein Pult oder Programm gibt die Zeit vor. Cues mit Start „Timecode“ folgen ihm."));
    if (s.receive) {
      root.append(this.inBig, this.inStatus);
      seg(t("Quelle"), [["artnet", "Art-Net"], ["mtc", "MIDI (MTC)"]], () => s.source, v => { s.source = v; });
      seg(t("Videos"), [["chase", t("folgen dem Timecode")], ["start", t("werden nur gestartet")]], () => (s.chase ? "chase" : "start"), v => { s.chase = v === "chase"; });
      seg(t("Bei Aussetzer"), [["2", t("2 s weiterlaufen")], ["0.3", t("sofort anhalten")]], () => (s.freewheel >= 1 ? "2" : "0.3"), v => { s.freewheel = Number(v); });
      text(t("Versatz"), () => s.offset, v => { if (!parseTc(v, 30)) return false; s.offset = v; return true; }, t("wird zum empfangenen Wert addiert"));
    }

    // ---- Ausgang
    onOff(t("Senden"), () => s.send, v => { s.send = v; }, t("VJ-Link sendet Timecode, z. B. an eine MA, deren Timecode-Show dann Befehle auslöst."));
    if (s.send) {
      root.append(this.outBig, this.outStatus);
      seg(t("Was senden"), [["own", t("VJ-Link ist Master")], ["thru", t("Empfangenen weitergeben")]], () => s.sendFrom, v => { s.sendFrom = v; });
      if (s.sendFrom === "own") seg(t("Bildrate"), TC_RATES.map(f => [String(f), fpsLabel(f)] as [string, string]), () => String(s.fps), v => { s.fps = Number(v) as TcFps; });
      {
        // Mehrere Wege gleichzeitig möglich
        const r = el("div", "set-row"); r.append(el("span", "", t("Senden über")));
        const g = el("div", "seg2");
        const ways: [string, () => boolean, (v: boolean) => void][] = [
          ["Art-Net", () => !!s.outArt, v => { s.outArt = v; }],
          ["MIDI (MTC)", () => !!s.outMtc, v => { s.outMtc = v; }],
          [t("Audio (LTC)"), () => s.ltc, v => { s.ltc = v; }],
        ];
        for (const [lbl, get, set] of ways) {
          const b = el("button", get() ? "on" : "", lbl); b.setAttribute("aria-pressed", String(get()));
          b.addEventListener("click", () => { set(!get()); rebuild(); });
          g.append(b);
        }
        r.append(g); root.append(r);
        if (!s.outArt && !s.outMtc && !s.ltc) root.append(el("p", "am-hint warn", t("Kein Weg gewählt: Es wird nichts gesendet.")));
      }
      if (s.outArt) text(t("Art-Net-Ziel"), () => s.host, v => { if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return false; s.host = v; return true; }, t("IP der MA oder 255.255.255.255 für alle"), true);
      if (s.outMtc) {
        const r = el("div", "set-row"); r.append(el("span", "", t("MIDI-Ausgang")));
        const g = el("div", "am-list");
        const outs = this.d.midiOutputs();
        if (!outs.length) g.append(el("p", "am-hint", t("Kein MIDI-Ausgang gefunden.")));
        for (const o of outs) {
          const b = el("button", "am-item", o); b.setAttribute("aria-checked", String(s.midiOut === o));
          b.addEventListener("click", () => { s.midiOut = o; rebuild(); });
          g.append(b);
        }
        r.append(g); root.append(r);
      }
      if (s.ltc) this.buildLtc(root, rebuild);
      if (s.sendFrom === "own") {
        text(t("Startzeit"), () => s.start, v => { if (!parseTc(v, s.fps)) return false; s.start = v; return true; });
        const act = el("div", "set-row"); act.append(el("span", "", t("Uhr")));
        const w = el("span", "inline wrap");
        const go = el("button", "btn small-btn", "▶ Start"); go.dataset.ctl = "tc.start";
        go.addEventListener("click", () => this.clock.start(Date.now()));
        const st = el("button", "btn small-btn", t("■ Stopp")); st.dataset.ctl = "tc.stop";
        st.addEventListener("click", () => this.clock.stop(Date.now()));
        const zero = el("button", "btn small-btn", t("Auf Startzeit")); zero.dataset.ctl = "tc.zero";
        zero.addEventListener("click", () => { const t = parseTc(s.start, s.fps); this.clock.locate(t ? tcToFrames(t, s.fps) : 0, Date.now()); });
        w.append(go, st, zero); act.append(w); root.append(act);
        root.append(el("p", "am-hint", t("Die Zeit kann auch der SHOW-Ablauf vorgeben: Bei jedem Cue lässt sich „Timecode ab“ eintragen; läuft der Cue, folgt der Timecode seiner Stelle. Dazu Cue „+ Timecode“ (Start ab Zeit, Stopp, Springen) und Mapping.")));
      }
    }
    this.update();
  }

  /** LTC: Ausgabegerät, Kanal, Pegel. */
  private buildLtc(root: HTMLElement, rebuild: () => void): void {
    const s = this.s;
    root.append(el("h4", "tc-sub", t("Audio (LTC)")));
    const r = el("div", "set-row"); r.append(el("span", "", t("Ausgang")));
    const g = el("div", "am-list");
    const item = (id: string, label: string) => {
      const b = el("button", "am-item", label); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(s.ltcDevice === id));
      b.addEventListener("click", () => { s.ltcDevice = id; rebuild(); });
      g.append(b);
    };
    item("", t("Standard des Systems"));
    void audioOutputs().then(list => {
      for (const d of list) item(d.id, d.label);
      if (s.ltcDevice && !list.some(d => d.id === s.ltcDevice)) item(s.ltcDevice, t("Gerät nicht verbunden"));
    });
    r.append(g); root.append(r);
    this.builtCh = this.ltc.state.channels;
    const n = Math.max(2, Math.min(16, this.ltc.state.channels));
    const chs: [string, string][] = [];
    for (let i = 1; i <= Math.max(n, s.ltcChannel); i++) chs.push([String(i), i === 1 && n === 2 ? t("1 links") : i === 2 && n === 2 ? t("2 rechts") : String(i)]);
    const seg = (label: string, opts: [string, string][], get: () => string, set: (v: string) => void) => {
      const rr = el("div", "set-row"); rr.append(el("span", "", label));
      const gg = el("div", "seg2");
      for (const [k, lbl] of opts) { const b = el("button", get() === k ? "on" : "", lbl); b.addEventListener("click", () => { set(k); rebuild(); }); gg.append(b); }
      rr.append(gg); root.append(rr);
    };
    seg(t("Kanal"), chs, () => String(s.ltcChannel), v => { s.ltcChannel = Number(v); });
    seg(t("Pegel"), [["-18", "−18 dBFS"], ["-12", "−12 dBFS"], ["-6", "−6 dBFS"]], () => String(s.ltcLevel), v => { s.ltcLevel = Number(v); });
    root.append(el("p", "am-hint", t("LTC ist ein Audiosignal, das Lichtpulte, Medienserver und Recorder über einen Audio-Eingang lesen. Leg es auf einen eigenen Ausgang oder einen freien Kanal, nicht auf den Kanal mit dem Ton der Videos. Bei 25 fps sendet VJ-Link 25 Bilder/s mit 2000 Bit/s.")));
    root.append(this.ltcStatus);
  }
  private ltcStatus = el("p", "am-hint");
  private builtCh = 0;

  /** Anzeigen nachführen (wenn sichtbar). */
  update(): void {
    if (!this.root || !this.root.isConnected) return;
    const nowMs = Date.now(), c = this.clock;
    const i = c.incoming(nowMs), o = c.outgoing(nowMs);
    this.inBig.textContent = i ? formatFrames(Math.floor(i.frames), i.fps) : "--:--:--:--";
    this.inBig.classList.toggle("run", !!i?.running); this.inBig.classList.toggle("stale", !!i?.stale);
    this.inStatus.textContent = i ? `${i.stale ? t("Kein Signal mehr · ") : i.running ? t("läuft · ") : t("steht · ")}${fpsLabel(c.fps)} fps${c.from ? t(" · von {host}", { host: c.from }) : ""}` : t("Wartet auf Timecode …");
    this.outBig.textContent = o ? formatFrames(Math.floor(o.frames), o.fps) : "--:--:--:--";
    this.outBig.classList.toggle("run", !!o?.running);
    const ways = [this.s.outArt ? "Art-Net" : "", this.s.outMtc ? "MIDI" : "", this.s.ltc ? "LTC" : ""].filter(Boolean).join(" + ") || t("kein Weg");
    this.outStatus.textContent = o ? (o.running ? `${t("sendet")} · ${fpsLabel(o.fps)} fps · ${ways}` : t("angehalten")) : t("nichts zu senden (kein Eingang)");
    const ls = this.ltc.state;
    this.ltcStatus.textContent = !this.s.ltc ? "" : ls.error === "device" ? t("⚠ Das gewählte Gerät ist nicht verfügbar – LTC läuft über den Standard-Ausgang.")
      : ls.error === "channel" ? t("⚠ Das Gerät hat nur {n} Kanäle – LTC läuft auf Kanal {n}.", { n: ls.channels })
      : ls.error ? t("⚠ Audio-Ausgabe nicht möglich: {err}", { err: ls.error })
      : !ls.on ? t("LTC ist aus.") : ls.frames !== null ? t("LTC läuft auf Kanal {ch} ({n} Kanäle am Gerät).", { ch: Math.min(this.s.ltcChannel, ls.channels), n: ls.channels }) : t("LTC bereit, wartet auf laufenden Timecode.");
    this.ltcStatus.classList.toggle("warn", !!ls.error);
  }
}
