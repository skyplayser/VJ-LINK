import { screen, type Display } from "electron";
import type koffi from "koffi";

function bindMonitorApi() {
  const ffi: typeof koffi = require("koffi");
  const user32 = ffi.load("user32.dll");
  const point = ffi.struct({ x: "int32", y: "int32" });
  const monitorAt = user32.func("MonitorFromPoint", "void *", [point, "uint32"]);
  const monitorInfo = user32.func("int GetMonitorInfoW(void *monitor, void *info)");
  return { monitorAt, monitorInfo };
}

let api: ReturnType<typeof bindMonitorApi> | undefined;

/** Windows-DIP-Grenzen sind gerundet. Das Monitorrechteck liefert die ungerundete Pixelgröße. */
export function monitorPixels(d: Display): { w: number; h: number } | undefined {
  if (process.platform !== "win32") return;
  try {
    api ??= bindMonitorApi();
    const { x, y, width, height } = d.bounds;
    const center = screen.dipToScreenPoint({ x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) });
    const monitor = api.monitorAt(center, 0);
    const info = Buffer.alloc(40); // MONITORINFO: cbSize, rcMonitor, rcWork, dwFlags
    info.writeUInt32LE(info.length, 0);
    if (!monitor || !api.monitorInfo(monitor, info)) return;
    const w = info.readInt32LE(12) - info.readInt32LE(4);
    const h = info.readInt32LE(16) - info.readInt32LE(8);
    if (w > 0 && h > 0) return { w, h };
  } catch (error) {
    console.warn("Monitorauflösung konnte nicht direkt gelesen werden:", error);
  }
}
