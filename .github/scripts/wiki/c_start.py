from wikilib import *

group("Start", "Start")


@page("wiki.html", "Overview", "Übersicht")
def _():
    body = SEC(
        ADM("alpha", ("This wiki describes the first public alpha **0.0.1**. Many parts have not met real stage hardware yet; every page says what is tested and what is not.",
                      "Dieses Wiki beschreibt die erste öffentliche Alpha **0.0.1**. Viele Teile haben noch keine echte Bühnentechnik gesehen; jede Seite sagt, was getestet ist und was nicht.")),
        H2("What VJ-Link does", "Was VJ-Link macht"),
        P("VJ-Link plays live visuals on screens, projectors and LED walls. The light desk leads: it recalls scenes, sets the colors, the brightness, the strobe and the blackout. The tempo comes from the music, best from [LJ-Link](wiki-ljlink.html), so everything moves in time without anybody tapping.",
          "VJ-Link spielt Live-Visuals auf Bildschirmen, Beamern und LED-Wänden. Das Lichtpult führt: Es ruft Szenen ab und setzt Farben, Helligkeit, Strobe und Blackout. Das Tempo kommt aus der Musik, am besten aus [LJ-Link](wiki-ljlink.html), sodass alles im Takt läuft, ohne dass jemand tappen muss."),
        UL(("**Local:** no account, no cloud, no telemetry. Only the update check and a problem report you send yourself use the internet.",
            "**Lokal:** kein Konto, keine Cloud, keine Telemetrie. Nur die Update-Prüfung und eine Fehlermeldung, die du selbst schickst, nutzen das Internet."),
           ("**Free** for macOS and Windows.", "**Kostenlos** für macOS und Windows."),
           ("**English and German**, chosen from the system language and switchable on the start screen.", "**Deutsch und Englisch**, aus der Systemsprache gewählt und im Startbildschirm umschaltbar.")),
        IMG("visuals.png", "VJ-Link main view with layers, clip grid, color slots and scenes", "Hauptansicht von VJ-Link mit Ebenen, Clip-Raster, Farbslots und Szenen",
            ("The VISUALS tab with the demo show: eight layers, each with its row of clips.", "Der Tab VISUALS mit der Demo-Show: acht Ebenen, jede mit ihrer Zeile Clips.")),
        H2("How this wiki is organised", "So ist das Wiki aufgebaut"),
        CARDS(("🚀", "wiki-quickstart.html", "Start", "Start", "Quick start, installation, the interface and use cases.", "Schnellstart, Installation, die Oberfläche und Anwendungsfälle."),
              ("🎨", "wiki-layers.html", "Visuals", "Visuals", "Layers, the 150 visuals, effects, logos, videos, text and cameras.", "Ebenen, die 150 Visuals, Effekte, Logos, Videos, Text und Kameras."),
              ("🎛️", "wiki-desk.html", "Control", "Steuerung", "Light desk, mapping, tempo, LJ-Link and modulation.", "Lichtpult, Mapping, Tempo, LJ-Link und Modulation."),
              ("🖥️", "wiki-outputs.html", "Outputs", "Ausgänge", "Screens, canvas, window output, test patterns and projection mapping.", "Bildschirme, Leinwand, Fenster-Ausgang, Testbilder und Projektionsmapping."),
              ("🎬", "wiki-scenes.html", "Show", "Show", "Scenes, the SHOW running order with timeline, timecode and projects.", "Szenen, der SHOW-Ablauf mit Timeline, Timecode und Projekte."),
              ("🛟", "wiki-help.html", "Help", "Hilfe", "Troubleshooting, reporting a problem, reference and glossary.", "Fehlersuche, Fehler melden, Nachschlagen und Glossar.")),
        H2("What the status means", "Was der Stand bedeutet"),
        TABLE([("Status", "Stand"), ("Meaning", "Bedeutung")], [
            [BADGE("stable", "Tested", "Getestet"), ("Tried on the real device or in the real program.", "Am echten Gerät oder im echten Programm ausprobiert.")],
            [BADGE("beta", "Built", "Gebaut"), ("Built from the manual or protocol and tested in the app, but not yet confirmed on the real device.", "Nach Handbuch oder Protokoll gebaut und in der App getestet, aber noch nicht am echten Gerät bestätigt.")],
            [BADGE("alpha"), ("New and never tried with real gear. Do not rely on it at an important event.", "Neu und noch nie mit echten Geräten probiert. Nicht bei einer wichtigen Veranstaltung darauf verlassen.")],
            [BADGE("plan"), ("Planned, not built yet.", "Geplant, noch nicht gebaut.")],
        ]),
    )
    return (("Wiki – visuals, light desk, outputs and show", "Wiki – Visuals, Lichtpult, Ausgänge und Show"),
            ("The VJ-Link wiki: install, the interface, 150 visuals and 50 effects, light desk over Art-Net and sACN, MIDI and OSC mapping, tempo from LJ-Link, outputs, projection mapping, scenes and the SHOW timeline.",
             "Das VJ-Link-Wiki: Installation, Oberfläche, 150 Visuals und 50 Effekte, Lichtpult über Art-Net und sACN, MIDI- und OSC-Mapping, Tempo aus LJ-Link, Ausgänge, Projektionsmapping, Szenen und SHOW-Timeline."),
            ("Wiki", "Wiki"), ("VJ-Link wiki", "VJ-Link-Wiki"),
            ("Everything about VJ-Link, with an honest status for every part.", "Alles über VJ-Link, mit ehrlichem Stand für jeden Teil."), body)


