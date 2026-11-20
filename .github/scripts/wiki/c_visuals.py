import json
from pathlib import Path
from wikilib import *
from figs import CHASE_TIMELINE

CAT = json.loads((Path(__file__).parent / "catalog.json").read_text(encoding="utf-8"))

group("Visuals", "Visuals")


@page("wiki-layers.html", "Layers and clips", "Ebenen und Clips")
def _():
    body = SEC(
        H2("Layers", "Ebenen"),
        P("A project has one to eight layers. The bottom layer is the base, the ones above lie on top of it. Each layer plays one clip at a time from its row in the clip grid.",
          "Ein Projekt hat eine bis acht Ebenen. Die unterste ist die Basis, die darüber liegen obendrauf. Jede Ebene spielt einen Clip aus ihrer Zeile im Clip-Raster."),
        UL(("**+ Clips** at the end of a row opens the library: tap a visual, a camera, a video or a graphic to add it to the row, tap again to remove it.", "**+ Clips** am Ende einer Zeile öffnet die Bibliothek: Ein Visual, eine Kamera, ein Video oder eine Grafik antippen nimmt es in die Zeile auf, nochmal antippen nimmt es heraus."),
           ("Click a clip to start it, click it again to stop it. The running clip has a green frame.", "Einen Clip anklicken startet ihn, nochmal klicken stoppt ihn. Der laufende Clip hat einen grünen Rahmen."),
           ("**+ Layer** adds a layer, the × next to its name removes it. Layer names can be changed in the layer panel.", "**+ Ebene** fügt eine Ebene hinzu, das × neben dem Namen entfernt sie. Den Namen änderst du im Ebenen-Panel.")),
        GUIDE("layer-row-guide.png", "One layer row in the clip grid with numbered controls", "Eine Ebenen-Zeile im Clip-Raster mit nummerierten Bedienelementen", [
            ("**Name** of the layer: a click opens its panels on the right, × removes the layer.", "**Name** der Ebene: Ein Klick öffnet rechts ihre Panels, × entfernt die Ebene."),
            ("**Opacity** of the layer (also in the fader bar).", "**Deckkraft** der Ebene (auch in der Fader-Leiste)."),
            ("**Color source**: original, slot A–E, several slots, gradient, rainbow.", "**Farbquelle**: Original, Slot A–E, mehrere Slots, Verlauf, Regenbogen."),
            ("**Blend mode**: normal, add, screen, multiply.", "**Mischmodus**: Normal, Addieren, Bildschirm, Multiplizieren."),
            ("**Drive**: auto, beat, audio, static.", "**Antrieb**: Auto, Takt, Audio, Statisch."),
            ("The **running clip** has a green frame; every cell shows a live preview. At the end of the row **+ Clips** opens the library.", "Der **laufende Clip** hat einen grünen Rahmen; jede Zelle zeigt eine Live-Vorschau. Am Ende der Zeile öffnet **+ Clips** die Bibliothek."),
        ]),
        DIAGRAM(880, 200, {"l1": (90, 150, 140, 44, "tab", ("Layer 1 · base", "Ebene 1 · Basis"), None),
                           "l2": (250, 150, 140, 44, "tab", ("Layer 2 · add", "Ebene 2 · Addieren"), None),
                           "l3": (410, 150, 140, 44, "tab", ("Layer 3 · screen", "Ebene 3 · Bildschirm"), None),
                           "ln": (570, 150, 140, 44, "tab", ("… up to layer 8", "… bis Ebene 8"), None),
                           "m": (740, 150, 150, 50, "pc", ("Master · strobe", "Master · Strobe"), ("blackout, blinder", "Blackout, Blinder")),
                           "out": (740, 45, 150, 44, "net", ("Outputs", "Ausgänge"), None)},
                [("l1", "l2", "same", None), ("l2", "l3", "same", None), ("l3", "ln", "same", None), ("ln", "m", "same", None), ("m", "out", "cable", None)],
                cap=("The picture is built from the bottom up: each layer is laid onto the ones below with its blend mode and opacity, then master and strobe act on everything.",
                     "Das Bild entsteht von unten nach oben: Jede Ebene wird mit ihrem Mischmodus und ihrer Deckkraft auf die darunter gelegt, danach wirken Master und Strobe auf alles.")),
        IMG("library.png", "The library of a layer", "Die Bibliothek einer Ebene",
            ("The library: tap visuals, cameras, videos and graphics to put them into the row of this layer.", "Die Bibliothek: Visuals, Kameras, Videos und Grafiken antippen, um sie in die Zeile dieser Ebene zu legen.")),
        H2("Moving clips", "Clips verschieben"),
        P("Drag a clip in the grid onto another place in its row or into another layer. Without a mouse: right-click a clip (or ⇧F10) and choose the layer. A clip that is playing keeps playing in its new layer if nothing plays there yet; saved scenes keep their settings.",
          "Einen Clip im Raster an eine andere Stelle seiner Zeile oder in eine andere Ebene ziehen. Ohne Maus: Rechtsklick auf den Clip (oder ⇧F10) und die Ebene wählen. Ein laufender Clip läuft in der neuen Ebene weiter, wenn dort noch nichts läuft; gespeicherte Szenen behalten ihre Einstellungen."),
        GUIDE("clip-drag-guide.png", "Dragging a clip from layer 6 into layer 4", "Einen Clip von Ebene 6 in Ebene 4 ziehen", [
            ("The **clip** being dragged (it turns transparent).", "Der gezogene **Clip** (er wird durchsichtig)."),
            ("The **target row** is highlighted; drop the clip on a clip to put it before it, or on the row to add it at the end.", "Die **Zielzeile** leuchtet; den Clip auf einem Clip loslassen setzt ihn davor, auf der Zeile hängt ihn hinten an."),
        ]),
        GUIDE("clip-move-guide.png", "Moving the clip “VJ-Link logo” into another layer", "Clip „VJ-Link-Logo“ in eine andere Ebene verschieben", [
            ("The **target layers**; Cancel or Esc leaves the clip where it is.", "Die **Ziel-Ebenen**; Abbrechen oder Esc lässt den Clip, wo er ist."),
        ]),
        H2("Per layer", "Je Ebene"),
        TABLE([("Setting", "Einstellung"), ("What it does", "Was sie macht")], [
            [("Opacity", "Deckkraft"), ("the fader next to the name and in the fader bar", "der Fader neben dem Namen und in der Fader-Leiste")],
            [("Blend mode", "Mischmodus"), ("Normal, Add, Screen or Multiply. Add and Screen make dark parts transparent.", "Normal, Addieren, Bildschirm oder Multiplizieren. Addieren und Bildschirm machen dunkle Stellen durchsichtig.")],
            [("Color source", "Farbquelle"), ("Original, one color slot, several slots, a gradient or a rainbow", "Original, ein Farbslot, mehrere Slots, ein Verlauf oder ein Regenbogen")],
            [("Drive", "Antrieb"), ("**Auto**: audio when the audio input works on this layer, otherwise the beat. **Beat**: only the BPM. **Audio**: only the audio. **Static**: no pulsing.", "**Auto**: Audio, wenn der Audio-Eingang auf diese Ebene wirkt, sonst Takt. **Takt**: nur das BPM. **Audio**: nur das Audio. **Statisch**: kein Pulsieren.")],
            [("Position", "Lage"), ("X, Y, size and rotation of every visual; the visual still fills the whole screen", "X, Y, Größe und Drehung jedes Visuals; das Visual füllt weiter den ganzen Bildschirm")],
            [("Effects", "Effekte"), ("a stack of up to six effects, see [effects](wiki-effects.html)", "ein Stapel von bis zu sechs Effekten, siehe [Effekte](wiki-effects.html)")],
        ]),
        H2("Layer panel", "Ebenen-Panel"),
        GUIDE("layer-panel-guide.png", "The panel of a laser layer on the right", "Das Panel einer Laser-Ebene rechts", [
            ("**Layer panel**: name, drive and the hint for this kind of layer.", "**Ebenen-Panel**: Name, Antrieb und der Hinweis zu dieser Art Ebene."),
            ("**Colors** of the layer: tap one or several slots, or original, gradient, rainbow.", "**Farben** der Ebene: einen oder mehrere Slots antippen, oder Original, Verlauf, Regenbogen."),
            ("**Position**: XY override, height, side, size, rotation and thickness; **Reset position** goes back.", "**Lage**: XY-Override, Höhe, Seite, Größe, Drehung und Linienstärke; **Lage zurücksetzen** stellt alles zurück."),
        ]),
        P("Below the layer panel follow the effects of the layer, see [effects](wiki-effects.html). A double click on a slider resets it.",
          "Unter dem Ebenen-Panel folgen die Effekte der Ebene, siehe [Effekte](wiki-effects.html). Ein Doppelklick auf einen Regler setzt ihn zurück."),
        H2("Chase", "Chase"),
        P("With **Chase** a layer steps through the clips of its row by itself, in time with the music: for example different flash pictures taking turns on every beat, or a new tunnel every bar. It runs on the common beat clock, so the preview, the clip grid and every output show the same clip at the same moment.",
          "Mit **Chase** schaltet eine Ebene von selbst im Takt durch die Clips ihrer Zeile: zum Beispiel verschiedene Blitzbilder abwechselnd auf jeden Beat oder jeden Takt ein neuer Tunnel. Er läuft auf der gemeinsamen Beat-Uhr; Vorschau, Clip-Raster und jeder Ausgang zeigen im selben Moment denselben Clip."),
        ADM("tip", ("Community function, thanks to Harald! Want to contribute to VJ-Link too? Send us your wish with a rating in the program (Help → Give feedback) or on our [Discord server](%s)." % DISCORD,
                    "Community-Funktion, danke an Harald! Du willst auch zu VJ-Link beitragen? Melde uns deinen Wunsch per Bewertung im Programm (Hilfe → Feedback geben) oder auf unserem [Discord-Server](%s)." % DISCORD),
            title=("Community function", "Community-Funktion")),
        STEPS(("Put the clips into the row of a layer (**+ Clips**), e.g. three flash pictures.", "Die Clips in die Zeile einer Ebene legen (**+ Clips**), z. B. drei Blitzbilder."),
              ("Click the layer name and switch **Chase** on in the panel on the right.", "Auf den Ebenen-Namen klicken und im Panel rechts **Chase** einschalten."),
              ("Choose the **step** (¼ to 8 beats per clip) and the **order**.", "Den **Schritt** (¼ bis 8 Beats pro Clip) und die **Reihenfolge** wählen."),
              ("Optional: **Visible** below 100 % lets each clip only flash, and tapping clips limits the chase to them.", "Optional: **Sichtbar** unter 100 % lässt jeden Clip nur aufblitzen, und Antippen von Clips beschränkt den Chase auf diese.")),
        GUIDE("chase-panel-guide.png", "Chase settings in the panel of the beat layer", "Chase-Einstellungen im Panel der Beat-Ebene", [
            ("**Chase on / off** for this layer.", "**Chase an / aus** für diese Ebene."),
            ("**Step**: ¼, ½, 1, 2, 4 or 8 beats per clip.", "**Schritt**: ¼, ½, 1, 2, 4 oder 8 Beats pro Clip."),
            ("**Order**: forward, back and forth, or random (every clip once per round, never twice in a row).", "**Reihenfolge**: vorwärts, hin und her oder Zufall (jeder Clip einmal pro Runde, nie zweimal hintereinander)."),
            ("**Visible**: part of each step in which the clip shows; 100 % = always, 25 % = short flash. Double click = 100 %.", "**Sichtbar**: Anteil jedes Schritts, in dem der Clip zu sehen ist; 100 % = immer, 25 % = kurzer Blitz. Doppelklick = 100 %."),
            ("**Clips**: none picked = all clips of the row; tap to pick single ones. The running one has a pink frame.", "**Clips**: keiner gewählt = alle Clips der Zeile; antippen wählt einzelne aus. Der laufende hat einen pinken Rahmen."),
            ("**Note**: in sync on all outputs, and with safe flashes the step that really applies.", "**Hinweis**: synchron auf allen Ausgängen, bei sicheren Blitzen der Schritt, der wirklich gilt."),
        ]),
        CHASE_TIMELINE(),
        GUIDE("chase-row-guide.png", "The beat layer with chase in the clip grid", "Die Beat-Ebene mit Chase im Clip-Raster", [
            ("**⟳** after the layer name: the chase is on.", "**⟳** hinter dem Ebenen-Namen: der Chase ist an."),
            ("The **running clip** lights up and moves on with every step.", "Der **laufende Clip** leuchtet und wandert mit jedem Schritt weiter."),
        ]),
        ADM("warn", ("**Safe flashes** (Settings → Safety, on by default) allow at most 3 changes per second. If the step is shorter at the current tempo, VJ-Link takes the next longer step and says so in the panel, e.g. ¼ beat at 128 BPM becomes 1 beat.",
                     "**Sichere Blitze** (Einstellungen → Sicherheit, ab Werk an) erlauben höchstens 3 Wechsel pro Sekunde. Ist der Schritt beim aktuellen Tempo kürzer, nimmt VJ-Link die nächstlängere Stufe und sagt das im Panel, z. B. wird ¼ Beat bei 128 BPM zu 1 Beat.")),
        TABLE([("Control", "Bedienelement"), ("ID for mapping and OSC", "ID für Mapping und OSC"), ("Values", "Werte")], [
            [("Chase on/off", "Chase an/aus"), "<code>layer.N.chase</code>", ("switch", "Schalter")],
            [("Step", "Schritt"), "<code>layer.N.chase.step</code>", ("0–1 steps through ¼ … 8 beats", "0–1 schaltet durch ¼ … 8 Beats")],
            [("Order", "Reihenfolge"), "<code>layer.N.chase.order</code>", ("0–1: forward, back and forth, random", "0–1: vorwärts, hin und her, Zufall")],
            [("Visible", "Sichtbar"), "<code>layer.N.chase.gate</code>", ("fader 5–100 %, can be modulated", "Regler 5–100 %, modulierbar")],
        ]),
        P("Chase settings are saved with the project and in scenes, so a scene can switch a chase on and the next one off.",
          "Die Chase-Einstellungen werden mit dem Projekt und in Szenen gespeichert; eine Szene kann einen Chase also ein- und die nächste wieder ausschalten."),
        H2("Color slots", "Farbslots"),
        P("Five color slots A–E sit on the right. They are the colors of the show: the desk sets them over DMX (dimmer and RGB per slot), MIDI or OSC, and every layer that uses a slot changes with them. With several slots, laser looks give each beam its own color and move them on every eight beats.",
          "Rechts stehen fünf Farbslots A–E. Sie sind die Farben der Show: Das Pult setzt sie über DMX (Dimmer und RGB je Slot), MIDI oder OSC, und jede Ebene, die einen Slot nutzt, wechselt mit. Bei mehreren Slots bekommt bei Laser-Looks jeder Strahl eine eigene Farbe, alle acht Beats rücken sie weiter."),
        H2("Laser layers", "Laser-Ebenen"),
        P("The laser looks are made for a projector in haze: a point in the picture becomes a beam, a line a sheet of light, a circle a cone. They lie in the upper third by themselves. **Thickness** makes lines thicker so they carry more light. With **XY override** their own movement stops and X/Y set the position directly, for example from moving-head channels of the desk.",
          "Die Laser-Looks sind für einen Beamer im Nebel gemacht: Ein Punkt im Bild wird ein Strahl, eine Linie eine Lichtfläche, ein Kreis ein Kegel. Sie liegen von sich aus im oberen Drittel. **Linienstärke** macht Linien dicker, damit sie mehr Licht tragen. Mit **XY-Override** stoppt die Eigenbewegung, und X/Y setzen die Lage direkt, etwa aus Moving-Head-Kanälen des Pults."),
        ADM("alpha", ("The laser looks have not been tried with a projector in real haze yet.", "Die Laser-Looks wurden noch nicht mit einem Beamer in echtem Nebel ausprobiert.")),
    )
    return (("Layers, clips and color slots", "Ebenen, Clips und Farbslots"),
            ("VJ-Link layers: clip rows, blend modes, color sources, drive (audio, beat, static), position, color slots from the desk and laser looks for haze.",
             "VJ-Link-Ebenen: Clip-Zeilen, Mischmodi, Farbquellen, Antrieb (Audio, Takt, statisch), Lage, Farbslots vom Pult und Laser-Ebenen für den Beamer im Nebel."),
            ("Visuals", "Visuals"), ("Layers and clips", "Ebenen und Clips"),
            ("How the picture is built from up to eight layers.", "Wie das Bild aus bis zu acht Ebenen entsteht."), body)


