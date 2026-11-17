# Portal v1 – Entwurf, nicht freigeschaltet

Eigenständige Erweiterung der statischen Website: Eltern sehen ausdrücklich zugeordnete Kinder, Schülerkonten nur sich selbst, das berechtigte Kernteam aktive Kurskinder und Josef die Administration. Die Website-/PDF-Arbeit, PR #5 und PR #7 sind davon unabhängig und unverändert. Keine Cloudinstanz, echten Konten oder Familiendaten wurden angelegt. `site-config.js` enthält `portalEnabled: false`; `portal-config.js` bleibt deaktiviert und leer.

Die [Anleitung für Josef](ANLEITUNG.md) beschreibt den späteren Dashboard-Ablauf ohne Kommandozeile: Kontoanlage und Rücksetzen im Portal, einmaliges Startpasswort, Sperren/Freigeben, erste Zwei-Faktor-Anmeldung und Wiederherstellung über `zhlerncoaching@gmail.com`. Der Dienstschlüssel bleibt ausschliesslich in der vorbereiteten Supabase Edge Function. Die vorhandenen Node-Werkzeuge sind nur ein lokaler technischer Notfall-/Testweg. Nichts davon wurde in Supabase bereitgestellt.

## Jetzt lokal starten

Die übergebene **private Vorschau** ausserhalb des Repository enthält erfundene Familien und eine flüchtige PostgreSQL-Testdatenbank (PGlite). `Start-Vorschau.cmd` starten und den angezeigten lokalen Link selbst öffnen. Node.js 24 oder neuer ist nötig. Es wird kein Browser automatisch geöffnet und keine Onlineverbindung hergestellt. Der Server lauscht ausschliesslich auf `127.0.0.1`. Stoppen mit Strg+C; beim Neustart werden alle Teständerungen verworfen.

Im hellen Vorschaukopf das Testkonto wählen. Eltern Birke sehen Nora und Milo; Eltern Linde nur Lina. Nora und Milo haben getrennte Schüleransichten. Alex ist volljährig und besitzt keine Elternfreigabe. Kernteam, Vertretung, Admin, unzugeordnetes Konto und entzogene Freigabe lassen sich getrennt ausprobieren. Passwortänderung ist in dieser SQL-Vorschau nicht ausführbar: Sie simuliert Identitäten und prüft **keine echte Supabase-Anmeldung**. Kontoverwaltungsaktionen führen denselben Edge-Handler und dessen SQL-Regeln mit simuliertem Auth-Dienst aus, erzeugen aber keine echten Konten oder Loginpasswörter. Keine echten Daten eingeben.

Gezielte Abnahme: **Eltern Familie Birke → Nora → Verlauf** zeigt am vorletzten Kurstag «Gefehlt» mit unterbrochener Linie, Tabellenzeile und Tastatur-/Zeigerdetails. **Kim · Kernteam → Milo** zeigt «Da, Feedback offen». Unter «Samstag erfassen» den letzten Kurstag wählen und nur Anwesenheit speichern: Status und Feedbackzähler bleiben offen. «Bearbeitet» und «Nächster Schritt» ergänzen und speichern: «Feedback erfasst» und Zähler plus eins. Eine interne Notiz allein genügt nicht; eine Elternnotiz zählt als Familienfeedback.

Die Produktionsdatei `portal.html` hat keinen Testschalter, keine Beispielkonten und keine eingebauten Lerndaten. Ohne Konfiguration zeigt sie nur «Portal zurzeit nicht verfügbar». Die separaten Vorschauwerkzeuge sind Entwicklungsdateien; der gelieferte private HTML-Aufbau und die ursprüngliche Gestaltungsvorlage werden nicht ins Repository übernommen.

Für Entwicklung und Wiederholung der Tests:

```powershell
npm ci --prefix _portal --ignore-scripts
node --test _portal/tests/*.test.mjs _portal/db-tests/rls.test.mjs _portal/edge-tests/*.test.mjs
node _portal/preview/build-private-preview.mjs <privater-Ausgabeordner-ausserhalb-des-Repository>
```

Die Testpakete sind fest versioniert. Keine Build-Pipeline ist für die Website erforderlich. Der Browser erhält nur den lokal abgelegten Supabase-Client sowie lokale Schriften; Herkunft und Hash stehen in [VENDOR.md](../assets/portal/VENDOR.md). Der optionale Umgebungswert `PORTAL_DEPENDENCY_ROOT` darf auf einen bereits vorhandenen privaten Entwicklungsordner mit `package.json`/`node_modules` zeigen.

