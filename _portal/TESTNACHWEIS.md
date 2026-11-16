# Portal v1 – Prüfnachweis vom 16.11.2026

**Entwurf, nicht freigeschaltet. Keine echten Familien, Produktionsschlüssel oder Cloudinstanz.**

Der gemeinsame Abschlusslauf bestand **75 von 75 Tests**: 28 Berechnungstests, 11 Anwendungssteuerungs-, 6 API-Client-, 16 DOM-, 10 PostgreSQL/RLS-Testgruppen, 1 private HTTP-Matrix und 3 Auslieferungsgrenzen-/Assettests. Ausführung mit Node und fest versionierten Paketen aus `_portal/package-lock.json`. Testdateien: [tests](tests), [db-tests/rls.test.mjs](db-tests/rls.test.mjs).

## Rollen- und Zugriffsnachweis

Die folgende Matrix wurde mit derselben Migration und denselben RPCs in **PGlite/PostgreSQL** ausgeführt. RLS, Grants, Constraints und Transaktionen sind echte SQL-Ausführung; Auth-Tabellen und JWT-Claims werden durch synthetische Testidentitäten simuliert. Die zusätzliche lokale HTTP-Vorschau verwendet ebenfalls diese SQL-Regeln. Das ist **kein bestandener Supabase-Auth-/PostgREST-Integrationstest**.

| Prüfung | Ergebnis der lokalen SQL-Prüfung |
|---|---|
| Eltern A / Eltern B | Nur die ausdrücklich zugeordneten Kinder; fremde Familie weder lesbar noch beschreibbar |
| Geschwister | Jedes Schülerkonto nur eigenes Kind; keine Geschwister, Elternnotizen, Elterntermine oder internen Notizen im Payload |
| Volljährige Person | Eigener Zugang; gleiche Familien-ID erzeugt keine Elternfreigabe |
| Eltern melden Prüfung | Eigener freigegebener Lernender und passendes Fach erlaubt; fremdes Kind/Fach und weitere fachliche Schreibrechte abgewiesen |
| Kernteam | Betreuung aktiver Kurskinder erlaubt; interne Notizen sichtbar; keine Rollen-/Kontoverwaltung |
| Vertretung | Ohne ausdrückliche Kernteamfreigabe keine Lerndaten |
| Josef als Testadmin | Nur ausdrücklich zugeordnete verifizierte Admin-ID; kein weiterer Admin per Web-RPC |
| Unzugeordnet / entzogene Freigabe | Keine Lerndaten; Zuordnungsentzug und Austritt wirken bei der nächsten Datenbankanfrage |
| Deaktiviertes / reaktiviertes Konto | Alte und während der Sperre angelegte Sitzungen abgewiesen; auch exakt gleicher Zeitstempel wie die Sperrgrenze abgewiesen |
| Beendete / abgelaufene / fremde Sitzung | Abgewiesen; nicht nur JWT-Rollenbehauptung oder UI-Menü geprüft |
| MFA | Privilegierte simulierte AAL1-Claims abgewiesen; AAL2 erforderlich. Echter TOTP-Login bleibt offen |
| Ausgeloggt / anonym | Keine Datensätze und keine Schreib-RPCs |
| Direkte Tabellenzugriffe | RLS auf allen Portal-Tabellen, sensible Spalten/Tabellen beschränkt, direkte Mutationen verboten |
| Manipulation | Fremde IDs, Autoren-/Rollenfelder, ungültige Stufen/Datumswerte abgewiesen; serverseitige Autor-/Zeitstempel |
| Wiederholung / Korrektur | Samstagsdaten atomar und eindeutig pro Kind/Kurstag, Prüfungswiederholung mit stabiler ID ohne Duplikat |

## Weitere bestandene Prüfungen

