// ENTWURF: noch nicht mit dem tatsächlichen Scriptprojekt/Deployment abgeglichen.
// Keine Aufnahmeentscheidung, Vertragsannahme, Rechnung oder Reservierung durch diese Web-App.
var LC_INFO_VERSION = 'interessenanfrage-2026-11-08-v1';
var LC_PRIVACY_VERSION = 'anfrage-datenschutz-2026-11-08-v1';
var LC_SUCCESS = 'Deine Anfrage ist eingegangen. Wir prüfen die Verfügbarkeit und melden uns persönlich. Ein Platz ist noch nicht bestätigt.';
var LC_LEGACY_HEADERS = ['Datum','Name Kind/Person','Schulstufe','Schulstufe (Sonstiges)','Angebot','Kontakt Elternteil','Strasse & Hausnr.','PLZ & Wohnort','Fächer / Nachricht','Einwilligung Probetag','Einwilligung Quartal','Einwilligung Online'];
var LC_EXTRA_HEADERS = ['Vorgangs-ID','Anfrage-ID','Datensatztyp','Anfragestatus','Eingang UTC','Anfrageinfo-Version','Datenschutzhinweis-Version','Schulstufe Anzeige','Wunschdatum unverbindlich','Inhalt-Hash','Kontakt-Hash','Benachrichtigung'];
var LC_LEVELS = {
  'Primarschule (3.–6. Kl.)':'Primarschule (4.–6. Kl.)',
  'Sekundarschule (7.–10. Kl.)':'Sekundarschule (7.–10. Kl.)',
  'Gymnasium / Kanti':'Gymnasium / Kanti',
  'Berufsschule / Lehrling':'Berufsschule / Lehrling',
  'BMS / HMS / FMS':'BMS / HMS / FMS',
  'sonstiges':'Sonstiges'
};
var LC_OFFERS = {
  probetag:'Ersttermin / Probetag – CHF 20.–; erst nach separater Vereinbarung',
  quartal_1:'Quartal · 1 Kind – CHF 40 pro Doppellektion',
  quartal_2:'Quartal · 2 Geschwister – CHF 35 pro Kind/Doppellektion',
  quartal_3:'Quartal · 3 Geschwister – CHF 30 pro Kind/Doppellektion',
  online_probe:'Online Probestunde – CHF 45.– (60 Min.)',
  online_einzel:'Online Einzelstunde – CHF 65.– (60 Min.)',
  online_doppel:'Online Doppelstunde – CHF 110.– (ca. 2 Std.)'
};

function doGet() {
  try {
    var template = HtmlService.createTemplateFromFile('Index');
    template.bootJson = JSON.stringify(bootstrap_()).replace(/</g, '\\u003c');
    return template.evaluate().setTitle('Platz anfragen – Lerncoaching ZH')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (_) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="de"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Platz anfragen</title><p>Die Anfrage kann derzeit nicht geladen werden. Bitte versuche es später erneut oder kontaktiere Lerncoaching ZH direkt. Es wurde keine Buchung vorgenommen.</p></html>');
  }
}

// Alte direkte POSTs und no-cors-Sendungen dürfen keinen falschen Erfolg ergeben.
function doPost() {
  return ContentService.createTextOutput(JSON.stringify({ok:false, code:'FORM_REQUIRED', message:'Bitte öffne das aktuelle Anfrageformular. Es wurde nichts gespeichert.'})).setMimeType(ContentService.MimeType.JSON);
}

