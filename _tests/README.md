# Kalenderprüfung

Ohne zusätzliche Pakete aus dem Repository ausführen:

```powershell
node --test _tests/calendar.test.cjs
```

Die Solltermine in `approved-calendar-fixture.json` stammen unabhängig von den Produktionsdateien aus der am 06.11.2026 freigegebenen Vorschau. Deren SHA256 ist im Fixture dokumentiert. Die 24 Termine 2026 und die Tarife CHF 40/35/30 pro Kind wurden zusätzlich gegen den Stand von PR #3 geprüft.

Geprüft werden alle Kurstage, die 16 kursfreien Samstage 2027 einschliesslich der drei bestätigten Ausnahmen, Quartale, Monatsbeiträge, Zürich-Datumsgrenzen und Sommerzeit, ICS-Export sowie der unveränderte Formularzugang und die Standard-Downloads. Ein isolierter Test mit synthetischen Daten prüft die gemeinsame Datenquelle; er verändert keine Website-Datei oder tatsächlichen Preise.

Die ICS-Prüfung kontrolliert CRLF, UTF-8-Zeilenfaltung, stabile Ereigniskennungen und die Uhrzeit jedes Ereignisses. Grundlage: [RFC 5545, insbesondere Abschnitte 3.1, 3.3.5 und 3.6.1](https://datatracker.ietf.org/doc/html/rfc5545). Sie ersetzt keinen Importtest in jeder Kalender-App.

Für den Formularvergleich muss der vorhandene PR-3-Commit `36b76c088ca2b123729ddf108ef3b80f082e8a03` lokal im Git-Verlauf verfügbar sein. Die Tests senden keine Formulare und prüfen weder die externe Versandverarbeitung noch die Speicherung. Browser-, Layout- und Tastaturprüfungen erfolgen gesondert.
