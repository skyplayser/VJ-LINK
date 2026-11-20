// Ausgang einstellen: Name, aktive Bildfläche in Signalpixeln (z. B. LED-Controller 1280 × 1024, Wand nutzt nur
// 140/56 · 280 × 112), Einpassen, Gerätetyp mit Strobe/Blinder-Freigabe und optional ein Ausschnitt des Bilds.
// Jede Änderung wirkt sofort auf dem Ausgang. Grundlage: Beitrag von Fabian Schrader (fabianschr9), EPL-2.0.

import { displayPixels, type DisplayInfo, type OutputTest } from "../core/frame";
import { t } from "../core/i18n";
import { defaultDeviceEffects, devicePlacement, fullOutput, limitOutputRect, renderSize, type DeviceEffects, type DeviceKind, type DeviceOutput, type OutputLayout, type PixelRect, type ResFit } from "../core/layout";
import { TEST_PATTERNS } from "../core/show";

export interface DeviceDialog {
  display(): DisplayInfo | undefined;
  layout(): OutputLayout;
  /** Eigener Name des Ausgangs (leer = Name des Bildschirms). */
  name(): string;
  save(patch: { device?: DeviceOutput | null; effects?: DeviceEffects; name?: string }): void;
  test(): OutputTest | undefined;
  setTest(test: OutputTest | null): void;
  /** Bild des offenen Ausgangs (klein), für die Vorschau. */
  capture?(): Promise<string | null>;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
};

