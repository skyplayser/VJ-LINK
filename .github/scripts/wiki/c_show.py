from wikilib import *

group("Show", "Show")


@page("wiki-scenes.html", "Scenes", "Szenen")
def _():
    body = SEC(
        P("A scene is a snapshot of the layers: which clip runs where, with which colors, effects and opacity. **+ Save scene** stores the current picture; the pencil renames, overwrites, sorts or deletes it.",
          "Eine Szene ist eine Momentaufnahme der Ebenen: welcher Clip wo läuft, mit welchen Farben, Effekten und welcher Deckkraft. **+ Szene speichern** legt das aktuelle Bild ab; der Stift benennt um, überschreibt, sortiert oder löscht."),
        H2("Transition", "Übergang"),
        TABLE([("Setting", "Einstellung"), ("Choices", "Möglichkeiten")], [
            [("Transition", "Übergang"), ("like the fader Fade, cut, a number of beats or seconds", "wie Regler Blende, Schnitt, eine Zahl von Beats oder Sekunden")],
            [("Style", "Art"), ("fade, or through black", "überblenden oder über Schwarz")],
            [("Afterwards", "Danach"), ("stays, next after bars, next after seconds, next on a phrase change (from LJ-Link)", "bleibt stehen, weiter nach Takten, weiter nach Sekunden, weiter bei Phrasenwechsel (aus LJ-Link)")],
        ]),
        P("**Afterwards** only works when **Auto** is on (button at the top, fader bar or desk channel 7). With Auto the scenes run as a show on their own; the demo works like this.",
          "**Danach** wirkt nur, wenn **Auto** an ist (Knopf oben, Fader-Leiste oder Pult-Kanal 7). Mit Auto laufen die Szenen als Show von selbst; die Demo arbeitet so."),
        H2("Recall", "Abrufen"),
        UL(("Scene buttons in the panel and the fader bar, keys 1–9, arrow keys for previous and next.", "Szenen-Tasten im Panel und in der Fader-Leiste, Tasten 1–9, Pfeiltasten für zurück und weiter."),
           ("Desk channel 3 picks the scene, MIDI and OSC (`/vjlink/scene/go`, `/next`, `/prev`) and mapped buttons.", "Pult-Kanal 3 wählt die Szene, dazu MIDI und OSC (`/vjlink/scene/go`, `/next`, `/prev`) und zugewiesene Tasten."),
           ("Scene cues in SHOW and scene blocks on the timeline.", "Szenen-Cues in der SHOW und Szenen-Blöcke auf der Timeline.")),
    )
    return (("Scenes with transitions and automatic order", "Szenen mit Übergang und automatischer Abfolge"),
            ("VJ-Link scenes: save the picture, transition in beats or seconds, fade or through black, next after bars, seconds or a phrase change from LJ-Link, and recall from desk, MIDI and OSC.",
             "VJ-Link-Szenen: Bild speichern, Übergang in Beats oder Sekunden, überblenden oder über Schwarz, weiter nach Takten, Sekunden oder Phrasenwechsel aus LJ-Link, Abruf vom Pult, per MIDI und OSC."),
            ("Show", "Show"), ("Scenes", "Szenen"),
            ("The building blocks of a show.", "Die Bausteine einer Show."), body)


