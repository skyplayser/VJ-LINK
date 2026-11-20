// Herkunft: Link-Suite, gemeinsame Startanimation (Baustein 1.0, 16.11.2026), unverändert übernommen aus
// Suite-Launcher design/intro-programm/ (gleicher Autor, Eclipse Public License 2.0). Änderungen nur dort, dann neu kopieren.
// Typen zu program-intro.js (Link-Suite · gemeinsame Startanimation, Baustein 1.0). Für VJ-Link, VD-Link und die
// TypeScript-Programme. Neben program-intro.js legen; Import: import { playProgramIntro } from "./intro/program-intro.js".

export type AppId = "lj" | "ljl" | "vj" | "vd" | "net" | "cr" | "pl" | "db";

export interface IntroImages {
  /** Suite-Zeichen (icons/suite-symbol.svg) */
  symbol: string;
  /** Suite-Logo passend zum Modus (icons/suite-logo-dark.svg | -light.svg) */
  suiteLogo: string;
  /** Icons aller acht Programme */
  icons: Record<AppId, string>;
  /** Logo des geöffneten Programms passend zum Modus – nötig bei targetKind "logo" ohne signTarget */
  logo?: string;
}

export interface ProgramIntroOptions {
  /** Schicht über dem Startbildschirm (.lsi-layer), am besten schon im HTML */
  layer: HTMLElement;
  app: AppId;
  /** Ziel, beim Start gewählt. Element bevorzugt (wird bis zur Landung verborgen); Behälter mit only-dark/only-light: das sichtbare Bild zählt */
  logoTarget: () => Element | DOMRect | null;
  /** "logo" (Standard): ganzes Logo mit Namen. "icon": Icon-Kachel */
  targetKind?: "logo" | "icon";
  /** HTML-Logo (Zeichen + Text): das Zeichen-Element (VJ/VD `.start-logo .slots`) */
  signTarget?: () => Element | null;
  /** Bei "icon": Ziel zeigt ein Suite-Icon mit Rand (Kachel = 821/1024). Standard false = Ziel ist die Kachel selbst */
  targetPadded?: boolean;
  /** Elemente des Startbildschirms, die gestaffelt einblenden */
  revealTargets?: () => Element[];
  images: IntroImages;
  theme?: "dark" | "light";
  /** Schalter des Programms (suite.json → intro). false: sofort fertig, Ereignis mit shown:false */
  enabled?: boolean;
  /** Standard: prefers-reduced-motion */
  reduced?: boolean;
  /** "session": einmal je Browser-Sitzung (sessionStorage), für Weboberflächen und Tablets */
  once?: false | "session";
  sessionKey?: string;
  speed?: number;
  /** Standbild bei dieser Zeit (ms) */
  holdAt?: number | null;
  text?: (key: "skip" | "key" | "or") => string;
}

export interface IntroDone { app: AppId; skipped: boolean; shown: boolean }

export declare const ORDER: readonly AppId[];
export declare const BRANDS: Record<string, { logoBox: number[]; sign: { w: number; y: number; h: number }; iconSignW: number; iconSignCy: number }>;
export declare function defaultImages(base: string, theme: "dark" | "light", app: AppId): IntroImages;
export declare function playProgramIntro(o: ProgramIntroOptions): { finish(skipped: boolean): void; done: Promise<IntroDone> };

declare global {
  interface WindowEventMap { "linksuite-intro-done": CustomEvent<IntroDone> }
}
