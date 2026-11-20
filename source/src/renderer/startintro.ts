// Startanimation der Link-Suite im Bedienfenster (nie in output.html). Der Baustein liegt unverändert in ./intro/
// (Suite-Launcher design/intro-programm/, EINBAU.md); hier nur Ziel, Zeitpunkt und Tasten.
import { defaultImages, playProgramIntro } from "./intro/program-intro.js";
import { t } from "../core/i18n";

/**
 * Spielt die Startanimation, wenn `enabled`. Ziel ist das Logo im Startbildschirm, ist er aus, das Logo oben links.
 * Die Schicht #lsi liegt ab dem ersten Bild deckend da und verschwindet in jedem Fall: auch bei einem Fehler.
 */
export async function runStartIntro(enabled: boolean, startShown: boolean, holdAt: number | null = null, held?: () => void): Promise<void> {
  const layer = document.getElementById("lsi");
  if (!layer) return;
  const drop = () => { layer.remove(); document.documentElement.classList.remove("lsi-run"); };
  if (!enabled) { drop(); return; }
  try {
    await document.fonts.ready;
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const start = startShown ? document.querySelector<HTMLElement>(".start:not([hidden])") : null;
    const logo = start ? start.querySelector(".start-logo") : document.querySelector("header.top .logo");
    const sign = logo?.querySelector(".slots") ?? null;
    const reveal = start ? Array.from(start.querySelectorAll(".start-tag, .start-grid .start-btn, .start-right > *, .start-foot")) : [];
    // Jede Taste überspringt nur die Animation: nie zugleich eine Tasten-Zuordnung, den Startbildschirm oder einen
    // Knopf auslösen. Darum hier zuerst abfangen (Fenster, Einfangphase) und selbst beenden.
    let run: { finish(skipped: boolean): void; done: Promise<unknown> } | null = null;
    const swallow = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault(); e.stopImmediatePropagation();
      run?.finish(true);
    };
    if (holdAt === null) addEventListener("keydown", swallow, true);
    run = playProgramIntro({
      layer,
      app: "vj",
      logoTarget: () => logo,
      signTarget: () => sign,
      revealTargets: () => reveal,
      images: defaultImages("./intro/icons/", "dark", "vj"),
      theme: "dark",
      enabled: true,
      holdAt,
      text: k => t(k === "skip" ? "Überspringen:" : k === "key" ? "Taste" : "oder Klick"),
    });
    if (holdAt !== null) {
      // Standbild (--intro=<ms>): warten, bis alle Bilder der Schicht dekodiert sind, dann melden; die Schicht bleibt
      await Promise.all(Array.from(layer.querySelectorAll("img"), i => i.decode().catch(() => undefined)));
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      held?.();
      return;
    }
    // Sicherheitsnetz: nie länger als 5 s abdecken
    const guard = setTimeout(() => run?.finish(true), 5000);
    await run.done;
    clearTimeout(guard);
    removeEventListener("keydown", swallow, true);
  } catch (err) {
    console.error("Startanimation:", err);
    drop();
  }
}
