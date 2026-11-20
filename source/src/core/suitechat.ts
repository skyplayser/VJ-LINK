// Suite-Chat (Alpha): ein Chatraum für die Programme der Suite im selben Netzwerk, ohne Server. Protokoll: docs/suite-chat.md im LJ-Link-Repo (Version 1).
// Diese Datei ist der Raum, wie VJ-Link ihn sieht (ohne Netz, damit er sich testen lässt); das Netz steht in
// src/main/suitechat.ts. Chat-Text kommt nie in ein Log, eine Datei oder einen Problembericht.

export const CHAT_GROUP = "239.255.76.76";
export const CHAT_PORT = 47676;
export const CHAT_APP = "VJ-Link";
export const MAX_TEXT = 500;
export const MAX_NICK = 24;
export const MAX_KEPT = 200;
export const MAX_PEERS = 50;
export const BURST = 10;
export const BURST_WINDOW_MS = 10_000;
export const HERE_EVERY_MS = 5_000;
export const GONE_AFTER_MS = 15_000;
export const HISTORY_ANSWER = 20;
export const HISTORY_WINDOW_MS = 5_000;
export const MAX_DATAGRAM = 8 * 1024;
/** Auf „history?“ antwortet ein Programm höchstens einmal in 10 s, egal wer fragt (sonst lässt sich das Netz fluten). */
export const HISTORY_LOCK_MS = 10_000;
/** Höchstens 3 NOTFÄLLE je Teilnehmer in 60 s; weitere kommen als normale Nachricht (ohne Popup). */
export const URGENT_MAX = 3;
export const URGENT_WINDOW_MS = 60_000;
/** `at` gilt nur zwischen 1970 und 2100 (ms); sonst nimmt der Empfänger die eigene Uhr. */
export const MAX_AT = 4_102_444_800_000;
/** Höchstens so viele Datagramme warten aufs Senden; weitere fallen weg. */
export const MAX_PENDING = 64;
/** Kam bis 12 s nach dem Beitreten kein Verlauf, fragt ein Neuling genau einmal erneut (die anderen waren vielleicht gesperrt). */
export const HISTORY_RETRY_MS = 12_000;

/** Höchstens so viele NOTFALL-Popups stehen offen an; weitere werden normale Nachrichten (ohne Popup, ohne Blinken). */
export const MAX_ALERTS = 20;

/**
 * Neue NOTFÄLLE anderer aufnehmen: `admit` bekommen ein Popup (bis `max` offen sind), `downgrade` werden normale
 * Nachrichten. Verlauf (old) und eigene sind nie ein Popup.
 */
export function admitAlerts(open: number, fresh: readonly ChatMessage[], max = MAX_ALERTS): { admit: ChatMessage[]; downgrade: ChatMessage[] } {
  const admit: ChatMessage[] = [], downgrade: ChatMessage[] = [];
  for (const m of fresh) {
    if (!m.urgent || m.self || m.old) continue;
    (open + admit.length < max ? admit : downgrade).push(m);
  }
  return { admit, downgrade };
}

/** Grenze für wartende Datagramme (eingeplant oder unterwegs); `force` geht vorbei (nur „bye“ beim Beenden). */
export class SendGate {
  pending = 0;
  constructor(readonly max = MAX_PENDING) {}
  take(force = false): boolean {
    if (!force && this.pending >= this.max) return false;
    this.pending++;
    return true;
  }
  done(): void { this.pending = Math.max(0, this.pending - 1); }
  reset(): void { this.pending = 0; }
}

/** Wohin Datagramme gehen; `delayMs` für die zweite Kopie einer Nachricht und die verteilte Verlaufs-Antwort. */
/** `now`: sofort hinaus, an der Warteschlange vorbei (nur „bye“ beim Beenden). */
export type ChatOut = (json: string, delayMs: number, now?: boolean) => void;

export interface ChatMessage {
  /** Laufende Nummer in diesem Programm (für „neuer als“). */
  n: number;
  nick: string;
  where: string;
  app: string;
  text: string;
  /** Absender-Uhr in ms seit 1970 (nur als Uhrzeit gezeigt, und zum Sortieren). */
  at: number;
  urgent: boolean;
  /** Von diesem Programm geschrieben. */
  self: boolean;
  /** Aus einer Verlaufsantwort (zählt nicht als ungelesen). */
  old: boolean;
}

export interface ChatPeer { nick: string; where: string; app: string }