@page("wiki-quickstart.html", "Quick start", "Schnellstart")
def _():
    body = SEC(
        H2("What you need", "Was du brauchst"),
        UL(("A computer with **macOS 12 or newer** or **Windows 10/11** (64 bit) and a graphics card with WebGL 2.", "Einen Computer mit **macOS 12 oder neuer** oder **Windows 10/11** (64 Bit) und einer Grafikkarte mit WebGL 2."),
           ("A projector, LED wall or second screen. Without one, the preview in the program is enough to try things.", "Einen Beamer, eine LED-Wand oder einen zweiten Bildschirm. Ohne reicht zum Ausprobieren die Vorschau im Programm."),
           ("Optional: a light desk (Art-Net or sACN), a MIDI controller, [LJ-Link](wiki-ljlink.html) for the tempo, a camera.", "Optional: ein Lichtpult (Art-Net oder sACN), einen MIDI-Controller, [LJ-Link](wiki-ljlink.html) für das Tempo, eine Kamera.")),
        H2("Five steps", "Fünf Schritte"),
        STEPS(("**Install.** Download the installer from the [download section](./#download). On the first start macOS and Windows warn once because the app is not signed yet: [how to open it anyway](wiki-install.html).",
               "**Installieren.** Den Installer im [Download-Bereich](./#download) laden. Beim ersten Start warnen macOS und Windows einmal, weil die App noch nicht signiert ist: [So öffnest du sie trotzdem](wiki-install.html)."),
              ("**Open the demo.** On the start screen click **Open demo**. Eight layers and ten scenes are set up, and **Auto** plays the scenes one after another.",
               "**Demo öffnen.** Im Startbildschirm auf **Demo öffnen** klicken. Acht Ebenen und zehn Szenen sind eingerichtet, und **Auto** spielt die Szenen nacheinander ab."),
              ("**Open an output.** Tab **OUTPUT**: click the projector or LED wall and open it as an output. The picture appears there in full screen.",
               "**Ausgang öffnen.** Tab **AUSGABE**: den Beamer oder die LED-Wand anklicken und als Ausgang öffnen. Dort erscheint das Bild im Vollbild."),
              ("**Bring in the tempo.** Is LJ-Link running in the same network? VJ-Link finds it by itself. Otherwise click **TAP** in the beat or type the BPM.",
               "**Tempo holen.** Läuft LJ-Link im selben Netz? Dann findet VJ-Link es von selbst. Sonst im Takt auf **TAP** klicken oder das BPM eintippen."),
              ("**Take control.** Under **CONNECT** set the Art-Net or sACN universe of your desk, or click **MAPPING → MIDI** and assign your controller.",
               "**Steuern.** Unter **VERBINDEN** das Art-Net- oder sACN-Universe deines Pults einstellen oder **MAPPING → MIDI** anklicken und den Controller zuweisen.")),
        IMG("start.png", "Start screen of VJ-Link", "Startbildschirm von VJ-Link",
            ("The start screen: continue, a new project, open a file or the demo. On the right the language, updates and recent projects.", "Der Startbildschirm: weiterarbeiten, neues Projekt, Datei öffnen oder die Demo. Rechts Sprache, Updates und zuletzt geöffnete Projekte.")),
        H2("Next steps", "Wie es weitergeht"),
        UL(("Build your own scenes: [layers and clips](wiki-layers.html), then [scenes](wiki-scenes.html).", "Eigene Szenen bauen: [Ebenen und Clips](wiki-layers.html), dann [Szenen](wiki-scenes.html)."),
           ("Patch VJ-Link on the desk: [light desk](wiki-desk.html).", "VJ-Link am Pult patchen: [Lichtpult](wiki-desk.html)."),
           ("Several screens or a wall: [outputs](wiki-outputs.html) and [projection mapping](wiki-mapping-projection.html).", "Mehrere Bildschirme oder eine Wand: [Ausgänge](wiki-outputs.html) und [Projektionsmapping](wiki-mapping-projection.html).")),
    )
    return (("Quick start", "Schnellstart"),
            ("VJ-Link quick start: install, open the demo show, open the projector as an output, get the tempo from LJ-Link and control it from the desk or a MIDI controller.",
             "VJ-Link-Schnellstart: installieren, Demo-Show öffnen, Beamer als Ausgang öffnen, Tempo aus LJ-Link holen und vom Pult oder MIDI-Controller steuern."),
            ("Start", "Start"), ("Quick start", "Schnellstart"),
            ("From download to the first picture on the projector in five minutes.", "In fünf Minuten vom Download zum ersten Bild auf dem Beamer."), body)


