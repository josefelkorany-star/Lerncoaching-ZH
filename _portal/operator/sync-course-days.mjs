// Emits SQL; never connects to a database. Only course-data.js owns the calendar.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
await import('../../course-data.js');
const source=await fs.readFile(new URL('../../course-data.js',import.meta.url));
const hash=createHash('sha256').update(source).digest('hex');
const dates=[...globalThis.LCCourseData.dates].sort();
if(!dates.length||new Set(dates).size!==dates.length||dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||new Date(`${d}T12:00:00Z`).getUTCDay()!==6))throw new Error('Kurstage sind leer, doppelt oder keine Samstage.');
console.log('-- Generated from course-data.js; additive only. Compare removed dates separately before operator-approved change.');
console.log(`-- Source SHA256 ${hash}`);
console.log('begin;');
console.log('insert into public.course_days(course_day,source_sha256) values');
console.log(dates.map(d=>`('${d}','${hash}')`).join(',\n'));
console.log('on conflict(course_day) do update set source_sha256=excluded.source_sha256;');
console.log('commit;');
