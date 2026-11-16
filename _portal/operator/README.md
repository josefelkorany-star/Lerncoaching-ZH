# Portalbetrieb: vorbereitete lokale Werkzeuge

## Jetzt lokal starten

Es wurde kein Cloudprojekt, echtes Konto oder Produktivdeployment angelegt. Alle Verwaltungsprogramme hier verweigern nicht lokale URLs. Sie gehören ausschliesslich in Node auf dem Betreibergerät; niemals per Script-Tag in das Portal. `service_role`, Datenbankzugang und Passwörter bleiben ausserhalb des Repository. Die SQL-Fixture verwendet erfundene Personen und simulierte Auth-Claims; sie ersetzt keinen Login-/Auth-Test.

Für die ergänzenden PostgreSQL-Tests nach `npm ci --prefix _portal --ignore-scripts`:

```powershell
node --test _portal/db-tests/rls.test.mjs
```

Mit vorhandenem Docker und Supabase CLI den isolierten Stack aus `_portal` starten (`supabase start`). `supabase/config.toml` sperrt öffentliche Registrierung und anonyme Anmeldung, exponiert nur `public` und aktiviert TOTP. Migrationen nicht auf ein bestehendes fremdes Projekt anwenden. Kein Seed läuft automatisch. Die aktuelle Umgebung hatte keinen Docker-/Supabase-/PostgreSQL-Server; die folgende echte Integration ist deshalb vorbereitet, nicht bestanden.

Lokale Testkonfiguration **ausserhalb** des Repository erstellen. Felder: `confirmation` exakt `EMPTY_LOCAL_TEST_STACK`, `url` lokale API-Adresse, `anon_key`, `service_role_key`, `database_url` lokale Postgres-Verbindung. Schlüssel ausschliesslich aus dem eigenen lokalen Teststack übernehmen; keine Werte in Chat, PR oder Logs. Datei unter Windows mit NTFS-Zugriff nur für den Betreiber sichern; der Unix-Modus 0600 allein ersetzt keine Windows-ACL. Keine bestehende private Datei wird überschrieben.

```powershell
node _portal/db-tests/auth-integration.mjs C:/private/portal-local.json C:/private/auth-test-result.json
node _portal/operator/schema-check.mjs C:/private/portal-local.json
```

Die Integration verlangt eine leere isolierte Auth-/Portal-Datenbank. Sie legt ausschliesslich synthetische Konten an, meldet sie wirklich über den Anwendungsschlüssel an, richtet testweise TOTP ein und prüft PostgREST. Sie verändert keine echten Zielsysteme und lässt die synthetischen Daten zur Prüfung zurück. Für einen Wiederholungslauf einen neuen isolierten lokalen Stack verwenden oder dessen ausdrücklich als Testbestand identifizierte Datenbank nach eigener Prüfung zurücksetzen. **Kein allgemeines Löschskript** liegt bei.

Geprüft werden Registrierungssperre, echte AAL1-/AAL2-Sitzung, zwei Familien, Geschwister, eigener Erwachsenenzugang ohne Elternfreigabe, Elternmeldungen, Kinder-/Teamrechte, Vertretung, unbekannte/entzogene Zuordnung, fremde Datensätze, getrennte Notizen, serverseitige Autoren, Wiederholung/Korrektur, eigenes Passwort, manueller Reset, alte Sitzung und Abmeldung. Bis dieser Lauf mit dem tatsächlichen Stack bestanden ist, keine echten Familiendaten freischalten. Schema-/Session-Checks sind bewusst eng: Ändert sich die Supabase-Auth-Tabelle `auth.sessions`, Migration und Prüfung zuerst anpassen und neu abnehmen.

`node _portal/operator/sync-course-days.mjs` erzeugt additive SQL aus `course-data.js` mit Dateihash. Das Programm führt keine SQL aus. Es löscht keine Kurstage; nach Kalenderänderungen entfallene Tage vor einem Betreiberentscheid gegen bestehende Anwesenheit prüfen. Keine zweite manuelle Terminliste pflegen.

## Später, nach Freigabe

Vor echten Daten stehen separates Projekt/Region, Kostenentscheidung, Datenschutzinformation, berechtigte Mitarbeitende, Aufbewahrung/Austritt/Löschung, Betreiber-Recovery und echte Auth-/Rechteabnahme aus. Die lokalen Programme sind keine verdeckte Produktionsfreigabe. Für einen späteren Betrieb die Zielkonfiguration separat prüfen; keine localhost-Sperre bloss entfernen und dann ungeprüft ausführen.

### Erstadmin und individuelle Konten

Josef wird anhand seiner bestätigten Auth-ID ausserhalb des Webclients bestimmt. Ein erreichbares Betreiberpostfach unter der kontrollierten Aliasdomain verwenden, dessen lokaler Teil zum vereinbarten Login passt. Im lokalen Konfigurationsfile `admin_email` auf dieses tatsächlich geprüfte Postfach setzen. `first-admin` prüft Auth-ID, bestätigte E-Mail und `is_anonymous=false`, schreibt vorbereitete SQL in eine private Datei und führt sie **nicht** aus. Das Portal bleibt in dieser SQL mit `enabled=false` gesperrt; `require_staff_mfa=true` ist Standard.