@page("wiki-visuals.html", "The 155 visuals", "Die 155 Visuals")
def _():
    rows = []
    for c in CAT["cats"]:
        en = ", ".join(i["en"] for i in c["items"])
        de = ", ".join(i["de"] for i in c["items"])
        rows.append([("**%s** (%d)" % (c["en"], len(c["items"])), "**%s** (%d)" % (c["de"], len(c["items"]))), (en, de)])
    body = SEC(
        P("Every visual is generated live on the graphics card, in any resolution, and reacts to the beat or the audio. The **GALLERY** tab shows them all with a preview; a double click starts one on the target layer.",
          "Jedes Visual entsteht live auf der Grafikkarte, in jeder Auflösung, und reagiert auf Beat oder Audio. Der Tab **GALERIE** zeigt alle mit Vorschau; ein Doppelklick startet eines auf der Ziel-Ebene."),
        IMG("gallery.png", "Gallery with the visuals in categories", "Galerie mit den Visuals in Kategorien",
            ("The gallery with filters per category and a live preview on the right.", "Die Galerie mit Filtern je Kategorie und Live-Vorschau rechts.")),
        GUIDE("gallery-target-guide.png", "Gallery: put a visual into a layer", "Galerie: ein Visual in eine Ebene legen", [
            ("**Choose a visual**: the live preview and its description appear on the right.", "**Visual wählen**: rechts erscheinen Live-Vorschau und Beschreibung."),
            ("**Add to layer** adds it to the clip row of the target layer; **Play now** also starts it.", "**In die Ebene legen** fügt es der Clip-Zeile der Ziel-Ebene hinzu; **Jetzt abspielen** startet es auch."),
            ("**Target layer** with number and name (e.g. “Layer 1 · Space”): where the visual goes.", "**Ziel-Ebene** mit Nummer und Namen (z. B. „Ebene 1 · Raum“): dorthin kommt das Visual."),
        ]),
        H2("All categories", "Alle Kategorien"),
        TABLE([("Category", "Kategorie"), ("Visuals", "Visuals")], rows),
        ADM("tip", ("Colors: with the color source **Original** each visual shows its own colors. With a slot it takes the show colors from the desk.",
                    "Farben: Mit der Farbquelle **Original** zeigt jedes Visual seine eigenen Farben. Mit einem Slot übernimmt es die Show-Farben vom Pult.")),
    )
    return (("155 visuals: fractals, 3D, lasers, particles", "155 Visuals: Fraktale, 3D, Laser, Partikel"),
            ("All 155 VJ-Link visuals in 15 categories: minimal, 3D, fractals, demoscene, sacred geometry, glitch, op art, audio, particles, retro and lasers.",
             "Alle 155 VJ-Link-Visuals in 15 Kategorien: Minimal, 3D, Fraktale, Demoscene, Heilige Geometrie, Glitch, Op-Art, Audio, Partikel, Retro und Laser."),
            ("Visuals", "Visuals"), ("The 155 visuals", "Die 155 Visuals"),
            ("Every visual, sorted by category.", "Jedes Visual, nach Kategorie sortiert."), body)


