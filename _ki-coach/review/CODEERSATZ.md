# Persönlichen Code ersetzen – geprüfte Arbeitsfassung

Stand: 17. November 2026. Nur `working/`; die vier Originaldateien bleiben unverändert. Die Prüfungen verwenden ausschliesslich erfundene Personen sowie ersetzte Google- und Claude-Dienste. Sie sind kein Google-Integrationstest und keine Freigabe für ein Deployment.

## Verwaltung

Im Tabellenmenü **KI-Coach → Persönlichen Code ersetzen** den bisherigen Code eingeben. Nicht zuerst die Codezelle überschreiben oder löschen. Der Menüpunkt sichert die Zuordnung und die bisherige Codehistorie, erzeugt einen unbenutzten Ersatzcode und liest die gespeicherte Zuordnung zurück. Erst nach erfolgreicher Rückleseprüfung wird der neue Code bestätigt. Der alte Code kann sich anschliessend nicht mehr anmelden; Tages-/Monatsverbrauch, offene Reservierungen, Rollen, Limits und eine etwaige Zugangssperre bleiben erhalten.

Die Arbeitsfassung ergänzt bei der ersten bestätigten Zuordnung zwei technische Spalten im Blatt `Zugänge`: **Verbrauchs-ID** und **Codehistorie**. Diese gehören zur Person und müssen beim Sortieren mit der ganzen Zeile verschoben werden. Nicht löschen, kopieren, bearbeiten oder durch Formeln ersetzen. Falls an diesen Positionen bereits andere Daten/Überschriften stehen, wird gesperrt statt überschrieben. Verbrauchsspiegel werden anhand der ID in der aktuellen Zeile aktualisiert.

`Codes für neue Zeilen erzeugen` bleibt verfügbar. Bei bereits gesicherter Identität kann damit auch eine versehentlich geleerte Codezelle ohne Verbrauchsverlust ersetzt werden. Ohne Identität erfolgt **keine automatische Neuanlage**: Für eine wirklich neue Person ist die ausdrückliche Eingabe `NEU` erforderlich. Ein gelöschter Altcode muss über seinen bisherigen Wert zugeordnet und separat mit `ZUORDNEN` bestätigt werden. Bereits sichtbarer Verbrauch verhindert die Neuanlage über `NEU`; ein Code, der einer anderen Zugangszeile gehört oder früher gehörte, wird abgewiesen. Bei unbekanntem Altcode abbrechen und die Zuordnung anhand der gesicherten Verwaltungskopie klären.

Die technische Zuordnung einer bereits vor dieser Korrektur manuell geleerten oder überschriebenen Codezelle lässt sich ohne bisherigen Code nicht aus einem Namen rekonstruieren. Namen sind keine Identifikatoren. Eine solche historische Zuordnung muss die Verwaltung ausdrücklich belegen; die Arbeitsfassung behauptet keinen automatischen Nachweis. Ebenso können manuell gelöschte technische Spalten keine zuverlässige Identität erhalten. Dieser Eingriff ist kein unterstützter Codeersatz.

## Erhalt vorhandener Verbräuche und Belege

Die erste, bisher vom Server verwendete Kennung des normalisierten Codes wird als unveränderliche Verbrauchs-ID gespeichert. Auch nach weiteren Codewechseln bleibt genau diese Kennung bestehen. Damit benötigen vorhandene Daten weder eine Umschlüsselung noch eine Summenmigration:

- Die ursprünglichen Properties `Z_M_<Kennung>` und `Z_T_<Kennung>` behalten ihre Bedeutung.
- Die Vorgänge aus Stand `2bc0748` behalten Personenkennung, Vorgangsschlüssel und Status.
- Fertige, reservierte, unklare und prüfpflichtige Anfragen behalten Kosten und Tagesplatz.
- Wiederholungen derselben Anfrage/Meldung verwenden dieselben Belege. Ein Codewechsel eröffnet keinen zweiten Namensraum und löst keine zweite Claude-Anfrage aus.
- Menütests behalten ihren Wiederholungsschutz. Globale Originalzähler und Journalkosten werden weiterhin genau einmal gezählt.
- Bisherige Codekennungen bleiben reserviert und dürfen keiner zweiten Person zugewiesen werden. Doppelte IDs, Codes oder historische Kennungen sperren die Verarbeitung.

Sichern und Codeänderung laufen unter derselben Skriptsperre. Vor der Änderung der Codezelle werden Identität und Historie geschrieben, bestätigt und zurückgelesen. Ein Schreibfehler kann deshalb einen abgebrochenen Austausch hinterlassen, aber keinen neuen kostenlosen Zähler. Bei verlorener Schreibbestätigung ist der tatsächlich in der Tabelle stehende Code massgeblich; das Menü behauptet dann keinen Erfolg. Es darf nicht durch Löschen der technischen Felder «repariert» werden.

## Ausgeführte Prüfungen

`node --test _ki-coach/tests/code-replacement.test.mjs` prüft unter anderem:

- Teilweise verbrauchte Originalzähler zusammen mit bereits vorhandenen Journalvorgängen, ohne zusätzliche Migration oder Doppelzählung.
- Verbrauch nahe am Tageslimit und am Monatsbudget; genau dieselben Grenzen nach Codeersatz.
- Codeersatz während einer laufenden Anfrage; paralleler neuer Code kann die Reservierung nicht umgehen.
- Fertige/unklare Anfragen, verlorener Antwortcache, geänderte Nutzlast, Meldungen und Menütest-Wiederholungen.
- Wiederholte Codewechsel, gleiche Namen, ganze sortierte Zeilen, deaktivierte Zugänge, historische Codekollisionen.
- Fehlende/fehlerhafte Identitäten, fremde technische Spalten, manuelle Codeüberschreibung, abgebrochene Zuordnung.
- Fehler unmittelbar vor/nach Metadaten- und Codeänderung; widersprüchliche Rückleseprüfung; keine kostenpflichtige Anfrage bei diesen Fehlern.
- Bestätigte Neuanlage, bestätigte Altcode-Wiederzuordnung und normale Tages-/Monatswechsel in `Europe/Zurich`.

Zusätzlich bleibt die vorherige Backend-Regressionssuite unverändert. Keine echten Familien, Anmeldungen, E-Mails, Google-Schreibzugriffe oder Claude-Aufrufe wurden durch diese Tests verwendet. `einrichten()` läuft ausschliesslich im lokalen VM-Testdouble und wurde in keinem Google-Projekt ausgeführt.
