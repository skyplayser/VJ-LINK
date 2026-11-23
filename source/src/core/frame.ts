// Was die Oberfläche an die Ausgänge schickt: Show-Zustand plus Takt-Ursprung.
import type { LayerClockSnap, ShowState, TestPattern } from "./show";
import type { MediaPayload } from "./media";
import type { RemoteCommand, RemoteInfo, RemoteState } from "./remote";
import type { Tc, TcFps } from "./timecode";
import type { OutputLayout } from "./layout";

export type OutputTest = TestPattern | "black" | "active-edge";

export interface OutputStats {
  fps: number;
  frameMs: number;
  longGaps: number;
}

export interface ShowPackageResult {
  file?: string;
  missing?: string[];
  error?: string;
}

export interface Frame {
  show: ShowState;
  bpm: number;
  originMs: number;
  beatAtOrigin: number;
  testPattern: boolean;
  /** Länge der Videos (Sekunden), damit Ausgänge Loops gleich rechnen. */
  videoDurations?: Record<string, number>;
  /** Anordnung der Ausgänge (Gleiches Bild oder Leinwand) und welche Bildschirme offen sind. */
  layout?: OutputLayout;
  openOutputs?: number[];
  outputTests?: Record<number, OutputTest>;
  monitorPixels?: Record<number, { w: number; h: number }>;
  /** Gemeinsame Animationszeit der Ebenen (vom Hauptfenster). */
  layerClock?: LayerClockSnap;
  /** Für das Vorschau-Fenster: gewählte Ebene, bearbeitetes Bild und Seitenverhältnis des Ausgangs. */
  monitor?: {
    layer: number; image: string; aspect: number; imageName: string; layers: { name: string; clip: string }[];
    /** Mehrere Bilder (Mapping, Getrennt): alle Bilder mit Namen und wo sie laufen (Ausgänge bzw. Leinwände); sonst leer. */
    images: { id: string; name: string; on: string[] }[];
  };
}

export const frameBeat = (f: Frame, nowMs: number): number =>
  f.beatAtOrigin + ((nowMs - f.originMs) / 60000) * f.bpm;

// Nachrichten Main → Oberfläche
export type ControlEvent =
  | { type: "remote"; command: RemoteCommand }
  | { type: "remote-thumbnail"; clip: string }
  | { type: "remote-preview" }
  | { type: "dmx"; source: "artnet" | "sacn"; universe: number; data: Uint8Array }
  | { type: "osc"; address: string; args: (number | string | boolean | null)[]; tags?: string }
  | { type: "lj"; raw: string }
  | { type: "lj-connection"; clients: number }
  | { type: "status"; status: NetStatus }
  | { type: "link"; connected: boolean; peers: number; bpm: number; beat: number }
  | { type: "timecode"; source: "artnet"; tc: Tc; fps: TcFps; from: string }
  | { type: "monitor-select"; layer: number }
  | { type: "monitor-image"; image: string }
  | { type: "monitor"; open: boolean };

export interface NetStatus {
  /** Gewählte Karte für Art-Net/sACN: verbunden (mit Adresse) oder nicht da (dann gelten alle Karten). */
  light?: { name: string; address?: string };
  /** `off`: in VERBINDEN ausgeschaltet (Port freigegeben). */
  artnet: { listening: boolean; packets: number; lastFrom?: string; error?: string; off?: boolean };
  sacn: { listening: boolean; packets: number; error?: string; off?: boolean };
  osc: { listening: boolean; port: number; packets: number; error?: string; off?: boolean; lastFrom?: string };
  lj: { listening: boolean; port: number; clients: number; error?: string; off?: boolean;
    /** LJ-Link PRO: VJ-Link verbindet sich selbst (Rechner, verbunden). */
    pro?: { host: string; connected: boolean; native?: boolean;
      /** Automatisch gesucht (keine feste Adresse) und per Bonjour gefundene LJ-Links. */
      auto?: boolean; found?: string[] } };
}

export interface DisplayInfo {
  id: number;
  label: string;
  width: number;
  height: number;
  scaleFactor: number;
  pixels?: { w: number; h: number };
  primary: boolean;
  open: boolean;
  /** Fenster-Ausgang: normales Fenster statt Vollbild, zum Abgreifen mit OBS, Resolume, NDI-/Syphon-Werkzeugen usw. */
  window?: boolean;
  /** NDI®-Ausgang: unsichtbar gerendert und als NDI-Quelle ins Netz gesendet (Laufzeit von NDI, vom Nutzer installiert). */
  ndi?: NdiInfo;
}

export function displayPixels(d: DisplayInfo): { w: number; h: number } {
  return d.pixels ?? { w: Math.round(d.width * d.scaleFactor), h: Math.round(d.height * d.scaleFactor) };
}