@page("wiki-show.html", "SHOW and timeline", "SHOW und Timeline")
def _():
    body = SEC(
        P("The **SHOW** tab is a running order of cues, like in a theatre: **GO** (space bar) starts the next one, **Back** goes one back, **Stop all** ends everything.",
          "Der Tab **SHOW** ist ein Ablauf aus Cues wie im Theater: **WEITER** (Leertaste) startet den nächsten, **Zurück** geht einen zurück, **Alles stoppen** beendet alles."),
        IMG("show.png", "SHOW tab with cues and timeline", "SHOW-Tab mit Cues und Timeline",
            ("A timeline cue from the demo: scene blocks on the upper track, strobe, W-flash, blinder and blackout below.", "Ein Timeline-Cue aus der Demo: Szenen-Blöcke auf der oberen Spur, Strobe, W-Flash, Blinder und Blackout darunter.")),
        H2("Cues", "Cues"),
        TABLE([("Cue", "Cue"), ("What it does", "Was er macht")], [
            [("Video / image", "Video / Bild"), ("plays a file over or instead of the visuals; drag files into the list", "spielt eine Datei über oder statt der Visuals; Dateien einfach in die Liste ziehen")],
            [("Camera", "Kamera"), ("shows a camera input", "zeigt einen Kamera-Eingang")],
            [("Black", "Schwarz"), ("fades the picture to black", "blendet das Bild auf Schwarz")],
            [("VJ scene", "VJ-Szene"), ("recalls a scene", "ruft eine Szene ab")],
            [("Timecode", "Timecode"), ("starts, stops or locates VJ-Link's timecode clock", "startet, stoppt oder springt mit der Timecode-Uhr von VJ-Link")],
        ]),
        P("Per cue: start by hand, after or with the previous one, by timecode, plus a wait time; trim; repeat off, x times, until GO or forever, also only a part; at the end hold, fade or go on; fade-in, volume, size, visuals off or over.",
          "Je Cue: Start von Hand, nach oder mit dem vorigen, per Timecode, dazu eine Wartezeit; kürzen; wiederholen aus, x-mal, bis WEITER oder endlos, auch nur ein Bereich; am Ende stehen bleiben, ausblenden oder weiter; Einblenden, Lautstärke, Größe, Visuals aus oder darüber."),
        H2("Timeline", "Timeline"),
        P("**Convert to timeline** (for a video, or an image or black with a duration) opens a big editor under the cue list:", "**In Timeline umwandeln** (bei einem Video oder einem Bild bzw. Schwarz mit Dauer) öffnet einen großen Editor unter der Cue-Liste:"),
        UL(("Drag scenes from the palette onto the track, change the length at the edges, drag the middle to move. Edges snap (⌥ without).", "Szenen aus der Palette auf die Spur ziehen, Länge an den Rändern ziehen, Mitte ziehen verschiebt. Kanten rasten ein (⌥ ohne)."),
           ("Or play the video and tap scenes, or press **Record** and trigger scenes live from pads, keys, MIDI or the desk.", "Oder das Video abspielen und Szenen antippen, oder **Aufnehmen** drücken und Szenen live von Pads, Tasten, MIDI oder Pult auslösen."),
           ("A second track holds effects: strobe, flash, white, W-flash, blinder and blackout.", "Eine zweite Spur hält Effekte: Strobe, Flash, White, W-Flash, Blinder und Blackout."),
           ("In gaps the scene that ran at the start applies. Each block has its own brightness.", "In Lücken gilt die Szene, die beim Start lief. Jeder Block hat eine eigene Helligkeit.")),
    )
    return (("SHOW: running order of cues with a timeline", "SHOW: Ablauf aus Cues mit Timeline"),
            ("The VJ-Link SHOW: video, image, camera, black, scene and timecode cues with GO, and a timeline with scene blocks and strobe, blinder and blackout like in an editing program.",
             "Die VJ-Link-SHOW: Video-, Bild-, Kamera-, Schwarz-, Szenen- und Timecode-Cues mit WEITER und eine Timeline mit Szenen-Blöcken und Strobe, Blinder und Blackout wie im Schnittprogramm."),
            ("Show", "Show"), ("SHOW and timeline", "SHOW und Timeline"),
            ("A show with videos and cues, started with GO.", "Eine Show mit Videos und Cues, gestartet mit WEITER."), body)


