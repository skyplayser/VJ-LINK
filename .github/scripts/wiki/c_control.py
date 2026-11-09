import json
from pathlib import Path
from wikilib import *

CH = json.loads((Path(__file__).parent / "channels.json").read_text(encoding="utf-8"))

group("Control", "Steuerung")


@page("wiki-desk.html", "Light desk", "Lichtpult")
def _():
    body = SEC(
        P("VJ-Link listens to one universe of **Art-Net** or **sACN** and behaves like a fixture with 91 channels. Only channels that change take effect, so the mouse, MIDI and the desk can work side by side: a fader that does not move on the desk does not overwrite what you set by hand.",
          "VJ-Link hört auf ein Universe **Art-Net** oder **sACN** und verhält sich wie ein Gerät mit 91 Kanälen. Es wirken nur Kanäle, die sich ändern – Maus, MIDI und Pult arbeiten also nebeneinander: Ein Fader, der sich am Pult nicht bewegt, überschreibt nicht, was du von Hand eingestellt hast."),
        ADM("beta", ("The profile is built and tested with Art-Net and sACN senders, but not yet confirmed on a real grandMA or Daslight. Please tell us how it works for you.",
                     "Das Profil ist gebaut und mit Art-Net- und sACN-Sendern getestet, aber noch nicht an einem echten grandMA oder Daslight bestätigt. Sag uns bitte, wie es bei dir läuft.")),
        H2("Set up", "Einrichten"),
        STEPS(("Desk and VJ-Link computer in the same network. On Windows allow VJ-Link for private networks.", "Pult und VJ-Link-Rechner im selben Netz. Unter Windows VJ-Link für private Netzwerke zulassen."),
              ("**CONNECT** → set the **Art-Net universe** (0 is the first) or the **sACN universe** (1 is the first) and the **start address**.", "**VERBINDEN** → **Art-Net-Universe** (0 ist das erste) oder **sACN-Universe** (1 ist das erste) und die **Startadresse** einstellen."),
              ("**Save the channel list (CSV)** and create VJ-Link on the desk as a fixture with 91 channels, or patch 91 dimmer channels.", "**Kanalliste speichern (CSV)** und VJ-Link am Pult als Gerät mit 91 Kanälen anlegen oder 91 Dimmerkanäle patchen."),
              ("Move a fader on the desk: the live values under CONNECT show it, the DMX pill at the top turns green.", "Einen Fader am Pult bewegen: Die Live-Werte unter VERBINDEN zeigen ihn, die DMX-Anzeige oben wird grün.")),
        IMG("connect.png", "CONNECT tab with live DMX values", "Tab VERBINDEN mit DMX-Live-Werten",
            ("CONNECT: Art-Net, sACN, OSC and LJ-Link with live values.", "VERBINDEN: Art-Net, sACN, OSC und LJ-Link mit Live-Werten.")),
        H2("Channel list", "Kanalliste"),
        P("Addresses relative to the start address (channel 1 = start address).", "Adressen relativ zur Startadresse (Kanal 1 = Startadresse)."),
        TABLE([("Channel", "Kanal"), ("Function", "Funktion")], [[str(c["ch"]), (c["en"], c["de"])] for c in CH]),
        H2("More than the profile", "Mehr als das Profil"),
        P("Layers 5–8 and every other control (laser position, slot hue, scenes 1–32, test patterns, timecode …) can be put on any DMX channel with **MAPPING → DMX / Art-Net**: click the element, move the channel on the desk.",
          "Ebenen 5–8 und jedes weitere Element (Laser-Lage, Farbton der Slots, Szenen 1–32, Testbilder, Timecode …) legst du mit **MAPPING → DMX / Art-Net** auf beliebige DMX-Kanäle: Element anklicken, Kanal am Pult bewegen."),
    )
    return (("Connect a light desk: grandMA, Daslight, Art-Net and sACN", "Lichtpult anbinden: grandMA, Daslight, Art-Net und sACN"),
            ("Control VJ-Link from grandMA2, grandMA3, Daslight or any desk over Art-Net or sACN: set the universe and start address, patch the 91-channel profile, full channel list.",
             "VJ-Link von grandMA2, grandMA3, Daslight oder jedem Pult über Art-Net oder sACN steuern: Universe und Startadresse einstellen, das 91-Kanal-Profil patchen, vollständige Kanalliste."),
            ("Control", "Steuerung"), ("Light desk", "Lichtpult"),
            ("Patch VJ-Link like a fixture.", "VJ-Link wie ein Gerät patchen."), body)


