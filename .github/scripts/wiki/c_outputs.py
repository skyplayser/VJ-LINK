from wikilib import *

group("Outputs", "Ausgänge")


@page("wiki-outputs.html", "Screens and canvas", "Bildschirme und Leinwand")
def _():
    body = SEC(
        P("Every connected screen, projector or LED processor can be an output. **OUTPUT** lists them with their resolution; **Open as output** puts a full-screen window on it. All outputs share one clock, so they stay in sync.",
          "Jeder angeschlossene Bildschirm, Beamer oder LED-Prozessor kann ein Ausgang sein. **AUSGABE** listet sie mit Auflösung; **Als Ausgang öffnen** legt ein Vollbild-Fenster darauf. Alle Ausgänge teilen eine Uhr und bleiben synchron."),
        GUIDE("outputs-canvas-guide.png", "Output tab with three screens on one canvas", "Tab Ausgabe mit drei Bildschirmen auf einer Leinwand", [
            ("**Screens**: every connected screen, projector and LED wall.", "**Bildschirme**: jeder angeschlossene Bildschirm, Beamer und jede LED-Wand."),
            ("**Open as output** / **Close**: one click per screen.", "**Als Ausgang öffnen** / **Schließen**: ein Klick pro Bildschirm."),
            ("**Arrangement**: same picture on all, canvas, or projection mapping.", "**Anordnung**: überall dasselbe Bild, Leinwand oder Projektionsmapping."),
            ("**Canvas**: drag the screens to where they hang; the edges snap.", "**Leinwand**: die Bildschirme dorthin ziehen, wo sie hängen; die Kanten rasten ein."),
            ("**Side by side** / **Stacked** arrange them at once; a click on a screen shows exact values.", "**Nebeneinander** / **Untereinander** ordnen sie auf einmal an; ein Klick auf einen Bildschirm zeigt genaue Werte."),
            ("**Test patterns** on all outputs, to step through.", "**Testbilder** auf allen Ausgängen, zum Durchschalten."),
        ]),
        H2("Arrangement", "Anordnung"),
        TABLE([("Mode", "Modus"), ("What happens", "Was passiert")], [
            [("**Same picture on all**", "**Überall dasselbe Bild**"), ("every output shows the whole picture in its own resolution", "jeder Ausgang zeigt das ganze Bild in seiner eigenen Auflösung")],
            [("**Canvas**", "**Leinwand**"), ("arrange the screens freely (drag, snap, type values, side by side or stacked); each output shows its part, visuals and videos run seamlessly across all", "Bildschirme frei anordnen (ziehen, einrasten, Werte eintippen, nebeneinander oder untereinander); jeder Ausgang zeigt seinen Teil, Visuals und Videos laufen nahtlos über alle")],
            [("**Projection mapping**", "**Projektionsmapping**"), ("canvases with corner pin, grid warp and masks on the picture of each projector, see [projection mapping](wiki-mapping-projection.html)", "Leinwände mit Eckpunkten, Raster-Verzerrung und Masken auf dem Bild jedes Beamers, siehe [Projektionsmapping](wiki-mapping-projection.html)")],
        ]),
        H2("Window output", "Fenster-Ausgang"),
        P("Instead of full screen, an output can be a normal window with a fixed picture size (720p up to 4K, also portrait). Capture it in OBS, with NDI tools or Syphon Recorder. It also works as a projector in canvas and projection mapping.",
          "Statt Vollbild kann ein Ausgang ein normales Fenster mit fester Bildgröße sein (720p bis 4K, auch hochkant). Greif es in OBS, mit NDI-Werkzeugen oder Syphon Recorder ab. Es funktioniert auch wie ein Beamer in Leinwand und Projektionsmapping."),
        ADM("note", ("Native Syphon, Spout and NDI are planned. Until then the window output is the way to get the picture into other programs.", "Natives Syphon, Spout und NDI sind geplant. Bis dahin ist der Fenster-Ausgang der Weg, das Bild in andere Programme zu bringen.")),
        H2("Test patterns", "Testbilder"),
        P("Nine test patterns to step through: color bars, grid, grid across all, numbers, grey scale, white, red, green and blue, each with the resolution, name and position of every output. Also on a key or desk channel: test pattern, next, previous.",
          "Neun Testbilder zum Durchschalten: Farbbalken, Raster, Raster über alle, Nummern, Graustufen, Weiß, Rot, Grün und Blau, jeweils mit Auflösung, Name und Lage jedes Ausgangs. Auch auf Taste oder Pult-Kanal: Testbild, Nächstes, Voriges."),
        IMG("outputs-testpattern.png", "Test pattern Numbers on all outputs", "Testbild Nummern auf allen Ausgängen",
            ("The test pattern “Numbers” shows on every output its number, name and position.", "Das Testbild „Nummern“ zeigt auf jedem Ausgang Nummer, Name und Lage.")),
        ADM("tip", ("With only one screen an output covers the interface. Esc or Close in the main window ends it.", "Mit nur einem Bildschirm verdeckt ein Ausgang die Oberfläche. Esc oder Schließen im Hauptfenster beendet ihn.")),
    )
    return (("Multiple screens, LED walls and canvas", "Mehrere Bildschirme, LED-Wände und Leinwand"),
            ("Run visuals on any number of screens, projectors and LED walls in any resolution, one canvas across all, window output for OBS and test patterns.",
             "Visuals auf beliebig vielen Bildschirmen, Beamern und LED-Wänden in jeder Auflösung, eine Leinwand über alle, Fenster-Ausgang für OBS und Testbilder."),
            ("Outputs", "Ausgänge"), ("Screens and canvas", "Bildschirme und Leinwand"),
            ("Projectors, LED walls and capture.", "Beamer, LED-Wände und Abgreifen."), body)