@page("wiki-install.html", "Install and update", "Installieren und aktualisieren")
def _():
    body = SEC(
        H2("Which file", "Welche Datei"),
        TABLE([("Computer", "Computer"), ("File", "Datei")], [
            [("Mac with Apple chip (M1 and newer)", "Mac mit Apple-Chip (M1 und neuer)"), "<code>VJ-Link-macos-arm64.dmg</code>"],
            [("Mac with Intel processor", "Mac mit Intel-Prozessor"), "<code>VJ-Link-macos-intel.dmg</code>"],
            ["Windows 10 / 11, 64 bit", "<code>VJ-Link-windows.exe</code>"],
        ]),
        H2("macOS", "macOS"),
        STEPS(("Open the `.dmg` and drag **VJ-Link** into **Applications**.", "Die `.dmg` öffnen und **VJ-Link** in **Programme** ziehen."),
              ("Start VJ-Link once. macOS says “VJ-Link” Not Opened: press **Done**.", "VJ-Link einmal starten. macOS meldet „VJ-Link“ nicht geöffnet: **Fertig** drücken."),
              ("**System Settings** → **Privacy & Security**, scroll down, **Open Anyway**, confirm, then **Open**.", "**Systemeinstellungen** → **Datenschutz & Sicherheit**, nach unten scrollen, **Dennoch öffnen**, bestätigen, dann **Öffnen**."),
              ("Allow the **camera**, the **microphone** and the **local network** when macOS asks and you need them.", "**Kamera**, **Mikrofon** und **lokales Netzwerk** erlauben, wenn macOS fragt und du sie brauchst.")),
        ADM("note", ("Camera blocked? System Settings → **Privacy & Security** → **Camera** → switch VJ-Link on and restart VJ-Link. The program also offers a button for this.",
                     "Kamera gesperrt? Systemeinstellungen → **Datenschutz & Sicherheit** → **Kamera** → VJ-Link einschalten und VJ-Link neu starten. Das Programm bietet dafür auch einen Knopf an."),
            ("For experts, this removes the warning for good:", "Für Profis, damit verschwindet die Warnung dauerhaft:"), PRE('xattr -dr com.apple.quarantine "/Applications/VJ-Link.app"')),
        H2("Windows", "Windows"),
        STEPS(("Start `VJ-Link-windows.exe`. In the SmartScreen window press **More info**, then **Run anyway**.", "`VJ-Link-windows.exe` starten. Im SmartScreen-Fenster **Weitere Informationen**, dann **Trotzdem ausführen** drücken."),
              ("Click through the installer.", "Den Installer durchklicken."),
              ("When the firewall asks, tick **Private networks** and allow access. Without it Art-Net, sACN, OSC and LJ-Link cannot reach VJ-Link.", "Fragt die Firewall, **Private Netzwerke** anhaken und zulassen. Ohne das erreichen Art-Net, sACN, OSC und LJ-Link VJ-Link nicht.")),
        ADM("warn", ("Windows is built but **not tested yet** in this alpha. Please tell us how it runs: [report a problem](wiki-help.html#report).",
                     "Windows ist gebaut, in dieser Alpha aber **noch nicht getestet**. Sag uns bitte, wie es läuft: [Fehler melden](wiki-help.html#report).")),
        H2("Updates", "Updates"),
        P("The start screen checks GitHub for a new version, at most once an hour, and **Settings → Update** does it on request. **Download and install** loads the new version: on a Mac VJ-Link quits, replaces itself and starts again; on Windows the installer opens. The project is saved all the time, nothing is lost.",
          "Der Startbildschirm fragt höchstens einmal pro Stunde bei GitHub nach einer neuen Version, **Einstellungen → Update** auf Wunsch. **Herunterladen und installieren** lädt die neue Version: Auf dem Mac beendet sich VJ-Link, ersetzt sich und startet neu; unter Windows öffnet sich der Installer. Das Projekt wird laufend gesichert, nichts geht verloren."),
        ADM("tip", ("Update at home, not at the gig. Without internet the check just says it could not reach GitHub.", "Zu Hause aktualisieren, nicht auf dem Gig. Ohne Internet meldet die Prüfung nur, dass GitHub nicht erreichbar ist.")),
    )
    return (("Install and update", "Installieren und aktualisieren"),
            ("Install VJ-Link on macOS and Windows: which file, how to open an unsigned app, camera, microphone and network permissions, and updates.",
             "VJ-Link auf macOS und Windows installieren: welche Datei, eine nicht signierte App öffnen, Kamera-, Mikrofon- und Netzwerkrechte und Updates."),
            ("Start", "Start"), ("Install and update", "Installieren und aktualisieren"),
            ("macOS and Windows, with the warnings on the first start.", "macOS und Windows, mit den Warnungen beim ersten Start."), body)


