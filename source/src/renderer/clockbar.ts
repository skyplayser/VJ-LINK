// Uhrzeit-Leiste oben im Bedienfenster (nie auf den Ausgängen): Uhrzeit des Rechners als bernsteinfarbene
// Punktmatrix wie eine LED-Bühnenuhr, auf Wunsch (Alpha) der Art-Net-Timecode aus dem Netz.
// Punktschrift und Zeichnen nach LJ-Link (src/main/resources/web/app.js, DOT_FONT/drawDotClock; gleicher Autor,
// Eclipse Public License 2.0), Aussehen nach der Spezifikation „Uhrzeit-Leiste“ der Link-Suite.
import { t } from "../core/i18n";
import { DOT_FONT } from "../core/dotfont";
import { clockView, fpsLabel, NetTimecode, type ClockView } from "../core/clock";
import type { Tc, TcFps } from "../core/timecode";



/** Text als quadratische Punkte malen; die Punktgröße folgt der CSS-Höhe des Canvas (7 Zeilen). */
export function drawDotClock(cv: HTMLCanvasElement, text: string): void {
  const glyphs = [...text].map(ch => DOT_FONT[ch] ?? DOT_FONT["-"]!);
  const cols = glyphs.reduce((n, g) => n + g[0]!.length + 1, 0) - 1;
  const pitch = Math.max(2, Math.round((cv.clientHeight || 28) / 7));
  const dpr = window.devicePixelRatio || 1;
  const w = cols * pitch, h = 7 * pitch;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = `${w}px`;
  }
  const g = cv.getContext("2d"); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const dot = pitch - Math.max(1, Math.round(pitch / 5));
  g.fillStyle = getComputedStyle(cv).color || "#f5a623";
  let x = 0;
  for (const rows of glyphs) {
    for (let r = 0; r < 7; r++) for (let c = 0; c < rows[r]!.length; c++) if (rows[r]![c] === "1") g.fillRect(x + c * pitch, r * pitch, dot, dot);
    x += (rows[0]!.length + 1) * pitch;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export interface ClockSettings { clock: boolean; clockTc: boolean }

export class ClockBar {
  readonly net = new NetTimecode();
  private label = el("span", "clk-label");
  private cv = el("canvas", "clk-dots");
  private side = el("span", "clk-side");
  private sr = el("span", "sr-only");
  private shown = "";
  private statusEl: HTMLElement | null = null;

  /** `artnet`: Stand des Art-Net-Eingangs (aus = in VERBINDEN ausgeschaltet). */
  constructor(private root: HTMLElement, private s: ClockSettings, private save: () => void, private artnet: () => "off" | "on" | "error") {
    root.setAttribute("role", "timer");
    root.append(this.label, this.cv, this.side, this.sr);
    this.cv.setAttribute("aria-hidden", "true");
    this.apply();
    window.setInterval(() => this.tick(), 100);
  }

  /** Art-Net-Timecode (nur gezählt, wenn der Nutzer Timecode in der Leiste will). */
  feed(tc: Tc, fps: TcFps): void { if (this.s.clockTc) this.net.feed(tc, fps, performance.now()); }

  private apply(): void {
    this.root.hidden = !this.s.clock;
    if (!this.s.clockTc) this.net.reset();
    this.shown = "";
    this.tick();
  }

  private tick(): void {
    if (this.statusEl?.isConnected) this.statusEl.textContent = this.statusText();
    if (!this.s.clock) return;
    const v: ClockView = clockView(new Date(), performance.now(), this.s.clockTc, this.net);
    const key = `${v.mode}|${v.text}|${v.side}|${v.fps ?? ""}`;
    if (key === this.shown) return;
    const modeChanged = this.shown.split("|")[0] !== v.mode || this.shown.split("|")[2] !== v.side || this.shown.split("|")[3] !== String(v.fps ?? "");
    this.shown = key;
    if (modeChanged) {
      this.label.textContent = v.mode === "timecode" ? t("Timecode") : t("Uhrzeit");
      this.root.classList.toggle("tc", v.mode === "timecode");
      this.side.textContent = v.side === "rate" && v.fps ? fpsLabel(v.fps) : v.side === "none" ? t("kein Timecode") : "";
      this.side.hidden = !this.side.textContent;
    }
    drawDotClock(this.cv, v.text);
    // Für Screenreader nur einmal je Minute bzw. beim Wechsel neu (role=timer liest nicht laufend vor)
    this.sr.textContent = `${this.label.textContent} ${v.mode === "time" ? v.text.slice(0, 5) : v.text}`;
  }

  private statusText(): string {
    if (!this.s.clockTc) return t("Aus.");
    const a = this.artnet();
    if (a === "off") return t("Art-Net ist im Tab VERBINDEN ausgeschaltet: so kommt kein Timecode an.");
    if (a === "error") return t("Port 6454 ist belegt (anderes Programm?). Art-Net im Tab VERBINDEN prüfen.");
    const c = this.net.current(performance.now());
    return c ? t("Timecode kommt an: {fps}.", { fps: fpsLabel(c.fps) }) : t("Hört auf Art-Net-Timecode (UDP 6454), noch nichts angekommen.");
  }

  /** Einstellungen → Oberfläche: Uhrzeit an/aus, Netz-Timecode (Alpha). */
  mountSettings(box: HTMLElement): void {
    const row = (id: string, label: string, on: boolean, set: (v: boolean) => void) => {
      const l = el("label", "report-check"), c = el("input"); c.type = "checkbox"; c.id = id; c.checked = on;
      c.addEventListener("change", () => { set(c.checked); this.save(); this.apply(); });
      l.append(c, document.createTextNode(" "), el("span", "", label));
      return l;
    };
    this.statusEl = el("p", "am-hint clk-status");
    box.append(el("h3", "", t("Uhrzeit")),
      row("clock-on", t("Uhrzeit oben anzeigen"), this.s.clock, v => { this.s.clock = v; }),
      el("p", "am-hint", t("Große Uhrzeit wie an einem Lichtpult, oben im Bedienfenster. Nie auf den Ausgängen.")),
      row("clock-tc", t("Timecode aus dem Netzwerk anzeigen (Art-Net) – Alpha"), this.s.clockTc, v => { this.s.clockTc = v; }),
      el("p", "am-hint", t("Zeigt statt der Uhrzeit den Art-Net-Timecode, den ein Lichtpult oder eine Show-Software im Netz sendet (UDP 6454). Kommt 2 Sekunden lang keiner, steht wieder die Uhrzeit da, mit „kein Timecode“. Nur Anzeige: Szenen und Videos folgen dem Timecode nur, wenn du unter Einstellungen → Timecode den Empfang einschaltest.")),
      this.statusEl);
    this.statusEl.textContent = this.statusText();
  }
}
