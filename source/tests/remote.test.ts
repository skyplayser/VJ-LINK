import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { PhoneRemote } from "../src/main/remote";
import { presetRgb, remoteCommand, remotePairingCode, remotePairingUrl, type RemoteCommand } from "../src/core/remote";

describe("Handy-Fernsteuerung", () => {
  it("prüft Befehle und unterstützt Farbvorlagen", () => {
    expect(remoteCommand({ kind: "clip", stack: "main", layer: 2, id: "rain" })).toEqual({ kind: "clip", stack: "main", layer: 2, id: "rain" });
    for (const invalid of [
      { kind: "clip", stack: "main", layer: 20, id: null },
      { kind: "assign", stack: "..", layer: 0, slot: 0 },
      { kind: "color", slot: 5, preset: 0 },
      { kind: "strobeValue", control: "speed", value: Infinity },
      { kind: "hold", effect: "strobe", active: true, seq: -1 },
      { kind: "external-command" },
    ]) expect(remoteCommand(invalid)).toBeNull();
    expect(presetRgb(9)).toEqual([1, 1, 1]);
  });

  it("hält den Kopplungscode im URL-Fragment und akzeptiert führende Nullen", () => {
    const url = new URL(remotePairingUrl("http://192.168.1.24:48731", "00123456"));
    expect(url.origin + url.pathname + url.search).toBe("http://192.168.1.24:48731/");
    expect(remotePairingCode(url.hash)).toBe("00123456");
    expect(remotePairingCode("#pair=1234567")).toBeNull();
    expect(remotePairingCode("#pair=123456789")).toBeNull();
    expect(remotePairingCode("#pair=abcdefgh")).toBeNull();
  });

  it("benötigt Kopplung, schützt Schreibzugriffe und löst Halte-Effekte bei Verbindungsverlust", async () => {
    const commands: RemoteCommand[] = [];
    const requested: string[] = [];
    const phone = new PhoneRemote(resolve("src/remote"), command => commands.push(command), clip => requested.push(clip));
    const start = await phone.start("127.0.0.1");
    expect(start.code).toMatch(/^\d{8}$/);
    const root = start.url!;
    const request = (endpoint: string, body: unknown, token?: string, origin = root) =>
      fetch(root + endpoint, { method: "POST", body: JSON.stringify(body), headers: {
        "Content-Type": "application/json", Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } });
    try {
      const page = await fetch(root);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("VJ-Link Remote");
      expect((await fetch(root + "/api/state")).status).toBe(401);
      expect((await request("/api/pair", { code: start.code }, undefined, "http://example.test")).status).toBe(403);
      const valid = await request("/api/pair", { code: start.code });
      expect(valid.status).toBe(200);
      const { token } = await valid.json() as { token: string };
      const state = { bpm: 120, tempoSource: "TAP", stack: "main", stackName: "Hauptbild", layers: [{ name: "Basis", active: null, clips: [{ id: "tunnel", name: "Tunnel" }] }], slots: [], speed: 0.5, intensity: 1 };
      phone.setState(state);
      const response = await fetch(root + "/api/state", { headers: { Authorization: `Bearer ${token}` } });
      expect(await response.json()).toEqual(state);
      const thumbnail = root + "/api/thumb?clip=tunnel";
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      expect((await fetch(thumbnail)).status).toBe(401);
      expect((await fetch(thumbnail, auth)).status).toBe(202);
      expect(requested).toEqual(["tunnel"]);
      phone.setThumbnail("tunnel", "data:image/jpeg;base64,/9j/2Q==");
      const preview = await fetch(thumbnail, auth);
      expect(preview.headers.get("Content-Type")).toBe("image/jpeg");
      expect(Array.from(new Uint8Array(await preview.arrayBuffer()))).toEqual([255, 216, 255, 217]);
      expect((await request("/api/command", { kind: "tap" })).status).toBe(401);
      expect((await request("/api/command", { kind: "tap" }, token)).status).toBe(200);
      expect((await request("/api/command", { kind: "hold", effect: "blinder", active: true, seq: 5 }, token)).status).toBe(200);
      await request("/api/command", { kind: "hold", effect: "blinder", active: false, seq: 4 }, token);
      expect(commands).toEqual([{ kind: "tap" }, { kind: "hold", effect: "blinder", active: true, seq: 5 }]);
      await expect.poll(() => commands.length, { timeout: 2200 }).toBe(3);
      expect(commands[2]).toEqual({ kind: "hold", effect: "blinder", active: false, seq: 5 });
      const fresh = await request("/api/pair", { code: start.code });
      expect(fresh.status).toBe(200);
      expect((await request("/api/command", { kind: "tap" }, token)).status).toBe(401);
    } finally { phone.stop(); }
  });
});
