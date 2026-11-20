// Projekt und Grafiken im Benutzerverzeichnis der App (z. B. ~/Library/Application Support/VJ-Link).
import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { MEDIA_MAX_BYTES, isValidMediaId, type MediaPayload } from "../core/media";

const MIME_EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
};
const EXT_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));
const PROJECT_MAX_BYTES = 64 * 1024 * 1024;

interface IndexEntry { id: string; name: string; file: string }

export class Storage {
  private mediaDir: string;
  private videoDir: string;
  private videos = new Map<string, IndexEntry>();
  /** Eigene 3D-Modelle als fertige Punktwolken („VJPC“), für das Partikel-Objekt. */
  private modelDir: string;
  private models = new Map<string, IndexEntry>();
  private projectFile: string;
  private index = new Map<string, IndexEntry>();

  constructor(root: string) {
    this.mediaDir = path.join(root, "media");
    this.videoDir = path.join(root, "videos");
    this.modelDir = path.join(root, "models");
    this.projectFile = path.join(root, "project.json");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.mediaDir, { recursive: true });
    await fs.mkdir(this.videoDir, { recursive: true });
    await fs.mkdir(this.modelDir, { recursive: true });
    try {
      const list = JSON.parse(await fs.readFile(path.join(this.modelDir, "index.json"), "utf8")) as IndexEntry[];
      for (const e of list) if (isValidMediaId(e.id) && e.file === `${e.id}.vjpc`) this.models.set(e.id, e);
    } catch { /* noch keine Modelle */ }
    try {
      const list = JSON.parse(await fs.readFile(path.join(this.videoDir, "index.json"), "utf8")) as IndexEntry[];
      for (const e of list) if (isValidMediaId(e.id) && /^[a-z0-9]+\.(mp4|m4v|mov|webm)$/.test(e.file)) this.videos.set(e.id, e);
    } catch { /* noch keine Videos */ }
    try {
      const list = JSON.parse(await fs.readFile(path.join(this.mediaDir, "index.json"), "utf8")) as IndexEntry[];
      for (const e of list) if (isValidMediaId(e.id) && /^[a-z0-9]+\.[a-z]+$/.test(e.file)) this.index.set(e.id, e);
    } catch { /* noch keine Grafiken */ }
  }

  /** Laufende Schreibvorgänge je Datei: Schreiben nacheinander, nie zwei gleichzeitig auf dieselbe Datei. */
  private writing = new Map<string, Promise<void>>();
  private tmpNo = 0;
  private writeAtomic(file: string, data: string | Buffer): Promise<void> {
    const run = async () => {
      const tmp = `${file}.${process.pid}.${++this.tmpNo}.tmp`;
      try { await fs.writeFile(tmp, data); await fs.rename(tmp, file); }
      catch (e) { await fs.rm(tmp, { force: true }).catch(() => undefined); throw e; }
    };
    const next = (this.writing.get(file) ?? Promise.resolve()).catch(() => undefined).then(run);
    this.writing.set(file, next);
    void next.finally(() => { if (this.writing.get(file) === next) this.writing.delete(file); }).catch(() => undefined);
    return next;
  }
  private saveIndex(): Promise<void> {
    return this.writeAtomic(path.join(this.mediaDir, "index.json"), JSON.stringify([...this.index.values()]));
  }

  /** Prüft Kennung, Typ und Größe. Gibt die gespeicherte Grafik zurück oder null. */
  async addMedia(p: unknown): Promise<MediaPayload | null> {
    if (typeof p !== "object" || p === null) return null;
    const { id, name, dataUrl } = p as Partial<MediaPayload>;
    if (!isValidMediaId(id) || typeof name !== "string" || typeof dataUrl !== "string") return null;
    const m = /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return null;
    const buf = Buffer.from(m[2]!, "base64");
    if (buf.length === 0 || buf.length > MEDIA_MAX_BYTES) return null;
    const file = `${id}.${MIME_EXT[m[1]!]}`;
    await fs.writeFile(path.join(this.mediaDir, file), buf);
    this.index.set(id, { id, name: name.slice(0, 80), file });
    await this.saveIndex();
    return { id, name: name.slice(0, 80), dataUrl };
  }

  async removeMedia(id: unknown): Promise<boolean> {
    if (!isValidMediaId(id)) return false;
    const e = this.index.get(id);
    if (!e) return false;
    this.index.delete(id);
    await fs.rm(path.join(this.mediaDir, e.file), { force: true });
    await this.saveIndex();
    return true;
  }

  // ---- Videos: werden in den Ordner „videos“ kopiert und über vjmedia://video/<id> gestreamt ----

  /** Video vom Rechner übernehmen (Kopie). Gibt ID und Endung oder eine Fehlermeldung zurück. */
  async addVideo(src: unknown, name: unknown): Promise<{ id: string; ext: string; name: string } | string> {
    if (typeof src !== "string" || !path.isAbsolute(src)) return "Datei nicht gefunden.";
    const ext = path.extname(src).slice(1).toLowerCase();
    if (!["mp4", "m4v", "mov", "webm"].includes(ext)) return "Nur MP4, MOV, M4V oder WebM.";
    let st;
    try { st = await fs.stat(src); } catch { return "Datei nicht gefunden."; }
    if (!st.isFile() || st.size === 0) return "Datei ist leer oder kein Video.";
    const id = randomBytes(8).toString("hex");
    const file = `${id}.${ext}`;
    await fs.copyFile(src, path.join(this.videoDir, file));
    const nm = (typeof name === "string" ? name : path.basename(src)).slice(0, 80);
    this.videos.set(id, { id, name: nm, file });
    await this.writeAtomic(path.join(this.videoDir, "index.json"), JSON.stringify([...this.videos.values()]));
    return { id, ext, name: nm };
  }

  async removeVideo(id: unknown): Promise<boolean> {
    if (!isValidMediaId(id)) return false;
    const e = this.videos.get(id);
    if (!e) return false;
    this.videos.delete(id);
    await fs.rm(path.join(this.videoDir, e.file), { force: true });
    await this.writeAtomic(path.join(this.videoDir, "index.json"), JSON.stringify([...this.videos.values()]));
    return true;
  }

  hasVideo(id: string): boolean { return this.videos.has(id); }

  // ---- 3D-Modelle: fertige Punktwolken im Ordner „models“, über vjmedia://model/<id> geladen ----

  private saveModels(): Promise<void> {
    return this.writeAtomic(path.join(this.modelDir, "index.json"), JSON.stringify([...this.models.values()]));
  }

  /** Umgewandeltes Modell (Punktwolke) ablegen. */
  async addModel(data: Uint8Array, name: string): Promise<{ id: string; name: string }> {
    const id = randomBytes(8).toString("hex");
    const file = `${id}.vjpc`;
    await this.writeAtomic(path.join(this.modelDir, file), Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    const nm = name.slice(0, 80);
    this.models.set(id, { id, name: nm, file });
    await this.saveModels();
    return { id, name: nm };
  }

  async removeModel(id: unknown): Promise<boolean> {
    if (!isValidMediaId(id)) return false;
    const e = this.models.get(id);
    if (!e) return false;
    this.models.delete(id);
    await fs.rm(path.join(this.modelDir, e.file), { force: true });
    await this.saveModels();
    return true;
  }

  hasModel(id: string): boolean { return this.models.has(id); }

  /** Datei eines Modells in der Bibliothek, oder null. */
  modelFile(id: string): { path: string; file: string } | null {
    const e = this.models.get(id);
    return e ? { path: path.join(this.modelDir, e.file), file: e.file } : null;
  }

  /** Modell aus einer Projektdatei übernehmen (gleiche Kennung). Nur echte Punktwolken (Kopf „VJPC“). */
  async importModel(src: string, id: string, name: string): Promise<boolean> {
    if (!isValidMediaId(id) || !path.isAbsolute(src) || !src.endsWith(".vjpc")) return false;
    try {
      const st = await fs.lstat(src);
      if (!st.isFile() || st.size < 16 || st.size > 64 * 1024 * 1024) return false;
      const fh = await fs.open(src, "r");
      const head = Buffer.alloc(4);
      try { await fh.read(head, 0, 4, 0); } finally { await fh.close(); }
      if (head.toString("latin1") !== "VJPC") return false;
      await fs.copyFile(src, path.join(this.modelDir, `${id}.vjpc`));
    } catch { return false; }
    this.models.set(id, { id, name: name.slice(0, 80), file: `${id}.vjpc` });
    await this.saveModels();
    return true;
  }

  /** Antwort für vjmedia://model/<id>. */
  async serveModel(req: Request): Promise<Response> {
    const u = new URL(req.url);
    const id = u.pathname.replace(/^\//, "");
    const e = isValidMediaId(id) ? this.models.get(id) : undefined;
    const cors = { "Access-Control-Allow-Origin": "*" };
    if (!e) return new Response("nicht gefunden", { status: 404, headers: cors });
    try {
      const buf = await fs.readFile(path.join(this.modelDir, e.file));
      return new Response(new Uint8Array(buf), { status: 200, headers: { ...cors, "Content-Type": "application/octet-stream", "Content-Length": String(buf.length) } });
    } catch { return new Response("nicht gefunden", { status: 404, headers: cors }); }
  }

  /** Antwort für vjmedia://video/<id>: mit Range-Unterstützung (Spulen) und CORS (für WebGL). */
  async serveVideo(req: Request): Promise<Response> {
    const u = new URL(req.url);
    const id = u.pathname.replace(/^\//, "").split(".")[0] ?? "";
    const e = isValidMediaId(id) ? this.videos.get(id) : undefined;
    const cors = { "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" };
    if (u.hostname !== "video" || !e) return new Response("nicht gefunden", { status: 404, headers: cors });
    const file = path.join(this.videoDir, e.file);
    let size: number;
    try { size = (await fs.stat(file)).size; } catch { return new Response("nicht gefunden", { status: 404, headers: cors }); }
    const type = e.file.endsWith(".webm") ? "video/webm" : e.file.endsWith(".mov") ? "video/quicktime" : "video/mp4";
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
    if (!m) {
      return new Response(Readable.toWeb(createReadStream(file)) as unknown as ReadableStream, { status: 200, headers: { ...cors, "Content-Type": type, "Content-Length": String(size) } });
    }
    let start = m[1] ? Number(m[1]) : 0, end = m[2] ? Number(m[2]) : size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response("", { status: 416, headers: { ...cors, "Content-Range": `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as unknown as ReadableStream, {
      status: 206,
      headers: { ...cors, "Content-Type": type, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }

  async allMedia(only?: ReadonlySet<string>): Promise<MediaPayload[]> {
    const out: MediaPayload[] = [];
    for (const e of this.index.values()) {
      if (only && !only.has(e.id)) continue;
      try {
        const buf = await fs.readFile(path.join(this.mediaDir, e.file));
        const mime = EXT_MIME[e.file.split(".").pop()!] ?? "image/png";
        out.push({ id: e.id, name: e.name, dataUrl: `data:${mime};base64,${buf.toString("base64")}` });
      } catch { /* Datei fehlt: überspringen */ }
    }
    return out;
  }

  /** Nur diese Grafiken (für die Projektdatei). */
  async mediaPayloads(ids: readonly string[]): Promise<MediaPayload[]> {
    return this.allMedia(new Set(ids));
  }

  /** Datei eines Videos in der Bibliothek, oder null. */
  videoFile(id: string): { path: string; file: string } | null {
    const e = this.videos.get(id);
    return e ? { path: path.join(this.videoDir, e.file), file: e.file } : null;
  }

  /** Video aus einer Projektdatei übernehmen, mit seiner bisherigen Kennung (Clips verweisen darauf). */
  async importVideo(src: string, id: string, name: string): Promise<boolean> {
    if (!isValidMediaId(id) || !path.isAbsolute(src)) return false;
    const ext = path.extname(src).slice(1).toLowerCase();
    if (!["mp4", "m4v", "mov", "webm"].includes(ext)) return false;
    // Keine symbolischen Links (sonst könnte ein präparierter Projektordner beliebige Dateien einschleusen)
    // und nur echte Videodateien: MP4/MOV beginnen mit „ftyp“ an Stelle 4, WebM mit dem EBML-Kopf.
    try {
      if (!(await fs.lstat(src)).isFile()) return false;
      const fh = await fs.open(src, "r");
      const head = Buffer.alloc(12);
      try { await fh.read(head, 0, 12, 0); } finally { await fh.close(); }
      const isMp4 = head.toString("latin1", 4, 8) === "ftyp" || ["moov", "wide", "mdat", "free", "skip", "pnot"].includes(head.toString("latin1", 4, 8));
      const isWebm = head.readUInt32BE(0) === 0x1a45dfa3;
      if (!(ext === "webm" ? isWebm : isMp4)) return false;
    } catch { return false; }
    const file = `${id}.${ext}`;
    await fs.copyFile(src, path.join(this.videoDir, file));
    this.videos.set(id, { id, name: name.slice(0, 80), file });
    await this.writeAtomic(path.join(this.videoDir, "index.json"), JSON.stringify([...this.videos.values()]));
    return true;
  }

  /** Arbeitsstand verwerfen (neues Projekt): beim nächsten Laden startet die App leer. */
  async clearProject(): Promise<void> { await fs.rm(this.projectFile, { force: true }); }

  /** Arbeitsstand sichern. false = zu groß oder nicht schreibbar (der Aufrufer sagt es dem Nutzer). */
  async saveProject(json: unknown): Promise<boolean> {
    if (typeof json !== "string" || json.length > PROJECT_MAX_BYTES) return false;
    try { await this.writeAtomic(this.projectFile, json); return true; } catch { return false; }
  }

  async loadProject(): Promise<string | null> {
    try { return await fs.readFile(this.projectFile, "utf8"); } catch { return null; }
  }
}
