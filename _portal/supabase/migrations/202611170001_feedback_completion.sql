-- Additive revision: attendance, family feedback and private notes are independent.
begin;
-- Match ECMAScript trim for empty observations (including tabs, newlines and NBSP).
create function portal_private.trim_content(value text) returns text language sql immutable
set search_path='' as $$select btrim(coalesce(value,''),U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')$$;
revoke all on function portal_private.trim_content(text) from public,anon,authenticated;
alter table public.feedback_parent drop constraint feedback_parent_student_id_course_day_fkey;
alter table public.feedback_parent add foreign key(student_id,course_day) references public.attendance(student_id,course_day) on delete cascade;
alter table public.feedback_internal drop constraint feedback_internal_student_id_course_day_fkey;
alter table public.feedback_internal add foreign key(student_id,course_day) references public.attendance(student_id,course_day) on delete cascade;
-- Clean only entirely empty legacy rows. Separate notes survive this cleanup.
delete from public.feedback where portal_private.trim_content(topic)='' and portal_private.trim_content(worked_on)='' and portal_private.trim_content(went_well)='' and portal_private.trim_content(next_step)=''
 and arrival_review is null and pause_review is null and understanding is null and effort is null
 and not exists(select 1 from public.subject_levels l where l.student_id=feedback.student_id and l.course_day=feedback.course_day and l.subject_id=feedback.subject_id);
create or replace function public.record_saturday(p_student_id uuid,p_course_day date,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_subject uuid;v_previous uuid;v_status text;v_level smallint;v_content boolean;begin
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
  delete from public.feedback_parent where student_id=p_student_id and course_day=p_course_day;
  delete from public.feedback_internal where student_id=p_student_id and course_day=p_course_day;
  delete from public.feedback where student_id=p_student_id and course_day=p_course_day;
  delete from public.subject_levels where student_id=p_student_id and course_day=p_course_day;
  delete from public.competency_levels where student_id=p_student_id and course_day=p_course_day;
 else
  -- A selected subject alone is not feedback. Partial observations remain editable.
  -- Family completion requires worked_on + next_step OR a separate parent note.
  v_content:=exists(select 1 from jsonb_each_text(p_payload) x where x.key=any(array['topic','worked_on','went_well','next_step','arrival_review','pause_review','understanding','effort']) and nullif(portal_private.trim_content(x.value),'') is not null) or v_level is not null;
  if v_content then
  insert into public.feedback(student_id,course_day,subject_id,topic,worked_on,went_well,next_step,arrival_review,pause_review,understanding,effort)
  values(p_student_id,p_course_day,v_subject,coalesce(p_payload->>'topic',''),coalesce(p_payload->>'worked_on',''),coalesce(p_payload->>'went_well',''),coalesce(p_payload->>'next_step',''),(p_payload->>'arrival_review')::boolean,(p_payload->>'pause_review')::boolean,nullif(p_payload->>'understanding','')::smallint,nullif(p_payload->>'effort','')::smallint)
  on conflict(student_id,course_day) do update set subject_id=excluded.subject_id,topic=excluded.topic,worked_on=excluded.worked_on,went_well=excluded.went_well,next_step=excluded.next_step,arrival_review=excluded.arrival_review,pause_review=excluded.pause_review,understanding=excluded.understanding,effort=excluded.effort;
  else delete from public.feedback where student_id=p_student_id and course_day=p_course_day;end if;
  if v_previous is not null and v_previous is distinct from v_subject then delete from public.subject_levels where student_id=p_student_id and subject_id=v_previous and course_day=p_course_day;end if;
  if v_subject is not null then
   if v_level is null then delete from public.subject_levels where subject_id=v_subject and course_day=p_course_day;
   else insert into public.subject_levels(student_id,subject_id,course_day,level) values(p_student_id,v_subject,p_course_day,v_level)
    on conflict(subject_id,course_day) do update set level=excluded.level;end if;
  end if;
  if nullif(portal_private.trim_content(p_payload->>'internal_note'),'') is null then delete from public.feedback_internal where student_id=p_student_id and course_day=p_course_day;
  else insert into public.feedback_internal(student_id,course_day,note) values(p_student_id,p_course_day,p_payload->>'internal_note') on conflict(student_id,course_day) do update set note=excluded.note;end if;
  if nullif(portal_private.trim_content(p_payload->>'parent_note'),'') is null then delete from public.feedback_parent where student_id=p_student_id and course_day=p_course_day;
  else insert into public.feedback_parent(student_id,course_day,note) values(p_student_id,p_course_day,p_payload->>'parent_note') on conflict(student_id,course_day) do update set note=excluded.note;end if;
 end if;
 return jsonb_build_object('saved',true,'student_id',p_student_id,'course_day',p_course_day);
end$$;
commit;