@page("wiki-interface.html", "The interface", "Die Oberfläche")
def _():
    body = SEC(
        H2("Five tabs", "Fünf Tabs"),
        TABLE([("Tab", "Tab"), ("What it is for", "Wofür")], [
            [("**VISUALS**", "**VISUALS**"), ("The clip grid: one row per layer, the output preview, color slots, scenes and the panels of the selected layer.", "Das Clip-Raster: eine Zeile pro Ebene, die Vorschau des Ausgangs, Farbslots, Szenen und die Panels der gewählten Ebene.")],
            [("**SHOW**", "**SHOW**"), ("The running order with cues, GO and the timeline.", "Der Ablauf mit Cues, WEITER und der Timeline.")],
            [("**GALLERY**", "**GALERIE**"), ("All visuals, effects and your media with a live preview.", "Alle Visuals, Effekte und deine Medien mit Live-Vorschau.")],
            [("**OUTPUT**", "**AUSGABE**"), ("Screens, canvas, window output, test patterns and projection mapping.", "Bildschirme, Leinwand, Fenster-Ausgang, Testbilder und Projektionsmapping.")],
            [("**CONNECT**", "**VERBINDEN**"), ("Art-Net, sACN, OSC, LJ-Link and live DMX values.", "Art-Net, sACN, OSC, LJ-Link und DMX-Live-Werte.")],
        ]),
        H2("Top bar", "Obere Leiste"),
        UL(("**MAPPING** switches the mapping mode for keyboard, MIDI, DMX and OSC, and modulation.", "**MAPPING** schaltet den Zuweisungs-Modus für Tastatur, MIDI, DMX und OSC sowie die Modulation."),
           ("**AUDIO** chooses the audio input for equalizers and audio-reactive visuals.", "**AUDIO** wählt den Audio-Eingang für Equalizer und audio-reaktive Visuals."),
           ("**BPM**: click and type a tempo; next to it the tempo source (Auto, LJ-Link, Ableton Link, OSC, manual) and **TAP**.", "**BPM**: anklicken und ein Tempo eintippen; daneben die Tempo-Quelle (Auto, LJ-Link, Ableton Link, OSC, Manuell) und **TAP**."),
           ("Status pills for DMX, OSC, LJ-LINK, LINK and MIDI, the frame rate, the **lock** for the show, the **settings** and **BLACKOUT**.", "Statusanzeigen für DMX, OSC, LJ-LINK, LINK und MIDI, die Bildrate, das **Schloss** für die Show, die **Einstellungen** und **BLACKOUT**.")),
        H2("Fader bar", "Fader-Leiste"),
        P("Always at the bottom: master and blackout, one fader per layer, the effect master, strobe with speed and intensity plus Strobe, Flash, White, W-Flash, Blinder and Beat, tap, the transition time and the scene buttons with Next and Auto.",
          "Immer unten: Master und Blackout, ein Fader pro Ebene, der Effekt-Master, Strobe mit Speed und Intensität sowie Strobe, Flash, White, W-Flash, Blinder und Takt, Tap, die Blende und die Szenen-Tasten mit Weiter und Auto."),
        IMG("visuals-layer.png", "VJ-Link with the panels of the laser layer", "VJ-Link mit den Panels der Laser-Ebene",
            ("Click a layer name to edit its effects, colors, drive and position on the right.", "Klick auf einen Ebenen-Namen, um rechts Effekte, Farben, Antrieb und Lage zu bearbeiten.")),
        H2("Settings", "Einstellungen"),
        P("The gear opens audio input and output, timecode, MIDI devices, DMX and network, interface size, **Update** and **Report a problem**.",
          "Das Zahnrad öffnet Audio-Eingang und -Ausgang, Timecode, MIDI-Geräte, DMX und Netzwerk, die Oberflächengröße, **Update** und **Fehler melden**."),
        H2("Lock mode", "Sperrmodus"),
        P("The lock at the top: during the show you can still operate everything (faders, clips, scenes, effect strengths, GO, blackout), but nothing can be deleted, added, renamed or loaded. Hold the lock for one second to unlock.",
          "Das Schloss oben: Während der Show lässt sich weiter alles bedienen (Fader, Clips, Szenen, Effekt-Stärken, WEITER, Blackout), aber nichts löschen, hinzufügen, umbenennen oder laden. Zum Entsperren das Schloss eine Sekunde gedrückt halten."),
    )
    return (("The interface", "Die Oberfläche"),
            ("A tour of the VJ-Link interface: the five tabs, top bar, fader bar, layer panels, settings and lock mode.",
             "Ein Rundgang durch die VJ-Link-Oberfläche: die fünf Tabs, obere Leiste, Fader-Leiste, Ebenen-Panels, Einstellungen und Sperrmodus."),
            ("Start", "Start"), ("The interface", "Die Oberfläche"),
            ("What every part of the screen is for.", "Wofür jeder Teil des Bildschirms da ist."), body)