@page("wiki-particles.html", "Particle objects and 3D models", "Partikel-Objekte und 3D-Modelle")
def _():
    body = SEC(
        P("A **particle object** is a 3D body made of thousands of short sticks or dots that sit on its surface. On the beat, the bar or the bass they fly apart and come back to the shape. VJ-Link brings five bodies (cross, cube, sphere, torus, star), and you can load your own 3D models as **OBJ** or **STL**.",
          "Ein **Partikel-Objekt** ist ein 3D-Körper aus Tausenden kurzer Stäbchen oder Punkte, die auf seiner Oberfläche sitzen. Auf den Beat, den Takt oder den Bass fliegen sie auseinander und kehren in die Form zurück. VJ-Link bringt fünf Körper mit (Kreuz, Würfel, Kugel, Torus, Stern), und du kannst eigene 3D-Modelle als **OBJ** oder **STL** laden."),
        IMG("particle-looks.png", "Four particle objects: cross at rest, cross on bar 1, sphere with the bass, star as dots", "Vier Partikel-Objekte: Kreuz in Ruhe, Kreuz auf Takt 1, Kugel mit dem Bass, Stern aus Punkten",
            ("Top: the cross at rest and on bar 1, when the sticks fly apart. Bottom: the sphere with the trigger Bass and the color source Rainbow, the star as dots (length 0) with its own angles.",
             "Oben: das Kreuz in Ruhe und auf Takt 1, wenn die Stäbchen auseinanderfliegen. Unten: die Kugel mit dem Auslöser Bass und der Farbquelle Regenbogen, der Stern aus Punkten (Länge 0) mit eigenen Winkeln.")),
        ADM("warn", ("Particle objects need a **strong graphics card**. Target: three screens at 60 frames per second on an Apple M2 (or a comparable graphics card) and up, with up to 40 thousand particles. On weaker computers lower **Count**, or set **Length** to 0 (dots).",
                     "Partikel-Objekte brauchen eine **starke Grafikkarte**. Ziel: drei Bildschirme mit 60 Bildern pro Sekunde ab Apple M2 (oder einer vergleichbaren Grafikkarte), mit bis zu 40 Tausend Partikeln. Auf schwächeren Rechnern **Anzahl** senken oder **Länge** auf 0 stellen (Punkte)."),
            title=("Strong graphics card", "Starke Grafikkarte")),
        DIAGRAM(900, 230, {"body": (100, 60, 170, 56, "tab", ("Body", "Körper"), ("built-in or OBJ / STL", "eingebaut oder OBJ / STL")),
                           "pts": (100, 170, 170, 56, "pc", ("Surface points", "Oberflächenpunkte"), ("position, direction, color", "Lage, Richtung, Farbe")),
                           "gpu": (340, 115, 170, 56, "pc", ("Sticks or dots", "Stäbchen oder Punkte"), ("graphics card, one pass", "Grafikkarte, ein Durchgang")),
                           "beat": (560, 50, 180, 50, "dj", ("Beat clock or bass", "Beat-Uhr oder Bass"), ("trigger, explosion, return", "Auslöser, Explosion, Rückkehr")),
                           "rot": (560, 180, 180, 50, "desk", ("Rotation X / Y / Z", "Drehung X / Y / Z"), ("angle and speed", "Winkel und Tempo")),
                           "layer": (790, 115, 160, 56, "net", ("Layer", "Ebene"), ("effects, blend, outputs", "Effekte, Mischen, Ausgänge"))},
                [("body", "pts", "same", None), ("pts", "gpu", "same", None), ("beat", "gpu", "same", None), ("rot", "gpu", "same", None), ("gpu", "layer", "same", None)],
                cap=("Once, when it is loaded, VJ-Link spreads the particles evenly over the surface of the body. While it plays, the graphics card draws all of them in one pass and moves them with the beat clock or the bass; the layer then adds its effects and blend mode as for every visual.",
                     "Einmal beim Laden verteilt VJ-Link die Partikel gleichmäßig über die Oberfläche des Körpers. Beim Spielen zeichnet die Grafikkarte alle in einem Durchgang und bewegt sie mit der Beat-Uhr oder dem Bass; danach legt die Ebene wie bei jedem Visual ihre Effekte und ihren Mischmodus darüber.")),
        H2("Start a particle object", "Ein Partikel-Objekt starten"),
        STEPS(("Open **GALLERY → 3D and space** or **+ Clips** in a layer row and choose **Particle cross**, **cube**, **sphere**, **torus** or **star**.",
               "**GALERIE → 3D und Raum** oder **+ Clips** in einer Ebenen-Zeile öffnen und **Partikel-Kreuz**, **-Würfel**, **-Kugel**, **-Torus** oder **-Stern** wählen."),
              ("Click the clip in the row. It explodes on bar 1 and rotates slowly.", "Den Clip in der Zeile anklicken. Er explodiert auf Takt 1 und dreht sich langsam."),
              ("Click the layer name: on the right the panel shows the section **Particle object** with all settings.", "Auf den Ebenen-Namen klicken: Rechts zeigt das Panel den Bereich **Partikel-Objekt** mit allen Einstellungen."),
              ("On an overlay layer use the blend mode **Normal**; with **Add** the particles look pale over bright visuals.", "Auf einer Overlay-Ebene den Mischmodus **Normal** nehmen; mit **Addieren** wirken die Partikel über hellen Visuals blass.")),
        GUIDE("particle-layer-guide.png", "Layer 2 with the five bodies and a 3D model in its row", "Ebene 2 mit den fünf Körpern und einem 3D-Modell in der Zeile", [
            ("A **built-in body** in the clip row (here the particle cross, playing).", "Ein **eingebauter Körper** in der Clip-Zeile (hier das Partikel-Kreuz, es läuft)."),
            ("An **own 3D model** carries the badge **3D**.", "Ein **eigenes 3D-Modell** trägt das Zeichen **3D**."),
            ("The **preview**: the cross explodes over the rings of layer 1.", "Die **Vorschau**: Das Kreuz explodiert über den Ringen von Ebene 1."),
            ("The section **Particle object** in the layer panel.", "Der Bereich **Partikel-Objekt** im Ebenen-Panel."),
        ]),
        H2("Settings", "Einstellungen"),
        GUIDE("particle-panel-guide.png", "Particle object, first part: trigger, rotation, explosion", "Partikel-Objekt, erster Teil: Auslöser, Drehung, Explosion", [
            ("**Trigger**: every beat, bar 1, every 2 or 4 bars, **Bass (audio)** or **Hold (fader)**.", "**Auslöser**: jeder Beat, Takt 1, alle 2 oder 4 Takte, **Bass (Audio)** oder **Halten (Regler)**."),
            ("The **note** for the chosen trigger (here: bass).", "Der **Hinweis** zum gewählten Auslöser (hier: Bass)."),
            ("**Rotation** on / off: switches the three rotation speeds.", "**Drehung** an / aus: schaltet die drei Drehtempi."),
            ("**Explosion**: how far the particles fly (0 = the shape stays closed).", "**Explosion**: wie weit die Partikel fliegen (0 = die Form bleibt geschlossen)."),
            ("**Return**: how long they take to come back, in beats.", "**Rückkehr**: wie lange sie zum Zurückkommen brauchen, in Beats."),
            ("**Scatter**: 0 % flies straight out from the surface, 100 % in all directions.", "**Streuung**: 0 % fliegt gerade von der Oberfläche weg, 100 % in alle Richtungen."),
            ("**Rotation per axis**: speed around X (tilt), Y (turn) and Z (roll) in turns per minute, negative = the other way.", "**Drehung je Achse**: Tempo um X (kippen), Y (drehen) und Z (rollen) in Umdrehungen pro Minute, negativ = andersherum."),
        ]),
        GUIDE("particle-panel2-guide.png", "Particle object, second part: angles, particles and the hint", "Partikel-Objekt, zweiter Teil: Winkel, Partikel und Hinweis", [
            ("**Angle X / Y / Z**: the fixed position of the body (−180° to 180°); the rotation turns on from there.", "**Winkel X / Y / Z**: die feste Lage des Körpers (−180° bis 180°); von dort aus dreht die Drehung weiter."),
            ("**Angle Z (roll)**; the layer's **Rotation** under Position rolls the picture in addition.", "**Winkel Z (rollen)**; die **Drehung** der Ebene unter Lage rollt das Bild zusätzlich."),
            ("**Particle size**: thickness of sticks and dots.", "**Partikelgröße**: Dicke der Stäbchen und Punkte."),
            ("**Length**: 100 % = sticks, 0 = round dots. Dots show fine logos and lettering better.", "**Länge**: 100 % = Stäbchen, 0 = runde Punkte. Punkte zeigen feine Logos und Schrift besser."),
            ("**Count**: 5 to 200 thousand particles, default 40 thousand.", "**Anzahl**: 5 bis 200 Tausend Partikel, Vorgabe 40 Tausend."),
            ("The **hint** about the graphics card. **Reset particles** above it restores all defaults.", "Der **Hinweis** zur Grafikkarte. **Partikel zurücksetzen** darüber stellt alle Vorgaben wieder her."),
        ]),
        P("A **double click** on a slider sets it to 0. Return, size and count have no 0; a double click sets them to their default. Position, size and rotation of the layer (section **Position**) act on particle objects as on every visual.",
          "Ein **Doppelklick** auf einen Regler setzt ihn auf 0. Rückkehr, Größe und Anzahl haben keine 0; ein Doppelklick setzt sie auf ihre Vorgabe. Lage, Größe und Drehung der Ebene (Bereich **Lage**) wirken auf Partikel-Objekte wie auf jedes Visual."),
        H2("Triggers", "Auslöser"),
        TABLE([("Trigger", "Auslöser"), ("When the particles fly apart", "Wann die Partikel auseinanderfliegen")], [
            [("Every beat", "Jeder Beat"), ("on every beat; return is at most just under one beat", "auf jeden Beat; die Rückkehr dauert höchstens knapp einen Beat")],
            [("Bar 1", "Takt 1"), ("on the first beat of every bar; a small pulse on the other beats", "auf den ersten Beat jedes Takts; auf den anderen Beats ein kleiner Puls")],
            [("Every 2 / 4 bars", "Alle 2 / 4 Takte"), ("every 8 or 16 beats, for build-ups and drops", "alle 8 bzw. 16 Beats, für Aufbau und Drop")],
            [("Bass (audio)", "Bass (Audio)"), ("the harder the bass, the further they fly; quiet bass keeps the shape closed. Source: audio input or LJ-Link. **Explosion** is the strength, **Return** how fast they gather again.", "je härter der Bass, desto weiter fliegen sie; leiser Bass lässt die Form geschlossen. Quelle: Audio-Eingang oder LJ-Link. **Explosion** ist die Stärke, **Rückkehr** wie schnell sie sich wieder sammeln.")],
            [("Hold (fader)", "Halten (Regler)"), ("no beat: the **Explosion** fader holds the particles apart directly, e.g. from a fader on the light desk", "kein Takt: Der Regler **Explosion** hält die Partikel direkt auseinander, z. B. von einem Fader am Lichtpult")],
        ]),
        P("The beat triggers run on VJ-Link's beat clock (LJ-Link, Ableton Link, MIDI clock or tap), so every output explodes at the same moment.",
          "Die Takt-Auslöser laufen auf der Beat-Uhr von VJ-Link (LJ-Link, Ableton Link, MIDI-Clock oder Tap); so explodieren alle Ausgänge im selben Moment."),
        H2("Colors", "Farben"),
        TABLE([("Color source of the layer", "Farbquelle der Ebene"), ("Particles", "Partikel")], [
            [("Original", "Original"), ("built-in bodies light grey, own models in the colors of their textures and materials", "eingebaute Körper hellgrau, eigene Modelle in den Farben ihrer Texturen und Materialien")],
            [("Slot A–E", "Slot A–E"), ("the slot color, with a rim light in the same color", "die Slot-Farbe, mit Randlicht in derselben Farbe")],
            [("Several slots", "Mehrere Slots"), ("each particle takes one of the chosen slots", "jedes Partikel nimmt einen der gewählten Slots")],
            [("Gradient, rainbow", "Verlauf, Regenbogen"), ("a mix of slot A and B, or all colors that slowly wander", "eine Mischung aus Slot A und B bzw. alle Farben, die langsam wandern")],
        ]),
        H2("Own 3D models (OBJ, STL)", "Eigene 3D-Modelle (OBJ, STL)", "models"),
        STEPS(("Drag an **.obj** or **.stl** file onto VJ-Link, or use **+ Clips → + Load file**. Keep the **.mtl** file and the textures of an OBJ in the same folder.",
               "Eine **.obj**- oder **.stl**-Datei auf VJ-Link ziehen oder **+ Clips → + Datei laden** nehmen. Die **.mtl**-Datei und die Texturen einer OBJ im selben Ordner lassen."),
              ("VJ-Link converts the model once into a point cloud (usually well under a second) and puts it into the layer as a clip with the badge **3D**.",
               "VJ-Link wandelt das Modell einmal in eine Punktwolke um (meist deutlich unter einer Sekunde) und legt es als Clip mit dem Zeichen **3D** in die Ebene."),
              ("Set explosion, rotation and particles as for the built-in bodies.", "Explosion, Drehung und Partikel einstellen wie bei den eingebauten Körpern.")),
        GUIDE("model-library-guide.png", "The library of layer 2 with an own 3D model", "Die Bibliothek von Ebene 2 mit einem eigenen 3D-Modell", [
            ("**Your 3D models**: every loaded model of this project.", "**Eigene 3D-Modelle**: jedes geladene Modell dieses Projekts."),
            ("Tap a model to put it into the row of this layer, tap again to take it out (here a self-made demo diamond).", "Ein Modell antippen legt es in die Zeile dieser Ebene, nochmal antippen nimmt es heraus (hier ein selbst gebauter Demo-Diamant)."),
            ("**×** deletes the model from the library, from all layers, scenes and cues (asks first).", "**×** löscht das Modell aus der Bibliothek, aus allen Ebenen, Szenen und Cues (mit Rückfrage)."),
            ("**+ Load file** loads more models, videos or graphics.", "**+ Datei laden** lädt weitere Modelle, Videos oder Grafiken."),
        ]),
        TABLE([("", ""), ("OBJ", "OBJ"), ("STL", "STL")], [
            [("Colors", "Farben"), ("textures (map_Kd) and material colors (Kd) from the .mtl, vertex colors", "Texturen (map_Kd) und Materialfarben (Kd) aus der .mtl, Eckfarben"), ("none: the layer colors (slots) color the model", "keine: Die Ebenenfarben (Slots) färben das Modell")],
            [("Formats", "Formate"), ("text OBJ with polygons, any number of objects and materials", "Text-OBJ mit Vielecken, beliebig vielen Objekten und Materialien"), ("binary and text STL", "binäre und Text-STL")],
            [("Limits", "Grenzen"), ("up to 80 MB and about 3 million triangles", "bis 80 MB und etwa 3 Millionen Dreiecke"), ("the same", "ebenso")],
        ]),
        UL(("The model is centered and scaled to the same size as the built-in bodies; size and position come from the layer (section Position).", "Das Modell wird mittig gesetzt und auf die Größe der eingebauten Körper gebracht; Größe und Lage kommen von der Ebene (Bereich Lage)."),
           ("Models are kept in the library of the computer and saved with the project. **Save as** and the **show package** copy them into the media folder next to the project file, so the project moves to another computer.", "Modelle liegen in der Bibliothek des Rechners und werden mit dem Projekt gespeichert. **Speichern unter** und das **Showpaket** kopieren sie in den Medienordner neben der Projektdatei, so zieht das Projekt auf einen anderen Rechner um."),
           ("Logos and lettering: **Length 0** (dots) and a smaller particle size keep fine letters readable.", "Logos und Schrift: **Länge 0** (Punkte) und eine kleinere Partikelgröße halten feine Buchstaben lesbar.")),
        H2("Change of shape", "Formwechsel"),
        P("If a layer switches from one particle object to another (click, scene, chase), the particles fly from the old shape into the new one within about one and a half beats. This works between all built-in bodies and own models.",
          "Wechselt eine Ebene von einem Partikel-Objekt zum nächsten (Klick, Szene, Chase), fliegen die Partikel in etwa anderthalb Beats von der alten in die neue Form. Das geht zwischen allen eingebauten Körpern und eigenen Modellen."),
        H2("Light desk, MIDI and OSC", "Lichtpult, MIDI und OSC"),
        P("Every setting is a control of the layer and can be mapped (MAPPING) and [modulated](wiki-modulation.html). The OSC addresses follow the control IDs:",
          "Jede Einstellung ist ein Regler der Ebene und lässt sich zuweisen (MAPPING) und [modulieren](wiki-modulation.html). Die OSC-Adressen folgen den Regler-IDs:"),
        TABLE([("Control ID (layer 2)", "Regler-ID (Ebene 2)"), ("Range", "Bereich")], [
            [("`layer.2.particles.explode`", "`layer.2.particles.explode`"), ("0–100 %", "0–100 %")],
            [("`layer.2.particles.trigger`", "`layer.2.particles.trigger`"), ("6 steps: beat, bar 1, 2 bars, 4 bars, bass, hold", "6 Stufen: Beat, Takt 1, 2 Takte, 4 Takte, Bass, Halten")],
            [("`layer.2.particles.ret` · `.scatter`", "`layer.2.particles.ret` · `.scatter`"), ("¼–4 beats · 0–100 %", "¼–4 Beats · 0–100 %")],
            [("`layer.2.particles.spin`", "`layer.2.particles.spin`"), ("rotation on / off", "Drehung an / aus")],
            [("`layer.2.particles.rpmX` · `.rpm` · `.rpmZ`", "`layer.2.particles.rpmX` · `.rpm` · `.rpmZ`"), ("−30 to 30 turns per minute (X, Y, Z)", "−30 bis 30 Umdrehungen pro Minute (X, Y, Z)")],
            [("`layer.2.particles.angX` · `.angY` · `.angZ`", "`layer.2.particles.angX` · `.angY` · `.angZ`"), ("−180° to 180°", "−180° bis 180°")],
            [("`layer.2.particles.size` · `.length` · `.count`", "`layer.2.particles.size` · `.length` · `.count`"), ("30–300 % · 0–300 % · 5–200 thousand", "30–300 % · 0–300 % · 5–200 Tausend")],
        ]),
        H2("Performance", "Leistung"),
        UL(("All particles are drawn by the graphics card in one pass; the sticks are flat pictures of a capsule (two triangles each), not real cylinders.", "Alle Partikel zeichnet die Grafikkarte in einem Durchgang; die Stäbchen sind flache Bilder einer Kapsel (je zwei Dreiecke), keine echten Zylinder."),
           ("Every output window draws the picture itself. Three screens therefore cost about three times as much as one.", "Jedes Ausgabefenster zeichnet das Bild selbst. Drei Bildschirme kosten deshalb etwa dreimal so viel wie einer."),
           ("Measured on an Apple M4 Max: 40 thousand sticks add about 0.5 ms per 1080p window, 200 thousand about 1.3 ms.", "Gemessen auf einem Apple M4 Max: 40 Tausend Stäbchen kosten etwa 0,5 ms zusätzlich je 1080p-Fenster, 200 Tausend etwa 1,3 ms.")),
        H2("Troubleshooting", "Fehlersuche"),
        TABLE([("Problem", "Problem"), ("Cause and fix", "Ursache und Lösung")], [
            [("Stutters on several outputs", "Ruckelt auf mehreren Ausgängen"), ("graphics card too weak: lower **Count**, set **Length** to 0, fewer effects on this layer", "Grafikkarte zu schwach: **Anzahl** senken, **Länge** auf 0, weniger Effekte auf dieser Ebene")],
            [("Bass trigger does nothing", "Bass-Auslöser tut nichts"), ("no audio: choose an audio input under Settings → Audio or connect LJ-Link; raise **Explosion**", "kein Audio: unter Einstellungen → Audio einen Eingang wählen oder LJ-Link verbinden; **Explosion** erhöhen")],
            [("Model stays grey", "Modell bleibt grau"), ("STL has no colors, or the .mtl and textures of the OBJ were not in the same folder; use a slot as color source or load the OBJ again from its folder", "STL hat keine Farben, oder .mtl und Texturen der OBJ lagen nicht im selben Ordner; einen Slot als Farbquelle nehmen oder die OBJ aus ihrem Ordner neu laden")],
            [("Model looks inside out or dark", "Modell wirkt verkehrt oder dunkel"), ("its faces point inward: export it from the 3D program with outward normals", "seine Flächen zeigen nach innen: im 3D-Programm mit nach außen gerichteten Normalen exportieren")],
            [("Lettering is hard to read", "Schrift schwer lesbar"), ("**Length** 0 (dots), smaller **Particle size**, more **Count**; rotation off and the angles to 0", "**Länge** 0 (Punkte), kleinere **Partikelgröße**, mehr **Anzahl**; Drehung aus und Winkel auf 0")],
            [("The cloud covers everything", "Die Wolke verdeckt alles"), ("**Explosion** lower or **Scatter** lower; on the bass trigger also less input level", "**Explosion** oder **Streuung** senken; beim Bass-Auslöser auch weniger Eingangspegel")],
        ]),
    )
    return (("Particle objects: 3D bodies of sticks that explode on the beat", "Partikel-Objekte: 3D-Körper aus Stäbchen, die im Takt explodieren"),
            ("Particle objects in VJ-Link: five built-in bodies and own OBJ/STL models of thousands of sticks or dots, exploding on the beat, the bar or the bass, rotating on three axes.",
             "Partikel-Objekte in VJ-Link: fünf eingebaute Körper und eigene OBJ/STL-Modelle aus Tausenden Stäbchen oder Punkten, die auf Beat, Takt oder Bass explodieren und sich um drei Achsen drehen."),
            ("Visuals", "Visuals"), ("Particle objects and 3D models", "Partikel-Objekte und 3D-Modelle"),
            ("3D bodies of sticks and dots that fly apart on the beat, your own OBJ and STL models included.", "3D-Körper aus Stäbchen und Punkten, die im Takt auseinanderfliegen, auch aus eigenen OBJ- und STL-Modellen."), body)