```powershell
node _portal/operator/account-admin.mjs first-admin C:/private/portal-local.json VERIFIED_AUTH_UUID C:/private/first-admin.json IDENTITY_VERIFIED
```

Vor Aktivierung müssen MFA eingerichtet und der Wiederherstellungsweg unabhängig vom Portal erprobt sein. Das Portal selbst bietet keine freie Erstadmin-, Recovery- oder Auth-Admin-Funktion. Ein TOTP-Verlust bei Josef benötigt den vorab geprüften Betreiber-Recoveryweg; dieses Werkzeug verspricht dafür keine ungeprüfte Dashboard-Funktion.

Für Familien-/Schülerkonten `alias_domain` und `alias_domain_confirmed=true` erst nach Prüfung der Domainkontrolle in die private Konfiguration aufnehmen. Jedes Kind, jeder Elternzugang und jede Lehrperson erhält ein eigenes Konto und ein eigenes zufälliges Startpasswort. Kein Versand an fiktive Aliaspostfächer. Zugangsdaten über den vereinbarten sicheren persönlichen Weg übergeben; die private Übergabedatei danach entsprechend dem vereinbarten Löschprozess behandeln.

```powershell
node _portal/operator/account-admin.mjs create C:/private/portal-local.json test.name C:/private/test-name-handover.json
```

Das neue Auth-Konto hat noch keinen Lernzugriff. Im Adminbereich nur die überprüfte Auth-ID mit **dem exakt im Übergabedokument genannten Benutzernamen** verbinden, Rolle setzen und eine kindbezogene Freigabe erteilen. Benutzername: 3–32 Zeichen a–z, 0–9, Punkt, Minus, Unterstrich; keine doppelten Punkte. Er ist im Portal unveränderbar. Eine spätere Umbenennung muss der Betreiber koordiniert in Auth-Alias und Profil vorbereiten, alte Sitzungen entziehen und den neuen Login prüfen. Die Browserverwaltung ändert nie die Auth-E-Mail. Lehrperson nur bei ausdrücklicher Kernteamfreigabe aktivieren; Vertretung erhält diese nicht automatisch.

Eigenes Passwort: nach frischer Anmeldung setzen (mindestens 12 Zeichen). `secure_password_change=true` kann bei älterer Sitzung erneute Anmeldung verlangen. Dann abmelden, mit aktuellem Passwort neu anmelden und den Wechsel wiederholen; keine Reset-/Bestätigungsmail an ein fiktives Postfach voraussetzen. Die Clientfassung beendet nach erfolgreichem Wechsel alle eigenen Sitzungen. Bei fehlgeschlagener globaler Abmeldung den Betreiber hinzuziehen; nicht einfach behaupten, alle Sitzungen seien gelöscht.

### Manueller Reset und Entzug

Identität persönlich anhand des vereinbarten Verfahrens prüfen. Danach für ein Nicht-Admin-Konto:

```powershell
node _portal/operator/account-admin.mjs reset C:/private/portal-local.json VERIFIED_AUTH_UUID C:/private/reset-handover.json IDENTITY_VERIFIED
```

Zuerst wird das Profil deaktiviert. Ein Datenbanktrigger setzt `sessions_valid_after` auf Serverzeit, ebenso bei der späteren Reaktivierung. Alte Auth-Sitzungen erfüllen diese Schwelle auch nach späterer Reaktivierung nicht mehr, einschliesslich einer Tokenauffrischung derselben Sitzung oder einer Anmeldung während der Sperre. Danach setzt die Auth-Admin-API ein neues individuelles Passwort. Das Konto bleibt deaktiviert, bis Josef es nach sicherer Übergabe bewusst reaktiviert; erst anschliessend frisch anmelden. Schlägt ein späterer Schritt fehl, bleibt der Zugriff gesperrt und wird nicht stillschweigend wiederhergestellt. Kein Reset einer anderen Person und kein Reset des Erstadmins über diesen Befehl.

`disable` verwendet dieselben Argumente (Übergabedatei unbenutzt) und sperrt nur. Ein Kinderaustritt/entzogene Kinderfreigabe beendet den fachlichen Zugriff sofort, ohne historische Daten zu löschen. Ein Rollen-/Kernteamwechsel invalidiert ebenfalls alte Sitzungen und erfordert neue Anmeldung. Volljährige haben keine automatische Elternfreigabe; der administrative Prüftermin ist keine automatische Zustimmung.

### Rücksetzweg ohne Datenverlust

Vor späterer Migration verschlüsselten, kontrolliert zugänglichen Backup- und Restoretest festlegen. Bei Fehlern zuerst serverseitig `portal_private.settings.enabled=false` setzen und den Portal-Link deaktiviert lassen; damit liefern selbst alte Sessions keine Portalbestände mehr. Vorherige Clientfassung wiederherstellen, neue Datensätze erhalten, Fehler gezielt mit vorwärtsgerichteter Korrekturmigration reparieren. Kein pauschales `DROP`, kein Zurücksetzen der Produktivdatenbank und keine Löschung von Familien-/Lernhistorie als Rollback. Erst nach erneut bestandenen realen Rechte-/Authprüfungen wieder aktivieren.
