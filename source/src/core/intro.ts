// Startanimation der Link-Suite (src/renderer/intro/): Wann sie läuft, entscheidet der Hauptprozess (EINBAU.md Abschnitt 5).
// Hier nur die reine Regel, damit sie ohne Electron testbar ist.

/** Eigene Wahl in VJ-Link: null = „Wie die Suite“ (suite.json → intro), sonst fest an oder aus. */
export type IntroOwn = boolean | null;

export interface IntroInput {
  /** suite.json → intro; fehlt die Datei oder das Feld: null (dann an) */
  suite: boolean | null;
  own: IntroOwn;
  /** Erstes Laden des Hauptfensters in diesem Programmstart (nicht ⌘R, Neu/Öffnen, Sprachwechsel, Absturz der Oberfläche) */
  firstLoad: boolean;
  /** running.lock lag beim Start schon da: letzter Lauf ist abgestürzt */
  crashed: boolean;
  /** Testinstanz, Screenshots, --no-anim */
  quiet: boolean;
}

/** Ein- oder ausgeschaltet, unabhängig vom Moment (für die Einstellungen). */
export function introWanted(suite: boolean | null, own: IntroOwn): boolean {
  return own ?? suite ?? true;
}

/** Läuft die Animation bei diesem Laden? */
export function introEnabled(i: IntroInput): boolean {
  return i.firstLoad && !i.crashed && !i.quiet && introWanted(i.suite, i.own);
}

/** suite.json lesen: nur ein echtes boolean im Feld intro zählt. */
export function parseSuiteIntro(text: string | null): boolean | null {
  if (!text) return null;
  try {
    const j = JSON.parse(text) as unknown;
    if (j && typeof j === "object" && typeof (j as { intro?: unknown }).intro === "boolean") return (j as { intro: boolean }).intro;
  } catch { /* kaputt: wie fehlend */ }
  return null;
}

/** intro.json in VJ-Link: {"own": true|false|null} */
export function parseOwnIntro(text: string | null): IntroOwn {
  if (!text) return null;
  try {
    const j = JSON.parse(text) as unknown;
    const v = j && typeof j === "object" ? (j as { own?: unknown }).own : null;
    return typeof v === "boolean" ? v : null;
  } catch { return null; }
}
