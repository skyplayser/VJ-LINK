// Vorschau-Fenster (zweiter Bildschirm): links die gewählte Ebene allein (Ebenen-Vorschau), rechts das Live-Bild.
// Bekommt dieselben Bilder wie die Ausgänge und rechnet beide Ansichten selbst (eigene Grafik, eigene Abspieler).
// Die Ebenen-Auswahl ist mit dem Hauptfenster verbunden: hier wählen wählt dort, dort wählen zeigt es hier.
import { Engine } from "../engine/engine";
import { frameBeat, type Frame } from "../core/frame";
import { bridge } from "./bridge";
import { decodeImage } from "./medialib";
import { VideoPool } from "./videopool";
import { CameraPool } from "./campool";
import { PersonMasks } from "./segment";
import { layerTimesAt, showForImage, soloLayer, MAIN_STACK, type ShowState } from "../core/show";
import { t } from "../core/i18n";
import { initLang } from "./lang";
import { MONITOR_VIEWS, monitorPanes, type MonitorView } from "../core/monitor";

initLang();
document.title = `VJ-Link ${t("Vorschau")}`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// Zwei Grafik-Ansichten, gemeinsame Abspieler und Kameras
const pvCanvas = $<HTMLCanvasElement>("pv"), liveCanvas = $<HTMLCanvasElement>("live");
// Dritte Grafik (unsichtbar) für die Bilder-Kacheln: rechnet reihum je ein Bild und kopiert es in seine Kachel
const tileCanvas = document.createElement("canvas");
const engines = [new Engine(pvCanvas), new Engine(liveCanvas), new Engine(tileCanvas)] as const;
const videos = new VideoPool(id => `vjmedia://video/${id}`, false);
const durations = new Map<string, number>();
const cams = new CameraPool();
const masks = new PersonMasks();
for (const e of engines) {
  e.videoSource = (key, id, tt, rate, o) => videos.get(key, id, tt, rate, o);
  e.camSource = id => cams.get(id);
  e.camMask = (id, v) => masks.mask(id, v);
  e.videoDuration = id => durations.get(id) ?? 0;
}
for (const c of [pvCanvas, liveCanvas, tileCanvas]) c.addEventListener("webglcontextlost", ev => { ev.preventDefault(); location.reload(); });
setInterval(() => { videos.sweep(); cams.sweep(); masks.sweep(); }, 1000);

let frame: Frame | null = null;
/** Hier gewählte Ebene, bis das Hauptfenster sie bestätigt (sonst springt der Knopf kurz zurück). */
let pending: { layer: number; at: number } | null = null;
bridge?.onFrame(f => {
  frame = f;
  cams.sources = f.show.cameras ?? [];
  for (const [id, d] of Object.entries(f.videoDurations ?? {})) durations.set(id, d);
  if (pending && (f.monitor?.layer === pending.layer || Date.now() - pending.at > 1500)) pending = null;
});
bridge?.onMedia(async e => {
  if (e.type === "remove") { for (const en of engines) en.removeMedia(e.id); return; }
  if (e.type === "raw") { for (const en of engines) en.setRaw(e.id, e.w, e.h, e.data); return; }
  try { const d = await decodeImage(e.item.dataUrl); for (const en of engines) en.setMedia(e.item.id, d.src, d.w, d.h); } catch { /* Bild unlesbar */ }
});

// ---- Einstellungen des Fensters (nur hier, im Fenster gemerkt) ----
const PREF = "vjlink.monitor";
let prefs: { view: MonitorView; guides: boolean } = { view: "side", guides: false };
try { const p = JSON.parse(localStorage.getItem(PREF) ?? "{}") as Partial<typeof prefs>; prefs = { view: MONITOR_VIEWS.includes(p.view as MonitorView) ? p.view as MonitorView : "side", guides: p.guides === true }; } catch { /* egal */ }
const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* egal */ } };

const VIEW_LABEL: Record<MonitorView, string> = { side: t("Nebeneinander"), stack: t("Übereinander"), preview: t("Nur Vorschau"), live: t("Nur Live") };
const viewSeg = $("views");
for (const v of MONITOR_VIEWS) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = VIEW_LABEL[v]; b.dataset.v = v; b.setAttribute("role", "radio");
  b.addEventListener("click", () => { prefs.view = v; savePrefs(); applyView(); });
  viewSeg.append(b);
}
function applyView(): void {
  const p = monitorPanes(prefs.view);
  $("pv-pane").hidden = !p.preview; $("live-pane").hidden = !p.live;
  $("panes").className = `panes ${p.preview && p.live ? (prefs.view === "stack" ? "stack" : "side") : ""}`;
  for (const b of Array.from(viewSeg.querySelectorAll("button"))) { const on = b.dataset.v === prefs.view; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }
  document.body.classList.toggle("guides", prefs.guides);
  $("guides").classList.toggle("on", prefs.guides); $("guides").setAttribute("aria-pressed", String(prefs.guides));
  requestAnimationFrame(fit);
}
$("guides").addEventListener("click", () => { prefs.guides = !prefs.guides; savePrefs(); applyView(); });
const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => { /* nicht erlaubt */ }); };
$("full").addEventListener("click", toggleFull);
for (const id of ["pv-box", "live-box"]) $(id).addEventListener("dblclick", toggleFull);
for (const id of ["pv-grid", "live-grid"]) {
  const g = $(id);
  for (const [k, v] of [["left", "33.333%"], ["left", "66.666%"], ["top", "33.333%"], ["top", "66.666%"]] as const) {
    const i = document.createElement("i");
    i.style.cssText = k === "left" ? `left:${v};top:0;bottom:0;width:1px` : `top:${v};left:0;right:0;height:1px`;
    g.append(i);
  }
  const s = document.createElement("i"); s.className = "safe"; g.append(s);
}