@page("wiki-effects.html", "Effects", "Effekte")
def _():
    rows = [[("**%s**" % p["en"], "**%s**" % p["de"]), (p["enInfo"], p["deInfo"])] for p in CAT["post"]]
    body = SEC(
        P("Each layer has an effect stack with up to six effects that work from top to bottom. Every effect has a strength; at 0 it does nothing. The first three of each layer lie on the desk channels and on MIDI as Effect 1–3.",
          "Jede Ebene hat einen Effekt-Stapel mit bis zu sechs Effekten, die von oben nach unten wirken. Jeder Effekt hat eine Stärke; bei 0 tut er nichts. Die ersten drei jeder Ebene liegen auf den Pult-Kanälen und auf MIDI als Effekt 1–3."),
        DIAGRAM(880, 140, {"c": (80, 70, 120, 50, "tab", ("Clip", "Clip"), None),
                           "f1": (220, 70, 100, 44, "pc", ("Fx1", "Fx1"), None), "f2": (340, 70, 100, 44, "pc", ("Fx2", "Fx2"), None),
                           "f3": (460, 70, 100, 44, "pc", ("Fx3", "Fx3"), None), "f4": (580, 70, 110, 44, "tab", ("Fx4–6", "Fx4–6"), None),
                           "l": (770, 70, 170, 50, "net", ("Layer mix", "Ebenen-Mischung"), ("opacity, blend", "Deckkraft, Mischmodus"))},
                [("c", "f1", "same", None), ("f1", "f2", "same", None), ("f2", "f3", "same", None), ("f3", "f4", "same", None), ("f4", "l", "same", None)],
                cap=("The effects work one after the other on the clip of the layer. Fx1–3 are on the desk (layer channels), MIDI and OSC; the Effects fader scales all of them.",
                     "Die Effekte wirken nacheinander auf den Clip der Ebene. Fx1–3 liegen auf dem Pult (Ebenen-Kanäle), MIDI und OSC; der Regler Effekte skaliert alle.")),
        GUIDE("fx-panel-guide.png", "The effect stack of a layer", "Der Effekt-Stapel einer Ebene", [
            ("**Effects · layer n**: the stack of the selected layer.", "**Effekte · Ebene n**: der Stapel der gewählten Ebene."),
            ("**Fx1–Fx3**: these three lie on the desk channels, MIDI and OSC.", "**Fx1–Fx3**: diese drei liegen auf den Pult-Kanälen, MIDI und OSC."),
            ("**Effect name**: click to switch it on or off.", "**Effektname**: anklicken schaltet ihn an oder aus."),
            ("**Strength** 0–100 %.", "**Stärke** 0–100 %."),
            ("**Order** ↑ ↓ and remove ×.", "**Reihenfolge** ↑ ↓ und entfernen ×."),
            ("**+ Add effect**: up to six per layer.", "**+ Effekt hinzufügen**: bis zu sechs je Ebene."),
        ]),
        P("Set up the stack in the layer panel (click a layer name): add, switch on and off, sort and set the strength. Effects can be [modulated](wiki-modulation.html), e.g. an RGB shift that pumps with the bass.",
          "Den Stapel richtest du im Ebenen-Panel ein (Klick auf einen Ebenen-Namen): hinzufügen, an- und ausschalten, sortieren und die Stärke einstellen. Effekte lassen sich [modulieren](wiki-modulation.html), z. B. ein RGB-Versatz, der mit dem Bass pumpt."),
        IMG("gallery-effects.png", "Effects in the gallery with a preview", "Effekte in der Galerie mit Vorschau",
            ("GALLERY → Effects shows every effect on a tunnel at 80 % strength.", "GALERIE → Effekte zeigt jeden Effekt auf einem Tunnel bei 80 % Stärke.")),
        H2("All 50 effects", "Alle 50 Effekte"),
        TABLE([("Effect", "Effekt"), ("What it does", "Was er macht")], rows),
        ADM("note", ("Effects that need the last picture (feedback, datamosh, echo, stutter, slit-scan, zoom feedback) keep their own memory per layer.",
                     "Effekte, die das letzte Bild brauchen (Feedback, Datamosh, Echo, Stutter, Slit-Scan, Zoom-Feedback), haben je Ebene ihren eigenen Speicher.")),
    )
    return (("The 50 effects of VJ-Link", "Die 50 Effekte von VJ-Link"),
            ("All 50 VJ-Link effects in the effect stack: feedback, datamosh, slit-scan, VHS, bloom, kaleidoscope, halftone, pixel sort, luma key, color strobe and more.",
             "Alle 50 VJ-Link-Effekte im Effekt-Stapel: Feedback, Datamosh, Slit-Scan, VHS, Bloom, Kaleidoskop, Halbton, Pixel-Sort, Luma-Key, Farb-Strobe und mehr."),
            ("Visuals", "Visuals"), ("Effects", "Effekte"),
            ("Up to six per layer, from top to bottom.", "Bis zu sechs je Ebene, von oben nach unten."), body)


