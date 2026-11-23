import { REMOTE_COLORS, remotePairingCode, type RemoteCommand, type RemoteEffect, type RemoteState } from "../core/remote";
import { BLEND_MODES } from "../core/show";
import { getLang, setLang, t } from "../core/i18n";

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId("status");
const pair = byId("pair");
const form = byId<HTMLFormElement>("pair-form");
const panels = byId("controls");
const transport = byId("transport");
const layerList = byId("layers");
const clipList = byId("clips");
const slotList = byId("slots");
const presets = byId("presets");
const sceneList = byId("scenes");
const tabsNav = byId("tabs");
const mixer = byId("mixer");
const cueList = byId("cues");

let token = "";
try { token = sessionStorage.getItem("vjlink.remote") ?? ""; } catch { /* Browser ohne Web Storage */ }
let state: RemoteState | null = null;
let layer = 0, slot = 0;
let sequence = 0;
try { sequence = Number(sessionStorage.getItem("vjlink.remote.seq")) || 0; } catch { /* optional */ }
function nextSequence(): number {
  sequence++;
  try { sessionStorage.setItem("vjlink.remote.seq", String(sequence)); } catch { /* optional */ }
  return sequence;
}
let layerKey = "", clipKey = "", sceneKey = "", mixKey = "", cueKey = "", textKey = "", timeKey = "", imageKey = "", polling = false;
/** Gewählter Reiter (bleibt beim Neuladen der Seite). */
let tab = "start";
try { tab = sessionStorage.getItem("vjlink.remote.tab") || "start"; } catch { /* optional */ }
let stopArmed = 0;
let online = false;
const held = new Map<RemoteEffect, { node: HTMLButtonElement; timer: number }>();
const liveEffects = Array.from(transport.querySelectorAll<HTMLButtonElement>("[data-effect]"));
const observed = new Set<HTMLImageElement>();
const thumbnailUrls = new Map<string, string>();
const retryAfter = new Map<string, number>();
let loadingThumb = false;
const intersection = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const image = entry.target as HTMLImageElement;
    if (entry.isIntersecting) observed.add(image);
    else observed.delete(image);
  }
});

function clipTile(clip: { id: string; name: string }, stack: string, layer: number): HTMLButtonElement {
  const tile = button(clip.name, () => void send({ kind: "clip", stack, layer, id: clip.id }));
  tile.className = "clip-tile";
  const picture = document.createElement("span");
  picture.className = "clip-picture";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  image.dataset.clip = clip.id;
  image.dataset.thumb = `${clip.id}|${clip.name}`;
  const url = thumbnailUrls.get(image.dataset.thumb);
  if (url) image.src = url;
  else intersection.observe(image);
  picture.append(image);
  tile.prepend(picture);
  return tile;
}

async function loadThumbnail(): Promise<void> {
  if (!online || document.hidden || loadingThumb) return;
  const now = Date.now();
  const target = [...observed].find(img => !img.src && img.dataset.clip && now >= (retryAfter.get(img.dataset.clip) ?? 0));
  const clip = target?.dataset.clip;
  if (!target || !clip) return;
  // Gemerkt nach Clip und Name: ändert sich der Text eines Text-Clips, gibt es ein neues Bild
  const key = target.dataset.thumb ?? clip;
  const existing = thumbnailUrls.get(key);
  if (existing) { target.src = existing; intersection.unobserve(target); observed.delete(target); return; }
  loadingThumb = true;
  retryAfter.set(clip, now + 700);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  const auth = token;
  try {
    const response = await fetch("/api/thumb?clip=" + encodeURIComponent(clip), { headers: headers(false, auth), signal: controller.signal });
    if (response.status !== 200 || auth !== token) return;
    const image = await response.blob();
    if (auth !== token) return;
    if (thumbnailUrls.size >= 192) {
      const oldest = thumbnailUrls.keys().next().value!;
      URL.revokeObjectURL(thumbnailUrls.get(oldest)!);
      thumbnailUrls.delete(oldest);
    }
    const url = URL.createObjectURL(image);
    thumbnailUrls.set(key, url);
    retryAfter.delete(clip);
    target.src = url;
    intersection.unobserve(target);
    observed.delete(target);
  } catch { /* Ein Standbild kann beim nächsten Durchlauf erneut angefragt werden. */ }
  finally { clearTimeout(timeout); loadingThumb = false; }
}


