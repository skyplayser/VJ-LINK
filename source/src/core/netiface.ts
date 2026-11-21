// Netzwerkkarten: Liste zum Auswählen (NDI, Art-Net/sACN), „gehört diese Adresse zur Karte?“ und die
// NDI-Konfiguration, die NDI nur über eine Karte senden lässt. Ohne Node-Module, damit es testbar bleibt.

/** Eintrag aus os.networkInterfaces() (nur die Felder, die hier gebraucht werden). */
export interface IfaceEntry { address: string; family: string | number; internal: boolean; cidr?: string | null; netmask?: string }

/** Wählbare Netzwerkkarte: Systemname (en0, „Ethernet 2“), Anzeigename, IPv4-Adresse und Präfix. */
export interface NetAdapter { name: string; label: string; address: string; prefix: number }

const isV4 = (f: string | number): boolean => f === "IPv4" || f === 4;

function prefixOf(e: IfaceEntry): number {
  const c = Number((e.cidr ?? "").split("/")[1]);
  if (Number.isInteger(c) && c >= 0 && c <= 32) return c;
  if (e.netmask) return e.netmask.split(".").reduce((n, o) => n + (Number(o) >>> 0).toString(2).replace(/0/g, "").length, 0);
  return 24;
}

/**
 * Karten mit IPv4-Adresse, ohne Loopback und ohne Link-Local-Adressen (169.254.x, keine echte Verbindung).
 * `names`: Anzeigenamen je Systemname (macOS: „WLAN“ für en0 usw.).
 */
export function listAdapters(ifaces: Record<string, IfaceEntry[] | undefined>, names: Record<string, string> = {}): NetAdapter[] {
  const out: NetAdapter[] = [];
  for (const [name, list] of Object.entries(ifaces)) for (const e of list ?? []) {
    if (!isV4(e.family) || e.internal || e.address.startsWith("169.254.")) continue;
    if (out.some(a => a.name === name)) continue; // je Karte die erste IPv4-Adresse
    const nice = names[name];
    out.push({ name, label: !nice ? name : nice.includes(`(${name})`) ? nice : `${nice} (${name})`, address: e.address, prefix: prefixOf(e) });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

const ipNum = (a: string): number | null => {
  const p = a.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const s of p) { const v = Number(s); if (!/^\d{1,3}$/.test(s) || v > 255) return null; n = n * 256 + v; }
  return n;
};

/** Liegt `addr` im Subnetz der Karte (gleiche Netzadresse bei gleichem Präfix)? */
export function inSubnet(addr: string, adapter: Pick<NetAdapter, "address" | "prefix">): boolean {
  const a = ipNum(addr.replace(/^::ffff:/, "")), b = ipNum(adapter.address);
  if (a === null || b === null) return false;
  const bits = Math.max(0, Math.min(32, adapter.prefix));
  if (bits === 0) return true;
  const shift = 32 - bits;
  return Math.floor(a / 2 ** shift) === Math.floor(b / 2 ** shift);
}

/**
 * Darf ein Paket von `from` durch, wenn nur die Karte `adapter` gilt? Pakete vom eigenen Rechner (Loopback,
 * eigene Adressen) immer, sonst nur aus dem Subnetz der Karte. Ohne Karte: alles.
 */
export function acceptFrom(from: string, adapter: Pick<NetAdapter, "address" | "prefix"> | null, own: readonly string[] = []): boolean {
  if (!adapter) return true;
  const f = from.replace(/^::ffff:/, "");
  if (f.startsWith("127.") || f === "::1" || own.includes(f)) return true;
  return inSubnet(f, adapter);
}

/** Gewählte Karte (Systemname) finden; leer oder nicht da = null. */
export const findAdapter = (list: readonly NetAdapter[], name: string): NetAdapter | null => (name ? list.find(a => a.name === name) ?? null : null);

/**
 * Inhalt der NDI-Konfiguration (ndi-config.v1.json), mit der NDI nur über diese Adresse sendet: die vorhandene
 * Konfiguration des Nutzers (z. B. Discovery Server aus NDI Access Manager) bleibt, nur `ndi.adapters.allowed`
 * wird gesetzt. Kaputte oder fremde Inhalte werden ersetzt.
 */
export function ndiConfigWithAdapter(existing: string | null, address: string): string {
  let cfg: Record<string, unknown> = {};
  try { const j = existing ? JSON.parse(existing) as unknown : null; if (j && typeof j === "object" && !Array.isArray(j)) cfg = j as Record<string, unknown>; } catch { /* ersetzen */ }
  const ndi = cfg.ndi && typeof cfg.ndi === "object" && !Array.isArray(cfg.ndi) ? { ...(cfg.ndi as Record<string, unknown>) } : {};
  const adapters = ndi.adapters && typeof ndi.adapters === "object" && !Array.isArray(ndi.adapters) ? { ...(ndi.adapters as Record<string, unknown>) } : {};
  adapters.allowed = [address];
  ndi.adapters = adapters;
  return JSON.stringify({ ...cfg, ndi }, null, 2);
}

/** macOS: „networksetup -listallhardwareports“ → Anzeigename je Gerät (en0 → „WLAN“). */
export function parseHardwarePorts(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let port = "";
  for (const line of text.split(/\r?\n/)) {
    const p = line.match(/^Hardware Port:\s*(.+)$/); if (p) { port = p[1]!.trim(); continue; }
    const d = line.match(/^Device:\s*(\S+)/); if (d && port) { out[d[1]!] = port; port = ""; }
  }
  return out;
}

/**
 * Grobe Datenrate eines NDI-Ausgangs (volle Bandbreite, SpeedHQ) in Mbit/s: NDI nennt rund 250 Mbit/s für
 * 1080p60; sie wächst mit Pixeln und Bildrate. Nur als Richtwert für „reicht das Netz?“.
 */
export function ndiMbit(w: number, h: number, fps: number): number {
  return Math.round(250 * (w * h * fps) / (1920 * 1080 * 60));
}
