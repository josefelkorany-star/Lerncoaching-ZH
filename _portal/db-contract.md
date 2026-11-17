# Portal data contract v1

All RPCs require a verified Supabase session, an active `profiles` record and a live `auth.sessions` record whose creation time meets the profile's current `sessions_valid_after`. Roles are database-controlled (`parent`, `student`, `teacher`, `admin`), never read from editable Auth metadata. `teacher` additionally needs `core_team=true`. Exactly one verified Auth ID can be the administrator, configured by the operator in `portal_private.settings` outside the web client. Settings default `enabled=false`, `require_staff_mfa=true`; privileged users require a real AAL2 session. Missing MFA raises `MFA_REQUIRED`. Every activation/deactivation and role/core-team change resets the session threshold: a fresh login after activation is required, including when Auth allowed a login during the inactive interval.

`get_portal_snapshot()` returns `{profile, students, subjects, subject_levels, competencies, competency_levels, attendance, feedback, feedback_parent, feedback_internal, exams, appointments, families, profiles, access_grants}`. Arrays already obey RLS; unauthorized arrays are empty. `profile` includes id, username, display_name, role, core_team. Family/profile/grant management arrays are admin-only. A non-provisioned, disabled or revoked session raises authorization error; it does not fall back to demo data.

## Shapes

- students: `id, display_name, school_level, joined_on, left_on, active` (inclusive dates); **admin only** additionally `family_id, adult_review_on`. Non-admin direct column reads cannot bypass this minimization.
- subjects: `id, student_id, name, topic, target_level, active_from, active_until` (inclusive). A closed subject is never reactivated by changing its historical start; create a new period. `target_level` may be null.
- subject_levels: `id, student_id, subject_id, course_day, level`. Initial assessment may precede the first course day; Saturday changes must use an offered course day. Levels are 1–5, not grades.
- competencies: `id, student_id, name, target_level, active_from, active_until`; competency_levels analogously have `competency_id`.
- attendance: `student_id, course_day, status` where status is `present` or `absent`. No row means not recorded.
- feedback: `id, student_id, course_day, subject_id, topic, worked_on, went_well, next_step, arrival_review, pause_review, understanding, effort`. Reviews and ratings may be null (not observed). Shared child/family wording only.
- feedback_parent: `student_id, course_day, note`; never returned to a student. feedback_internal has the same shape and is staff/admin-only. Both reference attendance directly after the additive correction; neither requires a shared feedback row.
- exams: `id, student_id, exam_date, subject_id, subject, topic`. `subject` is resolved server-side from the selected subject. Reports by parent or staff; students cannot write.
- appointments: `id, student_id, appointment_date, title, audience` (`student` shared with family, `parent` parents/staff only). Null student_id is a shared course announcement visible to authenticated, provisioned users with a current student relationship or staff permission.
- profiles (admin view): `id, username, display_name, role, active, core_team`.
- families: `id, label`; access_grants: `id, student_id, profile_id, access_kind, active` (`parent` or `self`). A family ID grants nothing. Self access is unique to a single student. Adult students have no automatic parent grant.

## Writes

`record_saturday(p_student_id uuid, p_course_day date, p_payload jsonb)` accepts only `attendance, subject_id, topic, worked_on, went_well, next_step, arrival_review, pause_review, understanding, effort, internal_note, parent_note, new_level`. It returns `{saved:true,student_id,course_day}` after one atomic transaction. It replaces the single child/day attendance and explicitly provided observations, independent notes and optional same-day subject level. Attendance alone never creates an empty feedback row. Partial observations remain editable. A level alone retains the subject/feedback context so later edits can clear or replace the exact assessment, but is not completed family feedback. Completion requires nonblank `worked_on` AND `next_step`, OR a nonblank parent note; internal-only text never completes feedback. Unicode whitespace is treated consistently with JavaScript trim. Choosing absent removes that day's feedback, notes and assessment so stale contradictory observations cannot remain. The model preserves the absent date as `value:null,status:absent`; the chart never connects across it. Blank observation fields mean null; the client must not preselect them. Repeated identical saves are upserts, not new duplicate entries. No client author or timestamp is accepted.

`report_exam(p_student_id uuid,p_exam_date date,p_subject_id uuid,p_topic text,p_exam_id uuid default null)` returns `{saved:true,id}`. Parent can report/update only their own reports for an active, explicitly assigned child; staff/admin can maintain reports. Date today through two years ahead, subject must belong to that child. Stable `p_exam_id` is required for client retries and can be generated with crypto.randomUUID(). Existing ID for another child or reporter is rejected, not overwritten.

