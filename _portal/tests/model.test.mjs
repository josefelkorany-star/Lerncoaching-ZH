import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
  isCalendarDate, zurichDate, dayDifference, courseDates,
  lastOfferedCourseDay, nextOfferedCourseDay, reachedCourseDays,
  deriveStudent, deriveTeam, prioritiesFor
} from '../../portal-model.js';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../../course-data.js', import.meta.url), 'utf8'), context);
const calendar = JSON.parse(JSON.stringify(context.LCCourseData));
const clone = value => JSON.parse(JSON.stringify(value));
const student = {id: 'a', display_name: 'Testkind A', school_level: 'Primar', joined_on: '2027-01-01', left_on: null, active: true};
function fixture() {
  return {
    profile: {role: 'parent', active: true}, students: [clone(student)],
    subjects: [
      {id: 'math', student_id: 'a', name: 'Mathematik', topic: 'Brüche', target_level: 4, active_from: '2027-01-01', active_until: null},
      {id: 'english', student_id: 'a', name: 'Englisch', topic: 'Reading', target_level: 4, active_from: '2027-01-16', active_until: null}
    ],
    subject_levels: [
      {id: 'm1', student_id: 'a', subject_id: 'math', course_day: '2027-01-09', level: 2},
      {id: 'm2', student_id: 'a', subject_id: 'math', course_day: '2027-01-23', level: 3},
      {id: 'e1', student_id: 'a', subject_id: 'english', course_day: '2027-01-16', level: 4}
    ],
    competencies: [], competency_levels: [], attendance: [], feedback: [], feedback_parent: [], feedback_internal: [], exams: [], appointments: []
  };
}

test('uses the approved calendar: 36 courses in 2027, all 24 dates of 2026', () => {
  const dates = courseDates(calendar);
  assert.equal(dates.filter(day => day.startsWith('2027')).length, 36);
  assert.equal(dates.filter(day => day.startsWith('2026')).length, 24);
  assert.ok(dates.includes('2027-08-21'));
  for (const date of ['2027-01-02', '2027-03-27', '2027-05-15']) assert.ok(!dates.includes(date));
  assert.ok(dates.every(day => new Date(`${day}T12:00Z`).getUTCDay() === 6));
});

test('calendar is injected, deduplicated and not a private second list', () => {
  assert.deepEqual(courseDates(['2027-01-23', '2027-01-09', '2027-01-09']), ['2027-01-09', '2027-01-23']);
  assert.throws(() => courseDates(undefined), /Kurskalender/);
  assert.throws(() => courseDates(['2027-02-30']), /Kurskalender/);
});

test('Zurich date changes at local midnight in winter and summer', () => {
  assert.equal(zurichDate('2026-12-31T22:59:59Z'), '2026-12-31');
  assert.equal(zurichDate('2026-12-31T23:00:00Z'), '2027-01-01');
  assert.equal(zurichDate('2027-06-26T21:59:59Z'), '2027-06-26');
  assert.equal(zurichDate('2027-06-26T22:00:00Z'), '2027-06-27');
  assert.equal(zurichDate(new Date('2027-06-26T22:00:00Z')), '2027-06-27');
});

test('calendar-day differences are DST safe and bad/ambiguous dates are rejected', () => {
  assert.equal(dayDifference('2027-03-29', '2027-03-28'), 1);
  assert.equal(dayDifference('2027-11-01', '2027-10-31'), 1);
  assert.equal(dayDifference('2027-01-01', '2026-12-31'), 1);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2027-02-29'), false);
  for (const value of ['2027-02-30', '01/02/2027', '2027-02-01T12:00:00']) assert.throws(() => zurichDate(value));
});

test('last and next offered day cross New Year and skip excluded Saturdays', () => {
  assert.equal(lastOfferedCourseDay(calendar, '2027-01-02'), '2026-12-12');
  assert.equal(nextOfferedCourseDay(calendar, '2027-01-02'), '2027-01-09');
  assert.notEqual(nextOfferedCourseDay(calendar, '2027-03-27'), '2027-03-27');
  assert.equal(lastOfferedCourseDay(calendar, '2020-01-01'), null);
  assert.equal(nextOfferedCourseDay(calendar, '2030-01-01'), null);
});

test('attendance denominator uses only reached offered days in the inclusive enrolment interval', () => {
  const enrolled = {...student, joined_on: '2027-01-10', left_on: '2027-01-23'};
  assert.deepEqual(reachedCourseDays(enrolled, '2027-02-20', calendar), ['2027-01-16', '2027-01-23']);
  assert.deepEqual(reachedCourseDays(enrolled, '2027-01-15', calendar), []);
  assert.deepEqual(reachedCourseDays({...student, joined_on: null}, '2027-01-23', calendar), []);
});

