#!/usr/bin/env python3
"""Writes the guide pages (landing pages for search) into site/, in the layout of the LJ-Link guides.

    python3 .github/scripts/guides.py site

Each page is English with data-de attributes; build_site.py makes the German page from it like for every other page.
Header and footer come from site/index.html. Commit the generated pages.
"""
import html
import sys
from pathlib import Path

BASE = "https://skyplayser.github.io/VJ-LINK/"
e = lambda s: html.escape(s, quote=True)


def t(tag, en, de, attrs=""):
    return "<%s%s data-de=\"%s\">%s</%s>" % (tag, attrs, e(de), e(en), tag)


def P(en, de):
    return t("p", en, de)


def UL(*items):
    return "<ul>" + "".join(t("li", a, b) for a, b in items) + "</ul>"


def OL(*items):
    return "<ol>" + "".join(t("li", a, b) for a, b in items) + "</ol>"


def IMG(src, en, de):
    """Width and height are added by build_site.py from the real picture."""
    return ('<img class="pic" src="images/%s" alt="%s" data-de-alt="%s" loading="lazy" decoding="async">'
            % (src, e(en), e(de)))


def SEC(id_, h2, *body):
    return '    <section id="%s">\n      %s\n      %s\n    </section>\n' % (id_, t("h2", *h2), "\n      ".join(body))


def FAQ(*qa):
    out = '    <section id="faq">\n      %s\n' % t("h2", "Questions", "Häufige Fragen")
    for (qe, qd), (ae, ad) in qa:
        out += "      <details>%s%s</details>\n" % (t("summary", qe, qd), P(ae, ad))
    return out + "    </section>\n"


def LINKS(*links):
    out = '    <section id="more">\n      %s\n      <ul>' % t("h2", "More guides", "Weitere Anleitungen")
    for href, en, de in links:
        out += '<li><a href="%s" data-de="%s">%s</a></li>' % (href, e(de), e(en))
    return out + "</ul>\n    </section>\n"


BOX = ('<div class="box">%s%s<p><a class="btn primary" href="./#download" data-de="Kostenlos herunterladen">Download for free</a></p></div>\n'
       % (t("h2", "Free for macOS and Windows", "Kostenlos für macOS und Windows"),
          P("VJ-Link is free and open source (EPL 2.0). Install it, open the demo show and you have live visuals in minutes.",
            "VJ-Link ist kostenlos und Open Source (EPL 2.0). Installieren, Demo-Show öffnen, und in Minuten laufen Live-Visuals.")))


def page(file, title, desc, crumb, kicker, h1, tag, *parts, ogimg="og.png"):
    body = "".join(parts)
    index = (Path(sys.argv[1]) / "index.html").read_text(encoding="utf-8")
    header = index[index.index('<header class="top">'):index.index("</header>") + len("</header>")]
    header = header.replace('href="de/"', 'href="de/%s"' % file).replace('data-de-href="../"', 'data-de-href="../%s"' % file)
    header = header.replace('href="#features"', 'href="./#features"').replace('href="#download"', 'href="./#download"')
    footer = index[index.index("<footer>"):]
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Written by .github/scripts/guides.py – edit there. -->
<title data-de="{e(title[1])}">{e(title[0])}</title>
<meta name="description" content="{e(desc[0])}" data-de-content="{e(desc[1])}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="SKYPLAYSER / NEXTPHILM">
<link rel="canonical" href="{BASE}{file}" data-de-href="{BASE}de/{file}">
<link rel="alternate" hreflang="en" href="{BASE}{file}">
<link rel="alternate" hreflang="de" href="{BASE}de/{file}">
<link rel="alternate" hreflang="x-default" href="{BASE}{file}">
<link rel="icon" href="images/logo.png" type="image/png">
<link rel="apple-touch-icon" href="images/logo.png">
<meta name="theme-color" content="#07090c">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VJ-Link">
<meta property="og:locale" content="en_US" data-de-content="de_DE">
<meta property="og:locale:alternate" content="de_DE" data-de-content="en_US">
<meta property="og:title" content="{e(title[0])}" data-de-content="{e(title[1])}">
<meta property="og:description" content="{e(desc[0])}" data-de-content="{e(desc[1])}">
<meta property="og:image" content="{BASE}images/{ogimg}">
<meta property="og:url" content="{BASE}{file}" data-de-content="{BASE}de/{file}">
<meta name="twitter:card" content="summary_large_image">
<!-- structured-data -->
<link rel="stylesheet" href="style.css">
</head>
<body>
'''
    main = f'''