// ---- Ebenen-Knöpfe ----
const layerSeg = $("layers");
let layerKey = "";
function currentLayer(): number { return pending?.layer ?? frame?.monitor?.layer ?? 0; }
function pick(i: number): void {
  const n = frame?.monitor?.layers.length ?? 0;
  if (i < 0 || i >= n) return;
  pending = { layer: i, at: Date.now() };
  bridge?.monitorSelect?.(i);
  syncLayers(true);
}
function syncLayers(force = false): void {
  const m = frame?.monitor, sel = currentLayer();
  const shown = frame ? showFor(frame) : null;
  const key = JSON.stringify([m?.layers.map(l => l.name), sel, shown?.layers.map(l => l.opacity > 0.001)]);
  if (!force && key === layerKey) return;
  layerKey = key;
  layerSeg.replaceChildren();
  (m?.layers ?? []).forEach((l, i) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "radio");
    const n = document.createElement("span"); n.className = "n"; n.textContent = `E${i + 1}`;
    b.append(n, document.createTextNode(l.name));
    const live = (shown?.layers[i]?.opacity ?? 0) > 0.001;
    b.classList.toggle("on", i === sel); b.classList.toggle("off", !live);
    b.setAttribute("aria-checked", String(i === sel));
    b.title = `${l.clip || t("kein Clip")}${live ? "" : ` · ${t("nicht live (Deckkraft 0)")}`}`;
    b.addEventListener("click", () => pick(i));
    layerSeg.append(b);
  });
}
// Tasten: 1–9 Ebene, Pfeile nach oben/unten blättern, F Vollbild
window.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-9]$/.test(e.key)) { pick(Number(e.key) - 1); e.preventDefault(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { pick(currentLayer() - 1); e.preventDefault(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowRight") { pick(currentLayer() + 1); e.preventDefault(); }
  else if (e.key === "f" || e.key === "F") toggleFull();
});

// ---- Größe: beide Bilder im Seitenverhältnis des Ausgangs ----
let aspect = 16 / 9;
function fitOne(box: HTMLElement, cv: HTMLCanvasElement, grid: HTMLElement, en: Engine): void {
  const bw = box.clientWidth, bh = box.clientHeight;
  if (bw < 10 || bh < 10) return;
  const w = Math.floor(Math.min(bw, bh * aspect)), h = Math.floor(w / aspect);
  cv.style.width = `${w}px`; cv.style.height = `${h}px`;
  grid.style.cssText = `width:${w}px;height:${h}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const iw = Math.min(1920, Math.round(w * dpr)), ih = Math.max(1, Math.round(iw / aspect));
  if (cv.width !== iw || cv.height !== ih) en.resize(iw, ih);
}
function fit(): void {
  fitOne($("pv-box"), pvCanvas, $("pv-grid"), engines[0]);
  fitOne($("live-box"), liveCanvas, $("live-grid"), engines[1]);
}
new ResizeObserver(() => fit()).observe($("panes"));

/** Ein Bild als Hauptbild (Standard: das im Hauptfenster bearbeitete); SHOW-Ablauf nur auf seinem Bild. */
function showFor(f: Frame, image = f.monitor?.image ?? MAIN_STACK): ShowState {
  const ids = [MAIN_STACK, ...(f.show.images ?? []).map(i => i.id)];
  const cue = f.show.cueImage && ids.includes(f.show.cueImage) ? f.show.cueImage : MAIN_STACK;
  return showForImage(f.show, image, cue);
}

// ---- Mehrere Bilder (Mapping, Getrennt): Live-Kacheln statt eines Live-Bilds ----
const tilesBox = $("tiles");
const tileCanvases = new Map<string, HTMLCanvasElement>();
let tilesKey = "", tileTurn = 0;
function syncTiles(f: Frame): boolean {
  const ims = f.monitor?.images ?? [];
  const multi = ims.length > 1;
  const key = JSON.stringify([ims, f.monitor?.image, aspect.toFixed(3)]);
  if (key !== tilesKey) {
    tilesKey = key;
    $("live-box").hidden = multi; tilesBox.hidden = !multi;
    requestAnimationFrame(fit);
    tilesBox.replaceChildren(); tileCanvases.clear();
    for (const im of ims) {
      const b = document.createElement("button"); b.type = "button"; b.className = `tile${im.id === f.monitor?.image ? " on" : ""}`;
      b.setAttribute("aria-pressed", String(im.id === f.monitor?.image));
      b.title = t("{name} bearbeiten (Clips, Ebenen, Effekte)", { name: im.name });
      const c = document.createElement("canvas"); c.width = 480; c.height = Math.max(1, Math.round(480 / aspect));
      const cap = document.createElement("div"); cap.className = "cap";
      const nm = document.createElement("b"); nm.textContent = im.name;
      const on = document.createElement("span");
      on.textContent = im.on.length ? `→ ${im.on.join(", ")}` : t("läuft auf keinem Ausgang");
      if (!im.on.length) on.className = "none";
      cap.append(nm, on); b.append(c, cap);
      b.addEventListener("click", () => bridge?.monitorImage?.(im.id));
      tileCanvases.set(im.id, c); tilesBox.append(b);
    }
  }
  return multi;
}
/** Reihum ein Bild rechnen (das bearbeitete jedes zweite Mal) und in seine Kachel kopieren. */
function renderTile(f: Frame, now: number, beat: number): void {
  const ids = [...tileCanvases.keys()];
  if (!ids.length) return;
  const cur = f.monitor?.image ?? MAIN_STACK;
  const others = ids.filter(id => id !== cur);
  const id = tileTurn++ % 2 === 0 || !others.length ? cur : others[(tileTurn >> 1) % others.length]!;
  const c = tileCanvases.get(id); if (!c) return;
  const en = engines[2];
  if (tileCanvas.width !== c.width || tileCanvas.height !== c.height) en.resize(c.width, c.height);
  const sh = showFor(f, id);
  en.render(sh, beat, now, f.bpm, null, f.layerClock ? layerTimesAt(f.layerClock, now, sh.layers) : null, null, `T${id}:`);
  c.getContext("2d")?.drawImage(tileCanvas, 0, 0, c.width, c.height);
}

let infoKey = "";
function loop(): void {
  const now = Date.now();
  if (frame) {
    const m = frame.monitor;
    if (m && Math.abs(m.aspect - aspect) > 0.001 && m.aspect > 0.1 && m.aspect < 20) { aspect = m.aspect; fit(); }
    syncLayers();
    const base = showFor(frame), sel = currentLayer(), beat = frameBeat(frame, now);
    const lt = frame.layerClock ? layerTimesAt(frame.layerClock, now, base.layers) : null;
    const panes = monitorPanes(prefs.view);
    const has = sel < base.layers.length;
    if (panes.preview) {
      if (has) engines[0].render(soloLayer(base, sel), beat, now, frame.bpm, null, lt, null, "P:");
      else { engines[0].gl.clearColor(0, 0, 0, 1); engines[0].gl.clear(engines[0].gl.COLOR_BUFFER_BIT); }
    }
    // Live wie die Vorschau im Hauptfenster (gleiches Seitenverhältnis, ganzes Bild); bei mehreren Bildern Kacheln
    const multi = syncTiles(frame);
    if (panes.live) { if (multi) renderTile(frame, now, beat); else engines[1].render(base, beat, now, frame.bpm, null, lt); }
    // Beschriftung nur bei Änderung
    const l = m?.layers[sel], op = base.layers[sel]?.opacity ?? 0;
    const pvInfo = !has ? t("Keine Ebene") : `${l?.clip || t("kein Clip")} · ${op > 0.001 ? t("Deckkraft {p} %", { p: Math.round(op * 100) }) : t("nicht live (Deckkraft 0)")}`;
    const key = `${sel}|${l?.name}|${pvInfo}|${m?.imageName}|${m?.images.length}|${aspect.toFixed(3)}`;
    if (key !== infoKey) {
      infoKey = key;
      $("pv-title").textContent = `${t("VORSCHAU")} · ${m?.imageName ? `${m.imageName} · ` : ""}E${sel + 1} ${l?.name ?? ""}`;
      $("pv-info").textContent = pvInfo;
      $("live-title").textContent = `● ${t("LIVE")}`;
      $("live-info").textContent = (m?.images.length ?? 0) > 1 ? t("Alle Bilder · Klick = bearbeiten") : t("Was die Ausgänge zeigen");
    }
  } else {
    for (const en of engines) { en.gl.clearColor(0, 0, 0, 1); en.gl.clear(en.gl.COLOR_BUFFER_BIT); }
    $("pv-title").textContent = t("VORSCHAU"); $("live-title").textContent = `● ${t("LIVE")}`;
    $("pv-info").textContent = t("Wartet auf das Hauptfenster …"); $("live-info").textContent = "";
  }
  requestAnimationFrame(loop);
}
applyView();
requestAnimationFrame(loop);