export interface ChatState {
  enabled: boolean;
  nick: string;
  where: string;
  app: string;
  /** Wechselt bei jedem Start: die Oberfläche merkt einen Neustart des Hauptprozesses. */
  instance: string;
  peers: ChatPeer[];
  messages: ChatMessage[];
  /** Nummer der neuesten Nachricht. */
  last: number;
  /** Netz nicht nutzbar (Port belegt o. Ä.); dann bleibt der Raum leer. */
  error?: string;
}

interface Kept extends ChatMessage { id: string; peer: string }
interface Peer extends ChatPeer { lastSeen: number; times: number[]; urgentTimes: number[] }

const DIRECTION = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Zeilenumbrüche (auch U+2028/2029) und Tabs werden Leerzeichen, Richtungs- (auch U+061C) und Steuerzeichen fallen weg, getrimmt, höchstens `max` Zeichen. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const s = value.replace(/[\r\n\t\u2028\u2029]+/g, " ").replace(DIRECTION, "");
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) continue;
    out += ch;
  }
  out = trimSpace(out);
  const cps = [...out];
  return cps.length > max ? trimSpace(cps.slice(0, max).join("")) : out;
}

/** Unicode-Leerzeichen (White_Space) an beiden Enden weg, innen bleibt alles, wie es ist. */
export function trimSpace(s: string): string {
  return s.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
}

/** Zufällige Kennung aus [0-9a-z], neu bei jedem Start. */
export function newPeerId(len = 12): string {
  const r = new Uint8Array(len);
  globalThis.crypto.getRandomValues(r);
  let s = "";
  for (const b of r) s += (b % 36).toString(36);
  return s;
}

/** „DJ David (DJ Booth) · LJL Link“ */
export function chatWho(nick: string, where: string, app: string): string {
  return (nick || app || "?") + (where ? ` (${where})` : "") + (nick && app ? ` · ${app}` : "");
}

export class SuiteChat {
  private on = false;
  private nick = "";
  private where = "";
  private seq = 0;
  private shown = 0;
  private lastHere = -Infinity;
  private historyUntil = -Infinity;
  private lastHistoryAnswer = -Infinity;
  /** Beitritt, ob schon eine Verlaufsantwort kam, ob schon erneut gefragt wurde. */
  private joinedAt = -Infinity;
  private gotOld = false;
  private retried = false;
  private readonly msgs: Kept[] = [];
  private readonly ids = new Set<string>();
  private readonly peers = new Map<string, Peer>();
  /** Verlaufsnachrichten von Absendern, die nicht (mehr) im Raum sind. */
  private readonly ghost: Peer = { nick: "", where: "", app: "", lastSeen: 0, times: [], urgentTimes: [] };
  readonly instance = newPeerId();
  error?: string;

  constructor(
    private readonly out: ChatOut,
    readonly peer: string = newPeerId(),
    readonly app: string = CHAT_APP,
    private readonly wallClock: () => number = Date.now,
  ) {}

  // ------------------------------------------------------------------ dieses Programm

  /**
   * An: tritt bei (Anwesenheit und Bitte um den Verlauf). Aus: geht; danach wird nichts mehr gesendet oder gelesen,
   * und alle Nachrichten sind aus dem Speicher gelöscht (beim Wiedereinschalten kommt der Verlauf von den anderen).
   */
  setOn(value: boolean, now: number): void {
    if (value === this.on) return;
    this.on = value;
    if (value) {
      this.here(now);
      this.historyUntil = now + HISTORY_WINDOW_MS;
      this.joinedAt = now; this.gotOld = false; this.retried = false;
      this.out(this.base("history?"), 0);
    } else {
      this.out(this.base("bye"), 0);
      this.peers.clear();
      this.msgs.length = 0;
      this.ids.clear();
    }
  }

  get enabled(): boolean { return this.on; }

  setProfile(name: unknown, place: unknown, now: number): void {
    this.nick = cleanText(name, MAX_NICK);
    this.where = cleanText(place, MAX_NICK);
    if (this.on) this.here(now);
  }

  get profile(): { nick: string; where: string } { return { nick: this.nick, where: this.where }; }

  /** Nachricht von diesem Programm; false, wenn aus, ohne Namen oder mit leerem Text. `urgent`: NOTFALL. */
  post(value: unknown, urgent = false): boolean {
    const text = cleanText(value, MAX_TEXT);
    if (!this.on || !text || !this.nick) return false;
    const m: Kept = {
      // Zähler plus 8 Zufallszeichen: niemand kann die nächsten ids vorab belegen und so Nachrichten verdecken.
      id: `${this.peer}-${++this.seq}${newPeerId(8)}`, peer: this.peer, nick: this.nick, where: this.where, app: this.app,
      text, urgent, at: this.wallClock(), self: true, old: false, n: 0,
    };
    this.keep(m);
    const json = this.msgJson(m, false);
    this.out(json, 0);
    this.out(json, 300); // zweite Kopie: WLAN verliert ab und zu einzelne Datagramme
    return true;
  }

