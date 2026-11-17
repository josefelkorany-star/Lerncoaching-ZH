-- New isolated portal database only. No users, real data, keys or calendar seed.
begin;
create schema if not exists portal_private;
revoke all on schema portal_private from public, anon, authenticated;
grant usage on schema portal_private to authenticated;

create table portal_private.settings (
  singleton boolean primary key default true check(singleton),
  admin_auth_id uuid not null unique references auth.users(id),
  require_staff_mfa boolean not null default true,
  enabled boolean not null default false
);
revoke all on portal_private.settings from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique check(username ~ '^[a-z0-9][a-z0-9._-]{2,31}$' and position('..' in username)=0),
  display_name text not null check(length(trim(display_name)) between 1 and 120),
  role text not null check(role in ('parent','student','teacher','admin')),
  active boolean not null default false,
  core_team boolean not null default false,
  sessions_valid_after timestamptz not null default '-infinity',
  created_at timestamptz not null default now(),
  check(not core_team or role in ('teacher','admin'))
);
create table public.families (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(trim(label)) between 1 and 120)
);
create table public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id),
  display_name text not null check(length(trim(display_name)) between 1 and 120),
  school_level text not null check(length(trim(school_level)) between 1 and 100),
  joined_on date not null,
  left_on date,
  active boolean not null default true,
  check(left_on is null or left_on >= joined_on)
);
create table public.student_admin (
  student_id uuid primary key references public.students(id) on delete restrict,
  adult_review_on date
);
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  access_kind text not null check(access_kind in ('parent','self')),
  active boolean not null default true,
  unique(student_id,profile_id,access_kind)
);
create unique index one_self_student on public.access_grants(profile_id) where access_kind='self' and active;
create index grants_student on public.access_grants(student_id,profile_id) where active;

