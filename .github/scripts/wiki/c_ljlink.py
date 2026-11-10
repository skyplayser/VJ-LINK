from wikilib import *

group("LJ-Link", "LJ-Link")


@page("wiki-ljlink.html", "VJ-Link and LJ-Link", "VJ-Link und LJ-Link")
def _():
    body = SEC(
        P("[LJ-Link](https://skyplayser.github.io/LJ-Link/) is the sister project: it reads Pioneer CDJs (Pro DJ Link), Denon Prime (StageLinQ) and Serato and shows the lighting jockey every deck with waveform, cues and BPM. VJ-Link takes from it what the visuals need, so lights, visuals and music run in one beat without anybody tapping.",
          "[LJ-Link](https://skyplayser.github.io/LJ-Link/) ist das Schwesterprojekt: Es liest Pioneer-CDJs (Pro DJ Link), Denon Prime (StageLinQ) und Serato und zeigt dem Lichtjockey jedes Deck mit Waveform, Cues und BPM. VJ-Link nimmt daraus, was die Visuals brauchen – so laufen Licht, Visuals und Musik in einem Takt, ohne dass jemand tappt."),
        H2("What VJ-Link gets from LJ-Link", "Was VJ-Link von LJ-Link bekommt"),
        TABLE([("Data", "Daten"), ("What VJ-Link does with it", "Was VJ-Link daraus macht")], [
            [("Tempo and beat phase of the master deck", "Tempo und Beat-Phase des Master-Decks"), ("the clock of all visuals, effects, strobes, loops and transitions; the beat lands exactly on the kick", "die Uhr aller Visuals, Effekte, Strobes, Loops und Übergänge; der Beat sitzt genau auf der Kick")],
            [("Phrase changes", "Phrasenwechsel"), ("scenes with “next on phrase change” move on when the track changes its part (Auto on)", "Szenen mit „weiter bei Phrasenwechsel“ gehen weiter, wenn der Track den Teil wechselt (Auto an)")],
            [("Track change", "Trackwechsel"), ("shows the Now Playing lower third for 8, 15 or 30 s", "zeigt die Now-Playing-Bauchbinde für 8, 15 oder 30 s")],
            [("Title, artist, cover", "Titel, Artist, Cover"), ("the clip Now Playing (empty in LJ-Link's privacy mode)", "der Clip Now Playing (leer im Privatsphäre-Modus von LJ-Link)")],
            [("Waveform and position", "Waveform und Position"), ("the clip DJ waveform, scrolling like on the player", "der Clip DJ-Waveform, scrollend wie am Player")],
            [("Bass, mids, highs", "Bass, Mitten, Höhen"), ("drive audio visuals and modulation without a microphone", "treiben Audio-Visuals und Modulation ohne Mikrofon")],
        ]),
        P("Back to LJ-Link VJ-Link reports its scene, blackout, master, BPM and tempo source; **Open LJ-Link** under CONNECT opens LJ-Link's web interface.",
          "Zurück an LJ-Link meldet VJ-Link Szene, Blackout, Master, BPM und Tempo-Quelle; **LJ-Link öffnen** unter VERBINDEN öffnet die Weboberfläche von LJ-Link."),
        H2("Connecting", "Verbinden"),
        P("Nothing to set up: VJ-Link finds LJ-Link on the same computer and in the network by itself (Bonjour) and connects. The LJ-LINK pill at the top turns green, CONNECT shows the decks. Only if LJ-Link runs in another network, enter its address or `address:port` under CONNECT → LJ-Link.",
          "Nichts einzustellen: VJ-Link findet LJ-Link auf demselben Rechner und im Netz von selbst (Bonjour) und verbindet sich. Die LJ-LINK-Anzeige oben wird grün, VERBINDEN zeigt die Decks. Nur wenn LJ-Link in einem anderen Netz läuft, trag seine Adresse oder `Adresse:Port` unter VERBINDEN → LJ-Link ein."),
        TABLE([("LJ-Link", "LJ-Link"), ("What works", "Was geht"), ("Status", "Stand")], [
            ["1.7.7", ("everything: tempo, beat phase, phrases, decks, titles, waveform", "alles: Tempo, Beat-Phase, Phrasen, Decks, Titel, Waveform"), BADGE("stable", "Tested", "Getestet")],
            [("older", "älter"), ("through its web interface: tempo, decks, titles, track changes; no beat phase and phrases", "über dessen Weboberfläche: Tempo, Decks, Titel, Trackwechsel; keine Beat-Phase und Phrasen"), BADGE("beta", "Built", "Gebaut")],
        ]),
        H2("Scenes on the phrase", "Szenen auf der Phrase"),
        STEPS(("Build your scenes (for example Intro, Build, Drop, Breakdown).", "Szenen bauen (zum Beispiel Intro, Build, Drop, Breakdown)."),
              ("Pencil on each scene → **Afterwards: next on phrase change**.", "Stift an jeder Szene → **Danach: weiter bei Phrasenwechsel**."),
              ("Switch **Auto** on. Every time the DJ's track starts a new phrase, VJ-Link moves on to the next scene, with the scene's own transition.", "**Auto** einschalten. Jedes Mal, wenn der Track des DJs eine neue Phrase beginnt, geht VJ-Link zur nächsten Szene, mit dem Übergang der Szene.")),
        ADM("tip", ("The desk can take over at any time: a scene from the desk or a pad wins, Auto goes on from there.", "Das Pult kann jederzeit übernehmen: Eine Szene vom Pult oder einem Pad gewinnt, Auto macht von dort weiter.")),
        H2("Club rules with Auto", "Club-Regeln mit Auto"),
        P("With **Auto** on, VJ-Link also follows these fixed rules from the **master deck**: chorus → scene named „Drop“, up → „Build“, down and outro → „Ambient“, hot cue C → strobe for 4 beats, loop on → effect 1 of layer 2 to 80 %. A rule only fires if a scene with that name exists. With Auto off, the desk alone decides.",
          "Mit **Auto** folgt VJ-Link zusätzlich diesen festen Regeln vom **Master-Deck**: Chorus → Szene namens „Drop“, Up → „Build“, Down und Outro → „Ambient“, Hot Cue C → Strobe für 4 Beats, Loop an → Effekt 1 von Ebene 2 auf 80 %. Eine Regel greift nur, wenn es eine Szene mit diesem Namen gibt. Ohne Auto entscheidet allein das Pult."),
        H2("Try also: LJ-Link", "Probier auch: LJ-Link"),
        P("Free for macOS and Windows: [LJ-Link website](https://skyplayser.github.io/LJ-Link/) · [download](https://github.com/skyplayser/LJ-Link/releases/latest) · [LJ-Link wiki](https://skyplayser.github.io/LJ-Link/wiki.html).",
          "Kostenlos für macOS und Windows: [LJ-Link-Website](https://skyplayser.github.io/LJ-Link/) · [Download](https://github.com/skyplayser/LJ-Link/releases/latest) · [LJ-Link-Wiki](https://skyplayser.github.io/LJ-Link/wiki.html)."),
    )
    return (("VJ-Link and LJ-Link together", "VJ-Link und LJ-Link zusammen"),
            ("VJ-Link with LJ-Link: tempo and beat phase from Pioneer and Denon, scene changes on phrases, Now Playing and the DJ waveform as clips, found automatically.",
             "VJ-Link mit LJ-Link: Tempo und Beat-Phase von Pioneer und Denon, Szenenwechsel auf der Phrase, Now Playing und DJ-Waveform als Clips, automatisch gefunden."),
            ("LJ-Link", "LJ-Link"), ("VJ-Link and LJ-Link", "VJ-Link und LJ-Link"),
            ("The DJ's music drives the visuals.", "Die Musik des DJs treibt die Visuals."), body)


