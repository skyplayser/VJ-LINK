import json
from pathlib import Path
from wikilib import *

CH = json.loads((Path(__file__).parent / "channels.json").read_text(encoding="utf-8"))

group("Control", "Steuerung")


@page("wiki-mapping.html", "Mapping: keyboard, MIDI, DMX, OSC", "Mapping: Tastatur, MIDI, DMX, OSC")
def _():
    body = SEC(
        P("Like in Daslight: everything you can click can be put on a key, a MIDI note or CC, a DMX channel or an OSC address.", "Wie in Daslight: Alles, was du anklicken kannst, lässt sich auf eine Taste, eine MIDI-Note oder einen CC, einen DMX-Kanal oder eine OSC-Adresse legen."),
        STEPS(("**MAPPING** → Keyboard, MIDI, DMX / Art-Net or OSC (or ⇧⌘K / M / D / O). Every element that can be mapped lights up.", "**MAPPING** → Tastatur, MIDI, DMX / Art-Net oder OSC (oder ⇧⌘K / M / D / O). Jedes zuweisbare Element leuchtet."),
              ("Click an element, then press the key, move the fader or pad, move the DMX channel or send the OSC message.", "Ein Element anklicken, dann die Taste drücken, den Fader oder das Pad bewegen, den DMX-Kanal bewegen oder die OSC-Nachricht senden."),
              ("Green means mapped. Clicking it shows its mappings, to remove one or to map a second input.", "Grün heißt zugewiesen. Ein Klick zeigt die Zuweisungen, zum Entfernen oder für einen zweiten Eingang."),
              ("**Done** or Esc ends the mode. The mappings are saved with the project.", "**Fertig** oder Esc beendet den Modus. Die Zuweisungen werden mit dem Projekt gespeichert.")),
        GUIDE("mapping-guide.png", "MIDI mapping mode with numbered areas", "MIDI-Mapping-Modus mit nummerierten Bereichen", [
            ("**MAPPING** opens the menu: keyboard, MIDI, DMX / Art-Net, OSC, modulation.", "**MAPPING** öffnet das Menü: Tastatur, MIDI, DMX / Art-Net, OSC, Modulation."),
            ("Every assignable element lights up in purple. Click one, then move the input.", "Jedes zuweisbare Element leuchtet lila. Eines anklicken, dann den Eingang bewegen."),
            ("Switch between keyboard, MIDI, DMX and OSC; below the list of all mappings of that kind.", "Zwischen Tastatur, MIDI, DMX und OSC wechseln; darunter die Liste aller Zuweisungen dieser Art."),
            ("**Controller template**: a ready layout for APC mini or nanoKONTROL2.", "**Controller-Vorlage**: eine fertige Belegung für APC mini oder nanoKONTROL2."),
            ("**Export** and **Import** the mappings as a file.", "Zuweisungen als Datei **exportieren** und **importieren**."),
        ]),
        H2("MIDI controllers", "MIDI-Controller"),
        P("Controllers are found when you plug them in. Pads and buttons get LED feedback. **Controller template** loads a ready layout:", "Controller werden beim Anstecken gefunden. Pads und Tasten bekommen LED-Rückmeldung. **Controller-Vorlage** lädt eine fertige Belegung:"),
        TABLE([("Controller", "Controller"), ("Layout", "Belegung"), ("Status", "Stand")], [
            ["Akai APC mini mk2", ("grid = layer × clip, right buttons = scenes, bottom buttons = blackout, strobe, flash, beat, tap, back, next, auto, faders = layers, strobe, effects, transition, master", "Raster = Ebene × Clip, rechte Tasten = Szenen, untere Tasten = Blackout, Strobe, Flash, Takt, Tap, Zurück, Weiter, Auto, Fader = Ebenen, Strobe, Effekte, Blende, Master"), BADGE("beta", "Built", "Gebaut")],
            ["Akai APC mini (mk1)", ("as the mk2", "wie der mk2"), BADGE("beta", "Built", "Gebaut")],
            ["Korg nanoKONTROL2", ("faders = layers 1–4, strobe, effects, master, knobs = effect 1 and slot hues, buttons = scenes, clips, strobe, blackout", "Fader = Ebenen 1–4, Strobe, Effekte, Master, Drehregler = Effekt 1 und Farbtöne der Slots, Tasten = Szenen, Clips, Strobe, Blackout"), BADGE("beta", "Built", "Gebaut")],
        ]),
        P("**Export** and **Import** save all mappings as a file, for example to take your controller layout to another project.", "**Exportieren** und **Importieren** speichern alle Zuweisungen als Datei, etwa um deine Controller-Belegung in ein anderes Projekt mitzunehmen."),
        H2("OSC", "OSC"),
        P("OSC arrives on UDP port **8000**. Every control has the address `/vjlink/ctl/<id>` with a value 0–1; the ids are listed in the [reference](wiki-reference.html#osc).", "OSC kommt auf UDP-Port **8000** an. Jedes Element hat die Adresse `/vjlink/ctl/<id>` mit einem Wert 0–1; die IDs stehen in der [Referenz](wiki-reference.html#osc)."),
    )
    return (("MIDI, DMX and OSC mapping for visuals", "MIDI-, DMX- und OSC-Mapping für Visuals"),
            ("Map any VJ-Link control to a key, MIDI note or CC, DMX channel or OSC address, with LED feedback and templates for Akai APC mini and Korg nanoKONTROL2.",
             "Jedes VJ-Link-Element auf Taste, MIDI-Note oder CC, DMX-Kanal oder OSC-Adresse legen, mit LED-Rückmeldung und Vorlagen für Akai APC mini und Korg nanoKONTROL2."),
            ("Control", "Steuerung"), ("Mapping", "Mapping"),
            ("Click an element, move a fader, done.", "Element anklicken, Fader bewegen, fertig."), body)


