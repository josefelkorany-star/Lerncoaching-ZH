// Read-only local schema audit. No SQL mutation, no browser, no credential output.
import assert from 'node:assert/strict';
import {dependency} from '../dev-dependencies.mjs';
import {configFile,localDatabaseUrl} from './local-guard.mjs';
const c=await configFile(process.argv[2]);localDatabaseUrl(c.database_url);
const {Client}=dependency('pg'),db=new Client({connectionString:c.database_url});
try{
 await db.connect();await db.query('begin read only');
 const sessions=(await db.query("select column_name from information_schema.columns where table_schema='auth' and table_name='sessions'")).rows.map(x=>x.column_name);
 for(const column of ['id','user_id','created_at','not_after'])assert.ok(sessions.includes(column),`Auth sessions field ${column} missing`);
 const tables=['profiles','families','students','student_admin','access_grants','course_days','subjects','subject_levels','competencies','competency_levels','attendance','feedback','feedback_parent','feedback_internal','exams','appointments'];
 for(const table of tables){
  assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${table}`])).rows[0].relrowsecurity,true,`${table}: RLS`);
  for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',['authenticated',`public.${table}`,privilege])).rows[0].allowed,false,`${table}: ${privilege}`);
 }
 const admin=(await db.query('select admin_auth_id,enabled,require_staff_mfa from portal_private.settings')).rows;
 assert.equal(admin.length,1,'Exactly one manually verified first admin required');assert.equal(admin[0].require_staff_mfa,true);
 const mfa=(await db.query("select count(*)::int n from auth.mfa_factors where user_id=$1 and factor_type='totp' and status='verified'",[admin[0].admin_auth_id])).rows[0].n;
 console.log(JSON.stringify({schema:'checked',publicTablesWithRLS:tables.length,portalEnabled:admin[0].enabled,staffMFARequired:true,firstAdminVerifiedTOTP:mfa>0,authIntegration:'Run db-tests/auth-integration.mjs separately; this is not a session test.'}));
 await db.query('rollback');
}catch(error){console.error(`Schema check failed: ${error.code||error.name||'Error'}. Inspect the local schema without logging credentials.`);process.exitCode=1;}finally{await db.end();}
