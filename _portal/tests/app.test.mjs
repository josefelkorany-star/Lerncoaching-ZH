import test from 'node:test';
import assert from 'node:assert/strict';
import {startPortal,saturdayPayload,todayZurich} from '../../portal-app.js';
const snapshot=(label='first',ids=['a','b'])=>({profile:{id:'parent',role:'parent'},students:ids.map(id=>({id,display_name:label,joined_on:'2026-01-01'})),subjects:[],feedback:[],attendance:[]});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function harness(){
 let handlers,focus,dirty=false,requests=[],renders=[],clears=0,notices=[],errors=[];
 globalThis.addEventListener=(name,cb)=>{if(name==='focus')focus=cb;};globalThis.removeEventListener=()=>{};
 const api={login:async()=>{},logout:async()=>{},getSnapshot:()=>{const p=deferred();requests.push(p);return p.promise;},saveSaturday:async()=>({saved:true}),reportExam:async()=>({saved:true}),adminChange:async()=>({saved:true})};
 const app=startPortal({root:{},api,courseDates:[],clock:()=>new Date('2026-11-16T12:00Z'),pollMilliseconds:0,mount:(_root,h)=>{handlers=h;return {clear(){clears++;},showLogin:m=>errors.push(m),showLoading(){},render:v=>renders.push(v),isDirty:()=>dirty,showBackgroundNotice:m=>notices.push(m)};}});
 return {api,app,requests,renders,notices,errors,get clears(){return clears;},get handlers(){return handlers;},focus:()=>focus(),dirty:()=>dirty=true,async login(){const p=handlers.onLogin({username:'test',password:'fake'});await tick();requests.at(-1).resolve(snapshot());await p;}};
}
test('Zurich day uses local midnight incl winter/summer, not UTC date',()=>{
 assert.equal(todayZurich(new Date('2026-11-15T23:30Z')),'2026-11-16');assert.equal(todayZurich(new Date('2026-06-15T22:30Z')),'2026-06-16');
});
test('empty observations stay null; payload excludes role/author tampering',()=>{
 const p=saturdayPayload({attendance:'present',understanding:'',effort:'',arrival_review:'',pause_review:'false',role:'admin',created_by:'fake'});
 assert.equal(p.understanding,null);assert.equal(p.arrival_review,null);assert.equal(p.pause_review,false);assert.equal(p.role,undefined);assert.equal(p.created_by,undefined);
});
test('logout clears data and ignores delayed snapshot',async()=>{
 const h=harness();await h.login();h.focus();await h.handlers.onLogout();h.requests.at(-1).resolve(snapshot('stale'));await tick();assert.equal(h.renders.length,1);assert.ok(h.clears>=2);h.app.destroy();
});
test('child switch clears previous view before fetching and ignores older read',async()=>{
 const h=harness();await h.login();h.focus();const old=h.requests.at(-1);const p=h.handlers.onSelectStudent('b');const last=h.requests.at(-1);assert.ok(h.clears>=2);last.resolve(snapshot('new'));await p;old.resolve(snapshot('old'));await tick();assert.equal(h.renders.at(-1).selectedStudent,'b');assert.equal(h.renders.at(-1).students[0].display_name,'new');h.app.destroy();
});
test('pre-save background response cannot overwrite confirmed save',async()=>{
 const h=harness();await h.login();h.focus();const old=h.requests.at(-1);const p=h.handlers.onSaveSaturday({student_id:'a',course_day:'2026-11-14',attendance:'present'});await tick();h.requests.at(-1).resolve(snapshot('saved'));await p;old.resolve(snapshot('old'));await tick();assert.equal(h.renders.at(-1).students[0].display_name,'saved');h.app.destroy();
});
test('pre-save background error cannot close newer view',async()=>{
 const h=harness();await h.login();h.focus();const old=h.requests.at(-1);const p=h.handlers.onSaveSaturday({student_id:'a',course_day:'2026-11-14'});await tick();h.requests.at(-1).resolve(snapshot('saved'));await p;const count=h.errors.length;old.reject(new Error('stale'));await tick();assert.equal(h.errors.length,count);h.app.destroy();
});
test('dirty form survives refresh but loss of child grant forces replacement',async()=>{
 const h=harness();await h.login();h.dirty();h.focus();h.requests.at(-1).resolve(snapshot('updated'));await tick();assert.equal(h.renders.length,1);assert.equal(h.notices.length,1);h.focus();h.requests.at(-1).resolve(snapshot('revoked',['b']));await tick();assert.equal(h.renders.length,2);assert.equal(h.renders.at(-1).students.length,1);h.app.destroy();
});
test('unchanged background snapshot keeps keyboard focus and expanded details intact',async()=>{
 const h=harness();await h.login();h.focus();h.requests.at(-1).resolve(snapshot());await tick();assert.equal(h.renders.length,1);h.app.destroy();
});
test('failed/unconfirmed writes never show success and cannot start a second pending write',async()=>{
 const h=harness();await h.login();const d=deferred();h.api.saveSaturday=()=>d.promise;const p=h.handlers.onSaveSaturday({});await assert.rejects(h.handlers.onSaveSaturday({}),/warten/);d.resolve({saved:false});await assert.rejects(p,/nicht bestätigt/);h.app.destroy();
});
test('examination retries reuse stable idempotency ID',async()=>{
 const h=harness();await h.login();const ids=[];h.api.reportExam=async f=>{ids.push(f.exam_id);throw new Error('offline');};const f={student_id:'a',exam_date:'2026-11-20',subject_id:'s',topic:'Brüche',exam_id:'stable'};await assert.rejects(h.handlers.onReportExam(f));await assert.rejects(h.handlers.onReportExam(f));assert.deepEqual(ids,['stable','stable']);h.app.destroy();
});
test('explicit permission loss during write clears the previous private view immediately',async()=>{
 const h=harness();await h.login();const before=h.clears;h.api.saveSaturday=async()=>{const e=new Error('Freigabe entzogen');e.accessDenied=true;throw e;};await assert.rejects(h.handlers.onSaveSaturday({}));assert.ok(h.clears>before);assert.equal(h.errors.at(-1),'Freigabe entzogen');h.app.destroy();
});