Die **vollständigen Supabase-Auth-/PostgREST-Tests** sind separat unter [db-tests](db-tests) vorbereitet. Sie benötigen einen leeren, isolierten lokalen Supabase-Stack mit Docker. In der gelieferten Arbeitsumgebung fehlen Docker und WSL; diese Tests wurden nicht ausgeführt. Ein PGlite-Test, ein ausgeblendetes Menü oder `noindex` ersetzt diesen Nachweis nicht. Die lokale Testkonfiguration steht unter [supabase](supabase), das Vorgehen unter [operator/README.md](operator/README.md). Keine Verbindung zu einem produktiven Projekt herstellen.

### Prüfstand

Die genaue Rollenmatrix und die Grenzen stehen in [TESTNACHWEIS.md](TESTNACHWEIS.md). Automatische Prüfungen umfassen echte PostgreSQL-RLS/Grants und RPCs mit **simulierten** Auth-Claims, Rechenregeln, DOM-Ereignisse ohne Browser, private HTTP-Routen und das Verwerfen veralteter Antworten. Der unabhängige Review hat zusätzlich SQL-Zugriffe und die Anwendungssteuerung geprüft. Gefundene Fehler bei veralteten Antworten, Hintergrundaktualisierung, historischen Samstagskorrekturen und Vorschau-CSP wurden behoben.

Keine isolierte kostenlose Browserprüfung wurde ausgeführt. Smartphone-/Desktop-Layout, Safari, native Formularvalidierung, Fokusdarstellung und tatsächliche Bildschirmleserbedienung bleiben offen. Der persönliche Browser wurde weder gelesen noch gestartet oder gesteuert. Keine kostenpflichtigen Tests.

## Später, nach Freigabe

Vor echten Daten sind zuerst die echte Auth-/REST-Rechtematrix, Registrierungssperre, MFA, eigener Passwortwechsel, manuelle Wiederherstellung, alte Sitzungen und die Browserabnahme auszuführen. Die Portal-Freischaltung bleibt bis zur gesonderten Freigabe aus.

1. Mit Josef Zweck, verantwortlichen Ansprechpartner, tatsächlich erhobene Angaben, Rollen, Austritts-/Widerrufsprozess und Aufbewahrung/Löschung festlegen. Art. 8 und Portal-Datenschutzinformation an den tatsächlichen Betrieb anpassen. Hier wird keine Speicherfrist und keine ausschliesslich schweizerische Verarbeitung zugesagt. Vertrag, Kündigungs- und Geschwisterregeln bleiben unverändert.
2. Falls freigegeben, ein separates Supabase-Projekt in der **spezifischen Region Central Europe (Zurich), `eu-central-2`** auswählen und die tatsächlich angelegte Region sowie Dienstleister-/Verarbeitungsangaben kontrollieren. Keine solche Einrichtung ist jetzt erfolgt. Kosten oder Tarifwechsel gesondert abstimmen.
3. Geprüfte Migration in einer leeren Datenbank anwenden, niemals die synthetische Fixture. RLS, restriktive Grants und ausschliesslich das Schema `public` in der API prüfen. Private Hilfsfunktionen bleiben in `portal_private`. `settings.enabled` bleibt zunächst `false`. Die Migration ist transaktional; nach erfolgreicher Übernahme Änderungen ausschliesslich als neue Migration. Kein Zurücksetzen eines Bestands mit Familiendaten.
4. Kurstage ausschliesslich aus der vorhandenen `course-data.js` über `operator/sync-course-days.mjs` erzeugen. Das Werkzeug gibt prüfbare additive SQL aus und führt sie nicht aus. Keine zweite handgepflegte Terminliste; Auswertungen verwenden Europe/Zurich. Eine spätere Kalenderkorrektur mit bereits vorhandenen Anwesenheiten muss einzeln geprüft werden.
5. Öffentliche Selbstregistrierung, anonyme Anmeldung und öffentliche Einladungsabläufe deaktivieren. Erreichbaren Betreiber-Recoveryweg und MFA für Josef und Kernteam testen. Keine Accountrollen aus `user_metadata` übernehmen. Den ersten Admin ausserhalb des Webclients anhand von Josefs verifizierter Auth-ID zuordnen; kein anderer Admin kann über das Portal angelegt werden.
6. Kontrollierte Aliasdomain mit Josef bestimmen. Benutzernamen werden vereinheitlicht und eindeutig auf interne Aliasse abgebildet. Kinder brauchen keine private E-Mail-Adresse. Eltern, Kind und Mitarbeitende erhalten getrennte Konten und individuelle Startpasswörter. Sicher einzeln übergeben; niemals in Repository, Chat oder Logs. Kein Passwortreset an ein nicht erreichbares Aliaspostfach versprechen. Eine Alias-/Benutzernamenänderung erfordert einen abgestimmten Betreiberprozess, nicht nur eine Profiländerung.
7. Das Erstpasswort kann im angemeldeten Portal geändert werden; danach werden Sitzungen abgemeldet. Falls der Auth-Dienst eine erneute Bestätigung verlangt, zuerst frisch anmelden. Bei vergessenem Passwort Identität persönlich prüfen und im Adminportal zurücksetzen. Die vorbereitete Edge Function sperrt das Konto zuerst, erzeugt ein zufälliges Passwort und zeigt es einmal an. Nach persönlicher Übergabe ausdrücklich freigeben und neu anmelden. Die serverseitige Sitzungsgrenze sperrt vorherige Sitzungen auch nach Reaktivierung. Erstadmin und Team richten MFA vor dem ersten Datenzugriff ein. Admin-Recovery verwendet ausschliesslich das bestätigte Betreiberpostfach und weiterhin einen vorhandenen MFA-Faktor. Echte Zustellung, Recovery und Edge-Betrieb bleiben offen.
8. Aktive Konten ausdrücklich kindbezogen zuordnen. Familien-ID allein gewährt nichts. Bei Volljährigkeit den administrativen Prüfpunkt bearbeiten und bestehende Elternfreigaben ausdrücklich bestätigen oder widerrufen. Bei Austritt Zugriff deaktivieren; Lehrpersonen verlieren Zugriff auf ausgetretene Lernende. Konten-/Rollenänderung invalidiert alte Sitzungen. Die Ansicht verwirft Daten bei Abmeldung/Kindwechsel und bei erkannter Berechtigungsänderung; Hintergrundabgleich alle 30 Sekunden und bei Rückkehr ins Fenster, Datenbankprüfung bei **jedem** Zugriff.
9. Erst nach bestandenen Prüfungen und Freigabe öffentliche Projekt-URL, veröffentlichbaren Schlüssel und Aliasdomain in `portal-config.js` einsetzen und aktivieren; `portalEnabled: true` schaltet den Link in derselben Desktop-/Mobilnavigation frei. Niemals `service_role`, `sb_secret`, Datenbankpasswort oder Nutzertoken ins Frontend schreiben.