test('attendance is never inferred from feedback or subject assessments', () => {
  const data = fixture();
  data.feedback.push({id: 'f1', student_id: 'a', course_day: '2027-01-09', worked_on: 'Test'});
  data.attendance.push({student_id: 'a', course_day: '2027-01-09', status: 'present'},
    {student_id: 'a', course_day: '2027-01-16', status: 'absent'},
    {student_id: 'a', course_day: '2027-01-30', status: 'present'});
  const model = deriveStudent(data, 'a', '2027-01-23', calendar);
  assert.deepEqual(model.attendance.map(row => row.status), ['present', 'absent', 'missing']);
  assert.deepEqual([model.summary.present, model.summary.absent, model.summary.unrecorded], [1, 1, 1]);
  assert.ok(!model.history.some(point => point.date === '2027-01-16'));
});

test('historical mean uses only subjects active and assessed at that point', () => {
  const result = deriveStudent(fixture(), 'a', '2027-01-23', calendar);
  assert.deepEqual(result.history.map(point => point.value), [2, 3, 3.5]);
  assert.equal(result.summary.level, 3.5);
  assert.equal(result.summary.progress, 1.5);
});

test('later activation and future levels never rewrite earlier history', () => {
  const data = fixture();
  const before = deriveStudent(data, 'a', '2027-01-16', calendar);
  data.subjects.push({id: 'future', student_id: 'a', name: 'Später', active_from: '2027-01-23', target_level: 5});
  data.subject_levels.push({id: 'future-level', subject_id: 'future', course_day: '2027-01-23', level: 5});
  data.subject_levels.push({id: 'future-math', subject_id: 'math', course_day: '2027-01-30', level: 5});
  const after = deriveStudent(data, 'a', '2027-01-16', calendar);
  assert.deepEqual(after.history, before.history);
  assert.deepEqual(after.subjects, before.subjects);
});

test('deactivation retains earlier points and inclusive final active date', () => {
  const data = fixture();
  data.subjects[1].active_until = '2027-01-16';
  const result = deriveStudent(data, 'a', '2027-01-23', calendar);
  assert.deepEqual(result.history.map(point => point.value), [2, 3, 3]);
  assert.deepEqual(result.subjects.map(item => item.id), ['math']);
});

test('re-activation is a new subject period and does not inherit another period level', () => {
  const data = fixture();
  data.subjects[0].active_until = '2027-01-16';
  data.subjects[1].active_until = '2027-01-16';
  data.subjects.push({id: 'math-again', student_id: 'a', name: 'Mathematik', active_from: '2027-01-23', target_level: 4});
  const result = deriveStudent(data, 'a', '2027-01-23', calendar);
  assert.equal(result.summary.level, null);
  assert.equal(result.subjects[0].level, null);
  assert.deepEqual(result.history.map(point => point.value), [2, 3, null]);
});

test('missing assessments are not zero and do not mean absence', () => {
  const data = fixture();
  data.subject_levels = data.subject_levels.filter(row => row.subject_id === 'math');
  const result = deriveStudent(data, 'a', '2027-01-16', calendar);
  assert.equal(result.summary.level, 2);
  assert.equal(result.subjects.find(item => item.id === 'english').level, null);
  assert.deepEqual(result.history.map(point => point.value), [2, 2]);
  assert.equal(result.history[1].status, 'carried');
  assert.equal(result.summary.absent, 0);
});

test('empty and invalid data have an explicit unknown state with no invented start level', () => {
  const data = fixture();
  data.subject_levels = [{subject_id: 'math', course_day: '2027-01-09', level: 0},
    {subject_id: 'math', course_day: '2027-01-16', level: 6}];
  const result = deriveStudent(data, 'a', '2027-01-23', calendar);
  assert.equal(result.summary.level, null);
  assert.equal(result.summary.progress, null);
  assert.equal(result.subjects[0].start, null);
  assert.ok(result.history.every(point => point.value === null && point.status === 'unrated'));
  assert.deepEqual(result.priorities, []);
  assert.equal(deriveStudent(data, 'not-in-authorized-snapshot', '2027-01-23', calendar), null);
});

test('progress starts at first valid entry rather than an empty leading date', () => {
  const data = fixture();
  data.subjects = [data.subjects[0]];
  data.subject_levels = [{subject_id: 'math', course_day: '2027-01-16', level: 4},
    {subject_id: 'math', course_day: '2027-01-23', level: 2}];
  const result = deriveStudent(data, 'a', '2027-01-23', calendar);
  assert.deepEqual(result.history.map(point => point.value), [null, 4, 2]);
  assert.equal(result.summary.progress, -2);
});