function button(label: string, run: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = run;
  return b;
}

let statusKey = "Nicht verbunden", errorKey = "";
/** Texte der Seite in der Sprache von VJ-Link (vor dem Koppeln: Sprache des Handys). */
function applyTexts(): void {
  document.documentElement.lang = getLang();
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach(e => { e.dataset.k ??= e.textContent ?? ""; e.textContent = t(e.dataset.k); });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach(e => { e.dataset.ka ??= e.getAttribute("aria-label") ?? ""; e.setAttribute("aria-label", t(e.dataset.ka)); });
  presets.querySelectorAll<HTMLElement>("[data-name]").forEach(e => { e.textContent = t(e.dataset.name!); });
  status.textContent = t(statusKey);
  pairError(errorKey);
  document.querySelectorAll<HTMLElement>("[data-i18n-alt]").forEach(e => { e.dataset.kalt ??= e.getAttribute("alt") ?? ""; e.setAttribute("alt", t(e.dataset.kalt)); });
  layerKey = clipKey = sceneKey = mixKey = cueKey = textKey = timeKey = imageKey = "";
}
function pairError(key: string): void { errorKey = key; byId("pair-error").textContent = key ? t(key) : ""; }
function connection(text: string, live: boolean): void {
  online = live;
  statusKey = text;
  status.textContent = t(text);
  status.classList.toggle("live", live);
  for (const element of [...Array.from(panels.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button,input")),
    ...Array.from(transport.querySelectorAll<HTMLButtonElement>("button"))]) element.disabled = !live;
}

function authenticated(value: string): void {
  token = value;
  try { if (token) sessionStorage.setItem("vjlink.remote", token); else sessionStorage.removeItem("vjlink.remote"); } catch { /* optional */ }
  pair.hidden = !!token;
  panels.hidden = transport.hidden = tabsNav.hidden = !token;
  document.body.classList.toggle("paired", !!token);
  if (!token) {
    releaseAll(false);
    state = null;
    connection("Nicht verbunden", false);
  }
}

function headers(json = false, auth = token): Record<string, string> {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
  };
}

async function poll(): Promise<void> {
  if (!token || polling) return;
  const auth = token;
  polling = true;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const r = await fetch("/api/state", { headers: headers(false, auth), signal: controller.signal, cache: "no-store" });
    if (auth !== token) return;
    if (r.status === 401) {
      authenticated("");
      pairError("Sitzung beendet. Bitte erneut koppeln.");
      return;
    }
    if (!r.ok) throw new Error();
    const next = await r.json() as RemoteState | null;
    if (auth !== token) return;
    if (!next) { connection("Warte auf VJ-Link", false); return; }
    if (next.lang && next.lang !== getLang()) { setLang(next.lang); applyTexts(); }
    if (next.stack !== state?.stack) layer = 0;
    state = next;
    render();
    if (!online) connection("Verbunden", true);
  } catch {
    if (auth === token) { releaseAll(false); connection("Verbindung unterbrochen", false); }
  } finally {
    clearTimeout(timeout);
    polling = false;
  }
}

async function send(command: RemoteCommand): Promise<void> {
  if (!token || (!online && !(command.kind === "hold" && !command.active))) return;
  const auth = token;
  try {
    const r = await fetch("/api/command", {
      method: "POST", headers: headers(true, auth), body: JSON.stringify(command),
      keepalive: command.kind === "hold" && !command.active,
    });
    if (auth !== token) return;
    if (r.status === 401) { authenticated(""); pairError("Sitzung beendet. Bitte erneut koppeln."); return; }
    if (r.ok && command.kind !== "hold" && command.kind !== "strobeValue") void poll();
  } catch {
    if (auth === token) { releaseAll(false); connection("Verbindung unterbrochen", false); }
  }
}

const code = byId<HTMLInputElement>("code");

async function pairWithCode(value: string): Promise<void> {
  const submit = form.querySelector<HTMLButtonElement>("button")!;
  if (submit.disabled) return;
  submit.disabled = true;
  connection("Verbindung wird aufgebaut …", false);
  pairError("");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch("/api/pair", {
      method: "POST", headers: headers(true, ""), body: JSON.stringify({ code: value }), signal: controller.signal,
    });
    if (r.status === 429) { pairError("Zu viele Versuche. Warte 30 Sekunden."); return; }
    if (r.status === 401) { pairError("Der Kopplungscode stimmt nicht."); return; }
    if (!r.ok) throw new Error();
    const result = await r.json() as { token: string };
    code.value = "";
    sequence = 0;
    authenticated(result.token);
    connection("Warte auf VJ-Link", false);
    await poll();
  } catch { pairError("VJ-Link ist nicht erreichbar."); }
  finally {
    clearTimeout(timeout);
    submit.disabled = false;
    if (!token) connection("Nicht verbunden", false);
  }
}