  /** Zweimal pro Sekunde: Anwesenheit alle 5 s; wer 15 s still war, ist gegangen. True, wenn sich die Liste geändert hat. */
  tick(now: number): boolean {
    if (!this.on) return false;
    if (now - this.lastHere >= HERE_EVERY_MS) this.here(now);
    if (!this.gotOld && !this.retried && now - this.joinedAt >= HISTORY_RETRY_MS) {
      this.retried = true;
      this.historyUntil = now + HISTORY_WINDOW_MS;
      this.out(this.base("history?"), 0);
    }
    let gone = false;
    for (const [id, p] of this.peers) if (now - p.lastSeen > GONE_AFTER_MS) { this.peers.delete(id); gone = true; }
    return gone;
  }

  /** Beenden: die anderen sehen es sofort statt nach 15 s. */
  stop(): void {
    if (this.on) this.out(this.base("bye"), 0, true);
  }

  private here(now: number): void {
    this.lastHere = now;
    this.out(JSON.stringify({ suite: "chat", v: 1, t: "here", peer: this.peer, nick: this.nick, where: this.where, app: this.app }), 0);
  }

  // ------------------------------------------------------------------ die anderen

  /** Datagramm aus dem Netz. Kaputtes, Eigenes und alles über den Grenzen fällt weg. True, wenn sich etwas geändert hat. */
  receive(json: string, now: number): boolean {
    if (!this.on || typeof json !== "string" || json.length > MAX_DATAGRAM) return false;
    let m: Record<string, unknown>;
    try {
      const v: unknown = JSON.parse(json);
      if (!v || typeof v !== "object" || Array.isArray(v)) return false;
      m = v as Record<string, unknown>;
    } catch { return false; }
    if (m.suite !== "chat" || m.v !== 1) return false;
    const from = typeof m.peer === "string" ? m.peer : "";
    if (!/^[0-9a-z]{8,32}$/.test(from) || from === this.peer) return false;
    const type = typeof m.t === "string" ? m.t : "";
    if (type === "bye") return this.peers.delete(from);
    // Verlaufsantwort: „peer“ ist der ursprüngliche Absender, der längst gegangen sein kann. Sie legt niemanden im
    // Raum an und frischt niemanden auf (sonst stünden Gegangene nach jedem Neuling wieder 15 s im Raum).
    if (type === "msg" && m.old === true) {
      this.gotOld = true;
      const known = this.peers.get(from);
      // Unbekannte Absender teilen sich eine Grenze (10 in 10 s außerhalb des eigenen Verlaufs-Fensters).
      // Namen nur aus Live-Nachrichten und „here“, nie aus dem Verlauf.
      return this.message(known ?? this.ghost, m, now, false);
    }
    let p = this.peers.get(from);
    let changed = false;
    if (!p) {
      if (this.peers.size >= MAX_PEERS) return false;
      p = { nick: "", where: "", app: "", lastSeen: now, times: [], urgentTimes: [] };
      this.peers.set(from, p);
      changed = true;
    }
    p.lastSeen = now;
    switch (type) {
      case "here": {
        const nick = cleanText(m.nick, MAX_NICK), where = cleanText(m.where, MAX_NICK), app = cleanText(m.app, MAX_NICK);
        if (nick !== p.nick || where !== p.where || app !== p.app) changed = true;
        p.nick = nick; p.where = where; p.app = app;
        return changed;
      }
      case "msg": return this.message(p, m, now) || changed;
      case "history?": {
        // Ohne Nachrichten keine Antwort; sonst höchstens eine Antwort in 10 s, egal von wem gefragt.
        if (!this.msgs.length || now - this.lastHistoryAnswer < HISTORY_LOCK_MS) return changed;
        this.lastHistoryAnswer = now;
        const start = Math.max(0, this.msgs.length - HISTORY_ANSWER);
        for (let i = start; i < this.msgs.length; i++) this.out(this.msgJson(this.msgs[i]!, true), 20 * (i - start + 1));
        return changed;
      }
      default: return changed; // unbekannte Typen: neuere Versionen
    }
  }