create table public.course_days (
  course_day date primary key check(extract(dow from course_day)=6),
  source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$')
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  name text not null check(length(trim(name)) between 1 and 100),
  topic text not null default '' check(length(topic)<=500),
  target_level smallint check(target_level between 1 and 5),
  active_from date not null,
  active_until date,
  unique(id,student_id),
  check(active_until is null or active_until>=active_from)
);
create table public.subject_levels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  subject_id uuid not null,
  course_day date not null,
  level smallint not null check(level between 1 and 5),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  foreign key(subject_id,student_id) references public.subjects(id,student_id),
  unique(subject_id,course_day)
);
create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  name text not null check(length(trim(name)) between 1 and 100),
  target_level smallint check(target_level between 1 and 5),
  active_from date not null,
  active_until date,
  unique(id,student_id),
  check(active_until is null or active_until>=active_from)
);
create table public.competency_levels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  competency_id uuid not null,
  course_day date not null,
  level smallint not null check(level between 1 and 5),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  foreign key(competency_id,student_id) references public.competencies(id,student_id),
  unique(competency_id,course_day)
);
create table public.attendance (
  student_id uuid not null references public.students(id),
  course_day date not null references public.course_days(course_day),
  status text not null check(status in ('present','absent')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(student_id,course_day)
);
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  course_day date not null,
  subject_id uuid,
  topic text not null default '' check(length(topic)<=500),
  worked_on text not null default '' check(length(worked_on)<=2000),
  went_well text not null default '' check(length(went_well)<=1500),
  next_step text not null default '' check(length(next_step)<=1500),
  arrival_review boolean,
  pause_review boolean,
  understanding smallint check(understanding between 1 and 5),
  effort smallint check(effort between 1 and 5),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  foreign key(student_id,course_day) references public.attendance(student_id,course_day),
  foreign key(subject_id,student_id) references public.subjects(id,student_id),
  unique(student_id,course_day)
);
create table public.feedback_parent (
  student_id uuid not null,
  course_day date not null,
  note text not null check(length(note) between 1 and 2500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(student_id,course_day),
  foreign key(student_id,course_day) references public.feedback(student_id,course_day) on delete cascade
);
create table public.feedback_internal (
  student_id uuid not null,
  course_day date not null,
  note text not null check(length(note) between 1 and 4000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(student_id,course_day),
  foreign key(student_id,course_day) references public.feedback(student_id,course_day) on delete cascade
);
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  exam_date date not null,
  subject_id uuid not null,
  subject text not null check(length(subject) between 1 and 100),
  topic text not null check(length(trim(topic)) between 1 and 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  foreign key(subject_id,student_id) references public.subjects(id,student_id)
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id),
  appointment_date date not null,
  title text not null check(length(trim(title)) between 1 and 250),
  audience text not null default 'student' check(audience in ('student','parent')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create function portal_private.today() returns date language sql stable
set search_path='' as $$select (now() at time zone 'Europe/Zurich')::date$$;

-- Consult authoritative profile and Auth session on EVERY access, including old JWTs.
create function portal_private.actor_role() returns text language sql stable security definer
set search_path='' as $$
 select p.role from public.profiles p
 where p.id=auth.uid() and p.active and exists(select 1 from portal_private.settings where enabled)
 and (p.role<>'admin' or exists(select 1 from portal_private.settings s where s.admin_auth_id=p.id))
 and (p.role not in ('admin','teacher') or not coalesce((select require_staff_mfa from portal_private.settings where singleton),true) or auth.jwt()->>'aal'='aal2')
 and exists(select 1 from auth.sessions a where a.user_id=p.id
   and a.id::text=auth.jwt()->>'session_id' and a.created_at>p.sessions_valid_after and (a.not_after is null or a.not_after>now()))
$$;
create function portal_private.is_admin() returns boolean language sql stable security definer
set search_path='' as $$select coalesce(portal_private.actor_role()='admin',false)$$;
create function portal_private.is_staff() returns boolean language sql stable security definer
set search_path='' as $$select portal_private.is_admin() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.core_team and portal_private.actor_role()='teacher')$$;
create function portal_private.can_read_student(p_id uuid) returns boolean language sql stable security definer
set search_path='' as $$
select portal_private.is_admin() or exists(
 select 1 from public.students s where s.id=p_id and s.active
 and (s.left_on is null or s.left_on>=portal_private.today())
 and (portal_private.is_staff() or exists(
  select 1 from public.access_grants g where g.student_id=s.id and g.profile_id=auth.uid() and g.active
  and ((portal_private.actor_role()='parent' and g.access_kind='parent') or (portal_private.actor_role()='student' and g.access_kind='self'))
 )))$$;
create function portal_private.can_write_student(p_id uuid) returns boolean language sql stable security definer
set search_path='' as $$select portal_private.is_staff() and portal_private.can_read_student(p_id)$$;
create function portal_private.has_students() returns boolean language sql stable security definer
set search_path='' as $$select exists(select 1 from public.students s where portal_private.can_read_student(s.id))$$;
create function portal_private.mfa_required() returns boolean language sql stable security definer
set search_path='' as $$select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role in ('admin','teacher')
 and exists(select 1 from portal_private.settings where enabled and require_staff_mfa)
 and coalesce(auth.jwt()->>'aal','')<>'aal2'
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=p.id and s.created_at>p.sessions_valid_after and (s.not_after is null or s.not_after>now())))$$;
create function portal_private.student_management(p_id uuid) returns jsonb language sql stable security definer
set search_path='' as $$select case when portal_private.is_admin() then
 (select jsonb_build_object('family_id',s.family_id,'adult_review_on',a.adult_review_on) from public.students s left join public.student_admin a on a.student_id=s.id where s.id=p_id)
 else '{}'::jsonb end$$;

create function portal_private.check_payload(p jsonb, allowed text[]) returns void language plpgsql
set search_path='' as $$begin
 if p is null or jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p) k where not(k=any(allowed))) then
  raise exception 'Ungültige Eingabefelder' using errcode='22023'; end if;