// Einziger schreibender öffentlicher RPC. Alle Hilfsfunktionen sind für google.script.run privat.
function submitInterest(payload) {
  var lock;
  try {
    var config = config_();
    var item = validate_(payload, config, new Date());
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return failure_('BUSY', 'Die Anfrage wird gerade verarbeitet. Bitte versuche es nochmals mit derselben Anfrage.');
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) throw new Error('Configuration mismatch');
    var columns = columns_(sheet);
    var records = records_(sheet, columns);
    var sameId = records.find(function(record) { return record['Anfrage-ID'] === item.requestId; });
    if (sameId) {
      if (sameId['Inhalt-Hash'] !== item.contentHash) return failure_('ID_CONFLICT', 'Diese Anfrage wurde bereits verarbeitet. Für eine weitere Anfrage lade das Formular neu.');
      return receipt_(sameId['Vorgangs-ID'], true);
    }
    // Neue Browser-ID nach Neuladen: identische technische Wiederholungen nicht nochmals zählen.
    var duplicate = records.find(function(record) {
      return record['Datensatztyp'] === config.recordType && record['Inhalt-Hash'] === item.contentHash &&
        new Date(record['Eingang UTC']).getTime() >= item.now.getTime() - 30 * 60000;
    });
    if (duplicate) return receipt_(duplicate['Vorgangs-ID'], true);
    // Bereits gespeicherte, signierte Anfragen können auch nach Tokenablauf quittiert werden.
    // Für neue Schreibvorgänge gelten aktuelle Informationen, Datum und ein frisches Token.
    if (payload.infoVersion !== LC_INFO_VERSION || payload.privacyVersion !== LC_PRIVACY_VERSION) validationError_('Die Anfrageinformationen wurden aktualisiert. Bitte lade das Formular neu.');
    if (item.tokenAge > 2 * 3600000) {
      var expired = failure_('EXPIRED', 'Die Formularsitzung wurde erneuert. Bitte prüfe deine Angaben und sende dieselbe Anfrage nochmals.');
      expired.retry = tokenFor_(item.requestId, item.now.getTime(), config);
      return expired;
    }
    if (item.desiredDate && (item.desiredDate < Utilities.formatDate(item.now, 'Europe/Zurich', 'yyyy-MM-dd') || new Date(item.desiredDate + 'T12:00:00Z').getTime() > item.now.getTime() + 550 * 86400000)) validationError_('Bitte wähle ein gültiges zukünftiges Wunschdatum.');
    var recent = records.filter(function(record) { return record['Datensatztyp'] === config.recordType && new Date(record['Eingang UTC']).getTime() >= item.now.getTime() - 3600000; });
    if (recent.filter(function(record) { return record['Kontakt-Hash'] === item.contactHash; }).length >= 3 || recent.length >= 80) {
      return failure_('RATE_LIMIT', 'Zurzeit sind zu viele Anfragen eingegangen. Bitte versuche es später erneut oder kontaktiere uns direkt.');
    }
    var id = 'INQ-' + Utilities.getUuid();
    var record = {
      'Datum': Utilities.formatDate(item.now, 'Europe/Zurich', 'dd.MM.yyyy HH:mm:ss'),
      'Name Kind/Person':item.name, 'Schulstufe':item.level, 'Schulstufe (Sonstiges)':item.levelOther,
      'Angebot':item.offer, 'Kontakt Elternteil':item.contact, 'Fächer / Nachricht':item.message,
      'Vorgangs-ID':id, 'Anfrage-ID':item.requestId, 'Datensatztyp':config.recordType,
      'Anfragestatus':'Anfrage', 'Eingang UTC':item.now.toISOString(),
      'Anfrageinfo-Version':LC_INFO_VERSION, 'Datenschutzhinweis-Version':LC_PRIVACY_VERSION,
      'Schulstufe Anzeige':LC_LEVELS[item.level], 'Wunschdatum unverbindlich':item.desiredDate,
      'Inhalt-Hash':item.contentHash, 'Kontakt-Hash':item.contactHash,
      'Benachrichtigung':config.mode === 'test' ? 'Test: abgefangen' : 'ausstehend'
    };
    // Alte Einwilligungs-/Adressspalten bleiben bei neuen Interessenanfragen leer.
    var values = columns.names.map(function(name) { return textCell_(record[name] || ''); });
    var rowNumber = sheet.getLastRow() + 1;
    var range = sheet.getRange(rowNumber, 1, 1, columns.names.length);
    range.setNumberFormat('@');
    range.setValues([values]);
    SpreadsheetApp.flush(); // Erst danach darf Erfolg zum Browser zurückgehen.
    lock.releaseLock();
    lock = null;
    if (config.mode === 'production') notify_(sheet, rowNumber, columns.index['Benachrichtigung'] + 1, config, record);
    return receipt_(id, false);
  } catch (error) {
    if (error && error.publicCode) return failure_(error.publicCode, error.publicMessage);
    // Keine Tabellen-IDs, Mailadressen, Stacktraces oder interne Fehlermeldungen im Browser.
    return failure_('UNAVAILABLE', 'Das Speichern konnte nicht bestätigt werden. Bitte versuche dieselbe Anfrage in diesem Formular nochmals oder kontaktiere uns bei Unsicherheit direkt.');
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function config_() {
  var p = PropertiesService.getScriptProperties();
  var mode = p.getProperty('LC_MODE');
  if (mode !== 'production' && mode !== 'test') throw new Error('Explicit mode required');
  var productionId = p.getProperty('LC_SPREADSHEET_ID');
  var testId = p.getProperty('LC_TEST_SPREADSHEET_ID');
  var id = mode === 'production' ? productionId : testId;
  var name = p.getProperty('LC_SHEET_NAME');
  var email = p.getProperty('LC_NOTIFY_EMAIL');
  var secret = p.getProperty('LC_TOKEN_SECRET');
  if (!id || !name || !secret || secret.length < 32 || (mode === 'production' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) || (mode === 'test' && (!testId || testId === productionId))) throw new Error('Incomplete configuration');
  return {mode:mode, spreadsheetId:id, sheetName:name, email:email, secret:secret, recordType:mode === 'production' ? 'INTERESSENANFRAGE' : 'TEST'};
}

function bootstrap_() {
  var config = config_();
  var requestId = Utilities.getUuid();
  var issued = Date.now();
  return {requestId:requestId, token:tokenFor_(requestId, issued, config).token, issued:issued, infoVersion:LC_INFO_VERSION,
    privacyVersion:LC_PRIVACY_VERSION, levels:LC_LEVELS, offers:LC_OFFERS,
    today:Utilities.formatDate(new Date(issued), 'Europe/Zurich', 'yyyy-MM-dd')};
}

function tokenFor_(requestId, issued, config) {
  var raw = requestId + ':' + issued;
  return {requestId:requestId, issued:issued, token:raw + ':' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(raw, config.secret))};
}

