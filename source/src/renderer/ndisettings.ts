// Einstellungen → NDI: welche NDI-Laufzeit (Version), über welche Netzwerkkarte NDI sendet, und der Stand jedes
// NDI-Ausgangs (Name im Netz, Größe, gesendete Bilder, Empfänger). Größe, Name und Senden stellt man in AUSGABE ein.
// NDI® ist eine eingetragene Marke der Vizrt NDI AB.
import { t } from "../core/i18n";
import type { NdiSettingsInfo, VjBridge } from "../core/frame";
import { ndiMbit } from "../core/netiface";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Fehlercode des NDI-Prozesses in Klartext (Ausgabe-Tab und Einstellungen). */
export function ndiErrorText(code: string): string {
  if (code === "runtime-missing") return t("NDI-Laufzeit fehlt");
  if (code === "create") return t("NDI legt die Quelle nicht an. Gibt es den Namen auf diesem Rechner schon (zweites VJ-Link, anderes Programm)? Anderen Namen wählen.");
  if (code === "init") return t("NDI startet nicht (diese Rechner-CPU wird von der NDI-Laufzeit nicht unterstützt).");
  if (code === "timeout" || code === "process") return t("Der NDI-Prozess antwortet nicht. Ausgang schließen und wieder senden; hilft das nicht, NDI-Laufzeit neu installieren.");
  if (code.startsWith("load") || code.startsWith("symbols")) return t("Die NDI-Laufzeit lässt sich nicht laden ({error}). Neueste NDI-Laufzeit installieren.", { error: code });
  return code;
}

export class NdiSettings {
  private timer = 0;
  private info: NdiSettingsInfo | null = null;
  private busy = false;

  constructor(private root: HTMLElement, private bridge: VjBridge | null, private openOutputs: () => void) {}

  /** Seite zeigen und jede Sekunde auffrischen, solange sie sichtbar ist. */
  async show(): Promise<void> {
    clearInterval(this.timer);
    await this.refresh(true);
    this.timer = window.setInterval(() => {
      if (!this.visible()) { clearInterval(this.timer); return; }
      void this.refresh(false);
    }, 1000);
  }

  private visible(): boolean {
    const sec = this.root.closest<HTMLElement>(".set-sec");
    return !!sec && !sec.hidden && !this.root.closest<HTMLElement>("#settings")?.hidden;
  }

  private async refresh(full: boolean): Promise<void> {
    if (this.busy || !this.bridge?.ndiInfo) return;
    this.busy = true;
    try {
      const info = await this.bridge.ndiInfo();
      if (!info) return;
      // Auswahlfeld nicht unter dem Mauszeiger neu bauen: nur der Stand der Ausgänge ändert sich laufend
      const same = this.info && JSON.stringify({ ...this.info, outputs: [] }) === JSON.stringify({ ...info, outputs: [] });
      this.info = info;
      if (full || !same || !this.root.childElementCount) this.render();
      else this.renderOutputs();
    } finally { this.busy = false; }
  }

