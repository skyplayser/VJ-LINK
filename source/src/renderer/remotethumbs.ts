import { isCamClip } from "../core/camera";
import { defaultLayer, type ShowState } from "../core/show";
import { videoIdOf } from "../core/video";
import { Engine } from "../engine/engine";
import type { DecodedImage } from "./medialib";

const WIDTH = 192, HEIGHT = 108;

export class RemoteThumbs {
  private pending = new Map<string, number>();
  private engine?: Engine;
  private canvas?: HTMLCanvasElement;
  private after = 0;
  private busy = false;

  constructor(private image: (id: string) => DecodedImage | undefined, private poster: (id: string) => HTMLCanvasElement | undefined,
    private send: (id: string, data: string) => void) {}

  request(clip: string): void {
    if (this.pending.size < 16 && !this.pending.has(clip)) this.pending.set(clip, Date.now() + 4500);
  }

  tick(show: ShowState, now: number, live: boolean): void {
    if (this.busy || now < this.after || !this.pending.size) return;
    this.after = now + (live ? 350 : 160);
    const [clip, expiry] = this.pending.entries().next().value!;
    this.pending.delete(clip);
    if (expiry <= now) return;
    try {
      const frame = this.draw(clip, show, now);
      if (!frame) { this.pending.set(clip, expiry); return; }
      this.busy = true;
      frame.toBlob(blob => {
        if (!blob) { this.busy = false; return; }
        const reader = new FileReader();
        reader.onloadend = () => {
          this.busy = false;
          if (typeof reader.result === "string") this.send(clip, reader.result);
        };
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.73);
    } catch { this.busy = false; }
  }

  clear(): void { this.pending.clear(); }

  private draw(clip: string, show: ShowState, now: number): HTMLCanvasElement | null {
    const video = clip.startsWith("vid:") ? this.poster(videoIdOf(clip)) : undefined;
    const image = clip.startsWith("img:") ? this.image(clip.slice(4)) : undefined;
    const liveSource = isCamClip(clip) || clip === "now-playing" || clip === "dj-waveform";
    if (video || image || liveSource) {
      const c = this.canvas ??= document.createElement("canvas");
      c.width = WIDTH; c.height = HEIGHT;
      const g = c.getContext("2d")!;
      g.fillStyle = "#171a26"; g.fillRect(0, 0, WIDTH, HEIGHT);
      const src = image?.src ?? video;
      if (src) {
        const w = image?.w ?? video!.width, h = image?.h ?? video!.height;
        const fit = Math.min(WIDTH / w, HEIGHT / h);
        g.drawImage(src, (WIDTH - w * fit) / 2, (HEIGHT - h * fit) / 2, w * fit, h * fit);
      } else {
        g.fillStyle = "#c3b1ff";
        g.fillRect(69, 38, 42, 32);
        g.beginPath(); g.moveTo(110, 48); g.lineTo(127, 38); g.lineTo(127, 70); g.lineTo(110, 60); g.fill();
      }
      return c;
    }
    if (clip.startsWith("vid:") || clip.startsWith("img:")) return null;
    const engine = this.engine ??= new Engine(document.createElement("canvas"));
    if (!engine.clipReady(clip)) return null;
    engine.resize(WIDTH, HEIGHT);
    const layer = { ...defaultLayer(), clip, effects: [], colorSource: "original" as const };
    engine.renderThumbs({ ...show, layers: [layer] }, 1.35, now, [{ layer: 0, col: 0, clip, x: 0, y: 0, w: WIDTH, h: HEIGHT }]);
    return engine.canvas;
  }
}
