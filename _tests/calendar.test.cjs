'use strict';

// Run from any directory: node --test _tests/calendar.test.cjs
// No production dependencies and no network/form submissions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const fixture = require('./approved-calendar-fixture.json');
const plain = value => JSON.parse(JSON.stringify(value));
const ctx = vm.createContext({ console, Intl, Date, TextEncoder, URL, Blob });
for (const filename of ['course-data.js', 'calendar.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, filename), 'utf8'), ctx, { filename });
}
const api = ctx.LCCalendar;
const data = ctx.LCCourseData;
const expected = year => Object.entries(fixture[`months${year}`])
  .flatMap(([month, days]) => days.map(day => `${year}-${month}-${String(day).padStart(2, '0')}`))
  .sort();
const dateParts = date => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
}).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
const localISO = date => {
  const p = dateParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
};

test('approved 2027 dates match all 36 Saturdays exactly', () => {
  assert.deepEqual(plain(api.datesForYear(2027)), expected(2027));
  assert.equal(api.datesForYear(2027).length, 36);
});

test('all 24 published 2026 dates remain, including the six November/December dates', () => {
  assert.deepEqual(plain(api.datesForYear(2026)), expected(2026));
  assert.deepEqual(plain(api.datesForYear(2026).filter(date => date >= '2026-11-01')), [
    '2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12'
  ]);
});

test('all dates are unique, ordered and Saturdays; 36 course + 16 free dates cover 2027', () => {
  const courses = plain(data.dates);
  assert.equal(new Set(courses).size, courses.length);
  assert.deepEqual(courses, [...courses].sort());
  courses.forEach(date => assert.equal(new Date(`${date}T12:00:00Z`).getUTCDay(), 6, date));
  const free = plain(data.freeDates2027).map(item => item.date).sort();
  assert.deepEqual(free, fixture.free2027);
  const both = [...api.datesForYear(2027), ...free].sort();
  assert.equal(new Set(both).size, 52);
  const saturdays = [];
  for (let day = Date.UTC(2027, 0, 2); day < Date.UTC(2028, 0, 1); day += 7 * 86400000) {
    saturdays.push(new Date(day).toISOString().slice(0, 10));
  }
  assert.deepEqual(both, saturdays);
});

test('three explicitly approved exclusions are never courses', () => {
  for (const date of ['2027-01-02', '2027-03-27', '2027-05-15']) {
    assert.ok(!data.dates.includes(date), date);
    assert.ok(data.freeDates2027.some(item => item.date === date), date);
  }
});

test('existing standard rates and course times remain unchanged', () => {
  assert.deepEqual(plain(data.standardRates), fixture.standardRates);
  assert.equal(data.startTime, '09:30');
  assert.equal(data.endTime, '11:30');
  assert.equal(data.timezone, 'Europe/Zurich');
});

test('each monthly count and family contribution derives from the approved dates and unchanged rates', () => {
  for (const year of [2026, 2027]) {
    for (const [month, days] of Object.entries(fixture[`months${year}`])) {
      const summary = api.monthSummary(year, +month);
      assert.equal(summary.count, days.length, `${year}-${month}`);
      assert.deepEqual(plain(summary.dates), expected(year).filter(date => date.startsWith(`${year}-${month}-`)));
      assert.deepEqual(plain(summary.standardContributions), [days.length * 40, days.length * 70, days.length * 90]);
    }
  }
});

test('single data source drives counts, contributions and export even with synthetic in-memory data', () => {
  // This isolated test never changes the files or the actual tariffs.
  const synthetic = {...plain(data), dates: ['2027-01-09'], standardRates: [42, 36, 31], startTime: '10:00', endTime: '12:00'};
  const isolated = vm.createContext({ Intl, Date, TextEncoder, LCCourseData: synthetic });
  vm.runInContext(fs.readFileSync(path.join(root, 'calendar.js'), 'utf8'), isolated);
  const changed = isolated.LCCalendar;
  assert.deepEqual(plain(changed.monthSummary(2027, 1).standardContributions), [42, 72, 93]);
  assert.equal(changed.monthSummary(2027, 1).count, 1);
  const events = eventsIn(changed.calendarText(2027, new Date('2026-11-06T12:00:00Z')));
  assert.equal(events.length, 1);
  assert.equal(localISO(parseUTC(events[0].DTSTART)), '2027-01-09T10:00:00');
  assert.equal(localISO(parseUTC(events[0].DTEND)), '2027-01-09T12:00:00');
  assert.ok(events[0].DESCRIPTION.includes('10:00–12:00'));
});

