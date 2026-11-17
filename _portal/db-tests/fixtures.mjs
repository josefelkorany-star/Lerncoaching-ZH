// Synthetic SQL fixture only. This is NOT Supabase Auth or a signed JWT session.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const bid=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const ids=Object.freeze({family_a:bid(1),family_b:bid(2),child_a:bid(11),child_a_sibling:bid(12),child_b:bid(13),adult:bid(14),exited:bid(15),subject_a:bid(21),subject_a_sibling:bid(22),subject_b:bid(23),subject_adult:bid(24),competency_a:bid(31),grant_parent_a:bid(41),grant_sibling_a:bid(42),grant_parent_b:bid(43),grant_revoked:bid(44)});
export const users=Object.freeze(Object.fromEntries([
 ['admin','Josef · Testbetreiber','admin',true],['parent_a','Eltern Familie Birke','parent',false],['parent_b','Eltern Familie Linde','parent',false],
 ['child_a','Nora Birke','student',false],['child_a_sibling','Milo Birke','student',false],['child_b','Lina Linde','student',false],
 ['adult','Alex Birke · volljährig','student',false],['teacher','Kim · Kernteam','teacher',true],['substitute','Robin · Vertretung','teacher',false],
 ['unassigned','Unzugeordnetes Testkonto','parent',false],['revoked','Entzogene Freigabe','parent',false]
].map(([key,display_name,role,core_team],i)=>[key,{id:uid(i+1),session_id:sid(i+1),username:`test.${key}`,display_name,role,core_team,aal:['admin','teacher'].includes(role)?'aal2':'aal1'}])));

export async function createTestDatabase({PGlite,courseDates}) {
 const db=new PGlite();
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean not null default false);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz,created_at timestamptz not null default now());
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
 const migrations=(await fs.readdir(path.join(dir,'../supabase/migrations'))).filter(n=>n.endsWith('.sql')).sort();
 for(const name of migrations)await db.exec(await fs.readFile(path.join(dir,'../supabase/migrations',name),'utf8'));
 for(const u of Object.values(users)){
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[u.id]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.session_id,u.id]);
  await db.query('insert into public.profiles(id,username,display_name,role,active,core_team) values($1,$2,$3,$4,true,$5)',[u.id,u.username,u.display_name,u.role,u.core_team]);
 }
 await db.query('insert into portal_private.settings(admin_auth_id,enabled) values($1,true)',[users.admin.id]);
 for(const date of courseDates)await db.query('insert into public.course_days(course_day,source_sha256) values($1,$2)',[date,'0'.repeat(64)]);
 const today=(await db.query("select portal_private.today()::text as day")).rows[0].day;
 const past=courseDates.filter(d=>d<=today).sort();
 if(past.length<3)throw new Error('Synthetic fixture needs at least three offered past course days.');
 const days=past.slice(-3),joined=past[0];
 async function asUser(key,sql,params=[],overrides={}){
  const u=users[key];
  return db.transaction(async tx=>{
   await tx.exec(`set local role ${key==='anonymous'?'anon':'authenticated'}`);
   await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(u?{sub:u.id,session_id:u.session_id,role:'authenticated',aal:u.aal,...overrides}:{role:'anon'})]);
   return tx.query(sql,params);
  });
 }
 const admin=(action,payload)=>asUser('admin','select public.admin_change($1,$2::jsonb) as result',[action,JSON.stringify(payload)]);
 await admin('family',{id:ids.family_a,label:'Familie Birke · erfunden'});await admin('family',{id:ids.family_b,label:'Familie Linde · erfunden'});
 for(const [key,family,name,level] of [['child_a','family_a','Nora Birke','5. Primarklasse'],['child_a_sibling','family_a','Milo Birke','1. Sekundarschule'],['child_b','family_b','Lina Linde','6. Primarklasse'],['adult','family_a','Alex Birke','FMS · volljährig'],['exited','family_b','Ari Linde · ausgetreten','Gymnasium']]){
  await admin('student',{id:ids[key],family_id:ids[family],display_name:name,school_level:level,joined_on:joined,left_on:key==='exited'?days[0]:null,active:key!=='exited',adult_review_on:key==='child_a_sibling'?today:null});
 }
 const grants=[['grant_parent_a','child_a','parent_a','parent'],['grant_sibling_a','child_a_sibling','parent_a','parent'],['grant_parent_b','child_b','parent_b','parent'],['grant_revoked','child_a','revoked','parent']];
 for(const [id,student,profile,kind]of grants)await admin('access_grant',{id:ids[id],student_id:ids[student],profile_id:users[profile].id,access_kind:kind,active:id!=='grant_revoked'});
 for(const key of ['child_a','child_a_sibling','child_b','adult'])await admin('access_grant',{student_id:ids[key],profile_id:users[key].id,access_kind:'self',active:true});
 for(const [key,subject,level,target]of [['child_a','subject_a',2,4],['child_a_sibling','subject_a_sibling',3,4],['child_b','subject_b',2,3],['adult','subject_adult',4,4]])await admin('subject',{id:ids[subject],student_id:ids[key],name:'Mathematik',topic:'Brüche und Gleichungen',target_level:target,active_from:joined,start_level:level});
 await admin('competency',{id:ids.competency_a,student_id:ids.child_a,name:'Lernplanung',target_level:3,active_from:joined});
 await admin('competency_level',{competency_id:ids.competency_a,course_day:days[0],level:2});
 for(const [index,day]of days.entries())await asUser('teacher','select public.record_saturday($1,$2,$3::jsonb)',[ids.child_a,day,JSON.stringify({attendance:index===1?'absent':'present',subject_id:index===1?null:ids.subject_a,topic:index===1?'':'Brüche',worked_on:index===1?'':'Aufgaben gemeinsam besprochen',went_well:index===1?'':'Lösungsweg erklärt',next_step:index===1?'':'Brüche vergleichen',arrival_review:index===1?null:true,pause_review:index===1?null:false,understanding:index===1?null:3,effort:index===1?null:4,new_level:index===1?null:3,internal_note:index===1?'':'INTERNE TESTNOTIZ – nur Team',parent_note:index===1?'':'ELTERNTESTNOTIZ – nicht Schülerkonto'})]);
 await asUser('teacher','select public.record_saturday($1,$2,$3::jsonb)',[ids.child_a_sibling,days.at(-1),JSON.stringify({attendance:'present'})]);
 await asUser('teacher','select public.record_saturday($1,$2,$3::jsonb)',[ids.child_b,days.at(-1),JSON.stringify({attendance:'absent'})]);
 const examDate=new Date(`${today}T12:00:00Z`);examDate.setUTCDate(examDate.getUTCDate()+3);
 await asUser('parent_a','select public.report_exam($1,$2,$3,$4,$5)',[ids.child_a,examDate.toISOString().slice(0,10),ids.subject_a,'Angekündigte Bruchprüfung',bid(61)]);
 await admin('appointment',{id:bid(71),student_id:ids.child_a,appointment_date:examDate.toISOString().slice(0,10),title:'Material für den nächsten Samstag bereitlegen',audience:'student'});
 await admin('appointment',{id:bid(72),student_id:ids.child_a,appointment_date:examDate.toISOString().slice(0,10),title:'ELTERNTERMIN – persönlicher Austausch',audience:'parent'});
 return {db,users,ids,days,today,asUser};
}
