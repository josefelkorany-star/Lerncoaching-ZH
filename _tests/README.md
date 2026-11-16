# Kalenderprüfung

Ohne zusätzliche Pakete aus dem Repository ausführen:

```powershell
node --test _tests/calendar.test.cjs
```

Die Solltermine in `approved-calendar-fixture.json` stammen unabhängig von den Produktionsdateien aus der am 06.11.2026 freigegebenen Vorschau. Deren SHA256 ist im Fixture dokumentiert. Die 24 Termine 2026 und die Tarife CHF 40/35/30 pro Kind wurden zusätzlich gegen den Stand von PR #3 geprüft.

Geprüft werden alle Kurstage, die 16 kursfreien Samstage 2027 einschliesslich der drei bestätigten Ausnahmen, Quartale, Monatsbeiträge, Zürich-Datumsgrenzen und Sommerzeit, ICS-Export sowie der unveränderte Formularzugang und die Standard-Downloads. Ein isolierter Test mit synthetischen Daten prüft die gemeinsame Datenquelle; er verändert keine Website-Datei oder tatsächlichen Preise.

Die ICS-Prüfung kontrolliert CRLF, UTF-8-Zeilenfaltung, stabile Ereigniskennungen und die Uhrzeit jedes Ereignisses. Grundlage: [RFC 5545, insbesondere Abschnitte 3.1, 3.3.5 und 3.6.1](https://datatracker.ietf.org/doc/html/rfc5545). Sie ersetzt keinen Importtest in jeder Kalender-App.

Für den Formularvergleich muss der vorhandene PR-3-Commit `36b76c088ca2b123729ddf108ef3b80f082e8a03` lokal im Git-Verlauf verfügbar sein. Die Tests senden keine Formulare und prüfen weder die externe Versandverarbeitung noch die Speicherung. Browser-, Layout- und Tastaturprüfungen erfolgen gesondert.

## Getrenntes Website-Update vom 16.11.2026

```powershell
node --test _tests/calendar.test.cjs _tests/website-release.test.cjs
```

Die zusätzlichen acht Prüfgruppen sichern das Heroasset, FMS, Lernphasen, Elternhinweis, Quartalsfristen und lokale Verweise. Kontaktabschnitt, echte Formularadresse, Navigation/Dialogskripte, Kalenderdateien, Standard-PDFs, Flyer und Domain werden gegen den veröffentlichten Ausgangscommit `49635cee41ffb4ea40ea2a10ec28e4fe852bf316` geprüft; dieser muss lokal im Git-Verlauf vorhanden sein. Die Websiteänderungen wurden gezielt aus der vorhandenen Arbeit übernommen, ohne PR #5 oder #6 zu integrieren.

25 lokale Tests bestanden. Die Quellen-/Umbruchregeln sind kein Browsernachweis bei bestimmten Bildschirmbreiten. Eine frische isolierte Cloud-Browserprüfung war unter der Vorgabe ohne kostenpflichtige Tests nicht ausführbar. Neue private PDF-Fassungen und der Flyer mit Anfrageaufruf sind ausdrücklich nicht Teil dieses Updates; das bisher veröffentlichte Konzept enthält noch den älteren Zyklus. Dokument- und Formularumstellung bleiben gesondert abzustimmen. Kein Merge oder Live-Deployment durch diesen Prüfauftrag.