@page("wiki-ljlink-setups.html", "Setups with LJ-Link", "Aufbauten mit LJ-Link")
def _():
    body = SEC(
        H2("One laptop for everything", "Ein Laptop für alles"),
        P("LJ-Link and VJ-Link on the same laptop, connected to the DJ network by cable. The laptop drives the projector. Simple and good for mobile DJs and small clubs.",
          "LJ-Link und VJ-Link auf demselben Laptop, per Kabel im DJ-Netz. Der Laptop treibt den Beamer. Einfach und gut für mobile DJs und kleine Clubs."),
        DIAGRAM(720, 220, {"cdj": (110, 70, 160, 48, "dj", ("CDJs / Denon", "CDJs / Denon"), None),
                           "sw": (340, 70, 120, 44, "net", ("Switch", "Switch"), None),
                           "pc": (560, 70, 190, 56, "pc", ("Laptop", "Laptop"), ("LJ-Link + VJ-Link", "LJ-Link + VJ-Link")),
                           "bm": (560, 180, 150, 44, "tab", ("Projector", "Beamer"), None)},
                [("cdj", "sw", "cable", None), ("sw", "pc", "cable", None), ("pc", "bm", "cable", ("HDMI", "HDMI"))]),
        STEPS(("Start LJ-Link and let it find the players.", "LJ-Link starten und die Player finden lassen."),
              ("Start VJ-Link: it finds LJ-Link on the same computer by itself.", "VJ-Link starten: Es findet LJ-Link auf demselben Rechner von selbst."),
              ("Open the projector as output and switch Auto on.", "Den Beamer als Ausgang öffnen und Auto einschalten.")),
        H2("LJ-Link at the booth, VJ-Link at FOH", "LJ-Link an der Booth, VJ-Link am FOH"),
        P("LJ-Link runs on a computer near the players, VJ-Link on its own computer at front of house next to the light desk. Both in one network; VJ-Link finds LJ-Link over Bonjour.",
          "LJ-Link läuft auf einem Rechner nahe der Player, VJ-Link auf einem eigenen Rechner am FOH neben dem Lichtpult. Beide im selben Netz; VJ-Link findet LJ-Link über Bonjour."),
        DIAGRAM(760, 230, {"cdj": (100, 70, 150, 48, "dj", ("CDJs + DJM", "CDJs + DJM"), None),
                           "lj": (320, 70, 150, 52, "pc", ("LJ-Link", "LJ-Link"), ("booth", "Booth")),
                           "sw": (520, 70, 120, 44, "net", ("Switch", "Switch"), ("long cable", "langes Kabel")),
                           "vj": (680, 150, 140, 52, "pc", ("VJ-Link", "VJ-Link"), ("FOH", "FOH")),
                           "led": (330, 190, 130, 44, "tab", ("LED wall", "LED-Wand"), None)},
                [("cdj", "lj", "cable", None), ("lj", "sw", "cable", None), ("sw", "vj", "cable", None), ("vj", "led", "cable", ("HDMI / fibre", "HDMI / Glasfaser"))]),
        H2("Club: CDJs, LJ-Link, grandMA and VJ-Link", "Club: CDJs, LJ-Link, grandMA und VJ-Link"),
        P("The full setup: LJ-Link reads the CDJs and sends the BPM to the grandMA (Telnet or OSC) and tempo and phrases to VJ-Link. The grandMA sends Art-Net to VJ-Link for scenes, colors and dimmer. Lights and visuals follow the same beat, the LJ runs everything from the desk.",
          "Der komplette Aufbau: LJ-Link liest die CDJs und schickt das BPM an den grandMA (Telnet oder OSC) und Tempo und Phrasen an VJ-Link. Der grandMA schickt Art-Net an VJ-Link für Szenen, Farben und Dimmer. Licht und Visuals folgen demselben Beat, der LJ fährt alles vom Pult."),
        DIAGRAM(760, 280, {"cdj": (100, 60, 150, 48, "dj", ("CDJs + DJM", "CDJs + DJM"), None),
                           "lj": (340, 60, 150, 52, "pc", ("LJ-Link", "LJ-Link"), None),
                           "ma": (340, 210, 160, 52, "desk", ("grandMA2 / 3", "grandMA2 / 3"), None),
                           "vj": (600, 135, 150, 52, "pc", ("VJ-Link", "VJ-Link"), None),
                           "led": (680, 245, 120, 44, "tab", ("LED wall", "LED-Wand"), None)},
                [("cdj", "lj", "cable", ("Pro DJ Link", "Pro DJ Link")), ("lj", "ma", "cable", ("BPM", "BPM")), ("lj", "vj", "cable", ("tempo, phrases", "Tempo, Phrasen")),
                 ("ma", "vj", "dmx", ("Art-Net", "Art-Net")), ("vj", "led", "cable", None)],
                cap=("All devices can share one switch; a separate light network works too if VJ-Link has a second network port.", "Alle Geräte können an einem Switch hängen; ein eigenes Lichtnetz geht auch, wenn VJ-Link einen zweiten Netzwerkanschluss hat.")),
        STEPS(("LJ-Link: find the players, set the light desk link to the grandMA ([LJ-Link wiki](https://skyplayser.github.io/LJ-Link/wiki-lighting-desks.html)).", "LJ-Link: Player finden, den Lichtpult-Link auf den grandMA stellen ([LJ-Link-Wiki](https://skyplayser.github.io/LJ-Link/wiki-lighting-desks.html))."),
              ("grandMA: Art-Net output to VJ-Link and patch VJ-Link, see [grandMA2](wiki-desk-grandma2.html) or [grandMA3](wiki-desk-grandma3.html).", "grandMA: Art-Net-Ausgang zu VJ-Link und VJ-Link patchen, siehe [grandMA2](wiki-desk-grandma2.html) oder [grandMA3](wiki-desk-grandma3.html)."),
              ("VJ-Link: check under CONNECT that LJ-Link and Art-Net both arrive.", "VJ-Link: unter VERBINDEN prüfen, dass LJ-Link und Art-Net beide ankommen.")),
        H2("Mobile with Daslight", "Mobil mit Daslight"),
        P("LJ-Link leads an Ableton Link session with the DJ's tempo; Daslight follows it as BPM source. VJ-Link takes the tempo straight from LJ-Link. Daslight can additionally send Art-Net or MIDI to VJ-Link.",
          "LJ-Link führt eine Ableton-Link-Session mit dem Tempo des DJs; Daslight folgt ihr als BPM-Quelle. VJ-Link nimmt das Tempo direkt von LJ-Link. Daslight kann VJ-Link zusätzlich per Art-Net oder MIDI steuern."),
        DIAGRAM(720, 220, {"dj": (110, 70, 160, 48, "dj", ("Denon / CDJs", "Denon / CDJs"), None),
                           "pc": (380, 70, 210, 60, "pc", ("Laptop", "Laptop"), ("LJ-Link, Daslight, VJ-Link", "LJ-Link, Daslight, VJ-Link")),
                           "dmx": (610, 70, 140, 46, "desk", ("Daslight interface", "Daslight-Interface"), ("lights", "Licht")),
                           "bm": (380, 180, 150, 44, "tab", ("Projector", "Beamer"), None)},
                [("dj", "pc", "cable", None), ("pc", "dmx", "usb", ("USB", "USB")), ("pc", "bm", "cable", ("HDMI", "HDMI"))]),
        P("See also [Daslight](wiki-desk-daslight.html).", "Siehe auch [Daslight](wiki-desk-daslight.html)."),
    )
    return (("Setups with LJ-Link: laptop, club, mobile", "Aufbauten mit LJ-Link: Laptop, Club, mobil"),
            ("Diagrams for VJ-Link with LJ-Link: all on one laptop, booth and FOH, a club with CDJs, grandMA and LED wall, and a mobile setup with Daslight.",
             "Schemas für VJ-Link mit LJ-Link: alles auf einem Laptop, Booth und FOH, ein Club mit CDJs, grandMA und LED-Wand und mobil mit Daslight."),
            ("LJ-Link", "LJ-Link"), ("Setups with LJ-Link", "Aufbauten mit LJ-Link"),
            ("Diagrams for every typical setup.", "Schemas für jeden typischen Aufbau."), body)