@page("wiki-mapping-projection.html", "Projection mapping", "Projektionsmapping")
def _():
    body = SEC(
        P("Choose **Projection mapping** under OUTPUT → Arrangement. On the picture of each projector you lay **canvases**: shapes that follow walls, boxes and columns. Outside the canvases the projector stays black.",
          "Unter AUSGABE → Anordnung **Projektionsmapping** wählen. Auf das Bild jedes Beamers legst du **Leinwände**: Formen, die Wänden, Kisten und Säulen folgen. Außerhalb der Leinwände bleibt der Beamer schwarz."),
        GUIDE("outputs-mapping-guide.png", "Projection mapping editor with numbered tools", "Projektionsmapping-Editor mit nummerierten Werkzeugen", [
            ("Arrangement **Projection mapping**.", "Anordnung **Projektionsmapping**."),
            ("A **corner**: drag it onto the edge of the object. The front of the box is selected (pink).", "Eine **Ecke**: auf die Kante des Objekts ziehen. Die Vorderseite der Kiste ist gewählt (pink)."),
            ("A canvas with a **3×3 grid** bends around the column.", "Eine Leinwand mit **Raster 3×3** biegt sich um die Säule."),
            ("A **mask** blacks out the door.", "Eine **Maske** schwärzt die Tür."),
            ("**+ Canvas** adds a surface.", "**+ Leinwand** fügt eine Fläche hinzu."),
            ("**+ Mask** adds a black-out area.", "**+ Maske** fügt einen geschwärzten Bereich hinzu."),
            ("**Alignment grid** on all canvases, distorted, to match edges exactly.", "**Raster zum Ausrichten** auf allen Leinwänden, verzerrt, damit die Kanten genau passen."),
            ("**Snap** on or off.", "**Einrasten** an oder aus."),
            ("**Stage photo** as a guide behind the canvases.", "**Bühnenfoto** als Hilfe hinter den Leinwänden."),
            ("Name of the canvas, which **picture** it shows and the **shape** (4 corners or grid).", "Name der Leinwand, welches **Bild** sie zeigt und die **Form** (4 Ecken oder Raster)."),
        ]),
        STEPS(("**+ Canvas** adds one. Drag a corner to fit it to a wall, a box or a trapezoid, drag the middle to move it. Arrow keys move by 1 px (with ⇧ 10 px).", "**+ Leinwand** fügt eine hinzu. Eine Ecke ziehen passt sie an Wand, Kiste oder Trapez an, die Mitte ziehen verschiebt sie. Pfeiltasten verschieben um 1 px (mit ⇧ 10 px)."),
              ("**Grid for alignment** lays the grid test pattern distorted onto the canvases, so the edges can be matched exactly.", "**Raster zum Ausrichten** legt das Raster-Testbild verzerrt auf die Leinwände, damit die Kanten genau passen."),
              ("**Shape**: 4 corners, or a 3×3 or 5×5 grid for round and curved surfaces; every point can be dragged and the surface bends smoothly.", "**Form**: 4 Ecken oder ein Raster 3×3 bzw. 5×5 für runde und gewölbte Flächen; jeder Punkt lässt sich ziehen, die Fläche biegt sich weich."),
              ("**+ Mask** draws a polygon (up to 32 points): black it out (door, window, person) or show only the inside, with a soft edge.", "**+ Maske** zeichnet ein Vieleck (bis 32 Punkte): innen schwärzen (Tür, Fenster, Person) oder nur innen zeigen, mit weicher Kante."),
              ("**Stage photo …** puts a photo of the stage (best taken from the projector) behind the canvases as a guide. It never goes to the projector.", "**Bühnenfoto …** legt ein Foto der Bühne (am besten vom Beamer aus aufgenommen) als Hilfe hinter die Leinwände. Es geht nie an den Beamer.")),
        ADM("tip", ("Corners snap to the edge and to other canvases. **Snap off**, or holding ⌥ while dragging, gives full precision.", "Ecken rasten am Rand und an anderen Leinwänden ein. **Einrasten aus** oder ⌥ beim Ziehen gibt volle Präzision.")),
        H2("Pictures", "Bilder"),
        P("Up to five **pictures**, each with its own layers, clip grid and effects. Each canvas chooses which picture it shows, whole or a part. Scenes save and recall all pictures with a fade. In VISUALS the pictures appear as live tiles; a click edits one.",
          "Bis zu fünf **Bilder**, jedes mit eigenen Ebenen, Clip-Raster und Effekten. Jede Leinwand wählt, welches Bild sie zeigt, ganz oder als Ausschnitt. Szenen speichern und rufen alle Bilder mit Überblendung ab. In VISUALS erscheinen die Bilder als Live-Kacheln; ein Klick bearbeitet eines."),
        P("Desk channels 71–75 set the brightness of the pictures, 76–91 the opacity of their layers 1–4. MIDI and OSC can do the same with fixed controls per picture.",
          "Die Pult-Kanäle 71–75 setzen die Helligkeit der Bilder, 76–91 die Deckkraft ihrer Ebenen 1–4. MIDI und OSC können das mit festen Elementen je Bild genauso."),
        ADM("alpha", ("Projection mapping has been tried on screens, not yet with projectors on a real set.", "Projektionsmapping wurde an Bildschirmen ausprobiert, noch nicht mit Beamern an einem echten Bühnenbild.")),
    )
    return (("Free projection mapping: corners, grid warp, masks", "Projektionsmapping kostenlos: Ecken, Raster, Masken"),
            ("Free projection mapping software: map visuals onto boxes, columns and walls with corner pin, grid warp and masks, up to five pictures with own layers.",
             "Kostenlose Projektionsmapping-Software: Visuals auf Kisten, Säulen und Wände mappen, mit Eckpunkten, Raster-Verzerrung, Masken und bis zu fünf Bildern."),
            ("Outputs", "Ausgänge"), ("Projection mapping", "Projektionsmapping"),
            ("Visuals on walls, boxes and columns.", "Visuals auf Wänden, Kisten und Säulen."), body)
