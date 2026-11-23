import { describe, expect, it } from "vitest";
import { defaultTime, formatDuration, parseClock, parseTime, secondsUntil, timeView } from "../src/core/timeclip";
import { newCue, newCueState, cueTick, nextClockStart, type CueEnv } from "../src/core/video";

const at = (h: number, m: number, s = 0, ms = 0) => new Date(2026, 11, 31, h, m, s, ms).getTime();

describe("Zeit-Clips", () => {
  it("Uhrzeit mit und ohne Sekunden", () => {
    const s = defaultTime();
    expect(timeView("time-clock", s, at(21, 5, 9), 0, 120, 0, "de").main).toBe("21:05:09");
    expect(timeView("time-clock", { ...s, seconds: false }, at(21, 5, 9), 0, 120, 0, "de").main).toBe("21:05");
  });
  it("Countdown bis Mitternacht (Silvester), Ende-Text, danach das nächste Mal", () => {
    const s = { ...defaultTime(), target: "00:00", end: "HAPPY NEW YEAR" };
    expect(timeView("time-countdown", s, at(23, 58, 30), 0, 120, 0, "de").main).toBe("01:30");
    expect(timeView("time-countdown", s, at(22, 0, 0), 0, 120, 0, "de").main).toBe("2:00:00");
    // letzte Sekunde: 00:01, dann der Text
    expect(timeView("time-countdown", s, at(23, 59, 59, 500), 0, 120, 0, "de").main).toBe("00:01");
    const after = new Date(2027, 0, 1, 0, 10).getTime();
    expect(timeView("time-countdown", s, after, 0, 120, 0, "de")).toMatchObject({ main: "HAPPY NEW YEAR", digits: false, left: 0 });
    // 40 Minuten danach: zählt auf das nächste Mal (fast 24 Stunden)
    expect(secondsUntil("00:00", new Date(2027, 0, 1, 0, 40))).toBeCloseTo(23 * 3600 + 20 * 60, 0);
  });
  it("Countdown (Dauer) ab Clip-Start, Stoppuhr zählt hoch", () => {
    const s = { ...defaultTime(), minutes: 10 };
    const start = at(20, 0);
    expect(timeView("time-timer", s, start + 1000, start, 120, 0, "de").main).toBe("09:59");
    expect(timeView("time-timer", s, start + 601_000, start, 120, 0, "de").main).toBe("00:00");
    expect(timeView("time-stopwatch", s, start + 3_725_000, start, 120, 0, "de").main).toBe("1:02:05");
  });
  it("BPM mit Takt-Punkten, Datum in der Sprache der Oberfläche", () => {
    const v = timeView("time-bpm", defaultTime(), 0, 0, 128, 6.2, "de");
    expect(v).toMatchObject({ main: "128", label: "BPM", sub: "○ ○ ● ○" });
    expect(timeView("time-bpm", defaultTime(), 0, 0, 127.46, 0, "de").main).toBe("127.5");
    const d = timeView("time-date", defaultTime(), at(12, 0), 0, 120, 0, "de");
    expect(d.main).toBe("31. Dezember 2026"); expect(d.label).toBe("Donnerstag"); expect(d.digits).toBe(false);
  });
  it("Eingaben prüfen", () => {
    expect(parseClock("7:30")).toBe(27000); expect(parseClock("23:59:59")).toBe(86399);
    expect(parseClock("24:00")).toBeNull(); expect(parseClock("12:60")).toBeNull(); expect(parseClock("x")).toBeNull();
    expect(formatDuration(59.9)).toBe("00:59"); expect(formatDuration(3600, false)).toBe("1:00");
    expect(parseTime({ style: "led", target: "25:00", minutes: -3, size: 9, label: "a\\nb" })).toMatchObject({ style: "led", target: "00:00", minutes: 0.1, size: 1 });
    expect(parseTime(null)).toBeUndefined();
  });
});

describe("SHOW: Start um Uhrzeit", () => {
  const env = { duration: () => 0, recallScene: () => {}, chase: false } as unknown as CueEnv;
  it("startet genau beim Erreichen der Uhrzeit, nicht nach einer langen Pause", () => {
    const s = newCueState();
    const c = newCue("black", "Doors"); c.start = "clock"; c.clock = "22:00"; s.list.push(c);
    cueTick(s, at(21, 59, 59, 500), env);
    expect(s.run.active.length).toBe(0);
    cueTick(s, at(22, 0, 0, 100), env);
    expect(s.run.active.some(a => a.cueId === c.id)).toBe(true);
    // Pause (Ruhezustand) über die Startzeit hinweg: nichts nachholen
    const s2 = newCueState(); s2.list.push({ ...c });
    cueTick(s2, at(21, 50), env); cueTick(s2, at(22, 10), env);
    expect(s2.run.active.length).toBe(0);
  });
  it("über Mitternacht und nächster Start", () => {
    const s = newCueState();
    const c = newCue("black", "Neujahr"); c.start = "clock"; c.clock = "00:00"; s.list.push(c);
    cueTick(s, at(23, 59, 59, 800), env);
    cueTick(s, new Date(2027, 0, 1, 0, 0, 0, 300).getTime(), env);
    expect(s.run.active.some(a => a.cueId === c.id)).toBe(true);
    expect(nextClockStart(c, at(23, 0))).toBe(new Date(2027, 0, 1, 0, 0).getTime());
    expect(nextClockStart({ clock: "x" }, at(23, 0))).toBeNull();
  });
});

describe("Timecode-Anzeige", () => {
  it("zählt zwischen den Meldungen weiter, steht angehalten, ohne Timecode Striche", () => {
    const s = defaultTime();
    const tc = { frames: 25 * 3600 + 25 * 61, fps: 25, running: true, at: 1000 };
    expect(timeView("time-timecode", s, 1000, 0, 120, 0, "de", tc).main).toBe("01:01:01:00");
    expect(timeView("time-timecode", s, 1500, 0, 120, 0, "de", tc).main).toBe("01:01:01:12");
    const st = timeView("time-timecode", s, 5000, 0, 120, 0, "de", { ...tc, running: false });
    expect(st.main).toBe("01:01:01:00"); expect(st.sub).toBe("angehalten");
    expect(timeView("time-timecode", s, 0, 0, 120, 0, "de", null)).toMatchObject({ main: "--:--:--:--", sub: "kein Timecode" });
  });
});
