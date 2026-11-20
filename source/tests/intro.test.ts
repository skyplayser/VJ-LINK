import { describe, expect, it } from "vitest";
import { introEnabled, introWanted, parseOwnIntro, parseSuiteIntro } from "../src/core/intro";

const base = { suite: null, own: null, firstLoad: true, crashed: false, quiet: false } as const;

describe("Startanimation: wann sie läuft", () => {
  it("ab Werk an, beim ersten Laden", () => { expect(introEnabled(base)).toBe(true); });
  it("nur beim ersten Laden je Programmstart", () => { expect(introEnabled({ ...base, firstLoad: false })).toBe(false); });
  it("nicht nach einem Absturz", () => { expect(introEnabled({ ...base, crashed: true })).toBe(false); });
  it("nicht in Testinstanzen und Screenshots", () => { expect(introEnabled({ ...base, quiet: true })).toBe(false); });
  it("folgt der Suite, eigene Wahl geht vor", () => {
    expect(introWanted(false, null)).toBe(false);
    expect(introWanted(true, null)).toBe(true);
    expect(introWanted(false, true)).toBe(true);
    expect(introWanted(true, false)).toBe(false);
    expect(introEnabled({ ...base, suite: false })).toBe(false);
    expect(introEnabled({ ...base, suite: false, own: true })).toBe(true);
  });
  it("liest suite.json und intro.json streng", () => {
    expect(parseSuiteIntro(null)).toBeNull();
    expect(parseSuiteIntro("{kaputt")).toBeNull();
    expect(parseSuiteIntro('{"intro":"false"}')).toBeNull();
    expect(parseSuiteIntro('{"intro":false,"lang":"de"}')).toBe(false);
    expect(parseSuiteIntro('{"intro":true}')).toBe(true);
    expect(parseOwnIntro('{"own":null}')).toBeNull();
    expect(parseOwnIntro('{"own":0}')).toBeNull();
    expect(parseOwnIntro('{"own":false}')).toBe(false);
  });
});
