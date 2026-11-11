from wikilib import *

group("Help", "Hilfe")


@page("wiki-help.html", "Troubleshooting", "Fehlersuche")
def _():
    body = SEC(
        H2("The output stays black", "Der Ausgang bleibt schwarz"),
        UL(("Is **BLACKOUT** on, or the master at 0? Is a clip running on a layer with opacity above 0?", "Ist **BLACKOUT** an oder der Master auf 0? Läuft ein Clip auf einer Ebene mit Deckkraft über 0?"),
           ("A desk on Art-Net: master channel 1 at 0 makes everything black, channel 8 above 250 is blackout.", "Ein Pult auf Art-Net: Master-Kanal 1 auf 0 macht alles schwarz, Kanal 8 über 250 ist Blackout."),
           ("A camera mask (Mask positive) on the top layer without a person in the picture shows nothing; that is right.", "Eine Kamera-Maske (Maske positiv) auf der obersten Ebene ohne Person im Bild zeigt nichts; das ist richtig.")),
        H2("The desk does not arrive", "Das Pult kommt nicht an"),
        UL(("CONNECT shows the packets: does the counter rise? If not, check network, IP range and (Windows) the firewall for private networks. If it rises but nothing reacts, the desk sends on another universe: VJ-Link says so in a message and on the Art-Net card (⚠ Desk sends on universe …).", "VERBINDEN zeigt die Pakete: Steigt der Zähler? Wenn nicht, Netz, IP-Bereich und (Windows) die Firewall für private Netzwerke prüfen. Steigt er, aber nichts reagiert, sendet das Pult auf einem anderen Universe: VJ-Link sagt das per Meldung und auf der Art-Net-Karte (⚠ Pult sendet auf Universe …)."),
           ("Art-Net universes count from 0, sACN from 1. Check the start address.", "Art-Net-Universes zählen ab 0, sACN ab 1. Startadresse prüfen."),
           ("Only changing channels take effect: move the fader once.", "Nur Kanäle, die sich ändern, wirken: Fader einmal bewegen.")),
        H2("No camera", "Keine Kamera"),
        UL(("macOS: System Settings → Privacy & Security → Camera → switch on VJ-Link, then restart VJ-Link.", "macOS: Systemeinstellungen → Datenschutz & Sicherheit → Kamera → VJ-Link einschalten, dann VJ-Link neu starten."),
           ("OBS Virtual Camera only appears while OBS runs and the virtual camera is started.", "Die OBS Virtual Camera erscheint nur, solange OBS läuft und die virtuelle Kamera gestartet ist."),
           ("The person detection needs a second or two to start the first time.", "Die Personen-Erkennung braucht beim ersten Mal ein, zwei Sekunden zum Starten.")),
        H2("LJ-Link is not found", "LJ-Link wird nicht gefunden"),
        UL(("Both computers in the same network, Wi-Fi and cable count as the same network if the IP range matches.", "Beide Rechner im selben Netz; WLAN und Kabel zählen als dasselbe Netz, wenn der IP-Bereich passt."),
           ("Enter the address under CONNECT → LJ-Link (for example `192.168.1.20` or `192.168.1.20:8080`).", "Die Adresse unter VERBINDEN → LJ-Link eintragen (zum Beispiel `192.168.1.20` oder `192.168.1.20:8080`).")),
        H2("A video does not play", "Ein Video läuft nicht"),
        P("MP4 with H.264 and WebM always work. Convert other files, for example with HandBrake.", "MP4 mit H.264 und WebM gehen immer. Andere Dateien umwandeln, etwa mit HandBrake."),
        H2("Report a problem", "Fehler melden", "report"),
        P("In VJ-Link: **Help → Report a problem** (also under Settings and on the start screen). Describe what happened and what you did before, leave **Include diagnostic data** ticked, and send it by email to fehlermelden@nextphilm.de or as a GitHub issue.",
          "In VJ-Link: **Hilfe → Fehler melden** (auch in den Einstellungen und im Startbildschirm). Beschreib, was passiert ist und was du davor gemacht hast, lass **Diagnosedaten anhängen** angehakt und schick es per E-Mail an fehlermelden@nextphilm.de oder als GitHub-Issue."),
        IMG("report.png", "Report a problem window", "Fenster Fehler melden",
            ("You see the diagnostic data before sending.", "Du siehst die Diagnosedaten vor dem Senden.")),
        P("The diagnostic data holds the version, system, graphics card, connected devices, the state of the connections and the last error messages. No file names, no texts, no titles, no passwords. Too long for a mail link? It is saved as a file and copied to the clipboard.",
          "Die Diagnosedaten enthalten Version, System, Grafikkarte, angeschlossene Geräte, den Zustand der Verbindungen und die letzten Fehlermeldungen. Keine Dateinamen, keine Texte, keine Titel, keine Passwörter. Zu lang für einen Mail-Link? Dann werden sie als Datei gespeichert und in die Zwischenablage gelegt."),
        H2("Feedback and wishes", "Feedback und Wünsche", "feedback"),
        P("VJ-Link is a community project and lives on your feedback. **Help → Give feedback** works like reporting a problem, with a rating of 1 to 5 stars; diagnostic data only goes along if you tick it. When you quit, a small note offers the same, plus a link to share VJ-Link with friends. Tick **Don't show this when quitting** in the note, or switch it under **Settings → About VJ-Link**. While outputs are live it does not appear. Nothing is sent by itself: only when you click email or GitHub.",
          "VJ-Link ist ein Community-Projekt und lebt von eurem Feedback. **Hilfe → Feedback geben** funktioniert wie Fehler melden, mit einer Bewertung von 1 bis 5 Sternen; Diagnosedaten gehen nur mit, wenn du sie anhakst. Beim Beenden bietet ein kleiner Hinweis dasselbe an und dazu einen Link, um VJ-Link an Freunde weiterzugeben. Abschalten mit **Beim Beenden nicht mehr zeigen** im Hinweis oder unter **Einstellungen → Über VJ-Link**. Sind Ausgänge live, erscheint er nicht. Nichts wird von selbst gesendet, nur wenn du auf E-Mail oder GitHub klickst."),
    )
    return (("Troubleshooting: fix VJ-Link problems", "Fehlersuche: Probleme mit VJ-Link lösen"),
            ("Fix common VJ-Link problems: black output, desk not arriving, no camera, LJ-Link not found, videos not playing – and how to report a problem.",
             "Häufige VJ-Link-Probleme lösen: schwarzer Ausgang, Pult kommt nicht an, keine Kamera, LJ-Link nicht gefunden, Video läuft nicht – und Fehler melden."),
            ("Help", "Hilfe"), ("Troubleshooting", "Fehlersuche"),
            ("What to check first, and how to tell us.", "Was du zuerst prüfst und wie du es uns sagst."), body)


