// Herkunft: Link-Suite, Hinweis „Link-Suite laden“ (Baustein 1.0, 16.11.2026), unverändert übernommen aus
// Suite-Launcher design/launcher-hinweis/ (gleicher Autor, Eclipse Public License 2.0). Änderungen nur dort, dann neu kopieren.
// Typen zu launcher-hint.js (Link-Suite · Hinweiskarte „Link-Suite laden“, Baustein 1.0).
export declare const LAUNCHER_PAGE: string;

export interface LauncherHintTexts { title: string; text: string; small: string; get: string; hide: string; aria: string }
export declare const TEXTS: { de: LauncherHintTexts; en: LauncherHintTexts };

export interface LauncherHintOptions {
  /** Platz im Startbildschirm */
  host: HTMLElement;
  /** Ergebnis von detectLauncher() aus dem Hauptprozess; null = unbekannt → nichts zeigen */
  launcher: { installed: boolean } | null;
  /** icons/link-suite-icon.svg */
  iconSrc: string;
  /** Hauptprozess öffnet LAUNCHER_PAGE (shell.openExternal) */
  onGet: () => void;
  /** Programm speichert den Merker „Nicht mehr zeigen“ */
  onHide: () => void;
  /** Merker „Nicht mehr zeigen“ */
  hidden?: boolean;
  /** false: Ausgang, laufende Show/Messung, Demo/Screenshot ohne eigenen Schalter */
  allowed?: boolean;
  lang?: "de" | "en" | Partial<LauncherHintTexts>;
  /** erst danach einblenden (Promise von linksuite-intro-done) */
  after?: boolean | Promise<unknown>;
  /** schmale Spalte: Knöpfe unter dem Text */
  compact?: boolean;
}

export declare function showLauncherHint(o: LauncherHintOptions): {
  el: HTMLElement | null;
  remove(): void;
  update(launcher: { installed: boolean } | null): void;
};
