// „Timecode ab“: Ein Cue im SHOW-Ablauf gibt die Zeit der eigenen Timecode-Uhr vor (VJ-Link als Master).
import { describe, expect, it } from "vitest";
import { cueGo, cueStopAll, cueTick, newCue, newCueState, type CueEnv } from "../src/core/video";
import { TimecodeClock, formatFrames, parseTc, realFps, tcToFrames } from "../src/core/timecode";
import { PROJECT_VERSION, parseProject } from "../src/core/project";

function rig() {
  const clock = new TimecodeClock();
  clock.sendOn = true; clock.sendFps = 25;
  const env: CueEnv = {
    duration: m => (m === "vid:aaaaaa" ? 10 : 0),
    recallScene: () => {},
    tcFollow: (target, sec, running) => {
      const now = at;
      if (target === null) { clock.stop(now); return; }
      clock.follow(tcToFrames(parseTc(target, 25)!, 25) + sec * realFps(25), running, now);
    },
  };
  let at = 0;
  const s = newCueState();
  const tick = (ms: number) => { at = ms; cueTick(s, ms, env); return formatFrames(Math.floor(clock.ownNow(ms).frames + 1e-6), 25); };
  return { clock, env, s, tick, go: (ms: number) => { at = ms; cueGo(s, ms, env); } };
}