test('initial non-Saturday assessment is valid while history remains course-day based', () => {
  const data = fixture();
  data.subjects = [data.subjects[0]];
  data.subject_levels = [{subject_id: 'math', course_day: '2027-01-04', level: 2}];
  const result = deriveStudent(data, 'a', '2027-01-09', calendar);
  assert.equal(result.subjects[0].start, 2);
  assert.deepEqual(result.history.map(point => point.date), ['2027-01-09']);
  assert.equal(result.history[0].value, 2);
});

test('assessment from another enrolment period cannot alter a subject interval', () => {
  const data = fixture();
  data.subjects[0].active_from = '2027-01-16';
  const result = deriveStudent(data, 'a', '2027-01-16', calendar);
  assert.equal(result.subjects.find(item => item.id === 'math').level, null);
});

test('departed student history stops at exit even when later records are supplied', () => {
  const data = fixture(); data.students[0].left_on = '2027-01-16';
  const result = deriveStudent(data, 'a', '2027-02-01', calendar);
  assert.deepEqual(result.history.map(point => point.date), ['2027-01-09', '2027-01-16']);
  assert.equal(result.subjects.find(item => item.id === 'math').level, 2);
  assert.ok(!result.events.some(event => event.type === 'course'));
});

test('priority uses inclusive 0–10 day window only when a target gap exists', () => {
  const subjects = [{id: 'm', name: 'Mathe', level: 3, target: 4}];
  for (const day of ['2027-01-16', '2027-01-26']) {
    assert.equal(prioritiesFor(subjects, [], [{subject_id: 'm', exam_date: day}], '2027-01-16')[0].label, 'Vor Prüfung');
  }
  for (const day of ['2027-01-15', '2027-01-27']) {
    assert.equal(prioritiesFor(subjects, [], [{subject_id: 'm', exam_date: day}], '2027-01-16')[0].label, 'Im Blick');
  }
  assert.equal(prioritiesFor([{...subjects[0], level: 5}], [], [{subject_id: 'm', exam_date: '2027-01-17'}], '2027-01-16')[0].label, 'Sicher');
});

test('priorities use exact gap categories, positive goal language and maximum three', () => {
  const result = prioritiesFor([
    {id: 'safe', name: 'Ziel', level: 5, target: 4}, {id: 'small', name: 'Klein', level: 3, target: 4},
    {id: 'big', name: 'Gross', level: 1, target: 4}, {id: 'exam', name: 'Prüfung', level: 2, target: 4}
  ], [], [{subject_id: 'exam', exam_date: '2027-01-17'}], '2027-01-16');
  assert.deepEqual(result.map(row => row.label), ['Vor Prüfung', 'Baustelle', 'Im Blick']);
  const achieved = prioritiesFor([{id: 'safe', name: 'Ziel', level: 5, target: 3}], [], [], '2027-01-16')[0];
  assert.equal(achieved.gap, 0); assert.match(achieved.detail, /Ziel erreicht/); assert.ok(!achieved.detail.includes('-2'));
});

test('optional competence without agreed goal or measurement cannot become a priority', () => {
  const competencies = [{id: 'c1', name: 'Organisation', level: 2, target: null},
    {id: 'c2', name: 'Planen', level: null, target: 4}, {id: 'c3', name: 'Erklären', level: 2, target: 4}];
  assert.deepEqual(prioritiesFor([], competencies, [], '2027-01-16').map(row => row.id), ['c3']);
});

test('priority sorting is stable regardless of database array order', () => {
  const subjects = ['z', 'b', 'a', 'c'].map(id => ({id, name: id, level: 2, target: 4}));
  assert.deepEqual(prioritiesFor(subjects, [], [], '2027-01-16'), prioritiesFor(subjects.slice().reverse(), [], [], '2027-01-16'));
});

test('team previews seven days while student priorities include an exam in ten days', () => {
  const data = fixture();
  data.exams = [{id: 'e1', student_id: 'a', subject_id: 'math', exam_date: '2027-01-26', topic: 'Brüche'}];
  assert.equal(deriveStudent(data, 'a', '2027-01-16', calendar).priorities[0].label, 'Vor Prüfung');
  assert.equal(deriveTeam(data, '2027-01-16', calendar).examCount, 0);
  data.exams.push({id: 'e2', student_id: 'a', subject_id: 'math', exam_date: '2027-01-23', topic: 'Geometrie'});
  assert.equal(deriveTeam(data, '2027-01-16', calendar).examCount, 1);
});