test('course quarters retain August–October, November–January, February–April, May–July', () => {
  const cases = [
    ['2026-11-07', 'Q2', 'November 2026 – Januar 2027'],
    ['2027-01-09', 'Q2', 'November 2026 – Januar 2027'],
    ['2027-02-06', 'Q3', 'Februar – April 2027'],
    ['2027-04-17', 'Q3', 'Februar – April 2027'],
    ['2027-05-08', 'Q4', 'Mai – Juli 2027'],
    ['2027-07-10', 'Q4', 'Mai – Juli 2027'],
    ['2027-08-21', 'Q1', 'August – Oktober 2027'],
    ['2027-10-30', 'Q1', 'August – Oktober 2027'],
    ['2027-11-06', 'Q2', 'November 2027 – Januar 2028'],
    ['2027-12-11', 'Q2', 'November 2027 – Januar 2028']
  ];
  for (const [date, quarter, period] of cases) {
    const result = api.quarterFor(date);
    assert.equal(result.quarter, quarter, date);
    assert.equal(result.period, period, date);
  }
});

test('Zurich conversion handles winter, summer and both DST transitions', () => {
  const cases = [
    ['2027-01-09', '2027-01-09T08:30:00.000Z'],
    ['2027-03-20', '2027-03-20T08:30:00.000Z'],
    ['2027-04-03', '2027-04-03T07:30:00.000Z'],
    ['2027-07-03', '2027-07-03T07:30:00.000Z'],
    ['2027-10-30', '2027-10-30T07:30:00.000Z'],
    ['2027-11-06', '2027-11-06T08:30:00.000Z']
  ];
  for (const [date, utc] of cases) assert.equal(new Date(api.zonedDateTime(date, '09:30')).toISOString(), utc);
});

test('next course crosses New Year and the three excluded Saturdays correctly', () => {
  const cases = [
    ['2026-11-06T12:00:00Z', '2026-11-07'],
    ['2026-12-12T10:29:59Z', '2026-12-12'],
    ['2026-12-12T10:30:00Z', '2027-01-09'],
    ['2026-12-31T22:59:59Z', '2027-01-09'],
    ['2026-12-31T23:00:00Z', '2027-01-09'],
    ['2027-01-02T08:30:00Z', '2027-01-09'],
    ['2027-03-27T08:30:00Z', '2027-04-03'],
    ['2027-03-28T01:00:00Z', '2027-04-03'],
    ['2027-05-15T07:30:00Z', '2027-05-22'],
    ['2027-10-31T01:00:00Z', '2027-11-06'],
    ['2027-12-11T10:30:00Z', null],
    ['2027-12-31T23:00:00Z', null]
  ];
  for (const [now, wanted] of cases) assert.equal(api.nextCourse(new Date(now)), wanted, now);
});

test('a course remains next through its start and is removed exactly at its end', () => {
  for (const [date, before, start, during, end, next] of [
    ['2027-01-09', '08:29:59', '08:30:00', '10:29:59', '10:30:00', '2027-01-16'],
    ['2027-07-03', '07:29:59', '07:30:00', '09:29:59', '09:30:00', '2027-07-10']
  ]) {
    for (const time of [before, start, during]) assert.equal(api.nextCourse(new Date(`${date}T${time}Z`)), date);
    assert.equal(api.nextCourse(new Date(`${date}T${end}Z`)), next);
  }
});

test('local dates switch at Zurich midnight, independently of host timezone', () => {
  assert.equal(api.localParts(new Date('2026-12-31T22:59:59Z')).year, '2026');
  const newYear = api.localParts(new Date('2026-12-31T23:00:00Z'));
  assert.equal(`${newYear.year}-${newYear.month}-${newYear.day} ${newYear.hour}:${newYear.minute}`, '2027-01-01 00:00');
  const summer = api.localParts(new Date('2027-07-02T22:00:00Z'));
  assert.equal(`${summer.year}-${summer.month}-${summer.day} ${summer.hour}:${summer.minute}`, '2027-07-03 00:00');
});

