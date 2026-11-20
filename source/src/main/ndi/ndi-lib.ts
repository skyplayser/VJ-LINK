// NDI®-Senden: dynamische Bindung an die NDI-Laufzeit, die der Nutzer installiert hat (nur im NDI-Prozess geladen).
//
// VJ-Link liefert keine NDI-Binärdateien und keine Dateien des NDI SDK aus. Die wenigen Deklarationen unten folgen den
// Headern des NDI SDK, die NDI unter der MIT-Lizenz veröffentlicht (Copyright (C) 2023-2026 Vizrt NDI AB), siehe
// THIRD_PARTY.md. Aufbau nach VD-Link electron/ndi/ndi-lib.ts (gleicher Autor, Eclipse Public License 2.0).
// NDI® ist eine eingetragene Marke der Vizrt NDI AB.

import koffi from "koffi";

// koffi gibt asynchronen Aufrufen nur 128 KiB Stapel. NDI braucht beim Komprimieren mehr: im Intel-Programm (x64,
// auch unter Rosetta) endet der NDI-Prozess sonst schon beim ersten Bild mit SIGBUS. 2 MiB wie bei synchronen Aufrufen.
koffi.config({ ...koffi.config(), async_stack_size: 2 * 1024 * 1024 });

const send_create_t = koffi.struct("NDIlib_send_create_t", {
  p_ndi_name: "const char *",
  p_groups: "const char *",
  clock_video: "bool",
  clock_audio: "bool",
});

const video_frame_v2_t = koffi.struct("NDIlib_video_frame_v2_t", {
  xres: "int",
  yres: "int",
  FourCC: "uint32_t",
  frame_rate_N: "int",
  frame_rate_D: "int",
  picture_aspect_ratio: "float",
  frame_format_type: "int32_t",
  timecode: "int64_t",
  p_data: "void *",
  line_stride_in_bytes: "int",
  p_metadata: "const char *",
  timestamp: "int64_t",
});
void send_create_t; void video_frame_v2_t;

const fourcc = (s: string) => s.charCodeAt(0) | (s.charCodeAt(1) << 8) | (s.charCodeAt(2) << 16) | (s.charCodeAt(3) << 24);
/** Bitmaps aus Chromium (Offscreen-Rendering) sind BGRA; der Alphakanal ist beim Ausgang immer deckend. */
export const FOURCC_BGRX = fourcc("BGRX") >>> 0;
const FORMAT_PROGRESSIVE = 1;
/** „Zeitcode selbst erzeugen“ (NDIlib_send_timecode_synthesize = INT64_MAX). */
const TIMECODE_SYNTHESIZE = 9223372036854775807n;

export interface NdiSendLib {
  path: string;
  version: string;
  initialize(): boolean;
  create(name: string): unknown;
  destroy(inst: unknown): void;
  /** Sendet ein Bild (NDI komprimiert im Hintergrund-Thread von koffi; das Bild bleibt bis zum Rückruf gültig). */
  send(inst: unknown, data: Uint8Array, w: number, h: number, fps: number): Promise<void>;
  connections(inst: unknown): number;
}

export type LoadResult = { ok: true; lib: NdiSendLib } | { ok: false; error: string };

export function loadNdi(file: string | null): LoadResult {
  if (!file) return { ok: false, error: "runtime-missing" };
  let so: ReturnType<typeof koffi.load>;
  try { so = koffi.load(file); } catch (e) { return { ok: false, error: `load: ${(e as Error).message}` }; }
  try {
    const version = so.func("const char *NDIlib_version(void)");
    const initialize = so.func("bool NDIlib_initialize(void)");
    const create = so.func("void *NDIlib_send_create(const NDIlib_send_create_t *p)");
    const destroy = so.func("void NDIlib_send_destroy(void *inst)");
    const sendVideo = so.func("void NDIlib_send_send_video_v2(void *inst, const NDIlib_video_frame_v2_t *video)");
    const conns = so.func("int NDIlib_send_get_no_connections(void *inst, uint32_t ms)");
    const lib: NdiSendLib = {
      path: file,
      // "NDI SDK APPLE 12:49:17 Apr 13 2026 6.3.2.0" → "NDI 6.3.2.0"
      version: ((v: string) => { const m = v.match(/(\d+\.\d+\.\d+(?:\.\d+)?)\s*$/); return m ? `NDI ${m[1]}` : v; })(String(version() ?? "")),
      initialize: () => initialize() as boolean,
      create: name => create({ p_ndi_name: name, p_groups: null, clock_video: false, clock_audio: false }),
      destroy: inst => destroy(inst),
      send: (inst, data, w, h, fps) => new Promise<void>((res, rej) => sendVideo.async(inst, {
        xres: w, yres: h, FourCC: FOURCC_BGRX, frame_rate_N: fps * 1000, frame_rate_D: 1000, picture_aspect_ratio: 0,
        frame_format_type: FORMAT_PROGRESSIVE, timecode: TIMECODE_SYNTHESIZE, p_data: data, line_stride_in_bytes: w * 4,
        p_metadata: null, timestamp: 0n,
      }, (err: unknown) => err ? rej(err) : res())),
      connections: inst => conns(inst, 0) as number,
    };
    return { ok: true, lib };
  } catch (e) {
    return { ok: false, error: `symbols: ${(e as Error).message}` };
  }
}