@page("wiki-media.html", "Logos, videos and text", "Logos, Videos und Text")
def _():
    body = SEC(
        H2("Logos and images", "Logos und Bilder"),
        P("PNG, JPG, WebP, GIF (first frame only) and SVG up to 25 MB: drag them onto a row of the clip grid (they land on that layer; anywhere else: the selected layer) or use **+ Load file** in the library. A logo on a white or black background is recognised and the background is removed (Graphic → Remove background, with tolerance).",
          "PNG, JPG, WebP, GIF (nur das erste Bild) und SVG bis 25 MB: auf eine Zeile im Clip-Raster ziehen (sie landen auf dieser Ebene, sonst auf der gewählten) oder in der Bibliothek **+ Datei laden**. Ein Logo auf weißem oder schwarzem Hintergrund wird erkannt und der Hintergrund entfernt (Grafik → Freistellen, mit Toleranz)."),
        UL(("Position, size and rotation, and an animation in time: pulse, spin, bounce, float, wobble or zoom, ½ to 8 beats per round.", "Lage, Größe und Drehung und eine Animation im Takt: Pulsieren, Drehen, Hüpfen, Schweben, Wackeln oder Heranzoomen, ½ bis 8 Beats pro Durchlauf."),
           ("With the drive **Static** a graphic stands still.", "Mit dem Antrieb **Statisch** steht eine Grafik still.")),
        H2("Videos", "Videos"),
        P("MP4, MOV, M4V and WebM. VJ-Link copies them into its library and loops them seamlessly. As a clip a video can loop a part, lock the loop to 4–32 beats so it starts on the beat, fill or fit the screen and play its sound.",
          "MP4, MOV, M4V und WebM. VJ-Link kopiert sie in seine Bibliothek und spielt sie nahtlos im Loop. Als Clip kann ein Video einen Bereich loopen, den Loop auf 4–32 Beats legen, sodass er auf dem Beat startet, das Bild füllen oder einpassen und seinen Ton spielen."),
        ADM("tip", ("MP4 with H.264 and WebM play everywhere. If a file does not play, convert it to one of these.", "MP4 mit H.264 und WebM laufen überall. Läuft eine Datei nicht, wandle sie in eines dieser Formate um.")),
        H2("Text clips", "Text-Clips"),
        P("**+ Text** designs a full-screen text frame: font, size, bold, italic, capitals, alignment, line and letter spacing, color, glow, outline and box. It becomes a clip like a graphic; the pencil on the clip edits it again.",
          "**+ Text** gestaltet einen bildschirmfüllenden Text-Rahmen: Schrift, Größe, Fett, Kursiv, Großbuchstaben, Ausrichtung, Zeilen- und Zeichenabstand, Farbe, Leuchten, Kontur und Kasten. Er wird ein Clip wie eine Grafik; der Stift am Clip bearbeitet ihn wieder."),
        IMG("text-editor.png", "Text clip editor", "Editor für Text-Clips",
            ("The text editor with live preview of the full-screen frame.", "Der Text-Editor mit Live-Vorschau des bildschirmfüllenden Rahmens.")),
        H2("From LJ-Link", "Aus LJ-Link"),
        P("Library → LJ-Link (DJ): **Now Playing** is a lower third with cover, title and artist of the master deck, shown 8, 15 or 30 s after a track change or always; **DJ waveform** is the scrolling waveform like on the player. In LJ-Link's privacy mode Now Playing stays empty.",
          "Bibliothek → LJ-Link (DJ): **Now Playing** ist eine Bauchbinde mit Cover, Titel und Artist des Master-Decks, 8, 15 oder 30 s nach einem Trackwechsel oder immer; **DJ-Waveform** ist die scrollende Wellenform wie am Player. Im Privatsphäre-Modus von LJ-Link bleibt Now Playing leer."),
        ADM("warn", ("**Showing titles and covers in public:** if you put track titles, artists or cover art on screens the audience can see (for example with Now Playing), you may need permission from the rights holders or the venue. LJ-Link's privacy mode hides titles and covers.",
                     "**Titel und Cover öffentlich zeigen:** Wenn du Titel, Interpret oder Cover auf Leinwände oder Bildschirme bringst, die das Publikum sieht (z. B. mit Now Playing), brauchst du dafür unter Umständen die Erlaubnis der Rechteinhaber oder des Veranstalters. Mit dem Privatsphäre-Modus von LJ-Link bleiben Titel und Cover verborgen.")),
    )
    return (("Logos, videos and text clips", "Logos, Videos und Text-Clips"),
            ("Media in VJ-Link: logos with automatic background removal and beat animation, videos with beat loops, text clips, Now Playing and DJ waveforms.",
             "Medien in VJ-Link: Logos mit automatischem Freistellen und Animation im Takt, Videos mit Loop im Takt, Text-Clips, Now Playing und DJ-Waveform aus LJ-Link."),
            ("Visuals", "Visuals"), ("Logos, videos and text", "Logos, Videos und Text"),
            ("Your own media as clips.", "Deine eigenen Medien als Clips."), body)