@page("wiki-reference.html", "Reference", "Referenz")
def _():
    body = SEC(
        H2("OSC", "OSC", "osc"),
        P("UDP port **8000**. Values 0–1, 0–127 or 0–255.", "UDP-Port **8000**. Werte 0–1, 0–127 oder 0–255."),
        TABLE([("Address", "Adresse"), ("Argument", "Argument"), ("Does", "Macht")], [
            ["<code>/vjlink/ctl/&lt;id&gt;</code>", ("value", "Wert"), ("sets any control, see the ids below", "setzt jedes Element, IDs siehe unten")],
            ["<code>/vjlink/scene/go</code>", ("number from 1", "Nummer ab 1"), ("recalls a scene", "ruft eine Szene ab")],
            ["<code>/vjlink/scene/next</code>, <code>/vjlink/scene/prev</code>", "–", ("next or previous scene", "nächste oder vorige Szene")],
            ["<code>/vjlink/master/dimmer</code>", "0–1", ("master", "Master")],
            ["<code>/vjlink/blackout</code>", "0 / 1", ("blackout", "Blackout")],
            ["<code>/vjlink/bpm</code>", "BPM", ("sets the tempo (for example 128)", "setzt das Tempo (zum Beispiel 128)")],
            ["<code>/vjlink/tap</code>", "–", ("tap tempo", "Tap-Tempo")],
            ["<code>/vjlink/layer/&lt;n&gt;/opacity</code>", "0–1", ("opacity of layer n", "Deckkraft der Ebene n")],
            ["<code>/vjlink/layer/&lt;n&gt;/clip</code>", ("number", "Nummer"), ("starts the visual with this number on layer n", "startet das Visual mit dieser Nummer auf Ebene n")],
            ["<code>/vjlink/slot/&lt;a–e&gt;/rgb</code>", "r g b", ("sets a color slot", "setzt einen Farbslot")],
        ]),
        H3("Control ids", "Element-IDs"),
        TABLE([("Id", "ID"), ("Control", "Element")], [
            ["<code>master</code>, <code>blackout</code>, <code>fx.master</code>", ("master, blackout, effect master", "Master, Blackout, Effekt-Master")],
            ["<code>strobe.on</code>, <code>strobe.flash</code>, <code>strobe.white</code>, <code>strobe.whiteFlash</code>, <code>blinder</code>, <code>strobe.sync</code>, <code>strobe.speed</code>, <code>strobe.intensity</code>", ("strobe buttons and faders", "Strobe-Tasten und -Fader")],
            ["<code>tempo.tap</code>, <code>tempo.bpm</code>, <code>tempo.factor</code>, <code>transition.beats</code>", ("tempo and transition", "Tempo und Blende")],
            ["<code>layer.&lt;n&gt;.opacity</code>, <code>.color</code>, <code>.blend</code>, <code>.drive</code>, <code>.clear</code>, <code>.fx.1</code>–<code>.fx.3</code>, <code>.laser.x</code>, <code>.laser.y</code>, <code>.laser.size</code>, <code>.laser.rot</code>, <code>.laser.thick</code>, <code>.laser.xy</code>", ("per layer 1–8", "je Ebene 1–8")],
            ["<code>slot.&lt;A–E&gt;.hue</code>, <code>slot.&lt;A–E&gt;.r</code>, <code>.g</code>, <code>.b</code>", ("color slots", "Farbslots")],
            ["<code>scene.&lt;1–32&gt;</code>, <code>scene.next</code>, <code>scene.prev</code>, <code>scene.auto</code>", ("scenes", "Szenen")],
            ["<code>show.go</code>, <code>show.back</code>, <code>show.stop</code>, <code>tc.start</code>, <code>tc.stop</code>, <code>tc.zero</code>", ("SHOW and timecode", "SHOW und Timecode")],
            ["<code>test.toggle</code>, <code>test.next</code>, <code>test.prev</code>", ("test patterns", "Testbilder")],
            ["<code>bild.&lt;1–5&gt;.hell</code>, <code>bild.&lt;n&gt;.e&lt;k&gt;</code>, <code>bild.&lt;n&gt;.bearbeiten</code>", ("pictures of the projection mapping", "Bilder des Projektionsmappings")],
            ["<code>clip.&lt;layer&gt;.&lt;clip id&gt;</code>", ("start a clip on a layer", "einen Clip auf einer Ebene starten")],
        ]),
        H2("Keyboard", "Tastatur"),
        TABLE([("Key", "Taste"), ("Does", "Macht")], [
            [("Space", "Leertaste"), ("GO in SHOW", "WEITER in der SHOW")],
            ["1–9", ("recall scene", "Szene abrufen")],
            [("← →", "← →"), ("previous / next scene", "vorige / nächste Szene")],
            ["B", ("blackout on/off", "Blackout an/aus")],
            ["F, W", ("flash, white flash (while held)", "Blitz, Weiß-Blitz (solange gehalten)")],
            ["S", ("strobe on/off", "Strobe an/aus")],
            ["T", ("tap tempo", "Tap-Tempo")],
            ["⇧⌘K, ⇧⌘M, ⇧⌘D, ⇧⌘O", ("mapping for keyboard, MIDI, DMX, OSC", "Mapping für Tastatur, MIDI, DMX, OSC")],
            ["⇧⌘L", ("modulation", "Modulation")],
            ["⌘N, ⌘O, ⌘S, ⇧⌘S", ("new, open, save, save as", "neu, öffnen, speichern, speichern unter")],
            ["Esc", ("closes panels and menus, ends mapping, and closes an output that covers the main window (an output on a projector ignores Esc)", "schließt Panels und Menüs, beendet Mapping und schließt einen Ausgang, der das Hauptfenster verdeckt (ein Ausgang auf einem Beamer ignoriert Esc)")],
        ]),
        H2("Network ports", "Netzwerk-Ports"),
        TABLE([("Port", "Port"), ("Use", "Zweck")], [
            ["UDP 6454", ("Art-Net in, Art-Net timecode in and out", "Art-Net rein, Art-Net-Timecode rein und raus")],
            ["UDP 5568", ("sACN in (multicast)", "sACN rein (Multicast)")],
            ["UDP 8000", ("OSC in", "OSC rein")],
            ["TCP 8080", ("LJ-Link (VJ-Link connects to it)", "LJ-Link (VJ-Link verbindet sich dorthin)")],
            ["TCP 17000", ("Carabiner for Ableton Link (local)", "Carabiner für Ableton Link (lokal)")],
            ["TCP 9099", ("WebSocket in for own integrations", "WebSocket rein für eigene Anbindungen")],
        ]),
    )
    return (("Reference: OSC addresses, IDs, keys, ports", "Referenz: OSC-Adressen, IDs, Tasten, Ports"),
            ("VJ-Link reference: all OSC addresses, control ids for /vjlink/ctl, keyboard shortcuts and network ports for Art-Net, sACN, OSC, LJ-Link and Carabiner.",
             "VJ-Link-Referenz: alle OSC-Adressen, Element-IDs für /vjlink/ctl, Tastenkürzel und Netzwerk-Ports für Art-Net, sACN, OSC, LJ-Link und Carabiner."),
            ("Help", "Hilfe"), ("Reference", "Referenz"),
            ("Everything to look up.", "Alles zum Nachschlagen."), body)