`admin_change(p_action text,p_payload jsonb)` is a narrow administrator-only command, not a generic SQL or Auth admin endpoint. Returns `{saved:true,id}` (revoke/delete also return id). It does not create Supabase users or reset passwords. Allowed actions:

| action | fields (id optional for new record) |
|---|---|
| family | id, label |
| student | id, family_id, display_name, school_level, joined_on, left_on, active, adult_review_on |
| profile | id (existing verified Auth user), username, display_name, role, active (existing value only), core_team |
| access_grant | id, student_id, profile_id, access_kind, active |
| revoke_access | id |
| subject | id (new only), student_id, name, topic, target_level, active_from, start_level (optional) |
| close_subject | id, active_until (today or later) |
| competency | id (new only), student_id, name, target_level, active_from |
| close_competency | id, active_until (today or later) |
| competency_level | competency_id, course_day, level |
| appointment | id, student_id (optional), appointment_date, title, audience |
| delete_appointment | id |

For corrections to a student's current display/school level, re-submit student fields. Historical entry date cannot be silently moved once attendance exists; departure cannot precede recorded course days. Use deactivation/left_on for departure; never delete historical course data from the frontend. Administrator profile cannot be created or transferred by this RPC. Existing usernames cannot change here: alias and Auth login must remain synchronized by the operator. A repeated grant for the same child/profile/kind safely reactivates its existing row; an unrelated supplied grant ID cannot rebind it. New subjects/competencies cannot be activated retroactively after attendance exists, and closed periods cannot overlap subsequent periods. Text maxima: topic 500, worked_on 2000, went_well/next_step 1500, parent_note 2500, internal_note 4000, appointment title 250. Role changes invalidate old access semantics immediately through database role checks; account reset/deactivation uses the audited Edge workflow.

## Account administration

The ordinary account workflow is the server-side Edge Function `portal-accounts`, not a browser service-role client or local operator key. The single `index.ts` file is prepared for Supabase Dashboard deployment, with `verify_jwt=true`. It independently authenticates the supplied token with Auth, requires the confirmed operator email `zhlerncoaching@gmail.com`, then invokes the authorization RPC using that user's JWT. Email alone never confers the role.

POST JSON contract: `{action,request_id,...payload}`. Create accepts `username,display_name,role` (parent/student/teacher only); reset/disable/enable accept `profile_id`. A fresh success returns `{ok:true,action,profile_id,username,initial_password?}`. The random password appears only in a fresh create/reset response, with no-store headers. Retry of a succeeded UUID returns `replayed:true` without the password; pending/failed UUIDs do not repeat Auth writes.

- `begin_portal_account_action` is JWT-scoped: designated active admin, live unrevoked session, mandatory AAL2 even if ordinary staff settings are weakened, strict fields/targets, rate limits and durable reservation. At most one pending action per target or new username.
- `prepare_portal_account_action` and `finish_portal_account_action` are service-role-only and recheck the authorizing live administrator session. Reset/disable remove data access before any Auth change. New accounts remain inactive; enabling is explicit and invalidates old sessions.
- `portal_private.account_actions` records each reserved action, actor, session, target, time and success/failure. No password, token or provider error object is persisted. It is not exposed in snapshots or authenticated table access. If the database fails, pending is deliberately retained for operator investigation, never automatically retried or unlocked.

Account activation changes through `admin_change('profile',...)` are rejected; use the audited account workflow. First administrator setup remains a separately verified Dashboard procedure. The prepared client supports initial TOTP enrollment before any learning data, and recovery only for the operator mailbox; existing MFA is still required. Recovery fragments are immediately removed from the URL and sessions remain memory-only. These Auth/Edge flows still require real integration acceptance.

## Deployment and tests

Migrations create no Auth users, no administrator, no sample data and no course list. The original migration is preserved; corrections are additive. `operator/sync-course-days.mjs` reads the existing `course-data.js` and emits the additive `supabase/course-days.generated.sql` for Dashboard use, with source hash and an exact-date test; no separate manually maintained calendar. No SQL has been run against a real project. RLS and grants must be tested through actual GoTrue/PostgREST sessions before real data. PGlite SQL tests and mocked Edge tests are supplemental policy evidence, not an Auth/Edge integration pass.
