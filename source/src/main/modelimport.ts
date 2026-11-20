// 3D-Modell vom Rechner in eine Punktwolke umwandeln (Hauptprozess): OBJ samt MTL und Farbtexturen bzw. STL
// lesen, Oberfläche abtasten, Farbe je Punkt aus Textur oder Material übernehmen. Texturen dekodiert Electron
// (nativeImage), es braucht keine weitere Bibliothek.
import { promises as fs } from "node:fs";
import path from "node:path";
import { nativeImage } from "electron";
import {
  MODEL_EXTS, MODEL_MAX_BYTES, MeshError, encodePointCloud, meshToPointCloud, parseMtl, parseObj, parseStl,
  type ObjMaterial, type Rgba,
} from "../core/meshfile";
import { t } from "../core/i18n";

/** Größte Kantenlänge einer Textur beim Abtasten (größere werden verkleinert, Farben reichen dafür). */
const TEX_MAX = 2048;

async function readSmall(file: string, max: number): Promise<Buffer | null> {
  try {
    const st = await fs.stat(file);
    if (!st.isFile() || st.size > max) return null;
    return await fs.readFile(file);
  } catch { return null; }
}

/** Datei neben dem Modell finden; Groß-/Kleinschreibung und fremde Ordnerangaben verzeihen. */
async function findBeside(dir: string, ref: string): Promise<string | null> {
  const direct = path.resolve(dir, ref.replace(/\\/g, "/"));
  if (await fs.stat(direct).then(s => s.isFile(), () => false)) return direct;
  const base = path.basename(ref.replace(/\\/g, "/")).toLowerCase();
  try {
    const hit = (await fs.readdir(dir)).find(f => f.toLowerCase() === base);
    return hit ? path.join(dir, hit) : null;
  } catch { return null; }
}

function decodeTexture(file: string): Rgba | null {
  let img = nativeImage.createFromPath(file);
  if (img.isEmpty()) return null;
  const s = img.getSize();
  if (Math.max(s.width, s.height) > TEX_MAX) {
    const k = TEX_MAX / Math.max(s.width, s.height);
    img = img.resize({ width: Math.max(1, Math.round(s.width * k)), height: Math.max(1, Math.round(s.height * k)), quality: "good" });
  }
  const { width: w, height: h } = img.getSize();
  const bgra = img.toBitmap();
  if (bgra.length < w * h * 4) return null;
  // Electron liefert BGRA: in RGBA umsortieren
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) { data[i] = bgra[i + 2]!; data[i + 1] = bgra[i + 1]!; data[i + 2] = bgra[i]!; data[i + 3] = bgra[i + 3]!; }
  return { w, h, data };
}

/** Modell umwandeln. Gibt die Punktwolke oder eine (übersetzte) Fehlermeldung zurück. */
export async function convertModel(src: unknown): Promise<{ data: Uint8Array; colors: boolean } | string> {
  if (typeof src !== "string" || !path.isAbsolute(src)) return t("Datei nicht gefunden.");
  const ext = path.extname(src).slice(1).toLowerCase();
  if (!(MODEL_EXTS as readonly string[]).includes(ext)) return t("Nur 3D-Modelle als OBJ oder STL.");
  const buf = await readSmall(src, MODEL_MAX_BYTES);
  if (!buf) return t("Datei nicht gefunden oder zu groß (höchstens 80 MB).");
  try {
    if (ext === "stl") {
      const pc = meshToPointCloud(parseStl(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)));
      return { data: encodePointCloud(pc), colors: false };
    }
    const mesh = parseObj(buf.toString("utf8"));
    const dir = path.dirname(src);
    const mats: ObjMaterial[] = [];
    const textures = new Map<string, Rgba>();
    for (const lib of mesh.mtllib) {
      const file = await findBeside(dir, lib);
      const text = file ? await readSmall(file, 4 * 1024 * 1024) : null;
      if (!file || !text) continue;
      const list = parseMtl(text.toString("utf8"));
      mats.push(...list);
      for (const m of list) {
        if (!m.mapKd || textures.has(m.mapKd)) continue;
        const tf = await findBeside(path.dirname(file), m.mapKd);
        const tex = tf ? decodeTexture(tf) : null;
        if (tex) textures.set(m.mapKd, tex);
      }
    }
    const pc = meshToPointCloud(mesh, mats, textures);
    return { data: encodePointCloud(pc), colors: !!pc.col };
  } catch (e) {
    if (e instanceof MeshError) return t(e.message);
    return t("Das Modell lässt sich nicht lesen.");
  }
}
