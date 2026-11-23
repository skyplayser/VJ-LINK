// Zeit-Clips zeichnen: weiße Schrift auf durchsichtigem 16:9-Bild (1920 × 1080). Die Ebene färbt sie (Farbquelle)
// und ihre Effekte wirken wie bei jedem Bild. Ziffern stehen in festen Zellen, damit die Zeit beim Zählen nicht wackelt.
import { DOT_FONT } from "../core/dotfont";
import { fontCss } from "../core/text";
import type { TimeSettings, TimeView } from "../core/timeclip";

export const TIME_W = 1920, TIME_H = 1080;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const isDigit = (ch: string) => ch >= "0" && ch <= "9";

/** Breite einer Zeile mit festen Ziffernzellen (Doppelpunkt und Rest nach eigener Breite). */
function cellWidths(c: Ctx, text: string): number[] {
  const dw = c.measureText("0").width;
  return [...text].map(ch => (isDigit(ch) ? dw : c.measureText(ch).width));
}
function drawCells(c: Ctx, text: string, cx: number, y: number): void {
  const ws = cellWidths(c, text), total = ws.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  c.textAlign = "center";
  [...text].forEach((ch, i) => { c.fillText(ch, x + ws[i]! / 2, y); x += ws[i]!; });
}

/** LED-Punktmatrix: alle Punkte schwach, leuchtende voll (wie eine Bühnenuhr). Gibt die Höhe zurück. */
function drawDots(c: Ctx, text: string, cx: number, cy: number, maxW: number, maxH: number): number {
  const glyphs = [...text].map(ch => DOT_FONT[ch] ?? DOT_FONT["-"]!);
  const cols = glyphs.reduce((n, g) => n + g[0]!.length + 1, 0) - 1;
  const pitch = Math.max(2, Math.min(maxW / cols, maxH / 7));
  const r = pitch * 0.4;
  let x = cx - (cols * pitch) / 2 + pitch / 2;
  const y0 = cy - (7 * pitch) / 2 + pitch / 2;
  for (const g of glyphs) {
    for (let row = 0; row < 7; row++) for (let col = 0; col < g[row]!.length; col++) {
      c.globalAlpha = g[row]![col] === "1" ? 1 : 0.07;
      c.beginPath(); c.arc(x + col * pitch, y0 + row * pitch, r, 0, Math.PI * 2); c.fill();
    }
    x += (g[0]!.length + 1) * pitch;
  }
  c.globalAlpha = 1;
  return 7 * pitch;
}

/** Farbe der Schrift aus der Farbquelle der Ebene: eine Farbe, Verlauf oder Regenbogen (CSS-Farben). */
export type TimeFill = { kind: "solid"; a: string } | { kind: "grad"; stops: string[] } | { kind: "rainbow" };

/** Ganzes Bild zeichnen: Zeile darüber, große Zeit (bzw. Text), Zeile darunter. */
export function drawTimeClip(c: Ctx, v: TimeView, s: TimeSettings, fill: TimeFill = { kind: "solid", a: "#ffffff" }): void {
  const W = TIME_W, H = TIME_H;
  c.clearRect(0, 0, W, H);
  if (fill.kind === "solid") c.fillStyle = fill.a;
  else {
    // Verlauf über die Breite der Zeit (ca. Größe), damit alle Farben in der Schrift vorkommen
    const g = c.createLinearGradient(W * (0.5 - s.size / 2), 0, W * (0.5 + s.size / 2), 0);
    const stops = fill.kind === "rainbow" ? ["#ff3b3b", "#ffb020", "#3ddc84", "#22c8f0", "#5b6cff", "#b45cff"] : fill.stops;
    stops.forEach((col, i) => g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, col));
    c.fillStyle = g;
  }
  c.textBaseline = "middle";
  const maxW = W * s.size, maxH = H * 0.5 * Math.min(1, s.size / 0.7 + 0.15);
  const led = s.style === "led" && v.digits;
  const family = s.style === "digital" ? fontCss("mono") : fontCss("black");
  let mainH: number;
  if (led) {
    mainH = drawDots(c, v.main, W / 2, H / 2, maxW, maxH);
  } else {
    // Größe so, dass die Zeile in maxW passt, höchstens maxH hoch
    c.font = `800 100px ${family}`;
    const w100 = v.digits ? cellWidths(c, v.main).reduce((a, b) => a + b, 0) : c.measureText(v.main).width;
    const fs = Math.max(10, Math.min(maxH / 0.75, (100 * maxW) / Math.max(1, w100)));
    c.font = `800 ${fs}px ${family}`;
    if (v.digits) drawCells(c, v.main, W / 2, H / 2);
    else { c.textAlign = "center"; c.fillText(v.main, W / 2, H / 2); }
    mainH = fs * 0.75;
  }
  // Zeilen darüber/darunter: beim Datum (lange Zeile) größer im Verhältnis
  const small = Math.max(28, mainH * (v.digits ? 0.3 : 0.6));
  c.textAlign = "center";
  if (v.label) {
    c.font = `700 ${small}px ${fontCss("system")}`;
    c.globalAlpha = 0.85; c.fillText(v.label, W / 2, H / 2 - mainH / 2 - small * 0.95, W * 0.9); c.globalAlpha = 1;
  }
  if (v.sub) {
    c.font = `700 ${small}px ${fontCss("system")}`;
    c.fillText(v.sub, W / 2, H / 2 + mainH / 2 + small * 0.95, W * 0.9);
  }
}

/** Countdown: in den letzten 10 Sekunden pulsiert die Schrift (hell auf jeder Sekunde, dann schwächer). */
export function timePulse(v: TimeView, s: TimeSettings): number {
  if (!s.pulse || !(v.left > 0 && v.left <= 10)) return 1;
  const f = v.left - Math.floor(v.left); // 1 → 0 innerhalb der Sekunde
  return 0.45 + 0.55 * f;
}
