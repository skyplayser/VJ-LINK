// Ebene: Antrieb (Takt, Audio, ruhig), Farben (auch mehrere Slots) und bei Laser-Visuals Lage, Größe und Stärke.
import type { ControlContext } from "../core/control";
import { CHASE_ORDER_LABEL, DRIVE_LABEL, PARTICLE_TRIGGER_LABEL } from "../core/controls";
import { PARTICLE_DEFAULT_COUNT, PARTICLE_LIMITS, PARTICLE_TRIGGERS, defaultParticles, isParticleClip, type ParticleNumKey } from "../core/particles";
import { CHASE_ORDERS, CHASE_STEPS, chaseAt, chaseList, chaseStep, defaultChase } from "../core/chase";
import { EFFECT_BY_ID } from "../core/effects";
import { t } from "../core/i18n";
import {
  DRIVES, LASER_LIMITS, SLOT_NAMES, defaultLaser, layerName, toggleColorSlot,
  type ColorSource, type Drive, type LaserSettings, type LayerState,
} from "../core/show";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}

const DRIVE_HINT: Record<Drive, string> = {
  auto: t("Folgt dem Audio-Eingang, wenn er auf diese Ebene wirkt, sonst dem Takt."),
  bpm: t("Pulsiert nur im Takt (BPM), Audio wird ignoriert."),
  audio: t("Reagiert nur auf Audio (Eingang oder LJ-Link). Ohne Audio bleibt es ruhig."),
  static: t("Kein Pulsieren: gleichmäßige Bewegung, unabhängig von Takt und Audio."),
};

type NumKey = "x" | "y" | "size" | "thick" | "rot";
interface LaserField { key: NumKey; label: string; scale: number; unit: string; laserOnly?: boolean }
const LASER_FIELDS: LaserField[] = [
  { key: "y", label: t("Y · Höhe"), scale: 100, unit: "" },
  { key: "x", label: t("X · Seite"), scale: 100, unit: "" },
  { key: "size", label: t("Größe"), scale: 100, unit: " %" },
  { key: "rot", label: t("Drehung"), scale: 1, unit: "°" },
  { key: "thick", label: t("Linienstärke"), scale: 100, unit: " %", laserOnly: true },
];

interface ParticleField { key: ParticleNumKey; label: string; scale: number; unit: string; step?: number; dec?: number; spinOnly?: boolean; sub?: string }
const PARTICLE_FIELDS: ParticleField[] = [
  { key: "explode", label: t("Explosion"), scale: 100, unit: " %" },
  { key: "ret", label: t("Rückkehr"), scale: 1, unit: " Beats", step: 0.25, dec: 2 },
  { key: "scatter", label: t("Streuung"), scale: 100, unit: " %" },
  { key: "rpmX", label: t("Drehtempo X"), scale: 1, unit: ` ${t("U/min")}`, step: 0.5, dec: 1, spinOnly: true, sub: t("Drehung je Achse") },
  { key: "rpm", label: t("Drehtempo Y"), scale: 1, unit: ` ${t("U/min")}`, step: 0.5, dec: 1, spinOnly: true },
  { key: "rpmZ", label: t("Drehtempo Z"), scale: 1, unit: ` ${t("U/min")}`, step: 0.5, dec: 1, spinOnly: true },
  { key: "angX", label: t("Winkel X (kippen)"), scale: 1, unit: "°" },
  { key: "angY", label: t("Winkel Y (drehen)"), scale: 1, unit: "°" },
  { key: "angZ", label: t("Winkel Z (rollen)"), scale: 1, unit: "°" },
  { key: "size", label: t("Partikelgröße"), scale: 100, unit: " %" },
  { key: "length", label: t("Länge (0 = Punkte)"), scale: 100, unit: " %" },
  { key: "count", label: t("Anzahl"), scale: 1, unit: ` ${t("Tsd.")}`, step: 5 },
];

const rgbCss = (c: readonly number[]) => `rgb(${c.map(v => Math.round(v * 255)).join(",")})`;