export function editDeviceOutput(api: DeviceDialog): void {
  const d0 = api.display();
  if (!d0) return;
  const px = () => displayPixels(api.display() ?? d0);
  const KIND_LABEL: Record<DeviceKind, string> = { display: t("Bildschirm"), projector: t("Beamer"), led: t("LED-Wand") };
  const FIT_LABEL: Record<ResFit, string> = { contain: t("Ganz zeigen"), cover: t("Füllen"), stretch: t("Strecken") };
  const FIT_HINT: Record<ResFit, string> = {
    contain: t("Das ganze Bild ist zu sehen; passt das Seitenverhältnis nicht, bleiben schwarze Ränder."),
    cover: t("Der Ausgang ist ganz gefüllt; was übersteht, wird abgeschnitten."),
    stretch: t("Das Bild wird auf den Ausgang gezogen und dabei verzerrt."),
  };

  // Arbeitsstand (wird bei jeder Änderung gespeichert)
  let cfg: DeviceOutput = structuredClone(api.layout().devices?.[d0.id] ?? fullOutput(px().w, px().h));
  let fx: DeviceEffects = { ...(api.layout().deviceEffects?.[d0.id] ?? defaultDeviceEffects()) };
  const isFull = (c: DeviceOutput) => { const { w, h } = px(); return !c.source && c.fit === "contain" && c.target.x === 0 && c.target.y === 0 && c.target.w === w && c.target.h === h; };
  const commit = () => api.save({ device: isFull(cfg) ? null : cfg, effects: fx });

  const wrap = el("div", "report device-dlg"); wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true");
  const box = el("div", "report-box");
  const head = el("div", "report-head"); const title = el("h2"); head.append(title);
  const sub = el("p", "am-hint");

  // Name
  const nameRow = el("label", "dev-row");
  const name = el("input"); name.type = "text"; name.maxLength = 60; name.placeholder = d0.label; name.value = api.name();
  nameRow.append(el("span", "dev-lab", t("Name")), name);
  name.addEventListener("input", () => { api.save({ name: name.value.trim() }); title.textContent = name.value.trim() || d0.label; });

  // Vorschau: Bildschirm in Schwarz, aktive Fläche zum Ziehen, Bildlage darin
  const stage = el("div", "dev-stage"); stage.tabIndex = 0;
  stage.setAttribute("role", "application"); stage.setAttribute("aria-label", t("Aktive Bildfläche: Ziehen verschiebt, Pfeiltasten 1 Pixel"));
  const live = el("img", "dev-live"); live.alt = ""; live.hidden = true;
  const area = el("div", "dev-area"), pic = el("div", "dev-pic"), grip = el("div", "dev-grip");
  area.append(grip); stage.append(live, pic, area);
  const stageHint = el("p", "am-hint", t("Ziehen verschiebt die Fläche, die Ecke unten rechts ändert die Größe. Pfeiltasten: 1 Pixel (⇧ 10), mit ⌥ die Größe."));

  // Zahlen
  const nums = el("div", "dev-nums");
  const field = (label: string) => { const l = el("label"); const i = el("input"); i.type = "number"; i.step = "1"; l.append(el("span", "dev-lab", label), i); nums.append(l); return i; };
  const fx_ = field("X"), fy = field("Y"), fw = field(t("Breite")), fh = field(t("Höhe"));
  const full = el("button", "btn small-btn", t("Ganze Fläche")); nums.append(full);

  // Einpassen
  const fitRow = el("div", "dev-row"); const fit = el("select");
  for (const f of ["contain", "cover", "stretch"] as const) fit.append(new Option(FIT_LABEL[f], f));
  const fitHint = el("p", "am-hint");
  fitRow.append(el("span", "dev-lab", t("Einpassen")), fit);

  // Gerät: Strobe und Blinder
  const kindRow = el("div", "dev-row"); const kind = el("select");
  for (const k of ["display", "projector", "led"] as const) kind.append(new Option(KIND_LABEL[k], k));
  const check = (label: string) => { const l = el("label", "report-check"); const c = el("input"); c.type = "checkbox"; l.append(c, el("span", "", label)); return { l, c }; };
  const strobe = check(t("Strobe")), blinder = check(t("Blinder"));
  kindRow.append(el("span", "dev-lab", t("Gerät")), kind, strobe.l, blinder.l);
  const kindHint = el("p", "am-hint", t("Beamer bekommen Strobe und Blinder standardmäßig nicht: grelle Blitze aus dem Beamer blenden im Nebel."));

  // Rahmen auf dem Ausgang zum Finden der Fläche
  const edge = check(t("Rahmen auf dem Ausgang zeigen (1-Pixel-Rand der Fläche)"));

  // Mehr: Ausschnitt und Testbild nur für diesen Ausgang
  const more = el("details", "dev-more"); more.append(el("summary", "", t("Mehr")));
  const crop = check(t("Nur einen Ausschnitt des Bilds zeigen"));
  const cropNums = el("div", "dev-nums");
  const pfield = (label: string) => { const l = el("label"); const i = el("input"); i.type = "number"; i.step = "0.1"; i.min = "0"; i.max = "100"; l.append(el("span", "dev-lab", label), i); cropNums.append(l); return i; };
  const cx = pfield("X %"), cy = pfield("Y %"), cw = pfield(t("Breite %")), ch = pfield(t("Höhe %"));
  const cropHint = el("p", "am-hint", t("Der Ausschnitt bezieht sich auf das Bild dieses Ausgangs (nach Leinwand oder Mapping), 0/0 ist oben links."));
  const testRow = el("div", "dev-row"); const test = el("select");
  test.append(new Option(t("wie alle Ausgänge"), ""), new Option(t("Schwarz"), "black"));
  for (const p of TEST_PATTERNS) test.append(new Option(p.label, p.id));
  testRow.append(el("span", "dev-lab", t("Testbild hier")), test);
  more.append(crop.l, cropNums, cropHint, testRow);

  const btns = el("div", "report-btns");
  const done = el("button", "btn primary", t("Fertig")), reset = el("button", "btn", t("Zurücksetzen"));
  reset.title = t("Ganze Fläche, Ganz zeigen, kein Ausschnitt, Gerät wie beim Bildschirm");
  btns.append(done, reset);

  box.append(head, sub, nameRow, stage, stageHint, nums, fitRow, fitHint, kindRow, kindHint, edge.l, more, btns);
  wrap.append(box);

  const fill = () => {
    const d = api.display() ?? d0, { w, h } = px();
    title.textContent = name.value.trim() || d.label;
    sub.textContent = t("{label} · {w} × {h} Pixel", { label: d.label, w, h });
    // Seitenverhältnis des Ausgangs, höchstens 260 Pixel hoch
    stage.style.aspectRatio = `${w} / ${h}`;
    stage.style.width = `min(100%, ${Math.round(260 * w / h)}px)`;
    cfg.target = limitOutputRect(cfg.target, w, h);
    const r = cfg.target;
    if (document.activeElement !== fx_) fx_.value = String(r.x);
    if (document.activeElement !== fy) fy.value = String(r.y);
    if (document.activeElement !== fw) fw.value = String(r.w);
    if (document.activeElement !== fh) fh.value = String(r.h);
    fx_.max = String(w - 1); fy.max = String(h - 1); fw.max = String(w); fh.max = String(h); fx_.min = fy.min = "0"; fw.min = fh.min = "1";
    fit.value = cfg.fit; fitHint.textContent = FIT_HINT[cfg.fit];
    kind.value = fx.kind; strobe.c.checked = fx.strobe; blinder.c.checked = fx.blinder;
    crop.c.checked = !!cfg.source; cropNums.hidden = !cfg.source;
    const s = cfg.source ?? { x: 0, y: 0, w: 1, h: 1 }, pct = (v: number) => String(Math.round(v * 1000) / 10);
    for (const [i, v] of [[cx, s.x], [cy, s.y], [cw, s.w], [ch, s.h]] as const) if (document.activeElement !== i) i.value = pct(v);
    const tst = api.test();
    edge.c.checked = tst === "active-edge";
    test.value = tst && tst !== "active-edge" ? tst : "";
    // Vorschau
    const l = api.layout(), src = l.mode === "mirror" ? renderSize(l.res, w, h) : { w, h };
    const pl = devicePlacement(cfg, src.w, src.h, w, h);
    const place = (n: HTMLElement, b: PixelRect) => Object.assign(n.style, { left: `${100 * b.x / w}%`, top: `${100 * b.y / h}%`, width: `${100 * b.w / w}%`, height: `${100 * b.h / h}%` });
    place(area, pl.target); place(pic, pl.image);
  };
  const change = () => { commit(); fill(); };

  const readNum = (i: HTMLInputElement, d: number) => Number.isFinite(i.valueAsNumber) ? Math.round(i.valueAsNumber) : d;
  for (const i of [fx_, fy, fw, fh]) i.addEventListener("input", () => {
    const r = cfg.target;
    cfg.target = { x: readNum(fx_, r.x), y: readNum(fy, r.y), w: Math.max(1, readNum(fw, r.w)), h: Math.max(1, readNum(fh, r.h)) };
    change();
  });
  for (const i of [fx_, fy, fw, fh, cx, cy, cw, ch]) i.addEventListener("change", () => { i.blur(); fill(); });
  full.addEventListener("click", () => { const { w, h } = px(); cfg.target = { x: 0, y: 0, w, h }; change(); });
  fit.addEventListener("change", () => { cfg.fit = fit.value as ResFit; change(); });
  kind.addEventListener("change", () => { fx = defaultDeviceEffects(kind.value as DeviceKind); change(); });
  strobe.c.addEventListener("change", () => { fx = { ...fx, strobe: strobe.c.checked }; change(); });
  blinder.c.addEventListener("change", () => { fx = { ...fx, blinder: blinder.c.checked }; change(); });
  edge.c.addEventListener("change", () => { api.setTest(edge.c.checked ? "active-edge" : null); fill(); });
  test.addEventListener("change", () => { api.setTest((test.value || null) as OutputTest | null); fill(); });
  crop.c.addEventListener("change", () => { cfg.source = crop.c.checked ? { x: 0, y: 0, w: 1, h: 1 } : null; change(); });
  for (const i of [cx, cy, cw, ch]) i.addEventListener("input", () => {
    const v = (n: HTMLInputElement, d: number) => Number.isFinite(n.valueAsNumber) ? Math.min(100, Math.max(0, n.valueAsNumber)) / 100 : d;
    const s = cfg.source ?? { x: 0, y: 0, w: 1, h: 1 };
    const x = Math.min(0.999, v(cx, s.x)), y = Math.min(0.999, v(cy, s.y));
    cfg.source = { x, y, w: Math.max(0.001, Math.min(1 - x, v(cw, s.w))), h: Math.max(0.001, Math.min(1 - y, v(ch, s.h))) };
    change();
  });
  reset.addEventListener("click", () => {
    const { w, h } = px(); cfg = fullOutput(w, h); fx = defaultDeviceEffects(); api.setTest(null); change();
  });

  // Ziehen in der Vorschau (Bildschirmpixel = Vorschaupixel × Faktor)
  let drag: { mode: "move" | "size"; x0: number; y0: number; r: PixelRect } | null = null;
  stage.addEventListener("pointerdown", e => {
    if (e.target !== area && e.target !== grip) return;
    e.preventDefault(); stage.focus();
    drag = { mode: e.target === grip ? "size" : "move", x0: e.clientX, y0: e.clientY, r: { ...cfg.target } };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", e => {
    if (!drag) return;
    const { w, h } = px(), k = w / Math.max(1, stage.clientWidth);
    const dx = Math.round((e.clientX - drag.x0) * k), dy = Math.round((e.clientY - drag.y0) * k), r = drag.r;
    cfg.target = drag.mode === "move"
      ? { ...r, x: Math.max(0, Math.min(w - r.w, r.x + dx)), y: Math.max(0, Math.min(h - r.h, r.y + dy)) }
      : { ...r, w: Math.max(1, Math.min(w - r.x, r.w + dx)), h: Math.max(1, Math.min(h - r.y, r.h + dy)) };
    change();
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("keydown", e => {
    const dir = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!dir) return;
    e.preventDefault(); e.stopPropagation();
    const n = e.shiftKey ? 10 : 1, { w, h } = px(), r = cfg.target;
    cfg.target = e.altKey
      ? { ...r, w: Math.max(1, Math.min(w - r.x, r.w + dir[0] * n)), h: Math.max(1, Math.min(h - r.y, r.h + dir[1] * n)) }
      : { ...r, x: Math.max(0, Math.min(w - r.w, r.x + dir[0] * n)), y: Math.max(0, Math.min(h - r.h, r.y + dir[1] * n)) };
    change();
  });

  // Schließen; Rahmen-Testbild endet mit dem Dialog
  const close = () => {
    wrap.remove(); window.removeEventListener("keydown", key, true);
    if (api.test() === "active-edge") api.setTest(null);
  };
  const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
  done.addEventListener("click", close);
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap) close(); });
  window.addEventListener("keydown", key, true);
  document.body.append(wrap);
  fill(); stage.focus();

  // Live-Bild des offenen Ausgangs alle 0,5 s
  const tick = async () => {
    if (!wrap.isConnected) return;
    const d = api.display();
    if (!d) { close(); return; }
    const data = d.open && api.capture ? await api.capture().catch(() => null) : null;
    if (!wrap.isConnected) return;
    live.hidden = !data; if (data) live.src = data;
    fill();
    setTimeout(() => void tick(), 500);
  };
  void tick();
}
