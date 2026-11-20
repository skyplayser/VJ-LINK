import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { remoteCommand, type RemoteCommand, type RemoteEffect, type RemoteInfo, type RemoteState } from "../core/remote";

const ASSETS = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/remote.css", ["remote.css", "text/css; charset=utf-8"]],
  ["/remote.js", ["remote.js", "text/javascript; charset=utf-8"]],
]);
const isPrivate = (ip: string): boolean => /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);

async function jsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 1024) { req.destroy(); return null; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}

export class PhoneRemote {
  private server: Server | null = null;
  private address?: string;
  private port?: number;
  private code?: string;
  private token?: string;
  private pairingReset = 0;
  private pairingCount = 0;
  private requestWindow = 0;
  private requestCount = 0;
  private state: RemoteState | null = null;
  private pending = false;
  private attempt = 0;
  private holds = new Map<RemoteEffect, NodeJS.Timeout>();
  private sequence = new Map<RemoteEffect, number>();
  private thumbnails = new Map<string, Buffer>();
  private requested = new Map<string, number>();

  constructor(private webRoot: string, private dispatch: (command: RemoteCommand) => void, private requestThumbnail?: (clip: string) => void) {}

  info(): RemoteInfo {
    const addresses = [...new Set(Object.values(networkInterfaces()).flatMap(list =>
      (list ?? []).filter(i => i.family === "IPv4" && !i.internal && isPrivate(i.address)).map(i => i.address)))];
    return {
      addresses: [...addresses, "127.0.0.1"],
      ...(this.address && this.port ? { address: this.address, url: `http://${this.address}:${this.port}`, code: this.code } : {}),
    };
  }

  setState(state: RemoteState): void { if (this.server) this.state = state; }
  clearState(): void {
    this.state = null;
    this.thumbnails.clear();
    this.requested.clear();
    this.releaseAll();
  }

  setThumbnail(clip: string, data: string): void {
    if (!this.requested.has(clip) || data.length > 48_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)) return;
    const image = Buffer.from(data.slice("data:image/jpeg;base64,".length), "base64");
    this.requested.delete(clip);
    if (this.thumbnails.size >= 192) this.thumbnails.delete(this.thumbnails.keys().next().value!);
    this.thumbnails.set(clip, image);
  }

  async start(address: string): Promise<RemoteInfo> {
    if (this.pending || !this.info().addresses.includes(address)) return this.info();
    this.pending = true;
    this.stop();
    const attempt = this.attempt;
    const server = createServer({ requestTimeout: 5000, headersTimeout: 5000, maxHeaderSize: 8192 }, (req, res) => {
      void this.handle(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
    });
    server.maxConnections = 24;
    server.keepAliveTimeout = 2000;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, address, () => { server.off("error", reject); resolve(); });
      });
      if (attempt !== this.attempt) { server.close(); return this.info(); }
      this.server = server;
      this.address = address;
      this.port = (server.address() as { port: number }).port;
      this.code = String(randomInt(0, 100_000_000)).padStart(8, "0");
      this.pairingReset = 0;
      this.requestWindow = 0;
      server.on("error", () => this.stop());
      return this.info();
    } catch (error) {
      server.close();
      return { ...this.info(), error: (error as Error).message };
    } finally { this.pending = false; }
  }

  stop(): RemoteInfo {
    this.attempt++;
    this.releaseAll();
    this.sequence.clear();
    const server = this.server;
    this.server = null;
    this.address = this.code = this.token = undefined;
    this.port = undefined;
    this.state = null;
    this.thumbnails.clear();
    this.requested.clear();
    if (server) { server.close(); server.closeAllConnections(); }
    return this.info();
  }

  private releaseAll(): void {
    for (const [effect, timer] of this.holds) {
      clearTimeout(timer);
      this.dispatch({ kind: "hold", effect, active: false, seq: 0 });
    }
    this.holds.clear();
  }

  private command(command: RemoteCommand): void {
    if (command.kind !== "hold") { this.dispatch(command); return; }
    const { effect, seq } = command;
    if (seq <= (this.sequence.get(effect) ?? -1)) return;
    this.sequence.set(effect, seq);
    const previous = this.holds.get(effect);
    if (previous) clearTimeout(previous);
    if (command.active) {
      if (!previous) this.dispatch(command);
      this.holds.set(effect, setTimeout(() => {
        this.holds.delete(effect);
        this.dispatch({ ...command, active: false });
      }, 1200));
    } else {
      this.holds.delete(effect);
      if (previous) this.dispatch(command);
    }
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const reply = (status: number, body: unknown = null) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(body));
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src blob:; frame-ancestors 'none'; form-action 'none'; base-uri 'none'");
    const host = `${this.address}:${this.port}`;
    if (!this.server || req.headers.host !== host) { reply(403); return; }
    const file = req.method === "GET" && ASSETS.get(req.url ?? "");
    if (file) {
      const bytes = await fs.readFile(path.join(this.webRoot, file[0]!));
      res.writeHead(200, { "Content-Type": file[1]!, "Cache-Control": "no-cache" }); res.end(bytes);
      return;
    }
    if (req.method === "POST" && (req.headers.origin !== `http://${host}` || req.headers["content-type"] !== "application/json")) {
      reply(403); return;
    }
    if (req.method === "POST" && req.url === "/api/pair") {
      const now = Date.now();
      if (now >= this.pairingReset) { this.pairingReset = now + 30_000; this.pairingCount = 0; }
      if (++this.pairingCount > 8) { reply(429); return; }
      const body = await jsonBody(req) as { code?: unknown } | null;
      if (!this.server || typeof body?.code !== "string" || !/^\d{8}$/.test(body.code) || !this.code ||
        !timingSafeEqual(Buffer.from(body.code), Buffer.from(this.code))) { reply(401); return; }
      this.releaseAll();
      this.sequence.clear();
      this.token = randomBytes(32).toString("base64url");
      reply(200, { token: this.token }); return;
    }
    if (!this.token || req.headers.authorization !== `Bearer ${this.token}`) { reply(401); return; }
    if (req.method === "GET" && req.url === "/api/state") { reply(200, this.state); return; }
    if (req.method === "GET" && req.url?.startsWith("/api/thumb?")) {
      const clip = new URLSearchParams(req.url.slice("/api/thumb?".length)).get("clip");
      if (!clip || !this.state?.layers.some(layer => layer.clips.some(item => item.id === clip))) { reply(404); return; }
      const image = this.thumbnails.get(clip);
      if (image) {
        res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
        res.end(image); return;
      }
      const now = Date.now();
      for (const [key, at] of this.requested) if (now - at > 5000) this.requested.delete(key);
      if (!this.requested.has(clip) && this.requested.size < 16 && this.requestThumbnail) {
        this.requested.set(clip, now);
        this.requestThumbnail(clip);
      }
      reply(202); return;
    }
    if (req.method === "POST" && req.url === "/api/command") {
      const now = Date.now();
      if (now >= this.requestWindow) { this.requestWindow = now + 1000; this.requestCount = 0; }
      if (++this.requestCount > 30) { reply(429); return; }
      const command = remoteCommand(await jsonBody(req));
      if (!this.token || req.headers.authorization !== `Bearer ${this.token}`) { reply(401); return; }
      if (!command) { reply(400); return; }
      if (!this.state) { reply(503); return; }
      this.command(command);
      reply(200, { ok: true }); return;
    }
    reply(404);
  }
}