@page("wiki-use-cases.html", "Use cases", "Anwendungsfälle")
def _():
    body = SEC(
        H2("Club with LED wall and grandMA", "Club mit LED-Wand und grandMA"),
        P("LJ-Link reads the CDJs, VJ-Link gets the tempo and the phrase changes from it. The grandMA has VJ-Link patched as a fixture over Art-Net: one executor per scene, the color slots follow the light. The LED wall is the output, in its native resolution.",
          "LJ-Link liest die CDJs, VJ-Link bekommt Tempo und Phrasenwechsel daraus. Am grandMA ist VJ-Link als Gerät über Art-Net gepatcht: ein Executor pro Szene, die Farbslots folgen dem Licht. Die LED-Wand ist der Ausgang, in ihrer nativen Auflösung."),
        DIAGRAM(720, 220, {"cdj": (90, 60, 140, 48, "dj", ("CDJs + DJM", "CDJs + DJM"), None),
                           "lj": (300, 60, 140, 48, "pc", ("LJ-Link", "LJ-Link"), ("tempo, phrases", "Tempo, Phrasen")),
                           "vj": (510, 110, 140, 52, "pc", ("VJ-Link", "VJ-Link"), ("visuals", "Visuals")),
                           "ma": (300, 170, 140, 48, "desk", ("grandMA", "grandMA"), ("Art-Net", "Art-Net")),
                           "wall": (660, 110, 90, 48, "tab", ("LED wall", "LED-Wand"), None)},
                [("cdj", "lj", "cable", None), ("lj", "vj", "cable", None), ("ma", "vj", "dmx", ("Art-Net", "Art-Net")), ("vj", "wall", "cable", ("HDMI", "HDMI"))],
                cap=("Tempo from LJ-Link, scenes and colors from the desk.", "Tempo aus LJ-Link, Szenen und Farben vom Pult.")),
        H2("Mobile DJ with one projector", "Mobiler DJ mit einem Beamer"),
        P("One laptop, one projector, no desk. Open the demo or a project, add the logo of the couple or the company as a clip, switch on **Auto** and let the scenes run in time. A MIDI controller like the APC mini gives you clips and scenes on pads.",
          "Ein Laptop, ein Beamer, kein Pult. Die Demo oder ein Projekt öffnen, das Logo des Paares oder der Firma als Clip dazu, **Auto** einschalten und die Szenen im Takt laufen lassen. Ein MIDI-Controller wie der APC mini legt Clips und Szenen auf Pads."),
        H2("Event with several screens", "Event mit mehreren Bildschirmen"),
        P("Choose **Canvas** under OUTPUT and arrange the screens: one picture runs seamlessly across all of them. Videos and sponsor logos as cues in SHOW, the headliner show started by timecode from the desk.",
          "Unter AUSGABE **Leinwand** wählen und die Bildschirme anordnen: Ein Bild läuft nahtlos über alle. Videos und Sponsorenlogos als Cues in der SHOW, die Headliner-Show per Timecode vom Pult gestartet."),
        H2("Projection onto a set", "Projektion auf ein Bühnenbild"),
        P("**Projection mapping**: lay canvases onto boxes, columns and walls, bend them with a grid, black out doors with masks. Each canvas can show its own picture with its own layers.",
          "**Projektionsmapping**: Leinwände auf Kisten, Säulen und Wände legen, mit einem Raster biegen, Türen mit Masken schwärzen. Jede Leinwand kann ein eigenes Bild mit eigenen Ebenen zeigen."),
        H2("Dance floor camera", "Kamera auf die Tanzfläche"),
        P("A webcam on the DJ booth, the look **Mask positive** on the top layer: the visuals only appear inside the people. Person detection runs on the computer itself.",
          "Eine Webcam am DJ-Pult, der Look **Maske positiv** auf der obersten Ebene: Die Visuals erscheinen nur in den Personen. Die Personen-Erkennung läuft auf dem Rechner selbst."),
    )
    return (("Use cases: club, mobile DJ, event and projection", "Anwendungsfälle: Club, mobiler DJ, Event und Projektion"),
            ("VJ-Link use cases: club with LED wall and grandMA, mobile DJ with one projector, events with several screens, projection mapping and camera looks.",
             "VJ-Link-Anwendungsfälle: Club mit LED-Wand und grandMA, mobiler DJ mit einem Beamer, Events mit mehreren Bildschirmen, Projektionsmapping und Kamera-Looks."),
            ("Start", "Start"), ("Use cases", "Anwendungsfälle"),
            ("Typical setups and how VJ-Link fits in.", "Typische Aufbauten und wie VJ-Link hineinpasst."), body)
