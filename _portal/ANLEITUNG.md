# Portal-Anleitung für Josef

**Entwurf – nicht freigeschaltet. Stand: 17. November 2026.** Diese Anleitung bereitet die spätere Einrichtung und Abnahme vor. Im aktuellen Auftrag wurden weder ein Supabase-Projekt noch echte Konten angelegt. Der Portal-Link der Website bleibt ausgeschaltet. Die private Vorschau arbeitet ausschliesslich mit erfundenen Personen.

Im Alltag verwaltest du Konten im Portal. Du brauchst dafür keine Befehle und keinen geheimen Supabase-Schlüssel auf deinem Gerät. Die einmalige Einrichtung erfolgt im Supabase-Dashboard. Die folgenden Einrichtungsschritte erst nach gesonderter Freigabe im ausdrücklich ausgewählten Testprojekt durchführen; eine Freigabe für echte Familien ist damit nicht verbunden.

Wenn Codex Browserarbeit übernimmt, verwendet es ausschliesslich einen nachweislich isolierten Cloud-Browser. Dein persönlicher Browser bleibt unangetastet. Es findet kein kostenpflichtiger Browsertest statt. Eine Anmeldung übernimmst du selbst direkt beim Anbieter, sobald eine geeignete Cloud-Sitzung dafür bereitsteht.

## 1. Die private Vorschau ausprobieren

1. Das private Vorschau-ZIP in einen eigenen Ordner entpacken.
2. `Start-Vorschau.cmd` starten. Das Fenster nennt die lokale Adresse. Es öffnet keinen Browser automatisch. Die Vorschau ist nur auf diesem Computer erreichbar; sie ist keine veröffentlichte Internetseite.
3. Den Link zur privaten Vorschau selbst öffnen. Die Anleitung im Paket nennt die vorhandene Node-Laufzeit; ein Supabase-Schlüssel wird nicht benötigt.
4. Im hellen Vorschaukopf ein Testkonto wählen. **Eltern Birke** sehen Nora und Milo, **Eltern Linde** sehen Lina. Die Schülerkonten haben jeweils ihre eigene Ansicht. **Kernteam**, **Vertretung** und **Admin** zeigen getrennte Rechte.
5. Bei **Eltern Birke → Nora** den Lernverlauf öffnen: Ein gefehlter Samstag erscheint als Lücke, mit «Gefehlt» im Diagramm und in der Tabelle. Mit der Tab-Taste das Diagramm erreichen und mit den Pfeiltasten die Tage durchgehen.
6. Im **Kernteam** die Übersicht ansehen: «Anwesenheit offen», «Gefehlt», «Da, Feedback offen» und «Feedback erfasst» sind verschiedene Zustände. Nur Anwesenheit zu speichern darf den Familienfeedback-Zähler nicht erhöhen. Erst «Bearbeitet» **und** «Nächster Schritt» oder eine Elternnotiz zählen als Familienfeedback. Eine interne Notiz allein genügt nicht.

**Demodaten laden und entfernen:** Beim Start werden die erfundenen Familien automatisch in eine flüchtige Testdatenbank geladen. Das Vorschaufenster mit Strg+C beenden entfernt diese Testdatenbank samt Änderungen. Ein Neustart lädt wieder den Ausgangsstand. Es gibt keinen Import in eine echte Tabelle und keinen pauschalen Löschbefehl für Familienbestände.

Der Kontowechsel der Vorschau simuliert angemeldete Personen. Er prüft weder echte Passwörter noch E-Mail-Zustellung, MFA oder die Supabase Edge Function im Cloudbetrieb. Eine angezeigte Test-Kontoverwaltung ist ausdrücklich keine echte Kontoeröffnung.

## 2. Ein leeres Testprojekt vorbereiten

Diese Schritte sind für eine spätere, gesondert freigegebene Einrichtung gedacht. Die private Vorschau aus Abschnitt 1 benötigt sie nicht.

