import test from 'node:test';
import assert from 'node:assert/strict';
import {dependency} from '../dev-dependencies.mjs';
import {mountPortal} from '../../portal-ui.js';

// DOM emulation only: this suite does not certify browser layout or native form validation.
const {parseHTML}=dependency('linkedom');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(handlers={}){
  const {document,window}=parseHTML('<!doctype html><html><body><div id="root"></div></body></html>');
  globalThis.document=document;
  const root=document.querySelector('#root'),ui=mountPortal(root,handlers);
  // Linkedom intentionally omits native HTMLFormElement and FormData behaviour.
  // These shims cover serialization and event wiring, not browser validity/layout.
  const selectProto=window.HTMLSelectElement.prototype;
  if(!Object.getOwnPropertyDescriptor(selectProto,'value').set){
    const getter=Object.getOwnPropertyDescriptor(selectProto,'value').get;
    Object.defineProperty(selectProto,'value',{configurable:true,get:getter,set(value){const choices=[...this.querySelectorAll('option')];for(const option of choices)option.removeAttribute('selected');const chosen=choices.find(option=>option.value===String(value));if(chosen)chosen.selected=true;}});
  }
  globalThis.FormData=class extends Map{
    constructor(form){super();for(const field of form.querySelectorAll('input,select,textarea')){
      if(!field.name||field.disabled||field.closest('fieldset')?.disabled)continue;
      this.set(field.name,field.value??'');
    }}
  };
  const shimForms=()=>{for(const form of root.querySelectorAll('form')){
    Object.defineProperty(form,'elements',{configurable:true,get(){return Object.fromEntries([...form.querySelectorAll('[name]')].map(input=>[input.name,input]));}});
    form.reportValidity=()=>true;
    form.reset=()=>{for(const field of form.querySelectorAll('input,select,textarea'))field.value=field.getAttribute('value')||'';};
  }};
  const render=vm=>{ui.render(vm);shimForms();};
  const event=(target,type,extra={})=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,extra);target.dispatchEvent(e);return e;};
  return {root,ui,render,event,shimForms};
}
function fixture(role='parent'){
  return {
    profile:{id:'account',display_name:'Testkonto',role},
    students:[{id:'child',display_name:'Testkind',school_level:'Primar',joined_on:'2026-10-01'}],selectedStudent:'child',
    today:'2026-11-16',courseDays:['2026-10-24','2026-10-31','2026-11-07','2026-11-14','2026-11-21'],
    derived:{summary:{level:3,progress:1,present:1,absent:1,unrecorded:2},priorities:[],
      subjects:[{id:'math-now',name:'Mathematik',topic:'Brüche',level:3,target:4}],competencies:[],
      subjectPeriods:[{id:'math-old',name:'Mathematik zuvor',active_from:'2026-10-01',active_until:'2026-11-07'},{id:'math-now',name:'Mathematik',active_from:'2026-11-08',active_until:null}],
      history:[{date:'2026-10-24',value:2,status:'rated'},{date:'2026-10-31',value:null,status:'unrated'},{date:'2026-11-07',value:3,status:'rated'}],
      attendance:[{date:'2026-11-07',status:'present'},{date:'2026-11-14',status:'missing'}],
      feedback:[{course_day:'2026-11-07',subject_id:'math-old',subject:'Mathematik zuvor',worked_on:'Gemeinsam geübt',went_well:'Erklärt',next_step:'Weiterüben',arrival_review:false,pause_review:true,understanding:3,effort:4,parent_note:'PARENT_SECRET',new_level:3}],
      internal:[{course_day:'2026-11-07',note:'TEAM_SECRET'}],events:[],
      team:{lastCourseDay:'2026-11-14',openFeedback:1,examCount:0,absenceCount:0,rows:[{id:'child',display_name:'Testkind',feedbackStatus:'Offen',absence:false,attendanceStatus:'missing',priority:'In Arbeit'}]}
    },admin:{families:[{id:'family',label:'Testfamilie'}],profiles:[{id:'parent',display_name:'Testeltern',username:'testeltern',role:'parent',active:true,core_team:false}],students:[],subjects:[],competencies:[],appointments:[],grants:[]}
  };
}

