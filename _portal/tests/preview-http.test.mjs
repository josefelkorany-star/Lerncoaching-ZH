import test from 'node:test';
import assert from 'node:assert/strict';
import {startPreview} from '../preview/serve-private-preview.mjs';
import {deriveStudent,deriveTeam} from '../../portal-model.js';
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
 // The two requested acceptance cases use the same private HTTP/SQL path as the supplied preview.
 const latest=app.fixture.days.at(-1),student=app.fixture.ids.child_a_sibling;
 let snap=(await request('/api/snapshot')).data;
 const history=deriveStudent(snap,app.fixture.ids.child_a,app.fixture.today,globalThis.LCCourseData.dates).history;
 const absentIndex=history.findIndex(p=>p.date===app.fixture.days[1]);
 assert.equal(history[absentIndex].value,null);assert.equal(history[absentIndex].status,'absent');
 assert.ok(history[absentIndex-1].value!==null&&history[absentIndex+1].value!==null);
 const team=()=>deriveTeam(snap,app.fixture.today,globalThis.LCCourseData.dates);
 const countBefore=team().feedbackCount;
 assert.equal(team().rows.find(r=>r.id===student).feedbackStatus,'Da, Feedback offen');
 assert.equal((await request('/api/saturday',{student_id:student,course_day:latest,payload:{attendance:'present'}})).status,200);
 snap=(await request('/api/snapshot')).data;
 assert.ok(!snap.feedback.some(r=>r.student_id===student&&r.course_day===latest));assert.equal(team().feedbackCount,countBefore);
 assert.equal((await request('/api/saturday',{student_id:student,course_day:latest,payload:{attendance:'present',internal_note:'Erfundene interne Beobachtung'}})).status,200);
 snap=(await request('/api/snapshot')).data;assert.equal(team().rows.find(r=>r.id===student).feedbackStatus,'Da, Feedback offen');assert.equal(team().feedbackCount,countBefore);
 assert.equal((await request('/api/saturday',{student_id:student,course_day:latest,payload:{attendance:'present',worked_on:'Erfundene Aufgabe',next_step:'Erfundener nächster Schritt'}})).status,200);
 snap=(await request('/api/snapshot')).data;assert.equal(team().rows.find(r=>r.id===student).feedbackStatus,'Feedback erfasst');assert.equal(team().feedbackCount,countBefore+1);
 assert.equal((await request('/api/accounts',{action:'create',request_id:crypto.randomUUID(),username:'test.new',display_name:'Erfunden',role:'parent'})).status,403);
 await request('/api/select',{user:'admin'});
 const account={action:'create',request_id:crypto.randomUUID(),username:'test.new',display_name:'Erfundener Testzugang',role:'parent'};
 const created=await request('/api/accounts',account);assert.equal(created.status,200);assert.equal(created.data.ok,true);assert.ok(created.data.initial_password.length>=24);
 const replay=await request('/api/accounts',account);assert.equal(replay.data.replayed,true);assert.equal(replay.data.initial_password,undefined);
 snap=(await request('/api/snapshot')).data;const profile=snap.profiles.find(p=>p.username==='test.new');assert.ok(profile);assert.equal(profile.active,false);
 for(const action of ['enable','disable','reset']){
  const result=await request('/api/accounts',{action,request_id:crypto.randomUUID(),profile_id:profile.id});assert.equal(result.status,200,action);
  snap=(await request('/api/snapshot')).data;assert.equal(snap.profiles.find(p=>p.id===profile.id).active,action==='enable');
 }
 await request('/api/logout',{});assert.equal((await request('/api/snapshot')).status,403);
});