end$$;
create function portal_private.stamp_actor() returns trigger language plpgsql security definer
set search_path='' as $$begin
 if portal_private.actor_role() is null then raise exception 'Nicht berechtigt' using errcode='42501'; end if;
 if TG_OP='INSERT' then new.created_by:=auth.uid();new.created_at:=now();
 else new.created_by:=old.created_by;new.created_at:=old.created_at;end if;
 new.updated_by:=auth.uid();new.updated_at:=now();return new;
end$$;
create function portal_private.check_assessment() returns trigger language plpgsql security definer
set search_path='' as $$begin
 if new.course_day>portal_private.today() then raise exception 'Bewertungen dürfen nicht in der Zukunft liegen' using errcode='22023';end if;
 return new;
end$$;
create function portal_private.revoke_profile_sessions() returns trigger language plpgsql
set search_path='' as $$begin
 if old.active is distinct from new.active or old.role is distinct from new.role or old.core_team is distinct from new.core_team then
  new.sessions_valid_after:=clock_timestamp();
 else new.sessions_valid_after:=greatest(old.sessions_valid_after,new.sessions_valid_after);end if;
 return new;
end$$;
create trigger revoke_sessions before update on public.profiles for each row execute function portal_private.revoke_profile_sessions();

do $$declare t text;begin
 foreach t in array array['subject_levels','competency_levels','attendance','feedback','feedback_parent','feedback_internal','exams','appointments'] loop
  execute format('create trigger stamp before insert or update on public.%I for each row execute function portal_private.stamp_actor()',t);
 end loop;
 foreach t in array array['subject_levels','competency_levels','attendance','feedback'] loop
  execute format('create trigger assessment_date before insert or update on public.%I for each row execute function portal_private.check_assessment()',t);
 end loop;
 foreach t in array array['profiles','families','students','student_admin','access_grants','course_days','subjects','subject_levels','competencies','competency_levels','attendance','feedback','feedback_parent','feedback_internal','exams','appointments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end$$;
grant select(id,username,display_name,role,active,core_team) on public.profiles to authenticated;
grant select,insert,update on public.profiles to service_role;
grant select on public.families,public.student_admin,public.access_grants,public.course_days to authenticated;
grant select(id,display_name,school_level,joined_on,left_on,active) on public.students to authenticated;
grant select(id,student_id,name,topic,target_level,active_from,active_until) on public.subjects to authenticated;
grant select(id,student_id,subject_id,course_day,level) on public.subject_levels to authenticated;
grant select(id,student_id,name,target_level,active_from,active_until) on public.competencies to authenticated;
grant select(id,student_id,competency_id,course_day,level) on public.competency_levels to authenticated;
grant select(student_id,course_day,status) on public.attendance to authenticated;
grant select(id,student_id,course_day,subject_id,topic,worked_on,went_well,next_step,arrival_review,pause_review,understanding,effort) on public.feedback to authenticated;
grant select(student_id,course_day,note) on public.feedback_parent,public.feedback_internal to authenticated;
grant select(id,student_id,exam_date,subject_id,subject,topic) on public.exams to authenticated;
grant select(id,student_id,appointment_date,title,audience) on public.appointments to authenticated;
create policy read_profile on public.profiles for select to authenticated using(portal_private.is_admin() or (id=auth.uid() and portal_private.actor_role() is not null));
create policy read_families on public.families for select to authenticated using(portal_private.is_admin());
create policy read_students on public.students for select to authenticated using(portal_private.can_read_student(id));
create policy read_student_admin on public.student_admin for select to authenticated using(portal_private.is_admin());
create policy read_grants on public.access_grants for select to authenticated using(portal_private.is_admin());
create policy read_days on public.course_days for select to authenticated using(portal_private.actor_role() is not null and (portal_private.has_students() or portal_private.is_staff()));
do $$declare t text;begin
 foreach t in array array['subjects','subject_levels','competencies','competency_levels','attendance','feedback','exams'] loop
  execute format('create policy read_owned on public.%I for select to authenticated using(portal_private.can_read_student(student_id))',t);
 end loop;
end$$;
create policy read_parent on public.feedback_parent for select to authenticated using(portal_private.can_read_student(student_id) and (portal_private.actor_role()='parent' or portal_private.is_staff()));
create policy read_internal on public.feedback_internal for select to authenticated using(portal_private.can_write_student(student_id));
create policy read_appointments on public.appointments for select to authenticated using(
 (case when student_id is null then (portal_private.has_students() or portal_private.is_staff()) else portal_private.can_read_student(student_id) end)
 and (audience='student' or portal_private.actor_role()='parent' or portal_private.is_staff()));

create function public.get_portal_snapshot() returns jsonb language plpgsql security invoker
set search_path='' as $$declare result jsonb;begin
 if portal_private.mfa_required() then raise exception 'MFA_REQUIRED' using errcode='42501';end if;
 if portal_private.actor_role() is null then raise exception 'Nicht berechtigt' using errcode='42501';end if;
 select jsonb_build_object(
  'profile',(select jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'role',p.role,'core_team',p.core_team) from public.profiles p where p.id=auth.uid()),
  'students',coalesce((select jsonb_agg(to_jsonb(x) || portal_private.student_management(x.id)) from (select id,display_name,school_level,joined_on,left_on,active from public.students order by display_name,id) x),'[]'::jsonb),
  'subjects',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,name,topic,target_level,active_from,active_until from public.subjects order by name,id) x),'[]'::jsonb),
  'subject_levels',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,subject_id,course_day,level from public.subject_levels order by course_day,id) x),'[]'::jsonb),
  'competencies',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,name,target_level,active_from,active_until from public.competencies order by name,id) x),'[]'::jsonb),
  'competency_levels',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,competency_id,course_day,level from public.competency_levels order by course_day,id) x),'[]'::jsonb),
  'attendance',coalesce((select jsonb_agg(to_jsonb(x)) from (select student_id,course_day,status from public.attendance order by course_day) x),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,course_day,subject_id,topic,worked_on,went_well,next_step,arrival_review,pause_review,understanding,effort from public.feedback order by course_day desc) x),'[]'::jsonb),
  'feedback_parent',coalesce((select jsonb_agg(to_jsonb(x)) from (select student_id,course_day,note from public.feedback_parent) x),'[]'::jsonb),
  'feedback_internal',coalesce((select jsonb_agg(to_jsonb(x)) from (select student_id,course_day,note from public.feedback_internal) x),'[]'::jsonb),
  'exams',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,exam_date,subject_id,subject,topic from public.exams order by exam_date,id) x),'[]'::jsonb),
  'appointments',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,appointment_date,title,audience from public.appointments order by appointment_date,id) x),'[]'::jsonb),
  'families',coalesce((select jsonb_agg(to_jsonb(x)) from public.families x),'[]'::jsonb),
  'profiles',case when portal_private.is_admin() then coalesce((select jsonb_agg(to_jsonb(x)) from (select id,username,display_name,role,active,core_team from public.profiles order by username) x),'[]'::jsonb) else '[]'::jsonb end,
  'access_grants',coalesce((select jsonb_agg(to_jsonb(x)) from public.access_grants x),'[]'::jsonb),
  'student_admin',coalesce((select jsonb_agg(to_jsonb(x)) from public.student_admin x),'[]'::jsonb)
 ) into result;
 return result;