test('team counts explicit absence separately and never expects feedback before entry', () => {
  const data = fixture();
  data.students.push({...student, id: 'new', joined_on: '2027-01-17', display_name: 'Neuzugang'});
  data.students.push({...student, id: 'left', left_on: '2027-01-09', display_name: 'Ausgetreten'});
  data.students.push({...student, id: 'inactive', active: false, display_name: 'Inaktiv'});
  data.attendance.push({student_id: 'a', course_day: '2027-01-16', status: 'absent'});
  const result = deriveTeam(data, '2027-01-18', calendar);
  assert.equal(result.lastCourseDay, '2027-01-16'); assert.equal(result.absenceCount, 1); assert.equal(result.openFeedback, 0);
  assert.deepEqual(result.rows.map(row => row.id).sort(), ['a', 'new']);
  assert.equal(result.rows.find(row => row.id === 'new').feedbackStatus, 'Noch kein Kurstag');
});

test('team feedback status uses the actual last offered Saturday, not a hardcoded date', () => {
  const data = fixture();
  data.feedback.push({id: 'f', student_id: 'a', course_day: '2027-01-16', worked_on: 'Test'});
  assert.equal(deriveTeam(data, '2027-01-16', calendar).rows[0].feedbackStatus, 'Erfasst');
  assert.equal(deriveTeam(data, '2027-01-23', calendar).rows[0].feedbackStatus, 'Offen');
});

test('events include global appointments; student presentation never adds parent-only or internal fields', () => {
  const data = fixture();
  data.profile.role = 'student';
  data.feedback = [{id: 'f', student_id: 'a', course_day: '2027-01-16', next_step: 'Üben', dangerous_internal: 'DO NOT COPY'}];
  data.feedback_parent = [{student_id: 'a', course_day: '2027-01-16', note: 'PARENT ONLY'}];
  data.feedback_internal = [{student_id: 'a', course_day: '2027-01-16', note: 'INTERNAL'}];
  data.appointments = [{id: 'global', student_id: null, appointment_date: '2027-01-20', title: 'Lernzielgespräch', audience: 'student'},
    {id: 'parent', student_id: 'a', appointment_date: '2027-01-21', title: 'Elterngespräch', audience: 'parent'}];
  const result = deriveStudent(data, 'a', '2027-01-16', calendar);
  assert.equal(result.events.filter(event => event.type === 'appointment').length, 1);
  assert.deepEqual(result.internal, []);
  assert.ok(!JSON.stringify(result).includes('PARENT ONLY')); assert.ok(!JSON.stringify(result).includes('INTERNAL'));
  assert.ok(!JSON.stringify(result).includes('DO NOT COPY'));
  data.profile.role = 'parent';
  assert.equal(deriveStudent(data, 'a', '2027-01-16', calendar).feedback[0].parent_note, 'PARENT ONLY');
  assert.deepEqual(deriveStudent(data, 'a', '2027-01-16', calendar).internal, []);
  data.profile = {role: 'teacher', active: true, core_team: true};
  assert.equal(deriveStudent(data, 'a', '2027-01-16', calendar).internal[0].note, 'INTERNAL');
  data.profile.core_team = false;
  assert.deepEqual(deriveStudent(data, 'a', '2027-01-16', calendar).internal, []);
});

test('derivation is pure and does not modify the authorized snapshot', () => {
  const data = fixture(), before = JSON.stringify(data);
  deriveStudent(data, 'a', '2027-01-23', calendar); deriveTeam(data, '2027-01-23', calendar);
  assert.equal(JSON.stringify(data), before);
});

test('team does not conflate missing attendance with a confirmed presence', () => {
  const data = fixture();
  assert.equal(deriveTeam(data, '2027-01-16', calendar).rows[0].attendanceStatus, 'missing');
  data.attendance.push({student_id: 'a', course_day: '2027-01-16', status: 'present'});
  assert.equal(deriveTeam(data, '2027-01-16', calendar).rows[0].attendanceStatus, 'present');
});

test('staff feedback editing retains exact recorded assessment and historical subject period', () => {
  const data = fixture();
  data.profile = {role: 'teacher', active: true, core_team: true};
  data.subjects[0].active_until = '2027-01-23';
  data.feedback = [{id: 'f', student_id: 'a', subject_id: 'math', course_day: '2027-01-23', worked_on: 'Brüche'},
    {id: 'f2', student_id: 'a', subject_id: 'math', course_day: '2027-01-16', worked_on: 'Brüche'}];
  const result = deriveStudent(data, 'a', '2027-01-30', calendar);
  assert.ok(!result.subjects.some(item => item.id === 'math'));
  assert.equal(result.subjectPeriods.find(item => item.id === 'math').active_until, '2027-01-23');
  assert.equal(result.feedback[0].subject_id, 'math');
  assert.equal(result.feedback[0].new_level, 3);
  assert.equal(result.feedback[1].new_level, null);
  data.profile.role = 'student';
  assert.deepEqual(deriveStudent(data, 'a', '2027-01-30', calendar).subjectPeriods, []);
  assert.ok(!('new_level' in deriveStudent(data, 'a', '2027-01-30', calendar).feedback[0]));
});
