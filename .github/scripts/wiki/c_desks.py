import json
from pathlib import Path
from wikilib import *

CH = json.loads((Path(__file__).parent / "channels.json").read_text(encoding="utf-8"))

group("Light desks", "Lichtpulte")


def schema(desk, proto=("Art-Net / sACN", "Art-Net / sACN"), extra=None, cap=None):
    """Standard diagram: desk → switch → VJ-Link → projector/LED wall (optionally an extra node at the desk)."""
    desk = desk if isinstance(desk, tuple) else (desk, desk)
    nodes = {"desk": (110, 70, 170, 52, "desk", desk, proto),
             "sw": (360, 70, 130, 46, "net", ("Switch / router", "Switch / Router"), None),
             "vj": (590, 70, 150, 52, "pc", ("VJ-Link", "VJ-Link"), ("computer", "Rechner")),
             "out": (590, 190, 170, 46, "tab", ("Projector / LED wall", "Beamer / LED-Wand"), None)}
    edges = [("desk", "sw", "cable", None), ("sw", "vj", "cable", None), ("vj", "out", "cable", ("HDMI / DP", "HDMI / DP"))]
    if extra:
        nodes["x"] = extra[0]
        edges = [("x" if e[0] == "desk" and e[1] == "sw" else e[0], e[1], e[2], e[3]) for e in edges] + extra[1]
    return DIAGRAM(720, 240, nodes, edges, cap=cap or ("Network cable from the desk to the VJ-Link computer, the picture goes by HDMI or DisplayPort.",
                                                        "Netzwerkkabel vom Pult zum VJ-Link-Rechner, das Bild geht per HDMI oder DisplayPort raus."))


PATCH = STEPS(("Patch VJ-Link on the universe and start address you set in VJ-Link under **Settings → DMX and network**, as **91 channels**: either as a fixture type built from the CSV channel list (**Settings → DMX and network → Save channel list (CSV)**) or as 91 single dimmers.",
               "VJ-Link auf dem Universe und der Startadresse patchen, die du in VJ-Link unter **Einstellungen → DMX und Netzwerk** eingestellt hast, mit **91 Kanälen**: entweder als Gerätetyp aus der CSV-Kanalliste (**Einstellungen → DMX und Netzwerk → Kanalliste speichern (CSV)**) oder als 91 einzelne Dimmer."),
              ("Put the channels you need on faders or executors: master (1), scene (3), the color slots (9–28) and the layer opacities (29, 39, 49, 59) are a good start.",
               "Die Kanäle, die du brauchst, auf Fader oder Executoren legen: Master (1), Szene (3), die Farbslots (9–28) und die Ebenen-Deckkräfte (29, 39, 49, 59) sind ein guter Anfang."),
              ("Move a fader and watch **CONNECT → Live values** in VJ-Link: the bar of the channel moves, the DMX pill at the top turns green.",
               "Einen Fader bewegen und in VJ-Link **VERBINDEN → Live-Werte** beobachten: Der Balken des Kanals bewegt sich, die DMX-Anzeige oben wird grün."))

NOT_TESTED = ADM("beta", ("Not yet tried with this desk. The steps follow the maker's manual; menu names can differ between software versions. Please tell us if it works: [report a problem](wiki-help.html#report) or on Discord.",
                          "Mit diesem Pult noch nicht ausprobiert. Die Schritte folgen dem Handbuch des Herstellers; Menünamen können je nach Software-Version abweichen. Sag uns bitte, ob es klappt: [Fehler melden](wiki-help.html#report) oder auf Discord."))


def desk_page(file, name, tagline, intro, steps, extras=(), proto=("Art-Net / sACN", "Art-Net / sACN"), back=None, title=None, desc=None, schema_extra=None, schema_cap=None, name_de=None):
    nde = name_de or name
    @page(file, name, nde)
    def _():
        parts = [P(*intro), NOT_TESTED, H2("Connection", "Verbindung"), schema((name, nde), proto, schema_extra, schema_cap),
                 H2("On the desk", "Am Pult"), STEPS(*steps), H2("Patch", "Patchen"), PATCH]
        if back:
            parts += [H2("From VJ-Link to the desk", "Von VJ-Link zum Pult"), P(*back)]
        parts += list(extras)
        return ((title or (f"Control visuals from {name} with VJ-Link", f"{name}: Visuals steuern mit VJ-Link")),
                desc or ((f"Control VJ-Link from {name}: network, Art-Net or sACN output, patching the 91-channel profile and what goes back – step by step.",
                          f"VJ-Link von {name} steuern: Netzwerk, Art-Net- oder sACN-Ausgang, das 91-Kanal-Profil patchen und was zurückgeht – Schritt für Schritt.")),
                ("Light desks", "Lichtpulte"), (name, nde), tagline, SEC(*parts))
    return _


