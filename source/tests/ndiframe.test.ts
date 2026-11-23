import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ nativeImage: {} }));

describe("NDI-Bild aus dem unsichtbaren Fenster", () => {
  it("echte Pixelgröße aus den Bilddaten, auch wenn die Größe in skalierten Punkten gemeldet wird", async () => {
    const { bitmapSize } = await import("../src/main/ndi/frame");
    expect(bitmapSize(1920 * 1080 * 4, 1920, 1080)).toEqual({ w: 1920, h: 1080 });
    // Windows 125 %: meldet 1536 × 864, die Daten sind 1920 × 1080
    expect(bitmapSize(1920 * 1080 * 4, 1536, 864)).toEqual({ w: 1920, h: 1080 });
    // 150 %: 1280 × 720 gemeldet, 1920 × 1080 Pixel
    expect(bitmapSize(1920 * 1080 * 4, 1280, 720)).toEqual({ w: 1920, h: 1080 });
    // auf den Bildschirm begrenzt (kleiner gemalt): Größe stimmt, wird später hochgerechnet
    expect(bitmapSize(1536 * 864 * 4, 1536, 864)).toEqual({ w: 1536, h: 864 });
    expect(bitmapSize(0, 10, 10)).toBeNull();
    expect(bitmapSize(17, 10, 10)).toBeNull();
    expect(bitmapSize(1000 * 4, 1920, 1080)).toBeNull();
  });
});