@page("wiki-mapping.html", "Mapping: keyboard, MIDI, DMX, OSC", "Mapping: Tastatur, MIDI, DMX, OSC")
def _():
    body = SEC(
        P("Like in Daslight: everything you can click can be put on a key, a MIDI note or CC, a DMX channel or an OSC address.", "Wie in Daslight: Alles, was du anklicken kannst, lässt sich auf eine Taste, eine MIDI-Note oder einen CC, einen DMX-Kanal oder eine OSC-Adresse legen."),
        STEPS(("**MAPPING** → Keyboard, MIDI, DMX / Art-Net or OSC (or ⇧⌘K / M / D / O). Every element that can be mapped lights up.", "**MAPPING** → Tastatur, MIDI, DMX / Art-Net oder OSC (oder ⇧⌘K / M / D / O). Jedes zuweisbare Element leuchtet."),
              ("Click an element, then press the key, move the fader or pad, move the DMX channel or send the OSC message.", "Ein Element anklicken, dann die Taste drücken, den Fader oder das Pad bewegen, den DMX-Kanal bewegen oder die OSC-Nachricht senden."),
              ("Green means mapped. Clicking it shows its mappings, to remove one or to map a second input.", "Grün heißt zugewiesen. Ein Klick zeigt die Zuweisungen, zum Entfernen oder für einen zweiten Eingang."),
              ("**Done** or Esc ends the mode. The mappings are saved with the project.", "**Fertig** oder Esc beendet den Modus. Die Zuweisungen werden mit dem Projekt gespeichert.")),
        IMG("mapping.png", "MIDI mapping mode", "MIDI-Mapping-Modus", ("In mapping mode every assignable element lights up.", "Im Mapping-Modus leuchtet jedes zuweisbare Element.")),
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
    return (("Mapping: keyboard, MIDI controllers, DMX and OSC", "Mapping: Tastatur, MIDI-Controller, DMX und OSC"),
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
            [("**Audio input**", "**Audio-Eingang**"), ("drives audio visuals and layers with the drive Audio", "treibt Audio-Visuals und Ebenen mit dem Antrieb Audio"), BADGE("stable", "Tested", "Getestet")],
            [("**Tap or type**", "**Tap oder eintippen**"), ("TAP in the top bar or the fader bar; click the BPM and type a number", "TAP oben oder in der Fader-Leiste; BPM anklicken und eine Zahl eintippen"), BADGE("stable", "Tested", "Getestet")],
        ]),
        P("Next to the BPM, **AUTO** picks the source by itself (LJ-Link before Ableton Link before OSC before MIDI before audio before tap). Click it to fix one source. If a source drops out, the clock keeps running at the last tempo without a jump.",
          "Neben dem BPM wählt **AUTO** die Quelle selbst (LJ-Link vor Ableton Link vor OSC vor MIDI vor Audio vor Tap). Anklicken legt eine Quelle fest. Fällt eine Quelle aus, läuft die Uhr ohne Sprung im letzten Tempo weiter."),
        ADM("note", ("Ableton Link needs **Carabiner** (Deep Symmetry) as its own program. The Link SDK is GPL, so VJ-Link does not contain it.",
                     "Ableton Link braucht **Carabiner** (Deep Symmetry) als eigenes Programm. Das Link-SDK steht unter GPL, deshalb ist es nicht in VJ-Link.")),
        H2("Audio input", "Audio-Eingang"),
        P("**AUDIO** at the top chooses a microphone or line-in with its level. **Works on** decides whether only the audio visuals (equalizer, oscilloscope …) or all visuals react to it.",
          "**AUDIO** oben wählt ein Mikrofon oder Line-In mit Pegel. **Wirkt auf** entscheidet, ob nur die Audio-Visuals (Equalizer, Oszilloskop …) oder alle Visuals darauf reagieren."),
    )
    return (("Tempo and beat: LJ-Link, Ableton Link, OSC, MIDI clock, audio and tap", "Tempo und Takt: LJ-Link, Ableton Link, OSC, MIDI-Clock, Audio und Tap"),
            ("Where VJ-Link gets its tempo: LJ-Link, Ableton Link through Carabiner, OSC, MIDI clock, the audio input or tap, with automatic choice and fallback without a jump.",
             "Woher VJ-Link sein Tempo bekommt: LJ-Link, Ableton Link über Carabiner, OSC, MIDI-Clock, Audio-Eingang oder Tap, mit automatischer Wahl und Rückfall ohne Sprung."),
            ("Control", "Steuerung"), ("Tempo and beat", "Tempo und Takt"),
            ("One clock for everything, fed by the music.", "Eine Uhr für alles, gespeist von der Musik."), body)


