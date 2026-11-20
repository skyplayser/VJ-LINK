import { REMOTE_COLORS, remotePairingCode, type RemoteCommand, type RemoteEffect, type RemoteState } from "../core/remote";
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
let layerKey = "", clipKey = "", polling = false;
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
  const url = thumbnailUrls.get(clip.id);
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
  const existing = thumbnailUrls.get(clip);
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
    thumbnailUrls.set(clip, url);
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
  layerKey = clipKey = "";
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
  panels.hidden = transport.hidden = !token;
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
    if (r.ok && (command.kind === "clip" || command.kind === "tap")) void poll();
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

function render(): void {
  if (!state) return;
  const current = state;
  layer = Math.min(layer, Math.max(0, current.layers.length - 1));
  byId("bpm").textContent = current.bpm.toFixed(1);
  byId("tempo-source").textContent = current.tempoSource;
  byId("stack").textContent = current.stackName;
  const names = JSON.stringify(current.layers.map(item => item.name));
  if (names !== layerKey) {
    layerKey = names;
    layerList.replaceChildren(...current.layers.map(({ name }, i) => button(name, () => { layer = i; render(); })));
  }
  Array.from(layerList.children).forEach((b, i) => b.setAttribute("aria-pressed", String(i === layer)));
  const group = current.layers[layer];
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
  Array.from(slotList.children).forEach((element, i) => {
    const b = element as HTMLButtonElement;
    b.setAttribute("aria-pressed", String(i === slot));
    b.style.setProperty("--slot-color", `rgb(${(current.slots[i] ?? [0, 0, 0]).map(v => Math.round(v * 255)).join(",")})`);
  });
  for (const key of ["speed", "intensity"] as const) {
    const input = byId<HTMLInputElement>(key);
    if (input !== document.activeElement) input.value = String(Math.round(current[key] * 100));
  }
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

setInterval(() => void loadThumbnail(), 175);
