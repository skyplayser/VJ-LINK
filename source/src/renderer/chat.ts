// Suite-Chat (Alpha) im Bedienfenster: Chat-Knopf oben mit ungelesenen Nachrichten (Kreis in der Akzentfarbe),
// Chatfenster und NOTFALL-Popup unten rechts. Nie in einem Ausgangsfenster (output.html lädt das nicht).
// Texte nur als textContent, nie als HTML. Raum und Netz: src/core/suitechat.ts, src/main/suitechat.ts.
import { t } from "../core/i18n";
import { MAX_ALERTS, admitAlerts, chatWho, type ChatMessage, type ChatPeer, type ChatState } from "../core/suitechat";
import type { VjBridge } from "../core/frame";

/**
 * Was die Oberfläche über ein Neuladen hinweg weiß (z. B. Sprachwechsel), solange der Hauptprozess derselbe ist:
 * bis zu welcher Nachricht alles verarbeitet ist, welche Notfälle noch offen sind, welche herabgestuft wurden,
 * Ungelesenes. Sonst kämen bestätigte Notfälle nach dem Neuladen wieder. Nur Nummern, nie Text.
 */
interface Kept { instance: string; seen: number; open: number[]; down: number[]; unread: number; urgentUnread: boolean }
const KEEP = "vjlink.chat";
const readKept = (): Kept | null => { try { return JSON.parse(sessionStorage.getItem(KEEP) ?? "null") as Kept | null; } catch { return null; } };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function chatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export class ChatUi {
  private on = false;
  private nick = "";
  private where = "";
  private last = 0;
  private msgs: ChatMessage[] = [];
  private peers: ChatPeer[] = [];
  private open = false;
  private unread = 0;
  private instance = "";
  private renaming = false;
  private alerts: ChatMessage[] = [];
  /** Ungelesener NOTFALL bei geschlossenem Chat: der Chat-Knopf blinkt gelb, bis der Chat geöffnet wird (nicht durch OK). */
  private urgentUnread = false;
  /** Wie viele Notfälle beim letzten Zeigen offen waren („Alle schließen“ schließt nur bis dahin). */
  private alertsShown = 0;
  /** Herabgestufte Notfälle (mehr als 20 offen): bleiben nach einem Neuladen normale Nachrichten. */
  private down = new Set<number>();
  private error = "";
  private busy = false;
  private again = false;
  private shown = "";
  private readonly title = document.title;

  constructor(private readonly bridge: VjBridge | null) {
    if (!bridge?.chatGet) return; // Browser (npm run web): kein Chat
    $("chat-btn").addEventListener("click", () => this.setOpen(!this.open));
    $("chat-close").addEventListener("click", () => this.setOpen(false));
    $("chat-rename").addEventListener("click", () => {
      this.renaming = true;
      $<HTMLInputElement>("chat-nick").value = this.nick;
      $<HTMLInputElement>("chat-where").value = this.where;
      this.render(); $("chat-nick").focus();
    });
    $("chat-nick-form").addEventListener("submit", e => {
      e.preventDefault();
      const nick = $<HTMLInputElement>("chat-nick").value.trim(), where = $<HTMLInputElement>("chat-where").value.trim();
      if (!nick) { $("chat-nick").focus(); return; }
      this.renaming = false; this.nick = nick; this.where = where;
      void this.settings({ nick, where }).then(() => this.setOpen(true));
    });
    $("chat-form").addEventListener("submit", e => { e.preventDefault(); void this.send(false); });
    $("chat-emergency").addEventListener("click", () => { void this.send(true); });
    $("chat-alert-ok").addEventListener("click", () => { this.alerts.shift(); this.showAlert(); });
    $("chat-alert-all").addEventListener("click", () => { this.alerts.splice(0, this.alertsShown); this.showAlert(); });
    $("chat-panel").addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); this.setOpen(false); $("chat-btn").focus(); } });
    const box = $<HTMLInputElement>("chat-on");
    box.addEventListener("change", () => { void this.settings({ enabled: box.checked }); });
    window.addEventListener("focus", () => { if (this.open) { this.unread = 0; this.render(); } });
    bridge.onChat?.(() => { void this.poll(); });
    void this.poll();
    window.setInterval(() => { void this.poll(); }, 5000); // falls eine Benachrichtigung verloren ging
  }

  /** Für den Problembericht: nie Text, nie Namen. */
  diagnostics(): string {
    if (!this.bridge?.chatGet) return "Suite chat: not available";
    return `Suite chat: ${this.on ? "on" : "off"}, ${this.peers.length} other programs, ${this.msgs.length} messages in memory${this.error ? ", network error" : ""}`;
  }

  private async settings(c: { enabled?: boolean; nick?: string; where?: string }): Promise<void> {
    await this.bridge?.chatSettings?.(c);
    await this.poll();
  }

  private async poll(): Promise<void> {
    if (!this.bridge?.chatGet) return;
    // Eine Anfrage nach der anderen, sonst kämen Zeilen doppelt; eine inzwischen gewünschte folgt sofort.
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    let st: ChatState | null = null;
    try { st = await this.bridge.chatGet(this.last); } catch { /* nächstes Mal */ }
    this.busy = false;
    if (this.again) { this.again = false; window.setTimeout(() => { void this.poll(); }, 0); }
    if (!st) return;
    // Hauptprozess neu gestartet: alles neu lesen
    if ((this.instance && st.instance !== this.instance) || st.last < this.last) {
      this.instance = st.instance; this.last = 0; this.msgs = []; this.shown = ""; this.unread = 0;
      return this.poll();
    }
    const firstLoad = !this.instance;
    this.instance = st.instance;
    // Neu geladen, Hauptprozess derselbe: Stand von vorher übernehmen; nur Neueres zählt als neu.
    const kept = firstLoad ? readKept() : null;
    const seen = kept && kept.instance === st.instance ? kept.seen : -1;
    if (seen >= 0 && kept) {
      this.unread = kept.unread; this.urgentUnread = kept.urgentUnread; this.down = new Set(kept.down);
      const open = new Set(kept.open);
      this.alerts = st.messages.filter(m => open.has(m.n));
    }
    this.on = st.enabled; this.nick = st.nick; this.where = st.where; this.peers = st.peers; this.error = st.error ?? "";
    for (const m of st.messages) if (this.down.has(m.n)) m.urgent = false;
    const fresh = seen >= 0 ? st.messages.filter(m => m.n > seen) : st.messages;
    if (seen >= 0) { this.msgs.push(...st.messages.filter(m => m.n <= seen)); this.msgs.sort((a, b) => a.at - b.at || a.n - b.n); }
    if (fresh.length) {
      this.msgs.push(...fresh);
      // Verlauf von anderen kommt später mit älteren Zeiten: in der Reihenfolge zeigen, in der geschrieben wurde.
      this.msgs.sort((a, b) => a.at - b.at || a.n - b.n);
      if (this.msgs.length > 200) this.msgs.splice(0, this.msgs.length - 200);
      // Erstes Laden ohne gemerkten Stand: nur, was nach der eigenen letzten Nachricht kam, zählt als neu.
      const guess = firstLoad && seen < 0;
      const lastSelf = guess ? fresh.map(m => m.self).lastIndexOf(true) : -1;
      // Verlaufsantworten (old) zählen nicht als ungelesen, wie in LJ Link.
      const news = fresh.filter((m, i) => !m.self && !m.old && i > lastSelf).length;
      if (news && !(this.open && document.hasFocus())) this.unread += news;
      // NOTFALL von anderen: sofort als Popup (ohne gemerkten Stand nur die der letzten 2 Minuten).
      const { admit, downgrade } = admitAlerts(this.alerts.length, fresh.filter(m => !guess || Date.now() - m.at < 120_000), MAX_ALERTS);
      for (const m of downgrade) { m.urgent = false; this.down.add(m.n); } // mehr als 20 offen: normale Nachricht
      if (admit.length) {
        this.alerts.push(...admit);
        if (!this.open) this.urgentUnread = true;
        if (!firstLoad) this.bridge?.chatAttention?.();
      }
    }
    if (fresh.length || seen >= 0) this.showAlert();
    this.last = Math.max(this.last, st.last);
    this.keep();
    this.render(fresh.length > 0);
  }

  /** Stand für ein Neuladen merken (nur Nummern). */
  private keep(): void {
    if (!this.instance) return;
    const k: Kept = { instance: this.instance, seen: this.last, open: this.alerts.map(m => m.n), down: [...this.down].slice(-200), unread: this.unread, urgentUnread: this.urgentUnread };
    try { sessionStorage.setItem(KEEP, JSON.stringify(k)); } catch { /* ohne Speicher weiter */ }
  }

  private setOpen(open: boolean): void {
    this.open = open;
    if (open) { this.unread = 0; this.urgentUnread = false; this.keep(); }
    this.shown = "";
    this.render(true);
    if (open) $(this.nick && !this.renaming ? "chat-input" : "chat-nick").focus();
  }

  private render(scroll = false): void {
    $<HTMLInputElement>("chat-on").checked = this.on;
    $("chat-set-status").textContent = this.error ? t("Der Chat kann gerade nicht ins Netzwerk (Port belegt oder gesperrt).") : "";
    const btn = $("chat-btn");
    btn.hidden = !this.on;
    btn.classList.toggle("on", this.open);
    if (!this.on || this.open) this.urgentUnread = false;
    btn.classList.toggle("urgent", this.urgentUnread);
    btn.setAttribute("aria-expanded", String(this.open));
    const badge = $("chat-unread");
    badge.hidden = this.unread === 0;
    badge.textContent = this.unread > 9 ? "9+" : String(this.unread);
    document.title = (this.unread ? `(${this.unread}) ` : "") + this.title;
    $("chat-panel").hidden = !this.on || !this.open;
    // Aus: Popups zu, Nachrichten weg (der Hauptprozess löscht sie auch; beim Einschalten kommt der Verlauf)
    if (!this.on) { this.alerts = []; this.msgs = []; this.down.clear(); this.unread = 0; this.shown = ""; badge.hidden = true; document.title = this.title; this.showAlert(); return; }
    if (!this.open) return;
    // Beim Betreten zuerst ein Name (einmal gefragt, VJ-Link merkt ihn; „Name ändern“ fragt erneut).
    const asking = !this.nick || this.renaming;
    $("chat-nick-form").hidden = !asking;
    $("chat-form").hidden = asking;
    $("chat-rename").hidden = asking;
    const who = this.peers.filter(p => p.nick || p.app).map(p => chatWho(p.nick, p.where, p.app));
    $("chat-peers").textContent = who.length ? t("Im Raum: ") + [t("du"), ...who].join(", ")
      : t("Noch niemand sonst im Raum. Suite-Programme in diesem Netzwerk kommen von selbst dazu.");
    $("chat-status").textContent = this.error ? t("Der Chat kann gerade nicht ins Netzwerk (Port belegt oder gesperrt).") : "";
    const list = $("chat-list");
    const sig = `${this.msgs.length}:${this.last}`;
    if (sig === this.shown && !scroll) return;
    this.shown = sig;
    const nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.replaceChildren();
    if (!this.msgs.length) {
      const e = document.createElement("div"); e.className = "chat-empty"; e.textContent = t("Noch keine Nachrichten.");
      list.append(e);
    }
    for (const m of this.msgs) {
      const row = document.createElement("div");
      row.className = `chat-msg${m.self ? " self" : ""}${m.urgent ? " urgent" : ""}`;
      const meta = document.createElement("small");
      meta.textContent = `${m.urgent ? "EMERGENCY · " : ""}${m.self ? t("Du") : chatWho(m.nick, m.where, m.app)} · ${chatTime(m.at)}`;
      const text = document.createElement("div");
      text.textContent = m.text; // nur Text, nie HTML
      row.append(meta, text);
      list.append(row);
    }
    if (scroll || nearEnd) list.scrollTop = list.scrollHeight;
  }

  /** Der älteste noch nicht bestätigte NOTFALL, unten rechts mit gelb blinkendem Rand, bis „OK“. */
  private showAlert(): void {
    const m = this.alerts[0];
    this.alertsShown = this.alerts.length;
    this.keep();
    $("chat-alert").hidden = !m;
    if (!m) return;
    $("chat-alert-from").textContent = `${chatWho(m.nick, m.where, m.app)} · ${chatTime(m.at)}`;
    $("chat-alert-text").textContent = m.text; // nur Text
    $("chat-alert-more").textContent = this.alerts.length > 1 ? t("{n} weitere", { n: this.alerts.length - 1 }) : "";
    $("chat-alert-all").hidden = this.alerts.length < 2;
    // Nie den Tastaturfokus nehmen: wer gerade tippt, darf den Notfall nicht ungelesen mit Leertaste/Enter bestätigen.
  }

  private async send(urgent: boolean): Promise<void> {
    const input = $<HTMLInputElement>("chat-input");
    let text = input.value.trim();
    if (urgent && !text) text = t("EMERGENCY – bitte sofort kommen!");
    if (!text) return;
    $("chat-status").textContent = "";
    const ok = await this.bridge?.chatPost?.(text, urgent).catch(() => false);
    if (ok) input.value = "";
    else $("chat-status").textContent = t("Nicht gesendet: Der Chat ist aus.");
    await this.poll();
    input.focus();
  }
}
