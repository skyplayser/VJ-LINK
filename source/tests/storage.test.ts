import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Storage } from "../src/main/storage";

describe("Video-Speicher und Streaming", () => {
  it("übernimmt ein Video und liefert Teilstücke zum Spulen", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vjlink-"));
    const src = path.join(dir, "clip.mp4");
    writeFileSync(src, Buffer.alloc(5000, 7)); // Inhalt egal: der Speicher prüft nur Endung und Größe
    const st = new Storage(path.join(dir, "data"));
    await st.init();
    expect(await st.addVideo("relativ.mp4", "x")).toBe("Datei nicht gefunden.");
    expect(await st.addVideo(path.join(dir, "fehlt.txt"), "x")).toBe("Nur MP4, MOV, M4V oder WebM.");
    const r = await st.addVideo(src, "Clip");
    if (typeof r === "string") throw new Error(r);
    const size = statSync(src).size;
    const full = await st.serveVideo(new Request(`vjmedia://video/${r.id}.mp4`));
    expect(full.status).toBe(200);
    expect(full.headers.get("access-control-allow-origin")).toBe("*");
    expect((await full.arrayBuffer()).byteLength).toBe(size);
    const part = await st.serveVideo(new Request(`vjmedia://video/${r.id}`, { headers: { range: "bytes=100-199" } }));
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe(`bytes 100-199/${size}`);
    expect((await part.arrayBuffer()).byteLength).toBe(100);
    expect((await st.serveVideo(new Request("vjmedia://video/../../etc"))).status).toBe(404);
    // nach Neustart bekannt
    const st2 = new Storage(path.join(dir, "data")); await st2.init();
    expect(st2.hasVideo(r.id)).toBe(true);
    expect(await st2.removeVideo(r.id)).toBe(true);
    expect((await st2.serveVideo(new Request(`vjmedia://video/${r.id}`))).status).toBe(404);
  });
});

describe("3D-Modelle (Punktwolken) im Speicher", () => {
  it("legt ab, liefert aus, übernimmt aus Projektdateien und weist Fremdes ab", async () => {
    const { encodePointCloud, meshToPointCloud, parseObj, decodePointCloud } = await import("../src/core/meshfile");
    const dir = mkdtempSync(path.join(tmpdir(), "vjlink-"));
    const st = new Storage(path.join(dir, "data"));
    await st.init();
    const pc = meshToPointCloud(parseObj("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"), [], new Map(), 50);
    const r = await st.addModel(encodePointCloud(pc), "Dreieck");
    const res = await st.serveModel(new Request(`vjmedia://model/${r.id}`));
    expect(res.status).toBe(200);
    expect(decodePointCloud(await res.arrayBuffer())?.n).toBe(50);
    expect((await st.serveModel(new Request("vjmedia://model/../../etc"))).status).toBe(404);
    // nach Neustart bekannt, Datei für die Projektdatei auffindbar
    const st2 = new Storage(path.join(dir, "data")); await st2.init();
    expect(st2.hasModel(r.id)).toBe(true);
    const f = st2.modelFile(r.id)!;
    // Aus einer Projektdatei: nur echte Punktwolken
    const other = new Storage(path.join(dir, "data2")); await other.init();
    expect(await other.importModel(f.path, "abcdef1234567890", "Kopie")).toBe(true);
    expect(other.hasModel("abcdef1234567890")).toBe(true);
    const fake = path.join(dir, "fake.vjpc"); writeFileSync(fake, Buffer.alloc(100, 1));
    expect(await other.importModel(fake, "1234567890abcdef", "X")).toBe(false);
    expect(await st2.removeModel(r.id)).toBe(true);
    expect((await st2.serveModel(new Request(`vjmedia://model/${r.id}`))).status).toBe(404);
  });
});
