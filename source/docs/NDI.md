# NDI®-Ausgang

NDI® ist eine eingetragene Marke der Vizrt NDI AB. VJ-Link ist kein Produkt von NDI und wird von NDI weder unterstützt
noch geprüft. Mehr zu NDI: [ndi.video](https://ndi.video/)

VJ-Link kann sein Bild als NDI-Quelle ins Netzwerk **senden**, etwa an VD-Link (Videowände), OBS, Resolume oder einen
NDI-Monitor. VJ-Link empfängt selbst keine NDI-Streams.

## Einrichten

1. **NDI-Laufzeit installieren.** VJ-Link nutzt die kostenlose NDI-Laufzeit von NDI und liefert sie nicht mit. Sie ist
   in den [NDI Tools](https://ndi.video/tools/) enthalten. Für macOS gibt es sie auch einzeln unter
   [ndi.link/NDIRedistV6Apple](https://ndi.link/NDIRedistV6Apple), für Windows unter
   [ndi.link/NDIRedistV6](https://ndi.link/NDIRedistV6). Fehlt die Laufzeit, zeigt VJ-Link unter **AUSGABE** beim
   NDI-Ausgang den Knopf **NDI-Laufzeit laden**.
2. **AUSGABE** öffnen, beim **NDI®-Ausgang** Bildgröße (z. B. 1920 × 1080 oder **Eigene Größe …** wie 2816 × 640 für
   eine Reihe LED-Wände) und Bildrate (25, 30, 50 oder 60 Bilder/s) wählen und **Senden** klicken. VJ-Link rechnet das Bild unsichtbar in genau dieser Größe, ohne Fenster und ohne
   Bildschirm, also auch unter Windows ohne virtuellen Monitor.
3. Im Netz erscheint die Quelle als **„RECHNERNAME (VJ-Link)“**. Den Namen in Klammern kannst du ändern. Die Zeile
   zeigt, wie viele Bilder je Sekunde rausgehen und wie viele Empfänger verbunden sind.
4. **+ NDI-Ausgang** legt bis zu vier NDI-Quellen an, z. B. „VJ-Link Wand“ und „VJ-Link Decke“ für zwei LED-Flächen mit
   eigenem LED-Prozessor. Jede hat ihre eigene Größe und Bildrate.
5. Unter **Anordnung** ist jeder NDI-Ausgang ein Ausgang wie ein Bildschirm: auf der Leinwand bekommt er seinen
   Ausschnitt, im Mapping eigene Flächen und Masken.

VJ-Link merkt sich Größe, Bildrate und Name. Hat ein NDI-Ausgang beim Beenden gesendet, sendet er nach dem nächsten
Start wieder. Erst ein Klick auf **Schließen** schaltet ihn auch für die nächsten Starts aus.

Erst mit **Senden** lädt VJ-Link die NDI-Laufzeit; vorher geht nichts von NDI ins Netz. NDI läuft in einem eigenen
Prozess, ein Fehler dort beendet VJ-Link nicht. Die Firewall muss NDI durchlassen (mDNS/Bonjour zum Finden, TCP/UDP für
das Bild). Windows fragt beim ersten Mal nach; unter macOS braucht VJ-Link die Freigabe „Lokales Netzwerk“.
1080p mit 60 Bildern/s braucht je nach Inhalt rund 100–150 Mbit/s: im WLAN lieber 30 Bilder/s oder 1280 × 720.

## Wie VJ-Link NDI einbindet (Lizenz)

Grundlage sind der NDI SDK License Agreement (Stand November 2024, [ndi.link/ndisdk_license](https://ndi.link/ndisdk_license))
und die Hinweise zur Lizenz und zur Weitergabe in der [NDI-SDK-Dokumentation](https://docs.ndi.video/all/developing-with-ndi/sdk/licensing).

- **Keine NDI-Dateien im Repository oder Installer.** VJ-Link lädt die vom Nutzer installierte NDI-Laufzeit zur
  Laufzeit (dynamisches Laden). NDI empfiehlt dieses Verfahren für Open-Source-Projekte. VJ-Link verteilt weder die
  NDI-Laufzeit noch die NDI Tools.
- **Schnittstelle.** Die wenigen Deklarationen in `src/main/ndi/ndi-lib.ts` folgen den Header-Dateien des NDI SDK. NDI
  veröffentlicht diese unter der MIT-Lizenz (Copyright © 2023–2026 Vizrt NDI AB), siehe `THIRD_PARTY.md`.
- **Marke.** „NDI®“ steht bei der ersten Nennung je Seite. Der Hinweis „NDI® ist eine eingetragene Marke der Vizrt NDI
  AB“ steht im Programm (beim NDI-Ausgang mit Link zu ndi.video, Einstellungen → Über, Über VJ-Link), in der README und
  hier. Der Name NDI wird nur verwendet, um die Kompatibilität zu benennen, nicht im Produktnamen.
- **Aktuell bleiben.** NDI verlangt aktuelle und vollständige NDI-Kompatibilität. VJ-Link nutzt die jeweils installierte
  Laufzeit (NDI 6, NDI 5 als Rückfall), Updates kommen direkt von NDI.

### Bedingungen für die NDI-Teile

Diese Bedingungen gelten zusätzlich zur Eclipse Public License 2.0 von VJ-Link und betreffen **nur** die NDI-Laufzeit,
das NDI SDK und die NDI-Produkte, nicht den Code von VJ-Link:

- Die NDI-Laufzeit, das NDI SDK und die NDI-Produkte dürfen nicht verändert, zurückentwickelt, disassembliert oder neu
  kompiliert werden. Das gilt auch für die Protokolle, die NDI im Netzwerk oder lokal verwendet, und für Versuche dazu.
- Technische Beschränkungen der NDI-Software dürfen nicht umgangen werden.
- Urheber- und Markenhinweise von NDI dürfen nicht entfernt, verdeckt oder verändert werden.
- NDI-Laufzeit und NDI-Software © Vizrt NDI AB. Alle Rechte bei Vizrt NDI AB und ihren Lizenzgebern.
- Vizrt NDI AB und ihre Lizenzgeber geben keinerlei Gewährleistung. Soweit gesetzlich zulässig, haften sie nicht für
  direkte, indirekte, zufällige oder Folgeschäden aus der Nutzung von VJ-Link oder der NDI-Teile.
- Exportkontroll- und Sanktionsrecht (u. a. der USA) ist einzuhalten.
- Wer VJ-Link weiterentwickelt oder weitergibt und die NDI-Funktion behält, muss die NDI SDK License einhalten und diese
  Bedingungen an die eigenen Nutzer weitergeben.

---

**English summary:** VJ-Link can send its picture as an NDI® source (AUSGABE / OUTPUT → NDI® output) using the NDI
runtime that the user installs from NDI ([ndi.video/tools](https://ndi.video/tools/)). No NDI binaries are distributed
with VJ-Link. NDI® is a registered trademark of Vizrt NDI AB; VJ-Link is not a product of NDI. The terms above (no
modification or reverse engineering of NDI software and protocols, no circumvention, keep NDI notices, © Vizrt NDI AB,
no warranty or liability of Vizrt NDI AB and its licensors, export compliance, pass these terms on when redistributing
with NDI support) apply to the NDI parts only, in addition to VJ-Link's EPL-2.0.
