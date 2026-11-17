-- Additive account administration. No Auth account or project is created by this migration.
begin;
create or replace function public.admin_change(p_action text,p_payload jsonb) returns jsonb
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
  if coalesce((select active from public.profiles where id=v_id),false) is distinct from coalesce((p_payload->>'active')::boolean,false) then
   raise exception 'Konto nur über protokollierte Kontoverwaltung sperren oder freigeben' using errcode='42501';end if;
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

-- Not exposed in snapshots or to authenticated/anonymous clients. No credentials
-- or JWTs are accepted or stored. A reservation doubles as a durable audit record.
create table portal_private.account_actions (
 request_id uuid primary key,
 actor_id uuid not null references public.profiles(id),
 session_id uuid not null,
 action text not null check(action in ('create','reset','disable','enable')),
 request_data jsonb not null,
 target_id uuid,
 state text not null default 'pending' check(state in ('pending','succeeded','failed')),
 result_code text,
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
revoke all on portal_private.account_actions from public,anon,authenticated,service_role;
create index account_actions_actor_time on portal_private.account_actions(actor_id,created_at);
create unique index account_create_pending_username on portal_private.account_actions((request_data->>'username')) where action='create' and state='pending';
create unique index account_target_pending on portal_private.account_actions(target_id) where target_id is not null and state='pending';

create function portal_private.require_account_admin(p_actor uuid,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.profiles p join portal_private.settings s on s.admin_auth_id=p.id
   join auth.users u on u.id=p.id join auth.sessions a on a.user_id=p.id
   where p.id=p_actor and p.role='admin' and p.active and s.enabled
   and u.email_confirmed_at is not null and not u.is_anonymous
   and a.id=p_session and a.created_at>p.sessions_valid_after and (a.not_after is null or a.not_after>now()))
 then raise exception 'ACCOUNT_ACCESS_DENIED' using errcode='42501';end if;
end$$;

-- Called with the administrator's JWT, never with the service-role client.
-- PostgREST verifies the token; current table/session state and AAL2 are checked
-- independently. Keep AAL2 mandatory even if require_staff_mfa is misconfigured.
create function public.begin_portal_account_action(p_request_id uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_session uuid;v_existing portal_private.account_actions;v_target public.profiles;v_data jsonb;
begin
 if not portal_private.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'ACCOUNT_ACCESS_DENIED' using errcode='42501';end if;
 v_session:=(auth.jwt()->>'session_id')::uuid;
 perform portal_private.require_account_admin(v_actor,v_session);
 -- Serialize reservations, rate limits and same-username creation attempts.
 perform 1 from portal_private.settings where singleton for update;
 if p_request_id is null or p_action is null or p_action not in ('create','reset','disable','enable') then raise exception 'ACCOUNT_INPUT_INVALID' using errcode='22023';end if;
 if p_action='create' then
  perform portal_private.check_payload(p_payload,array['username','display_name','role']);
  if jsonb_typeof(p_payload->'username')<>'string' or jsonb_typeof(p_payload->'display_name')<>'string' or jsonb_typeof(p_payload->'role')<>'string'
   or coalesce(p_payload->>'username','')!~'^[a-z0-9][a-z0-9._-]{2,31}$' or position('..' in p_payload->>'username')>0
   or length(portal_private.trim_content(p_payload->>'display_name')) not between 1 and 120
   or coalesce(p_payload->>'role','') not in ('parent','student','teacher')
  then raise exception 'ACCOUNT_INPUT_INVALID' using errcode='22023';end if;
  v_data:=jsonb_build_object('username',p_payload->>'username','display_name',portal_private.trim_content(p_payload->>'display_name'),'role',p_payload->>'role');
 else
  perform portal_private.check_payload(p_payload,array['profile_id']);
  if p_payload->>'profile_id' is null then raise exception 'ACCOUNT_INPUT_INVALID' using errcode='22023';end if;
  v_data:=jsonb_build_object('profile_id',(p_payload->>'profile_id')::uuid);
 end if;
 select * into v_existing from portal_private.account_actions where request_id=p_request_id;
 if found then
  if v_existing.actor_id<>v_actor or v_existing.action<>p_action or v_existing.request_data<>v_data then raise exception 'ACCOUNT_REQUEST_CONFLICT' using errcode='22023';end if;
  return jsonb_build_object('actor_id',v_actor,'request_id',p_request_id,'action',p_action,'profile_id',v_existing.target_id,'state',v_existing.state,'replayed',true);
 end if;
 if (select count(*) from portal_private.account_actions where actor_id=v_actor and created_at>now()-interval '1 minute')>=10
  or (select count(*) from portal_private.account_actions where actor_id=v_actor and created_at>now()-interval '1 hour')>=60
 then raise exception 'ACCOUNT_RATE_LIMIT' using errcode='22023';end if;
 if p_action='create' then
  if exists(select 1 from public.profiles where username=v_data->>'username')
   or exists(select 1 from portal_private.account_actions where action='create' and state='pending' and request_data->>'username'=v_data->>'username')
  then raise exception 'ACCOUNT_USERNAME_EXISTS' using errcode='22023';end if;
 else
  select * into v_target from public.profiles where id=(v_data->>'profile_id')::uuid for update;
  if not found or v_target.role='admin' or v_target.id=v_actor or exists(select 1 from portal_private.settings where admin_auth_id=v_target.id) then raise exception 'ACCOUNT_TARGET_DENIED' using errcode='42501';end if;
  if exists(select 1 from portal_private.account_actions where target_id=v_target.id and state='pending') then raise exception 'ACCOUNT_TARGET_BUSY' using errcode='22023';end if;
 end if;
 insert into portal_private.account_actions(request_id,actor_id,session_id,action,request_data,target_id)
 values(p_request_id,v_actor,v_session,p_action,v_data,v_target.id);
 return jsonb_build_object('actor_id',v_actor,'request_id',p_request_id,'action',p_action,'profile_id',v_target.id,'username',coalesce(v_target.username,v_data->>'username'),'state','pending','replayed',false);
end$$;

-- Only the Edge server can prepare/finalize a previously authorized reservation.
-- Reset and disable remove data access BEFORE calling Auth. Errors leave a safe,
-- disabled account. No unaudited frontend update can re-enable it.
create function public.prepare_portal_account_action(p_actor uuid,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a portal_private.account_actions;t public.profiles;begin
 select * into a from portal_private.account_actions where request_id=p_request_id and actor_id=p_actor for update;
 if not found or a.state<>'pending' or a.created_at<now()-interval '2 minutes' then raise exception 'ACCOUNT_REQUEST_UNAVAILABLE' using errcode='22023';end if;
 perform portal_private.require_account_admin(a.actor_id,a.session_id);
 if a.action<>'create' then
  select * into t from public.profiles where id=a.target_id for update;
  if not found or t.role='admin' or exists(select 1 from portal_private.settings where admin_auth_id=t.id) then raise exception 'ACCOUNT_TARGET_DENIED' using errcode='42501';end if;
  if a.action in ('reset','disable') then update public.profiles set active=false,sessions_valid_after=clock_timestamp() where id=t.id;end if;
 end if;
 return jsonb_build_object('action',a.action,'profile_id',a.target_id,'payload',a.request_data);
end$$;

create function public.finish_portal_account_action(p_actor uuid,p_request_id uuid,p_success boolean,p_target_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a portal_private.account_actions;t public.profiles;begin
 select * into a from portal_private.account_actions where request_id=p_request_id and actor_id=p_actor for update;
 if not found or a.state<>'pending' then raise exception 'ACCOUNT_REQUEST_UNAVAILABLE' using errcode='22023';end if;
 if p_success then
  perform portal_private.require_account_admin(a.actor_id,a.session_id);
  if a.action='create' then
   if p_target_id is null or exists(select 1 from public.profiles where id=p_target_id)
    or not exists(select 1 from auth.users where id=p_target_id and email_confirmed_at is not null and not is_anonymous)
   then raise exception 'ACCOUNT_TARGET_DENIED' using errcode='42501';end if;
   insert into public.profiles(id,username,display_name,role,active,core_team)
   values(p_target_id,a.request_data->>'username',a.request_data->>'display_name',a.request_data->>'role',false,false);
  else
   select * into t from public.profiles where id=a.target_id for update;
   if not found or t.role='admin' or exists(select 1 from portal_private.settings where admin_auth_id=t.id)
    or (p_target_id is not null and p_target_id<>a.target_id) then raise exception 'ACCOUNT_TARGET_DENIED' using errcode='42501';end if;
   if a.action='enable' then update public.profiles set active=true,sessions_valid_after=clock_timestamp() where id=a.target_id;end if;
  end if;
 end if;
 update portal_private.account_actions set state=case when p_success then 'succeeded' else 'failed' end,
  result_code=case when p_success then 'completed' else 'operation_failed' end,
  target_id=coalesce(a.target_id,p_target_id),finished_at=now() where request_id=p_request_id;
 return jsonb_build_object('ok',p_success,'action',a.action,'profile_id',coalesce(a.target_id,p_target_id),'username',coalesce(t.username,a.request_data->>'username'));
end$$;

revoke all on function portal_private.require_account_admin(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.begin_portal_account_action(uuid,text,jsonb),public.prepare_portal_account_action(uuid,uuid),public.finish_portal_account_action(uuid,uuid,boolean,uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_portal_account_action(uuid,text,jsonb) to authenticated;
grant execute on function public.prepare_portal_account_action(uuid,uuid),public.finish_portal_account_action(uuid,uuid,boolean,uuid) to service_role;
commit;
