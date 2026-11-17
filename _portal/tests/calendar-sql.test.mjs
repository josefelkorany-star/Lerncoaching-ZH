import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

test('Dashboard calendar SQL contains exactly the current source dates and hash', async()=>{
  const source=await fs.readFile(new URL('../../course-data.js',import.meta.url));
  const sql=await fs.readFile(new URL('../supabase/course-days.generated.sql',import.meta.url),'utf8');
  const context={};vm.runInNewContext(source.toString('utf8'),context);
  const dates=Array.from(context.LCCourseData.dates).sort();
  const hash=createHash('sha256').update(source).digest('hex');
  const rows=[...sql.matchAll(/\('(\d{4}-\d{2}-\d{2})','([a-f0-9]{64})'\)/g)];
  assert.deepEqual(rows.map(row=>row[1]),dates);
  assert.equal(rows.length,new Set(dates).size);
  assert.ok(rows.every(row=>row[2]===hash));
  assert.match(sql,new RegExp('Source SHA256 '+hash));
  assert.match(sql,/on conflict\(course_day\) do update set source_sha256=excluded.source_sha256;/);
  assert.doesNotMatch(sql,/\b(delete|truncate|drop)\b/i);
});
