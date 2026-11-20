// Live-Vorschauen nur für Zellen im sichtbaren Bereich des Clip-Rasters.
import { Engine, type ThumbCell } from "../engine/engine";
import type { ControlContext } from "../core/control";

export class ThumbView {
  private canvas = document.createElement("canvas");
  private engine: Engine | null = null;
  private next = 0;
  private bounds = "";

  constructor(private grid: HTMLElement, private layout: () => { cells: HTMLButtonElement[][]; clips: string[][] }, private ctx: ControlContext,
    /** Ausgänge laufen: Vorschau sparsamer zeichnen, damit die Ausgänge Vorrang haben. */ private live: () => boolean = () => false) {
    this.canvas.className = "thumbs";
    this.canvas.setAttribute("aria-hidden", "true");
    grid.prepend(this.canvas);
    try { this.engine = new Engine(this.canvas, { transparent: true }); }
    catch { this.canvas.remove(); }
  }

  get gl(): Engine | null { return this.engine; }

  draw(nowMs: number): void {
    if (!this.engine || nowMs < this.next || !this.grid.offsetParent) return;
    this.next = nowMs + (this.live() ? 75 : 33);
    const { clientWidth: w, clientHeight: h, scrollLeft: x, scrollTop: y } = this.grid;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const key = `${w}|${h}|${dpr}`;
    const box = this.grid.getBoundingClientRect();
    const left = box.left + this.grid.clientLeft, top = box.top + this.grid.clientTop;
    const out: ThumbCell[] = [];
    const { cells, clips } = this.layout();
    cells.forEach((row, layer) => {
      const first = row[0]?.getBoundingClientRect();
      if (!first || first.bottom <= top || first.top >= top + h) return;
      for (const [col, cell] of row.entries()) {
        const clip = clips[layer]?.[col];
        if (!clip) continue;
        const r = cell.getBoundingClientRect();
        if (r.left >= left + w) break;
        if (r.right <= left) continue;
        out.push({
          layer, col, clip,
          x: Math.round((r.left - left) * dpr), y: Math.round((r.top - top) * dpr),
          w: Math.round(r.width * dpr), h: Math.round(r.height * dpr),
        });
      }
    });
    if (key !== this.bounds) {
      this.bounds = key;
      this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
      this.engine.resize(Math.round(w * dpr), Math.round(h * dpr));
    }
    const transform = `translate(${x}px, ${y}px)`;
    if (this.canvas.style.transform !== transform) this.canvas.style.transform = transform;
    this.engine.renderThumbs(this.ctx.show, this.ctx.tempo.beatAt(nowMs), nowMs, out);
  }
}
