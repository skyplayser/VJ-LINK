// Bibliothek eigener 3D-Modelle (OBJ/STL) für das Partikel-Objekt. Umgewandelt wird im Hauptprozess,
// weil OBJ-Dateien ihre Materialien und Texturen aus Nachbardateien holen.
import type { ModelItem } from "../core/meshfile";
import { MODEL_EXTS } from "../core/meshfile";
import { MODEL_CLIP_PREFIX } from "../core/particles";
import { bridge } from "./bridge";
import { t } from "../core/i18n";

export function isModelFile(f: File): boolean {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return (MODEL_EXTS as readonly string[]).includes(ext);
}

export const modelClip = (id: string): string => `${MODEL_CLIP_PREFIX}${id}`;

export class ModelLibrary {
  items: ModelItem[] = [];
  find(id: string): ModelItem | undefined { return this.items.find(i => i.id === id); }

  restore(items: readonly ModelItem[]): void {
    for (const it of items) if (!this.find(it.id)) this.items.push({ ...it });
  }

  /** Datei vom Rechner übernehmen. Gibt das Modell oder eine Fehlermeldung zurück. */
  async importFile(file: File): Promise<ModelItem | string> {
    if (!bridge) return t("3D-Modelle lassen sich nur in der App laden.");
    const path = bridge.pathForFile(file);
    if (!path) return t("„{name}“ lässt sich nicht lesen.", { name: file.name });
    const name = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
    const r = await bridge.addModel(path, name);
    if (typeof r === "string") return `„${file.name}“: ${r}`;
    const item: ModelItem = { id: r.id, name: r.name, colors: r.colors };
    this.items.push(item);
    return item;
  }

  remove(id: string): void {
    this.items = this.items.filter(i => i.id !== id);
    bridge?.removeModel(id);
  }
}