test('unconfigured/login screens contain no role switch or family data',()=>{
  const {root,ui}=setup();ui.showUnavailable();assert.match(root.textContent,/nicht verfügbar/);assert.equal(root.querySelectorAll('form').length,0);
  ui.showLogin();assert.equal(root.querySelector('[name=password]').type,'password');assert.equal(root.querySelector('[name=totp]').getAttribute('pattern'),'[0-9]{6}');
  assert.equal(root.querySelector('[name=role]'),null);assert.doesNotMatch(root.textContent,/Testkind|TEAM_SECRET/);
});
test('student view omits parent and team notes and sibling switching',()=>{
  const {root,render}=setup();render(fixture('student'));
  assert.match(root.textContent,/Dein Lernweg/);assert.doesNotMatch(root.textContent,/PARENT_SECRET|TEAM_SECRET/);
  assert.equal(root.querySelector('[data-child]'),null);assert.equal(root.querySelector('#portal-exam'),null);assert.equal(root.querySelector('#portal-saturday'),null);
});
test('parent view has assigned child/exam entry but no team/admin content',()=>{
  const {root,render}=setup();render(fixture());
  assert.equal(root.querySelectorAll('[data-child]').length,1);assert.ok(root.querySelector('#portal-exam'));assert.match(root.textContent,/PARENT_SECRET/);
  assert.doesNotMatch(root.textContent,/TEAM_SECRET/);assert.equal(root.querySelector('[data-admin-action]'),null);assert.equal(root.querySelector('#portal-saturday'),null);
});
test('all displayed user text is escaped and cannot create elements',()=>{
  const {root,render}=setup(),vm=fixture('teacher');vm.students[0].display_name='<img src=x onerror=alert(1)>';vm.derived.internal[0].note='<script>bad()</script>';vm.derived.feedback[0].worked_on='<svg onload=bad()>';
  render(vm);assert.equal(root.querySelector('img,script,[onload],[onerror]'),null);assert.match(root.textContent,/<img src=x/);assert.match(root.textContent,/<script>bad/);
});
test('team overview does not label an unrecorded attendance as present',()=>{
  const {root,render}=setup(),vm=fixture('teacher');vm.selectedStudent=null;render(vm);
  assert.match(root.querySelector('.team-table tbody').textContent,/noch nicht erfasst/);
  assert.equal(root.querySelector('[data-admin-action]'),null);
});
test('staff observation fields have no assumed observations and only reached days',()=>{
  const {root,render}=setup();render(fixture('teacher'));
  for(const id of ['saturday-attendance','saturday-arrival','saturday-pause','saturday-understanding','saturday-effort','saturday-level'])assert.equal(root.querySelector('#'+id).value||'','');
  assert.equal(root.querySelector('#saturday-date option[value="2026-11-21"]'),null);
  assert.equal(root.querySelector('#saturday-good').getAttribute('maxlength'),'1500');assert.match(root.textContent,/TEAM_SECRET/);
});
test('editing a historical day retains its subject period, false observations and exact day level',()=>{
  const {root,render,event}=setup();render(fixture('teacher'));const day=root.querySelector('#saturday-date');day.value='2026-11-07';event(day,'change');
  assert.equal(root.querySelector('#saturday-subject').value,'math-old');assert.equal(root.querySelector('#saturday-subject option[value="math-now"]'),null);
  assert.equal(root.querySelector('#saturday-level').value,'3');assert.equal(root.querySelector('#saturday-arrival').value,'false');assert.equal(root.querySelector('#saturday-internal').value,'TEAM_SECRET');
  day.value='2026-11-14';event(day,'change');assert.equal(root.querySelector('#saturday-attendance').value||'','');assert.equal(root.querySelector('#saturday-level').value||'','');
});
test('absence sends no previous observations and only shows success after confirmation',async()=>{
  let sent,confirm;const {root,render,event}=setup({onSaveSaturday:payload=>{sent=payload;return new Promise(resolve=>{confirm=resolve;});}});render(fixture('teacher'));
  const day=root.querySelector('#saturday-date');day.value='2026-11-07';event(day,'change');const attendance=root.querySelector('#saturday-attendance');attendance.value='absent';event(attendance,'change');
  event(root.querySelector('#portal-saturday'),'submit');assert.equal(sent.attendance,'absent');assert.equal(sent.new_level,null);assert.equal(sent.worked_on,undefined);assert.doesNotMatch(root.querySelector('#portal-status').textContent,/gespeichert/);
  confirm({ok:true});await tick();assert.match(root.querySelector('#portal-status').textContent,/Kurstag gespeichert/);
});
test('failed writes never show success and form remains retryable',async()=>{
  const {root,render,event}=setup({onReportExam:async()=>({ok:false})});render(fixture());event(root.querySelector('#portal-exam'),'submit');await tick();
  assert.match(root.querySelector('#portal-status').textContent,/nicht bestätigt/);assert.doesNotMatch(root.querySelector('#portal-status').textContent,/Prüfung gespeichert/);assert.equal(root.querySelector('#portal-exam button').disabled,false);
});
test('dirty form notice preserves values; clear removes all personal content',()=>{
  const {root,ui,render,event}=setup();render(fixture('teacher'));const input=root.querySelector('#saturday-worked');input.value='Unfertiger Text';event(input,'input');assert.equal(ui.isDirty(),true);
  ui.showBackgroundNotice('Neue Daten liegen vor.');assert.equal(root.querySelector('#saturday-worked').value,'Unfertiger Text');ui.clear();assert.equal(ui.isDirty(),false);assert.equal(root.querySelector('#portal-screen').textContent,'');assert.doesNotMatch(root.textContent,/Testkind|TEAM_SECRET/);
});
test('a late write response after clear cannot reveal prior child status',async()=>{
  let confirm;const {root,ui,render,event}=setup({onReportExam:()=>new Promise(resolve=>{confirm=resolve;})});render(fixture());event(root.querySelector('#portal-exam'),'submit');ui.clear();confirm({ok:true});await tick();assert.equal(root.querySelector('#portal-status').textContent,'');
});
test('chart supports keyboard crosshair and an equivalent table, leaving null values unconnected',()=>{
  const {root,render,event}=setup();render(fixture());const chart=root.querySelector('#portal-chart');assert.equal(chart.getAttribute('tabindex'),'0');assert.equal(root.querySelectorAll('.chart-table tbody tr').length,3);
  assert.equal(chart.querySelectorAll('polyline').length,2);event(chart,'keydown',{key:'End'});assert.match(root.querySelector('#chart-readout').textContent,/07\.11\.2026.*3 von 5/);event(chart,'keydown',{key:'Home'});assert.match(root.querySelector('#chart-readout').textContent,/24\.10\.2026.*2 von 5/);
});
test('only admin receives constrained management forms and not account-creation controls',()=>{
  const {root,render}=setup(),vm=fixture('admin');vm.selectedStudent=null;render(vm);
  const actions=[...root.querySelectorAll('[data-admin-action]')].map(form=>form.dataset.adminAction);
  assert.deepEqual(actions,['family','student','profile','access_grant','revoke_access','subject','close_subject','competency','close_competency','competency_level','appointment','delete_appointment']);
  assert.equal(root.querySelector('#ap-role option[value=admin]'),null);assert.equal(root.querySelector('#ap-username').hasAttribute('readonly'),true);assert.equal(root.querySelector('#aa-title').getAttribute('maxlength'),'250');
});
test('child selection clears the prior family view before requesting another child',async()=>{
  let selected;const {root,render,event}=setup({onSelectStudent:async id=>{selected=id;}});render(fixture());event(root.querySelector('[data-child]'),'click');await tick();
  assert.equal(selected,'child');assert.doesNotMatch(root.textContent,/PARENT_SECRET|Testkind/);assert.match(root.textContent,/geladen/);
});
test('admin submits explicit constrained action and typed fields',async()=>{
  let sent;const {root,render,event}=setup({onAdminAction:async payload=>{sent=payload;return {ok:true};}}),vm=fixture('admin');vm.selectedStudent=null;render(vm);
  root.querySelector('#asu-student_id').innerHTML='<option value="child" selected>Testkind</option>';
  root.querySelector('#asu-name').value='Mathematik';root.querySelector('#asu-target_level').value='4';root.querySelector('#asu-start_level').value='2';root.querySelector('#asu-active_from').value='2026-11-16';
  event(root.querySelector('[data-admin-action=subject]'),'submit');await tick();assert.equal(sent.action,'subject');assert.equal(sent.student_id,'child');assert.equal(sent.target_level,4);assert.equal(sent.start_level,2);assert.equal(sent.active_from,'2026-11-16');
});

test('meter levels use CSP-safe fixed classes without inline styles',()=>{
  const {root,render}=setup();render(fixture());assert.equal(root.querySelector('[style]'),null);assert.ok(root.querySelector('.fill.level-3'));assert.ok(root.querySelector('.target.target-4'));
});
