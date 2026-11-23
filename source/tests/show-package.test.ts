import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { ProjectFiles, verifyShowPackage } from "../src/main/projectfile";
import { Storage } from "../src/main/storage";

vi.mock("electron", () => ({ app: { addRecentDocument: vi.fn() } }));

it("exportiert ein prüfbares Showpaket, ohne das aktuelle Projekt umzuschalten", async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), "vj-show-test-"));
  try {
    const storage = new Storage(path.join(dir, "library"));
    await storage.init();
    const source = path.join(dir, "clip.mp4");
    const content = Buffer.from("test-video");
    await fs.writeFile(source, content);
    const video = await storage.addVideo(source, "Intro");
    if (typeof video === "string") throw new Error(video);
    const project = new ProjectFiles(storage, path.join(dir, "state.json"));
    const json = JSON.stringify({ version: 1, videos: [video] });
    const result = await project.exportShow(json, dir);
    expect(project.current).toBeNull();
    expect(result.file).toBeDefined();
    const file = result.file!;
    expect(await verifyShowPackage(file)).toEqual({ file, missing: [] });
    const copy = path.join(path.dirname(file), "Show Medien", `${video.id}.${video.ext}`);
    expect(await fs.readFile(copy)).toEqual(content);
    await fs.unlink(copy);
    expect((await verifyShowPackage(file)).missing).toEqual(["Intro"]);
    await storage.removeVideo(video.id);
    const previousFiles = (await fs.readdir(dir)).sort();
    expect((await project.exportShow(json, dir)).missing).toEqual(["Intro"]);
    expect((await fs.readdir(dir)).sort()).toEqual(previousFiles);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

it("ShowPaket mit eigenem Namen: Ordner und Datei heißen wie die Show, gleicher Name → „Name 2“", async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), "vj-show-name-"));
  try {
    const storage = new Storage(path.join(dir, "library"));
    await storage.init();
    const project = new ProjectFiles(storage, path.join(dir, "state.json"));
    const json = JSON.stringify({ version: 1 });
    const a = await project.exportShow(json, dir, "Gibson Club 12/24");
    expect(a.file).toBe(path.join(dir, "Gibson Club 12 24", "Gibson Club 12 24.vjlink"));
    const b = await project.exportShow(json, dir, "Gibson Club 12/24.vjlink");
    expect(b.file).toBe(path.join(dir, "Gibson Club 12 24 2", "Gibson Club 12 24 2.vjlink"));
    expect(await verifyShowPackage(b.file!)).toEqual({ file: b.file, missing: [] });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

it("Name der Show: erlaubte Datei- und Ordnernamen", async () => {
  const { showName } = await import("../src/core/projectfile");
  expect(showName("  Queer Paradise  ")).toBe("Queer Paradise");
  expect(showName('a:b*c?"d<e>f|g\\\\h')).toBe("a b c d e f g h");
  expect(showName("Show.vjlink")).toBe("Show");
  expect(showName("Ende...")).toBe("Ende");
  expect(showName("")).toBe("Show");
  expect(showName("CON")).toBe("CON Show");
  expect(showName("x".repeat(200)).length).toBe(80);
});
