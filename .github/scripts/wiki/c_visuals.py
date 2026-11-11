import json
from pathlib import Path
from wikilib import *

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


@page("wiki-visuals.html", "The 150 visuals", "Die 150 Visuals")
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
        H2("All categories", "Alle Kategorien"),
        TABLE([("Category", "Kategorie"), ("Visuals", "Visuals")], rows),
        ADM("tip", ("Colors: with the color source **Original** each visual shows its own colors. With a slot it takes the show colors from the desk.",
                    "Farben: Mit der Farbquelle **Original** zeigt jedes Visual seine eigenen Farben. Mit einem Slot übernimmt es die Show-Farben vom Pult.")),
    )
    return (("150 visuals: fractals, 3D, lasers, particles", "150 Visuals: Fraktale, 3D, Laser, Partikel"),
            ("All 150 VJ-Link visuals in 15 categories: minimal, 3D, fractals, demoscene, sacred geometry, glitch, op art, audio, particles, retro and lasers.",
             "Alle 150 VJ-Link-Visuals in 15 Kategorien: Minimal, 3D, Fraktale, Demoscene, Heilige Geometrie, Glitch, Op-Art, Audio, Partikel, Retro und Laser."),
            ("Visuals", "Visuals"), ("The 150 visuals", "Die 150 Visuals"),
            ("Every visual, sorted by category.", "Jedes Visual, nach Kategorie sortiert."), body)


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