1. Im **Supabase Dashboard** deine Organisation wählen und **New project** öffnen. Ein eindeutig bezeichnetes Testprojekt verwenden. Keine bestehende Website-, Formular- oder Familiendatenbank auswählen.
2. Ein eigenes Datenbankpasswort sicher in deinem Passwortmanager ablegen. Es gehört nicht in Chat, GitHub oder die Website.
3. Als spezifische Region **Central Europe (Zurich)** mit Kennung `eu-central-2` wählen. Nicht nur die allgemeine Gruppe «Europe». Falls Zürich nicht angeboten wird, die Einrichtung an dieser Stelle stoppen. Tarif und etwaige Kosten vorher klären. Die Region allein bedeutet nicht, dass sämtliche Anbieterleistungen ausschliesslich in der Schweiz verarbeitet werden. [Supabase-Regionen](https://supabase.com/docs/guides/platform/regions)
4. Unter **Authentication → Sign In / Providers** die öffentliche Registrierung ausschalten: **Allow new users to sign up** aus. Auch **Allow anonymous sign-ins** aus. E-Mail/Passwort als Anmeldeweg beibehalten; keine öffentlichen Einladungs- oder zusätzlichen Anmeldewege aktivieren. [Anmeldeeinstellungen](https://supabase.com/docs/guides/auth/general-configuration)
5. Unter **Authentication → Multi-Factor** TOTP/App-Authentifizierung für Einrichtung und Prüfung zulassen. Für Team und Admin bleibt die Pflicht im Portal aktiv; keine MFA-Regel abschalten, um eine Fehlermeldung zu umgehen.
6. Unter **Authentication → URL Configuration** die exakte später freigegebene private Testadresse von `portal.html` als erlaubte Rückleitungsadresse eintragen. Keine Platzhalter oder offenen Wildcards. Die öffentliche Website wird dadurch nicht freigeschaltet.
7. Die E-Mail-Zustellung für dein Betreiberpostfach im Testprojekt prüfen. Ohne eigenen Maildienst erlaubt Supabase Testmails nur an Adressen des Organisationsteams; prüfe deshalb besonders die gewählte Adresse `zhlerncoaching@gmail.com`. Der Standardversand ist eingeschränkt und nicht für den produktiven Betrieb vorgesehen. Eigener Mailversand und mögliche Kosten sind vor Nutzung gesondert zu klären. Familien-Aliasse sind keine Zustellpostfächer. [E-Mail-Versand](https://supabase.com/docs/guides/auth/auth-smtp)

## 3. Datenbank über den SQL Editor einrichten

1. Oben im Dashboard nochmals den Namen des **leeren Testprojekts** prüfen.
2. **SQL Editor → New query** öffnen.
3. Die folgenden Dateien jeweils vollständig kopieren und einzeln über **Run** ausführen, in dieser Reihenfolge:
   - [Grundschema](supabase/migrations/202611160001_portal_v1.sql)
   - [Korrektur für Anwesenheit und Feedback](supabase/migrations/202611170001_feedback_completion.sql)
   - [Kontoverwaltung und Protokollierung](supabase/migrations/202611170002_account_admin.sql)
4. Nach jedem Schritt auf eine erfolgreiche Rückmeldung achten. Bei Fehlern nicht einfach mit der nächsten Datei fortfahren. Fehlermeldung und Dateiname ohne Schlüssel weitergeben.
5. Die aus dem Website-Kalender erzeugte [Kurstage-Datei](supabase/course-days.generated.sql) auf dieselbe Weise ausführen. Sie enthält die Termine aus `course-data.js`, keine zweite von Hand gepflegte Liste. Spätere Kalenderänderungen benötigen eine frisch erzeugte Datei und einen Abgleich mit vorhandenen Anwesenheiten.
6. In den API-Einstellungen nur `public` als zugängliches Anwendungsschema verwenden. `portal_private` bleibt privat. Zeilenschutz (**RLS**) und die in den Dateien eingerichteten Rechte nicht abschalten.

Bereits angewendete Migrationen nicht erneut ausführen. Bei einem bestehenden Portal zuerst seinen Versionsstand prüfen; dann nur die fehlenden Korrekturen anwenden. Kein Datenbank-Reset und keine Löschung bestehender Lernverläufe.

## 4. Kontoverwaltung im Dashboard bereitstellen

1. **Edge Functions → Secrets** öffnen. Nur diese projektspezifischen Werte ergänzen:

   | Name | Wert |
   | --- | --- |
   | `PORTAL_ALLOWED_ORIGIN` | Exakte private Testherkunft: `https://` und Hostname, ohne Pfad oder abschliessenden Schrägstrich. |
   | `PORTAL_ALIAS_DOMAIN` | Vorher geprüfte Domain für interne Benutzernamen-Aliasse. Keine fremde Domain verwenden. |
   | `PORTAL_ADMIN_EMAIL` | `zhlerncoaching@gmail.com` |

   Die vom Anbieter bereitgestellten Werte `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` bleiben in Supabase. Den geheimen Dienstschlüssel nicht herunterladen oder in die Website kopieren. [Edge-Umgebungswerte](https://supabase.com/docs/guides/functions/secrets)
2. Unter **Edge Functions** auf **Deploy a new function → Via Editor** gehen.
3. Die Funktion **portal-accounts** nennen. Den vollständigen Inhalt von [index.ts](supabase/functions/portal-accounts/index.ts) in den Editor übernehmen. Keine zusätzliche Bibliotheksdatei oder Kommandozeile ist nötig.
4. JWT-Prüfung (**Verify JWT**) eingeschaltet lassen. Die Funktion prüft zusätzlich die aktive, festgelegte Administratorperson, die aktuelle Sitzung und Zwei-Faktor-Anmeldung. Ein normaler angemeldeter Zugang reicht nicht aus. Die aktuelle Referenz nennt sowohl ältere HS256- als auch neue asymmetrische Sitzungstoken als unterstützt; die tatsächliche Kombination wird in der noch offenen Cloud-Abnahme geprüft. [Autorisierung von Edge-Aufrufen](https://supabase.com/docs/guides/functions/auth-headers)
5. Erst im freigegebenen Testprojekt **Deploy function** wählen. Namen und erfolgreichen Bereitstellungsstatus prüfen. Dieser Schritt ist im vorliegenden Auftrag **nicht ausgeführt**. [Dashboard-Anleitung](https://supabase.com/docs/guides/functions/quickstart-dashboard)
6. Die regulären Aktionen anschliessend aus der privaten Testfassung des Portals ausführen. Der Dashboard-Testknopf mit einem allgemeinen Anwendungsschlüssel ist kein Admin-Nachweis und soll keine Kontoeröffnung bewirken.

Wenn die Funktion einen Herkunfts-, Berechtigungs- oder Konfigurationsfehler meldet, die konkrete Einstellung prüfen lassen. Nicht auf eine offene Herkunft `*` umstellen, die JWT-Prüfung deaktivieren oder den Dienstschlüssel im Browser einsetzen. Die Funktion protokolliert Kontoaktionen ohne Passwörter.

## 5. Deinen ersten Admin-Zugang anlegen

Dein Supabase-Dashboardkonto und dein Portal-Konto sind zwei getrennte Zugänge. Beide benötigen ihre eigene Absicherung.

1. Im Testprojekt **Authentication → Users → Add user → Create new user** öffnen.
2. Bei **Email address** exakt `zhlerncoaching@gmail.com` eintragen. Ein eigenes langes Passwort setzen und sicher ablegen. **Auto confirm user?** nur für dein eigenes, tatsächlich kontrolliertes Postfach bestätigen; dieses Formular versendet keine Bestätigungsmail. Mit **Create user** anlegen. [Offizielle Dashboard-Oberfläche](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Auth/Users/CreateUserModal.tsx)
3. Den neuen Benutzereintrag öffnen. E-Mail, bestätigten Status und seine **User UID** prüfen. Die UID ist die eindeutige Kontokennung, kein Passwort.
4. Im **SQL Editor** die folgende Vorlage verwenden. `AUTH-ID-HIER` durch genau diese UID ersetzen. Der Block verweigert eine bereits vorhandene Erstadmin-Zuordnung oder eine abweichende E-Mail.

```sql
begin;
do $$
declare
  v_id uuid := 'AUTH-ID-HIER'::uuid;
begin
  if exists(select 1 from portal_private.settings)
     or exists(select 1 from public.profiles where role='admin') then
    raise exception 'Admin bereits eingerichtet. Nicht erneut anlegen.';
  end if;
  if not exists(
    select 1 from auth.users
    where id=v_id and lower(email)='zhlerncoaching@gmail.com'
      and email_confirmed_at is not null
      and coalesce(is_anonymous,false)=false
  ) then
    raise exception 'Auth-ID und bestätigte Betreiber-Mail prüfen.';
  end if;
  insert into public.profiles(id,username,display_name,role,active,core_team)
    values(v_id,'josef','Josef','admin',true,true);
  insert into portal_private.settings(admin_auth_id,require_staff_mfa,enabled)
    values(v_id,true,false);
end $$;
commit;
```

5. Die Betreuung trägt Projektadresse, öffentlichen Anwendungsschlüssel und Aliasdomain in die **private Testfassung** ein. Nur der veröffentlichbare Schlüssel gehört in diese Konfiguration, niemals ein Dienstschlüssel. Der öffentliche Portal-Link bleibt aus.
6. Erst für die genehmigte Prüfung im Testprojekt den Datenzugang einschalten: `update portal_private.settings set enabled=true where singleton;`. Das ist keine Freigabe für das produktive Projekt oder echte Familiendaten.
7. Im privaten Testportal mit deiner echten Admin-E-Mail und dem Passwort anmelden. Bei der ersten Anmeldung die angebotene Zwei-Faktor-Einrichtung abschliessen: QR-Code in deiner Authentifizierungs-App scannen oder den Einrichtungsschlüssel dort eingeben; danach den aktuellen sechsstelligen Code bestätigen. Keine QR-Codes, Einrichtungsschlüssel oder Codes in Chat oder GitHub senden. Vor erfolgreicher Bestätigung werden keine Lerninformationen freigegeben. [TOTP-Einrichtung](https://supabase.com/docs/guides/auth/auth-mfa/totp)
8. Abmelden und nochmals mit Passwort und neuem Sicherheitscode anmelden. Kontoverwaltung muss nur mit dieser Zwei-Faktor-Anmeldung erreichbar sein.
9. Auf der Anmeldeseite die Wiederherstellung des Admin-Passworts anfordern. Die Nachricht muss bei `zhlerncoaching@gmail.com` ankommen. Link selbst öffnen, neues Passwort und den erforderlichen Sicherheitscode eingeben. Danach frisch anmelden. Prüfen, dass das alte Passwort nicht mehr funktioniert und alte Sitzungen keinen Datenzugriff mehr erhalten. Diese Probe ist noch offen; sie muss vor echtem Einsatz gelingen.

## 6. Familien, Kinder und Zugänge im Alltag

1. Mit deinem Admin-Konto und Sicherheitscode anmelden.
2. **Familie anlegen oder bearbeiten** öffnen und die Familienbezeichnung speichern.
3. Unter **Lernende und Eintritt pflegen** das Kind, seine Schulstufe und den ersten Kurstag erfassen. Die Familiengruppe auswählen. Für Geschwister getrennte Lernprofile anlegen.
4. Unter **Konto anlegen** Benutzername, Anzeigename und Rolle wählen. Eltern, Kinder und Lehrpersonen erhalten getrennte Konten. Ein Benutzername besteht aus 3–32 Kleinbuchstaben, Ziffern, Punkt, Bindestrich oder Unterstrich; doppelte Punkte sind nicht erlaubt. Nachträglich wird er nicht im Portal umbenannt.
5. Das zufällige Startpasswort wird **einmal** angezeigt. Benutzername und Passwort persönlich an die richtige Person übergeben. Nicht als Screenshot in einen Chat senden und nicht in die Lernnotizen schreiben. Der Bereich verschwindet beim Schliessen, Wechseln oder Abmelden; danach kann das Passwort nicht erneut angezeigt werden.
6. Das Konto bleibt zunächst gesperrt. Nach geprüfter Übergabe **Freigeben** wählen. Die Person muss sich anschliessend frisch anmelden und über **Eigenes Passwort ändern** ihr eigenes Passwort setzen.
7. Unter **Kindbezogenen Zugang zuordnen** dem Elternkonto genau die vereinbarten Kinder zuweisen. Ein Schülerkonto erhält nur seinen eigenen Zugang. Eine gemeinsame Familiengruppe allein gibt keine Leserechte.
8. Bei Lehrpersonen das berechtigte Kernteam ausdrücklich festlegen. Eine Vertretung erhält dadurch nicht automatisch Zugriff. Teamkonten benötigen ebenfalls die Zwei-Faktor-Einrichtung.
9. Vor Übergabe mit der jeweiligen Person prüfen, dass nur die richtigen Kinder erscheinen. Interne Teamnotizen dürfen bei Eltern und Kindern nie auftauchen. Elternnotizen dürfen nicht in Schüleransichten erscheinen.

Bei Volljährigkeit Elternfreigaben ausdrücklich prüfen und gegebenenfalls entziehen. Ein Datum allein erteilt oder verlängert keine Freigabe. Bei Austritt den Zugang sperren und die Zuordnung entziehen; vergangene Lerninformationen nicht als Nebenwirkung löschen.

## 7. Vergessenes Passwort oder verlorenes Gerät

**Eltern oder Schüler haben das Passwort vergessen:** Identität persönlich prüfen. In deiner Kontoverwaltung das betreffende Konto auswählen und **Passwort zurücksetzen** verwenden. Das Konto wird gesperrt, alte Sitzungen verlieren den Datenzugriff. Das neue einmal angezeigte Passwort sicher übergeben und danach bewusst **Freigeben** wählen. Die Person meldet sich neu an. Keine Rücksetzmail an den internen Benutzernamen-Alias erwarten.

**Ein Konto soll vorübergehend nicht zugreifen:** **Sperren** wählen. Zum Wiederzulassen **Freigeben** wählen. Die frühere Sitzung wird dadurch nicht wieder gültig; eine frische Anmeldung ist nötig. Familien- und Lerndaten bleiben erhalten.

**Du hast dein Admin-Passwort vergessen, die Authentifizierungs-App ist verfügbar:** Die Admin-Wiederherstellung auf der Anmeldeseite nutzen. Sie sendet nur an dein festgelegtes Betreiberpostfach. Das Passwort kann nur über die bestätigte Wiederherstellung geändert werden; vorhandene Zwei-Faktor-Absicherung bleibt erforderlich.

**Dein Portal-MFA-Gerät ist verloren:** Nicht `require_staff_mfa` abschalten und keinen zweiten Admin anlegen. Zuerst deinen unabhängig abgesicherten Supabase-Dashboardzugang verwenden. Unter **Authentication → Users** anhand von E-Mail und UID genau dein Portal-Konto wählen. Die Dashboard-Aktion **Remove MFA factors** darf erst nach sicherer Identitätsprüfung durch den berechtigten Betreiber verwendet werden. Die Berechtigung für diese Aktion ist von Supabase dokumentiert; ihre tatsächliche Bedienung und die Wirkung auf alte Sitzungen müssen im leeren Testprojekt geprüft werden. Danach das Portal-Passwort zurücksetzen und bei der nächsten Anmeldung sofort einen neuen Faktor einrichten. Falls die Aktion nicht angeboten wird oder nicht gelingt: Zugang gesperrt lassen und den Supabase-Support beziehungsweise die vereinbarte Betreuung hinzuziehen. Nicht eigenständig Auth-Tabellen bearbeiten. [Dashboard-Berechtigungen](https://supabase.com/docs/guides/platform/access-control)

**Dein Supabase-Dashboard-MFA-Gerät ist verloren:** Den vorher gesicherten zweiten Faktor oder einen Wiederherstellungscode dieses Dashboardkontos verwenden. Diese Codes gehören nicht zum Portal-Konto. Den Wiederherstellungsweg vorher separat ausprobieren und sicher aufbewahren. Sind alle Dashboard-Faktoren verloren, ist eine Wiederherstellung durch den Anbieter nicht zugesichert. [Absicherung des Supabase-Kontos](https://supabase.com/docs/guides/platform/multi-factor-authentication)

**Ein Vorgang meldet einen unklaren Fehler:** Nicht wiederholt neue Konten mit ähnlichen Namen anlegen. Kontostand prüfen; ein Rücksetzversuch darf ein gesperrtes Konto nicht stillschweigend freigeben. Ein noch laufender oder nach einer Verbindungsstörung offener Vorgang blockiert weitere Kontoaktionen für dieselbe Person. In diesem Fall die Betreuung den Protokollstand prüfen lassen; den offenen Eintrag nicht blind löschen und keine Ersatzkonten anlegen. Es gibt keinen Passwortnachschlag im Protokoll. Zeitpunkt und Vorgang können ohne Passwort geprüft werden.

## 8. Abnahme vor echten Familien

Die vorhandenen automatischen Tests sind kein Ersatz für diese Abnahme. Den genauen ausgeführten Teststand dokumentiert [TESTNACHWEIS.md](TESTNACHWEIS.md).

- [ ] Zwei erfundene Familien und Geschwister im separaten Testprojekt anlegen. Eltern sehen ausschliesslich ihre zugeordneten Kinder, Schüler nur sich selbst.
- [ ] Volljähriges Testkind ohne Elternfreigabe, unzugeordnetes Konto, Vertretung und gesperrtes Konto prüfen.
- [ ] Interne Notizen und Elternnotizen über echte Anmeldung und direkte Datenzugriffe auf unberechtigte Sichtbarkeit testen lassen.
- [ ] Ein gefehlter Samstag bleibt als Lücke mit «Gefehlt» sichtbar, auch in Tabelle, Tooltip und Tastaturnavigation.
- [ ] Nur Anwesenheit speichern: keine leere Feedbackzeile und kein abgeschlossener Feedbackstatus. Interne Notiz allein genügt ebenfalls nicht. «Bearbeitet» plus «Nächster Schritt» oder eine Elternnotiz zählt genau einmal.
- [ ] Konten anlegen, einmalige Passwortanzeige, Rücksetzen, Sperren und Freigeben über die tatsächlich bereitgestellte Edge Function prüfen. Aufrufe ohne Adminrolle, ohne MFA, mit alter Sitzung oder fremder Herkunft werden abgewiesen. Protokolle enthalten keine Passwörter.
- [ ] Öffentliche Registrierung ist wirklich gesperrt. Eigener Passwortwechsel, Admin-Mailzustellung, Erst-MFA und Wiederherstellung gelingen; alte Sitzungen bleiben gesperrt.
- [ ] Smartphone, Tablet und Desktop sowie Safari testen: Texte, Diagramm, Tabellen, Formulare, Fokus und Schaltflächen bei 320, 375, 768, 1024 und 1440 Pixeln. Alles muss ohne abgeschnittene Angaben bedienbar sein.
- [ ] Nur Tastatur und bei Bedarf Bildschirmleser verwenden; Konto- und Kindwechsel sowie Abmeldung dürfen keine früheren Daten oder Startpasswörter stehen lassen.
- [ ] Erfundene Testdaten bleiben im Testprojekt. Für echten Betrieb keine Testkonten, Passwörter oder Beispieldaten übernehmen. Den Testbestand zuerst eindeutig identifizieren; Löschung oder Zurücksetzen eines Projekts nur nach separater Prüfung und Freigabe, niemals auf einem Familienbestand.
- [ ] Datenschutzinformation, berechtigte Personen, Umgang mit Austritten, Aufbewahrung und Wiederherstellung sind geklärt. Es wird keine Speicherfrist erfunden.
- [ ] Gesonderte Freigabe für den Betrieb liegt vor. Erst danach den öffentlichen Portalzugang aktivieren.

Aktuell offen sind insbesondere echte Supabase-Auth-/PostgREST-Prüfungen, Dashboard-/Edge-Bereitstellung, E-Mail- und MFA-Wiederherstellung sowie isolierte Browser-, Handy- und Safari-Prüfungen. Ohne diese Nachweise ist der Entwurf nicht für echte Familien freigegeben.