@page("wiki-tempo.html", "Tempo and beat", "Tempo und Takt")
def _():
    body = SEC(
        P("All visuals, effects, strobes, loops and scene changes run on one clock. Its tempo comes from the best source available:", "Alle Visuals, Effekte, Strobes, Loops und Szenenwechsel laufen auf einer Uhr. Ihr Tempo kommt aus der besten verfügbaren Quelle:"),
        TABLE([("Source", "Quelle"), ("How", "Wie"), ("Status", "Stand")], [
            [("**LJ-Link**", "**LJ-Link**"), ("BPM and beat phase of the master deck, phrases and track changes; found automatically", "BPM und Beat-Phase des Master-Decks, Phrasen und Trackwechsel; wird automatisch gefunden"), BADGE("stable", "Tested", "Getestet")],
            [("**Ableton Link**", "**Ableton Link**"), ("through Carabiner on TCP port 17000", "über Carabiner auf TCP-Port 17000"), BADGE("beta", "Built", "Gebaut")],
            [("**OSC**", "**OSC**"), ("`/vjlink/bpm` with the BPM, `/vjlink/tap` taps", "`/vjlink/bpm` mit dem BPM, `/vjlink/tap` tappt"), BADGE("stable", "Tested", "Getestet")],
            [("**MIDI clock**", "**MIDI-Clock**"), ("24 pulses per beat, start sets the beat to 0", "24 Takte pro Viertel, Start setzt den Beat auf 0"), BADGE("beta", "Built", "Gebaut")],
            [("**Audio input**", "**Audio-Eingang**"), ("drives audio visuals and layers with the drive Audio; it does not set the tempo (tempo detection from audio is planned)", "treibt Audio-Visuals und Ebenen mit dem Antrieb Audio; das Tempo setzt er nicht (Tempo-Erkennung aus Audio ist geplant)"), BADGE("stable", "Tested", "Getestet")],
            [("**Tap or type**", "**Tap oder eintippen**"), ("TAP in the top bar or the fader bar; click the BPM and type a number", "TAP oben oder in der Fader-Leiste; BPM anklicken und eine Zahl eintippen"), BADGE("stable", "Tested", "Getestet")],
        ]),
        P("Next to the BPM, **AUTO** picks the source by itself (LJ-Link before Ableton Link before OSC before MIDI clock before tap). Click it to fix one source. If a source drops out, the clock keeps running at the last tempo without a jump.",
          "Neben dem BPM wählt **AUTO** die Quelle selbst (LJ-Link vor Ableton Link vor OSC vor MIDI-Clock vor Tap). Anklicken legt eine Quelle fest. Fällt eine Quelle aus, läuft die Uhr ohne Sprung im letzten Tempo weiter."),
        ADM("note", ("Ableton Link needs **Carabiner** (Deep Symmetry) as its own program. The Link SDK is GPL, so VJ-Link does not contain it.",
                     "Ableton Link braucht **Carabiner** (Deep Symmetry) als eigenes Programm. Das Link-SDK steht unter GPL, deshalb ist es nicht in VJ-Link.")),
        H2("Audio input", "Audio-Eingang"),
        P("**AUDIO** at the top chooses a microphone or line-in with its level. **Works on** decides whether only the audio visuals (equalizer, oscilloscope …) or all visuals react to it.",
          "**AUDIO** oben wählt ein Mikrofon oder Line-In mit Pegel. **Wirkt auf** entscheidet, ob nur die Audio-Visuals (Equalizer, Oszilloskop …) oder alle Visuals darauf reagieren."),
    )
    return (("Tempo: LJ-Link, Ableton Link, MIDI clock, tap", "Tempo: LJ-Link, Ableton Link, MIDI-Clock, Tap"),
            ("Where VJ-Link gets its tempo: LJ-Link, Ableton Link through Carabiner, OSC, MIDI clock or tap, with automatic choice and fallback without a jump.",
             "Woher VJ-Link sein Tempo bekommt: LJ-Link, Ableton Link über Carabiner, OSC, MIDI-Clock oder Tap, mit automatischer Wahl und Rückfall ohne Sprung."),
            ("Control", "Steuerung"), ("Tempo and beat", "Tempo und Takt"),
            ("One clock for everything, fed by the music.", "Eine Uhr für alles, gespeist von der Musik."), body)