@page("wiki-desks.html", "All desks", "Alle Pulte")
def _():
    body = SEC(
        P("Any desk that can send **Art-Net** or **sACN** can run VJ-Link: VJ-Link behaves like a fixture with 91 channels. Desks and programs with **MIDI** or **OSC** can also reach every control through mapping. The other way round VJ-Link sends **timecode** (Art-Net and MIDI) to desks that run timecode shows.",
          "Jedes Pult, das **Art-Net** oder **sACN** senden kann, steuert VJ-Link: VJ-Link verhält sich wie ein Gerät mit 91 Kanälen. Pulte und Programme mit **MIDI** oder **OSC** erreichen über das Mapping außerdem jedes Element. Umgekehrt sendet VJ-Link **Timecode** (Art-Net und MIDI) an Pulte mit Timecode-Shows."),
        H2("Overview", "Übersicht"),
        TABLE([("Desk", "Pult"), ("To VJ-Link", "Zu VJ-Link"), ("From VJ-Link", "Von VJ-Link"), ("Page", "Seite")], [
            ["grandMA2, onPC", "Art-Net, sACN, MIDI", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[grandMA2](wiki-desk-grandma2.html)", "[grandMA2](wiki-desk-grandma2.html)")],
            ["grandMA3, onPC", "Art-Net, sACN, MIDI, OSC", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[grandMA3](wiki-desk-grandma3.html)", "[grandMA3](wiki-desk-grandma3.html)")],
            ["dot2", "Art-Net, sACN", "–", ("[dot2](wiki-desk-dot2.html)", "[dot2](wiki-desk-dot2.html)")],
            ["ChamSys MagicQ", "Art-Net, sACN, MIDI", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[ChamSys MagicQ](wiki-desk-chamsys.html)", "[ChamSys MagicQ](wiki-desk-chamsys.html)")],
            ["Avolites Titan", "Art-Net, sACN", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[Avolites](wiki-desk-avolites.html)", "[Avolites](wiki-desk-avolites.html)")],
            ["High End Hog 4", "Art-Net, sACN", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[Hog 4](wiki-desk-hog.html)", "[Hog 4](wiki-desk-hog.html)")],
            ["ETC Eos, Ion, Element", "sACN, Art-Net, OSC", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[ETC Eos](wiki-desk-etc.html)", "[ETC Eos](wiki-desk-etc.html)")],
            ["Obsidian Onyx", "Art-Net, sACN", ("Art-Net or MIDI timecode", "Art-Net- oder MIDI-Timecode"), ("[Onyx](wiki-desk-onyx.html)", "[Onyx](wiki-desk-onyx.html)")],
            ["Daslight 4 / 5", "Art-Net, MIDI", "–", ("[Daslight](wiki-desk-daslight.html)", "[Daslight](wiki-desk-daslight.html)")],
            ["Lightkey", "Art-Net, sACN, MIDI", "–", ("[Lightkey](wiki-desk-lightkey.html)", "[Lightkey](wiki-desk-lightkey.html)")],
            ["QLC+", "Art-Net, sACN, OSC, MIDI", "–", ("[QLC+](wiki-desk-qlc.html)", "[QLC+](wiki-desk-qlc.html)")],
            ["LightShark", "Art-Net, sACN", "–", ("[LightShark](wiki-desk-lightshark.html)", "[LightShark](wiki-desk-lightshark.html)")],
            ["Zero 88 FLX", "Art-Net, sACN", "–", ("[Zero 88 FLX](wiki-desk-zero88.html)", "[Zero 88 FLX](wiki-desk-zero88.html)")],
            ["FreeStyler", "Art-Net", "–", ("[FreeStyler](wiki-desk-freestyler.html)", "[FreeStyler](wiki-desk-freestyler.html)")],
            [("Desks without network (Showtec, Eurolite, Chauvet, older consoles)", "Pulte ohne Netzwerk (Showtec, Eurolite, Chauvet, ältere Pulte)"), ("DMX through an Art-Net node", "DMX über einen Art-Net-Node"), "–", ("[Without network](wiki-desk-dmx-only.html)", "[Ohne Netzwerk](wiki-desk-dmx-only.html)")],
        ]),
        ADM("note", ("All desks: built from the manuals, **not yet tried on the real desk**. Art-Net and sACN reception itself is tested with software senders.",
                     "Alle Pulte: nach Handbuch, **noch nicht am echten Pult ausprobiert**. Der Empfang von Art-Net und sACN selbst ist mit Software-Sendern getestet.")),
        H2("Which protocol?", "Welches Protokoll?"),
        TABLE([("Protocol", "Protokoll"), ("When", "Wann"), ("Note", "Hinweis")], [
            ["Art-Net", ("most desks, the default", "die meisten Pulte, der Standard"), ("universes count from 0; broadcast or unicast to the VJ-Link computer", "Universes zählen ab 0; Broadcast oder Unicast an den VJ-Link-Rechner")],
            ["sACN (E1.31)", ("ETC and modern networks", "ETC und moderne Netze"), ("universes count from 1; multicast, the switch should support IGMP", "Universes zählen ab 1; Multicast, der Switch sollte IGMP können")],
            ["MIDI", ("desks with MIDI out, controllers", "Pulte mit MIDI-Ausgang, Controller"), ("notes and CCs through [mapping](wiki-mapping.html)", "Noten und CCs über das [Mapping](wiki-mapping.html)")],
            ["OSC", ("grandMA3, ETC, QLC+, show software", "grandMA3, ETC, QLC+, Show-Software"), ("port 8000, `/vjlink/ctl/<id>`", "Port 8000, `/vjlink/ctl/<id>`")],
        ]),
        H2("Full setup with LJ-Link", "Kompletter Aufbau mit LJ-Link"),
        DIAGRAM(760, 260, {"cdj": (100, 60, 150, 48, "dj", ("CDJs / Denon", "CDJs / Denon"), None),
                           "lj": (330, 60, 150, 52, "pc", ("LJ-Link", "LJ-Link"), ("BPM, phrases", "BPM, Phrasen")),
                           "ma": (330, 190, 150, 52, "desk", ("Light desk", "Lichtpult"), ("grandMA, Daslight …", "grandMA, Daslight …")),
                           "vj": (580, 125, 150, 52, "pc", ("VJ-Link", "VJ-Link"), ("visuals", "Visuals")),
                           "led": (700, 220, 100, 44, "tab", ("LED wall", "LED-Wand"), None)},
                [("cdj", "lj", "cable", ("Pro DJ Link", "Pro DJ Link")), ("lj", "ma", "cable", ("BPM", "BPM")), ("lj", "vj", "cable", ("tempo, phrases", "Tempo, Phrasen")),
                 ("ma", "vj", "dmx", ("Art-Net", "Art-Net")), ("vj", "led", "cable", None)],
                cap=("LJ-Link gives the tempo to desk and VJ-Link; the desk runs scenes and colors on VJ-Link.", "LJ-Link gibt das Tempo an Pult und VJ-Link; das Pult fährt Szenen und Farben in VJ-Link.")),
        P("More in [VJ-Link and LJ-Link](wiki-ljlink.html).", "Mehr unter [VJ-Link und LJ-Link](wiki-ljlink.html)."),
    )
    return (("Light desks for VJ-Link: grandMA, ChamSys, Avolites", "Lichtpulte für VJ-Link: grandMA, ChamSys, Avolites"),
            ("Which light desks control VJ-Link over Art-Net, sACN, MIDI and OSC: grandMA2, grandMA3, dot2, MagicQ, Avolites, Hog 4, ETC Eos, Onyx, Daslight, QLC+ and more.",
             "Welche Lichtpulte VJ-Link über Art-Net, sACN, MIDI und OSC steuern: grandMA2, grandMA3, dot2, MagicQ, Avolites, Hog 4, ETC Eos, Onyx, Daslight, QLC+ und mehr."),
            ("Light desks", "Lichtpulte"), ("All desks", "Alle Pulte"),
            ("Every common desk and how it reaches VJ-Link.", "Jedes gängige Pult und wie es VJ-Link erreicht."), body)


@page("wiki-desk.html", "Basics and channel list", "Grundlagen und Kanalliste")
def _():
    body = SEC(
        P("VJ-Link listens to one universe of **Art-Net** or **sACN** and behaves like a fixture with 91 channels. Only channels that change take effect, so the mouse, MIDI and the desk can work side by side: a fader that does not move on the desk does not overwrite what you set by hand.",
          "VJ-Link hört auf ein Universe **Art-Net** oder **sACN** und verhält sich wie ein Gerät mit 91 Kanälen. Es wirken nur Kanäle, die sich ändern – Maus, MIDI und Pult arbeiten also nebeneinander: Ein Fader, der sich am Pult nicht bewegt, überschreibt nicht, was du von Hand eingestellt hast."),
        H2("Set up in VJ-Link", "In VJ-Link einrichten"),
        STEPS(("Desk and VJ-Link computer in the same network (same IP range). On Windows allow VJ-Link for private networks.", "Pult und VJ-Link-Rechner im selben Netz (gleicher IP-Bereich). Unter Windows VJ-Link für private Netzwerke zulassen."),
              ("**Settings → DMX and network** → set the **Art-Net universe** (0 is the first) or the **sACN universe** (1 is the first) and the **start address**.", "**Einstellungen → DMX und Netzwerk** → **Art-Net-Universe** (0 ist das erste) oder **sACN-Universe** (1 ist das erste) und die **Startadresse** einstellen."),
              ("**Save the channel list (CSV)** and patch VJ-Link on the desk with 91 channels.", "**Kanalliste speichern (CSV)** und VJ-Link am Pult mit 91 Kanälen patchen."),
              ("Move a fader on the desk: the live values show it, the DMX pill at the top turns green.", "Einen Fader am Pult bewegen: Die Live-Werte zeigen ihn, die DMX-Anzeige oben wird grün.")),
        IMG("connect.png", "CONNECT tab with live DMX values", "Tab VERBINDEN mit DMX-Live-Werten",
            ("CONNECT: Art-Net, sACN, OSC and LJ-Link with packet counters and live values.", "VERBINDEN: Art-Net, sACN, OSC und LJ-Link mit Paketzählern und Live-Werten.")),
        H2("Network", "Netzwerk"),
        UL(("Art-Net often uses the range **2.x.x.x** or **10.x.x.x** (subnet 255.0.0.0). Give the VJ-Link computer an address in the same range, for example `2.0.0.50`, or switch the desk to unicast to the computer's address.", "Art-Net nutzt oft den Bereich **2.x.x.x** oder **10.x.x.x** (Subnetz 255.0.0.0). Gib dem VJ-Link-Rechner eine Adresse im selben Bereich, etwa `2.0.0.50`, oder stell das Pult auf Unicast an die Adresse des Rechners."),
           ("sACN uses multicast. With many universes the switch should support IGMP snooping; for a few universes any switch works.", "sACN nutzt Multicast. Bei vielen Universes sollte der Switch IGMP-Snooping können; für wenige Universes geht jeder Switch."),
           ("Use a cable, not Wi-Fi, between desk and VJ-Link.", "Zwischen Pult und VJ-Link Kabel nehmen, kein WLAN.")),
        H2("Channel list", "Kanalliste"),
        P("Addresses relative to the start address (channel 1 = start address).", "Adressen relativ zur Startadresse (Kanal 1 = Startadresse)."),
        TABLE([("Channel", "Kanal"), ("Function", "Funktion")], [[str(c["ch"]), (c["en"], c["de"])] for c in CH]),
        H2("More than the profile", "Mehr als das Profil"),
        P("Layers 5–8 and every other control (laser position, slot hue, scenes 1–32, test patterns, timecode …) can be put on any DMX channel with **MAPPING → DMX / Art-Net**: click the element, move the channel on the desk.",
          "Ebenen 5–8 und jedes weitere Element (Laser-Lage, Farbton der Slots, Szenen 1–32, Testbilder, Timecode …) legst du mit **MAPPING → DMX / Art-Net** auf beliebige DMX-Kanäle: Element anklicken, Kanal am Pult bewegen."),
    )
    return (("Connect a light desk: Art-Net, sACN, channels", "Lichtpult anbinden: Art-Net, sACN, Kanalliste"),
            ("Control VJ-Link from any desk over Art-Net or sACN: universe, start address, network ranges, the full 91-channel list and free DMX mapping.",
             "VJ-Link von jedem Pult über Art-Net oder sACN steuern: Universe, Startadresse, Netzwerkbereiche, die vollständige 91-Kanal-Liste und freies DMX-Mapping."),
            ("Light desks", "Lichtpulte"), ("Basics and channel list", "Grundlagen und Kanalliste"),
            ("Patch VJ-Link like a fixture.", "VJ-Link wie ein Gerät patchen."), body)


MTC = (("VJ-Link can send **MIDI timecode** to the desk (Settings → Timecode → Send, MIDI output). The desk's timecode show then fires its cues in sync with the videos and the SHOW timeline. Connect a MIDI interface from the VJ-Link computer to the desk's MIDI in.",
        "VJ-Link kann **MIDI-Timecode** ans Pult senden (Einstellungen → Timecode → Senden, MIDI-Ausgang). Die Timecode-Show des Pults löst dann ihre Cues synchron zu den Videos und der SHOW-Timeline aus. Dafür ein MIDI-Interface vom VJ-Link-Rechner an den MIDI-Eingang des Pults."))

desk_page("wiki-desk-grandma2.html", "grandMA2", ("grandMA2 consoles and grandMA2 onPC.", "grandMA2-Pulte und grandMA2 onPC."),
          ("The grandMA2 sends Art-Net or sACN from the console or from onPC with an MA node or the onPC's own network output.",
           "Der grandMA2 sendet Art-Net oder sACN vom Pult oder von onPC mit einem MA-Node bzw. dem eigenen Netzwerk-Ausgang von onPC."),
          [("**Setup → Network → Network Protocols**.", "**Setup → Network → Network Protocols**."),
           ("Switch **Art-Net** (or **sACN**) on and set the line to **Output** with the universe VJ-Link listens to. Art-Net universe 0 in VJ-Link is often shown as 0.0 or 1 on the MA; check with the live values.", "**Art-Net** (oder **sACN**) einschalten und die Zeile auf **Output** mit dem Universe stellen, auf das VJ-Link hört. Art-Net-Universe 0 in VJ-Link heißt am MA oft 0.0 oder 1; mit den Live-Werten prüfen."),
           ("Make sure the console's network interface is in the same IP range as the VJ-Link computer.", "Darauf achten, dass die Netzwerkschnittstelle des Pults im selben IP-Bereich liegt wie der VJ-Link-Rechner.")],
          back=MTC,
          extras=[ADM("tip", ("With [LJ-Link](wiki-ljlink.html) the grandMA2 also gets the BPM of the DJ (Telnet), and VJ-Link the tempo and phrases: everything runs in one beat.",
                              "Mit [LJ-Link](wiki-ljlink.html) bekommt der grandMA2 auch das BPM des DJs (Telnet) und VJ-Link Tempo und Phrasen: Alles läuft in einem Takt."))])

desk_page("wiki-desk-grandma3.html", "grandMA3", ("grandMA3 consoles and grandMA3 onPC.", "grandMA3-Pulte und grandMA3 onPC."),
          ("The grandMA3 sends Art-Net or sACN and can also send OSC, so single commands can go straight to VJ-Link controls.",
           "Der grandMA3 sendet Art-Net oder sACN und kann zusätzlich OSC senden, sodass einzelne Befehle direkt an VJ-Link-Elemente gehen."),
          [("**Menu → In & Out → DMX Protocols**.", "**Menu → In & Out → DMX Protocols**."),
           ("Add an **Art-Net** or **sACN** line, mode **Output**, the universe VJ-Link listens to, and as destination the VJ-Link computer (or broadcast).", "Eine **Art-Net**- oder **sACN**-Zeile anlegen, Modus **Output**, das Universe, auf das VJ-Link hört, und als Ziel den VJ-Link-Rechner (oder Broadcast)."),
           ("Optional OSC: **In & Out → OSC**, add a line with the VJ-Link computer and port **8000**, mode **Send**. Then a command like `SendOSC 1 \"/vjlink/scene/go,i,3\"` recalls scene 3.", "Optional OSC: **In & Out → OSC**, eine Zeile mit dem VJ-Link-Rechner und Port **8000** anlegen, Modus **Send**. Dann ruft ein Befehl wie `SendOSC 1 \"/vjlink/scene/go,i,3\"` Szene 3 ab.")],
          proto=("Art-Net / sACN / OSC", "Art-Net / sACN / OSC"), back=MTC)

desk_page("wiki-desk-dot2.html", "dot2", ("MA dot2 consoles and dot2 onPC.", "MA-dot2-Pulte und dot2 onPC."),
          ("The dot2 has no Telnet or OSC, but it can output DMX over the network.", "Der dot2 hat weder Telnet noch OSC, kann DMX aber über das Netzwerk ausgeben."),
          [("**Setup → Network Protocols** (depending on the software version).", "**Setup → Network Protocols** (je nach Software-Version)."),
           ("Switch **Art-Net** or **sACN** output on for the universe VJ-Link listens to.", "**Art-Net**- oder **sACN**-Ausgang für das Universe einschalten, auf das VJ-Link hört."),
           ("If your dot2 cannot send Art-Net, use its DMX output and an Art-Net node, see [desks without network](wiki-desk-dmx-only.html).", "Kann dein dot2 kein Art-Net senden, nimm den DMX-Ausgang und einen Art-Net-Node, siehe [Pulte ohne Netzwerk](wiki-desk-dmx-only.html).")])

desk_page("wiki-desk-chamsys.html", "ChamSys MagicQ", ("MagicQ consoles, MagicQ PC and MQ wings.", "MagicQ-Pulte, MagicQ PC und MQ-Wings."),
          ("MagicQ sends Art-Net or sACN per universe and has MIDI for notes and timecode.", "MagicQ sendet Art-Net oder sACN je Universe und hat MIDI für Noten und Timecode."),
          [("**Setup → View DMX I/O**.", "**Setup → View DMX I/O**."),
           ("For the universe with VJ-Link set **Out type** to **Art-Net** or **sACN** and **Out uni** to the universe VJ-Link listens to; enable the universe.", "Für das Universe mit VJ-Link **Out type** auf **Art-Net** oder **sACN** und **Out uni** auf das Universe stellen, auf das VJ-Link hört; Universe aktivieren."),
           ("In **Setup → View Settings → Network** check that MagicQ uses the network adapter in the VJ-Link range.", "Unter **Setup → View Settings → Network** prüfen, dass MagicQ den Netzwerkadapter im VJ-Link-Bereich nutzt.")],
          back=MTC)

desk_page("wiki-desk-avolites.html", "Avolites", ("Titan consoles (Tiger Touch, Quartz, Arena, Diamond) and Titan Mobile/One.", "Titan-Pulte (Tiger Touch, Quartz, Arena, Diamond) und Titan Mobile/One."),
          ("Titan outputs Art-Net and sACN on its DMX lines.", "Titan gibt Art-Net und sACN auf seinen DMX-Lines aus."),
          [("**System → DMX Settings**.", "**System → DMX Settings**."),
           ("Choose a line, **Edit** it and set **Art-Net** or **sACN** with the universe VJ-Link listens to.", "Eine Line wählen, **Edit** und **Art-Net** oder **sACN** mit dem Universe einstellen, auf das VJ-Link hört."),
           ("Check the IP address of the console's network port under **System → Network**.", "Die IP-Adresse des Netzwerkanschlusses unter **System → Network** prüfen.")],
          back=MTC)

desk_page("wiki-desk-hog.html", "Hog 4", ("High End Systems Hog 4 consoles and Hog 4 PC.", "High-End-Systems-Hog-4-Pulte und Hog 4 PC."),
          ("Hog 4 outputs Art-Net and sACN from the console or a DP8000 processor.", "Hog 4 gibt Art-Net und sACN vom Pult oder einem DP8000-Prozessor aus."),
          [("**Setup → Network**, select the DMX processor (DP) of the console.", "**Setup → Network**, den DMX-Prozessor (DP) des Pults wählen."),
           ("In its **Art-Net** or **E1.31 (sACN)** output settings enable the universe VJ-Link listens to.", "In dessen Ausgabe-Einstellungen für **Art-Net** oder **E1.31 (sACN)** das Universe aktivieren, auf das VJ-Link hört."),
           ("Make sure the Art-Net/sACN network port is in the VJ-Link range.", "Darauf achten, dass der Art-Net/sACN-Netzwerkanschluss im VJ-Link-Bereich liegt.")],
          back=MTC)

desk_page("wiki-desk-etc.html", "ETC Eos", ("ETC Eos, Gio, Ion Xe, Element 2 and Nomad.", "ETC Eos, Gio, Ion Xe, Element 2 und Nomad."),
          ("Eos-family desks speak sACN natively, Art-Net as an option, and OSC.", "Pulte der Eos-Familie sprechen nativ sACN, Art-Net als Option und OSC."),
          [("In the **Shell** (ECU) open **Settings → Network → Output Protocols** and switch **sACN** (or **Art-Net**) on.", "In der **Shell** (ECU) **Settings → Network → Output Protocols** öffnen und **sACN** (oder **Art-Net**) einschalten."),
           ("Patch VJ-Link on the universe VJ-Link listens to (sACN universe 1 = Eos addresses 1–512).", "VJ-Link auf dem Universe patchen, auf das VJ-Link hört (sACN-Universe 1 = Eos-Adressen 1–512)."),
           ("Optional OSC: **Setup → Show Control → OSC** with the VJ-Link computer and port 8000, then send `/vjlink/…` strings from macros.", "Optional OSC: **Setup → Show Control → OSC** mit dem VJ-Link-Rechner und Port 8000, dann `/vjlink/…`-Strings aus Makros senden.")],
          proto=("sACN / Art-Net / OSC", "sACN / Art-Net / OSC"), back=MTC)

desk_page("wiki-desk-onyx.html", "Onyx", ("Obsidian Control Systems Onyx (NX consoles, Onyx PC).", "Obsidian Control Systems Onyx (NX-Pulte, Onyx PC)."),
          ("Onyx outputs Art-Net and sACN per universe.", "Onyx gibt Art-Net und sACN je Universe aus."),
          [("Open the **DMX output** configuration of the show (Onyx Manager or settings, depending on the version).", "Die **DMX-Ausgabe**-Einstellungen der Show öffnen (Onyx Manager oder Einstellungen, je nach Version)."),
           ("For the universe with VJ-Link enable **Art-Net** or **sACN** with the matching universe number.", "Für das Universe mit VJ-Link **Art-Net** oder **sACN** mit passender Universe-Nummer aktivieren.")],
          back=MTC)

desk_page("wiki-desk-daslight.html", "Daslight", ("Daslight 4 (DVC4) and Daslight 5.", "Daslight 4 (DVC4) und Daslight 5."),
          ("Daslight is common with mobile DJs and in small clubs. It can send Art-Net and take MIDI, and VJ-Link can also be mapped to Daslight's MIDI output.",
           "Daslight ist bei mobilen DJs und in kleinen Clubs verbreitet. Es kann Art-Net senden und MIDI nutzen, und VJ-Link lässt sich auch auf den MIDI-Ausgang von Daslight mappen."),
          [("In the hardware settings of Daslight add an **Art-Net** output (Daslight 5: hardware manager; DVC4: Art-Net option in the setup).", "In den Hardware-Einstellungen von Daslight einen **Art-Net**-Ausgang hinzufügen (Daslight 5: Hardware-Manager; DVC4: Art-Net-Option im Setup)."),
           ("Set the universe VJ-Link listens to and the VJ-Link computer as target or broadcast.", "Das Universe einstellen, auf das VJ-Link hört, und den VJ-Link-Rechner als Ziel oder Broadcast."),
           ("Without Art-Net: use MIDI. Map Daslight buttons and faders in VJ-Link with **MAPPING → MIDI**.", "Ohne Art-Net: MIDI nutzen. Daslight-Tasten und -Fader in VJ-Link mit **MAPPING → MIDI** zuweisen.")],
          proto=("Art-Net / MIDI", "Art-Net / MIDI"),
          extras=[ADM("tip", ("With [LJ-Link](wiki-ljlink.html), Daslight gets the tempo over Ableton Link and VJ-Link the same tempo directly: lights and visuals run in one beat.",
                              "Mit [LJ-Link](wiki-ljlink.html) bekommt Daslight das Tempo über Ableton Link und VJ-Link dasselbe Tempo direkt: Licht und Visuals laufen in einem Takt."))])

desk_page("wiki-desk-lightkey.html", "Lightkey", ("Lightkey for macOS.", "Lightkey für macOS."),
          ("Lightkey runs on the Mac and outputs Art-Net and sACN. It can run on the same Mac as VJ-Link.", "Lightkey läuft auf dem Mac und gibt Art-Net und sACN aus. Es kann auf demselben Mac wie VJ-Link laufen."),
          [("**Lightkey → Settings → DMX Output**: add an **Art-Net** or **sACN** output.", "**Lightkey → Einstellungen → DMX-Ausgabe**: einen **Art-Net**- oder **sACN**-Ausgang hinzufügen."),
           ("Same Mac: send to `127.0.0.1` (or broadcast); other Mac: to the VJ-Link computer.", "Selber Mac: an `127.0.0.1` senden (oder Broadcast); anderer Mac: an den VJ-Link-Rechner.")],
          schema_extra=None)

desk_page("wiki-desk-qlc.html", "QLC+", ("QLC+ (free, macOS, Windows, Linux).", "QLC+ (kostenlos, macOS, Windows, Linux)."),
          ("QLC+ is free and outputs Art-Net and E1.31 (sACN) per universe. It can also send OSC and MIDI.", "QLC+ ist kostenlos und gibt Art-Net und E1.31 (sACN) je Universe aus. Es kann außerdem OSC und MIDI senden."),
          [("Tab **Inputs/Outputs**, choose the universe.", "Tab **Inputs/Outputs**, das Universe wählen."),
           ("Tick **Output** for **ArtNet** or **E1.31** on the network adapter in the VJ-Link range; in the configuration set the target IP or broadcast.", "Bei **ArtNet** oder **E1.31** auf dem Netzwerkadapter im VJ-Link-Bereich **Output** anhaken; in der Konfiguration Ziel-IP oder Broadcast setzen."),
           ("Same computer: use the loopback adapter `127.0.0.1`.", "Selber Rechner: den Loopback-Adapter `127.0.0.1` nutzen.")],
          proto=("Art-Net / sACN / OSC", "Art-Net / sACN / OSC"))

desk_page("wiki-desk-lightshark.html", "LightShark", ("Work LightShark LS-1, LS-Core.", "Work LightShark LS-1, LS-Core."),
          ("LightShark outputs Art-Net and sACN and is operated from a browser or tablet.", "LightShark gibt Art-Net und sACN aus und wird im Browser oder am Tablet bedient."),
          [("**Settings → Network / DMX outputs**: enable **Art-Net** or **sACN** for the universe VJ-Link listens to.", "**Settings → Network / DMX outputs**: **Art-Net** oder **sACN** für das Universe aktivieren, auf das VJ-Link hört."),
           ("Use the LightShark's wired network port in the VJ-Link range.", "Den kabelgebundenen Netzwerkanschluss des LightShark im VJ-Link-Bereich nutzen.")])

desk_page("wiki-desk-zero88.html", "Zero 88 FLX", ("Zero 88 FLX, FLX S24/S48 and ZerOS.", "Zero 88 FLX, FLX S24/S48 und ZerOS."),
          ("ZerOS desks output Art-Net and sACN.", "ZerOS-Pulte geben Art-Net und sACN aus."),
          [("**Setup → Outputs**, choose a universe.", "**Setup → Outputs**, ein Universe wählen."),
           ("Enable **Art-Net** or **sACN** for it with the number VJ-Link listens to.", "Dafür **Art-Net** oder **sACN** mit der Nummer aktivieren, auf die VJ-Link hört.")])

desk_page("wiki-desk-freestyler.html", "FreeStyler", ("FreeStyler DMX (Windows).", "FreeStyler DMX (Windows)."),
          ("FreeStyler is free DMX software for Windows and can output Art-Net.", "FreeStyler ist kostenlose DMX-Software für Windows und kann Art-Net ausgeben."),
          [("**Setup → FreeStyler setup → Interface**: choose **Art-Net** as interface.", "**Setup → FreeStyler setup → Interface**: **Art-Net** als Interface wählen."),
           ("Set the universe and the network adapter in the VJ-Link range.", "Universe und den Netzwerkadapter im VJ-Link-Bereich einstellen.")],
          proto=("Art-Net", "Art-Net"))

desk_page("wiki-desk-dmx-only.html", "Without network", ("Showtec, Eurolite, Chauvet Obey, older consoles and every desk with only a DMX output.", "Showtec, Eurolite, Chauvet Obey, ältere Pulte und jedes Pult mit nur einem DMX-Ausgang."),
          ("Many small and older desks only have a DMX output (XLR). VJ-Link has no DMX input of its own, so an **Art-Net or sACN node** converts DMX into network packets.",
           "Viele kleine und ältere Pulte haben nur einen DMX-Ausgang (XLR). VJ-Link hat keinen eigenen DMX-Eingang, deshalb wandelt ein **Art-Net- oder sACN-Node** DMX in Netzwerkpakete um."),
          [("Connect the desk's DMX output to the **DMX input** of a node (for example ENTTEC ODE, DMXking eDMX, Showtec NET-2/3 or any node that can work as DMX → Art-Net).", "Den DMX-Ausgang des Pults an den **DMX-Eingang** eines Nodes anschließen (zum Beispiel ENTTEC ODE, DMXking eDMX, Showtec NET-2/3 oder jeder Node, der DMX → Art-Net kann)."),
           ("Set the node's port to **input** (DMX to Art-Net/sACN) and give it the universe VJ-Link listens to.", "Den Port des Nodes auf **Eingang** stellen (DMX zu Art-Net/sACN) und ihm das Universe geben, auf das VJ-Link hört."),
           ("Node and VJ-Link computer in the same network.", "Node und VJ-Link-Rechner ins selbe Netz.")],
          proto=("DMX → node", "DMX → Node"),
          schema_extra=((110, 190, 150, 46, "net", ("Art-Net node", "Art-Net-Node"), ("DMX in", "DMX rein")), [("desk", "x", "dmx", ("DMX", "DMX"))]),
          schema_cap=("The desk sends DMX to a node, the node sends Art-Net to VJ-Link.", "Das Pult schickt DMX an einen Node, der Node schickt Art-Net an VJ-Link."),
          name_de="Ohne Netzwerk",
          title=("DMX desks without network: use an Art-Net node", "DMX-Pult ohne Netzwerk: über einen Art-Net-Node"),
          desc=("Control VJ-Link from DMX-only desks like Showtec, Eurolite or Chauvet with an Art-Net or sACN node that converts DMX to the network.",
                "VJ-Link von reinen DMX-Pulten wie Showtec, Eurolite oder Chauvet steuern, mit einem Art-Net- oder sACN-Node, der DMX ins Netzwerk wandelt."))
