"""Schaubilder für das Wiki, die keine Kästchen-Diagramme sind (LFO-Kurven, Audio-Pumpen, Einpassen, Übergänge).
Alle Texte tragen data-de wie in DIAGRAM, build_site.py macht daraus die deutsche Seite."""
import math
from wikilib import esc, el

INK, DIM, LINE, PINK, BG, PANEL = "#eef2f7", "#9aa6b6", "#2a2f3d", "#ff5c93", "#07090c", "#151821"


def T(x, y, en, de=None, size=12, fill=INK, anchor="middle", weight="400"):
    de = en if de is None else de
    attr = ' data-de="%s"' % esc(de) if de != en else ""
    return ('<text x="%.0f" y="%.0f" text-anchor="%s" font-size="%s" font-weight="%s" fill="%s"%s>%s</text>'
            % (x, y, anchor, size, weight, fill, attr, esc(en)))


def FIG(w, h, inner, cap=None, label=("Diagram", "Diagramm")):
    s = ('<figure class="ddiag"><svg viewBox="0 0 %d %d" role="img" aria-label="%s" data-de-aria-label="%s" xmlns="http://www.w3.org/2000/svg">'
         % (w, h, esc(label[0]), esc(label[1])))
    s += "".join(inner) + "</svg>"
    if cap:
        s += el("figcaption", *cap)
    return s + "</figure>"


def _panel(x, y, w, h):
    return '<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="10" fill="%s" stroke="%s"/>' % (x, y, w, h, PANEL, LINE)


def LFO_WAVES():
    """Die fünf LFO-Formen über zwei Durchläufe, mit Grundwert (gestrichelt) und Schwingbereich (Stärke)."""
    shapes = [("sine", "Sine", "Sinus"), ("triangle", "Triangle", "Dreieck"), ("saw", "Saw", "Sägezahn"),
              ("square", "Square", "Rechteck"), ("random", "Random", "Zufall")]
    rnd = [0.3, 0.85, 0.15, 0.6, 0.95, 0.4]
    out, pw, ph, gap = [], 168, 150, 14
    for i, (k, en, de) in enumerate(shapes):
        x0 = 12 + i * (pw + gap)
        out.append(_panel(x0, 10, pw, ph))
        out.append(T(x0 + pw / 2, 32, en, de, 13, INK, weight="600"))
        top, bot = 50, 130
        out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s" opacity=".12"/>' % (x0 + 10, top, pw - 20, bot - top, PINK))
        mid = (top + bot) / 2
        out.append('<line x1="%d" y1="%.0f" x2="%d" y2="%.0f" stroke="%s" stroke-dasharray="4 4"/>' % (x0 + 10, mid, x0 + pw - 10, mid, DIM))
        pts = []
        n = 160
        for j in range(n + 1):
            u = j / n * 2  # zwei Durchläufe
            ph_ = u % 1
            if k == "sine":
                v = 0.5 - 0.5 * math.cos(ph_ * 2 * math.pi)
            elif k == "triangle":
                v = 1 - abs(ph_ * 2 - 1)
            elif k == "saw":
                v = ph_
            elif k == "square":
                v = 1 if ph_ < 0.5 else 0
            else:
                v = rnd[int(u * 3) % len(rnd)]
            pts.append((x0 + 10 + j / n * (pw - 20), bot - v * (bot - top)))
        out.append('<polyline fill="none" stroke="%s" stroke-width="2.5" points="%s"/>' % (PINK, " ".join("%.1f,%.1f" % p for p in pts)))
    out.append(T(12, 182, "Dashed line = the value you set (base value). Pink band = how far it swings (Strength). Two rounds shown.",
                 "Gestrichelt = eingestellter Wert (Grundwert). Pinker Bereich = wie weit er schwingt (Stärke). Gezeigt sind zwei Durchläufe.",
                 12, DIM, "start"))
    return FIG(12 + 5 * (pw + gap), 196, out, label=("LFO shapes", "LFO-Formen"))


