// Pure presentation calculations. The database, not this module, authorizes access.
// Pass course-data.js / LCCourseData as the calendar source; no separate date list.
const DAY = 86400000;
const list = value => Array.isArray(value) ? value : [];
const validLevel = value => Number.isInteger(value) && value >= 1 && value <= 5;
const order = (a, b) => String(a).localeCompare(String(b), 'de-CH');

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function zurichDate(value = new Date()) {
  if (isCalendarDate(value)) return value;
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new TypeError('Ein Datum oder ein Zeitpunkt mit Zeitzone ist erforderlich.');
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) throw new TypeError('Ungültiger Zeitpunkt.');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dayDifference(date, reference) {
  const first = zurichDate(date), second = zurichDate(reference);
  return (Date.parse(`${first}T12:00:00Z`) - Date.parse(`${second}T12:00:00Z`)) / DAY;
}

export function courseDates(source = globalThis.LCCourseData) {
  const values = Array.isArray(source) ? source : source?.dates;
  if (!Array.isArray(values) || values.some(day => !isCalendarDate(day))) {
    throw new TypeError('Der freigegebene Kurskalender fehlt oder enthält ungültige Daten.');
  }
  return [...new Set(values)].sort();
}

export function lastOfferedCourseDay(source, asOf = new Date()) {
  const day = zurichDate(asOf);
  const reached = courseDates(source).filter(date => date <= day);
  return reached[reached.length - 1] ?? null;
}

export function nextOfferedCourseDay(source, asOf = new Date()) {
  const day = zurichDate(asOf);
  return courseDates(source).find(date => date >= day) ?? null;
}

function enrolledOn(student, day) {
  return isCalendarDate(student.joined_on) && student.joined_on <= day &&
    (!student.left_on || (isCalendarDate(student.left_on) && day <= student.left_on));
}

export function reachedCourseDays(student, asOf, source) {
  const day = zurichDate(asOf);
  return courseDates(source).filter(date => date <= day && enrolledOn(student, date));
}

function activeOn(item, day) {
  // End dates are inclusive. Re-activation uses a new period/ID, not a rewritten past.
  return isCalendarDate(item.active_from) && item.active_from <= day &&
    (!item.active_until || (isCalendarDate(item.active_until) && day <= item.active_until));
}

function measuredLevels(rows, item, foreignKey, asOf) {
  return list(rows).filter(row => row[foreignKey] === item.id &&
    isCalendarDate(row.course_day) && row.course_day <= asOf && activeOn(item, row.course_day) && validLevel(row.level))
    .sort((a, b) => order(a.course_day, b.course_day) || order(a.created_at || '', b.created_at || '') || order(a.id || '', b.id || ''));
}