@page("wiki-ljlink.html", "VJ-Link and LJ-Link", "VJ-Link und LJ-Link")
def _():
    body = SEC(
        P("[LJ-Link](https://skyplayser.github.io/LJ-Link/) reads Pioneer CDJs, Denon Prime and Serato and shows the lighting jockey every deck. VJ-Link takes from it what the visuals need.",
          "[LJ-Link](https://skyplayser.github.io/LJ-Link/) liest Pioneer-CDJs, Denon Prime und Serato und zeigt dem Lichtjockey jedes Deck. VJ-Link nimmt daraus, was die Visuals brauchen."),
        UL(("**Tempo and beat phase** of the master deck: the visuals run exactly in time.", "**Tempo und Beat-Phase** des Master-Decks: Die Visuals laufen genau im Takt."),
           ("**Phrases**: scenes with next on phrase change move on when the music changes its part (with Auto).", "**Phrasen**: Szenen mit weiter bei Phrasenwechsel gehen weiter, wenn die Musik den Teil wechselt (mit Auto)."),
           ("**Title, artist and cover** for the Now Playing clip, and the **waveform** for the DJ waveform clip.", "**Titel, Artist und Cover** für den Clip Now Playing und die **Waveform** für den Clip DJ-Waveform."),
           ("**Status back**: VJ-Link reports scene, blackout, master and BPM to LJ-Link. **Open LJ-Link** opens its web interface.", "**Status zurück**: VJ-Link meldet Szene, Blackout, Master und BPM an LJ-Link. **LJ-Link öffnen** öffnet dessen Weboberfläche.")),
        H2("Connecting", "Verbinden"),
        P("Nothing to set up: VJ-Link finds LJ-Link on this computer and in the network by itself (Bonjour). Only if it is in another network, enter its address or `address:port` under CONNECT → LJ-Link.",
          "Nichts einzustellen: VJ-Link findet LJ-Link auf diesem Rechner und im Netz von selbst (Bonjour). Nur wenn es in einem anderen Netz läuft, trag seine Adresse oder `Adresse:Port` unter VERBINDEN → LJ-Link ein."),
        ADM("tip", ("Tested with LJ-Link 1.7.7. Older versions also work through their web interface, with tempo, decks and titles but without beat phase and phrases.",
                    "Getestet mit LJ-Link 1.7.7. Ältere Versionen gehen auch über deren Weboberfläche, mit Tempo, Decks und Titeln, aber ohne Beat-Phase und Phrasen.")),
        H2("Try also: LJ-Link", "Probier auch: LJ-Link"),
        P("Free for macOS and Windows: [LJ-Link website](https://skyplayser.github.io/LJ-Link/) · [download](https://github.com/skyplayser/LJ-Link/releases/latest).",
          "Kostenlos für macOS und Windows: [LJ-Link-Website](https://skyplayser.github.io/LJ-Link/) · [Download](https://github.com/skyplayser/LJ-Link/releases/latest)."),
    )
    return (("VJ-Link and LJ-Link together", "VJ-Link und LJ-Link zusammen"),
            ("VJ-Link with LJ-Link: tempo and beat phase from Pioneer and Denon, scene changes on phrases, Now Playing and the DJ waveform as clips, found automatically.",
             "VJ-Link mit LJ-Link: Tempo und Beat-Phase von Pioneer und Denon, Szenenwechsel bei Phrasen, Now Playing und DJ-Waveform als Clips, automatisch gefunden."),
            ("Control", "Steuerung"), ("VJ-Link and LJ-Link", "VJ-Link und LJ-Link"),
            ("The DJ's music drives the visuals.", "Die Musik des DJs treibt die Visuals."), body)


@page("wiki-modulation.html", "Modulation", "Modulation")
def _():
    body = SEC(
        P("**MAPPING → Modulation** (⇧⌘L): click a fader and it swings around its position by itself, the visuals change without anybody touching anything. Modulated faders have a turquoise frame.",
          "**MAPPING → Modulation** (⇧⌘L): Einen Regler anklicken, und er schwingt von selbst um seine Position, die Visuals verändern sich, ohne dass jemand etwas anfasst. Modulierte Regler sind türkis umrandet."),
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
