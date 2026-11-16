// Real PostgreSQL engine and RLS; simulated auth schema/claims, NOT Auth integration.
import test from 'node:test';
import assert from 'node:assert/strict';
import {dependency} from '../dev-dependencies.mjs';
import {createTestDatabase,ids,users} from './fixtures.mjs';
await import('../../course-data.js');
const {PGlite}=dependency('@electric-sql/pglite');
const dates=globalThis.LCCourseData.dates;
async function fixture(fn){const e=await createTestDatabase({PGlite,courseDates:dates});try{await fn(e);}finally{await e.db.close();}}
const snapshot=async(e,key,claims)=>(await e.asUser(key,'select public.get_portal_snapshot() as data',[],claims)).rows[0].data;
const admin=(e,action,payload)=>e.asUser('admin','select public.admin_change($1,$2::jsonb)',[action,JSON.stringify(payload)]);
const saturday=(e,key,payload,student=ids.child_a,day=e.days.at(-1))=>e.asUser(key,'select public.record_saturday($1,$2,$3::jsonb)',[student,day,JSON.stringify(payload)]);
const exam=(e,key,student,subject,id='30000000-0000-4000-8000-000000000001')=>e.asUser(key,'select public.report_exam($1,$2,$3,$4,$5)',[student,e.today,subject,'Erfundene Prüfung',id]);
const deny=async(p)=>assert.rejects(p,error=>['42501','22023','23514','23502','23503','23505'].includes(error.code), 'Expected database rejection');

