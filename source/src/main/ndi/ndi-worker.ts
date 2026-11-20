// NDI®-Prozess (Electron utilityProcess): hält NDI mit seinen Netz-Threads und der Kompression vom Hauptprozess fern.
// Ein Fehler hier nimmt VJ-Link nicht mit. Der Hauptprozess schickt ein Bild erst, wenn das vorige gesendet ist
// („sent“), so staut sich nie etwas. Nach VD-Link electron/ndi/ndi-worker.ts (gleicher Autor, EPL-2.0).
// NDI® ist eine eingetragene Marke der Vizrt NDI AB.

import { loadNdi } from "./ndi-lib";

type Msg =
  | { t: "start"; file: string | null; name: string; fps: number }
  | { t: "frame"; data: Uint8Array; w: number; h: number }
  | { t: "stop" };

const parent = process.parentPort;
let loaded: ReturnType<typeof loadNdi> | null = null;
let initialized = false;
let inst: unknown = null;
let fps = 30;
let sent = 0;
/** Zeit im NDI-Aufruf (Komprimieren + Senden) je Sekunde, für die Statistik. */
let sendMs = 0;
let stats: NodeJS.Timeout | null = null;
/** Laufender Sendeaufruf: der Sender wird erst danach freigegeben. */
let pending: Promise<void> | null = null;
let sending = false;
let next: Extract<Msg, { t: "frame" }> | null = null;

const post = (m: unknown) => parent.postMessage(m);

async function stop(): Promise<void> {
  if (stats) { clearInterval(stats); stats = null; }
  const old = inst; inst = null;
  if (pending) await pending.catch(() => {});
  if (old && loaded?.ok) loaded.lib.destroy(old);
}

parent.on("message", async e => {
  const m = e.data as Msg;
  if (m.t === "start") {
    await stop();
    loaded ??= loadNdi(m.file);
    if (!loaded.ok) { post({ t: "started", ok: false, error: loaded.error }); return; }
    if (!initialized) initialized = loaded.lib.initialize();
    if (!initialized) { post({ t: "started", ok: false, error: "init" }); return; }
    inst = loaded.lib.create(m.name);
    if (!inst) { post({ t: "started", ok: false, error: "create" }); return; }
    fps = m.fps; sent = 0;
    const lib = loaded.lib;
    stats = setInterval(() => { if (inst) post({ t: "stat", fps: sent, conns: lib.connections(inst), ms: sent ? sendMs / sent : 0 }); sent = 0; sendMs = 0; }, 1000);
    post({ t: "started", ok: true, version: lib.version });
  } else if (m.t === "frame") {
    // Zwei Bilder dürfen unterwegs sein: Während NDI eines komprimiert, kommt das nächste schon an. Wartet schon eins,
    // ersetzt das neue es (das alte gilt als erledigt). So staut sich nie mehr als ein Bild.
    if (sending) { if (next) post({ t: "sent" }); next = m; return; }
    sending = true;
    let cur: Extract<Msg, { t: "frame" }> | null = m;
    while (cur) {
      if (inst && loaded?.ok) {
        const t0 = performance.now();
        pending = loaded.lib.send(inst, cur.data, cur.w, cur.h, fps);
        try { await pending; sent++; sendMs += performance.now() - t0; } catch (err) { post({ t: "error", error: String(err) }); }
        pending = null;
      }
      post({ t: "sent" });
      cur = next; next = null;
    }
    sending = false;
  } else if (m.t === "stop") {
    await stop();
    post({ t: "stopped" });
  }
});