- Kalenderquelle unverändert: sämtliche 24 Kurstage 2026 und 36 Kurstage 2027; die drei bestätigten Ausnahmen bleiben frei. Jahreswechsel, Europe/Zurich und Sommer-/Winterzeitgrenzen geprüft. Keine zweite handgepflegte Terminliste.
- Teilnahmezeitraum, explizite Absenz gegenüber fehlender Erfassung, letzte tatsächlich erfasste Stufen, zeitlich aktive Fachperioden, keine zukünftigen Werte/Nullersatzwerte; Rückgang und leere Datenlage; maximal drei stabile Prioritäten, 7-/10-Tage-Fenster.
- DOM-Ereignisse mit Linkedom: sichere Textausgabe, Formularfelder ohne vorgewählte Beobachtungen, historische Samstagskorrektur, Tabellenalternative und Diagramm-Pfeiltasten, Erfolg erst nach bestätigtem Speichern. Diese DOM-Emulation prüft keine CSS-Abmessungen oder native Formularvalidierung.
- Daten-/Ansichtswechsel: alte Antworten und alte Fehler können neueren Stand nicht überschreiben; Abmeldung, Kindwechsel und erkannter Rechteentzug verwerfen alte Daten; Hintergrundabgleich erhält ungespeicherte Eingaben und bei unverändertem Stand den Fokus.
- Private HTTP-Vorschau: nur Loopback, erlaubte Assetliste, fremde Origin/Host abgewiesen, keine Operator-/SQL-Dateien ausgeliefert. Keine externen HTTP-Ziele in der Vorschau.
- Portal standardmässig aus, leere Konfiguration, keine Beispieldaten/Privatvorschau im Produktionseinstieg. Dieselbe Desktop-/Mobilnavigation hat einen standardmässig versteckten Link. Lokaler Supabase-Assethash und verknüpfte Dateien geprüft.
- JavaScript-Syntax und vollständiger Diff geprüft; bestehende Website erhält nur den deaktivierten Portal-Link. Formularziel, Kalender/ICS, PDFs, Verträge und PR #5 bleiben unverändert. npm-Audit meldete am Prüftag keine bekannten Sicherheitsmeldungen; das ist keine Sicherheitsgarantie.

## Tatsächlich eingesetzte Subagents

- `portal_ui`: Oberfläche und 16 DOM-Tests; anschliessend unabhängige Modell-/API-/Datenbank- und private HTTP-/DOM-Kopplungsprüfung (11 zusätzliche Prüfgruppen).
- `portal_database`: Migration, Rollenregeln, SQL-Fixtures, Betreiberwerkzeuge sowie Vorbereitung der echten Auth-/REST-Matrix.
- `portal_calculations`: Berechnungen und 28 Tests; anschliessend unabhängiger Review anderer Komponenten mit 23 privaten Prüfungen (8 Anwendungssteuerung/Konfiguration, 12 SQL/RLS, 3 Operatorguards). Die eigene Modellarbeit wird dadurch nicht als unabhängig abgenommen bezeichnet.

Die privaten Berichte und die ursprüngliche Gestaltungsvorlage bleiben ausserhalb des Repository. Konkrete Reviewbefunde zu Sitzungsreaktivierung, Zeitstempelgrenzen, Hintergrundantworten/-eingaben, historischen Fachperioden, Kompetenzdaten, CSP und lokalen Betreiberzielen wurden korrigiert und gezielt nachgeprüft.

## Nicht ausgeführt / vor echten Daten offen

| Prüfung | Konkrete Grenze |
|---|---|
| Vollständiger Supabase-Auth-/PostgREST-Test | Docker/WSL und lokaler Supabase-Stack fehlen. [auth-integration.mjs](db-tests/auth-integration.mjs) ist vorbereitet und syntaxgeprüft, nicht gelaufen. Echte signierte Sitzungen, Registrierungssperre, TOTP, eigener Passwortwechsel, Reset und alte Auth-Sitzungen bleiben damit offen. |
| Browser/Smartphone/Desktop/Safari | Kein kostenfreier, nachweislich isolierter Cloud-Browsertest ausgeführt. Kein persönlicher Browser verwendet. Keine Layout-, Konsolen-, nativen Fokus-/Validierungs- oder Screenreader-Bestehensbehauptung. |
| CI | Im bestehenden Repository sind keine CI-Prüfungen eingerichtet. Lokale Prüfungen sind keine bestandenen CI-Checks. |
| Betrieb mit echten Familien | Datenschutz-/Aufbewahrungs-/Löschentscheidungen, tatsächliche Region/Dienstleister, kontrollierte Aliasdomain, erreichbarer Betreiber-Recoveryweg, MFA und gesonderte Freigabe fehlen. |

Vor Freischaltung: echte Auth-/REST-Matrix gemäss [Betreiberanleitung](operator/README.md), danach Browserprüfung bei 320/375/768/1024/1440 px mit jeder Rolle, Anmeldung/Abmeldung/Kindwechsel, Formularfehlern, Diagrammtastatur, mobilem Samstagsformular und Sitzungserneuerung. Keine echten Familien für die Abnahme verwenden.