function validationError_(message) {
  var error = new Error('Invalid request');
  error.publicCode = 'INVALID'; error.publicMessage = message;
  throw error;
}

function validate_(payload, config, now) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) validationError_('Bitte vervollständige die Pflichtangaben.');
  var allowed = ['requestId','token','infoVersion','privacyVersion','name','level','levelOther','offer','contact','desiredDate','message','website'];
  if (Object.keys(payload).some(function(key) { return allowed.indexOf(key) < 0; })) validationError_('Bitte verwende das aktuelle Anfrageformular.');
  function field(name, max, required) {
    if (payload[name] !== undefined && typeof payload[name] !== 'string') validationError_('Bitte prüfe die Eingaben.');
    var value = (payload[name] || '').trim();
    if ((required && !value) || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) validationError_('Bitte prüfe die Pflichtangaben und Textlängen.');
    return value;
  }
  if (field('website', 200, false)) validationError_('Die Anfrage konnte nicht verarbeitet werden.');
  var requestId = field('requestId', 36, true);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) validationError_('Bitte lade das Anfrageformular neu.');
  var token = field('token', 150, true).split(':');
  var issued = Number(token[1]);
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(requestId + ':' + issued, config.secret));
  if (token.length !== 3 || token[0] !== requestId || !Number.isFinite(issued) || token[2] !== expected || now.getTime() - issued < 1500) validationError_('Bitte prüfe deine Angaben und versuche es nach einem kurzen Moment erneut.');
  field('infoVersion', 100, true); field('privacyVersion', 100, true);
  var item = {requestId:requestId, tokenAge:now.getTime() - issued, now:now, name:field('name', 120, true), level:field('level', 80, true), levelOther:field('levelOther', 160, false),
    offer:field('offer', 30, true), contact:field('contact', 240, true), desiredDate:field('desiredDate', 10, false), message:field('message', 1500, false)};
  if (!Object.prototype.hasOwnProperty.call(LC_LEVELS, item.level) || !Object.prototype.hasOwnProperty.call(LC_OFFERS, item.offer)) validationError_('Bitte wähle eine gültige Schulstufe und ein Angebot.');
  if (item.level === 'sonstiges' && !item.levelOther) validationError_('Bitte beschreibe die Schulstufe oder Ausbildung.');
  if (item.level !== 'sonstiges') item.levelOther = '';
  if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(item.contact) && item.contact.replace(/\D/g, '').length < 7) validationError_('Bitte gib eine erreichbare Telefonnummer oder E-Mail-Adresse an.');
  if (item.desiredDate) {
    var date = new Date(item.desiredDate + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.desiredDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== item.desiredDate) validationError_('Bitte wähle ein gültiges Wunschdatum.');
    if (item.offer.indexOf('online_') !== 0 && date.getUTCDay() !== 6) validationError_('Der Kurs vor Ort findet samstags statt. Das Wunschdatum ist noch keine Buchung.');
  }
  item.contentHash = hash_(JSON.stringify([item.name.toLowerCase(),item.level,item.levelOther,item.offer,item.contact.toLowerCase().replace(/\s+/g,' '),item.desiredDate,item.message]));
  item.contactHash = hash_(item.contact.toLowerCase().replace(/[\s().-]/g,''));
  return item;
}

