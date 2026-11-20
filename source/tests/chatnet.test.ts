// Netzseite des Suite-Chats mit echten Sockets, auf einem eigenen Testport (nie 47676, dem echten Raum).
import { describe, expect, it } from "vitest";
import dgram from "node:dgram";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChatNet } from "../src/main/suitechat";

const PORT = 47678;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const dir = () => mkdtempSync(join(tmpdir(), "vjchat-"));

describe("Suite-Chat: Netz", () => {
  it("Port belegt beim Start: Einschalten versucht das Binden erneut", async () => {
    const blocker = dgram.createSocket({ type: "udp4" }); // ohne Wiederverwendung: hält den Port exklusiv
    await new Promise<void>(r => blocker.bind(PORT, r));
    const net = new ChatNet(dir(), () => {}, PORT);
    await net.init();
    expect(net.state(0).error).toBeTruthy();
    expect(net.state(0).enabled).toBe(false);
    await new Promise<void>(r => blocker.close(() => r()));
    const st = await net.configure({ enabled: true }); // Einstellung war schon „an“
    expect(st.error).toBeUndefined();
    expect(st.enabled).toBe(true);
    await net.configure({ enabled: false });
    await sleep(200);
  });

  it("Aus im selben Augenblick wie Ein: bleibt aus, ohne Socket", async () => {
    const d = dir();
    const net = new ChatNet(d, () => {}, PORT);
    await net.configure({ enabled: false });
    await sleep(200);
    const on = net.configure({ enabled: true });
    const off = net.configure({ enabled: false });
    await Promise.all([on, off]);
    await sleep(1500);
    expect(net.state(0).enabled).toBe(false);
    // Port ist wieder frei: ein exklusiver Socket kann ihn binden
    const probe = dgram.createSocket({ type: "udp4" });
    await new Promise<void>((res, rej) => { probe.once("error", rej); probe.bind(PORT, () => res()); });
    await new Promise<void>(r => probe.close(() => r()));
  });
});