/** Stand des NDI-Ausgangs für die Oberfläche. */
export interface NdiInfo {
  /** Nummer des Ausgangs (0 = erster) und Anzahl der NDI-Ausgänge. */
  index: number;
  count: number;
  /** Eingestellter Name (ohne Rechnername und ohne Zusatz für Testinstanzen). */
  label: string;
  /** NDI-Laufzeit auf diesem Rechner gefunden. */
  runtime: boolean;
  /** Gewählte Bildrate. */
  fps: number;
  /** Name im Netz (ohne Rechnername). */
  name: string;
  /** Gesendete Bilder je Sekunde und verbundene Empfänger, solange er läuft. */
  sentFps?: number;
  conns?: number;
  version?: string;
  error?: string;
}

/** Seite NDI in den Einstellungen: Laufzeit, Version, Netzwerkkarte, Ausgänge. */
export interface NdiSettingsInfo {
  /** Gefundene NDI-Laufzeit (Datei) oder null. */
  runtime: string | null;
  /** z. B. „NDI 6.3.2.0“. */
  version?: string;
  versionError?: string;
  /** Gewählte Karte (Systemname, leer = automatisch) und ihre Adresse, solange sie verbunden ist. */
  adapter: string;
  adapterAddress?: string;
  adapters: NetAdapterInfo[];
  /** Rechnername, wie NDI ihn vor den Quellnamen setzt. */
  host: string;
  outputs: DisplayInfo[];
}
export interface NetAdapterInfo { name: string; label: string; address: string; prefix: number }

/** Kennung des ersten NDI-Ausgangs (kein echter Bildschirm); weitere: -3, -4, … */
export const NDI_OUTPUT = -2;
/** Höchstens so viele NDI-Ausgänge (je eine Quelle im Netz). */
export const NDI_MAX = 4;
export const isNdiOutput = (id: number): boolean => id <= NDI_OUTPUT && id > NDI_OUTPUT - NDI_MAX;
/** Freie Größe des NDI-Ausgangs in Pixeln, z. B. 2816 × 640 für eine LED-Wand. */
export const NDI_MIN_SIZE = 16;
export const NDI_MAX_SIZE = 7680;
/** Wählbare Bildraten des NDI-Ausgangs. */
export const NDI_FPS_CHOICES = [25, 30, 50, 60] as const;

/** Kennung des Fenster-Ausgangs (kein echter Bildschirm). */
export const WINDOW_OUTPUT = -1;
/** Wählbare Größen des Fenster-Ausgangs (Pixel). */
export const WINDOW_SIZES: [number, number][] = [[1280, 720], [1920, 1080], [2560, 1440], [3840, 2160], [1080, 1920], [1024, 768], [1280, 1024], [1920, 1200]];

export interface NetConfig {
  sacnUniverse: number;
  /** Rechner mit LJ-Link PRO (IP oder Name); leer = dieser Rechner. */
  ljHost?: string;
  /** Eingänge an/aus (fehlt = unverändert). */
  artnet?: boolean; sacn?: boolean; osc?: boolean; lj?: boolean;
  /** Ableton Link über Carabiner. */
  link?: boolean;
  /** UDP-Port für OSC (1024–65535). */
  oscPort?: number;
  /** Netzwerkkarte für Art-Net und sACN (Systemname, leer = alle Karten). */
  lightIface?: string;
}

export type MediaEvent = { type: "add"; item: MediaPayload } | { type: "remove"; id: string }
  /** Rohdaten als Textur (RGBA8, w×h), z. B. die DJ-Wellenform. */
  | { type: "raw"; id: string; w: number; h: number; data: Uint8Array };

/** Status von VJ-Link für LJ-Link (gemeinsamer Status). */
export interface VjStatus {
  t: "vj"; app: "VJ-Link"; version: string; scene: string; sceneIndex: number; blackout: boolean;
  master: number; bpm: number; bpmSource: string; outputs: number; nowPlaying: boolean;
}

export interface ProjectLoad {
  project: string | null; media: MediaPayload[];
  /** Geöffnete Projektdatei (null = unbenannt), Vergleichsstand, gerade geladen, zuletzt geöffnet. */
  file?: { path: string; name: string } | null; savedHash?: string | null; fresh?: boolean; recent?: string[];
}
export type ProjectFileCmd = "new" | "open" | "save" | "saveAs" | "openPath";