<main class="wrap article">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="./">VJ-Link</a> › {t("span", *crumb)}</nav>
  <div class="hero">
    <h1>{t("span", *kicker, ' class="kicker"')}{t("span", *h1)}</h1>
    {t("p", *tag, ' class="tag"')}
    <div class="cta" style="justify-content:flex-start">
      <a class="btn primary" href="./#download" data-de="Kostenlos herunterladen">Download for free</a>
      <a class="btn" href="wiki.html" data-de="Zum Wiki">Read the wiki</a>
    </div>
  </div>

{body}
</main>

'''
    (Path(sys.argv[1]) / file).write_text(head + header + "\n" + main + footer, encoding="utf-8")
    print("geschrieben:", file)


MORE = [("free-vj-software.html", "Free VJ software for Mac and Windows", "Kostenlose VJ-Software für Mac und Windows"),
        ("grandma-visuals.html", "Control visuals from a grandMA", "Visuals mit der grandMA steuern"),
        ("projection-mapping-software.html", "Free projection mapping software", "Projektionsmapping-Software kostenlos"),
        ("wiki-desks.html", "All light desks in the wiki", "Alle Lichtpulte im Wiki"),
        ("wiki-quickstart.html", "Quick start in 5 minutes", "Schnellstart in 5 Minuten")]
more = lambda me: LINKS(*[m for m in MORE if m[0] != me])


# ---------------------------------------------------------------- kostenlose VJ-Software
page("free-vj-software.html",
     ("Free VJ software for Mac and Windows | VJ-Link", "Kostenlose VJ-Software für Mac und Windows | VJ-Link"),
     ("Free, open-source VJ software for Mac and Windows: 150 live visuals, 50 effects, projection mapping and shows with timecode, controlled by your light desk.",
      "Kostenlose Open-Source-VJ-Software für Mac und Windows: 150 Live-Visuals, 50 Effekte, Projektionsmapping und Shows mit Timecode, gesteuert vom Lichtpult."),
     ("Free VJ software", "Kostenlose VJ-Software"),
     ("Guide · VJ software for Mac and Windows", "Anleitung · VJ-Software für Mac und Windows"),
     ("Free VJ software for Mac and Windows", "Kostenlose VJ-Software für Mac und Windows"),
     ("Live visuals for clubs, events and stages – free, open source and run by your light desk. No subscription, no watermark, no account.",
      "Live-Visuals für Clubs, Events und Bühnen – kostenlos, Open Source und vom Lichtpult gesteuert. Kein Abo, kein Wasserzeichen, kein Konto."),
     SEC("answer", ("Short answer", "Kurz gesagt"),
         P("VJ-Link is a free VJ software for macOS and Windows. It plays 150 live visuals and 50 effects on any number of screens, projectors and LED walls, follows the tempo of the music and can be run completely from a light desk over Art-Net, sACN, MIDI or OSC. It is open source under the Eclipse Public License 2.0.",
           "VJ-Link ist eine kostenlose VJ-Software für macOS und Windows. Sie spielt 150 Live-Visuals und 50 Effekte auf beliebig vielen Bildschirmen, Beamern und LED-Wänden, folgt dem Tempo der Musik und lässt sich komplett vom Lichtpult über Art-Net, sACN, MIDI oder OSC steuern. Sie ist Open Source unter der Eclipse Public License 2.0."),
         IMG("visuals.png", "VJ-Link with eight layers, the clip grid, color slots and scenes", "VJ-Link mit acht Ebenen, Clip-Raster, Farbslots und Szenen")),
     SEC("features", ("What the free VJ software can do", "Was die kostenlose VJ-Software kann"),
         UL(("150 visuals generated live: fractals, 3D tunnels, particles, retro, op art, audio equalizers and laser looks for a projector in haze.",
             "150 live erzeugte Visuals: Fraktale, 3D-Tunnel, Partikel, Retro, Op-Art, Audio-Equalizer und Laser-Looks für den Beamer im Nebel."),
            ("50 effects in a stack per layer: feedback, kaleidoscope, VHS, bloom, pixel sort, luma key and more, plus live buttons for strobe, flash, blinder and blackout.",
             "50 Effekte im Stapel je Ebene: Feedback, Kaleidoskop, VHS, Bloom, Pixel-Sort, Luma-Key und mehr, dazu Live-Tasten für Strobe, Flash, Blinder und Blackout."),
            ("Up to eight layers with blend modes and five color slots that the light desk sets.", "Bis zu acht Ebenen mit Mischmodi und fünf Farbslots, die das Lichtpult setzt."),
            ("Scenes with transitions and an automatic order in time with the music.", "Szenen mit Übergängen und automatischer Abfolge im Takt der Musik."),
            ("Projection mapping, several screens as one canvas and a window output for OBS.", "Projektionsmapping, mehrere Bildschirme als eine Leinwand und ein Fenster-Ausgang für OBS."),
            ("Shows with a running order, a timeline and timecode in and out.", "Shows mit Ablauf, Timeline und Timecode rein und raus."),
            ("Logos, videos, text clips and live cameras with silhouettes and masks.", "Logos, Videos, Text-Clips und Live-Kameras mit Silhouetten und Masken."))),
     SEC("who", ("Who it is for", "Für wen sie gemacht ist"),
         P("VJ-Link is built for lighting jockeys and event technicians who also have to run the screens: instead of a second person at a VJ laptop, the light desk recalls the scenes and the visuals follow the beat by themselves. Beginners start with the demo show; it plays ten scenes on its own.",
           "VJ-Link ist für Lichtjockeys und Veranstaltungstechniker gebaut, die nebenbei auch die Bildschirme fahren: Statt einer zweiten Person am VJ-Laptop ruft das Lichtpult die Szenen ab, und die Visuals folgen von selbst dem Beat. Einsteiger beginnen mit der Demo-Show; sie spielt zehn Szenen von selbst ab."),
         IMG("show.png", "SHOW tab with running order and timeline", "SHOW-Tab mit Ablauf und Timeline")),
     SEC("compare", ("What to look for in free VJ software", "Worauf es bei kostenloser VJ-Software ankommt"),
         '<div class="table"><table>'
         + "<tr>%s%s</tr>" % (t("th", "Question", "Frage"), t("th", "VJ-Link", "VJ-Link"))
         + "".join("<tr>%s%s</tr>" % (t("td", a, b), t("td", c, d)) for a, b, c, d in [
             ("Really free, without watermark or time limit?", "Wirklich kostenlos, ohne Wasserzeichen oder Zeitlimit?", "Yes, and open source (EPL 2.0).", "Ja, und Open Source (EPL 2.0)."),
             ("Can a light desk control it?", "Lässt es sich vom Lichtpult steuern?", "Yes: Art-Net and sACN with a 91-channel profile, MIDI and OSC.", "Ja: Art-Net und sACN mit 91-Kanal-Profil, MIDI und OSC."),
             ("Does it follow the music?", "Folgt es der Musik?", "Yes: tempo from LJ-Link, Ableton Link, MIDI clock, audio or tap.", "Ja: Tempo aus LJ-Link, Ableton Link, MIDI-Clock, Audio oder Tap."),
             ("Several outputs and mapping?", "Mehrere Ausgänge und Mapping?", "Yes, any number of screens and projection mapping.", "Ja, beliebig viele Bildschirme und Projektionsmapping."),
             ("Mac and Windows?", "Mac und Windows?", "Both, Apple chip and Intel.", "Beides, Apple-Chip und Intel."),
             ("Internet needed?", "Braucht es Internet?", "No, only for updates.", "Nein, nur für Updates.")])
         + "</table></div>"),
     FAQ((("Is VJ-Link really free?", "Ist VJ-Link wirklich kostenlos?"),
          ("Yes. VJ-Link is free and open source under the Eclipse Public License 2.0, without watermark, time limit or account.", "Ja. VJ-Link ist kostenlos und Open Source unter der Eclipse Public License 2.0, ohne Wasserzeichen, Zeitlimit oder Konto.")),
         (("Does VJ-Link run on Mac and Windows?", "Läuft VJ-Link auf Mac und Windows?"),
          ("Yes: macOS on Apple chip and Intel, and Windows 10 and 11 (64 bit). A graphics card with WebGL 2 is enough.", "Ja: macOS mit Apple-Chip und Intel sowie Windows 10 und 11 (64 Bit). Eine Grafikkarte mit WebGL 2 reicht.")),
         (("Do I need experience as a VJ?", "Brauche ich VJ-Erfahrung?"),
          ("No. Open the demo show on the start screen and it plays by itself; from there you change clips, colors and scenes step by step.", "Nein. Im Startbildschirm die Demo-Show öffnen, sie läuft von selbst; von dort änderst du Clips, Farben und Szenen Schritt für Schritt.")),
         (("Can I use my own videos and logos?", "Kann ich eigene Videos und Logos nutzen?"),
          ("Yes. MP4, MOV and WebM videos and PNG, JPG and SVG graphics; logos on white or black get their background removed automatically.", "Ja. Videos als MP4, MOV und WebM, Grafiken als PNG, JPG und SVG; bei Logos auf Weiß oder Schwarz wird der Hintergrund automatisch entfernt."))),
     BOX + more("free-vj-software.html"))

# ---------------------------------------------------------------- grandMA
page("grandma-visuals.html",
     ("Control visuals from a grandMA (Art-Net, sACN) | VJ-Link", "Visuals mit der grandMA steuern (Art-Net, sACN) | VJ-Link"),
     ("Control live visuals from a grandMA2 or grandMA3 over Art-Net or sACN: patch VJ-Link as a 91-channel fixture, recall scenes and colors, sync with timecode.",
      "Live-Visuals von grandMA2 oder grandMA3 steuern, über Art-Net oder sACN: VJ-Link als Gerät mit 91 Kanälen patchen, Szenen und Farben abrufen, Timecode."),
     ("Visuals from a grandMA", "Visuals von der grandMA"),
     ("Guide · grandMA2 / grandMA3 → VJ-Link", "Anleitung · grandMA2 / grandMA3 → VJ-Link"),
     ("Control visuals from a grandMA", "Visuals mit der grandMA steuern"),
     ("Run the screens like a fixture: scenes, colors, strobe and blackout come from the grandMA, the visuals follow the beat of the music.",
      "Die Bildschirme fahren wie ein Gerät: Szenen, Farben, Strobe und Blackout kommen von der grandMA, die Visuals folgen dem Beat der Musik."),
     SEC("answer", ("Short answer", "Kurz gesagt"),
         P("Set the grandMA to send Art-Net or sACN to the VJ-Link computer, save VJ-Link's channel list and patch it as a fixture with 91 channels. Then every executor can recall a scene, set the five color slots, the opacity of four layers, the strobe and the blackout. With LJ-Link the tempo comes straight from the DJ.",
           "Die grandMA so einstellen, dass sie Art-Net oder sACN an den VJ-Link-Rechner sendet, die Kanalliste von VJ-Link speichern und sie als Gerät mit 91 Kanälen patchen. Dann ruft jeder Executor eine Szene ab, setzt die fünf Farbslots, die Deckkraft von vier Ebenen, den Strobe und den Blackout. Mit LJ-Link kommt das Tempo direkt vom DJ."),
         IMG("connect.png", "CONNECT tab with Art-Net, sACN and live DMX values", "Tab VERBINDEN mit Art-Net, sACN und DMX-Live-Werten")),
     SEC("need", ("What you need", "Was du brauchst"),
         UL(("A grandMA2 or grandMA3 console or onPC with network output.", "Ein grandMA2- oder grandMA3-Pult oder onPC mit Netzwerk-Ausgang."),
            ("A computer with VJ-Link in the same network (same IP range), and a projector or LED wall on it.", "Einen Rechner mit VJ-Link im selben Netz (gleicher IP-Bereich) und daran einen Beamer oder eine LED-Wand."),
            ("Optional: LJ-Link for the tempo of the DJ.", "Optional: LJ-Link für das Tempo des DJs."))),
     SEC("grandma2", ("grandMA2 and grandMA2 onPC: step by step", "grandMA2 und grandMA2 onPC: Schritt für Schritt"),
         OL(("Setup → Network → Network Protocols.", "Setup → Network → Network Protocols."),
            ("Switch Art-Net (or sACN) on and set the line to Output with the universe VJ-Link listens to. Art-Net universe 0 in VJ-Link is often shown as 0.0 or 1 on the MA; check with the live values under CONNECT.",
             "Art-Net (oder sACN) einschalten und die Zeile auf Output mit dem Universe stellen, auf das VJ-Link hört. Art-Net-Universe 0 in VJ-Link heißt am MA oft 0.0 oder 1; mit den Live-Werten unter VERBINDEN prüfen."),
            ("Save the channel list in VJ-Link (CONNECT → Save channel list) and patch VJ-Link with 91 channels at the start address.", "In VJ-Link die Kanalliste speichern (VERBINDEN → Kanalliste speichern) und VJ-Link mit 91 Kanälen auf der Startadresse patchen."),
            ("Move the master channel: the DMX pill in VJ-Link turns green and the picture follows.", "Den Master-Kanal bewegen: Die DMX-Anzeige in VJ-Link wird grün, und das Bild folgt."))),
     SEC("grandma3", ("grandMA3 and grandMA3 onPC: step by step", "grandMA3 und grandMA3 onPC: Schritt für Schritt"),
         OL(("Menu → In & Out → DMX Protocols.", "Menu → In & Out → DMX Protocols."),
            ("Add an Art-Net or sACN line, mode Output, the universe VJ-Link listens to, and as destination the VJ-Link computer (or broadcast).", "Eine Art-Net- oder sACN-Zeile anlegen, Modus Output, das Universe, auf das VJ-Link hört, und als Ziel den VJ-Link-Rechner (oder Broadcast)."),
            ("Patch VJ-Link with the 91 channels of the channel list.", "VJ-Link mit den 91 Kanälen der Kanalliste patchen."),
            ("Optional OSC: In & Out → OSC, a line with the VJ-Link computer and port 8000, mode Send. A command like SendOSC 1 \"/vjlink/scene/go,i,3\" recalls scene 3.",
             "Optional OSC: In & Out → OSC, eine Zeile mit dem VJ-Link-Rechner und Port 8000, Modus Send. Ein Befehl wie SendOSC 1 \"/vjlink/scene/go,i,3\" ruft Szene 3 ab."))),
     SEC("channels", ("What the desk controls", "Was das Pult steuert"),
         UL(("Global: master, strobe, scene, transition, tempo factor, effect intensity, auto and blackout.", "Global: Master, Strobe, Szene, Blende, Tempo-Faktor, Effekt-Intensität, Auto und Blackout."),
            ("Five color slots with dimmer and RGB – the visuals take the colors of the light show.", "Fünf Farbslots mit Dimmer und RGB – die Visuals übernehmen die Farben der Lichtshow."),
            ("Layers 1–4: opacity, clip bank, clip, color source, speed, three effects, strobe and blend mode.", "Ebenen 1–4: Deckkraft, Clip-Bank, Clip, Farbquelle, Geschwindigkeit, drei Effekte, Strobe und Mischmodus."),
            ("Everything else can be mapped to any DMX channel, MIDI note or OSC address.", "Alles andere lässt sich auf beliebige DMX-Kanäle, MIDI-Noten oder OSC-Adressen legen.")),
         P("The other way round VJ-Link sends Art-Net or MIDI timecode, so a grandMA timecode show can run in sync with the videos of the show.",
           "Umgekehrt sendet VJ-Link Art-Net- oder MIDI-Timecode, sodass eine grandMA-Timecode-Show synchron mit den Videos der Show läuft.")),
     FAQ((("Which grandMA works?", "Welche grandMA geht?"),
          ("grandMA2 and grandMA3, consoles and onPC, and the dot2 with Art-Net output. The profile follows the MA manuals and is not yet confirmed on every desk; Art-Net and sACN reception is tested.", "grandMA2 und grandMA3, Pulte und onPC, und der dot2 mit Art-Net-Ausgang. Das Profil folgt den MA-Handbüchern und ist noch nicht an jedem Pult bestätigt; der Empfang von Art-Net und sACN ist getestet.")),
         (("Do I need a fixture file?", "Brauche ich eine Fixture-Datei?"),
          ("No. Patch 91 dimmer channels or build a fixture from the CSV channel list that VJ-Link saves.", "Nein. 91 Dimmerkanäle patchen oder aus der CSV-Kanalliste, die VJ-Link speichert, ein Gerät bauen.")),
         (("How do the visuals get the BPM?", "Wie bekommen die Visuals das BPM?"),
          ("With LJ-Link the tempo and the phrases come from the Pioneer or Denon players; otherwise from Ableton Link, MIDI clock, the audio input or tap.", "Mit LJ-Link kommen Tempo und Phrasen von den Pioneer- oder Denon-Playern; sonst aus Ableton Link, MIDI-Clock, dem Audio-Eingang oder Tap."))),
     BOX + more("grandma-visuals.html"))

# ---------------------------------------------------------------- Projektionsmapping
page("projection-mapping-software.html",
     ("Free projection mapping software | VJ-Link", "Projektionsmapping-Software kostenlos | VJ-Link"),
     ("Free projection mapping software for Mac and Windows: map live visuals onto walls, boxes and columns with corner pin, grid warp and masks, in time with music.",
      "Kostenlose Projektionsmapping-Software für Mac und Windows: Live-Visuals auf Wände, Kisten und Säulen mappen, mit Eckpunkten, Raster und Masken – im Takt."),
     ("Projection mapping", "Projektionsmapping"),
     ("Guide · projection mapping for Mac and Windows", "Anleitung · Projektionsmapping für Mac und Windows"),
     ("Free projection mapping software", "Projektionsmapping-Software kostenlos"),
     ("Map live visuals onto walls, boxes, columns and stage sets – free, with several projectors, and run by the light desk.",
      "Live-Visuals auf Wände, Kisten, Säulen und Bühnenbilder mappen – kostenlos, mit mehreren Beamern und vom Lichtpult gesteuert."),
     SEC("answer", ("Short answer", "Kurz gesagt"),
         P("In VJ-Link choose OUTPUT → Projection mapping. On the picture of each projector you lay canvases and drag their corners onto the wall, the box or the column. Curved surfaces get a 3×3 or 5×5 grid, doors and people are blacked out with masks. Each canvas can show its own picture with its own layers.",
           "In VJ-Link AUSGABE → Projektionsmapping wählen. Auf das Bild jedes Beamers legst du Leinwände und ziehst ihre Ecken auf die Wand, die Kiste oder die Säule. Gewölbte Flächen bekommen ein Raster 3×3 oder 5×5, Türen und Personen werden mit Masken geschwärzt. Jede Leinwand kann ein eigenes Bild mit eigenen Ebenen zeigen."),
         IMG("outputs-mapping.png", "Projection mapping editor with canvases and corner points", "Projektionsmapping-Editor mit Leinwänden und Eckpunkten")),
     SEC("steps", ("Projection mapping step by step", "Projektionsmapping Schritt für Schritt"),
         OL(("Connect the projector and open it under OUTPUT as an output.", "Den Beamer anschließen und unter AUSGABE als Ausgang öffnen."),
            ("Choose the arrangement Projection mapping and add a canvas with + Canvas.", "Die Anordnung Projektionsmapping wählen und mit + Leinwand eine Leinwand anlegen."),
            ("Drag the four corners onto the edges of the surface. Arrow keys move a point by 1 pixel.", "Die vier Ecken auf die Kanten der Fläche ziehen. Pfeiltasten verschieben einen Punkt um 1 Pixel."),
            ("Switch on Grid for alignment: the grid test pattern lies distorted on the canvas, so the edges can be matched exactly.", "Raster zum Ausrichten einschalten: Das Raster-Testbild liegt verzerrt auf der Leinwand, damit die Kanten genau passen."),
            ("For round surfaces choose the shape grid 3×3 or 5×5, for doors and windows add a mask.", "Für runde Flächen die Form Raster 3×3 oder 5×5 wählen, für Türen und Fenster eine Maske anlegen."),
            ("Put a stage photo behind the canvases as a guide – it never goes to the projector.", "Ein Bühnenfoto als Hilfe hinter die Leinwände legen – es geht nie an den Beamer.")),
         IMG("outputs-mapping-guide.png", "Projection mapping in VJ-Link with numbered steps", "Projektionsmapping in VJ-Link mit nummerierten Schritten")),
     SEC("screens", ("Several projectors and LED walls", "Mehrere Beamer und LED-Wände"),
         P("Every connected projector, screen or LED processor can be an output in its own resolution. As a canvas the picture runs seamlessly across all of them; in projection mapping each projector gets its own canvases. Up to five pictures with their own layers can be distributed onto the canvases, and scenes recall all of them at once.",
           "Jeder angeschlossene Beamer, Bildschirm oder LED-Prozessor kann ein Ausgang in eigener Auflösung sein. Als Leinwand läuft das Bild nahtlos über alle; im Projektionsmapping bekommt jeder Beamer eigene Leinwände. Bis zu fünf Bilder mit eigenen Ebenen lassen sich auf die Leinwände verteilen, und Szenen rufen alle gleichzeitig ab."),
         IMG("outputs-canvas.png", "Several screens arranged as one canvas", "Mehrere Bildschirme als eine Leinwand angeordnet")),
     FAQ((("Is the projection mapping really free?", "Ist das Projektionsmapping wirklich kostenlos?"),
          ("Yes. Projection mapping is part of VJ-Link, which is free and open source (EPL 2.0), without watermark or limits.", "Ja. Projektionsmapping ist Teil von VJ-Link, das kostenlos und Open Source (EPL 2.0) ist, ohne Wasserzeichen oder Einschränkungen.")),
         (("How many projectors can I use?", "Wie viele Beamer gehen?"),
          ("As many as the computer can connect; each output has its own resolution. A window output can be captured in OBS instead.", "So viele, wie der Rechner anschließen kann; jeder Ausgang hat seine eigene Auflösung. Ein Fenster-Ausgang lässt sich stattdessen in OBS abgreifen.")),
         (("Can a light desk control the mapping?", "Kann ein Lichtpult das Mapping steuern?"),
          ("Yes. DMX channels 71–91 set the brightness of the pictures and the opacity of their layers; scenes switch all canvases at once.", "Ja. Die DMX-Kanäle 71–91 setzen die Helligkeit der Bilder und die Deckkraft ihrer Ebenen; Szenen schalten alle Leinwände gleichzeitig."))),
     BOX + more("projection-mapping-software.html"))
