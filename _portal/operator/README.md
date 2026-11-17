# Technische Test- und Notfallwerkzeuge

Für Josef gilt die [Schritt-für-Schritt-Anleitung](../ANLEITUNG.md). Der reguläre Weg für Kontoanlage, Passwortreset, Sperren und Freigeben ist die Adminoberfläche mit der Edge Function `portal-accounts`. Dafür benötigt Josef weder Node-Befehle noch einen Dienstschlüssel auf seinem Gerät. Admin-Identität, aktive Sitzung und AAL2 werden serverseitig geprüft; Kontoaktionen werden ohne Passwörter protokolliert.

Die hier erhaltenen Node-Werkzeuge sind ausschliesslich ein technischer Test- und Notfallweg. Sie verweigern nicht lokale URLs. Diese Beschränkung nicht für einen Cloud-Notfall entfernen. Für spätere Cloud-Recovery ist der vorab geprüfte Supabase-Dashboardweg der berechtigten Betreiberperson vorgesehen. Kein neues Projekt, echtes Konto oder Deployment wurde im aktuellen Auftrag angelegt.

## Wiederholbare lokale Tests

Die SQL-Fixture enthält erfundene Personen und simulierte Auth-Claims. Sie ersetzt weder eine echte Anmeldung noch einen signierten JWT-, PostgREST- oder Edge-Integrationstest.

```powershell
npm ci --prefix _portal --ignore-scripts
node --test _portal/tests/*.test.mjs _portal/db-tests/rls.test.mjs _portal/edge-tests/*.test.mjs
```

Für die vollständige Auth-Integration werden Docker und Supabase CLI benötigt. Aus `_portal` einen neuen isolierten lokalen Stack starten (`supabase start`). `supabase/config.toml` deaktiviert Selbstregistrierung und anonyme Anmeldung, exponiert nur `public` und aktiviert TOTP. Es läuft kein automatischer Seed. In der bisherigen Arbeitsumgebung fehlten Docker und WSL; die echte Integration ist deshalb vorbereitet, nicht bestanden.

Eine lokale Testkonfiguration **ausserhalb** des Repository anlegen. Felder: `confirmation` exakt `EMPTY_LOCAL_TEST_STACK`, `url` lokale API-Adresse, `anon_key`, `service_role_key`, `database_url` lokale Postgres-Verbindung. Nur Schlüssel des leeren lokalen Teststacks einsetzen. Niemals Werte in Chat, PR oder Logs kopieren. Unter Windows eine private NTFS-ACL setzen; Unix-Dateimodus 0600 ersetzt diese nicht. Vorhandene private Dateien werden nicht überschrieben.

```powershell
node _portal/db-tests/auth-integration.mjs C:/private/portal-local.json C:/private/auth-test-result.json
node _portal/operator/schema-check.mjs C:/private/portal-local.json
```

Die Integration verlangt eine leere isolierte Auth-/Portal-Datenbank. Sie legt synthetische Konten an, prüft Anmeldung über den Anwendungsschlüssel, TOTP und PostgREST. Sie lässt Testdaten zur Untersuchung zurück. Für Wiederholungen einen neuen leeren Teststack verwenden; keinen Bestand mit Familien zurücksetzen. Die Auth-Tabellenstruktur, insbesondere `auth.sessions`, muss mit der tatsächlichen Supabase-Version übereinstimmen.

Die Rollenmatrix umfasst zwei Familien, Geschwister, eigenes volljähriges Kind ohne Elternfreigabe, Elternmeldungen, Schüler-/Teamrechte, Vertretung, unbekannte und entzogene Zuordnung, fremde Datensätze, getrennte Notizen, serverseitige Autoren, Wiederholung/Korrektur, Passwortwechsel, Reset, alte Sitzungen und Abmeldung. Ein fehlender realer Lauf ist ausdrücklich kein bestandener Nachweis.

## Kalender ohne zweite Terminliste

`course-data.js` bleibt die einzige Kalenderquelle. Der Generator schreibt nur additive SQL, führt sie aber nicht aus:

```powershell
node _portal/operator/sync-course-days.mjs
```

Die daraus erzeugte Datei [course-days.generated.sql](../supabase/course-days.generated.sql) ist für die Dashboard-Einrichtung mitgeliefert. Ein Test vergleicht sämtliche Daten und den SHA-256 mit der Kalenderquelle. Bei Kalenderänderungen neu erzeugen; entfernte Kurstage gegen vorhandene Anwesenheit prüfen, bevor eine gesondert freigegebene Datenkorrektur erfolgt. Der Generator löscht keine Kurstage.

## Erstadmin im lokalen Notfalltest