end$$;

create function public.record_saturday(p_student_id uuid,p_course_day date,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_subject uuid;v_previous uuid;v_status text;v_level smallint;begin
 if not portal_private.can_write_student(p_student_id) then raise exception 'Nicht berechtigt' using errcode='42501';end if;
 perform portal_private.check_payload(p_payload,array['attendance','subject_id','topic','worked_on','went_well','next_step','arrival_review','pause_review','understanding','effort','internal_note','parent_note','new_level']);
 perform 1 from public.students where id=p_student_id for update;
 if not exists(select 1 from public.course_days where course_day=p_course_day) or p_course_day>portal_private.today()
 or not exists(select 1 from public.students where id=p_student_id and p_course_day>=joined_on and (left_on is null or p_course_day<=left_on))
 then raise exception 'Ungültiger Kurstag' using errcode='22023';end if;
 v_status:=p_payload->>'attendance';
 if v_status not in ('present','absent') or v_status is null then raise exception 'Anwesenheit auswählen' using errcode='22023';end if;
 v_subject:=nullif(p_payload->>'subject_id','')::uuid;
 if v_subject is not null and not exists(select 1 from public.subjects where id=v_subject and student_id=p_student_id and active_from<=p_course_day and (active_until is null or active_until>=p_course_day)) then raise exception 'Ungültiges Fach' using errcode='22023';end if;
 v_level:=nullif(p_payload->>'new_level','')::smallint;
 if v_level is not null and (v_subject is null or v_level not between 1 and 5) then raise exception 'Ungültige Fachstufe' using errcode='22023';end if;
 select subject_id into v_previous from public.feedback where student_id=p_student_id and course_day=p_course_day;
 insert into public.attendance(student_id,course_day,status) values(p_student_id,p_course_day,v_status)
 on conflict(student_id,course_day) do update set status=excluded.status;
 if v_status='absent' then
  if coalesce(p_payload->>'topic','')<>'' or coalesce(p_payload->>'parent_note','')<>'' or coalesce(p_payload->>'internal_note','')<>'' then raise exception 'Keine Beobachtungen bei Absenz' using errcode='22023';end if;
  if v_level is not null or coalesce(p_payload->>'worked_on','')<>'' or coalesce(p_payload->>'went_well','')<>'' or coalesce(p_payload->>'next_step','')<>'' or p_payload->>'arrival_review' is not null or p_payload->>'pause_review' is not null or p_payload->>'understanding' is not null or p_payload->>'effort' is not null then raise exception 'Keine Beobachtungen bei Absenz' using errcode='22023';end if;
  delete from public.feedback where student_id=p_student_id and course_day=p_course_day;
  delete from public.subject_levels where student_id=p_student_id and course_day=p_course_day;
  delete from public.competency_levels where student_id=p_student_id and course_day=p_course_day;
 else
  insert into public.feedback(student_id,course_day,subject_id,topic,worked_on,went_well,next_step,arrival_review,pause_review,understanding,effort)
  values(p_student_id,p_course_day,v_subject,coalesce(p_payload->>'topic',''),coalesce(p_payload->>'worked_on',''),coalesce(p_payload->>'went_well',''),coalesce(p_payload->>'next_step',''),(p_payload->>'arrival_review')::boolean,(p_payload->>'pause_review')::boolean,nullif(p_payload->>'understanding','')::smallint,nullif(p_payload->>'effort','')::smallint)
  on conflict(student_id,course_day) do update set subject_id=excluded.subject_id,topic=excluded.topic,worked_on=excluded.worked_on,went_well=excluded.went_well,next_step=excluded.next_step,arrival_review=excluded.arrival_review,pause_review=excluded.pause_review,understanding=excluded.understanding,effort=excluded.effort;
  if v_previous is not null and v_previous is distinct from v_subject then delete from public.subject_levels where student_id=p_student_id and subject_id=v_previous and course_day=p_course_day;end if;
  if v_subject is not null then
   if v_level is null then delete from public.subject_levels where subject_id=v_subject and course_day=p_course_day;
   else insert into public.subject_levels(student_id,subject_id,course_day,level) values(p_student_id,v_subject,p_course_day,v_level)
    on conflict(subject_id,course_day) do update set level=excluded.level;end if;
  end if;
  if nullif(trim(p_payload->>'internal_note'),'') is null then delete from public.feedback_internal where student_id=p_student_id and course_day=p_course_day;
  else insert into public.feedback_internal(student_id,course_day,note) values(p_student_id,p_course_day,p_payload->>'internal_note') on conflict(student_id,course_day) do update set note=excluded.note;end if;
  if nullif(trim(p_payload->>'parent_note'),'') is null then delete from public.feedback_parent where student_id=p_student_id and course_day=p_course_day;
  else insert into public.feedback_parent(student_id,course_day,note) values(p_student_id,p_course_day,p_payload->>'parent_note') on conflict(student_id,course_day) do update set note=excluded.note;end if;
 end if;
 return jsonb_build_object('saved',true,'student_id',p_student_id,'course_day',p_course_day);
end$$;

create function public.report_exam(p_student_id uuid,p_exam_date date,p_subject_id uuid,p_topic text,p_exam_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_subject text;v_id uuid:=coalesce(p_exam_id,gen_random_uuid());begin
 if not (portal_private.can_write_student(p_student_id) or (portal_private.actor_role()='parent' and portal_private.can_read_student(p_student_id))) then raise exception 'Nicht berechtigt' using errcode='42501';end if;
 if p_exam_date<portal_private.today() or p_exam_date>portal_private.today()+730 then raise exception 'Ungültiger Prüfungstermin' using errcode='22023';end if;
 select name into v_subject from public.subjects where id=p_subject_id and student_id=p_student_id and active_from<=p_exam_date and (active_until is null or active_until>=p_exam_date);
 if v_subject is null then raise exception 'Ungültiges Fach' using errcode='22023';end if;
 perform 1 from public.students where id=p_student_id for update;
 if exists(select 1 from public.exams where id=v_id and (student_id<>p_student_id or (created_by<>auth.uid() and not portal_private.is_staff()))) then raise exception 'Nicht berechtigt' using errcode='42501';end if;
 insert into public.exams(id,student_id,exam_date,subject_id,subject,topic) values(v_id,p_student_id,p_exam_date,p_subject_id,v_subject,p_topic)
 on conflict(id) do update set exam_date=excluded.exam_date,subject_id=excluded.subject_id,subject=excluded.subject,topic=excluded.topic;
 return jsonb_build_object('saved',true,'id',v_id);
end$$;

create function public.admin_change(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_student uuid;v_profile uuid;v_start date;v_end date;v_role text;v_old public.students;begin
 if not portal_private.is_admin() then raise exception 'Nicht berechtigt' using errcode='42501';end if;
 v_id:=coalesce(nullif(p_payload->>'id','')::uuid,gen_random_uuid());
 case p_action
 when 'family' then
  perform portal_private.check_payload(p_payload,array['id','label']);
  insert into public.families(id,label) values(v_id,p_payload->>'label') on conflict(id) do update set label=excluded.label;
 when 'student' then
  perform portal_private.check_payload(p_payload,array['id','family_id','display_name','school_level','joined_on','left_on','active','adult_review_on']);
  select * into v_old from public.students where id=v_id for update;
  if found and v_old.joined_on<>(p_payload->>'joined_on')::date and exists(select 1 from public.attendance where student_id=v_id) then raise exception 'Eintritt bei bestehender Anwesenheit nicht verschieben' using errcode='22023';end if;
  if exists(select 1 from public.attendance where student_id=v_id and course_day>nullif(p_payload->>'left_on','')::date) then raise exception 'Austritt liegt vor erfassten Kurstagen' using errcode='22023';end if;
  insert into public.students(id,family_id,display_name,school_level,joined_on,left_on,active)
   values(v_id,nullif(p_payload->>'family_id','')::uuid,p_payload->>'display_name',p_payload->>'school_level',(p_payload->>'joined_on')::date,nullif(p_payload->>'left_on','')::date,coalesce((p_payload->>'active')::boolean,true))
   on conflict(id) do update set family_id=excluded.family_id,display_name=excluded.display_name,school_level=excluded.school_level,joined_on=excluded.joined_on,left_on=excluded.left_on,active=excluded.active;
  insert into public.student_admin(student_id,adult_review_on) values(v_id,nullif(p_payload->>'adult_review_on','')::date) on conflict(student_id) do update set adult_review_on=excluded.adult_review_on;
 when 'profile' then
  perform portal_private.check_payload(p_payload,array['id','username','display_name','role','active','core_team']);
  v_role:=p_payload->>'role';
  if v_role='admin' or exists(select 1 from portal_private.settings where admin_auth_id=v_id) then raise exception 'Erstadmin nur durch Betreiber' using errcode='42501';end if;
  if not exists(select 1 from auth.users where id=v_id and email_confirmed_at is not null and is_anonymous=false) then raise exception 'Verifiziertes bestehendes Auth-Konto erforderlich' using errcode='22023';end if;
  if exists(select 1 from public.profiles where id=v_id and username is distinct from p_payload->>'username') then raise exception 'Benutzername nur synchron durch Betreiber änderbar' using errcode='22023';end if;
  insert into public.profiles(id,username,display_name,role,active,core_team) values(v_id,p_payload->>'username',p_payload->>'display_name',v_role,coalesce((p_payload->>'active')::boolean,false),coalesce((p_payload->>'core_team')::boolean,false))
   on conflict(id) do update set username=excluded.username,display_name=excluded.display_name,role=excluded.role,active=excluded.active,core_team=excluded.core_team;
 when 'access_grant' then
  perform portal_private.check_payload(p_payload,array['id','student_id','profile_id','access_kind','active']);
  v_student:=(p_payload->>'student_id')::uuid;v_profile:=(p_payload->>'profile_id')::uuid;
  if not exists(select 1 from public.profiles where id=v_profile and active and ((role='parent' and p_payload->>'access_kind'='parent') or (role='student' and p_payload->>'access_kind'='self'))) then raise exception 'Unpassende aktive Kontorolle' using errcode='22023';end if;
  if exists(select 1 from public.access_grants where id=v_id and (student_id<>v_student or profile_id<>v_profile or access_kind<>p_payload->>'access_kind')) then raise exception 'Bestehende Zuordnung nicht umbindbar' using errcode='22023';end if;
  insert into public.access_grants(id,student_id,profile_id,access_kind,active) values(v_id,v_student,v_profile,p_payload->>'access_kind',coalesce((p_payload->>'active')::boolean,true))
   on conflict(student_id,profile_id,access_kind) do update set active=excluded.active returning id into v_id;
 when 'revoke_access' then
  perform portal_private.check_payload(p_payload,array['id']);update public.access_grants set active=false where id=v_id;
  if not found then raise exception 'Zuordnung nicht gefunden' using errcode='22023';end if;
 when 'subject' then
  perform portal_private.check_payload(p_payload,array['id','student_id','name','topic','target_level','active_from','start_level']);
  v_student:=(p_payload->>'student_id')::uuid;v_start:=(p_payload->>'active_from')::date;
  perform 1 from public.students where id=v_student for update;
  if v_start<portal_private.today() and exists(select 1 from public.attendance where student_id=v_student) then raise exception 'Neues Fach nicht rückwirkend aktivieren' using errcode='22023';end if;
  if exists(select 1 from public.subjects where student_id=v_student and lower(name)=lower(p_payload->>'name') and (active_until is null or active_until>=v_start)) then raise exception 'Überlappende Fachperiode' using errcode='22023';end if;
  insert into public.subjects(id,student_id,name,topic,target_level,active_from) values(v_id,v_student,p_payload->>'name',coalesce(p_payload->>'topic',''),nullif(p_payload->>'target_level','')::smallint,v_start);
  if nullif(p_payload->>'start_level','') is not null then insert into public.subject_levels(student_id,subject_id,course_day,level) values(v_student,v_id,v_start,(p_payload->>'start_level')::smallint);end if;
 when 'close_subject' then
  perform portal_private.check_payload(p_payload,array['id','active_until']);v_end:=(p_payload->>'active_until')::date;
  if v_end<portal_private.today() then raise exception 'Historische Fachperiode nicht rückwirkend ändern' using errcode='22023';end if;
  update public.subjects set active_until=v_end where id=v_id and active_until is null;
  if not found then raise exception 'Offene Fachperiode nicht gefunden' using errcode='22023';end if;
 when 'competency' then
  perform portal_private.check_payload(p_payload,array['id','student_id','name','target_level','active_from']);
  v_student:=(p_payload->>'student_id')::uuid;v_start:=(p_payload->>'active_from')::date;
  perform 1 from public.students where id=v_student for update;
  if v_start<portal_private.today() and exists(select 1 from public.attendance where student_id=v_student) then raise exception 'Neue Kompetenz nicht rückwirkend aktivieren' using errcode='22023';end if;
  if exists(select 1 from public.competencies where student_id=v_student and lower(name)=lower(p_payload->>'name') and (active_until is null or active_until>=v_start)) then raise exception 'Überlappende Kompetenzperiode' using errcode='22023';end if;
  insert into public.competencies(id,student_id,name,target_level,active_from) values(v_id,v_student,p_payload->>'name',nullif(p_payload->>'target_level','')::smallint,v_start);
 when 'close_competency' then
  perform portal_private.check_payload(p_payload,array['id','active_until']);v_end:=(p_payload->>'active_until')::date;
  if v_end<portal_private.today() then raise exception 'Historische Kompetenzperiode nicht rückwirkend ändern' using errcode='22023';end if;
  update public.competencies set active_until=v_end where id=v_id and active_until is null;
  if not found then raise exception 'Offene Kompetenzperiode nicht gefunden' using errcode='22023';end if;
 when 'competency_level' then
  perform portal_private.check_payload(p_payload,array['competency_id','course_day','level']);v_id:=(p_payload->>'competency_id')::uuid;v_start:=(p_payload->>'course_day')::date;
  select student_id into v_student from public.competencies where id=v_id and active_from<=v_start and (active_until is null or active_until>=v_start);
  if v_student is null or not exists(select 1 from public.course_days where course_day=v_start)
   or not exists(select 1 from public.students where id=v_student and joined_on<=v_start and (left_on is null or left_on>=v_start))
   or exists(select 1 from public.attendance where student_id=v_student and course_day=v_start and status='absent') then raise exception 'Ungültige Kompetenzbewertung' using errcode='22023';end if;
  insert into public.competency_levels(student_id,competency_id,course_day,level) values(v_student,v_id,v_start,(p_payload->>'level')::smallint) on conflict(competency_id,course_day) do update set level=excluded.level;
 when 'appointment' then
  perform portal_private.check_payload(p_payload,array['id','student_id','appointment_date','title','audience']);
  v_start:=(p_payload->>'appointment_date')::date;
  if v_start<portal_private.today() or v_start>portal_private.today()+730 then raise exception 'Ungültiger Termin' using errcode='22023';end if;
  insert into public.appointments(id,student_id,appointment_date,title,audience) values(v_id,nullif(p_payload->>'student_id','')::uuid,v_start,p_payload->>'title',p_payload->>'audience')
  on conflict(id) do update set student_id=excluded.student_id,appointment_date=excluded.appointment_date,title=excluded.title,audience=excluded.audience;
 when 'delete_appointment' then
  perform portal_private.check_payload(p_payload,array['id']);delete from public.appointments where id=v_id;
  if not found then raise exception 'Termin nicht gefunden' using errcode='22023';end if;
 else raise exception 'Unbekannte Verwaltungsaktion' using errcode='22023';
 end case;
 return jsonb_build_object('saved',true,'id',v_id);
end$$;

-- Default EXECUTE is PUBLIC in PostgreSQL: explicitly close every function.
revoke all on all functions in schema portal_private from public, anon, authenticated;
grant execute on function portal_private.today(),portal_private.actor_role(),portal_private.is_admin(),portal_private.is_staff(),portal_private.can_read_student(uuid),portal_private.can_write_student(uuid),portal_private.has_students(),portal_private.mfa_required(),portal_private.student_management(uuid) to authenticated;
revoke all on function public.get_portal_snapshot(),public.record_saturday(uuid,date,jsonb),public.report_exam(uuid,date,uuid,text,uuid),public.admin_change(text,jsonb) from public,anon,authenticated;
grant execute on function public.get_portal_snapshot(),public.record_saturday(uuid,date,jsonb),public.report_exam(uuid,date,uuid,text,uuid),public.admin_change(text,jsonb) to authenticated;
-- No insert/update/delete policy is created. Direct writes remain forbidden.
commit;
