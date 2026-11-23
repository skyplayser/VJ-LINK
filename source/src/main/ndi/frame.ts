// Bild für NDI aus dem unsichtbaren Fenster: Unter Windows mit Skalierung (z. B. 125 %) kann das Fenster in einer
// anderen Größe malen (auf den Bildschirm begrenzt) oder seine Größe in skalierten Punkten melden. Früher wurde jedes
// Bild mit „falscher“ Größe verworfen: NDI meldete Empfänger, schickte aber 0 Bilder/s. Jetzt zählen die echten
// Pixel (aus der Länge der Bilddaten), und das Bild wird bei Bedarf auf die eingestellte Größe gebracht.
import { nativeImage, type NativeImage } from "electron";

/**
 * Echte Pixelgröße aus der Länge der BGRA-Daten und der gemeldeten Größe (die in skalierten Punkten sein kann).
 * null, wenn die Länge zu keiner ganzzahligen Größe mit diesem Seitenverhältnis passt.
 */
export function bitmapSize(bytes: number, w: number, h: number): { w: number; h: number } | null {
  if (bytes <= 0 || bytes % 4 || w <= 0 || h <= 0) return null;
  const px = bytes / 4;
  if (px === w * h) return { w, h };
  const k = Math.sqrt(px / (w * h));
  for (const dw of [0, -1, 1]) {
    const pw = Math.round(w * k) + dw;
    if (pw > 0 && px % pw === 0) {
      const ph = px / pw;
      if (Math.abs(pw / ph - w / h) < 0.02) return { w: pw, h: ph };
    }
  }
  return null;
}

/** Ergebnis: Bilddaten in der Zielgröße, dazu die Größe, die das Fenster wirklich gemalt hat. */
export function ndiBitmap(image: NativeImage, w: number, h: number): { data: Buffer; painted: { w: number; h: number } } | null {
  const buf = image.toBitmap();
  const s = image.getSize();
  const real = bitmapSize(buf.length, s.width, s.height);
  if (!real) return null;
  if (real.w === w && real.h === h) return { data: buf, painted: real };
  // Auf die eingestellte NDI-Größe bringen (Empfänger sehen immer dieselbe Auflösung)
  const scaled = nativeImage.createFromBitmap(buf, { width: real.w, height: real.h, scaleFactor: 1 }).resize({ width: w, height: h, quality: "good" });
  const out = scaled.toBitmap({ scaleFactor: 1 });
  return out.length === w * h * 4 ? { data: out, painted: real } : null;
}