/** Brücke, die das Preload-Skript im Fenster bereitstellt. */
export interface VjBridge {
  remoteInfo?(): Promise<RemoteInfo>;
  remoteStart?(address: string): Promise<RemoteInfo>;
  remoteStop?(): Promise<RemoteInfo>;
  remoteState?(state: RemoteState): void;
  remoteThumbnail?(clip: string, data: string): void;
  /** Live-Vorschau des Ausgangs für das Handy (JPEG als data-URL). */
  remotePreview?(data: string): void;
  onControl(cb: (e: ControlEvent) => void): void;
  publishFrame(f: Frame): void;
  /** Grafikkarte hat den WebGL-Kontext verloren: Hauptprozess öffnet das Fenster neu. */
  gpuLost?(): void;
  publishOutputStats?(stats: OutputStats): void;
  onOutputStats?(cb: (id: number, stats: OutputStats) => void): void;
  exportShowPackage?(json: string): Promise<ShowPackageResult | null>;
  verifyShowPackage?(): Promise<ShowPackageResult | null>;
  onFrame(cb: (f: Frame) => void): void;
  listDisplays(): Promise<DisplayInfo[]>;
  outputPreview?(displayId: number): Promise<string | null>;
  toggleOutput(displayId: number): Promise<DisplayInfo[]>;
  /** Vorschau-Fenster (zweiter Bildschirm) öffnen/schließen; liefert, ob es danach offen ist. */
  toggleMonitor?(): Promise<boolean>;
  /** Vorschau-Fenster: Ebene wählen (geht ans Hauptfenster, das die Auswahl übernimmt). */
  monitorSelect?(layer: number): void;
  /** Vorschau-Fenster: Bild zum Bearbeiten wählen (mehrere Bilder). */
  monitorImage?(image: string): void;
  /** Größe des Fenster-Ausgangs in Pixeln festlegen (öffnet ihn nicht). */
  windowOutputSize(w: number, h: number): Promise<DisplayInfo[]>;
  /** NDI®-Ausgang: Bildgröße, Bildrate und Name (gilt sofort, auch während er läuft). */
  ndiOutputSettings?(id: number, cfg: { w?: number; h?: number; fps?: number; name?: string }): Promise<DisplayInfo[]>;
  /** Weiteren NDI-Ausgang anlegen bzw. den letzten entfernen. */
  ndiAdd?(): Promise<DisplayInfo[]>;
  ndiRemove?(): Promise<DisplayInfo[]>;
  /** Seite NDI in den Einstellungen: Stand abfragen bzw. Netzwerkkarte für NDI wählen ("" = automatisch). */
  ndiInfo?(): Promise<NdiSettingsInfo | null>;
  ndiAdapter?(name: string): Promise<NdiSettingsInfo | null>;
  /** Netzwerkkarten mit IPv4-Adresse (für die Auswahl). */
  netAdapters?(): Promise<NetAdapterInfo[]>;
  /** Feste Seiten von NDI im Browser öffnen: Website oder Download der NDI-Laufzeit. */
  openNdiPage?(which: "home" | "runtime"): void;
  /** NDI-Ausgang läuft: gesendete Bilder je Sekunde und Empfänger, jede Sekunde. */
  onNdiStat?(cb: (s: { id: number; sentFps: number; conns: number }) => void): void;
  configure(c: NetConfig): void;
  /** Grafik in der Bibliothek ablegen (wird gespeichert und an alle Ausgänge verteilt). */
  addMedia(p: MediaPayload): void;
  removeMedia(id: string): void;
  /** Für Ausgangsfenster: Grafiken kommen dazu oder fallen weg. */
  onMedia(cb: (e: MediaEvent) => void): void;
  saveProject(json: string): void;
  /** Bildschirme oder Ausgänge haben sich geändert. */
  onDisplays(cb: (d: DisplayInfo[]) => void): void;
  /** Größe der Oberfläche: „auto“ passt sie dem Fenster an, sonst fester Faktor (1 = 100 %). */
  setUiScale(v: "auto" | number): void;
  /** Pfad einer gezogenen bzw. gewählten Datei (nur in der App). */
  pathForFile(f: File): string;
  /** Video in die Bibliothek kopieren. Gibt ID und Endung oder eine Fehlermeldung zurück. */
  addVideo(path: string, name: string): Promise<{ id: string; ext: string; name: string } | string>;
  /** 3D-Modell (OBJ/STL) übernehmen: wird im Hauptprozess in eine Punktwolke umgewandelt. */
  addModel(path: string, name: string): Promise<{ id: string; name: string; colors: boolean } | string>;
  removeModel(id: string): void;
  removeVideo(id: string): void;
  /** Art-Net-Timecode senden (19-Byte-Paket an IP oder Broadcast). */
  sendArtTimecode(bytes: Uint8Array, host: string): void;
  /** Mikrofon-Zugriff beim System anfragen (macOS). */
  askMicrophone(): Promise<boolean>;
  /** Kamera-Zugriff beim System anfragen (macOS). */
  askCamera(): Promise<boolean>;
  /** macOS: Systemeinstellungen → Datenschutz → Kamera bzw. Mikrofon öffnen. */
  openPrivacy(kind: "camera" | "microphone"): void;
  loadProject(): Promise<ProjectLoad>;
  /** Projektdatei: neu, öffnen, speichern, speichern unter (fragt bei ungespeicherten Änderungen nach). */
  projectFile(cmd: ProjectFileCmd, json: string, filePath?: string): Promise<{ ok: boolean; name?: string; message?: string }>;
  projectDirty(dirty: boolean): void;
  projectBaseline(hash: string): void;
  /** Zuletzt geöffnete Projekte mit Datum; fehlende Dateien sind markiert. */
  projectRecent(): Promise<RecentProject[]>;
  /** Liste „Zuletzt geöffnet“ leeren. */
  clearRecent(): Promise<void>;
  /** Befehle aus dem App-Menü (Ablage, Einstellungen). */
  onMenu(cb: (cmd: string, arg?: string) => void): void;
  platform: string;
  /** Live-Grafik an alle Ausgänge (wird nicht gespeichert), z. B. die Now-Playing-Bauchbinde. */
  liveMedia(e: MediaEvent): void;
  /** Datei von LJ-Link holen (Cover, Wellenform); null, wenn nicht verbunden oder nicht vorhanden. */
  ljFetch(path: string): Promise<{ type: string; data: Uint8Array } | null>;
  /** Status an LJ-Link melden (nur über den eigenen Endpunkt /vjlink). */
  ljStatus(s: VjStatus): void;
  /** Weboberfläche von LJ-Link im Browser öffnen. */
  /** Updates: prüfen (force = Stunden-Puffer übergehen), laden und installieren, Zustand mitlesen. */
  updateCheck(force?: boolean): Promise<import("./update").UpdateState | null>;
  updateInstall(): Promise<import("./update").UpdateState | null>;
  onUpdate(cb: (s: import("./update").UpdateState) => void): void;
  /** Bekannte Seite im Browser öffnen (Instagram, GitHub). */
  openWeb(url: string): void;
  /** Lizenzen und Hinweise (THIRD_PARTY_LICENSES.txt) öffnen. */
  openLicenses(): void;
  openLj(): void;
  /** Sprache der Oberfläche an den Hauptprozess (Menü, Dialoge); reload = Oberfläche danach neu laden (Sprachwechsel). */
  setLang(lang: string, reload?: boolean): void;
  /** Beim Beenden: Hauptprozess fragt die Oberfläche (Hinweis „Community-Projekt“). */
  onFarewell(cb: () => void): void;
  /** Antwort: "shown" = Hinweis ist offen, "quit" = beenden, "stay" = weiterarbeiten. */
  farewell(choice: "shown" | "quit" | "stay"): void;
  /** Suite-Chat (nur Bedienfenster): Zustand mit Nachrichten neuer als `since`, schreiben, ein/aus und Name. */
  chatGet?(since: number): Promise<import("./suitechat").ChatState | null>;
  chatPost?(text: string, urgent: boolean): Promise<boolean>;
  chatSettings?(c: { enabled?: boolean; nick?: string; where?: string }): Promise<import("./suitechat").ChatState | null>;
  /** Im Raum hat sich etwas geändert (dann chatGet). */
  onChat?(cb: () => void): void;
  /** NOTFALL bei Fenster im Hintergrund: Dock hüpft bzw. Taskleiste blinkt (ohne Ton). */
  chatAttention?(): void;
  /** Startanimation: läuft sie bei diesem Laden? (Hauptprozess: einmal je Start, nicht nach Absturz, suite.json).
   *  holdAt: Standbild bei dieser Zeit (--intro=<ms>), dann introHeld() melden. */
  introStart?(): Promise<{ enabled: boolean; holdAt: number | null }>;
  introHeld?(): void;
  /** Hinweis „Link-Suite laden“: ist der Launcher installiert? null = unbekannt bzw. nicht zeigen (Testinstanz). */
  suiteLauncher?(): Promise<{ installed: boolean; version?: string } | null>;
  /** Hauptprozess öffnet die feste Seite der Link-Suite im Browser */
  openLauncherPage?(): void;
  onSuiteLauncher?(cb: (l: { installed: boolean; version?: string } | null) => void): void;
  /** Schalter: suite.json → intro, eigene Wahl (null = wie die Suite) und das Ergebnis. */
  introGet?(): Promise<{ suite: boolean | null; own: boolean | null; on: boolean } | null>;
  introSet?(own: boolean | null): Promise<boolean>;
}

export interface RecentProject { path: string; name: string; folder: string; exists: boolean; modified: number }
