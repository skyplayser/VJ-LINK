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
