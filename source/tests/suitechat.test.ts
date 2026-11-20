import { describe, expect, it } from "vitest";
import { admitAlerts, SendGate, MAX_ALERTS, MAX_PENDING, trimSpace, BURST, GONE_AFTER_MS, HISTORY_LOCK_MS, HISTORY_RETRY_MS, MAX_AT, MAX_KEPT, MAX_PEERS, SuiteChat, URGENT_MAX, chatWho, cleanText, newPeerId } from "../src/core/suitechat";

type Sent = { json: Record<string, unknown>; delay: number };

function room(peer = "vjlink0000a1") {
  const sent: Sent[] = [];
  let clock = 1_800_000_000_000;
  const chat = new SuiteChat((json, delay) => sent.push({ json: JSON.parse(json), delay }), peer, "VJ-Link", () => clock);
  return { chat, sent, setClock: (v: number) => { clock = v; } };
}

const msg = (o: Record<string, unknown>) => JSON.stringify({ suite: "chat", v: 1, t: "msg", peer: "ljlink0000b2", id: "ljlink0000b2-1",
  nick: "Phil", where: "FOH", app: "LJ Link", text: "Drop in 30 s!", at: 1_800_000_000_500, ...o });

describe("Suite-Chat: Raum-Logik", () => {
  it("bereinigt Texte wie die anderen Programme", () => {
    expect(cleanText("  Hallo\r\nWelt\tda  ", 500)).toBe("Hallo Welt da");
    expect(cleanText("a‮b⁦c‏d", 500)).toBe("abcd");
    expect(cleanText("x\u0000y\u0007z\u009Fq", 500)).toBe("xyzq");
    expect(cleanText("😀".repeat(30), 24)).toBe("😀".repeat(24)); // Codepoints, nicht UTF-16-Einheiten
    expect(cleanText("abc        d", 4)).toBe("abc");
    expect(cleanText(42, 10)).toBe("");
    expect(cleanText("<b>fett</b>", 50)).toBe("<b>fett</b>"); // bleibt Text, die Oberfläche setzt textContent
  });

  it("Kennungen und Anzeige", () => {
    expect(newPeerId()).toMatch(/^[0-9a-z]{12}$/);
    expect(newPeerId()).not.toBe(newPeerId());
    expect(chatWho("DJ David", "DJ Booth", "LJL Link")).toBe("DJ David (DJ Booth) · LJL Link");
    expect(chatWho("", "", "LJ Link")).toBe("LJ Link");
    expect(chatWho("Phil", "", "")).toBe("Phil");
  });

  it("Beitreten: here und history?, Verlassen: bye; aus = nichts lesen", () => {
    const { chat, sent } = room();
    expect(chat.receive(msg({}), 0)).toBe(false);
    chat.setProfile("Phil", "FOH", 0);
    chat.setOn(true, 0);
    expect(sent.map(s => s.json.t)).toEqual(["here", "history?"]);
    expect(sent[0]!.json).toMatchObject({ suite: "chat", v: 1, peer: "vjlink0000a1", nick: "Phil", where: "FOH", app: "VJ-Link" });
    chat.setOn(false, 10);
    expect(sent.at(-1)!.json.t).toBe("bye");
    expect(chat.receive(msg({}), 20)).toBe(false);
    expect(chat.state().messages).toHaveLength(0);
  });

  it("sendet jede Nachricht zweimal, ohne Namen oder leer gar nicht", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    expect(chat.post("Hallo")).toBe(false); // noch kein Name
    chat.setProfile("VJ Anna", "Bühne", 0);
    expect(chat.post("   ")).toBe(false);
    sent.length = 0;
    expect(chat.post("Hallo\nzusammen")).toBe(true);
    expect(sent.map(s => s.delay)).toEqual([0, 300]);
    expect(sent[0]!.json.id).toMatch(/^vjlink0000a1-1[0-9a-z]{8}$/);
    expect(sent[1]!.json.id).toBe(sent[0]!.json.id);
    expect(sent[0]!.json).toMatchObject({ t: "msg", nick: "VJ Anna", where: "Bühne", app: "VJ-Link", text: "Hallo zusammen" });
    expect(sent[0]!.json.urgent).toBeUndefined();
    const st = chat.state();
    expect(st.messages[0]).toMatchObject({ self: true, text: "Hallo zusammen", urgent: false, n: 1 });
  });

  it("zeigt jede id nur einmal und ignoriert eigene Datagramme", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    expect(chat.receive(msg({}), 1)).toBe(true);
    expect(chat.receive(msg({}), 301)).toBe(false); // zweite Kopie
    expect(chat.receive(msg({ peer: "vjlink0000a1", id: "vjlink0000a1-9" }), 302)).toBe(false);
    expect(chat.state().messages).toHaveLength(1);
    expect(chat.state().peers).toEqual([{ nick: "Phil", where: "FOH", app: "LJ Link" }]);
  });

  it("verwirft Kaputtes und Fremdes", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    for (const bad of ["nicht json", "[]", "null", JSON.stringify({ suite: "x", v: 1, t: "here", peer: "abcdefgh1" }),
      msg({ v: 2 }), msg({ peer: "kurz" }), msg({ peer: "GROSS12345" }), msg({ text: "\n\t " }), msg({ id: "" }),
      msg({ id: "x".repeat(65) }), "x".repeat(9000)]) {
      chat.receive(bad, 1);
    }
    expect(chat.state().messages).toHaveLength(0);
  });

  it("bereinigt fremde Felder und begrenzt Längen", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.receive(msg({ nick: "N".repeat(40), where: "W‮x", text: "T".repeat(600), at: "gestern" }), 1);
    const m = chat.state().messages[0]!;
    expect(m.nick).toHaveLength(24);
    expect(m.where).toBe("Wx");
    expect(m.text).toHaveLength(500);
    expect(m.at).toBe(1_800_000_000_000); // ohne Zahl: eigene Uhr
  });

  it("höchstens 10 Nachrichten je Teilnehmer in 10 s", () => {
    const { chat } = room();
    chat.setOn(true, -60_000);
    for (let i = 1; i <= BURST + 5; i++) chat.receive(msg({ id: `ljlink0000b2-${i}` }), 1000 + i);
    expect(chat.state().messages).toHaveLength(BURST);
    chat.receive(msg({ id: "ljlink0000b2-99" }), 1000 + 10_100);
    expect(chat.state().messages).toHaveLength(BURST + 1);
  });

  it("Verlauf: beantwortet history? mit den letzten 20 als old, zählt erbetene nicht zur Grenze", () => {
    const a = room();
    a.chat.setOn(true, 0);
    a.chat.setProfile("Anna", "", 0);
    for (let i = 0; i < 25; i++) a.chat.post(`n${i}`);
    a.sent.length = 0;
    a.chat.receive(JSON.stringify({ suite: "chat", v: 1, t: "history?", peer: "newcomer0001" }), 10);
    expect(a.sent).toHaveLength(20);
    expect(a.sent.map(s => s.delay)).toEqual(Array.from({ length: 20 }, (_, i) => 20 * (i + 1)));
    expect(a.sent.every(s => s.json.old === true && s.json.peer === "vjlink0000a1")).toBe(true);
    expect(a.sent[0]!.json.text).toBe("n5");

    // Ein Neuer nimmt in den ersten 5 s alle 20 an, danach gilt wieder die Grenze.
    const b = room("newcomer0001");
    b.chat.setOn(true, 0);
    for (const s of a.sent) b.chat.receive(JSON.stringify(s.json), 100);
    expect(b.chat.state().messages).toHaveLength(20);
    for (let i = 0; i < 15; i++) b.chat.receive(msg({ id: `late000000xx-${i}`, peer: "late000000xx", old: true }), 6000);
    expect(b.chat.state().messages).toHaveLength(30);
  });

  it("NOTFALL: urgent kommt an, aus dem Verlauf nie als Popup", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    chat.setProfile("VJ", "", 0);
    sent.length = 0;
    chat.post("Feuer!", true);
    expect(sent[0]!.json.urgent).toBe(true);
    chat.receive(msg({ id: "ljlink0000b2-1", urgent: true }), 1);
    chat.receive(msg({ id: "ljlink0000b2-2", urgent: true, old: true }), 2);
    const [self, live, old] = chat.state().messages;
    expect(self!.urgent).toBe(true);
    expect(live!.urgent).toBe(true);
    expect(old!.urgent).toBe(false);
    // In der Verlaufs-Antwort bleibt urgent erhalten, ist aber old: Empfänger zeigen kein Popup.
    sent.length = 0;
    chat.receive(JSON.stringify({ suite: "chat", v: 1, t: "history?", peer: "newcomer0001" }), 3);
    expect(sent.find(s => s.json.text === "Feuer!")!.json).toMatchObject({ urgent: true, old: true });
  });

  it("Teilnehmer: Anwesenheit alle 5 s, gegangen nach 15 s oder bye, höchstens 50", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    sent.length = 0;
    chat.tick(4000); expect(sent).toHaveLength(0);
    chat.tick(5000); expect(sent.map(s => s.json.t)).toEqual(["here"]);
    const here = (peer: string, nick = "x") => JSON.stringify({ suite: "chat", v: 1, t: "here", peer, nick, where: "", app: "LJL Link" });
    chat.receive(here("peer00000001", "Mika"), 5000);
    chat.receive(JSON.stringify({ suite: "chat", v: 1, t: "history?", peer: "peer00000002" }), 5000);
    expect(chat.state().peers).toEqual([{ nick: "Mika", where: "", app: "LJL Link" }]); // nur history?: nicht gelistet
    expect(chat.tick(5000 + GONE_AFTER_MS + 1)).toBe(true);
    expect(chat.state().peers).toHaveLength(0);
    chat.receive(here("peer00000003"), 30_000);
    chat.receive(JSON.stringify({ suite: "chat", v: 1, t: "bye", peer: "peer00000003" }), 30_001);
    expect(chat.state().peers).toHaveLength(0);
    for (let i = 0; i < MAX_PEERS + 10; i++) chat.receive(here(`peer${String(i).padStart(8, "0")}`), 31_000);
    expect(chat.state().peers).toHaveLength(MAX_PEERS);
  });

  it("hält höchstens 200 Nachrichten; state(since) liefert nur Neues; Diagnose ohne Text", () => {
    const { chat } = room();
    chat.setOn(true, -100_000_000);
    chat.setProfile("Phil", "", 0);
    for (let i = 0; i < MAX_KEPT + 30; i++) chat.post(`geheim ${i}`);
    const st = chat.state();
    expect(st.messages).toHaveLength(MAX_KEPT);
    expect(st.last).toBe(MAX_KEPT + 30);
    expect(chat.state(st.last - 3).messages.map(m => m.n)).toEqual([st.last - 2, st.last - 1, st.last]);
    const d = chat.diagnostics();
    expect(d).toBe("Suite chat: on, 0 other programs, 200 messages in memory");
    expect(d).not.toMatch(/geheim|Phil/);
  });

  it("history?: mit leerer Liste keine Antwort, sonst höchstens eine in 10 s, egal von wem", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    const ask = (peer: string) => JSON.stringify({ suite: "chat", v: 1, t: "history?", peer });
    sent.length = 0;
    chat.receive(ask("newcomer0001"), 100);
    expect(sent).toHaveLength(0); // nichts im Speicher
    chat.setProfile("Anna", "", 0);
    chat.post("eins"); chat.post("zwei");
    sent.length = 0;
    chat.receive(ask("newcomer0001"), 200);
    expect(sent).toHaveLength(2);
    for (let i = 0; i < 1000; i++) chat.receive(ask(`flood${String(i).padStart(7, "0")}`), 300 + i);
    expect(sent).toHaveLength(2); // gesperrt, still verworfen
    // (die Flut hat die 50 Plätze belegt: ein schon bekannter Teilnehmer fragt erneut)
    chat.receive(ask("newcomer0001"), 200 + HISTORY_LOCK_MS - 1);
    expect(sent).toHaveLength(2);
    chat.receive(ask("newcomer0001"), 200 + HISTORY_LOCK_MS);
    expect(sent).toHaveLength(4);
  });

  it("at nur zwischen 1970 und 2100, sonst eigene Uhr", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    const bad = [1e300, -5, MAX_AT + 1, Number.MAX_SAFE_INTEGER * 4, "1794685866935", null];
    // (nur der Verlauf nimmt das mitgeschickte at; live gilt ohnehin die Ankunftszeit)
    bad.forEach((at, i) => chat.receive(msg({ id: `ljlink0000b2-${i}`, at, old: true }), i));
    chat.receive(msg({ id: "ljlink0000b2-99", at: MAX_AT, old: true }), 50);
    const ats = chat.state().messages.map(m => m.at);
    expect(ats.slice(0, bad.length).every(a => a === 1_800_000_000_000)).toBe(true);
    expect(ats.at(-1)).toBe(MAX_AT);
    // Verlaufsantwort mit diesen Werten bleibt gültiges JSON mit endlichen Zahlen
    chat.setProfile("A", "", 0);
    chat.post("x");
  });

  it("höchstens 3 NOTFÄLLE je Teilnehmer in 60 s, weitere als normale Nachricht", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    for (let i = 1; i <= URGENT_MAX + 2; i++) chat.receive(msg({ id: `ljlink0000b2-${i}`, urgent: true }), i * 1000);
    expect(chat.state().messages.map(m => m.urgent)).toEqual([true, true, true, false, false]);
    chat.receive(msg({ id: "ljlink0000b2-50", urgent: true }), 1000 + 60_001);
    expect(chat.state().messages.at(-1)!.urgent).toBe(true);
    // ein anderer Teilnehmer hat sein eigenes Kontingent
    chat.receive(msg({ id: "other00000c3-1", peer: "other00000c3", urgent: true }), 6000);
    expect(chat.state().messages.find(m => m.text && m.n === 7)!.urgent).toBe(true);
  });

  it("Verlaufsantworten holen Gegangene nicht zurück in den Raum", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.receive(msg({ id: "gone00000001-1", peer: "gone00000001", old: true }), 100);
    expect(chat.state().messages).toHaveLength(1);
    expect(chat.state().peers).toHaveLength(0);
  });

  it("verwirft ids, die nicht mit peer + \"-\" beginnen", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.receive(msg({ id: "victim000001-1" }), 1);        // fremde id vorweggenommen
    chat.receive(msg({ id: "ljlink0000b2x-1" }), 2);       // Präfix ohne Trennstrich
    chat.receive(msg({ id: "ljlink0000b2-7" }), 3);        // gültig
    expect(chat.state().messages).toHaveLength(1);
    chat.receive(msg({ id: "victim000001-1", peer: "victim000001" }), 4); // der echte Absender kommt noch durch
    expect(chat.state().messages).toHaveLength(2);
  });

  it("markiert Verlaufsnachrichten als old (zählen nicht als ungelesen)", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.receive(msg({ id: "ljlink0000b2-1" }), 1);
    chat.receive(msg({ id: "ljlink0000b2-2", old: true }), 2);
    expect(chat.state().messages.map(m => m.old)).toEqual([false, true]);
  });

  it("fragt 12 s nach dem Beitreten genau einmal erneut nach dem Verlauf, wenn keiner kam", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    const asks = () => sent.filter(x => x.json.t === "history?").length;
    expect(asks()).toBe(1);
    chat.tick(HISTORY_RETRY_MS - 1); expect(asks()).toBe(1);
    chat.tick(HISTORY_RETRY_MS); expect(asks()).toBe(2);
    // die erneut erbetene Antwort zählt nicht zur Grenze
    for (let i = 0; i < 15; i++) chat.receive(msg({ id: `ljlink0000b2-${i}`, old: true }), HISTORY_RETRY_MS + 100);
    expect(chat.state().messages).toHaveLength(15);
    chat.tick(HISTORY_RETRY_MS * 3); expect(asks()).toBe(2); // nur einmal
    // kam schon Verlauf, wird nicht erneut gefragt
    const b = room();
    b.chat.setOn(true, 0);
    b.chat.receive(msg({ old: true }), 500);
    b.chat.tick(HISTORY_RETRY_MS * 2);
    expect(b.sent.filter(x => x.json.t === "history?")).toHaveLength(1);
  });

  it("U+2028/2029 werden Leerzeichen, U+061C fällt weg", () => {
    expect(cleanText("a\u2028b\u2029\u2029c", 50)).toBe("a b c");
    expect(cleanText("x\u061Cy", 50)).toBe("xy");
  });

  it("Ausschalten löscht alle Nachrichten; nach dem Einschalten kommt der Verlauf wieder", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.setProfile("A", "", 0);
    chat.post("eigene");
    chat.receive(msg({}), 1);
    expect(chat.state().messages).toHaveLength(2);
    chat.setOn(false, 2);
    expect(chat.state().messages).toHaveLength(0);
    chat.setOn(true, 3);
    chat.receive(msg({ old: true }), 4); // dieselbe id wie vorher: wird wieder angenommen
    expect(chat.state().messages.map(m => m.text)).toEqual(["Drop in 30 s!"]);
    expect(chat.diagnostics()).toContain("1 messages in memory");
  });

  it("eigene ids: peer-Zähler plus 8 Zufallszeichen; Verlauf leitet peer aus dem Teil vor dem ersten - ab", () => {
    const { chat, sent } = room();
    chat.setOn(true, 0);
    chat.setProfile("A", "", 0);
    sent.length = 0;
    chat.post("x"); chat.post("y");
    const ids = sent.filter(x => x.json.t === "msg").map(x => x.json.id as string);
    expect(ids[0]).toMatch(/^vjlink0000a1-1[0-9a-z]{8}$/);
    expect(ids[2]).toMatch(/^vjlink0000a1-2[0-9a-z]{8}$/);
    expect(ids[0]!.length).toBeLessThanOrEqual(64);
    // fremde Nachricht mit Zufallsteil, im Verlauf weitergegeben: peer = Teil vor dem ersten "-"
    chat.receive(msg({ id: "ljlink0000b2-7ab12cd34" }), 1);
    sent.length = 0;
    chat.receive(JSON.stringify({ suite: "chat", v: 1, t: "history?", peer: "newcomer0001" }), 2);
    const fwd = sent.find(x => x.json.id === "ljlink0000b2-7ab12cd34")!.json;
    expect(fwd).toMatchObject({ peer: "ljlink0000b2", old: true });
  });

  it("Live-Nachrichten mit Ankunftszeit, Verlauf mit mitgeschicktem at", () => {
    const { chat, setClock } = room();
    chat.setOn(true, 0);
    setClock(1_900_000_000_000);
    chat.receive(msg({ id: "ljlink0000b2-1", at: 1_000_000_000_000 }), 1);  // Uhr des Absenders falsch
    chat.receive(msg({ id: "ljlink0000b2-2", at: 1_000_000_000_000, old: true }), 2);
    expect(chat.state().messages.map(m => m.at)).toEqual([1_900_000_000_000, 1_000_000_000_000]);
  });

  it("strenge Typen: urgent/old nur true, Texte nur Strings", () => {
    const { chat } = room();
    chat.setOn(true, 0);
    chat.receive(msg({ id: "ljlink0000b2-1", urgent: 1 }), 1);
    chat.receive(msg({ id: "ljlink0000b2-2", urgent: "true" }), 2);
    chat.receive(msg({ id: "ljlink0000b2-3", old: 1 }), 3);
    chat.receive(msg({ id: "ljlink0000b2-4", text: 42 }), 4);
    chat.receive(msg({ id: 5 }), 5);
    chat.receive(msg({ id: "ljlink0000b2-6", nick: ["x"] }), 6);
    const ms = chat.state().messages;
    expect(ms.map(m => [m.urgent, m.old])).toEqual([[false, false], [false, false], [false, false], [false, false]]);
    expect(ms[3]!.nick).toBe("");
  });

  it("Trim: Unicode-Leerzeichen an beiden Enden, innen bleibt alles", () => {
    expect(trimSpace("\u3000\u00A0 a  b\u2003 ")).toBe("a  b");
    expect(cleanText("\u00A0\u3000", 50)).toBe("");
    expect(cleanText("\uFEFF", 50)).toBe("\uFEFF"); // kein White_Space (wie Java strip())
    expect(cleanText("a    b", 50)).toBe("a    b");
  });

  it("gemeinsame Grenze für Verlauf von Fremden: 10 in 10 s außerhalb des eigenen Fensters, Duplikate zählen nicht", () => {
    const { chat } = room();
    chat.setOn(true, 0); // eigenes Verlaufs-Fenster bis 5 s
    const t = 20_000;
    for (let i = 0; i < 12; i++) chat.receive(msg({ id: `stranger${String(i).padStart(4, "0")}-1`, peer: `stranger${String(i).padStart(4, "0")}`, old: true }), t + i);
    expect(chat.state().messages).toHaveLength(10);
    expect(chat.state().peers).toHaveLength(0);
    // Duplikate einer angenommenen Nachricht zählen nicht zur Grenze (nach 10 s wieder frei)
    chat.receive(msg({ id: "stranger0000-1", peer: "stranger0000", old: true }), t + 10_100);
    chat.receive(msg({ id: "strangerxx01-1", peer: "strangerxx01", old: true }), t + 10_200);
    expect(chat.state().messages).toHaveLength(11);
  });

  it("höchstens 20 offene Popups: weitere werden normale Nachrichten; old und eigene nie", () => {
    const m = (n: number, o: Partial<{ urgent: boolean; self: boolean; old: boolean }> = {}) =>
      ({ n, nick: "x", where: "", app: "LJ Link", text: "t", at: n, urgent: true, self: false, old: false, ...o });
    const fresh = [m(1), m(2, { old: true }), m(3, { self: true }), m(4, { urgent: false }), m(5), m(6)];
    const r = admitAlerts(MAX_ALERTS - 1, fresh);
    expect(r.admit.map(x => x.n)).toEqual([1]);
    expect(r.downgrade.map(x => x.n)).toEqual([5, 6]);
    expect(admitAlerts(0, Array.from({ length: 25 }, (_, i) => m(i))).admit).toHaveLength(MAX_ALERTS);
  });

  it("Warteschlange: höchstens 64 wartende Datagramme, bye geht vorbei", () => {
    const g = new SendGate();
    let taken = 0;
    for (let i = 0; i < 100; i++) if (g.take()) taken++;
    expect(taken).toBe(MAX_PENDING);
    expect(g.take(true)).toBe(true);
    g.done();                     // 65 → 64 unterwegs
    expect(g.take()).toBe(false);
    g.done();                     // 63
    expect(g.take()).toBe(true);
    g.reset(); g.done();
    expect(g.pending).toBe(0);
  });
});
