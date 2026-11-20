// NDI®-Ausgang: wo VJ-Link die vom Nutzer installierte NDI-Laufzeit sucht.
import { describe, expect, it } from "vitest";
import { findRuntime, ndiRuntimeUrl, runtimeCandidates } from "../src/main/ndi/ndi-paths";

describe("NDI-Laufzeit finden", () => {
  it("macOS: Umgebungsvariable zuerst, dann /usr/local/lib", () => {
    const c = runtimeCandidates({ NDI_RUNTIME_DIR_V6: "/opt/ndi" }, "darwin");
    expect(c[0]).toBe("/opt/ndi/libndi.dylib");
    expect(c).toContain("/usr/local/lib/libndi.dylib");
  });
  it("Windows: NDI 6 Runtime unter Programme, NDI 5 als Rückfall", () => {
    const c = runtimeCandidates({ ProgramFiles: "D:\\Programme" }, "win32");
    expect(c).toEqual(["D:\\Programme\\NDI\\NDI 6 Runtime\\v6\\Processing.NDI.Lib.x64.dll", "D:\\Programme\\NDI\\NDI 5 Runtime\\v5\\Processing.NDI.Lib.x64.dll"]);
  });
  it("nimmt die erste vorhandene Datei, sonst null", () => {
    expect(findRuntime({}, "darwin", p => p === "/usr/local/lib/libndi.dylib")).toBe("/usr/local/lib/libndi.dylib");
    expect(findRuntime({}, "darwin", () => false)).toBeNull();
    expect(findRuntime({}, "linux", () => true)).toBeNull();
  });
  it("Testinstanz kann eine fehlende Laufzeit vortäuschen, die echte App nicht", () => {
    expect(findRuntime({ VJLINK_DATA: "/tmp/x", VJLINK_TEST_NDI: "missing" }, "darwin", () => true)).toBeNull();
    expect(findRuntime({ VJLINK_TEST_NDI: "missing" }, "darwin", () => true)).toBe("/usr/local/lib/libndi.dylib");
  });
  it("Download-Seiten von NDI je System", () => {
    expect(ndiRuntimeUrl("darwin")).toBe("https://ndi.link/NDIRedistV6Apple");
    expect(ndiRuntimeUrl("win32")).toBe("https://ndi.link/NDIRedistV6");
  });
});