export class LayerPanel {
  private sig = "";
  /** Ebene, für die das Panel gebaut wurde: nach dem Laden eines Projekts sind es neue Objekte. */
  private built: LayerState | null = null;
  private ranges = new Map<NumKey, { input: HTMLInputElement; val: HTMLElement }>();
  private pRanges = new Map<ParticleNumKey, { input: HTMLInputElement; val: HTMLElement }>();
  /** Clips der Zeile mit Anzeigenamen (setzt die Oberfläche). */
  clipsOf: (layer: number) => { id: string; name: string }[] = () => [];
  /** Beat und Tempo jetzt (für die Anzeige des laufenden Chase-Schritts). */
  clock: () => { beat: number; bpm: number } = () => ({ beat: 0, bpm: 120 });
  private chaseUi: { gate: HTMLInputElement; gateVal: HTMLElement; info: HTMLElement; chips: HTMLButtonElement[] } | null = null;

  constructor(private ctx: ControlContext, private root: HTMLElement, private layerOf: () => number, private onRename: () => void = () => {}) {}

  private layer(): LayerState | undefined { return this.ctx.show.layers[this.layerOf()]; }

  update(force = false): void {
    const l = this.layer();
    if (!l) { this.root.hidden = true; return; }
    this.root.hidden = false;
    // Lage gilt für alle Visuals der Ebene, auch wenn gerade keins läuft. Nur Grafiken und Videos haben ihre
    // eigene Lage (Panel „Grafik“/„Video“). Laser-Regler, wenn ein Laser läuft oder die Zeile Laser enthält.
    const isLz = (id: string | null) => !!id && EFFECT_BY_ID.get(id)?.category === "laser";
    const isLaser = l.clip ? isLz(l.clip) : l.clips.some(isLz);
    const isGen = !l.clip || EFFECT_BY_ID.get(l.clip)?.kind === "generator" || isParticleClip(l.clip);
    const slots = this.ctx.show.slots.map(rgbCss).join(";");
    const c = l.chase;
    const isPart = l.clip ? isParticleClip(l.clip) : l.clips.some(isParticleClip);
    const pp = l.particles;
    const sig = `${isPart}|${pp?.trigger}|${pp?.spin}|${this.layerOf()}|${l.laser?.override ? 1 : 0}|${l.drive}|${l.colorSource}|${(l.colorSlots ?? []).join(",")}|${isLaser}|${isGen}|${slots}|${c?.on}|${c?.beats}|${c?.order}|${(c?.clips ?? []).join(",")}|${l.clips.join(",")}`;
    if (force || sig !== this.sig || l !== this.built) { this.sig = sig; this.built = l; this.build(l, isLaser, isGen, isPart); }
    this.updateChase(l);
    const z = l.laser ?? defaultLaser();
    for (const f of LASER_FIELDS) {
      const r = this.ranges.get(f.key); if (!r) continue;
      const v = z[f.key] ?? 0;
      if (document.activeElement !== r.input) r.input.value = String(Math.round(v * f.scale));
      r.val.textContent = `${Math.round(v * f.scale)}${f.unit}`;
    }
    const pz = l.particles ?? defaultParticles();
    for (const f of PARTICLE_FIELDS) {
      const r = this.pRanges.get(f.key); if (!r) continue;
      const v = pz[f.key] * f.scale;
      if (document.activeElement !== r.input) r.input.value = String(v);
      r.val.textContent = `${f.dec ? Number(v.toFixed(f.dec)) : Math.round(v)}${f.unit}`;
    }
  }

