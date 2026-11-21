// Netzwerkkarte wählen: Liste, Subnetz-Filter für Art-Net/sACN und NDI-Konfiguration.
import { describe, expect, it } from "vitest";
import { acceptFrom, findAdapter, inSubnet, listAdapters, ndiConfigWithAdapter, parseHardwarePorts } from "../src/core/netiface";

const ifaces = {
  lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true, cidr: "127.0.0.1/8" }],
  en0: [{ address: "fe80::1", family: "IPv6", internal: false }, { address: "192.168.178.20", family: "IPv4", internal: false, cidr: "192.168.178.20/24" }],
  en7: [{ address: "2.0.0.10", family: "IPv4", internal: false, cidr: "2.0.0.10/8" }],
  en9: [{ address: "169.254.3.4", family: "IPv4", internal: false, cidr: "169.254.3.4/16" }],
  "Ethernet 2": [{ address: "10.0.5.3", family: 4, internal: false, netmask: "255.255.0.0" }],
};

describe("Netzwerkkarten", () => {
  it("listet Karten mit IPv4, ohne Loopback und Link-Local, mit Anzeigenamen", () => {
    const l = listAdapters(ifaces, { en0: "WLAN", en7: "Ethernet Adapter (en7)" });
    expect(l.map(a => [a.name, a.label, a.address, a.prefix])).toEqual([
      ["Ethernet 2", "Ethernet 2", "10.0.5.3", 16],
      ["en7", "Ethernet Adapter (en7)", "2.0.0.10", 8],
      ["en0", "WLAN (en0)", "192.168.178.20", 24],
    ]);
    expect(findAdapter(l, "en7")?.address).toBe("2.0.0.10");
    expect(findAdapter(l, "")).toBeNull();
    expect(findAdapter(l, "weg")).toBeNull();
  });
  it("Subnetz: Art-Net 2.x.x.x an der Kabelkarte, WLAN-Pakete fallen weg", () => {
    const cable = { address: "2.0.0.10", prefix: 8 };
    expect(inSubnet("2.255.255.255", cable)).toBe(true);
    expect(inSubnet("2.1.2.3", cable)).toBe(true);
    expect(inSubnet("192.168.178.5", cable)).toBe(false);
    expect(acceptFrom("192.168.178.5", cable)).toBe(false);
    expect(acceptFrom("::ffff:2.0.0.99", cable)).toBe(true);
    // eigener Rechner immer
    expect(acceptFrom("127.0.0.1", cable)).toBe(true);
    expect(acceptFrom("192.168.178.20", cable, ["192.168.178.20"])).toBe(true);
    // ohne Karte: alles
    expect(acceptFrom("192.168.178.5", null)).toBe(true);
    expect(inSubnet("kein.ip", cable)).toBe(false);
  });
  it("NDI-Konfiguration: setzt nur ndi.adapters.allowed und behält den Rest", () => {
    const keep = JSON.stringify({ ndi: { networks: { discovery: "10.0.0.2" }, adapters: { other: 1 } }, x: true });
    expect(JSON.parse(ndiConfigWithAdapter(keep, "2.0.0.10"))).toEqual({ ndi: { networks: { discovery: "10.0.0.2" }, adapters: { other: 1, allowed: ["2.0.0.10"] } }, x: true });
    expect(JSON.parse(ndiConfigWithAdapter(null, "10.0.5.3"))).toEqual({ ndi: { adapters: { allowed: ["10.0.5.3"] } } });
    expect(JSON.parse(ndiConfigWithAdapter("{kaputt", "10.0.5.3"))).toEqual({ ndi: { adapters: { allowed: ["10.0.5.3"] } } });
    expect(JSON.parse(ndiConfigWithAdapter("[1]", "10.0.5.3"))).toEqual({ ndi: { adapters: { allowed: ["10.0.5.3"] } } });
  });
  it("macOS-Namen der Karten aus networksetup", () => {
    expect(parseHardwarePorts("Hardware Port: Wi-Fi\nDevice: en0\nEthernet Address: x\n\nHardware Port: Thunderbolt Bridge\nDevice: bridge0\n")).toEqual({ en0: "Wi-Fi", bridge0: "Thunderbolt Bridge" });
  });
});

describe("NDI-Datenrate (Richtwert)", () => {
  it("1080p60 rund 250 Mbit/s, 1080p30 die Hälfte, 4K60 das Vierfache", async () => {
    const { ndiMbit } = await import("../src/core/netiface");
    expect(ndiMbit(1920, 1080, 60)).toBe(250);
    expect(ndiMbit(1920, 1080, 30)).toBe(125);
    expect(ndiMbit(3840, 2160, 60)).toBe(1000);
  });
});
