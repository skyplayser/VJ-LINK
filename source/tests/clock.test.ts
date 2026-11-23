// Uhrzeit-Leiste: Format, Netz-Timecode-Regeln (Zeitüberschreitung, Weiterzählen, Rücksprünge).
import { describe, expect, it } from "vitest";
import { clockView, formatClock, formatTc, fpsLabel, NetTimecode, validTc } from "../src/core/clock";

describe("Uhrzeit-Leiste", () => {
  it("Uhrzeit 24 h mit führenden Nullen, Timecode mit ; bei Drop Frame", () => {
    expect(formatClock(new Date(2026, 10, 21, 7, 5, 9))).toBe("07:05:09");
    expect(formatClock(new Date(2026, 10, 21, 23, 59, 0))).toBe("23:59:00");
    expect(formatTc({ h: 1, m: 2, s: 3, f: 4 }, 25)).toBe("01:02:03:04");
    expect(formatTc({ h: 1, m: 2, s: 3, f: 4 }, 29.97)).toBe("01:02:03;04");
    expect(fpsLabel(25)).toBe("25 fps");
    expect(fpsLabel(29.97)).toBe("29.97df fps");
  });

  it("verwirft ungültige Werte", () => {
    expect(validTc({ h: 24, m: 0, s: 0, f: 0 }, 25)).toBe(false);
    expect(validTc({ h: 1, m: 60, s: 0, f: 0 }, 25)).toBe(false);
    expect(validTc({ h: 1, m: 0, s: 0, f: 25 }, 25)).toBe(false);
    expect(validTc({ h: 1, m: 0, s: 0, f: 29 }, 29.97)).toBe(true);
    expect(new NetTimecode().feed({ h: 1, m: 0, s: 0, f: 30 }, 30, 0)).toBe(false);
  });

  it("zeigt Timecode, zählt höchstens 200 ms weiter, nach 2 s wieder Uhrzeit mit Hinweis", () => {
    const n = new NetTimecode(), d = new Date(2026, 10, 21, 22, 15, 0);
    n.feed({ h: 1, m: 0, s: 0, f: 0 }, 25, 1000);
    n.feed({ h: 1, m: 0, s: 0, f: 1 }, 25, 1040);
    expect(clockView(d, 1040, true, n)).toEqual({ mode: "timecode", text: "01:00:00:01", side: "rate", fps: 25 });
    // 120 ms später: 3 Bilder weiter
    expect(clockView(d, 1160, true, n).text).toBe("01:00:00:04");
    // 1 s ohne Paket: nur 200 ms weitergezählt (5 Bilder)
    expect(clockView(d, 2040, true, n).text).toBe("01:00:00:06");
    // nach 2 s: Uhrzeit, rechts „kein Timecode“
    expect(clockView(d, 3100, true, n)).toEqual({ mode: "time", text: "22:15:00", side: "none" });
    // Timecode aus: nur die Uhrzeit, kein Hinweis
    expect(clockView(d, 1040, false, n)).toEqual({ mode: "time", text: "22:15:00", side: "" });
  });

  it("angehaltener Timecode zeigt genau sein Bild; kleine Rücksprünge fallen weg, große nicht", () => {
    const n = new NetTimecode();
    n.feed({ h: 0, m: 10, s: 0, f: 5 }, 25, 0);
    n.feed({ h: 0, m: 10, s: 0, f: 5 }, 25, 40);
    expect(n.current(200)!.tc).toEqual({ h: 0, m: 10, s: 0, f: 5 });
    expect(n.feed({ h: 0, m: 10, s: 0, f: 2 }, 25, 80)).toBe(false);
    expect(n.feed({ h: 0, m: 9, s: 0, f: 0 }, 25, 120)).toBe(true);
    expect(n.current(120)!.tc).toEqual({ h: 0, m: 9, s: 0, f: 0 });
  });
});
