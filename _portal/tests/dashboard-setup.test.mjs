import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dependency} from '../dev-dependencies.mjs';

test('Dashboard instructions bootstrap only the confirmed first admin and preserve the disabled gate',async()=>{
  const {PGlite}=await dependency('@electric-sql/pglite');
  const db=new PGlite();
  try{
    await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean not null default false);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz,created_at timestamptz not null default now());
      create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;`);
    const folder=new URL('../supabase/migrations/',import.meta.url);
    for(const file of (await fs.readdir(folder)).filter(name=>name.endsWith('.sql')).sort())await db.exec(await fs.readFile(new URL(file,folder),'utf8'));
    const instruction=await fs.readFile(new URL('../ANLEITUNG.md',import.meta.url),'utf8');
    const template=instruction.match(/```sql\n([\s\S]*?)\n```/)[1];
    const user='00000000-0000-4000-8000-000000000099';
    const sql=template.replace('AUTH-ID-HIER',user);
    await db.query('insert into auth.users(id,email) values($1,$2)',[user,'wrong@example.invalid']);
    await assert.rejects(db.exec(sql),/bestätigte Betreiber-Mail/);await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,0);
    await db.query('update auth.users set email=$1,email_confirmed_at=now() where id=$2',['zhlerncoaching@gmail.com',user]);
    await db.exec(sql);
    assert.deepEqual((await db.query('select admin_auth_id,require_staff_mfa,enabled from portal_private.settings')).rows,[{admin_auth_id:user,require_staff_mfa:true,enabled:false}]);
    assert.deepEqual((await db.query('select username,role,active,core_team from public.profiles')).rows,[{username:'josef',role:'admin',active:true,core_team:true}]);
    await assert.rejects(db.exec(sql),/Admin bereits eingerichtet/);await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,1);
    const calendar=await fs.readFile(new URL('../supabase/course-days.generated.sql',import.meta.url),'utf8');
    await db.exec(calendar);await db.exec(calendar);
    assert.equal((await db.query('select count(*)::int n from public.course_days')).rows[0].n,60);
  }finally{await db.close();}
});
