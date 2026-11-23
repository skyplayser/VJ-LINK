<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-for-dark.png">
    <img src="assets/logo-for-light.png" alt="VJ-Link" width="360">
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/skyplayser/VJ-LINK/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/skyplayser/VJ-LINK/total?label=Downloads&color=a78bfa"></a>
</p>

Einfache VJ-Software für LJs. Das Lichtpult steuert die Visuals, der Takt kommt aus LJ-Link, Ableton Link, OSC oder MIDI. Schwesterprojekt von [LJ-Link](https://github.com/skyplayser/LJ-Link).

> Stand: **Beta 0.1.9**. Lauffähig und automatisch getestet auf macOS (Apple Silicon, Intel über Rosetta) und Windows 11 (`npm run test:e2e`); vieles hat noch keine echte Bühnentechnik gesehen.

## Was schon läuft

| Bereich | Stand |
|---|---|
| Engine | WebGL2-Compositor mit 4 Ebenen, Mischmodi (Normal, Addieren, Bildschirm, Multiplizieren), Deckkraft, Farbquellen (Slot A–E, Verlauf, Regenbogen), Master, Strobe, Blackout |
| Effekte | Effekt-Stapel pro Ebene (bis 6): Kaleidoskop, Spiegeln, RGB-Versatz, Glitch, Röhre, Pixel, Feedback, Leuchten, Beat-Zoom, Invertieren, Farbüberlagerung, ASCII. Effekt 1–3 jeder Ebene per Pult, MIDI-Registry und OSC |
| Szenen | Eigene Szenen anlegen, umbenennen, überschreiben, sortieren, löschen. Übergang je Szene: Schnitt, Beats oder Sekunden, Überblenden oder über Schwarz. Abfolge: weiter nach Takten, Sekunden oder Phrasenwechsel (mit „Auto“). Auslöser: Tasten 1–9, Pfeile, Pult, OSC |
| Grafiken | Logos und Bilder (PNG, JPG, WebP, GIF, SVG) laden oder hineinziehen, Freistellen (weißen/schwarzen Hintergrund entfernen, wird erkannt), Größe, Lage, Drehung, Animation im Takt (Pulsieren, Drehen, Hüpfen, Schweben, Wackeln, Heranzoomen), Effekte und Farbüberlagerung |
| Neues Projekt | Neu in 0.1.12: Auswahl „Mit Start-Aufbau“ oder „Leeres Projekt“ (vier leere Ebenen, keine Clips, keine Szenen). Der Start-Aufbau startet mit sechs Ebenen (laufend: Tunnel in Slot A, Sternenfeld, Text, Logo): E1 Basis, E2/E3 Overlay, E4 Laser (alle Laser), E5 Text („VJ-Link“), E6 Logo (VJ-Link-Logo klein unten rechts). Ebenen lassen sich im Ebenen-Panel umbenennen |
| Speichern | Arbeitsstand wird laufend gesichert. Projektdateien (.vjlink): Neu, Öffnen, Speichern, Speichern unter (Menü Ablage, ⌘N/⌘O/⌘S/⇧⌘S, Projektknopf oben), Grafiken in der Datei, Videos im Ordner „<Name> Medien“ daneben, zuletzt geöffnet, Hinweis auf ungespeicherte Änderungen |
| Visuals | 150 Visuals in 16 Kategorien: Wunschliste, moderne Techno-Visuals, Fraktale (Mandelbrot, Julia, Newton …), Demoscene (Rotozoomer, Copper-Bars, Vector-Balls …), Heilige Geometrie, 3D-Raymarching, Organisch, Partikel, Retro/Synthwave, Op-Art, Audio, 16 Laser-Visuals; Silhouette über Kamera-Clips; Live-Vorschau im Clip-Raster mit Farbe und Effekten der Ebene |
| Effekte | 50 Effekte für den Stapel, u. a. Feedback, Datamosh, Slit-Scan, Zoom-Feedback, VHS, Bloom, Halbton, LCD, Pixel-Sort, Luma-Key, Farb-Strobe, Beat-Flip |
| Laser | Kategorie für den Beamer als Showlaser im Nebel: ein Punkt im Bild wird ein Strahl, eine Linie eine Lichtfläche, ein Kreis ein Kegel. Strahlen-Fächer, Lichtdecke (Liquid Sky), Kegel/Tunnel, Laser-Welle, Strahlen-Matrix, Propeller, Laser-Figuren (Lissajous) und die Lichteffekt-Typen Moonflower, Derby, Scanner, RGB-Spots, Schneesturm, Polygon, Laser-Burst. Laser-Fläche: gerade, im Takt pulsierende Linie (Höhe einstellbar, vorgegeben oberes Drittel). Scanner horizontal und Scanner vertikal: ein Balken fährt über den ganzen Bildschirm (oben ↔ unten bzw. links ↔ rechts). Laser-Fächer (Seitenansicht für Leinwände) steht bei Licht und Raum. Effekt „Laser-Look“ macht aus jedem Visual dünne, satte Linien auf Schwarz. Laserfarben mit Wechsel alle 8 Beats oder eigene Farb-Slots, reines Schwarz. Je Ebene einstellbar: Höhe, Seite, Größe, Stärke (auch per Mapping). XY-Override: Eigenbewegung aus, X/Y setzen die Lage direkt, z. B. von der MA per DMX; Schalter, X, Y und Größe auch per Mapping |
| Partikel-Objekt | Neu in 0.1.12. 3D-Körper aus vielen Stäbchen, die auf den Beat explodieren und zurückkehren: Kreuz, Würfel, Kugel, Torus, Stern (unter „3D und Raum“) und eigene Modelle als OBJ (mit MTL-Farben und Texturen) oder STL. Drehung je Achse (X/Y/Z), Explosion je Beat/Takt/2–4 Takte, durch den Bass (Audio oder LJ-Link) oder per Fader, Streuung, Formwechsel; Bedienfeld „Partikel-Objekt“, alle Regler auf Pult, MIDI und OSC. Braucht eine starke Grafikkarte (Ziel 3 Bildschirme mit 60 fps ab M2). Code: `src/core/particles.ts`, `src/engine/particles.ts`, `src/core/meshfile.ts`, `src/main/modelimport.ts` |
| Partikel als Staub | Neu in 0.1.15 (Feedback großer Leinwände): keine Stäbchen und Kugeln mehr, sondern feine, leuchtende Staubkörner (gaußförmig, Größe je Korn verschieden, wenige große weiche). Licht wird in einem Gleitkomma-Zwischenbild addiert und beim Übertragen weich begrenzt; Körner unter einem Pixel werden schwächer statt größer gezeichnet (kein Flimmern); Helligkeit an die Anzahl gekoppelt. „Form deckend“ (`solid`, Vorgabe an für eigene Modelle): ruhende Körner bilden eine geschlossene, beleuchtete Fläche (eigener Durchgang mit Tiefe), erst beim Sprengen wird jedes Korn zu Staub. Regler „Länge“ entfällt |
| Objekt-Effekte | Neu in 0.1.15: Verhalten je Ebene (`particles.mode`): Partikel (Explosion: der Körper bricht auf, Körner schießen heraus und wirbeln), Verwehen (glühende Kante wandert durch den Körper, dahinter weht er als Staub davon); Körper-Verhalten, die den Körper als Ganzes verformen (glatte Felder über die Lage, kein Zufall je Korn): Schmelzen (sackt zusammen, tropft, zerfließt zur glänzenden Pfütze), Jelly (Stauchen/Nachschwingen, glänzend), Auflösen (Kante wandert von oben, glüht, darüber Rauch), Verdrehen, Zersplittern (Teilobjekte wie Buchstaben fliegen einzeln, ein großer Hauptkörper bricht in Zellen); Ohne. Fläche mit Licht je Material (Glanz, Randlicht, Glut); Körper-Verhalten von sich aus deckend |
| Echter Körper | Neu in 0.1.15: Mit „Form deckend“ zeichnet VJ-Link das Modell als Dreiecksnetz (`rendermesh.ts`: verschweißt, Wicklung über Nachbarkanten vereinheitlicht und per Volumen nach außen, glatte Normalen mit 45°-Knick, Farben, bis zu 4 Texturen als Textur-Array, grobe Netze auf Kanten ≤ 0,05 unterteilt, große per Gitter vereinfacht, Stück-Zelle je Ecke für Zersplittern). Modelldatei VJPC Version 2 trägt Punktwolke und Netz (Block „VJMS“), Version 1 lesbar. Licht: GGX/Fresnel mit Haupt-, Füll- und Gegenlicht, Himmel/Boden, Studio-Spiegelung, 4-fach geglättet (MSAA, Gleitkomma). Körper-Verhalten verformen die Ecken, Partikel und Auflösen schneiden Löcher, Staub nur wo der Körper aufbricht |
| Katalog | Alle 35 Visuals der Wunschliste und die Laser mit Status (`bereit` / `geplant`) |
| Takt | Seit 0.1.15 richtet VJ-Link den Beat-Zähler von LJ-Link nach Takt-Eins und Phrasen-Anfang aus (`bar`, `phraseBeat`), damit „Takt 1“ und „Alle 2/4 Takte“ auf der Musik sitzen. Quellen-Rangfolge LJ-Link → Ableton Link → OSC → MIDI → Audio → Tap, Tap-Tempo, Rückfall bei Ausfall ohne Phasensprung |
| Pult | Art-Net und sACN als Eingang, DMX-Belegung „Standard“ (91 Kanäle, 71–91 für die Bilder im Projektionsmapping), nur geänderte Kanäle wirken, Kanalliste als CSV |
| OSC | Eingang auf Port 8000, Adressen `/vjlink/…` |
| LJ-Link | LJ-Link wird automatisch gefunden und verbunden, auch auf anderen Rechnern im Netz (Bonjour „_ljlink._tcp“; dieser Rechner zuerst, dann das eigene Subnetz; WLAN und Kabel werden zusammengefasst; ohne Fund dieser Rechner auf 8080). Ältere LJ-Link-Versionen: VJ-Link meldet sich an dessen Weboberfläche an (ws://…:8080/ws, alle 3 s neuer Versuch), übernimmt Decks, Master-Tempo, Tonart, Titel, Trackwechsel und Loops; anderer Rechner (auch „rechner:port“) unter VERBINDEN → LJ-Link. Zuerst wird der eigene Endpunkt /vjlink versucht (Beat-Phase, Phrasen, Cues), sonst die Weboberfläche /ws. Clips unter Bibliothek → „LJ-Link (DJ)“: „Now Playing“ (Bauchbinde mit Cover, Titel, Artist des Master-Decks; 8/15/30 s nach Trackwechsel oder immer; im Privatsphäre-Modus leer) und „DJ-Waveform“ (scrollende Wellenform wie am CDJ, Abspielkopf, Taktstriche; Zoom über die Größe der Ebene). Gemeinsamer Status: VJ-Link meldet Szene, Blackout, Master, BPM und Quelle an LJ-Link (über /vjlink), „LJ-Link öffnen“ öffnet dessen Weboberfläche; vjlink://focus holt VJ-Link nach vorn. Zusätzlich WebSocket-Eingang auf Port 9099 (eigenes Protokoll), Regeln „Wenn … dann …“, Privatsphäre-Modus |
| Suite-Chat (Alpha) | Neu in 0.1.8. Getestet auf einem Mac mit LJ Link, LJL Link und VJ-Link; noch nicht zwischen zwei Rechnern, nicht unter Windows, nicht im Club. Ein Chatraum mit LJ Link und [LJL Link](https://github.com/skyplayser/LJL-Link) (den DJs) im selben Netzwerk, ohne Server (UDP-Multicast 239.255.76.76, Port 47676). Chat-Knopf oben mit Zähler für Ungelesenes, Name und Position beim Betreten. EMERGENCY-Knopf: bei allen anderen sofort ein Popup unten rechts mit gelb blinkendem Rand; der Chat-Knopf blinkt gelb, bis der Chat geöffnet wird. Chat und Popups nur im Bedienfenster, nie auf den Ausgängen. Ab Werk an, abschaltbar unter Einstellungen → Suite-Chat. Texte nur im Speicher, nie in einer Datei oder im Problembericht. Protokoll: [docs/suite-chat.md](https://github.com/skyplayser/LJ-Link/blob/main/docs/suite-chat.md) im LJ-Link-Repo, hier `src/core/suitechat.ts` (Raum), `src/main/suitechat.ts` (Netz), `src/renderer/chat.ts` (Oberfläche) |
| Startanimation und Link-Suite | Neu in 0.1.9. Beim Programmstart die gemeinsame Animation der Link-Suite (höchstens 2,5 s, jede Taste oder Klick überspringt, „Bewegung reduzieren“ beachtet, nur im Bedienfenster, nicht nach einem Absturz; Einstellungen → Oberfläche → Startanimation). Fehlt der Launcher [Link-Suite](https://github.com/skyplayser/Link-Suite), zeigt der Startbildschirm rechts die Karte „Link-Suite laden“ (lokale Prüfung ohne Netz, „Nicht mehr zeigen“). Bausteine aus dem Suite-Launcher: `src/renderer/intro/`, `src/renderer/suite/`, `src/main/suite/launcher-detect.ts`; Regeln in `src/core/intro.ts` |
| Ausgänge | Tab AUSGABE: ein Vollbild-Fenster pro Bildschirm, gemeinsame Takt-Uhr. Anordnung „Gleiches Bild auf allen“ oder „Leinwand“: Bildschirme frei anordnen (ziehen, einrasten, Werte eintippen, nebeneinander/untereinander), jeder Ausgang zeigt seinen Ausschnitt, Visuals, Videos und Cues laufen nahtlos über alle |
| Mapping | Wie Daslight: MAPPING → Tastatur, MIDI, DMX/Art-Net oder OSC (⇧⌘K/M/D/O). Alle zuweisbaren Elemente leuchten lila, anklicken, Eingang bewegen. Liste der Zuweisungen je Art, wird mit dem Projekt gespeichert. Clips, Szenen, Fader, Effekte, BPM |
| Lage | Jedes Visual in jeder Ebene: X, Y, Größe, Drehung; das Visual füllt dabei weiter den ganzen Bildschirm (Ebenen-Panel „Lage“, auch per Mapping für MA, MIDI, OSC). Laser rechnen die Lage selbst (Linien bleiben dünn), dazu Stärke und XY-Override |
| Text | „+ Text“ (Clip-Raster oder Bibliothek): Text-Rahmen gestalten mit Schrift, Größe, Fett/Kursiv/GROSS, Ausrichtung, Zeilen- und Buchstabenabstand, Farbe, Leuchten, Kontur, Kasten; Live-Vorschau. Wird ein Clip wie eine Grafik; Bleistift am Clip zum Bearbeiten |
| Modulation | Neu in 0.1.12: Bereich von–bis statt nur Stärke, neue Modulationen starten mit ±10 % um die jetzige Stellung, Fenster verschiebbar. MAPPING → Modulation (⇧⌘L): Regler anklicken, LFO im Takt (Sinus, Dreieck, Säge, Rechteck, Zufall, ¼–32 Beats) oder Audio-Band (Bass, Mitten, Höhen), Stärke. Der Regler schwingt um seine Position, modulierte Regler sind türkis umrandet. Wird mit dem Projekt gespeichert |
| Sperrmodus | Schloss oben rechts: während der Show nur bedienen (Fader, Clips, Szenen, Effekt-Stärken, GO, Blackout …), nichts löschen, hinzufügen, umbenennen oder laden. Entsperren: Schloss 1 Sekunde halten |
| MIDI | Controller per Web MIDI, Hot-Plug, Noten und CCs, LED-Rückmeldung, Vorlagen (APC mini mk2, APC mini, nanoKONTROL2), Export/Import der Zuweisungen, MIDI-Clock als Tempo-Quelle |
| Ebenen | 1 bis 20 Ebenen (bis 0.1.14: 8), hinzufügen und entfernen; „+ Ebene“ legt seit 0.1.15 eine leere Zeile an (Pult-Profil steuert Ebene 1–4). Jede Ebene hat ihre eigene Clip-Zeile, zusammengestellt aus der Bibliothek („+ Clips“), Clips per × aus der Zeile nehmen |
| Ebene | Antrieb auch direkt in jeder Ebenen-Zeile wählbar. Panel rechts je Ebene: Antrieb Auto / Takt / Audio / Statisch (woher Pulsieren und Reaktion kommen), Farben Original, ein oder mehrere Slots (Reihenfolge wählbar), Verlauf, Regenbogen. Antrieb und Laser-Regler auch per Mapping |
| Kamera | Webcam, Capture-Karte oder OBS Virtual Camera als Clip (Bibliothek → Kameras) und als Cue im SHOW-Ablauf; spiegeln, Silhouette (Gegenlicht oder gemerkter Hintergrund), läuft auch auf allen Ausgängen |
| Audio | Audio-Eingang (Mikrofon, Line-In) für Equalizer und Oszilloskop oder alle Visuals, mit Pegel |
| Tempo | BPM anklicken und eintippen, Tempo-Quelle festlegen (Auto, LJ-Link, Ableton Link, OSC, Manuell), Ableton Link über Carabiner |
| Bedienung | Fader-Leiste (Master, Ebenen, Effekt, Strobe mit Speed und Intensität, Strobe White, Blinder (statisch weiß), Szenen, Tap, Blackout), jedes Element auch per OSC (`/vjlink/ctl/<id>`) |
| Oberfläche | VISUALS, SHOW, Bauen (Katalog), Ausgabe, Verbinden; Logo als App-Icon |
| Videos | MP4, MOV, M4V, WebM in die Bibliothek (Kopie im App-Ordner, gestreamt über vjmedia://). Nahtloser Loop mit zwei Abspielern. Als Clip mit Loop-Bereich, Takt-Loop (4–32 Beats), Größe, Ton. Läuft auf allen Ausgängen synchron |
| Timecode | Empfangen und Senden getrennt einschaltbar, auch gleichzeitig (Art-Net, MIDI-Timecode), 24/25/29,97 DF/30 fps. Empfangen: Cues starten per Timecode, Videos folgen (Spulen, Anhalten), Versatz. Senden: eigene Uhr oder Empfangenen weitergeben, z. B. an eine MA; Timecode-Cues im SHOW-Ablauf (Start ab Zeit, Stopp, Springen) und Mapping steuern die Uhr |
| Einstellungen | Zahnrad oben rechts: Audio-Eingang und -Ausgang, Timecode, MIDI-Geräte, DMX und Netzwerk, Oberfläche |
| Projektionsmapping | AUSGABE → Anordnung → Projektionsmapping: auf das Bild jedes Beamers Leinwände legen (Vierecke). Ecke ziehen verzerrt (Wand, Kiste, Trapez), Mitte ziehen verschiebt, Pfeiltasten 1 px (⇧ 10 px), Ecken rasten ein („Einrasten aus“ oder ⌥ beim Ziehen für volle Präzision). Jede Leinwand zeigt das ganze Bild oder einen Ausschnitt; außerhalb bleibt der Beamer schwarz. „Raster zum Ausrichten“ legt das Raster-Testbild verzerrt auf die Leinwände. „Form“: 4 Ecken oder Raster 3×3/5×5 für runde und gewölbte Flächen (Punkte einzeln ziehen, weich gekrümmt). „+ Maske“: Vieleck (bis 32 Punkte, Doppelklick fügt einen Punkt ein, Entf löscht), „Innen schwärzen“ oder „Nur innen zeigen“, weiche Kante. „Bühnenfoto …“ legt ein Foto (vom Beamer aus) halbdurchsichtig hinter die Leinwände, nur im Editor |
| NDI®-Ausgang | AUSGABE → Bildschirme → NDI®-Ausgang: VJ-Link rechnet das Bild unsichtbar in fester oder freier Größe (720p bis 4K, hochkant, z. B. 2816 × 640) mit 25 bis 60 Bildern/s und sendet es als NDI-Quelle „RECHNERNAME (Name)“ ins Netz, z. B. an VD-Link, OBS oder Resolume. Bis zu vier NDI-Ausgänge mit eigenem Namen; sendet nach einem Neustart weiter, bis man ihn schließt. Ohne Fenster und ohne Bildschirm, auch unter Windows ohne virtuellen Monitor. Wie ein Beamer in Leinwand und Projektionsmapping nutzbar. Nutzt die vom Nutzer installierte NDI-Laufzeit, siehe `docs/NDI.md`. NDI® ist eine eingetragene Marke der Vizrt NDI AB |
| Einstellungen → NDI | Neu in 0.1.14; seit 0.1.15 werden Bilder unter Windows mit Bildschirm-Skalierung nicht mehr verworfen (echte Pixelgröße aus den Bilddaten, sonst auf die NDI-Größe gebracht). Version und Datei der NDI-Laufzeit (eigener kurzer NDI-Prozess, sendet nichts), Netzwerkkarte für NDI (`ndi.adapters.allowed` in einer eigenen `ndi-config.v1.json` über `NDI_CONFIG_DIR`, die Konfiguration des Nutzers bleibt), Neustart der NDI-Prozesse bei Wechsel oder neuer Adresse, Stand jedes Ausgangs mit Empfängern und geschätzter Datenrate (`ndiMbit`), Fehler in Klartext |
| Netzwerkkarte für Art-Net/sACN | Neu in 0.1.14. Einstellungen → DMX und Netzwerk: Art-Net und sACN nur aus dem Subnetz der gewählten Karte (`acceptFrom`, eigene Adressen und Loopback immer), sACN-Gruppe nur dort; nicht verbunden = alle Karten |
| Uhrzeit-Leiste | Neu in 0.1.15. Oben im Bedienfenster (nie auf Ausgängen) die Uhrzeit als bernsteinfarbene Punktmatrix (`clockbar.ts`, Schrift nach LJ-Link), Standard an; opt-in (Alpha) statt Uhrzeit der Art-Net-Timecode aus dem Netz (`NetTimecode`: 2 s Zeitüberschreitung, höchstens 200 ms weiterzählen, Rücksprünge ≤ 5 Bilder verworfen). Einstellungen → Oberfläche; nur Anzeige, unabhängig vom Timecode-Empfang |
| Vorschau-Fenster | Neu in 0.1.15. Eigenes Fenster für einen zweiten Bildschirm (Knopf „Vorschau-Fenster“ neben „Auflösung“): links die gewählte Ebene allein (mit Effekten, volle Deckkraft, ohne Master/Blackout/Strobe/Ablauf), rechts das Live-Bild; bei mehreren Bildern Live-Kacheln aller Bilder (Klick = bearbeiten). Ebenen-Auswahl in beide Richtungen mit dem Hauptfenster verbunden; Ansichten nebeneinander/übereinander/nur Vorschau/nur Live, Drittel-Raster, Vollbild, Tasten 1–9. Offen ersetzt es die Ausgangs-Vorschau im Hauptfenster (mehr Platz für die Ebenen). Lage und offen/zu bleiben über einen Neustart |
| Uhr und Zeit | Neu in 0.1.15. Clips Uhrzeit, Countdown bis Uhrzeit (über Mitternacht, Text bei 0, letzte 10 s pulsieren), Countdown (Dauer), Stoppuhr, Datum, BPM-Anzeige, Timecode-Anzeige. Jedes Fenster zeichnet aus der eigenen Uhr (`engine/timeclip.ts`); Stil klar/digital/LED-Punkte, Farbe aus der Farbquelle der Ebene, Lage aus „Lage“ |
| Fenster-Ausgang | AUSGABE → Bildschirme → Fenster-Ausgang: normales Fenster mit fester Bildgröße (720p bis 4K, hochkant) statt Vollbild, für OBS oder Syphon Recorder per Fensteraufnahme. Wie ein Beamer in Leinwand und Projektionsmapping nutzbar |
| Ausgang einstellen | AUSGABE → „Einstellungen“ je Bildschirm: Name, Bildfläche in Signalpixeln (z. B. LED-Controller 1280 × 1024, Wand nur 140/56 · 280 × 112; außerhalb schwarz, pixelgenau), Vorschau zum Ziehen, Pfeiltasten 1 Pixel, Einpassen (ganz zeigen, füllen, strecken), Gerät (Bildschirm, Beamer, LED-Wand) mit Strobe/Blinder je Ausgang (Beamer standardmäßig ohne), Rahmen auf dem Ausgang zum Ausrichten; unter „Mehr“ Ausschnitt und Testbild nur für diesen Ausgang. Windows: echte Monitorauflösung auch mit Anzeigeskalierung. Community-Funktion von Fabi |
| Ausgabeprofile | AUSGABE → Ausgabeprofile: Anordnung, Mapping, Bildflächen und Namen aller Ausgänge unabhängig vom Projekt speichern und laden („Club A“, „Hochzeit“); fehlt ein Bildschirm, findet VJ-Link ihn über ID, Name und Auflösung und meldet, was fehlt |
| Handy-Fernsteuerung | VERBINDEN → Handy-Fernsteuerung, seit 0.1.16 mit Reitern: **Start** (Live-Bild des Ausgangs, Blackout, Master, Effekte, Szene weiter/zurück, Auto, WEITER, Tempo eintippen/±0,1, Strobe/Blinder Dauer-An, Testbild, Bildschirm wach halten), **Szenen** (Raster, Blende, Übergangsart), **Ebenen** (Mixer mit Deckkraft aller Ebenen, Bild wählen, Clips mit Vorschaubildern, Mischmodus, Text-Clips ändern, Zeit-Clips, Farben und Farbslots), **Show** (WEITER, Zurück, Alles stoppen, Ablauf mit „als Nächstes“, Timecode-Uhr); unten Tap und Strobe/Strobe White/Blinder halten; Regler aus einer festen Liste (gleiche IDs wie MIDI/OSC); zum Home-Bildschirm (Manifest, fester Port 48731). Vom Handy im lokalen Netz. Kopplung per QR-Code oder 8-stelligem Code; aus, bis man sie einschaltet. Community-Funktion von Fabi |
| ShowPaket | Projektmenü → ShowPaket exportieren: Name der Show und Ort (z. B. USB-Stick) wählen, es entsteht ein Ordner „Name“ mit „Name.vjlink“ und allen Medien, danach geprüft (seit 0.1.15 mit eigenem Namen); ShowPaket prüfen vor der Show. Doppelklick auf eine .vjlink-Datei öffnet sie in VJ-Link (Dateiverknüpfung im Installer, macOS „open-file“, Windows Argument auch an die laufende App) |
| Getrennt | Neu in 0.1.12. AUSGABE → Anordnung „Getrennt: jeder Ausgang sein Bild“: jeder Ausgang (auch NDI) rechnet eines der bis zu 5 Bilder ganz, in eigener Auflösung (`showForImage`). Beim Wechsel bekommt jeder weitere Ausgang ein eigenes Bild (Kopie von Bild 1, `assignSeparate`); Auswahl im Kasten des Ausgangs und neben dem Raster („Ausgänge“). Bildfläche, Gerät, Profile, Szenen, SHOW-Bild und Pult-Kanäle 71–91 wie im Mapping. Zuordnung `screenImages` im Projekt und in Ausgabeprofilen |
| Bilder | Im Mapping-Modus zeigt „Ausgang“ im Tab VISUALS bis zu 5 Bilder als Live-Kacheln („+ Bild“, Doppelklick auf den Namen benennt um, × löscht). Klick auf ein Bild bearbeitet es (Clip-Raster, Ebenen, Effekte, Fader). Rechts unter „Leinwände“ wählt je Leinwand ein Dropdown, welches Bild darauf läuft (auch im Mapping-Editor, ganz oder als Ausschnitt). Szenen speichern und rufen alle Bilder ab, mit Überblendung. Regler unten in jeder Kachel: Helligkeit des Bilds. Fest belegbar (MIDI, OSC, Pult): bild.N.hell, bild.N.eK (Deckkraft Ebene K), bild.N.bearbeiten – wirken immer auf dasselbe Bild, egal welches gerade bearbeitet wird |
| Testbild | Im Tab AUSGABE, 9 Testbilder zum Durchschalten: Farbbalken, Raster, Raster über alle (eine Leinwand über alle Bildschirme), Nummern, Graustufen, Weiß, Rot, Grün, Blau. Mit Auflösung, Name und Lage je Ausgang. Per Mapping: Testbild, Nächstes, Voriges |
| SHOW | Ablauf mit Cues (Video, Bild, Schwarz, VJ-Szene, Timecode): WEITER (Leertaste), Zurück, Alles stoppen; Start von Hand / nach vorigem / mit vorigem + Wartezeit / Timecode / Uhrzeit (neu in 0.1.15: HH:MM[:SS], lokale Uhr, auch über Mitternacht, nach einer Pause nichts nachgeholt); Kürzen; Wiederholen aus / x-mal / bis WEITER / endlos, auch nur einen Bereich; Ende stehen bleiben / ausblenden / weiter; Einblenden, Lautstärke, Größe, Visuals aus oder darüber |
| Timeline | Cue-Optionen → „In Timeline umwandeln“ (Video, oder Bild/Schwarz mit Dauer): großer Editor unter der Cue-Liste mit Lineal, Video- und Szenen-Spur. Szenen setzen wie im Schnittprogramm: aus der Palette auf die Spur ziehen (4 s), Länge an den Rändern ziehen, Mitte ziehen verschiebt, Kanten rasten ein (⌥ ohne); oder antippen bzw. „Aufnehmen“ und Szenen live auslösen (Pads, Tasten, MIDI, Pult). In Lücken gilt die Szene, die beim Start lief. Helligkeit je Szenen-Block. Zweite Spur „Effekte“: Strobe, Flash, White, W-Flash, Blinder (statisch weiß), Blackout – ziehen, trimmen, verschieben wie Szenen. Entf löscht, Klick ins Lineal spult. Beim Abspielen werden die Szenen abgerufen (vorgegeben nur für die anderen Bilder). Kleine Timeline auch direkt in den Details jedes Video-Cues. Im Mapping-Modus wählt „läuft auf“ im SHOW-Tab das Bild für den Ablauf |

## Noch offen

Echtes Syphon/Spout (nativ; bis dahin Fenster-Ausgang), Laufschrift und Tracktitel aus LJ-Link, Tempo-Erkennung aus Audio, Regel-Editor, Pult-Profile (GDTF, grandMA2-XML), LJ-Link-Seite mit mDNS, SHOW-Vorlagen/Uhrzeit-Start/Probe-Modus/LTC, Installer und Signierung. Hardware-Tests (MIDI-Controller, MA, Beamer im Nebel) stehen aus. Reihenfolge und Aufwand siehe `docs/ROADMAP.md`.

## Starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm start
```

Nur die Oberfläche im Browser (ohne Netzwerk-Eingänge und ohne Mehrfach-Ausgänge):

```bash
npm run web
```

Prüfen:

```bash
npm run check
```

## Aufbau

```
src/core/      Reine Logik ohne Oberfläche: Takt, DMX, Art-Net, sACN, OSC, LJ-Link, Katalog, Show-Zustand
src/engine/    WebGL2-Renderer und Shader
src/main/      Electron: Fenster, Ausgänge, Netzwerk-Eingänge
src/renderer/  Oberfläche und Ausgangsfenster
tests/         Tests für src/core
docs/          Architektur, LJ-Link-Protokoll
```

## Technik-Entscheidung

Electron mit TypeScript und WebGL2. Gründe: nur Bausteine mit freizügigen Lizenzen (MIT, Apache, BSD), läuft auf macOS und Windows, jede Oberfläche ist zugleich die spätere Fernbedienung, und Ausgabe und Oberfläche laufen in getrennten Prozessen. Das Konzept sah zuerst Rust und wgpu vor. Die Engine ist so gekapselt (`src/engine`), dass sie später ersetzt werden kann, wenn die Leistung es verlangt.

## Sicherheit im Live-Betrieb

Schnelle Blitze, Strobe und starke Farbwechsel können bei Menschen mit fotosensitiver Epilepsie Anfälle auslösen. Halte die Blitzfrequenz niedrig (höchstens drei Blitze pro Sekunde), kündige Strobe-Effekte an, wenn der Veranstalter das verlangt, und beachte die Regeln des Veranstaltungsorts. Richte helle Projektorstrahlen im Nebel nicht in Augenhöhe auf das Publikum. Software kann ausfallen: Halte für die Show einen Plan B bereit. VJ-Link zeigt diesen Hinweis vor dem ersten Ausgang; „Sichere Blitze“ (Einstellungen → Sicherheit, Standard an) begrenzt Strobe, Strobe White, Ebenen-Strobe, Farb-Strobe und Beat-Invert auf 3 Blitze pro Sekunde.

Art-Net, sACN, OSC und der LJ-Link-Eingang haben keine Anmeldung (Branchenstandard). Trenne Show-Netz und Gäste-WLAN und erlaube in der Firewall nur das private Show-Netz.

Auch der Suite-Chat (Alpha) hat keine Anmeldung und ist ab Werk an: Jeder im selben Netzwerk mit einem Suite-Programm kann mitlesen, schreiben und Notfall-Popups im Bedienfenster auslösen (höchstens 3 je Programm in 60 Sekunden, höchstens 20 offen; auf den Ausgängen erscheint nie etwas). Ausschalten unter Einstellungen → Suite-Chat; dann sendet und liest VJ-Link keine Chat-Nachrichten.

## Lizenz

Eclipse Public License 2.0, siehe `LICENSE`. Drittanbieter-Bausteine und ihre Lizenzen: `THIRD_PARTY.md`; die App liefert alle Lizenztexte in `THIRD_PARTY_LICENSES.txt` mit (Hilfe → Lizenzen und Hinweise).

Art-Net™ Designed by and Copyright Artistic Licence Holdings Ltd. VJ-Link ist ein unabhängiges Projekt und kein offizielles Produkt der genannten Hersteller; alle Marken gehören ihren Inhabern. Ableton und Link sind Marken der Ableton AG.

[Impressum](https://skyplayser.github.io/VJ-LINK/impressum.html) · [Datenschutz](https://skyplayser.github.io/VJ-LINK/datenschutz.html)

