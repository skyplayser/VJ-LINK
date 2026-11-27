# Drittanbieter-Bausteine

Stand: Beta 0.1.3. VJ-Link selbst steht unter der Eclipse Public License 2.0 (`LICENSE`). Der Bau (`npm run build`) erzeugt `dist/THIRD_PARTY_LICENSES.txt` mit den Lizenztexten aller Laufzeit-Pakete aus `package-lock.json` und bricht ab, wenn einer fehlt. Die App liefert diese Datei und `LICENSE` neben `app.asar` mit (Hilfe → Lizenzen und Hinweise); der Windows-Installer zeigt die Lizenz als eigene Seite.

## Mitgeliefert (Laufzeit)

| Baustein | Zweck | Lizenz |
|---|---|---|
| Electron | Desktop-Rahmen (enthält Chromium, FFmpeg und Node.js); Hinweise in `LICENSE.electron.txt` und `LICENSES.chromium.html` im Programmordner | MIT (Chromium: BSD u. a.) |
| ws | WebSocket-Server für LJ-Link | MIT |
| bonjour-service | LJ-Link im Netz finden (Bonjour/mDNS) | MIT |
| ↳ multicast-dns, dns-packet, @leichtgewicht/ip-codec, thunky, fast-deep-equal | Abhängigkeiten von bonjour-service | MIT |
| MediaPipe Tasks Vision (@mediapipe/tasks-vision) | Personen-Erkennung für Kamera-Looks (Silhouette, Umriss, Masken), läuft lokal; Lizenztext in `vendor/mediapipe/LICENSE` | Apache-2.0 |
| MediaPipe Selfie Segmenter (Modell `vendor/mediapipe/selfie_segmenter.tflite`) | Modell der Personen-Erkennung | Apache-2.0 |
| [Koffi](https://github.com/Koromix/koffi) 3.3.8 (`koffi`, `@koromix/koffi-*`) | Aufruf der vom Nutzer installierten NDI®-Laufzeit (nur im NDI-Prozess) | MIT |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4 | Lokale QR-Kopplung für die Handy-Fernsteuerung | MIT |
| [FFmpeg](https://ffmpeg.org) 6.1.1 als eigenes Programm (`resources/ffmpeg`), Builds aus [ffmpeg-static b6.1.1](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1), geladen und per SHA-256 geprüft von `scripts/fetch-ffmpeg.mjs` | Videos beim Import prüfen und umwandeln (MOV mit ProRes/Animation/PNG → WebM mit Transparenz oder MP4/H.264); VJ-Link ruft es nur als Programm auf, kein Linken | GPL (macOS-Builds GPL, Windows-Build von gyan.dev GPLv3); Lizenz und Build-Hinweise liegen neben dem Programm; Hinweis in `vendor/licenses/ffmpeg-NOTICE.txt` |
| Inter Display ExtraBold (`assets/fonts`) | Schriftzug in Logo und App-Icon, in Pfade umgewandelt | SIL Open Font License 1.1 (`assets/fonts/Inter-OFL.txt`) |

## NDI®

VJ-Link enthält **keine** NDI-Software. Für den NDI-Ausgang lädt es zur Laufzeit die NDI-Laufzeit, die der Nutzer selbst
von NDI installiert ([ndi.video/tools](https://ndi.video/tools/)). Für diese Laufzeit gilt NDIs eigene Lizenz.
NDI® ist eine eingetragene Marke der Vizrt NDI AB. VJ-Link ist kein Produkt von NDI. Einrichtung und die Bedingungen für
die NDI-Teile stehen in `docs/NDI.md`.

Die Deklarationen in `src/main/ndi/ndi-lib.ts` folgen den Header-Dateien des NDI SDK, die NDI unter der MIT-Lizenz
veröffentlicht (Text auch in `vendor/licenses/MIT-ndi-sdk-headers.txt`):

> Copyright (C) 2023-2026 Vizrt NDI AB. All rights reserved.
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files(the "Software"), to deal in the Software without restriction, including without limitation the
> rights to use, copy, modify, merge, publish, distribute, sublicense, and / or sell copies of the Software, and to
> permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
> Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
> WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
> COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Nur zum Entwickeln

| Baustein | Zweck | Lizenz |
|---|---|---|
| esbuild | Bauen | MIT |
| TypeScript | Typprüfung | Apache-2.0 |
| Vitest | Tests | MIT |
| electron-builder | Installer | MIT |
| fontTools (Python, `scripts/logo`) | Logo-Schrift in Pfade umwandeln | MIT |

## Shader credits

- Signed distance functions sdHex, sdTri and sdBox3, the domain-warping offsets in domainWarp, ink and liquidLight, and the cosine color palette follow the articles of Inigo Quilez (https://iquilezles.org/articles/). MIT License, Copyright (c) Inigo Quilez.
- Settings icon in the start screen: based on the "settings" icon of Feather (https://github.com/feathericons/feather). MIT License, Copyright (c) 2013-2023 Cole Bemis.
- hash(): a common GLSL hash idiom, as popularized by "The Art of Code" (Martijn Steinrucken).

The full MIT license texts are in `vendor/licenses/` and in THIRD_PARTY_LICENSES.txt, which ships with the program. All other generators are written for VJ-Link. "Water caustics" and "Apollonian" were rewritten in 0.1.3 with an own approach (moving Voronoi cells; circle inversion in the dual circles of a Descartes configuration).

## Protokolle und Marken

- **Art-Net™ Designed by and Copyright Artistic Licence Holdings Ltd.** VJ-Link empfängt Art-Net als Eingang (eigene Umsetzung des offenen Protokolls).
- **sACN (ANSI E1.31), OSC, MIDI:** offene Protokolle, eigene Umsetzung.
- **Marken:** VJ-Link ist ein unabhängiges Projekt und kein offizielles Produkt der genannten Hersteller; es wird von ihnen weder unterstützt noch geprüft. Alle genannten Produktnamen und Marken gehören ihren jeweiligen Inhabern und werden nur genannt, um die Kompatibilität zu beschreiben. Ableton und Link sind Marken der Ableton AG.
- **NDI®** ist eine eingetragene Marke der Vizrt NDI AB. VJ-Link ist kein Produkt von NDI.

## Bewusst nicht enthalten

- **Ableton Link SDK:** GPL-2.0-oder-später, oder kommerzielle Lizenz von Ableton. VJ-Link enthält keinen Link-Code. Es verbindet sich per TCP (Port 17000) mit **Carabiner** (Deep Symmetry, GPL), das als eigenes Programm läuft. Soll Carabiner mitgeliefert werden: als getrenntes Programm mit Lizenztext und Quelltext-Hinweis, oder eine kommerzielle Link-Lizenz bei Ableton anfragen.
- **NDI SDK und NDI-Laufzeit:** eigene Lizenz von Vizrt NDI AB, nicht im Repository und nicht im Installer. Der NDI-Ausgang lädt die Laufzeit, die der Nutzer installiert (siehe oben und `docs/NDI.md`). Syphon nur über Zusatzprogramme, die den Fenster-Ausgang abgreifen.
- **Syphon (macOS) und Spout (Windows):** jeweils eigene, freizügige Lizenzen; noch nicht eingebaut.
- **Videoformate:** Die Videodekodierung (H.264, HEVC, VP9, AV1) macht Chromium bzw. das Betriebssystem in Electron; VJ-Link liefert keinen eigenen Codec. Hinweise zu Chromium und FFmpeg: `LICENSES.chromium.html`.
- **Schriften der Oberfläche:** Die Oberfläche nutzt die Systemschrift des Rechners (nicht mitgeliefert).

## Herkunft prüfen

Bei markanten Algorithmen, Shadern, Protokoll-Code oder ungewöhnlichen Konstanten vor dem Commit die Herkunft prüfen (GitHub-Codesuche nach den Konstanten). Übernehmen nur mit passender Lizenz und Nennung hier.