  /** `listed`: der Absender steht im Raum; nur dann übernimmt er Namen aus der Nachricht. */
  private message(p: Peer, m: Record<string, unknown>, now: number, listed = true): boolean {
    const id = typeof m.id === "string" ? m.id : "";
    if (!id || id.length > 64 || this.ids.has(id)) return false; // zweite Kopie oder Verlauf erneut
    // Die id gehört dem Absender: niemand darf fremde ids vorwegnehmen und so dessen Nachrichten verdecken.
    if (typeof m.peer !== "string" || !id.startsWith(`${m.peer}-`)) return false;
    const text = cleanText(m.text, MAX_TEXT);
    if (!text) return false;
    while (p.times.length && now - p.times[0]! > BURST_WINDOW_MS) p.times.shift();
    const old = m.old === true;
    // Der erbetene Verlauf kommt gebündelt; er ist begrenzt (20 je Antwortendem) und erwartet.
    const expected = old && now < this.historyUntil;
    if (p.times.length >= BURST && !expected) return false;
    if (!expected) p.times.push(now);
    const nick = cleanText(m.nick, MAX_NICK), where = cleanText(m.where, MAX_NICK), app = cleanText(m.app, MAX_NICK);
    // Eine Nachricht sagt auch, wer schreibt (ein „here“ kann verloren gegangen sein).
    if (listed) {
      if (!p.nick) p.nick = nick;
      if (!p.app) p.app = app;
      if (!p.where) p.where = where;
    }
    // Live-Nachrichten zählen mit der Ankunftszeit (eine falsch gehende Uhr beim Absender darf sie nicht verstecken);
    // nur der Verlauf nimmt das mitgeschickte `at`.
    const at = old && typeof m.at === "number" && Number.isFinite(m.at) && m.at >= 0 && m.at <= MAX_AT ? Math.trunc(m.at) : this.wallClock();
    // NOTFALL: als Popup; eine Verlaufs-Antwort bringt einen alten nie wieder als neu. Mehr als 3 in 60 s: normal.
    let urgent = m.urgent === true && !old;
    if (urgent) {
      while (p.urgentTimes.length && now - p.urgentTimes[0]! > URGENT_WINDOW_MS) p.urgentTimes.shift();
      if (p.urgentTimes.length >= URGENT_MAX) urgent = false;
      else p.urgentTimes.push(now);
    }
    this.keep({
      id, peer: id.slice(0, id.indexOf("-")), nick, where, app, text, at, self: false, old, n: 0, urgent,
    });
    return true;
  }

  private keep(m: Kept): void {
    this.ids.add(m.id);
    if (this.ids.size > 4 * MAX_KEPT) this.ids.delete(this.ids.values().next().value!);
    m.n = ++this.shown;
    this.msgs.push(m);
    while (this.msgs.length > MAX_KEPT) this.msgs.shift();
  }

  // ------------------------------------------------------------------ für die Oberfläche

  /** Zustand mit den Nachrichten, die neuer als `since` sind. */
  state(since = 0): ChatState {
    const peers: ChatPeer[] = [];
    // Wer noch nicht gesagt hat, wer er ist (bisher nur „history?“), steht nicht in der Liste.
    for (const p of this.peers.values()) if (p.nick || p.app) peers.push({ nick: p.nick, where: p.where, app: p.app });
    return {
      enabled: this.on, nick: this.nick, where: this.where, app: this.app, instance: this.instance, peers,
      messages: this.msgs.filter(m => m.n > since).map(({ n, nick, where, app, text, at, urgent, self, old }) => ({ n, nick, where, app, text, at, urgent, self, old })),
      last: this.shown,
      ...(this.error ? { error: this.error } : {}),
    };
  }

  /** Für einen Problembericht: nie Text, nie Namen. */
  diagnostics(): string {
    return `Suite chat: ${this.on ? "on" : "off"}, ${this.peers.size} other programs, ${this.msgs.length} messages in memory${this.error ? `, network: ${this.error}` : ""}`;
  }

  // ------------------------------------------------------------------ Hilfen

  private base(type: string): string {
    return JSON.stringify({ suite: "chat", v: 1, t: type, peer: this.peer });
  }

  /** `old`: als Verlauf erneut gesendet (Empfänger nehmen gleich nach ihrer Bitte viele davon an). */
  private msgJson(m: Kept, old: boolean): string {
    return JSON.stringify({
      suite: "chat", v: 1, t: "msg", peer: m.peer, id: m.id, nick: m.nick, where: m.where, app: m.app, text: m.text,
      ...(m.urgent ? { urgent: true } : {}), at: m.at, ...(old ? { old: true } : {}),
    });
  }
}
