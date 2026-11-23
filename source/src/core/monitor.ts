// Vorschau-Fenster: Ansichten (welche Bilder zu sehen sind). Reine Logik, ohne Oberfläche.

export const MONITOR_VIEWS = ["side", "stack", "preview", "live"] as const;
export type MonitorView = typeof MONITOR_VIEWS[number];

/** Welche Bilder eine Ansicht zeigt (nur sichtbare werden gerechnet). */
export function monitorPanes(v: MonitorView): { preview: boolean; live: boolean } {
  return { preview: v !== "live", live: v !== "preview" };
}