@page("wiki-timecode.html", "Timecode", "Timecode")
def _():
    body = SEC(
        P("**Settings → Timecode**. Receive and send can be switched on separately, also both at once, over **Art-Net** and **MIDI timecode**, with 24, 25, 29.97 DF and 30 fps.",
          "**Einstellungen → Timecode**. Empfangen und Senden lassen sich getrennt einschalten, auch beides gleichzeitig, über **Art-Net** und **MIDI-Timecode**, mit 24, 25, 29,97 DF und 30 fps."),
        H2("Receive", "Empfangen"),
        P("A desk or program sets the time. Cues with the start Timecode follow it, videos follow it (seek and pause), with an offset. If the signal drops out, VJ-Link runs on for 2 s or stops at once.",
          "Ein Pult oder Programm gibt die Zeit vor. Cues mit Start Timecode folgen ihm, Videos folgen (spulen und anhalten), mit Versatz. Fällt das Signal aus, läuft VJ-Link 2 s weiter oder hält sofort an."),
        H2("Send", "Senden"),
        P("VJ-Link sends its own clock or passes on the received one, for example to a grandMA whose timecode show then fires its cues. The clock is controlled by timecode cues in SHOW (start at a time, stop, locate) and by mapping.",
          "VJ-Link sendet seine eigene Uhr oder gibt die empfangene weiter, etwa an einen grandMA, dessen Timecode-Show dann ihre Cues auslöst. Die Uhr steuern Timecode-Cues in der SHOW (Start ab Zeit, Stopp, Springen) und das Mapping."),
        ADM("beta", ("Built and tested with software senders and receivers, not yet with a real desk.", "Gebaut und mit Software-Sendern und -Empfängern getestet, noch nicht mit einem echten Pult.")),
    )
    return (("Timecode in and out: Art-Net and MIDI timecode", "Timecode rein und raus: Art-Net und MIDI-Timecode"),
            ("Timecode in VJ-Link: receive Art-Net or MIDI timecode to start cues and follow videos, or send it to a grandMA timecode show.",
             "Timecode in VJ-Link: Art-Net- oder MIDI-Timecode empfangen, um Cues zu starten und Videos folgen zu lassen, oder an eine grandMA-Timecode-Show senden."),
            ("Show", "Show"), ("Timecode", "Timecode"),
            ("Cues and videos in sync with the desk.", "Cues und Videos synchron mit dem Pult."), body)


@page("wiki-projects.html", "Projects", "Projekte")
def _():
    body = SEC(
        P("VJ-Link saves the working state all the time; a crash or a power cut loses nothing. To keep a show or take it to another computer, save it as a **project file**.",
          "VJ-Link sichert den Arbeitsstand laufend; ein Absturz oder Stromausfall verliert nichts. Um eine Show aufzuheben oder auf einen anderen Rechner mitzunehmen, speicherst du sie als **Projektdatei**."),
        UL(("File menu or the project button at the top: New (⌘N), Open (⌘O), Save (⌘S), Save as (⇧⌘S), recently opened.", "Menü Ablage oder der Projektknopf oben: Neu (⌘N), Öffnen (⌘O), Speichern (⌘S), Speichern unter (⇧⌘S), zuletzt geöffnet."),
           ("A `.vjlink` file contains layers, scenes, cues, mappings, outputs and the graphics. Videos go into a folder name Medien next to it; move both together.", "Eine `.vjlink`-Datei enthält Ebenen, Szenen, Cues, Zuweisungen, Ausgänge und die Grafiken. Videos kommen in einen Ordner Name Medien daneben; beides zusammen umziehen."),
           ("A dot next to the name means unsaved changes.", "Ein Punkt neben dem Namen heißt: ungespeicherte Änderungen.")),
        H2("Start screen and demo", "Startbildschirm und Demo"),
        P("The start screen offers continue, a new project with six prepared layers, open a file and **Open demo**: a finished show with eight layers, ten scenes with their own transitions, modulations and a timeline show. Take it apart to learn how VJ-Link works.",
          "Der Startbildschirm bietet weiterarbeiten, ein neues Projekt mit sechs vorbereiteten Ebenen, Datei öffnen und **Demo öffnen**: eine fertige Show mit acht Ebenen, zehn Szenen mit eigenen Übergängen, Modulationen und einer Timeline-Show. Nimm sie auseinander, um VJ-Link kennenzulernen."),
    )
    return (("Projects, saving and the demo show", "Projekte, Speichern und die Demo-Show"),
            ("VJ-Link projects: automatic saving, .vjlink files with graphics and a media folder for videos, recently opened, and the demo show to learn from.",
             "VJ-Link-Projekte: automatisches Sichern, .vjlink-Dateien mit Grafiken und Medienordner für Videos, zuletzt geöffnet und die Demo-Show zum Lernen."),
            ("Show", "Show"), ("Projects", "Projekte"),
            ("Save, move and start shows.", "Shows speichern, umziehen und starten."), body)