def AUDIO_PUMP():
    """Audio-Modulation: Fenster der Breite „Stärke“ ab dem Grundwert nach oben, ganz oben von unten bis zum Grundwert."""
    out = []
    cases = [(0.3, 0.5, ("Fader at 30 %, strength 50 %", "Regler auf 30 %, Stärke 50 %"),
              ("silence = 30 %, full hit = 80 %", "Stille = 30 %, voller Schlag = 80 %")),
             (1.0, 0.8, ("Fader at 100 %, strength 80 %", "Regler auf 100 %, Stärke 80 %"),
              ("silence = 20 %, full hit = 100 %", "Stille = 20 %, voller Schlag = 100 %"))]
    for i, (base, depth, title, sub) in enumerate(cases):
        x0 = 12 + i * 432
        out.append(_panel(x0, 10, 420, 270))
        out.append(T(x0 + 210, 36, title[0], title[1], 14, INK, weight="600"))
        top, bot, sx = 76, 206, x0 + 66
        y = lambda v: bot - v * (bot - top)
        lo = min(base, 1 - depth)
        out.append(T(sx, 62, "fader", "Regler", 11.5, DIM))
        out.append('<rect x="%d" y="%d" width="14" height="%d" rx="7" fill="%s"/>' % (sx - 7, top, bot - top, "#1e222e"))
        out.append('<rect x="%d" y="%.0f" width="14" height="%.0f" rx="7" fill="%s" opacity=".85"/>' % (sx - 7, y(lo + depth), depth * (bot - top), PINK))
        out.append('<circle cx="%d" cy="%.0f" r="10" fill="%s" stroke="%s" stroke-width="2"/>' % (sx, y(base), INK, BG))
        for v in (0, 0.5, 1):
            out.append(T(sx - 18, y(v) + 4, "%d %%" % int(v * 100), None, 11, DIM, "end"))
        # Wert im Bild über die Zeit
        gx, gw = x0 + 130, 270
        out.append(T(gx + gw / 2, 62, "value in the image over time", "Wert im Bild über die Zeit", 11.5, DIM))
        out.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (gx, bot, gx + gw, bot, LINE))
        out.append('<line x1="%d" y1="%.0f" x2="%d" y2="%.0f" stroke="%s" stroke-dasharray="4 4"/>' % (gx, y(base), gx + gw, y(base), DIM))
        pts = []
        for j in range(121):
            t = j / 120 * 4
            kick = math.exp(-((t % 1) * 6)) if t % 1 < 0.9 else 0
            sig = min(1, kick * (0.9 if int(t) % 2 else 1.0))
            pts.append((gx + j / 120 * gw, y(lo + depth * sig)))
        out.append('<polyline fill="none" stroke="%s" stroke-width="2.5" points="%s"/>' % (PINK, " ".join("%.1f,%.1f" % p for p in pts)))
        out.append(T(x0 + 210, 236, "white knob = base value · pink = range of the strength", "weißer Knopf = Grundwert · Pink = Bereich der Stärke", 11.5, DIM))
        out.append(T(x0 + 210, 260, sub[0], sub[1], 13, INK, weight="600"))
    out.append(T(12, 304, "Each spike is a bass hit; the dashed line is the base value. The fader stays where you set it, only the image follows the pink line.",
                 "Jede Spitze ist ein Bass-Schlag, die gestrichelte Linie der Grundwert. Der Regler bleibt, wo du ihn eingestellt hast, nur das Bild folgt der pinken Linie.", 12, DIM, "start"))
    return FIG(876, 316, out, label=("Audio modulation", "Audio-Modulation"))


