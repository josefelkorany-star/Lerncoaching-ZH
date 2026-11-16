import test from 'node:test';
import assert from 'node:assert/strict';
import {startPreview} from '../preview/serve-private-preview.mjs';
test('private HTTP preview: real SQL ACLs with simulated identities, no real Auth',async t=>{
 const app=await startPreview({port:0,quiet:true});t.after(()=>app.close());let cookie='';
 const request=async(route,data,extra={})=>{const r=await fetch(app.origin+route,{method:data?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(data?{Origin:app.origin,'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 assert.equal((await request('/api/snapshot')).status,403);
 assert.equal((await request('/api/select',{user:'parent_a'},{Origin:'https://unrelated.invalid'})).status,403);
 assert.equal((await request('/_portal/db-tests/fixtures.mjs')).status,404);
 assert.equal((await request('/api/select',{user:'nonexistent'})).status,400);
 const expected={parent_a:2,parent_b:1,child_a:1,child_a_sibling:1,child_b:1,adult:1,teacher:4,admin:5,substitute:0,unassigned:0,revoked:0};
 for(const [user,count]of Object.entries(expected)){
  await request('/api/select',{user});const result=await request('/api/snapshot');assert.equal(result.status,200,user);assert.equal(result.data.students.length,count,user);
  if(!['teacher','admin'].includes(user))assert.equal(result.data.feedback_internal.length,0,`${user} internal payload`);
  if(['child_a','child_a_sibling','child_b','adult'].includes(user)){assert.equal(result.data.feedback_parent.length,0);assert.ok(result.data.appointments.every(a=>a.audience==='student'));}
 }
 await request('/api/select',{user:'parent_a'});const own={student_id:app.fixture.ids.child_a,exam_date:app.fixture.today,subject_id:app.fixture.ids.subject_a,topic:'Nur erfundener SQL-Test',exam_id:'30000000-0000-4000-8000-000000000099'};
 assert.equal((await request('/api/exam',own)).status,200);
 assert.equal((await request('/api/exam',{...own,student_id:app.fixture.ids.child_b,subject_id:app.fixture.ids.subject_b})).status,403);
 assert.equal((await request('/api/saturday',{student_id:app.fixture.ids.child_a,course_day:app.fixture.days[0],payload:{attendance:'present'}})).status,403);
 await request('/api/select',{user:'teacher'});assert.equal((await request('/api/admin',{action:'profile',payload:{id:app.fixture.users.parent_a.id,role:'admin'}})).status,403);
 await request('/api/logout',{});assert.equal((await request('/api/snapshot')).status,403);
});