@page("wiki-modulation.html", "Modulation", "Modulation")
def _():
    body = SEC(
        P("**MAPPING → Modulation** (⇧⌘L): click a fader and it swings around its position by itself, the visuals change without anybody touching anything. Modulated faders have a turquoise frame.",
          "**MAPPING → Modulation** (⇧⌘L): Einen Regler anklicken, und er schwingt von selbst um seine Position, die Visuals verändern sich, ohne dass jemand etwas anfasst. Modulierte Regler sind türkis umrandet."),
        IMG("modulation.png", "Modulation mode with the list of modulations", "Modulations-Modus mit der Liste der Modulationen",
            ("Modulation mode: click a fader, choose the source, beats and strength. The demo comes with five modulations.", "Modulations-Modus: einen Regler anklicken, Quelle, Beats und Stärke wählen. Die Demo bringt fünf Modulationen mit.")),
        TABLE([("Source", "Quelle"), ("Movement", "Bewegung")], [
            [("Sine, triangle, saw, square, random", "Sinus, Dreieck, Sägezahn, Rechteck, Zufall"), ("an LFO in time, ¼ to 32 beats per round", "ein LFO im Takt, ¼ bis 32 Beats pro Durchlauf")],
            [("Bass, mids, highs", "Bass, Mitten, Höhen"), ("follows the audio input or LJ-Link", "folgt dem Audio-Eingang oder LJ-Link")],
        ]),
        P("**Strength** sets how far it swings: at full strength ±50 % around the set value. The demo uses modulation for the geometry layer, the bass on the RGB shift and a slow hue cycle of slot E.",
          "**Stärke** bestimmt, wie weit er schwingt: bei voller Stärke ±50 % um den eingestellten Wert. Die Demo nutzt Modulation für die Geometrie-Ebene, den Bass auf dem RGB-Versatz und einen langsamen Farbtonlauf von Slot E."),
    )
    return (("Modulation: LFOs and audio on any fader", "Modulation: LFOs und Audio auf jedem Regler"),
            ("Let VJ-Link faders move by themselves: LFOs in time (sine, triangle, saw, square, random) or bass, mids and highs from the audio.",
             "VJ-Link-Regler von selbst bewegen lassen: LFOs im Takt (Sinus, Dreieck, Sägezahn, Rechteck, Zufall) oder Bass, Mitten und Höhen aus dem Audio."),
            ("Control", "Steuerung"), ("Modulation", "Modulation"),
            ("Faders that move by themselves.", "Regler, die sich von selbst bewegen."), body)
