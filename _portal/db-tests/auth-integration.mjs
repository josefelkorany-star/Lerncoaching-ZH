/** Required acceptance gate, NOT run by the PGlite tests.
 * Run only on a fresh isolated LOCAL Supabase stack with no real accounts/data.
 * Actual GoTrue login, signed sessions, TOTP MFA and PostgREST with application key.
 * Leaves synthetic fixtures for inspection; never deletes existing data.
 */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHmac,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {dependency} from '../dev-dependencies.mjs';
import {configFile,privatePath,localDatabaseUrl} from '../operator/local-guard.mjs';
import {users,ids} from './fixtures.mjs';
import {createAccountHandler} from '../supabase/functions/portal-accounts/index.ts';
await import('../../course-data.js');
const {createClient}=dependency('@supabase/supabase-js');
const {Client}=dependency('pg');
const c=await configFile(process.argv[2]);
localDatabaseUrl(c.database_url);
const db=new Client({connectionString:c.database_url});
const localFetch=(input,init={})=>fetch(input,{...init,redirect:'error'});
const client=key=>createClient(c.url,key,{global:{fetch:localFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const service=client(c.service_role_key),sessions={},actual={},passwords={};
// The handler runs locally against the real isolated GoTrue/PostgREST stack.
// This does not claim a deployed Edge gateway/CORS acceptance pass.
const accountHandler=createAccountHandler({config:{url:c.url,publishableKey:c.anon_key,serviceRoleKey:c.service_role_key,allowedOrigin:'http://127.0.0.1:4177',aliasDomain:'example.invalid',adminEmail:'zhlerncoaching@gmail.com'}});
let checks=0;
const ok=async(label,fn)=>{await fn();checks++;console.log(`PASS ${label}`);};
const check=({data,error})=>{if(error)throw new Error(`Anfrage abgewiesen (${error.code||error.status||'unbekannt'}).`);return data;};
const denied=result=>assert.ok(result.error,'Expected request to be rejected');
const snap=async key=>check(await sessions[key].rpc('get_portal_snapshot'));
const admin=async(action,payload)=>check(await sessions.admin.rpc('admin_change',{p_action:action,p_payload:payload}));
const account=async(action,payload,request_id=randomUUID(),key='admin')=>{
 const token=check(await sessions[key].auth.getSession()).session.access_token;
 const response=await accountHandler(new Request(c.url+'/functions/v1/portal-accounts',{method:'POST',headers:{Origin:'http://127.0.0.1:4177',Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,request_id,...payload})}));
 const result=await response.json();assert.equal(response.status,200,`Account action failed (${result.code||'unknown'}).`);return result;
};
const dayplus=(date,n)=>{const d=new Date(`${date}T12:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
function totp(secret){let bits='';for(const s of secret.toUpperCase().replace(/=+$/,''))bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(s).toString(2).padStart(5,'0');const bytes=Buffer.from((bits.match(/.{8}/g)||[]).map(x=>parseInt(x,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',bytes).update(counter).digest(),i=h.at(-1)&15;return String((h.readUInt32BE(i)&0x7fffffff)%1000000).padStart(6,'0');}
try{
 await db.connect();
 const present=await db.query("select to_regclass('public.profiles') as table");
 if(!present.rows[0].table)throw new Error('Portal-Migration zuerst auf isoliertem Stack anwenden.');
 if(Number((await db.query('select count(*) from public.profiles')).rows[0].count)||Number((await db.query('select count(*) from auth.users')).rows[0].count))throw new Error('Test benötigt eine leere isolierte Datenbank. Bestehende Konten bleiben unberührt.');
 await ok('Public sign-up and anonymous sign-in disabled',async()=>{
  denied(await client(c.anon_key).auth.signUp({email:'forbidden@example.invalid',password:randomBytes(24).toString('base64url')}));
  denied(await client(c.anon_key).auth.signInAnonymously());
 });
 // Auth admin is held only by this local Node process; every portal action below uses anon key + real session.
 for(const [key,u]of Object.entries(users)){
  const password=randomBytes(24).toString('base64url'),email=key==='admin'?'zhlerncoaching@gmail.com':`${u.username}@example.invalid`;
  const result=check(await service.auth.admin.createUser({email,password,email_confirm:true}));
  actual[key]={...u,id:result.user.id};passwords[key]=password;
  const s=client(c.anon_key);check(await s.auth.signInWithPassword({email,password}));sessions[key]=s;
  await db.query('insert into public.profiles(id,username,display_name,role,active,core_team) values($1,$2,$3,$4,true,$5)',[result.user.id,u.username,u.display_name,u.role,u.core_team]);
 }
 await db.query('insert into portal_private.settings(admin_auth_id,require_staff_mfa,enabled) values($1,true,true)',[actual.admin.id]);
 await ok('Privileged AAL1 session denied by database',async()=>{
  const x=await sessions.admin.rpc('get_portal_snapshot');denied(x);assert.match(x.error.message,/MFA_REQUIRED/);
 });
 for(const key of ['admin','teacher','substitute']){
  const enrolled=check(await sessions[key].auth.mfa.enroll({factorType:'totp',friendlyName:'Synthetic local test'}));
  check(await sessions[key].auth.mfa.challengeAndVerify({factorId:enrolled.id,code:totp(enrolled.totp.secret)}));
 }
 await ok('Real TOTP MFA allows designated admin AAL2',async()=>assert.equal((await snap('admin')).profile.role,'admin'));
 const courseDates=globalThis.LCCourseData.dates;
 const sha=createHash('sha256').update(await fs.readFile(new URL('../../course-data.js',import.meta.url))).digest('hex');
 for(const date of courseDates)await db.query('insert into public.course_days(course_day,source_sha256) values($1,$2) on conflict do nothing',[date,sha]);
 const today=(await db.query("select portal_private.today()::text day")).rows[0].day;
 const last=courseDates.filter(d=>d<=today).sort().at(-1),joined=courseDates.filter(d=>d<=today).sort()[0];
 if(!last)throw new Error('Keine erreichten Kurstage für synthetischen Test vorhanden.');
 await admin('family',{id:ids.family_a,label:'Birke · synthetisch'});await admin('family',{id:ids.family_b,label:'Linde · synthetisch'});
 for(const key of ['child_a','child_a_sibling','child_b','adult','exited'])await admin('student',{id:ids[key],family_id:key==='child_b'||key==='exited'?ids.family_b:ids.family_a,display_name:`${key} · erfunden`,school_level:'Teststufe',joined_on:joined,active:key!=='exited'});
 for(const [student,profile,kind]of [['child_a','parent_a','parent'],['child_a_sibling','parent_a','parent'],['child_b','parent_b','parent'],['child_a','revoked','parent'],...['child_a','child_a_sibling','child_b','adult'].map(k=>[k,k,'self'])])await admin('access_grant',{...(profile==='revoked'?{id:ids.grant_revoked}:{}),student_id:ids[student],profile_id:actual[profile].id,access_kind:kind,active:profile!=='revoked'});
 for(const [child,subject]of [['child_a','subject_a'],['child_a_sibling','subject_a_sibling'],['child_b','subject_b'],['adult','subject_adult']])await admin('subject',{id:ids[subject],student_id:ids[child],name:'Mathematik',active_from:joined,start_level:2,target_level:4});
 const saturday={p_student_id:ids.child_a,p_course_day:last,p_payload:{attendance:'present',subject_id:ids.subject_a,worked_on:'Synthetischer Unterricht',arrival_review:null,pause_review:false,understanding:3,effort:4,new_level:3,parent_note:'PARENT_ONLY_MARKER',internal_note:'INTERNAL_ONLY_MARKER'}};
 check(await sessions.teacher.rpc('record_saturday',saturday));
 await admin('appointment',{student_id:ids.child_a,appointment_date:dayplus(today,2),title:'PARENT_ONLY_MARKER',audience:'parent'});
 await ok('Parents read exactly assigned children, no unrelated family or adult inheritance',async()=>{
  assert.deepEqual((await snap('parent_a')).students.map(s=>s.id).sort(),[ids.child_a,ids.child_a_sibling].sort());assert.deepEqual((await snap('parent_b')).students.map(s=>s.id),[ids.child_b]);
  const foreign=check(await sessions.parent_a.from('students').select('id').eq('id',ids.child_b));assert.deepEqual(foreign,[]);
  denied(await sessions.parent_a.from('students').select('family_id'));
 });
 await ok('Separate sibling/adult sessions; parent-only and internal payloads hidden from children',async()=>{
  for(const key of ['child_a','child_a_sibling','child_b','adult']){const d=await snap(key);assert.deepEqual(d.students.map(s=>s.id),[ids[key]]);assert.equal(d.feedback_parent.length,0);assert.equal(d.feedback_internal.length,0);assert.equal(JSON.stringify(d).includes('PARENT_ONLY_MARKER'),false);assert.equal(JSON.stringify(d).includes('INTERNAL_ONLY_MARKER'),false);}
  const parent=await snap('parent_a');assert.equal(parent.feedback_internal.length,0);assert.equal(JSON.stringify(parent).includes('INTERNAL_ONLY_MARKER'),false);assert.ok(parent.feedback_parent.length);
  assert.deepEqual(check(await sessions.parent_a.from('feedback_internal').select('note')),[]);
 });
 const examId=randomUUID(),exam={p_student_id:ids.child_a,p_exam_date:dayplus(today,3),p_subject_id:ids.subject_a,p_topic:'Erfundene Prüfung',p_exam_id:examId};
 await ok('Parent report and repeat succeed only for assigned child; student and foreign child writes denied',async()=>{
  check(await sessions.parent_a.rpc('report_exam',exam));check(await sessions.parent_a.rpc('report_exam',exam));
  assert.equal((await db.query('select count(*)::int n from public.exams where id=$1',[examId])).rows[0].n,1);
  denied(await sessions.parent_b.rpc('report_exam',exam));denied(await sessions.child_a.rpc('report_exam',exam));denied(await sessions.parent_a.rpc('report_exam',{...exam,p_subject_id:ids.subject_b}));
  denied(await sessions.parent_a.rpc('record_saturday',saturday));denied(await sessions.parent_a.from('students').update({display_name:'NO'}).eq('id',ids.child_a));
 });
 await ok('Core team may coach active children, cannot assign roles; substitutes receive no learning data',async()=>{
  assert.equal((await snap('teacher')).students.length,4);assert.ok((await snap('teacher')).feedback_internal.length);
  denied(await sessions.teacher.rpc('admin_change',{p_action:'profile',p_payload:{id:actual.teacher.id,role:'admin'}}));
  for(const key of ['substitute','unassigned','revoked'])assert.equal((await snap(key)).students.length,0);
  denied(await sessions.substitute.rpc('record_saturday',saturday));denied(await sessions.teacher.rpc('record_saturday',{...saturday,p_student_id:ids.exited}));
 });
 await ok('Saturday retry is unique, spoofed author denied, invalid rating rolls back',async()=>{
  check(await sessions.teacher.rpc('record_saturday',saturday));
  assert.equal((await db.query('select count(*)::int n from public.attendance where student_id=$1 and course_day=$2',[ids.child_a,last])).rows[0].n,1);
  denied(await sessions.teacher.rpc('record_saturday',{...saturday,p_payload:{...saturday.p_payload,created_by:actual.admin.id}}));
  denied(await sessions.teacher.rpc('record_saturday',{...saturday,p_payload:{...saturday.p_payload,understanding:9}}));
  const row=(await db.query('select updated_by,understanding from public.feedback where student_id=$1 and course_day=$2',[ids.child_a,last])).rows[0];assert.equal(row.updated_by,actual.teacher.id);assert.equal(row.understanding,3);
 });
 await ok('Withdrawn child grant and departure immediately restrict existing signed sessions',async()=>{
  const grant=(await snap('admin')).access_grants.find(g=>g.profile_id===actual.parent_a.id&&g.student_id===ids.child_a);
  await admin('revoke_access',{id:grant.id});assert.equal((await snap('parent_a')).students.some(s=>s.id===ids.child_a),false);
  await admin('access_grant',{student_id:ids.child_a,profile_id:actual.parent_a.id,access_kind:'parent'});
  await admin('student',{id:ids.child_b,family_id:ids.family_b,display_name:'child_b · erfunden',school_level:'Teststufe',joined_on:joined,active:false});
  assert.equal((await snap('parent_b')).students.length,0);assert.equal((await snap('child_b')).students.length,0);
 });
 await ok('Editable Auth metadata never grants a role',async()=>{
  check(await sessions.parent_a.auth.updateUser({data:{role:'admin',core_team:true}}));assert.equal((await snap('parent_a')).profile.role,'parent');
  denied(await sessions.parent_a.rpc('admin_change',{p_action:'family',p_payload:{label:'NO'}}));
 });
 await ok('First handover: individual password login and own password change',async()=>{
  const next=randomBytes(24).toString('base64url');check(await sessions.parent_a.auth.updateUser({password:next}));
  denied(await client(c.anon_key).auth.signInWithPassword({email:`${users.parent_a.username}@example.invalid`,password:passwords.parent_a}));
  const fresh=client(c.anon_key);check(await fresh.auth.signInWithPassword({email:`${users.parent_a.username}@example.invalid`,password:next}));assert.equal((check(await fresh.rpc('get_portal_snapshot'))).students.length,2);passwords.parent_a=next;
 });
 await ok('Local Edge handler reset disables account; old signed/refresh sessions fail after audited reactivation',async()=>{
  await account('disable',{profile_id:actual.parent_a.id});
  const duringInactive=client(c.anon_key);check(await duringInactive.auth.signInWithPassword({email:`${users.parent_a.username}@example.invalid`,password:passwords.parent_a}));
  denied(await duringInactive.rpc('get_portal_snapshot'));
  const resetId=randomUUID(),resetResult=await account('reset',{profile_id:actual.parent_a.id},resetId),reset=resetResult.initial_password;
  assert.match(reset,/^[A-Za-z0-9_-]{32}$/);assert.equal('initial_password'in await account('reset',{profile_id:actual.parent_a.id},resetId),false);
  denied(await sessions.parent_a.rpc('get_portal_snapshot'));
  denied(await duringInactive.rpc('get_portal_snapshot'));
  denied(await sessions.admin.rpc('admin_change',{p_action:'profile',p_payload:{id:actual.parent_a.id,username:users.parent_a.username,display_name:users.parent_a.display_name,role:'parent',active:true,core_team:false}}));
  await account('enable',{profile_id:actual.parent_a.id});
  denied(await sessions.parent_a.rpc('get_portal_snapshot'));
  denied(await duringInactive.rpc('get_portal_snapshot'));
  const refreshed=await sessions.parent_a.auth.refreshSession();if(!refreshed.error)denied(await sessions.parent_a.rpc('get_portal_snapshot'));
  denied(await client(c.anon_key).auth.signInWithPassword({email:`${users.parent_a.username}@example.invalid`,password:passwords.parent_a}));
  const fresh=client(c.anon_key);check(await fresh.auth.signInWithPassword({email:`${users.parent_a.username}@example.invalid`,password:reset}));assert.equal(check(await fresh.rpc('get_portal_snapshot')).students.length,2);check(await fresh.auth.signOut({scope:'global'}));
 });
 await ok('Anonymous access and signed token after global sign-out fail',async()=>{
  denied(await client(c.anon_key).rpc('get_portal_snapshot'));denied(await client(c.anon_key).from('students').select('id'));
  const session=check(await sessions.child_a.auth.getSession()).session,token=session.access_token;
  check(await sessions.child_a.auth.signOut({scope:'global'}));
  const result=await localFetch(c.url+'/rest/v1/rpc/get_portal_snapshot',{method:'POST',headers:{apikey:c.anon_key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});assert.equal(result.ok,false);
 });
 const report={boundary:'Real local Supabase Auth/PostgREST; no production data',status:'passed',checks,at:new Date().toISOString()};
 if(process.argv[3])await fs.writeFile(privatePath(process.argv[3]),JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(`PASS ${checks} actual local Auth/PostgREST checks. Synthetic fixtures remain in this isolated stack.`);
}catch(error){console.error(`FAIL after ${checks} checks: ${error.code||error.name||'Error'}. Inspect locally; secret-bearing response details are deliberately omitted.`);process.exitCode=1;}
finally{for(const s of Object.values(sessions))try{await s.auth.signOut({scope:'global'});}catch{}await db.end();}
