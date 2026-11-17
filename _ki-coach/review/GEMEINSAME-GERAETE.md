# Gemeinsame Geräte: gesperrte Wiederherstellung

Stand: 17. November 2026. Gezielte Fortsetzung der geprüften Arbeitsfassung ab `2bc0748`; nur `working/coach.html` und lokale Testhilfen geändert. Die vier Originaldateien bleiben unverändert.

## Änderung

- Ein gespeicherter Code wird zuerst beim Server geprüft. Gespeicherte Namen, Rollen, Verbrauchswerte und Chats öffnen die Ansicht nicht. Die Chatdaten werden bis zur Bestätigung nicht aus dem Gerätespeicher gelesen.
- Die Ansicht bleibt bei abgelehntem Zugang, Verbindungsfehler, Zeitüberschreitung oder unvollständiger Antwort gesperrt. Ein neuer manueller Anmeldeversuch ist möglich; es gibt keinen automatischen Wiederholungsaufruf.
- Erst die bestätigte Serverantwort baut Namen, Rolle, Fachauswahl, Eingabehinweis, Beispiele, Kopierknöpfe und Verbrauchsanzeige auf. Eine frühere Lehrpersonenrolle bestimmt weder die neue Rolle noch ein Lehrpersonenfach als neue Schüler-Vorauswahl.
- Beim Verlassen der Seite werden auch Chatüberschrift, Fachanzeige und Verbrauchshinweise entfernt. Eine aus dem Seitencache wiederhergestellte Seite prüft den Zugang erneut. Ausstehende Antworten der vorherigen Ansicht werden ungültig.
- Bereits vorhandene Abmelde-, Foto-, Meldungs- und Antwortabgrenzung bleiben erhalten. Gespeicherte eigene Chats werden nicht migriert oder automatisch gelöscht.

## Ausgeführte Prüfungen

`node --test --test-reporter=spec _ki-coach/tests/shared-device.test.mjs _ki-coach/tests/working-ui.test.mjs _ki-coach/tests/working-integration.test.mjs _ki-coach/tests/preservation.test.mjs`

**51 von 51 Prüfungen bestanden:**

| Prüfgruppe | Anzahl | Nachweis |
| --- | ---: | --- |
| Neue Prüfungen für gemeinsame Geräte | 17 | Dauerhafter und sitzungsbezogener Speicher; verzögerte Bestätigung ohne Namen/Chats auch im versteckten DOM; kein vorzeitiger Chat-Speicherzugriff; Ablehnung/Netzfehler/Timeout/ungültige Rolle; beide Rollenwechsel; erneute Anmeldung; verspäteter Rücklauf nach Codewechsel; Seitencache-Abfolge inklusive Ablehnung und bereits ausstehender Anmeldung. |
| Bestehende Oberflächenprüfungen | 22 | Sitzungsbereinigung, verspätete Antworten, Fotoauswahl ohne dauerhafte Bilddaten, Fachchats, konkrete Meldungsbestätigung und vorhandener Wiederholungsschutz. |
| Bestehende integrierte UI-/Serverprüfungen | 7 | Verlust von Antworten, Wiederholungsschutz, Meldungsspeicherung und ausgeschöpftes Kontingent mit simuliertem Server. |
| Originalschutz | 5 | Vier SHA-256-Vergleiche und genau vier Originaldateien. |

Der gezielte Diff erhält Markup, Styles, Rollen, Lernbeispiele und Fotoablauf. Die neue Sperre verwendet die bereits vorhandene Sitzungsabgrenzung.

## Grenzen

Die Tests führen das JavaScript in einer lokalen DOM-Nachbildung mit ausschliesslich erfundenen Daten und ersetztem Transport aus. Es gab keine Browserprüfung, keine echte Browser-Seitencache-Prüfung, keinen Google- oder Claude-Aufruf und keine Veröffentlichung. Die Lebenszyklusereignisse `pagehide` und `pageshow` wurden nachgebildet; der reale Seitencache bleibt im späteren kostenlosen Cloud-Browsertest zu prüfen.

Die Änderung sperrt die Oberfläche bis zur Serverbestätigung. Sie verschlüsselt bereits gespeicherte Chats nicht und ersetzt nicht die bestehende Option zum Löschen lokaler Chats beim Abmelden. Die private Demo verwendet weiterhin ihre simulierte Zugangsbestätigung; eine echte Google-Integration ist damit nicht nachgewiesen.