form.onsubmit = event => {
  event.preventDefault();
  void pairWithCode(code.value.trim());
};

const ctlVal = (id: string): number => state?.controls?.[id]?.v ?? 0;
const pct = (v: number) => `${Math.round(v * 100)} %`;
function control(id: string, value: number): void { void send({ kind: "control", id, value: Math.max(0, Math.min(1, value)) }); }

/** Reiter wählen: nur der gewählte Bereich ist zu sehen. */
function showTab(name: string): void {
  tab = ["start", "scenes", "layers", "show"].includes(name) ? name : "start";
  try { sessionStorage.setItem("vjlink.remote.tab", tab); } catch { /* optional */ }
  tabsNav.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  panels.querySelectorAll<HTMLElement>("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== tab; });
  window.scrollTo({ top: 0 });
}
tabsNav.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(b => { b.onclick = () => showTab(b.dataset.tab!); });

function render(): void {
  if (!state) return;
  const current = state;
  layer = Math.min(layer, Math.max(0, current.layers.length - 1));
  byId("bpm").textContent = current.bpm.toFixed(1);
  byId("tempo-source").textContent = current.tempoSource;
  byId("tempo-src2").textContent = current.tempoSource;
  const bpmIn = byId<HTMLInputElement>("bpm-in");
  if (bpmIn !== document.activeElement) bpmIn.value = current.bpm.toFixed(1);
  byId("stack").textContent = current.stackName;
  byId("outputs").textContent = current.outputs !== undefined ? t("{n} Ausgänge offen", { n: current.outputs }) : "";

  // Regler (Schieber) und Schalter aus der freigegebenen Liste
  panels.querySelectorAll<HTMLInputElement>("input[data-ctl]").forEach(inp => {
    if (inp !== document.activeElement) inp.value = String(Math.round(ctlVal(inp.dataset.ctl!) * 1000));
  });
  panels.querySelectorAll<HTMLElement>("[data-val]").forEach(e => {
    const c = current.controls?.[e.dataset.val!];
    e.textContent = c ? c.text ?? pct(c.v) : "";
  });
  panels.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach(b => b.setAttribute("aria-pressed", String(ctlVal(b.dataset.toggle!) >= 0.5)));
  byId("blackout").setAttribute("aria-pressed", String(ctlVal("blackout") >= 0.5));
  byId("test-name").textContent = ctlVal("test.toggle") >= 0.5 ? current.testPattern ?? "" : t("aus");

  // Szenen
  const scenes = current.scenes ?? [];
  const sk = JSON.stringify(scenes);
  if (sk !== sceneKey) {
    sceneKey = sk;
    sceneList.replaceChildren(...scenes.map((name, i) => {
      const b = button("", () => void send({ kind: "scene", index: i }));
      const n = document.createElement("span"); n.className = "n"; n.textContent = String(i + 1);
      b.append(n, document.createTextNode(name));
      b.disabled = !online;
      return b;
    }));
  }
  Array.from(sceneList.children).forEach((b, i) => b.setAttribute("aria-pressed", String(i === current.scene)));
  const sceneName = current.scene !== undefined && current.scene >= 0 ? scenes[current.scene] ?? "" : "";
  byId("scene-now").textContent = sceneName;
  byId("start-scene").textContent = sceneName ? `${(current.scene ?? 0) + 1} · ${sceneName}` : "–";

  // Bilder (mehrere): welches bearbeitet wird
  const imgs = current.images ?? [];
  byId("image-card").hidden = imgs.length < 2;
  const ik = JSON.stringify([imgs, current.stack]);
  if (ik !== imageKey) {
    imageKey = ik;
    byId("images").replaceChildren(...imgs.map(im => { const b = button(im.name, () => void send({ kind: "stack", id: im.id })); b.setAttribute("aria-pressed", String(im.id === current.stack)); b.disabled = !online; return b; }));
  }

  // Mixer: alle Ebenen mit Deckkraft
  const mk = JSON.stringify([current.stack, current.layers.map(l => l.name)]);
  if (mk !== mixKey) {
    mixKey = mk;
    mixer.replaceChildren(...current.layers.map((l, i) => {
      const row = document.createElement("div"); row.className = "mix"; row.dataset.layer = String(i);
      const name = button(`E${i + 1} ${l.name}`, () => { layer = i; render(); });
      const r = document.createElement("input"); r.type = "range"; r.min = "0"; r.max = "1000"; r.step = "1"; r.dataset.layerOpacity = String(i);
      r.setAttribute("aria-label", t("Deckkraft {name}", { name: l.name }));
      r.oninput = () => control(`layer.${i + 1}.opacity`, r.valueAsNumber / 1000);
      const v = document.createElement("b");
      row.append(name, r, v);
      [name, r].forEach(e => { e.disabled = !online; });
      return row;
    }));
  }
  Array.from(mixer.children).forEach((row, i) => {
    const l = current.layers[i]; if (!l) return;
    const r = row.querySelector("input")!, op = l.opacity ?? 0;
    if (r !== document.activeElement) r.value = String(Math.round(op * 1000));
    row.querySelector("b")!.textContent = pct(op);
    row.classList.toggle("off", op < 0.01);
    row.querySelector("button")!.setAttribute("aria-pressed", String(i === layer));
  });

  // Gewählte Ebene: Name, Clips, Mischmodus
  const names = JSON.stringify(current.layers.map(item => item.name));
  if (names !== layerKey) {
    layerKey = names;
    layerList.replaceChildren(...current.layers.map(({ name }, i) => button(name, () => { layer = i; render(); })));
  }
  Array.from(layerList.children).forEach((b, i) => b.setAttribute("aria-pressed", String(i === layer)));
  const group = current.layers[layer];
  byId("layer-name").textContent = group ? `E${layer + 1} ${group.name}` : "";
  const clips = JSON.stringify([current.stack, layer, group?.clips]);
  if (clips !== clipKey) {
    clipKey = clips;
    intersection.disconnect();
    observed.clear();
    retryAfter.clear();
    clipList.replaceChildren();
    if (group) {
      const stack = current.stack, layerIndex = layer;
      clipList.append(...group.clips.map(clip => clipTile(clip, stack, layerIndex)),
        button(t("Ebene stoppen"), () => void send({ kind: "clip", stack, layer: layerIndex, id: null })));
    }
  }
  Array.from(clipList.children).forEach((b, i) => b.setAttribute("aria-pressed", String(!!group?.active && group.active === group.clips[i]?.id)));
  const blendBox = byId("blend");
  if (!blendBox.childElementCount) {
    const BL: Record<string, string> = { normal: t("Normal"), add: t("Addieren"), screen: t("Bildschirm"), multiply: t("Multiplizieren") };
    blendBox.append(...BLEND_MODES.map((m, i) => { const b = button(BL[m] ?? m, () => control(`layer.${layer + 1}.blend`, i / (BLEND_MODES.length - 1))); b.dataset.blend = m; return b; }));
  }
  blendBox.querySelectorAll<HTMLButtonElement>("[data-blend]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.blend === group?.blend)));

  // Text-Clips der Ebene
  const texts = group?.texts ?? [];
  byId("text-card").hidden = !texts.length;
  const tk = JSON.stringify([layer, texts.map(x => x.id)]);
  if (tk !== textKey) {
    textKey = tk;
    byId("texts").replaceChildren(...texts.map(x => {
      const box = document.createElement("div"); box.className = "text-edit";
      const ta = document.createElement("textarea"); ta.maxLength = 240; ta.value = x.text; ta.dataset.clip = x.id;
      ta.oninput = () => { ta.dataset.dirty = "1"; };
      ta.setAttribute("aria-label", t("Text"));
      const go = button(t("Übernehmen"), () => { if (ta.value.trim()) { delete ta.dataset.dirty; void send({ kind: "text", layer, clip: x.id, text: ta.value }); } });
      go.className = "primary";
      box.append(ta, go);
      return box;
    }));
  } else {
    byId("texts").querySelectorAll<HTMLTextAreaElement>("textarea").forEach(ta => { const x = texts.find(y => y.id === ta.dataset.clip); if (x && ta !== document.activeElement && !ta.dataset.dirty) ta.value = x.text; });
  }

  // Zeit-Clip der Ebene
  const tm = group?.time;
  byId("time-card").hidden = !tm;
  if (tm) {
    byId("time-title").textContent = tm.name;
    const fields: [string, string][] = [["time-target", tm.target], ["time-minutes", String(tm.minutes)], ["time-label", tm.label], ["time-end", tm.end]];
    const key = JSON.stringify([layer, fields]);
    if (key !== timeKey) { timeKey = key; for (const [id, v] of fields) { const inp = byId<HTMLInputElement>(id); if (inp !== document.activeElement) inp.value = v; } }
    byId("time-target").closest("label")!.hidden = tm.clip !== "time-countdown";
    byId("time-minutes").closest("label")!.hidden = tm.clip !== "time-timer";
    byId("time-end").closest("label")!.hidden = tm.clip !== "time-countdown" && tm.clip !== "time-timer";
    byId("time-restart").hidden = tm.clip !== "time-timer" && tm.clip !== "time-stopwatch";
  }

  // Farbslots
  Array.from(slotList.children).forEach((element, i) => {
    const b = element as HTMLButtonElement;
    b.setAttribute("aria-pressed", String(i === slot));
    b.style.setProperty("--slot-color", `rgb(${(current.slots[i] ?? [0, 0, 0]).map(v => Math.round(v * 255)).join(",")})`);
  });
  for (const key of ["speed", "intensity"] as const) {
    const input = byId<HTMLInputElement>(key);
    if (input !== document.activeElement) input.value = String(Math.round(current[key] * 100));
  }

  // SHOW
  const sh = current.show;
  const has = !!sh && sh.count > 0;
  byId("start-show").hidden = !has;
  byId("show-empty").hidden = has;
  byId("show-count").textContent = has ? t("{n} Cues", { n: sh.count }) : "";
  byId("show-current").textContent = has && sh.current ? sh.current : t("nichts");
  byId("show-remaining").textContent = !has || !sh.current ? "" : sh.remaining === null ? t("läuft bis WEITER") : t("noch {s}", { s: clock(sh.remaining) });
  byId("show-next").textContent = has ? sh.next || t("Ende des Ablaufs") : "–";
  byId("show-go-label").textContent = has ? sh.goLabel : "";
  byId("start-go-label").textContent = has ? sh.goLabel : "";
  byId("start-cue").textContent = has && sh.current ? sh.current : "";
  panels.querySelectorAll<HTMLButtonElement>("[data-show]").forEach(b => { b.disabled = !online || !has; });
  const list = sh?.list ?? [];
  const ck = JSON.stringify(list);
  if (ck !== cueKey) {
    cueKey = ck;
    cueList.replaceChildren(...list.map((name, i) => { const b = button(name, () => void send({ kind: "cueNext", index: i })); const tag = document.createElement("small"); b.append(tag); b.disabled = !online; return b; }));
  }
  Array.from(cueList.children).forEach((b, i) => {
    const live = i === sh?.currentIndex, next = i === sh?.nextIndex;
    b.classList.toggle("live", live); b.classList.toggle("next", next);
    b.querySelector("small")!.textContent = live ? t("läuft") : next ? t("als Nächstes") : "";
  });
}

for (const [i, name] of [..."ABCDE"].entries()) {
  const b = button(name, () => { slot = i; render(); });
  const sample = document.createElement("i");
  sample.setAttribute("aria-hidden", "true");
  b.append(sample);
  slotList.append(b);
}
for (const [i, [name, hex]] of REMOTE_COLORS.entries()) {
  const b = button("", () => void send({ kind: "color", slot, preset: i }));
  const label = document.createElement("span");
  label.dataset.name = name;
  label.textContent = t(name);
  b.append(label);
  const sample = document.createElement("i");
  sample.setAttribute("aria-hidden", "true");
  b.style.setProperty("--slot-color", hex);
  b.prepend(sample);
  presets.append(b);
}
byId("apply-color").onclick = () => { if (state) void send({ kind: "assign", stack: state.stack, layer, slot }); };
byId("tap").onclick = () => void send({ kind: "tap" });
for (const key of ["speed", "intensity"] as const) {
  const input = byId<HTMLInputElement>(key);
  input.onchange = () => void send({ kind: "strobeValue", control: key, value: input.valueAsNumber / 100 });
}
// Schieber, Schalter, Auslöser aus der freigegebenen Regler-Liste
panels.querySelectorAll<HTMLInputElement>("input[data-ctl]").forEach(inp => { inp.oninput = () => control(inp.dataset.ctl!, inp.valueAsNumber / 1000); });
panels.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach(b => { b.onclick = () => control(b.dataset.toggle!, ctlVal(b.dataset.toggle!) >= 0.5 ? 0 : 1); });
panels.querySelectorAll<HTMLButtonElement>("[data-trigger]").forEach(b => { b.onclick = () => control(b.dataset.trigger!, 1); });
byId("blackout").onclick = () => control("blackout", ctlVal("blackout") >= 0.5 ? 0 : 1);
const styleStep = (d: number) => { const c = state?.controls?.["transition.style"]; const n = Math.max(2, c?.steps ?? 2); const i = Math.round((c?.v ?? 0) * (n - 1)); control("transition.style", ((i + d + n) % n) / (n - 1)); };
byId("style-prev").onclick = () => styleStep(-1);
byId("style-next").onclick = () => styleStep(1);
// Tempo: eintippen oder in 0,1 verschieben
const setBpm = (v: number) => { if (Number.isFinite(v) && v >= 20 && v <= 300) void send({ kind: "bpm", value: v }); };
byId("bpm-set").onclick = () => setBpm(Number(byId<HTMLInputElement>("bpm-in").value.replace(",", ".")));
byId<HTMLInputElement>("bpm-in").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); byId("bpm-set").click(); } };
byId("bpm-down").onclick = () => { if (state) setBpm(Math.round((state.bpm - 0.1) * 10) / 10); };
byId("bpm-up").onclick = () => { if (state) setBpm(Math.round((state.bpm + 0.1) * 10) / 10); };
// Zeit-Clip
const timeField = (id: string, field: "target" | "minutes" | "label" | "end") => {
  const inp = byId<HTMLInputElement>(id);
  inp.onchange = () => void send({ kind: "time", layer, field, value: inp.value });
};
timeField("time-target", "target"); timeField("time-minutes", "minutes"); timeField("time-label", "label"); timeField("time-end", "end");
byId("time-restart").onclick = () => void send({ kind: "time", layer, field: "restart", value: "" });
// SHOW
panels.querySelectorAll<HTMLButtonElement>("[data-show]").forEach(b => { b.onclick = () => void send({ kind: "show", action: b.dataset.show as "go" | "back" }); });
// Alles stoppen macht die Show schwarz: zweimal antippen (innerhalb von 3 Sekunden)
const stopBtn = byId<HTMLButtonElement>("show-stop");
stopBtn.onclick = () => {
  if (Date.now() < stopArmed) { stopArmed = 0; stopBtn.classList.remove("armed"); stopBtn.textContent = t("Alles stoppen"); void send({ kind: "show", action: "stop" }); return; }
  stopArmed = Date.now() + 3000; stopBtn.classList.add("armed"); stopBtn.textContent = t("Nochmal tippen: stoppen");
  window.setTimeout(() => { if (stopArmed && Date.now() >= stopArmed) { stopArmed = 0; stopBtn.classList.remove("armed"); stopBtn.textContent = t("Alles stoppen"); } }, 3100);
};
/** Sekunden → „m:ss“. */
function clock(s: number): string { const v = Math.max(0, Math.round(s)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`; }

// Live-Bild des Ausgangs: nur im Reiter Start und solange die Seite sichtbar ist (etwa 3 Bilder je Sekunde)
const liveImg = byId<HTMLImageElement>("live");
let liveUrl = "", liveBusy = false;
async function loadLive(): Promise<void> {
  if (!online || document.hidden || tab !== "start" || liveBusy) return;
  liveBusy = true;
  const auth = token;
  try {
    const r = await fetch("/api/preview", { headers: headers(false, auth), cache: "no-store" });
    if (r.status !== 200 || auth !== token) return;
    const url = URL.createObjectURL(await r.blob());
    liveImg.src = url;
    if (liveUrl) URL.revokeObjectURL(liveUrl);
    liveUrl = url;
    byId("live-wait").hidden = true;
  } catch { /* nächster Versuch */ }
  finally { liveBusy = false; }
}
setInterval(() => void loadLive(), 330);

// Bildschirm wach halten: Wake Lock, wo der Browser es erlaubt; sonst ein unsichtbares, stummes Video
let wakeLock: { release(): Promise<void> } | null = null, wakeVideo: HTMLVideoElement | null = null, wakeTimer = 0;
let awake = false;
try { awake = localStorage.getItem("vjlink.remote.awake") === "1"; } catch { /* optional */ }
async function keepAwake(on: boolean): Promise<void> {
  awake = on;
  try { localStorage.setItem("vjlink.remote.awake", on ? "1" : "0"); } catch { /* optional */ }
  byId("awake").setAttribute("aria-pressed", String(on));
  if (!on) {
    await wakeLock?.release().catch(() => {}); wakeLock = null;
    if (wakeVideo) { wakeVideo.pause(); wakeVideo.remove(); wakeVideo = null; clearInterval(wakeTimer); }
    return;
  }
  const nav = navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } };
  try { if (nav.wakeLock && !wakeLock) { wakeLock = await nav.wakeLock.request("screen"); return; } } catch { wakeLock = null; }
  if (wakeVideo) return;
  const c = document.createElement("canvas"); c.width = c.height = 2;
  const g = c.getContext("2d")!;
  const stream = (c as HTMLCanvasElement & { captureStream?(fps: number): MediaStream }).captureStream?.(1);
  if (!stream) return;
  let flip = false;
  wakeTimer = window.setInterval(() => { flip = !flip; g.fillStyle = flip ? "#000" : "#010101"; g.fillRect(0, 0, 2, 2); }, 1000);
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.loop = true; v.srcObject = stream;
  v.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01;pointer-events:none";
  document.body.append(v);
  wakeVideo = v;
  await v.play().catch(() => {});
}
byId("awake").onclick = () => void keepAwake(!awake);
document.addEventListener("visibilitychange", () => { if (!document.hidden && awake) { wakeLock = null; void keepAwake(true); } });

function startHold(effect: RemoteEffect, node: HTMLButtonElement): void {
  if (!online || held.has(effect)) return;
  const pulse = () => void send({ kind: "hold", effect, active: true, seq: nextSequence() });
  held.set(effect, { node, timer: window.setInterval(pulse, 350) });
  node.classList.add("held");
  pulse();
}
function stopHold(effect: RemoteEffect, transmit = true): void {
  const hold = held.get(effect);
  if (!hold) return;
  held.delete(effect);
  clearInterval(hold.timer);
  hold.node.classList.remove("held");
  if (transmit) void send({ kind: "hold", effect, active: false, seq: nextSequence() });
}
function releaseAll(transmit = true): void {
  for (const effect of held.keys()) stopHold(effect, transmit);
}
for (const node of liveEffects) {
  const effect = node.dataset.effect as RemoteEffect;
  node.onpointerdown = event => {
    if (event.button !== 0 || held.has(effect)) return;
    event.preventDefault();
    node.setPointerCapture(event.pointerId);
    startHold(effect, node);
  };
  node.onpointerup = node.onpointercancel = node.onlostpointercapture = () => stopHold(effect);
  node.onkeydown = event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); startHold(effect, node); } };
  node.onkeyup = event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopHold(effect); } };
  node.onblur = () => stopHold(effect);
}
// Einige mobile Browser öffnen bei langer Berührung zusätzlich ein Kontextmenü oder eine Auswahl.
for (const event of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(event, e => {
    const target = e.target instanceof Element ? e.target : e.target instanceof Node ? e.target.parentElement : null;
    if (target?.closest("button")) e.preventDefault();
  });
}
window.addEventListener("blur", () => releaseAll());
window.addEventListener("pagehide", () => releaseAll());
document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAll(); else void poll(); });

applyTexts();
showTab(tab);
if (awake) void keepAwake(true);
const scannedCode = remotePairingCode(location.hash);
if (scannedCode) {
  history.replaceState(history.state, "", location.pathname + location.search);
  authenticated("");
  void pairWithCode(scannedCode);
} else {
  authenticated(token);
  void poll();
}
setInterval(() => { if (!document.hidden) void poll(); }, 480);
// Neuer Kopplungscode in derselben Seite (z. B. QR-Code erneut gescannt): sofort neu koppeln
window.addEventListener("hashchange", () => {
  const c = remotePairingCode(location.hash);
  if (!c) return;
  history.replaceState(history.state, "", location.pathname + location.search);
  authenticated("");
  void pairWithCode(c);
});

setInterval(() => void loadThumbnail(), 175);