@page("wiki-glossary.html", "Glossary", "Glossar")
def _():
    terms = [
        ("Art-Net", "Art-Net", "DMX over the network (UDP). Universes count from 0.", "DMX über das Netzwerk (UDP). Universes zählen ab 0."),
        ("sACN", "sACN", "Streaming ACN (E1.31), DMX over the network as multicast. Universes count from 1.", "Streaming ACN (E1.31), DMX über das Netzwerk als Multicast. Universes zählen ab 1."),
        ("Universe", "Universe", "512 DMX channels.", "512 DMX-Kanäle."),
        ("Clip", "Clip", "Anything a layer can play: a visual, a graphic, a video, a text, a camera.", "Alles, was eine Ebene spielen kann: ein Visual, eine Grafik, ein Video, ein Text, eine Kamera."),
        ("Layer", "Ebene", "One level of the picture with its own clip, effects, colors and opacity.", "Eine Lage des Bildes mit eigenem Clip, Effekten, Farben und Deckkraft."),
        ("Color slot", "Farbslot", "One of five show colors A–E that the desk can set.", "Eine von fünf Show-Farben A–E, die das Pult setzen kann."),
        ("Drive", "Antrieb", "Where a layer's pulsing comes from: audio, beat or none.", "Woher das Pulsieren einer Ebene kommt: Audio, Takt oder keins."),
        ("Scene", "Szene", "A saved state of all layers, recalled with a transition.", "Ein gespeicherter Zustand aller Ebenen, mit Übergang abgerufen."),
        ("Cue", "Cue", "One step in the SHOW running order.", "Ein Schritt im SHOW-Ablauf."),
        ("Phrase", "Phrase", "A part of a track, usually 16 or 32 bars; LJ-Link reports when a new one starts.", "Ein Teil eines Tracks, meist 16 oder 32 Takte; LJ-Link meldet, wenn ein neuer beginnt."),
        ("Canvas", "Leinwand", "A surface on the projector picture in projection mapping, or the shared picture across several screens.", "Eine Fläche auf dem Beamerbild im Projektionsmapping oder das gemeinsame Bild über mehrere Bildschirme."),
        ("Corner pin", "Eckpunkt-Verzerrung", "Fitting a rectangle to four corners on a wall or box.", "Ein Rechteck an vier Ecken auf einer Wand oder Kiste anpassen."),
        ("LFO", "LFO", "Low frequency oscillator: a slow wave that moves a fader in time.", "Low Frequency Oscillator: eine langsame Welle, die einen Regler im Takt bewegt."),
        ("Timecode", "Timecode", "A running time (hours:minutes:seconds:frames) that keeps shows in sync.", "Eine laufende Zeit (Stunden:Minuten:Sekunden:Frames), die Shows synchron hält."),
        ("Lightjockey (LJ)", "Lichtjockey (LJ)", "The person who runs light (and here video) live to the DJ's music.", "Die Person, die Licht (und hier Video) live zur Musik des DJs fährt."),
    ]
    body = SEC(TABLE([("Term", "Begriff"), ("Meaning", "Bedeutung")], [[(f"**{a}**", f"**{b}**"), (c, d)] for a, b, c, d in terms]))
    return (("Glossary: Art-Net, sACN, DMX and VJ terms", "Glossar: Art-Net, sACN, DMX und VJ-Begriffe"),
            ("VJ-Link glossary: Art-Net, sACN, universe, clip, layer, color slot, drive, scene, cue, phrase, canvas, corner pin, LFO and timecode explained.",
             "VJ-Link-Glossar: Art-Net, sACN, Universe, Clip, Ebene, Farbslot, Antrieb, Szene, Cue, Phrase, Leinwand, Eckpunkt-Verzerrung, LFO und Timecode erklärt."),
            ("Help", "Hilfe"), ("Glossary", "Glossar"),
            ("The words used in VJ-Link.", "Die Begriffe in VJ-Link."), body)