describe("Timecode aus dem SHOW-Ablauf", () => {
  it("ein Video-Cue gibt Startzeit + Stelle vor und hält am Ende an", () => {
    const r = rig();
    const v = newCue("video", "Song 1", "vid:aaaaaa"); v.tcOut = "01:00:00:00"; v.fadeIn = 0;
    r.s.list.push(v);
    expect(r.tick(0)).toBe("00:00:00:00");
    r.go(1000);
    expect(r.tick(1000)).toBe("01:00:00:00");
    expect(r.clock.ownNow(1000).running).toBe(true);
    expect(r.tick(4000)).toBe("01:00:03:00");
    // nach 10 s ist das Video zu Ende: Timecode steht auf dem Ende
    r.tick(11000);
    expect(r.clock.ownNow(11000).running).toBe(false);
    expect(r.tick(13000)).toBe("01:00:10:00");
  });

  it("der nächste Cue übernimmt mit seiner Zeit; ohne Zeit hält der Timecode an", () => {
    const r = rig();
    const a = newCue("black", "Intro"); a.tcOut = "01:00:00:00";
    const b = newCue("black", "Song 2"); b.tcOut = "02:00:00:00";
    const c = newCue("black", "Pause");
    r.s.list.push(a, b, c);
    r.go(0); r.tick(0); r.tick(5000);
    r.go(5000);
    expect(r.tick(5000)).toBe("02:00:00:00");
    expect(r.tick(7000)).toBe("02:00:02:00");
    r.go(7000);
    r.tick(7000);
    expect(r.clock.ownNow(7000).running).toBe(false);
    expect(r.tick(9000)).toBe("02:00:02:00");
  });

  it("Alles stoppen hält den Timecode an", () => {
    const r = rig();
    const a = newCue("image", "Logo"); a.tcOut = "00:10:00:00";
    r.s.list.push(a);
    r.go(0); r.tick(0); r.tick(2000);
    cueStopAll(r.s, 2000);
    r.tick(2100);
    expect(r.clock.ownNow(2100).running).toBe(false);
  });

  it("eine Szene setzt die Zeit und lässt die Uhr frei weiterlaufen", () => {
    const r = rig();
    const sc = newCue("scene", "Szene"); sc.tcOut = "03:00:00:00";
    r.s.list.push(sc);
    r.go(0); r.tick(0);
    expect(r.tick(4000)).toBe("03:00:04:00");
    expect(r.clock.ownNow(4000).running).toBe(true);
  });

  it("wie in QLab: „+ Timecode“ mit vorigem startet mit dem Video und hält an seinem Ende an", () => {
    const r = rig();
    const v = newCue("video", "Film", "vid:aaaaaa"); v.fadeIn = 0;
    const tc = newCue("tcsignal", "Timecode"); tc.start = "with"; tc.tcAction = "start"; tc.tcTarget = "10:00:00:00";
    r.s.list.push(v, tc);
    r.go(1000);
    r.tick(1000); r.tick(1040);
    expect(r.tick(1040)).toBe("10:00:00:01");
    expect(r.tick(6000)).toBe("10:00:05:00");
    expect(r.clock.ownNow(6000).running).toBe(true);
    // Video (10 s) zu Ende → Timecode steht
    r.tick(11500);
    expect(r.clock.ownNow(11500).running).toBe(false);
    expect(r.tick(14000)).toBe("10:00:10:00");
  });

  it("gekoppelter Timecode mit Wartezeit beginnt erst nach der Wartezeit bei seiner Startzeit", () => {
    const r = rig();
    const v = newCue("black", "Bild"); v.hold = 20;
    const tc = newCue("tcsignal", "Timecode"); tc.start = "with"; tc.tcTarget = "00:05:00:00"; tc.wait = 2;
    r.s.list.push(v, tc);
    r.go(0); r.tick(0); r.tick(1000);
    expect(r.clock.ownNow(1000).running).toBe(false);
    r.tick(2000); r.tick(2040);
    expect(r.tick(5000)).toBe("00:05:03:00");
  });

  it("gekoppelter Timecode hält bei „Alles stoppen“ und beim nächsten Cue ohne Zeit an", () => {
    const r = rig();
    const v = newCue("black", "A"); const tc = newCue("tcsignal", "TC"); tc.start = "with"; tc.tcTarget = "01:00:00:00";
    const w = newCue("black", "B");
    r.s.list.push(v, tc, w);
    r.go(0); r.tick(0); r.tick(40); r.tick(3000);
    expect(r.clock.ownNow(3000).running).toBe(true);
    r.go(3000); r.tick(3000);
    expect(r.clock.ownNow(3000).running).toBe(false);
    // „Alles stoppen“ nach erneutem Start
    r.s.run.next = 0; r.go(5000); r.tick(5000); r.tick(5040); r.tick(6000);
    expect(r.clock.ownNow(6000).running).toBe(true);
    cueStopAll(r.s, 6000); r.tick(6050);
    expect(r.clock.ownNow(6050).running).toBe(false);
  });

  it("„+ Timecode“ ohne vorigem läuft wie bisher frei weiter", () => {
    const r = rig();
    const tc = newCue("tcsignal", "TC"); tc.tcTarget = "02:00:00:00";
    r.env.tcCommand = (action, target) => { if (action === "start") { r.clock.locate(tcToFrames(parseTc(target, 25)!, 25), 0); r.clock.start(0); } };
    r.s.list.push(tc);
    r.go(0); r.tick(0);
    expect(r.tick(60000)).toBe("02:01:00:00");
  });

  it("nachgestellt wird nur bei mehr als einem Bild Abweichung", () => {
    const c = new TimecodeClock(); c.sendFps = 25;
    c.follow(100, true, 0);
    c.follow(100 + 25.5, true, 1000); // 0,5 Bild Abweichung: bleibt
    expect(c.ownNow(1000).frames).toBeCloseTo(125, 5);
    c.follow(200, true, 1000);
    expect(c.ownNow(1000).frames).toBe(200);
  });

  it("„Timecode ab“ wird in der Projektdatei gespeichert und geprüft", () => {
    const ok = newCue("video", "A", "vid:aaaaaa", "abc"); ok.tcOut = "01:02:03:04";
    const bad = { ...newCue("black", "B", null, "abd"), tcOut: "kaputt" };
    const p = parseProject(JSON.stringify({ version: PROJECT_VERSION, cues: [ok, bad] }))!;
    expect(p.cues[0]!.tcOut).toBe("01:02:03:04");
    expect(p.cues[1]!.tcOut).toBeUndefined();
  });
});