function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function columns_(sheet) {
  var count = sheet.getLastColumn();
  if (!count || sheet.getLastRow() < 1) throw new Error('Schema not prepared');
  var names = sheet.getRange(1,1,1,count).getValues()[0].map(String);
  var index = {};
  names.forEach(function(name, i) { if (Object.prototype.hasOwnProperty.call(index,name)) throw new Error('Duplicate column'); index[name]=i; });
  LC_LEGACY_HEADERS.forEach(function(name,i) { if (names[i] !== name) throw new Error('Legacy schema mismatch'); });
  LC_EXTRA_HEADERS.forEach(function(name) { if (!Object.prototype.hasOwnProperty.call(index,name)) throw new Error('Schema not prepared'); });
  return {names:names,index:index};
}

function records_(sheet, columns) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,columns.names.length).getValues().map(function(row) {
    var record = {};
    LC_EXTRA_HEADERS.forEach(function(name) { record[name] = String(row[columns.index[name]] || ''); });
    return record;
  });
}

function textCell_(value) {
  var text = String(value);
  // Textformat plus Apostroph. Tatsächlicher Sheets-/CSV-Roundtrip ist vor Freigabe separat zu prüfen.
  return /^[\s\uFEFF]*[=+@-]/.test(text) ? "'" + text : text;
}

function notify_(sheet, row, column, config, record) {
  var status;
  try {
    MailApp.sendEmail({to:config.email, subject:'Neue unverbindliche Interessenanfrage · ' + record['Vorgangs-ID'], body:
      'Eine Interessenanfrage wurde gespeichert. Kein Vertrag, keine Platzreservierung, keine Zahlungspflicht und kein Termin wurden damit bestätigt.\n\n' +
      'Vorgangs-ID: ' + record['Vorgangs-ID'] + '\nName: ' + record['Name Kind/Person'] + '\nKontakt: ' + record['Kontakt Elternteil'] +
      '\nGewünschtes Angebot: ' + LC_OFFERS[record['Angebot']] + '\nWunschdatum (unbestätigt): ' + (record['Wunschdatum unverbindlich'] || 'nicht angegeben') +
      '\n\nJosef prüft persönlich. Eine verbindliche Buchung erfolgt erst nach ausdrücklicher Bestätigung und Abschluss der separaten unterschriebenen Vereinbarung.\nDetails stehen in der bestehenden privaten Tabelle.'});
    status = 'versandt';
  } catch (_) { status = 'fehlgeschlagen – manuell prüfen'; }
  // Nach dem Speichern darf auch ein Fehler bei Mail/Statuspflege keine Fehlbestätigung auslösen.
  try { sheet.getRange(row,column).setValue(status); SpreadsheetApp.flush(); } catch (_) { /* ausstehend/unklar bleibt zur manuellen Prüfung */ }
}

function receipt_(id, duplicate) { return {ok:true, saved:true, inquiryId:id, duplicate:duplicate, message:LC_SUCCESS}; }
function failure_(code,message) { return {ok:false, saved:false, code:code, message:message}; }