@page("wiki-camera.html", "Cameras and person detection", "Kameras und Personen-Erkennung")
def _():
    body = SEC(
        P("Any video input works: a webcam, a capture card (for a camera on HDMI or SDI) or the OBS Virtual Camera. Library → **Search cameras** asks once for the camera permission and lists all inputs; a camera then becomes a clip like any other, also as a cue in SHOW.",
          "Jeder Video-Eingang geht: eine Webcam, eine Capture-Karte (für eine Kamera an HDMI oder SDI) oder die OBS Virtual Camera. Bibliothek → **Kameras suchen** fragt einmal nach der Kamera-Freigabe und listet alle Eingänge; eine Kamera wird dann ein Clip wie jeder andere, auch als Cue in der SHOW."),
        H2("Looks", "Looks"),
        TABLE([("Look", "Look"), ("What you see", "Was du siehst")], [
            [("Normal", "Normal"), ("the camera picture", "das Kamerabild")],
            [("Silhouette", "Silhouette"), ("people as a filled shape, black or in the layer color", "Personen als gefüllte Form, schwarz oder in der Farbe der Ebene")],
            [("Outline", "Umriss"), ("a glowing line around the person", "eine leuchtende Linie um die Person")],
            [("Dot matrix, ASCII, halftone", "Dot-Matrix, ASCII, Raster"), ("dots, characters or print dots by brightness, cell size adjustable", "Punkte, Zeichen oder Druckpunkte nach Helligkeit, Zellgröße einstellbar")],
            [("Thermal, duotone", "Wärmebild, Duoton"), ("false colors, or slot A for dark and slot B for bright", "Falschfarben oder Slot A für dunkel und Slot B für hell")],
            [("Mask positive", "Maske positiv"), ("on the top layer: the visuals below are only visible inside the person", "auf der obersten Ebene: Die Visuals darunter sind nur in der Person sichtbar")],
            [("Mask negative", "Maske negativ"), ("on the top layer: the person is cut out of the visuals", "auf der obersten Ebene: Die Person wird aus den Visuals ausgeschnitten")],
        ]),
        H2("Person detection", "Personen-Erkennung"),
        P("Silhouette, outline and the masks need to know where the person is. VJ-Link uses MediaPipe person segmentation for this: it runs on the computer itself, without internet and without a green screen. The fader **Tightness** sets how close the shape follows the person.",
          "Silhouette, Umriss und die Masken müssen wissen, wo die Person ist. Dafür nutzt VJ-Link die MediaPipe-Personen-Segmentierung: Sie läuft auf dem Rechner selbst, ohne Internet und ohne Greenscreen. Der Regler **Kontur** bestimmt, wie eng die Form der Person folgt."),
        ADM("beta", ("Tested with one person in front of a webcam. Several people, people far away on a big stage and stage lighting with haze and backlight are not tested yet.",
                     "Getestet mit einer Person vor einer Webcam. Mehrere Personen, Personen weit weg auf einer großen Bühne und Bühnenlicht mit Nebel und Gegenlicht sind noch nicht getestet.")),
        ADM("tip", ("The masks work on all layers below them, so put the camera layer at the very top.", "Die Masken wirken auf alle Ebenen darunter; leg die Kamera-Ebene deshalb ganz nach oben.")),
    )
    return (("Camera looks: silhouettes and masks, no green screen", "Kamera-Looks: Silhouette und Masken ohne Greenscreen"),
            ("Webcam, capture card or OBS camera in VJ-Link: silhouette, outline, dot matrix, ASCII and masks with local person detection, no green screen.",
             "Webcam, Capture-Karte oder OBS-Kamera in VJ-Link: Silhouette, Umriss, Dot-Matrix, ASCII und Masken mit lokaler Personen-Erkennung, ohne Greenscreen."),
            ("Visuals", "Visuals"), ("Cameras and person detection", "Kameras und Personen-Erkennung"),
            ("Live camera looks for the dance floor and the stage.", "Live-Kamera-Looks für Tanzfläche und Bühne."), body)