function parseUTC(value) {
  assert.match(value, /^\d{8}T\d{6}Z$/, 'ICS date must be explicit UTC, never floating local time');
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`);
}

function eventsIn(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '');
  return Array.from(unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g), match => {
    return Object.fromEntries(match[1].trim().split('\r\n').map(line => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon), line.slice(colon + 1)];
    }));
  });
}

for (const year of [2026, 2027]) {
  test(`ICS ${year}: every course exactly once at 09:30–11:30 Zurich, no excluded date`, () => {
    const text = api.calendarText(year, new Date('2026-11-06T12:00:00Z'));
    assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n'));
    assert.ok(text.endsWith('END:VCALENDAR\r\n'));
    assert.ok(text.includes('VERSION:2.0\r\n'));
    assert.ok(!/(?<!\r)\n|\r(?!\n)/.test(text), 'Only CRLF content lines');
    for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `RFC 5545 line too long: ${line}`);
    const events = eventsIn(text);
    assert.equal(events.length, expected(year).length);
    assert.equal(new Set(events.map(event => event.UID)).size, events.length);
    assert.deepEqual(events.map(event => localISO(parseUTC(event.DTSTART)).slice(0, 10)), expected(year));
    for (const event of events) {
      const start = parseUTC(event.DTSTART);
      const end = parseUTC(event.DTEND);
      assert.equal(localISO(start).slice(11), '09:30:00');
      assert.equal(localISO(end).slice(11), '11:30:00');
      assert.equal(end - start, 2 * 60 * 60 * 1000);
      assert.equal(parseUTC(event.DTSTAMP).toISOString(), '2026-11-06T12:00:00.000Z');
      assert.ok(event.SUMMARY.includes('Lerncoaching'));
      assert.equal(event.ATTENDEE, undefined);
    }
    const later = eventsIn(api.calendarText(year, new Date('2026-11-07T12:00:00Z')));
    assert.deepEqual(later.map(event => event.UID), events.map(event => event.UID), 'Re-export keeps event identities');
  });
}

test('real iframe attributes except accessible title and direct fallback remain unchanged', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const baseline = execFileSync('git', ['show', '36b76c088ca2b123729ddf108ef3b80f082e8a03:index.html'], { cwd: root, encoding: 'utf8' });
  const iframe = text => text.match(/<iframe\b[\s\S]*?<\/iframe>/)[0].replace(/title="[^"]*"/, 'title=""');
  assert.equal(iframe(html), iframe(baseline));
  assert.match(html, /title="Interessenanfrage Lerncoaching ZH"/);
  assert.equal(html.match(/<p class="form-fallback">[\s\S]*?<\/p>/)[0], baseline.match(/<p class="form-fallback">[\s\S]*?<\/p>/)[0]);
  assert.ok(html.includes(`href="${fixture.registrationUrl}"`));
  assert.ok(!/<(?:input|textarea)\b[^>]*\bdisabled\b/i.test(html), 'No disabled example registration fields');
});

test('standard PDF downloads stay local and are never concept drafts or GitHub views', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const pdfLinks = Array.from(html.matchAll(/<a\b[^>]*href="([^"]+\.pdf(?:\?[^"#]*)?)"[^>]*>/g), match => match[1]);
  assert.ok(pdfLinks.includes('konzept.pdf'));
  assert.ok(pdfLinks.includes('vertrag.pdf'));
  assert.ok(pdfLinks.includes('vertrag_ersttermin.pdf'));
  assert.ok(pdfLinks.every(href => !/github|entwuerfe|entwurf/i.test(href)));
  for (const href of pdfLinks) assert.ok(fs.existsSync(path.join(root, href.split('?')[0])));
});

test('production HTML has no preview dialog, demo notices or sample registration fields', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(!/id="lc-review-dialog"|Nur die Vorschau|Zurück zur Vorschau|Vorschauhinweis|Beispiel-Anmeldung/.test(html));
  assert.match(html, /<section\b(?=[^>]*id="bewerten")(?=[^>]*\bhidden\b)[^>]*>/);
});