Das erste Admin-Konto hat die tatsächlich bestätigte Auth-E-Mail **zhlerncoaching@gmail.com**. Die Portalrolle entsteht aus der verifizierten Auth-ID in `portal_private.settings`, niemals aus frei veränderbaren Nutzer-Metadaten. Keine Alias-E-Mail für Josef mehr voraussetzen. Die private lokale Konfiguration enthält `admin_email` mit der bestätigten Adresse.

```powershell
node _portal/operator/account-admin.mjs first-admin C:/private/portal-local.json VERIFIED_AUTH_UUID C:/private/first-admin.json IDENTITY_VERIFIED
```

Das Programm prüft Auth-ID, bestätigte E-Mail und einen nicht anonymen Nutzer. Es schreibt vorbereitete SQL in eine neue private Datei und führt diese **nicht** aus. `enabled=false` und `require_staff_mfa=true` bleiben gesetzt. Für die gewöhnliche Dashboard-Einrichtung enthält die [Anleitung](../ANLEITUNG.md#5-deinen-ersten-admin-zugang-anlegen) die entsprechende geprüfte Vorlage; Node ist dafür nicht erforderlich.

Portal-MFA, Dashboard-MFA und die Wiederherstellung des Betreiberpostfachs sind getrennte Wege. Vor echten Daten Erst-MFA, Admin-Mailzustellung, Wiederherstellung und Verlust eines Faktors mit synthetischem Projekt prüfen. Die Programme hier versprechen keine ungeprüfte Wiederherstellung eines Cloudkontos.

## Lokale individuelle Konten und Rücksetzen

Nur für einen isolierten lokalen Testbestand: In der privaten Konfiguration `alias_domain` und `alias_domain_confirmed=true` nach eigener Prüfung der Domainkontrolle setzen. Eltern, Kinder und Lehrpersonen erhalten getrennte Konten. Keine Nachricht an fiktive Aliaspostfächer senden.

```powershell
node _portal/operator/account-admin.mjs create C:/private/portal-local.json test.name C:/private/test-name-handover.json
```

Die private Übergabedatei enthält das zufällige Startpasswort und die Auth-ID. Dieses Notfallwerkzeug erstellt keinen fachlichen Lernzugriff. Das Profil muss anschliessend mit genau dem angegebenen Benutzernamen und der passenden Rolle zugeordnet werden. Eine Familien-ID allein gewährt keinen Zugriff. Ein Benutzername lässt sich nicht isoliert im Portal umbenennen.

Für Reset und Sperren zuerst die Identität unabhängig prüfen. Kein Adminreset über diesen Weg:

```powershell
node _portal/operator/account-admin.mjs reset C:/private/portal-local.json VERIFIED_AUTH_UUID C:/private/reset-handover.json IDENTITY_VERIFIED
node _portal/operator/account-admin.mjs disable C:/private/portal-local.json VERIFIED_AUTH_UUID C:/private/unused.json IDENTITY_VERIFIED
```

Reset deaktiviert zuerst das Profil und setzt danach ein neues zufälliges Passwort. Das Konto bleibt bis zur sicheren Übergabe und bewussten Freigabe deaktiviert. Ein Fehler stellt es nicht stillschweigend wieder her. Deaktivierung, Reaktivierung, Rollen- oder Kernteamwechsel setzen eine serverseitige Sitzungsgrenze; frühere Sitzungen bleiben auch nach Freigabe unzulässig. Danach frisch anmelden. `disable` schreibt keine Übergabedatei.

Im regulären Portalbetrieb erledigt die Edge Function dieselben Kontoaktionen im Supabase-Server, ohne einen Dienstschlüssel auf dem Betreibergerät. Die einmalige Passwortantwort wird weder in der Datenbank-Protokollierung noch im Browser-Speicher abgelegt. Bei unklarer Antwort nicht blind neue Konten erstellen; die dokumentierte Wiederholungsbehandlung und den Kontostand prüfen.

## Daten erhalten bei Fehlern

Vor einer späteren Migration Backup und Restoretest festlegen. Bei einem Vorfall zuerst serverseitig `portal_private.settings.enabled=false` setzen und den Portal-Link ausgeschaltet lassen. Vorherige Clientfassung wiederherstellen, neue Datensätze erhalten und eine vorwärtsgerichtete Korrekturmigration vorbereiten. Kein pauschales `DROP`, kein Zurücksetzen einer Familiendatenbank und keine Löschung von Lernhistorien als Rollback.

Wiederfreigabe erst nach erneuter realer Auth-/Rechteprüfung und gesonderter Zustimmung. Smartphone-/Safari-/Cloud-Browserprüfungen, echte Edge-Ausführung, Admin-Recovery und Mailzustellung bleiben bis zu ihrer tatsächlichen Durchführung offen.
