// LTC (Linear Timecode, SMPTE 12M) als Audiosignal: 80 Bit pro Bild, Biphase-Mark-Code.
// Eigene Umsetzung nach der Norm: Jedes Bit beginnt mit einem Pegelwechsel, eine 1 hat zusätzlich einen Wechsel
// in der Bitmitte. Am Ende jedes Bildes steht das Sync-Wort 0011 1111 1111 1101.
import { realFps, type Tc, type TcFps } from "./timecode";

const SYNC = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1];

/** Die 80 Bits eines LTC-Bildes (Bit 0 zuerst gesendet, Felder jeweils mit dem niedrigsten Bit zuerst). */
export function ltcBits(tc: Tc, fps: TcFps): Uint8Array {
  const b = new Uint8Array(80);
  const put = (at: number, n: number, v: number) => { for (let i = 0; i < n; i++) b[at + i] = (v >> i) & 1; };
  put(0, 4, tc.f % 10); put(8, 2, Math.floor(tc.f / 10));
  b[10] = fps === 29.97 ? 1 : 0; // Drop-Frame
  put(16, 4, tc.s % 10); put(24, 3, Math.floor(tc.s / 10));
  put(32, 4, tc.m % 10); put(40, 3, Math.floor(tc.m / 10));
  put(48, 4, tc.h % 10); put(56, 2, Math.floor(tc.h / 10));
  SYNC.forEach((v, i) => { b[64 + i] = v; });
  // Polaritätsbit: gerade Anzahl Nullen im ganzen Bild, damit jedes Bild mit derselben Flanke beginnt.
  // Bei 25 fps liegt es auf Bit 59, sonst auf Bit 27.
  const pol = fps === 25 ? 59 : 27;
  let zeros = 0;
  for (let i = 0; i < 80; i++) if (i !== pol && b[i] === 0) zeros++;
  // Ungerade Zahl Nullen → das Polaritätsbit wird die fehlende Null; gerade → 1
  b[pol] = zeros % 2 === 1 ? 0 : 1;
  return b;
}

export interface LtcFrame { tc: Tc; fps: TcFps }

/**
 * Erzeugt das LTC-Signal fortlaufend Stück für Stück. Für jedes neue Bild wird `next` gefragt, welcher Timecode
 * gesendet werden soll (null = Stille für die Dauer eines Bildes). Flanken liegen genau zwischen Samples; das Sample,
 * in das eine Flanke fällt, bekommt den Mittelwert (weniger Jitter als hartes Runden).
 */
export class LtcWriter {
  private level = 1;
  private bits: Uint8Array | null = null;
  private fps: TcFps = 25;
  /** Sample-Position (absolut, mit Bruchteil) des aktuellen Bildanfangs und Länge eines halben Bits. */
  private frameStart = 0;
  private half = 0;
  private idx = 0; // Halbbit-Index im Bild (0…159)
  private pos = 0; // nächstes zu schreibendes Sample (absolut)
  private started = false;

  constructor(readonly sampleRate: number, private next: (atSample: number) => LtcFrame | null) {}

  /** Nächsten Wechselpunkt (Sample-Position) des aktuellen Halbbits. */
  private edge(): number { return this.frameStart + this.idx * this.half; }

  private newFrame(at: number): void {
    const f = this.next(at);
    if (f) this.fps = f.fps;
    this.bits = f ? ltcBits(f.tc, f.fps) : null;
    this.half = this.sampleRate / (realFps(this.fps) * 160);
    this.frameStart = at;
    this.idx = 0;
  }

  /** Halbbit-Grenze erreicht: Pegel nach Biphase-Mark wechseln und weiterzählen. */
  private step(): void {
    const bits = this.bits;
    if (bits) {
      const bit = bits[this.idx >> 1]!;
      if ((this.idx & 1) === 0 || bit === 1) this.level = -this.level;
    }
    this.idx++;
    if (this.idx >= 160) this.newFrame(this.frameStart + 160 * this.half);
  }

  /** Füllt `out` mit den nächsten Samples (Pegel ±amp, Stille = 0). */
  render(out: Float32Array, amp: number): void {
    if (!this.started) { this.started = true; this.newFrame(this.pos); }
    for (let n = 0; n < out.length; n++) {
      const s0 = this.pos + n, s1 = s0 + 1;
      let cur = s0, acc = 0;
      while (this.edge() < s1) {
        const e = Math.max(cur, this.edge());
        if (this.bits) acc += this.level * (e - cur);
        cur = e;
        this.step();
      }
      if (this.bits) acc += this.level * (s1 - cur);
      out[n] = acc * amp;
    }
    this.pos += out.length;
  }

  /** Nach einer Lücke (Aussetzer der Audio-Ausgabe) neu bei Sample `at` beginnen. */
  restart(at: number): void { this.pos = at; this.started = false; }
  get position(): number { return this.pos; }
}

/**
 * Einfacher Decoder (für Tests und die Anzeige „wird gesendet“): liest aus Samples die Bits über die Abstände der
 * Nulldurchgänge und gibt jedes vollständige Bild mit gültigem Sync-Wort zurück.
 */
export function decodeLtc(samples: Float32Array, sampleRate: number, fps: TcFps): { tc: Tc; dropFrame: boolean; zerosEven: boolean }[] {
  const bitLen = sampleRate / (realFps(fps) * 80);
  const cross: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!, b = samples[i]!;
    if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) cross.push(i - 1 + a / (a - b));
  }
  const bits: number[] = [];
  for (let i = 1; i < cross.length; i++) {
    const d = cross[i]! - cross[i - 1]!;
    if (d > bitLen * 0.75 && d < bitLen * 1.25) bits.push(0);
    else if (d > bitLen * 0.25 && d < bitLen * 0.75) {
      const d2 = (cross[i + 1] ?? 0) - cross[i]!;
      if (d2 > bitLen * 0.25 && d2 < bitLen * 0.75) { bits.push(1); i++; } else bits.push(-1);
    } else bits.push(-1); // Störung: trennt, ohne bereits gelesene Bilder zu verwerfen
  }
  const out: { tc: Tc; dropFrame: boolean; zerosEven: boolean }[] = [];
  const num = (fr: number[], at: number, n: number) => { let v = 0; for (let i = 0; i < n; i++) v |= fr[at + i]! << i; return v; };
  for (let i = 0; i + 80 <= bits.length; i++) {
    if (SYNC.some((v, k) => bits[i + 64 + k] !== v)) continue;
    const fr = bits.slice(i, i + 80);
    if (fr.includes(-1)) continue;
    out.push({
      tc: { f: num(fr, 0, 4) + 10 * num(fr, 8, 2), s: num(fr, 16, 4) + 10 * num(fr, 24, 3), m: num(fr, 32, 4) + 10 * num(fr, 40, 3), h: num(fr, 48, 4) + 10 * num(fr, 56, 2) },
      dropFrame: fr[10] === 1,
      zerosEven: fr.filter(x => x === 0).length % 2 === 0,
    });
    i += 79;
  }
  return out;
}