test('Parents read only explicit children; no family or adult inheritance',()=>fixture(async e=>{
 const a=await snapshot(e,'parent_a'),b=await snapshot(e,'parent_b');
 assert.deepEqual(a.students.map(x=>x.id).sort(),[ids.child_a,ids.child_a_sibling].sort());
 assert.deepEqual(b.students.map(x=>x.id),[ids.child_b]);
 assert.equal(a.feedback_internal.length,0);assert.ok(a.feedback_parent.length>0);
 assert.equal(a.families.length,0);assert.equal(a.access_grants.length,0);
 assert.ok(a.students.every(x=>!('family_id'in x)&&!('adult_review_on'in x)));
 assert.equal((await e.asUser('parent_a','select id from public.students where id=$1',[ids.child_b])).rows.length,0);
 await deny(e.asUser('parent_a','select family_id from public.students'));
 await deny(e.asUser('parent_a','select created_by from public.feedback'));
}));
test('Students see only themselves; no siblings, parent notes, parent appointments or internal notes',()=>fixture(async e=>{
 for(const key of ['child_a','child_a_sibling','child_b','adult']){
  const s=await snapshot(e,key);assert.deepEqual(s.students.map(x=>x.id),[ids[key]]);
  assert.equal(s.feedback_parent.length,0);assert.equal(s.feedback_internal.length,0);
  assert.ok(s.appointments.every(x=>x.audience==='student'));
 }
 assert.equal((await e.asUser('child_a','select note from public.feedback_parent')).rows.length,0);
 assert.equal((await e.asUser('child_a','select note from public.feedback_internal')).rows.length,0);
 await deny(exam(e,'child_a',ids.child_a,ids.subject_a));
}));
test('Active core team can coach; substitute, unassigned and revoked grants cannot',()=>fixture(async e=>{
 const staff=await snapshot(e,'teacher');assert.equal(staff.students.length,4);assert.ok(staff.feedback_internal.length>0);
 for(const key of ['substitute','unassigned','revoked']){const s=await snapshot(e,key);assert.equal(s.students.length,0);assert.equal(s.feedback.length,0);assert.equal(s.appointments.length,0);}
 await deny(e.asUser('teacher','select public.admin_change($1,$2::jsonb)',['family',JSON.stringify({label:'No'})]));
 await deny(saturday(e,'substitute',{attendance:'present'}));
 await deny(saturday(e,'teacher',{attendance:'present'},ids.exited));
 await deny(e.asUser('teacher',"update public.profiles set role='admin' where id=$1",[users.teacher.id]));
}));
test('Admin management is explicit; renamed logins, admin-role delegation and misbound grants rejected',()=>fixture(async e=>{
 const s=await snapshot(e,'admin');assert.equal(s.students.length,5);assert.ok(s.students.every(x=>'family_id'in x&&'adult_review_on'in x));
 assert.ok(s.families.length===2);assert.equal(s.profiles.length,Object.keys(users).length);
 await deny(admin(e,'profile',{...users.parent_a,role:'admin'}));
 await deny(admin(e,'profile',{id:users.parent_a.id,username:'changed.login',display_name:'Parent',role:'parent',active:true,core_team:false}));
 await deny(admin(e,'access_grant',{id:ids.grant_parent_a,student_id:ids.child_b,profile_id:users.parent_a.id,access_kind:'parent'}));
 await admin(e,'revoke_access',{id:ids.grant_parent_a});assert.equal((await snapshot(e,'parent_a')).students.length,1);
 await admin(e,'access_grant',{student_id:ids.child_a,profile_id:users.parent_a.id,access_kind:'parent'});
 assert.equal((await snapshot(e,'parent_a')).students.length,2);
 assert.equal((await e.db.query('select count(*)::int as n from public.access_grants where student_id=$1 and profile_id=$2',[ids.child_a,users.parent_a.id])).rows[0].n,1);
 for(const action of ['revoke_access','close_subject','close_competency','delete_appointment'])await deny(admin(e,action,{id:'30000000-0000-4000-8000-000000000999',...(action.startsWith('close')?{active_until:e.today}:{})}));
}));
test('Parent exam write is scoped and idempotent; foreign child and subject rejected',()=>fixture(async e=>{
 await exam(e,'parent_a',ids.child_a,ids.subject_a);await exam(e,'parent_a',ids.child_a,ids.subject_a);
 assert.equal((await e.db.query('select count(*)::int n from public.exams where id=$1',['30000000-0000-4000-8000-000000000001'])).rows[0].n,1);
 const x=(await e.db.query('select created_by,updated_by from public.exams where id=$1',['30000000-0000-4000-8000-000000000001'])).rows[0];assert.equal(x.created_by,users.parent_a.id);assert.equal(x.updated_by,users.parent_a.id);
 await deny(exam(e,'parent_a',ids.child_b,ids.subject_b));await deny(exam(e,'parent_a',ids.child_a,ids.subject_b));
 await deny(saturday(e,'parent_a',{attendance:'present'}));
 await deny(e.asUser('parent_a','delete from public.exams'));
 await deny(e.asUser('parent_a','insert into public.exams(id,student_id,exam_date,subject_id,subject,topic,created_by,updated_by) values(gen_random_uuid(),$1,current_date,$2,$3,$4,$5,$5)',[ids.child_a,ids.subject_a,'Maths','Spoof',users.teacher.id]));
}));
test('Saturday writes are atomic, idempotent and use server authors; null observations stay unknown',()=>fixture(async e=>{
 const p={attendance:'present',subject_id:ids.subject_a,worked_on:'Test',arrival_review:null,pause_review:null,understanding:null,effort:null,new_level:4};
 await saturday(e,'teacher',p);await saturday(e,'teacher',p);
 const row=(await e.db.query('select * from public.feedback where student_id=$1 and course_day=$2',[ids.child_a,e.days.at(-1)])).rows[0];
 assert.equal(row.arrival_review,null);assert.equal(row.pause_review,null);assert.equal(row.understanding,null);assert.equal(row.effort,null);assert.equal(row.updated_by,users.teacher.id);
 assert.equal((await e.db.query('select count(*)::int n from public.subject_levels where subject_id=$1 and course_day=$2',[ids.subject_a,e.days.at(-1)])).rows[0].n,1);
 await deny(saturday(e,'teacher',{...p,author_id:users.admin.id}));
 await deny(saturday(e,'teacher',{...p,understanding:8}));
 const preserved=(await e.db.query('select understanding from public.feedback where student_id=$1 and course_day=$2',[ids.child_a,e.days.at(-1)])).rows[0];assert.equal(preserved.understanding,null);
 await deny(saturday(e,'teacher',{...p,subject_id:ids.subject_b}));await deny(saturday(e,'teacher',{...p,new_level:0}));
 await deny(saturday(e,'teacher',{...p},ids.child_a,'2027-01-02'));await deny(saturday(e,'teacher',{...p},ids.child_a,'2027-01-09'));
 const sunday=new Date(e.days.at(-1)+'T12:00Z');sunday.setUTCDate(sunday.getUTCDate()+1);
 await deny(admin(e,'competency_level',{competency_id:ids.competency_a,course_day:sunday.toISOString().slice(0,10),level:4}));
 await deny(admin(e,'competency_level',{competency_id:ids.competency_a,course_day:'2027-01-02',level:4}));
 await deny(admin(e,'competency_level',{competency_id:ids.competency_a,course_day:e.days[1],level:4}));
 await saturday(e,'teacher',{attendance:'absent'});
 for(const table of ['feedback','feedback_parent','feedback_internal','subject_levels','competency_levels'])assert.equal((await e.db.query(`select count(*)::int n from public.${table} where student_id=$1 and course_day=$2`,[ids.child_a,e.days.at(-1)])).rows[0].n,0);
 await deny(saturday(e,'teacher',{attendance:'absent',internal_note:'Unobserved'}));
 assert.equal((await e.db.query('select status from public.attendance where student_id=$1 and course_day=$2',[ids.child_a,e.days.at(-1)])).rows[0].status,'absent');
}));
test('Subject periods preserve history and reject overlapping, retroactive activation or closure',()=>fixture(async e=>{
 const old=(await e.db.query('select * from public.subjects where id=$1',[ids.subject_a])).rows[0];
 await deny(admin(e,'subject',{student_id:ids.child_a,name:'Mathematik',active_from:e.today,target_level:4}));
 await deny(admin(e,'subject',{student_id:ids.child_a,name:'Deutsch',active_from:e.days[0],target_level:4}));
 await deny(admin(e,'close_subject',{id:ids.subject_a,active_until:e.days[0]}));
 await admin(e,'close_subject',{id:ids.subject_a,active_until:e.today});
 const tomorrow=new Date(e.today+'T12:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 await admin(e,'subject',{student_id:ids.child_a,name:'Mathematik',active_from:tomorrow.toISOString().slice(0,10),target_level:5});
 const after=(await e.db.query('select * from public.subjects where id=$1',[ids.subject_a])).rows[0];assert.equal(after.active_from.getTime(),old.active_from.getTime());assert.equal(after.target_level,old.target_level);
 assert.equal((await e.db.query('select count(*)::int n from public.subject_levels where subject_id=$1',[ids.subject_a])).rows[0].n,3);
}));
test('Revocations and exits affect already-issued claims immediately',()=>fixture(async e=>{
 await admin(e,'revoke_access',{id:ids.grant_parent_a});assert.equal((await snapshot(e,'parent_a')).students.some(x=>x.id===ids.child_a),false);
 await e.db.query('update public.students set active=false where id=$1',[ids.child_a_sibling]);assert.equal((await snapshot(e,'parent_a')).students.length,0);
 assert.equal((await snapshot(e,'child_a_sibling')).students.length,0);
 await e.db.query('update public.students set left_on=$1 where id=$2',[e.days[0],ids.child_b]);assert.equal((await snapshot(e,'parent_b')).students.length,0);
 await e.db.query('update public.profiles set active=false where id=$1',[users.teacher.id]);await deny(snapshot(e,'teacher'));
 const whileDisabled='40000000-0000-4000-8000-000000000002';await e.db.query('insert into auth.sessions(id,user_id) values($1,$2)',[whileDisabled,users.teacher.id]);
 await e.db.query('update public.profiles set active=true where id=$1',[users.teacher.id]);await deny(snapshot(e,'teacher'));
 await deny(snapshot(e,'teacher',{session_id:whileDisabled}));
 const exact='40000000-0000-4000-8000-000000000003';await e.db.query('insert into auth.sessions(id,user_id,created_at) select $1,id,sessions_valid_after from public.profiles where id=$2',[exact,users.teacher.id]);
 await deny(snapshot(e,'teacher',{session_id:exact}));
 // Explicit synthetic chronology; never rely on timer sleeps or millisecond clock resolution.
 const fresh='40000000-0000-4000-8000-000000000001';await e.db.query("insert into auth.sessions(id,user_id,created_at) select $1,id,sessions_valid_after+interval '1 microsecond' from public.profiles where id=$2",[fresh,users.teacher.id]);
 assert.ok((await snapshot(e,'teacher',{session_id:fresh})).students.length>0);
}));
test('Server role, MFA, Auth session existence and expiry are checked independently of frontend claims',()=>fixture(async e=>{
 await assert.rejects(snapshot(e,'admin',{aal:'aal1'}),/MFA_REQUIRED/);await assert.rejects(snapshot(e,'teacher',{aal:'aal1'}),/MFA_REQUIRED/);
 const s=await snapshot(e,'parent_a',{app_metadata:{role:'admin'},user_metadata:{role:'admin'},aal:'aal2'});assert.equal(s.profile.role,'parent');assert.equal(s.students.length,2);
 await deny(snapshot(e,'parent_a',{session_id:users.admin.session_id}));
 await e.db.query('delete from auth.sessions where id=$1',[users.parent_a.session_id]);await deny(snapshot(e,'parent_a'));
 await e.db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[users.parent_b.session_id]);await deny(snapshot(e,'parent_b'));
 await e.db.query('update portal_private.settings set enabled=false');await deny(snapshot(e,'admin'));await deny(snapshot(e,'child_a'));
}));
test('Anonymous and direct mutation paths denied; every public table has RLS',()=>fixture(async e=>{
 await deny(snapshot(e,'anonymous'));await deny(e.asUser('anonymous','select id from public.students'));await deny(e.asUser('parent_a','select * from portal_private.settings'));
 const rows=(await e.db.query("select tablename from pg_tables where schemaname='public'")).rows;
 for(const {tablename}of rows){
  assert.equal((await e.db.query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${tablename}`])).rows[0].relrowsecurity,true);
  for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await e.db.query('select has_table_privilege($1,$2,$3) as allowed',['authenticated',`public.${tablename}`,privilege])).rows[0].allowed,false);
 }
 const unsafe=(await e.db.query("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and prokind='f' and has_function_privilege('anon',p.oid,'EXECUTE')")).rows;assert.deepEqual(unsafe,[]);
}));