function summarizeItem(item, rows, foreignKey, day) {
  const measured = measuredLevels(rows, item, foreignKey, day);
  const current = measured[measured.length - 1];
  return {
    id: item.id, name: item.name || '', topic: item.topic || '',
    level: current?.level ?? null,
    target: validLevel(item.target_level) ? item.target_level : null,
    start: measured[0]?.level ?? null,
    measuredOn: current?.course_day ?? null
  };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function attendanceFor(snapshot, student, days) {
  const rows = list(snapshot.attendance).filter(row => row.student_id === student.id);
  const byDay = new Map(rows.map(row => [row.course_day, row.status]));
  return days.map(date => {
    const value = byDay.get(date);
    return {date, status: value === 'present' || value === 'absent' ? value : 'missing'};
  });
}

export function studentHistory(snapshot, student, asOf, source) {
  const days = reachedCourseDays(student, asOf, source);
  const attendance = attendanceFor(snapshot, student, days);
  const subjects = list(snapshot.subjects).filter(row => row.student_id === student.id);
  const absent = new Set(attendance.filter(row => row.status === 'absent').map(row => row.date));
  return days.filter(date => !absent.has(date)).map(date => {
    const items = subjects.filter(item => activeOn(item, date))
      .map(item => summarizeItem(item, snapshot.subject_levels, 'subject_id', date));
    const rated = items.filter(item => item.level !== null);
    const value = mean(rated.map(item => item.level));
    const updated = rated.some(item => item.measuredOn === date);
    return {
      date, value, status: value === null ? 'unrated' : updated ? 'rated' : 'carried',
      detail: value === null ? 'Noch keine erfasste Coachingstufe.' :
        `${rated.length} bewertete ${rated.length === 1 ? 'Fach' : 'Fächer'}; ${updated ? 'an diesem Tag aktualisiert' : 'letzte erfasste Stufen übernommen'}.`
    };
  });
}

function upcomingExams(snapshot, studentId, today, window = Infinity) {
  return list(snapshot.exams).filter(row => row.student_id === studentId && isCalendarDate(row.exam_date) &&
    dayDifference(row.exam_date, today) >= 0 && dayDifference(row.exam_date, today) <= window)
    .sort((a, b) => order(a.exam_date, b.exam_date) || order(a.id || '', b.id || ''));
}

export function prioritiesFor(subjects, competencies, exams, asOf) {
  const today = zurichDate(asOf);
  const candidates = [
    ...list(subjects).map(item => ({...item, type: 'subject'})),
    ...list(competencies).map(item => ({...item, type: 'competency'}))
  ].filter(item => validLevel(item.level) && validLevel(item.target));
  return candidates.map(item => {
    const gap = Math.max(0, item.target - item.level);
    const nextExam = item.type === 'subject' ? list(exams).filter(exam =>
      (exam.subject_id === item.id || (!exam.subject_id && exam.subject === item.name)) &&
      isCalendarDate(exam.exam_date) && dayDifference(exam.exam_date, today) >= 0 && dayDifference(exam.exam_date, today) <= 10)
      .sort((a, b) => order(a.exam_date, b.exam_date) || order(a.id || '', b.id || ''))[0] : null;
    const urgent = gap > 0 && nextExam;
    const severity = urgent ? 0 : gap >= 2 ? 1 : gap === 1 ? 2 : 3;
    return {
      id: item.id, name: item.name, type: item.type, gap,
      label: ['Vor Prüfung', 'Baustelle', 'Im Blick', 'Sicher'][severity],
      tone: ['critical', 'serious', 'watch', 'safe'][severity], severity,
      examDate: urgent ? nextExam.exam_date : null,
      detail: gap === 0 ? 'Ziel erreicht – weiter so!' : urgent ?
        `Prüfung am ${nextExam.exam_date}: ${nextExam.topic || item.topic || item.name}. Noch ${gap} ${gap === 1 ? 'Stufe' : 'Stufen'} bis zum Ziel.` :
        `Noch ${gap} ${gap === 1 ? 'Stufe' : 'Stufen'} bis zum vereinbarten Ziel.`
    };
  }).sort((a, b) => a.severity - b.severity || order(a.examDate || '9999', b.examDate || '9999') ||
    b.gap - a.gap || order(a.name, b.name) || order(a.type, b.type) || order(a.id, b.id)).slice(0, 3);
}

function safeFeedback(snapshot, studentId, today) {
  const role = snapshot.profile?.role;
  const parentAllowed = ['parent', 'teacher', 'admin'].includes(role);
  return list(snapshot.feedback).filter(row => row.student_id === studentId && isCalendarDate(row.course_day) && row.course_day <= today)
    .sort((a, b) => order(b.course_day, a.course_day) || order(a.id || '', b.id || ''))
    .map(row => {
      const subject = list(snapshot.subjects).find(item => item.id === row.subject_id);
      const result = {id: row.id, course_day: row.course_day, subject_id: row.subject_id ?? null, subject: subject?.name || row.subject || '',
        topic: row.topic || '', worked_on: row.worked_on || '', went_well: row.went_well || '', next_step: row.next_step || '',
        arrival_review: typeof row.arrival_review === 'boolean' ? row.arrival_review : null,
        pause_review: typeof row.pause_review === 'boolean' ? row.pause_review : null,
        understanding: validLevel(row.understanding) ? row.understanding : null,
        effort: validLevel(row.effort) ? row.effort : null};
      if (parentAllowed) {
        const parent = list(snapshot.feedback_parent).find(item => item.student_id === studentId && item.course_day === row.course_day);
        if (parent?.note) result.parent_note = parent.note;
      }
      if (['teacher', 'admin'].includes(role)) {
        const assessment = list(snapshot.subject_levels).find(item => item.student_id === studentId &&
          item.subject_id === row.subject_id && item.course_day === row.course_day);
        result.new_level = validLevel(assessment?.level) ? assessment.level : null;
      }
      return result;
    });
}

export function deriveStudent(snapshot, studentId, asOf, source) {
  const today = zurichDate(asOf);
  const student = list(snapshot.students).find(row => row.id === studentId);
  if (!student) return null;
  const day = student.left_on && student.left_on < today ? student.left_on : today;
  const subjects = list(snapshot.subjects).filter(item => item.student_id === studentId && activeOn(item, day))
    .map(item => summarizeItem(item, snapshot.subject_levels, 'subject_id', day)).sort((a, b) => order(a.name, b.name) || order(a.id, b.id));
  const competencies = list(snapshot.competencies).filter(item => item.student_id === studentId && activeOn(item, day))
    .map(item => summarizeItem(item, snapshot.competency_levels, 'competency_id', day)).sort((a, b) => order(a.name, b.name) || order(a.id, b.id));
  const attendance = attendanceFor(snapshot, student, reachedCourseDays(student, today, source));
  const history = studentHistory(snapshot, student, today, source);
  const values = history.filter(point => point.value !== null);
  const level = mean(subjects.filter(item => item.level !== null).map(item => item.level));
  const exams = upcomingExams(snapshot, studentId, today);
  const staff = snapshot.profile?.active !== false && (snapshot.profile?.role === 'admin' ||
    (snapshot.profile?.role === 'teacher' && snapshot.profile?.core_team === true));
  const internal = staff ? list(snapshot.feedback_internal).filter(row => row.student_id === studentId && row.course_day <= today)
    .map(row => ({course_day: row.course_day, note: row.note || ''})).sort((a, b) => order(b.course_day, a.course_day)) : [];
  const events = [
    ...courseDates(source).filter(date => date >= today && enrolledOn(student, date)).map(date =>
      ({date, title: 'Lernsamstag', detail: !Array.isArray(source) && source?.startTime && source?.endTime ? `${source.startTime}–${source.endTime} Uhr` : 'Gemäss Kursplan', type: 'course'})),
    ...exams.map(exam => ({date: exam.exam_date, title: exam.subject || subjects.find(item => item.id === exam.subject_id)?.name || 'Prüfung', detail: exam.topic || '', type: 'exam'})),
    ...list(snapshot.appointments).filter(row => (row.student_id === null || row.student_id === studentId) &&
      isCalendarDate(row.appointment_date) && row.appointment_date >= today &&
      (row.audience !== 'parent' || ['parent', 'teacher', 'admin'].includes(snapshot.profile?.role)))
      .map(row => ({date: row.appointment_date, title: row.title || 'Termin', detail: '', type: 'appointment'}))
  ].sort((a, b) => order(a.date, b.date) || order(a.type, b.type) || order(a.title, b.title));
  return {
    summary: {level, progress: values.length && level !== null ? level - values[0].value : null,
      present: attendance.filter(row => row.status === 'present').length,
      absent: attendance.filter(row => row.status === 'absent').length,
      unrecorded: attendance.filter(row => row.status === 'missing').length},
    priorities: prioritiesFor(subjects, competencies, exams, today), subjects, competencies, history, attendance,
    feedback: safeFeedback(snapshot, studentId, today), internal, events,
    subjectPeriods: staff ? list(snapshot.subjects).filter(item => item.student_id === studentId)
      .map(item => ({id: item.id, name: item.name, active_from: item.active_from, active_until: item.active_until ?? null}))
      .sort((a, b) => order(a.active_from, b.active_from) || order(a.name, b.name) || order(a.id, b.id)) : []
  };
}

export function deriveTeam(snapshot, asOf, source) {
  const today = zurichDate(asOf), lastCourseDay = lastOfferedCourseDay(source, today);
  const students = list(snapshot.students).filter(student => student.active !== false && enrolledOn(student, today));
  const rows = students.map(student => {
    const derived = deriveStudent(snapshot, student.id, today, source);
    const eligible = lastCourseDay !== null && enrolledOn(student, lastCourseDay);
    const attendance = derived.attendance.find(row => row.date === lastCourseDay);
    const absence = eligible && attendance?.status === 'absent';
    const feedback = derived.feedback.some(row => row.course_day === lastCourseDay);
    const exams = upcomingExams(snapshot, student.id, today, 7);
    const priority = derived.priorities[0];
    return {id: student.id, display_name: student.display_name, school_level: student.school_level,
      feedbackStatus: !eligible ? 'Noch kein Kurstag' : absence ? 'Gefehlt' : feedback ? 'Erfasst' : 'Offen',
      examDate: exams[0]?.exam_date ?? null, examTopic: exams[0]?.topic ?? '', absence: Boolean(absence),
      attendanceStatus: eligible ? (attendance?.status ?? 'missing') : 'missing',
      priority: priority?.label ?? 'Noch keine Grundlage', priorityTone: priority?.tone ?? 'safe',
      severity: priority?.severity ?? 4, examCount: exams.length};
  }).sort((a, b) => a.severity - b.severity || order(a.examDate || '9999', b.examDate || '9999') ||
    order(a.display_name, b.display_name) || order(a.id, b.id));
  return {lastCourseDay, openFeedback: rows.filter(row => row.feedbackStatus === 'Offen').length,
    examCount: rows.reduce((sum, row) => sum + row.examCount, 0), absenceCount: rows.filter(row => row.absence).length, rows};
}