  private render(): void {
    const info = this.info!;
    const r = this.root;
    r.replaceChildren();
    // Laufzeit und Version
    r.append(el("h3", "", t("NDI-Laufzeit")));
    const ver = el("label", "set-row");
    ver.append(el("span", "", t("Version")), el("b", "ndi-ver", info.runtime ? info.version ?? (info.versionError ? t("unbekannt ({error})", { error: ndiErrorText(info.versionError) }) : "…") : t("nicht installiert")));
    r.append(ver);
    if (info.runtime) {
      const file = el("label", "set-row");
      file.append(el("span", "", t("Datei")), el("code", "ndi-file", info.runtime));
      r.append(file);
    }
    const btns = el("div", "report-btns");
    const get = el("button", "btn", info.runtime ? t("Neuere NDI-Laufzeit laden") : t("NDI-Laufzeit laden"));
    get.title = t("Öffnet die Download-Seite von NDI (kostenlos). Danach VJ-Link neu starten.");
    get.addEventListener("click", () => this.bridge?.openNdiPage?.("runtime"));
    btns.append(get);
    r.append(btns);
    r.append(el("p", "am-hint", t("VJ-Link nutzt die NDI-Laufzeit, die du selbst von NDI installierst. Empfänger wie VD-Link, Resolume oder OBS sollten NDI 5 oder neuer haben; am besten auf allen Rechnern dieselbe Hauptversion.")));

    // Netzwerkkarte
    r.append(el("h3", "", t("Netzwerkkarte")));
    const row = el("label", "set-row");
    const sel = el("select", "ndi-adapter");
    sel.append(new Option(t("Automatisch (alle Karten)"), ""));
    for (const a of info.adapters) sel.append(new Option(`${a.label} · ${a.address}`, a.name));
    if (info.adapter && !info.adapters.some(a => a.name === info.adapter)) sel.append(new Option(t("{name} (nicht verbunden)", { name: info.adapter }), info.adapter));
    sel.value = info.adapter;
    sel.addEventListener("change", async () => {
      sel.disabled = true;
      const next = await this.bridge?.ndiAdapter?.(sel.value);
      if (next) { this.info = next; this.render(); }
    });
    row.append(el("span", "", t("NDI senden über")), sel);
    r.append(row);
    const st = el("p", "am-hint ndi-adapter-state");
    if (!info.adapter) st.textContent = t("NDI wählt die Karten selbst. Fehlt eine Quelle beim Empfänger, hier die Karte wählen, an der auch der Empfänger hängt.");
    else if (info.adapterAddress) st.textContent = t("NDI sendet nur über diese Karte ({address}).", { address: info.adapterAddress });
    else { st.textContent = t("Die gewählte Karte ist gerade nicht verbunden. Bis sie wieder da ist, sendet NDI über alle Karten."); st.classList.add("warn"); }
    r.append(st);
    r.append(el("p", "am-hint", t("Hängt der Rechner an mehreren Netzen (z. B. WLAN und Kabel zum Video-Netz), sucht der Empfänger die Quelle oft auf der falschen Karte, und sie fehlt. Laufende NDI-Ausgänge starten beim Wechsel kurz neu (etwa eine Sekunde ohne Bild).")));

    // Ausgänge
    r.append(el("h3", "", t("NDI-Ausgänge")));
    r.append(el("div", "am-list ndi-outs"));
    this.renderOutputs();
    const go = el("button", "btn", t("In AUSGABE einstellen"));
    go.title = t("Name, Größe, Bildrate, weitere NDI-Ausgänge, Senden an/aus");
    go.addEventListener("click", () => this.openOutputs());
    r.append(el("div", "report-btns"));
    r.lastElementChild!.append(go);
    // Pflicht laut NDI: Marken-Hinweis mit Link zu ndi.video
    const tm = el("p", "am-hint", t("NDI® ist eine eingetragene Marke der Vizrt NDI AB. VJ-Link ist kein Produkt von NDI.") + " ");
    const home = el("a", "", "ndi.video"); home.href = "#"; home.addEventListener("click", e => { e.preventDefault(); this.bridge?.openNdiPage?.("home"); });
    tm.append(home);
    r.append(tm);
  }

  private renderOutputs(): void {
    const info = this.info!, list = this.root.querySelector<HTMLElement>(".ndi-outs");
    if (!list) return;
    list.replaceChildren();
    let total = 0, running = 0;
    for (const d of info.outputs) {
      const n = d.ndi; if (!n) continue;
      const mbit = ndiMbit(d.width, d.height, n.fps);
      if (d.open) { total += mbit; running++; }
      const item = el("div", "am-item static ndi-out");
      item.append(el("b", "", `${info.host} (${n.name})`));
      item.append(el("small", "", t("{w} × {h} Pixel · {fps} Bilder/s · ca. {mbit} Mbit/s", { w: d.width, h: d.height, fps: n.fps, mbit })));
      let state: string, cls = "";
      if (!n.runtime) state = t("NDI-Laufzeit fehlt");
      else if (n.error) { state = ndiErrorText(n.error); cls = "warn"; }
      else if (!d.open) state = t("aus");
      else if (n.sentFps === undefined) state = t("Startet …");
      else { state = t("sendet {fps} Bilder/s · Empfänger: {n}", { fps: n.sentFps, n: n.conns ?? 0 }); cls = n.conns ? "ok" : ""; }
      item.append(el("small", `ndi-out-state ${cls}`, state));
      list.append(item);
    }
    // Reicht das Netz? Ab rund 100 Mbit/s nur noch über Gigabit-Kabel, nicht über WLAN oder 100-Mbit-Adapter
    const bw = el("p", "am-hint ndi-bw");
    if (running) {
      bw.textContent = t("Zusammen ca. {mbit} Mbit/s, solange gesendet wird.", { mbit: total }) + " " + (total > 90
        ? t("Das braucht Gigabit-Kabel bis zum Empfänger. Über WLAN oder einen 100-Mbit-Adapter fehlen Quellen oder ruckeln; dann Bildrate oder Größe senken.")
        : t("Das geht auch über ein 100-Mbit-Netz; WLAN bleibt unsicher."));
      bw.classList.toggle("warn", total > 900);
    } else bw.textContent = t("Richtwert je Ausgang: 1920 × 1080 mit 60 Bilder/s braucht ca. 250 Mbit/s (Gigabit-Kabel).");
    list.append(bw);
  }
}
