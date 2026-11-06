/* Kalender und Standardbeiträge verwenden ausschliesslich LCCourseData. */
(() => {
  'use strict';
  const data = globalThis.LCCourseData;
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const pad = value => String(value).padStart(2, '0');
  const localFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: data.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('de-CH', {
    timeZone: data.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  function localParts(now) {
    return Object.fromEntries(localFormatter.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  }
  function quarterFor(date) {
    const [year, month] = date.split('-').map(Number);
    if (month === 1) return {quarter: 'Q2', period: `November ${year - 1} – Januar ${year}`};
    if (month <= 4) return {quarter: 'Q3', period: `Februar – April ${year}`};
    if (month <= 7) return {quarter: 'Q4', period: `Mai – Juli ${year}`};
    if (month <= 10) return {quarter: 'Q1', period: `August – Oktober ${year}`};
    return {quarter: 'Q2', period: `November ${year} – Januar ${year + 1}`};
  }
  function datesForYear(year) {
    return data.dates.filter(date => date.startsWith(`${year}-`));
  }
  function monthSummary(year, month) {
    const prefix = `${year}-${pad(month)}-`;
    const dates = data.dates.filter(date => date.startsWith(prefix));
    return {
      year: Number(year), month: Number(month), dates, count: dates.length,
      standardContributions: data.standardRates.map((rate, index) => dates.length * rate * (index + 1)),
      freeDates: data.freeDates2027.filter(day => day.date.startsWith(prefix)),
      ...quarterFor(`${prefix}01`)
    };
  }
  function nextCourse(now = new Date()) {
    const p = localParts(now);
    const today = `${p.year}-${p.month}-${p.day}`;
    const time = `${p.hour}:${p.minute}`;
    return data.dates.find(date => date > today || (date === today && time < data.endTime)) || null;
  }
  // Resolve the configured local time through Europe/Zurich, independent of the
  // visitor's timezone. Course times are outside the DST transition's missing hour.
  function zonedDateTime(date, time) {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    let instant = desired;
    for (let pass = 0; pass < 3; pass++) {
      const p = localParts(new Date(instant));
      const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const correction = desired - represented;
      instant += correction;
      if (correction === 0) return new Date(instant);
    }
    throw new RangeError('Die Kurszeit ist in der konfigurierten Zeitzone nicht eindeutig.');
  }
  const utcStamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escapeICS = text => String(text).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  function foldICS(line) {
    const encoder = new TextEncoder();
    let folded = '', bytes = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (bytes + length > 75) { folded += '\r\n '; bytes = 1; }
      folded += character;
      bytes += length;
    }
    return folded;
  }
  function calendarText(year, now = new Date()) {
    const dates = datesForYear(year);
    if (!dates.length) throw new RangeError('Für dieses Jahr sind keine Kurstage veröffentlicht.');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lerncoaching ZH//Kurskalender//DE', 'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:Lerncoaching ZH ${year}`, `X-WR-TIMEZONE:${data.timezone}`];
    for (const date of dates) {
      lines.push('BEGIN:VEVENT', `UID:lc-zh-${date}@lerncoaching-zh.ch`, `DTSTAMP:${utcStamp(now)}`,
        `DTSTART:${utcStamp(zonedDateTime(date, data.startTime))}`, `DTEND:${utcStamp(zonedDateTime(date, data.endTime))}`,
        'SUMMARY:Lerncoaching ZH – Nachhilfekurs', `LOCATION:${escapeICS(data.location)}`,
        `DESCRIPTION:${escapeICS(`Kurszeit ${data.startTime}–${data.endTime} Uhr (${data.timezone}). Ein Kalenderimport ist keine Anmeldung.`)}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldICS).join('\r\n') + '\r\n';
  }
  // Read-only helpers also permit independent date/DST/export tests without a DOM.
  globalThis.LCCalendar = Object.freeze({datesForYear, monthSummary, quarterFor, nextCourse, zonedDateTime, calendarText, localParts});
  if (typeof document === 'undefined') return;

  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const formatDate = date => dateFormatter.format(zonedDateTime(date, '12:00'));
  const money = value => `CHF ${value}.–`;
  const shortDate = date => `${date.slice(8)}.${date.slice(5, 7)}.`;
  const timeLabel = `${data.startTime}–${data.endTime} Uhr`;
  function monthCard(year, month) {
    const item = monthSummary(year, month);
    const monthName = months[month - 1];
    const free = item.freeDates.length
      ? `<p class="lc-free"><span>Kursfrei</span>${item.freeDates.map(day => `${shortDate(day.date)} ${escapeHTML(day.reason)}`).join('<br>')}</p>`
      : (Number(year) === 2027 ? '<p class="lc-free lc-all"><span>Durchgehend</span>Alle Samstage dieses Monats.</p>' : '');
    return `<article class="lc-month" data-month="${year}-${pad(month)}" aria-labelledby="month-${year}-${month}">
      <div class="lc-month-head"><h4 id="month-${year}-${month}">${monthName} <span>${year}</span></h4><span class="lc-count">${item.count} ${item.count === 1 ? 'Termin' : 'Termine'}</span></div>
      <p class="lc-period">${item.quarter} · ${item.period}</p>
      <ul class="lc-days" aria-label="Kurssamstage ${monthName} ${year}">${item.dates.map(date => `<li><time datetime="${date}" aria-label="${formatDate(date)}">${date.slice(8)}<span>SA</span></time></li>`).join('')}</ul>
      ${free}<div class="lc-month-price"><div><span>1 Kind · Standardbeitrag</span><strong>${money(item.standardContributions[0])}</strong></div><details class="lc-family"><summary>Geschwisterpreise</summary><p>2 Kinder zusammen: <b>${money(item.standardContributions[1])}</b><br>3 Kinder zusammen: <b>${money(item.standardContributions[2])}</b></p></details></div>
    </article>`;
  }
  function quarterOverview(year) {
    const parts = new Map();
    for (const date of datesForYear(year)) {
      const item = quarterFor(date);
      const month = +date.slice(5, 7);
      if (!parts.has(item.period)) parts.set(item.period, {...item, months: new Set()});
      parts.get(item.period).months.add(month);
    }
    return `<details class="lc-quarter-details"><summary>So liegen unsere Kursquartale im Jahr ${year} <span>3 Monate pro Quartal</span></summary><div class="lc-quarters">${Array.from(parts.values()).map(part => {
      const covered = [...part.months];
      const label = covered.length === 1 ? months[covered[0] - 1] : `${months[covered[0] - 1]} – ${months[covered.at(-1) - 1]}`;
      return `<div class="lc-quarter"><span>${part.quarter}</span><strong>${label}</strong><small>${part.period}</small></div>`;
    }).join('')}</div><p>Die Kursquartale bleiben unverändert: August–Oktober, November–Januar, Februar–April und Mai–Juli. Januar gehört zum im Vorjahr begonnenen November–Januar-Quartal.</p></details>`;
  }
  const years = [...new Set(data.dates.map(date => +date.slice(0, 4)))];
  const panels = document.getElementById('lc-year-panels');
  const localNow = localParts(new Date());
  const currentMonth = `${localNow.year}-${localNow.month}`;
  for (const year of years.slice().reverse()) {
    const yearDates = datesForYear(year);
    const monthNumbers = [...new Set(yearDates.map(date => +date.slice(5, 7)))];
    const archive = year === 2026 ? monthNumbers.filter(month => `${year}-${pad(month)}` < currentMonth) : [];
    const visible = monthNumbers.filter(month => !archive.includes(month));
    const free = data.freeDates2027.filter(day => day.confirmedException && day.date.startsWith(`${year}-`));
    const panel = document.createElement('div');
    panel.className = 'lc-year-panel';
    panel.dataset.yearPanel = year;
    panel.id = `lc-year-${year}`;
    panel.innerHTML = `<div class="lc-plan-title"><h3>${months[monthNumbers[0] - 1]} – ${months[monthNumbers.at(-1) - 1]} ${year}</h3><span>${yearDates.length} Kurssamstage</span></div>
      ${free.length ? `<div class="lc-free-banner"><span class="lc-holiday-icon" aria-hidden="true">☀</span><p><strong>Diese drei Samstage bleiben zusätzlich frei.</strong><span>${free.map(day => `${shortDate(day.date)}${year} · ${escapeHTML(day.reason)}`).join('<br>')}</span></p></div>` : ''}
      ${quarterOverview(year)}
      ${visible.length ? `<div class="lc-months">${visible.map(month => monthCard(year, month)).join('')}</div>` : '<p>Alle veröffentlichten Kurstage dieses Jahres liegen zurück.</p>'}
      ${archive.length ? `<details class="lc-archive"><summary>Frühere Kursmonate ${year} ansehen (${archive.length})</summary><div class="lc-months">${archive.map(month => monthCard(year, month)).join('')}</div></details>` : ''}`;
    panels.append(panel);
  }
  document.querySelectorAll('[data-course-time]').forEach(element => { element.textContent = timeLabel; });
  document.getElementById('lc-standard-rates').textContent = `Anzahl angebotener Doppellektionen × Standardtarif: CHF ${data.standardRates[0]} für ein Kind; bei zwei Geschwistern CHF ${data.standardRates[1]} je Kind; bei drei Geschwistern CHF ${data.standardRates[2]} je Kind.`;
  const controls = document.querySelector('.lc-year-controls');
  controls.innerHTML = years.map(year => `<button type="button" data-year="${year}" aria-pressed="false" aria-controls="lc-year-${year}">${year}</button>`).join('');
  controls.hidden = false;
  const exportLink = document.getElementById('lc-calendar-export');
  let exportURL;
  function selectYear(year) {
    year = Number(year);
    if (!years.includes(year)) return;
    document.querySelectorAll('[data-year-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.yearPanel) !== year; });
    controls.querySelectorAll('[data-year]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.year) === year)));
    if (exportURL) URL.revokeObjectURL(exportURL);
    exportURL = URL.createObjectURL(new Blob([calendarText(year)], {type: 'text/calendar;charset=utf-8'}));
    exportLink.href = exportURL;
    exportLink.download = `Lerncoaching_ZH_${year}.ics`;
    exportLink.innerHTML = `↓ Termine ${year} speichern <small>(.ics)</small>`;
    exportLink.hidden = false;
  }
  controls.querySelectorAll('[data-year]').forEach(button => button.addEventListener('click', () => selectYear(button.dataset.year)));
  selectYear(data.defaultYear);
  function updateNext() {
    const now = new Date();
    const next = nextCourse(now);
    const p = localParts(now);
    const today = `${p.year}-${p.month}-${p.day}`;
    const values = {
      'lc-next-label': !next ? 'Kurskalender' : next === today ? (`${p.hour}:${p.minute}` >= data.startTime ? 'Heute · Kurs läuft' : 'Heute ist Kurstag') : 'Nächster Kurstag',
      'lc-next-date': next ? formatDate(next) : 'Neue Termine werden bekanntgegeben.',
      'lc-next-time': next ? timeLabel : ''
    };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      // Avoid repeated live-region announcements while the next course is unchanged.
      if (element.textContent !== value) element.textContent = value;
    }
    document.querySelector('.lc-next').hidden = false;
  }
  updateNext();
  setInterval(updateNext, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateNext(); });
  window.addEventListener('pageshow', updateNext);

  // The confirmed URL goes straight to Google. No intermediate rating or form.
  function googleReviewURL(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      return url.protocol === 'https:' && !url.username && !url.password &&
        (host === 'g.page' || host === 'maps.app.goo.gl' || host === 'google.com' || host.endsWith('.google.com')) ? url.href : null;
    } catch (_) { return null; }
  }
  const reviewURL = googleReviewURL(globalThis.LCSiteConfig?.googleReviewUrl);
  if (reviewURL) {
    document.getElementById('lc-review-button').href = reviewURL;
    document.getElementById('bewerten').hidden = false;
    document.querySelectorAll('a[href="#bewerten"]').forEach(link => { link.hidden = false; });
  }
})();