### Fachliche Grenzen

Coachingstufen 1–5 sind keine Schweizer Schulnoten. V1 speichert angekündigte Prüfungstermine, keine Zeugnisse, Schulnotendurchschnitte oder Uploads. Kompetenzen bleiben optional. Schulnotenverlauf und individuelle Quartalsprüfungen sind mögliche spätere Ausbaustufen, keine gelieferte Funktion und keine neue Mitteilungspflicht.

Historische Fächer/Kompetenzen besitzen abgeschlossene Zeiträume. Neue Aktivierung erfolgt als neuer Zeitraum; vergangene Werte werden dadurch nicht umgerechnet. Fehlende Beobachtung ist weder Stufe null noch Absenz. Anwesenheit kommt ausschliesslich aus ihrer eigenen Tabelle. Bestätigte Absenz bleibt als Tag mit `value: null`/`status: absent`, Lücke und «Gefehlt»-Markierung erhalten; sie hat keinen gemessenen Stufenwert. Gespeicherte Rückmeldungen lassen sich pro Kind/Kurstag korrigieren; atomare RPCs vermeiden widersprüchliche Duplikate. Ein Schülereintritt mit vorhandenen Anwesenheiten kann nicht rückwirkend verschoben werden.

Nur Anwesenheit erzeugt keine leere Feedbackzeile. Teilbeobachtungen bleiben bearbeitbar. Familienfeedback ist erst vollständig, wenn «Bearbeitet» und «Nächster Schritt» oder eine Elternnotiz vorhanden sind. Interne Notizen werden unabhängig gespeichert und zählen nie als Familienfeedback. Teamstatus und Zähler nutzen dieselbe Regel. Die vier Zustände sind «Anwesenheit offen», «Gefehlt», «Da, Feedback offen» und «Feedback erfasst».

Technische Referenzen: [Supabase Local Development](https://supabase.com/docs/guides/local-development), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth Sessions](https://supabase.com/docs/guides/auth/sessions), [serverseitige Auth-Verwaltung](https://supabase.com/docs/reference/javascript/admin-api). Die tatsächliche Auth-/Sessionkompatibilität bleibt bis zum vollständigen lokalen Integrationstest ungeprüft.
