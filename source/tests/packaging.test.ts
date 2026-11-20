import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// electron-builder: Eine eigene „files“-Liste je Plattform ersetzt die gemeinsame. Steht dort nur ein Ausschluss,
// packt es den ganzen Projektordner ein (Quellen, Tests, Arbeitsordner). So geschehen in 0.1.10 und 0.1.11.
describe("Paketinhalt", () => {
  const build = JSON.parse(readFileSync("package.json", "utf8")).build as Record<string, { files?: string[] }> & { files: string[] };
  it("gemeinsame Liste nimmt nur das gebaute Programm", () => {
    expect(build.files).toEqual(["dist/**/*", "package.json", "LICENSE"]);
  });
  for (const plat of ["mac", "win", "linux"]) {
    it(`${plat}: eigene Liste enthält die gemeinsame Liste vollständig`, () => {
      const own = build[plat]?.files;
      if (!own) return;
      for (const f of build.files) expect(own).toContain(f);
      for (const f of own) expect(f.startsWith("!") || build.files.includes(f), f).toBe(true);
    });
  }
});