  /** Partikel-Objekt: Explosion auf den Beat, Drehung, Stäbchen oder Punkte, Anzahl. */
  private buildParticles(l: LayerState, n: number): void {
    const p = (l.particles ??= defaultParticles());
    this.root.append(el("h4", "lp-sub", t("Partikel-Objekt")));
    // Auslöser
    const tr = el("div", "lp-row"); tr.append(el("span", "lp-lab", t("Auslöser")));
    const seg = el("div", "seg2 lp-seg lp-chase-seg"); seg.setAttribute("role", "radiogroup"); seg.dataset.ctl = `layer.${n + 1}.particles.trigger`;
    for (const k of PARTICLE_TRIGGERS) {
      const b = el("button", p.trigger === k ? "on" : "", PARTICLE_TRIGGER_LABEL[k]);
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(p.trigger === k));
      b.addEventListener("click", () => { p.trigger = k; this.update(true); });
      seg.append(b);
    }
    tr.append(seg); this.root.append(tr);
    if (p.trigger === "hold") this.root.append(el("p", "muted small lp-hint", t("Halten: Der Regler „Explosion“ hält die Partikel direkt auseinander, z. B. von einem Fader am Pult. Bei 0 % ist die Form geschlossen.")));
    if (p.trigger === "bass") this.root.append(el("p", "muted small lp-hint", t("Bass: Je härter der Bass (Audio-Eingang oder LJ-Link), desto weiter fliegen die Partikel. „Explosion“ ist die Stärke, „Rückkehr“ wie schnell sie sich wieder sammeln. Ohne Audio bleibt die Form geschlossen.")));
    // Drehung an/aus
    const sr = el("div", "lp-row"); sr.append(el("span", "lp-lab", t("Drehung")));
    const spin = el("button", `btn small-btn toggle${p.spin ? " on" : ""}`, p.spin ? t("An") : t("Aus"));
    spin.setAttribute("aria-pressed", String(p.spin)); spin.dataset.ctl = `layer.${n + 1}.particles.spin`;
    spin.addEventListener("click", () => { p.spin = !p.spin; this.update(true); });
    sr.append(spin); this.root.append(sr);
    for (const f of PARTICLE_FIELDS) {
      if (f.spinOnly && !p.spin) continue;
      if (f.sub) this.root.append(el("p", "muted small lp-hint", f.sub));
      const [lo, hi] = PARTICLE_LIMITS[f.key];
      const row = el("label", "mrow"); row.append(el("span", "", f.label));
      const input = el("input"); input.type = "range";
      input.min = String(lo * f.scale); input.max = String(hi * f.scale); input.step = String(f.step ?? 1);
      input.dataset.ctl = `layer.${n + 1}.particles.${f.key}`;
      input.setAttribute("aria-label", f.label);
      input.addEventListener("input", () => { p[f.key] = Number(input.value) / f.scale; this.update(); });
      const val = el("span", "mval");
      // Doppelklick: auf 0 (Rückkehr, Größe und Anzahl haben keine 0: auf die Vorgabe) und sofort anzeigen
      input.addEventListener("dblclick", () => {
        const v = lo <= 0 && hi >= 0 ? 0 : defaultParticles()[f.key];
        p[f.key] = v;
        input.value = String(v * f.scale);
        val.textContent = `${f.dec ? Number((v * f.scale).toFixed(f.dec)) : Math.round(v * f.scale)}${f.unit}`;
      });
      row.append(input, val);
      this.root.append(row);
      this.pRanges.set(f.key, { input, val });
    }
    const reset = el("button", "btn small-btn", t("Partikel zurücksetzen"));
    reset.addEventListener("click", () => { l.particles = defaultParticles(); this.update(true); });
    this.root.append(reset);
    this.root.append(el("p", "muted small lp-hint gpu-hint", t("Braucht eine starke Grafikkarte. Ziel: 3 Bildschirme mit 60 fps ab Apple M2 (oder vergleichbar) bei bis zu {n} Tsd. Partikeln. Ruckelt es, „Anzahl“ senken oder „Länge“ auf 0 (Punkte). Doppelklick setzt einen Regler auf 0 (Rückkehr, Größe und Anzahl auf die Vorgabe).", { n: PARTICLE_DEFAULT_COUNT })));
  }

  /**
   * Chase (Community-Funktion, Wunsch von Harald): Die Ebene schaltet im Takt von selbst durch ihre Clips,
   * wahlweise nur durch ausgewählte und nur kurz aufblitzend.
   */
  private buildChase(l: LayerState, n: number): void {
    const c = (l.chase ??= defaultChase());
    const head = el("div", "lp-chase-head");
    head.append(el("h4", "lp-sub", t("Chase")));
    const tog = el("button", `btn small-btn toggle${c.on ? " on" : ""}`, c.on ? t("An") : t("Aus"));
    tog.setAttribute("aria-pressed", String(c.on)); tog.dataset.ctl = `layer.${n + 1}.chase`;
    tog.title = t("Schaltet im Takt von selbst durch die Clips dieser Zeile");
    tog.addEventListener("click", () => { c.on = !c.on; this.update(true); });
    head.append(tog);
    this.root.append(head);
    this.chaseUi = null;
    if (!c.on) { this.root.append(el("p", "muted small lp-hint", t("Schaltet im Takt durch die Clips dieser Zeile, z. B. verschiedene Blitzbilder abwechselnd auf jeden Beat."))); return; }
    // Schritt
    const sr = el("div", "lp-row"); sr.append(el("span", "lp-lab", t("Schritt")));
    const steps = el("div", "seg2 lp-seg lp-chase-seg"); steps.setAttribute("role", "radiogroup"); steps.dataset.ctl = `layer.${n + 1}.chase.step`;
    for (const b of CHASE_STEPS) {
      const lbl = b === 0.25 ? "¼" : b === 0.5 ? "½" : String(b);
      const btn = el("button", c.beats === b ? "on" : "", lbl); btn.setAttribute("role", "radio"); btn.setAttribute("aria-checked", String(c.beats === b));
      btn.title = t("{n} Beats pro Clip", { n: lbl });
      btn.addEventListener("click", () => { c.beats = b; this.update(true); });
      steps.append(btn);
    }
    sr.append(steps); this.root.append(sr);
    // Reihenfolge
    const or = el("div", "lp-row"); or.append(el("span", "lp-lab", t("Reihenfolge")));
    const ord = el("div", "seg2 lp-seg lp-chase-seg"); ord.setAttribute("role", "radiogroup"); ord.dataset.ctl = `layer.${n + 1}.chase.order`;
    for (const o of CHASE_ORDERS) {
      const btn = el("button", c.order === o ? "on" : "", CHASE_ORDER_LABEL[o]); btn.setAttribute("role", "radio"); btn.setAttribute("aria-checked", String(c.order === o));
      btn.addEventListener("click", () => { c.order = o; this.update(true); });
      ord.append(btn);
    }
    or.append(ord); this.root.append(or);
    // Sichtbar (Anteil des Schritts)
    const gr = el("label", "mrow"); gr.dataset.ctl = `layer.${n + 1}.chase.gate`;
    gr.append(el("span", "", t("Sichtbar")));
    const gate = el("input"); gate.type = "range"; gate.min = "5"; gate.max = "100"; gate.value = String(Math.round(c.gate * 100));
    gate.setAttribute("aria-label", t("Sichtbar: Anteil jedes Schritts, in dem der Clip zu sehen ist"));
    const gateVal = el("span", "mval", `${Math.round(c.gate * 100)} %`);
    gate.addEventListener("input", () => { c.gate = Number(gate.value) / 100; gateVal.textContent = `${gate.value} %`; });
    gate.addEventListener("dblclick", () => { c.gate = 1; gate.value = "100"; gateVal.textContent = "100 %"; });
    gr.append(gate, gateVal); this.root.append(gr);
    // Clips: alle oder nur ausgewählte
    const items = this.clipsOf(n);
    const box = el("div", "lp-chase-clips");
    const chips: HTMLButtonElement[] = [];
    for (const it of items) {
      const sel = c.clips.includes(it.id);
      const b = el("button", `lp-chip${sel ? " on" : ""}`, it.name); b.dataset.clip = it.id;
      b.setAttribute("aria-pressed", String(sel));
      b.addEventListener("click", () => {
        c.clips = c.clips.includes(it.id) ? c.clips.filter(x => x !== it.id) : [...c.clips, it.id];
        this.update(true);
      });
      chips.push(b); box.append(b);
    }
    this.root.append(el("span", "lp-lab lp-chase-lab", c.clips.length ? t("Nur diese Clips ({n})", { n: chaseList(l).length }) : t("Alle Clips der Zeile ({n}) – antippen wählt einzelne aus", { n: items.length })), box);
    const info = el("p", "muted small lp-hint");
    this.root.append(info);
    this.chaseUi = { gate, gateVal, info, chips };
  }

  /** Laufender Chase: aktueller Clip markiert, Hinweis bei „Sichere Blitze“. */
  private updateChase(l: LayerState): void {
    const u = this.chaseUi, c = l.chase;
    if (!u || !c?.on) return;
    if (document.activeElement !== u.gate) { u.gate.value = String(Math.round(c.gate * 100)); u.gateVal.textContent = `${Math.round(c.gate * 100)} %`; }
    const { beat, bpm } = this.clock();
    const safe = this.ctx.show.safeFlash !== false;
    const now = chaseAt(l, beat, bpm, safe, this.layerOf());
    u.chips.forEach(b => b.classList.toggle("live", b.dataset.clip === now?.clip));
    const step = chaseStep(c.beats, bpm, safe);
    const txt = !chaseList(l).length ? t("Diese Zeile hat noch keine Clips.")
      : step > c.beats ? t("Sichere Blitze: höchstens 3 Wechsel pro Sekunde, bei {bpm} BPM daher {n} Beats pro Schritt.", { bpm: Math.round(bpm), n: step })
      : t("Läuft auf allen Ausgängen synchron im Takt. Pult, MIDI und OSC: E{n} Chase, Schritt, Reihenfolge, Sichtbar.", { n: this.layerOf() + 1 });
    if (u.info.textContent !== txt) u.info.textContent = txt;
  }

  private build(l: LayerState, isLaser: boolean, isGen: boolean, isPart = false): void {
    const n = this.layerOf();
    this.root.replaceChildren();
    this.ranges.clear();
    this.pRanges.clear();
    this.root.append(el("h2", "", t("Ebene {n}", { n: n + 1 })));
    // Name der Ebene (erscheint im Clip-Raster)
    const nr = el("div", "lp-row"); nr.append(el("span", "lp-lab", t("Name")));
    const name = el("input", "lp-name"); name.maxLength = 24; name.value = l.name ?? ""; name.placeholder = layerName(undefined, n);
    name.setAttribute("aria-label", t("Name Ebene {n}", { n: n + 1 }));
    name.addEventListener("change", () => { l.name = name.value.trim().slice(0, 24) || undefined; this.onRename(); });
    name.addEventListener("keydown", e => { if (e.key === "Enter") name.blur(); });
    nr.append(name); this.root.append(nr);

    // Antrieb
    const dr = el("div", "lp-row"); dr.append(el("span", "lp-lab", t("Antrieb")));
    const seg = el("div", "seg2 lp-seg"); seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", t("Antrieb Ebene {n}", { n: n + 1 }));
    seg.dataset.ctl = `layer.${n + 1}.drive`;
    for (const d of DRIVES) {
      const b = el("button", l.drive === d ? "on" : "", DRIVE_LABEL[d]);
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(l.drive === d)); b.title = DRIVE_HINT[d];
      b.addEventListener("click", () => { l.drive = d; this.update(true); });
      seg.append(b);
    }
    dr.append(seg);
    this.root.append(dr, el("p", "muted small lp-hint", DRIVE_HINT[l.drive ?? "auto"]));

    // Farben: Original | A B C D E (mehrere wählbar) | Verlauf | Regenbogen
    const cr = el("div", "lp-row"); cr.append(el("span", "lp-lab", t("Farben")));
    const chips = el("div", "lp-colors");
    const plain = (src: ColorSource, label: string) => {
      const b = el("button", `lp-chip${l.colorSource === src ? " on" : ""}`, label);
      b.setAttribute("aria-pressed", String(l.colorSource === src));
      b.addEventListener("click", () => { l.colorSource = src; this.update(true); });
      return b;
    };
    chips.append(plain("original", t("Original")));
    const chosen = l.colorSource === "multi" ? l.colorSlots : SLOT_NAMES.includes(l.colorSource as typeof SLOT_NAMES[number]) ? [SLOT_NAMES.indexOf(l.colorSource as typeof SLOT_NAMES[number])] : [];
    SLOT_NAMES.forEach((name, i) => {
      const pos = chosen.indexOf(i);
      const b = el("button", `lp-chip lp-slot${pos >= 0 ? " on" : ""}`, name);
      b.style.setProperty("--sw", rgbCss(this.ctx.show.slots[i] ?? [1, 1, 1]));
      b.setAttribute("aria-pressed", String(pos >= 0));
      b.title = t("Slot {name}: Antippen fügt ihn hinzu oder entfernt ihn. Mehrere Slots ergeben mehrere Farben.", { name });
      if (pos >= 0 && chosen.length > 1) b.append(el("small", "", String(pos + 1)));
      b.addEventListener("click", () => { toggleColorSlot(l, i); this.update(true); });
      chips.append(b);
    });
    chips.append(plain("gradient", t("Verlauf")), plain("rainbow", t("Regenbogen")));
    cr.append(chips);
    this.root.append(cr);
    if (l.colorSource === "multi") {
      this.root.append(el("p", "muted small lp-hint", isLaser
        ? t("{n} Farben: Jeder Strahl bzw. jede Linie bekommt eine eigene, alle 8 Beats wechseln sie weiter.", { n: chosen.length })
        : t("{n} Farben: Verlauf durch alle gewählten Slots in dieser Reihenfolge.", { n: chosen.length })));
    }

    this.buildChase(l, n);
    if (isPart) this.buildParticles(l, n);

    // Lage, Größe, Drehung (jedes Visual); Stärke und XY-Override nur bei Lasern
    if (!isGen) return;
    this.root.append(el("h4", "lp-sub", isLaser ? t("Lage · Laser") : t("Lage")));
    const ov = !!l.laser?.override;
    if (isLaser) {
    const ovRow = el("div", "lp-row");
    ovRow.append(el("span", "lp-lab", "XY-Override"));
    const ovBtn = el("button", `btn small-btn${ov ? " on" : ""}`, ov ? t("An: X/Y bestimmen die Position") : t("Aus: Der Effekt bewegt sich selbst"));
    ovBtn.dataset.ctl = `layer.${n + 1}.laser.xy`;
    ovBtn.setAttribute("aria-pressed", String(ov));
    ovBtn.addEventListener("click", () => { l.laser = { ...(l.laser ?? defaultLaser()), override: !ov }; this.update(true); });
    ovRow.append(ovBtn);
    this.root.append(ovRow);
    if (ov) this.root.append(el("p", "muted small lp-hint", t("Die Eigenbewegung ist aus: X und Y bestimmen die Position direkt (0 = Mitte, ±100 = Bildrand). Über MAPPING → DMX lassen sich diese Regler auf Kanäle der MA legen, ebenso Größe, Drehung und der Schalter selbst.")));
    }
    for (const f of LASER_FIELDS) {
      if (f.laserOnly && !isLaser) continue;
      const [lo, hi] = LASER_LIMITS[f.key];
      const row = el("label", "mrow"); row.append(el("span", "", f.label));
      const input = el("input"); input.type = "range";
      input.min = String(Math.round(lo * f.scale)); input.max = String(Math.round(hi * f.scale)); input.step = "1";
      input.dataset.ctl = `layer.${n + 1}.laser.${f.key}`;
      input.setAttribute("aria-label", f.label);
      input.addEventListener("input", () => { l.laser = { ...(l.laser ?? defaultLaser()), [f.key]: Number(input.value) / f.scale }; });
      input.addEventListener("dblclick", () => {
        const v = defaultLaser()[f.key] ?? 0;
        l.laser = { ...(l.laser ?? defaultLaser()), [f.key]: v };
        // Sofort anzeigen (der Regler hat nach dem Doppelklick den Fokus, update() lässt ihn sonst in Ruhe)
        input.value = String(Math.round(v * f.scale)); val.textContent = `${Math.round(v * f.scale)}${f.unit}`;
      });
      const val = el("span", "mval");
      row.append(input, val);
      this.root.append(row);
      this.ranges.set(f.key, { input, val });
    }
    const reset = el("button", "btn small-btn", t("Lage zurücksetzen"));
    reset.addEventListener("click", () => { l.laser = { ...defaultLaser(), override: l.laser?.override ?? false }; });
    this.root.append(reset, el("p", "muted small lp-hint", isLaser
      ? t("Laser liegen von sich aus im oberen Drittel (über dem Publikum); Y verschiebt sie von dort aus. „Linienstärke“ macht Linien und Punkte dicker, damit sie im Nebel besser wirken. Richte den Projektorstrahl nicht in Augenhöhe auf das Publikum. Alles lässt sich auch mappen. Doppelklick setzt einen Regler zurück.")
      : t("Verschieben, vergrößern, drehen – was über den Rand hinausragt, bleibt schwarz. Alles lässt sich auch mappen (MIDI, DMX, OSC). Doppelklick setzt einen Regler zurück.")));
  }
}
