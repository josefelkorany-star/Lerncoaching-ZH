import test from 'node:test';
import assert from 'node:assert/strict';
import {startPortal,saturdayPayload,todayZurich} from '../../portal-app.js';
const snapshot=(label='first',ids=['a','b'])=>({profile:{id:'parent',role:'parent'},students:ids.map(id=>({id,display_name:label,joined_on:'2026-01-01'})),subjects:[],feedback:[],attendance:[]});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function harness(){
 let handlers,focus,dirty=false,requests=[],renders=[],clears=0,notices=[],errors=[],setups=[],recoveries=0;
 globalThis.addEventListener=(name,cb)=>{if(name==='focus')focus=cb;};globalThis.removeEventListener=()=>{};
 const api={login:async()=>{},logout:async()=>{},getSnapshot:()=>{const p=deferred();requests.push(p);return p.promise;},saveSaturday:async()=>({saved:true}),reportExam:async()=>({saved:true}),adminChange:async()=>({saved:true})};
 const app=startPortal({root:{},api,courseDates:[],clock:()=>new Date('2026-11-16T12:00Z'),pollMilliseconds:0,mount:(_root,h)=>{handlers=h;return {clear(){clears++;},showLogin:m=>errors.push(m),showLoading(){},showMfaSetup:s=>setups.push(s),showRecovery:()=>recoveries++,render:v=>renders.push(v),isDirty:()=>dirty,showBackgroundNotice:m=>notices.push(m)};}});
 return {api,app,requests,renders,notices,errors,setups,get recoveries(){return recoveries;},get clears(){return clears;},get handlers(){return handlers;},focus:()=>focus(),dirty:()=>dirty=true,async login(data=snapshot()){const p=handlers.onLogin({username:'test',password:'fake'});await tick();requests.at(-1).resolve(data);await p;}};
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

const adminSnapshot=()=>({...snapshot(),profile:{id:'admin',role:'admin'}});
test('only an authenticated admin can send account operations; retry id stays stable without retaining passwords',async()=>{
 const h=harness();let payloads=[];h.api.accountAction=async p=>{payloads.push(p);throw new Error('offline');};
 await assert.rejects(h.handlers.onAccountAction({action:'create'}));await h.login();await assert.rejects(h.handlers.onAccountAction({action:'create'}));assert.equal(payloads.length,0);
 await h.login(adminSnapshot());const form={action:'create',username:'test.new',display_name:'Erfunden',role:'parent'};
 await assert.rejects(h.handlers.onAccountAction(form));await assert.rejects(h.handlers.onAccountAction(form));assert.equal(payloads[0].request_id,payloads[1].request_id);
 h.api.accountAction=async p=>{payloads.push(p);return {ok:true,initial_password:'synthetic-once'};};
 const result=h.handlers.onAccountAction(form);await tick();h.requests.at(-1).resolve(adminSnapshot());assert.equal((await result).initial_password,'synthetic-once');
 assert.ok(!JSON.stringify(h.renders).includes('synthetic-once'));h.app.destroy();
});

test('delayed account password never reaches a closed or switched view',async()=>{
 const h=harness();await h.login(adminSnapshot());const d=deferred();h.api.accountAction=()=>d.promise;
 const result=h.handlers.onAccountAction({action:'reset',profile_id:'a'});await h.handlers.onLogout();d.resolve({ok:true,initial_password:'synthetic-secret'});
 await assert.rejects(result,/gewechselt/);assert.ok(!JSON.stringify(h.renders).includes('synthetic-secret'));h.app.destroy();
});

test('first staff login waits for MFA setup and confirmation before rendering any data',async()=>{
 const h=harness();let confirmations=0;h.api.beginMfa=async()=>({secret:'synthetic',qr_code:'<svg></svg>'});h.api.verifyMfa=async()=>{confirmations++;};
 const login=h.handlers.onLogin({username:'staff',password:'fake'});await tick();const e=new Error('MFA');e.mfaRequired=true;e.accessDenied=true;h.requests.at(-1).reject(e);await login;
 assert.equal(h.renders.length,0);assert.equal(h.setups.length,1);
 const verify=h.handlers.onVerifyMfa({code:'123456'});await tick();h.requests.at(-1).resolve(adminSnapshot());await verify;
 assert.equal(confirmations,1);assert.equal(h.renders.length,1);h.app.destroy();
});

test('failed enrollment signs out and late enrollment response after cancel is ignored',async()=>{
 const h=harness(),d=deferred();h.api.beginMfa=()=>d.promise;
 const login=h.handlers.onLogin({username:'staff',password:'fake'});await tick();const e=new Error('MFA');e.mfaRequired=true;h.requests.at(-1).reject(e);await tick();await h.handlers.onLogout();d.resolve({secret:'late'});await login;
 assert.equal(h.setups.length,0);assert.equal(h.renders.length,0);h.app.destroy();
});

test('recovery opens only after the adapter verifies the supplied session and never loads profiles',async()=>{
 const h=harness();h.api.acceptRecovery=async()=>{throw new Error('invalid');};await h.app.restoreRecovery({invalid:true});assert.equal(h.recoveries,0);
 h.api.acceptRecovery=async()=>({ok:true});await h.app.restoreRecovery({access_token:'synthetic'});assert.equal(h.recoveries,1);assert.equal(h.requests.length,0);
 h.api.completeRecovery=async()=>({ok:true});await h.handlers.onCompleteRecovery({password:'synthetic-password'});assert.match(h.errors.at(-1),/Passwort geändert/);assert.equal(h.renders.length,0);h.app.destroy();
});