def FIT():
    """Ausgabebild 9:16 auf einem 16:9-Ausgang: ganz zeigen, füllen, strecken."""
    out = []
    modes = [("contain", "Fit", "Ganz zeigen", "whole image, black bars", "ganzes Bild, schwarze Ränder"),
             ("cover", "Fill", "Füllen", "output full, image cropped", "Ausgang voll, Bild beschnitten"),
             ("stretch", "Stretch", "Strecken", "output full, image distorted", "Ausgang voll, Bild verzerrt")]
    for i, (k, en, de, sen, sde) in enumerate(modes):
        x0 = 12 + i * 292
        out.append(_panel(x0, 10, 280, 230))
        out.append(T(x0 + 140, 34, en, de, 14, INK, weight="600"))
        ox, oy, ow, oh = x0 + 20, 56, 240, 135  # 16:9-Ausgang
        out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="#000" stroke="%s" stroke-width="2"/>' % (ox, oy, ow, oh, DIM))
        clip = "c%d" % i
        out.append('<clipPath id="%s"><rect x="%d" y="%d" width="%d" height="%d"/></clipPath>' % (clip, ox, oy, ow, oh))
        if k == "contain":
            ih = oh; iw = ih * 9 / 16; ix, iy = ox + (ow - iw) / 2, oy
        elif k == "cover":
            iw = ow; ih = iw * 16 / 9; ix, iy = ox, oy + (oh - ih) / 2
        else:
            ix, iy, iw, ih = ox, oy, ow, oh
        g = '<g clip-path="url(#%s)">' % clip
        g += '<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" fill="#2a1630" stroke="%s" stroke-width="2"/>' % (ix, iy, iw, ih, PINK)
        cx, cy = ix + iw / 2, iy + ih / 2
        for r in (0.42, 0.3, 0.18):
            g += '<ellipse cx="%.0f" cy="%.0f" rx="%.0f" ry="%.0f" fill="none" stroke="%s" stroke-width="2"/>' % (cx, cy, iw * r, ih * r * 9 / 16 if k != "stretch" else ih * r, PINK)
        g += "</g>"
        out.append(g)
        out.append(T(x0 + 140, 218, sen, sde, 11.5, DIM))
    out.append(T(12, 262, "Example: output picture 9:16 (portrait) on a 16:9 projector. Grey frame = the output, pink = the picture.",
                 "Beispiel: Ausgabebild 9:16 (Hochformat) auf einem 16:9-Beamer. Grauer Rahmen = der Ausgang, Pink = das Bild.", 12, DIM, "start"))
    return FIG(888, 276, out, label=("Fitting the output picture", "Ausgabebild einpassen"))


def CHASE_TIMELINE():
    """Chase über 8 Beats: vorwärts, hin und her, Zufall (Schritt 1 Beat, Clips A B C) und „Sichtbar 50 %“."""
    cols = {"A": "#ff5c93", "B": "#22c8f0", "C": "#ffb020"}
    rows = [("Forward", "Vorwärts", "ABCABCAB", 1.0), ("Back and forth", "Hin und her", "ABCBABCB", 1.0),
            ("Random (rounds)", "Zufall (Runden)", "BCACABCA", 1.0), ("Forward, visible 50 %", "Vorwärts, sichtbar 50 %", "ABCABCAB", 0.5)]
    out, x0, cw, rh = [], 230, 76, 44
    out.append(_panel(10, 10, x0 + 8 * cw + 20, 40 + len(rows) * (rh + 10) + 36))
    for b in range(8):
        out.append(T(x0 + b * cw + cw / 2, 36, "Beat %d" % (b + 1), None, 11.5, DIM))
    for r, (en, de, seq, gate) in enumerate(rows):
        y = 50 + r * (rh + 10)
        out.append(T(x0 - 14, y + rh / 2 + 5, en, de, 12.5, INK, "end", "600"))
        for b, ch in enumerate(seq):
            w = (cw - 6) * gate
            out.append('<rect x="%.0f" y="%d" width="%.0f" height="%d" rx="6" fill="%s" opacity=".9"/>' % (x0 + b * cw + 3, y, w, rh, cols[ch]))
            out.append(T(x0 + b * cw + 3 + w / 2, y + rh / 2 + 5, ch, None, 14, "#07090c", weight="700"))
    yb = 50 + len(rows) * (rh + 10) + 18
    out.append(T(20, yb, "A, B, C = the clips of the row (or the ones you picked). Here one step = 1 beat; with “visible 50 %” each clip only flashes for half the step.",
                 "A, B, C = die Clips der Zeile (oder die ausgewählten). Hier ein Schritt = 1 Beat; mit „sichtbar 50 %“ blitzt jeder Clip nur den halben Schritt auf.", 12, DIM, "start"))
    return FIG(x0 + 8 * cw + 30, yb + 20, out, label=("Chase over eight beats", "Chase über acht Beats"))
