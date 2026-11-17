// Copied into a private output folder only; production portal-main.js never imports this.
import {startPortal} from './portal-app.js';
const selector=document.querySelector('#preview-actor');
const status=document.querySelector('#preview-status');
async function request(route,data){
 const response=await fetch('/api/'+route,{credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},method:data?'POST':'GET',body:data?JSON.stringify(data):undefined});
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'Testvorgang fehlgeschlagen.');error.accessDenied=response.status===403;throw error;}return result;
}
const api={
 login:async()=>{throw new Error('In dieser privaten Vorschau oben ein erfundenes Testkonto wählen. Passwörter werden hier nicht geprüft.');},
 logout:async()=>{await request('logout',{});selector.value='anonymous';},
 changePassword:async()=>{throw new Error('Die Passwortänderung ist für den echten Supabase-Anmeldetest vorbereitet. Diese Vorschau besitzt keine echten Konten.');},
 getSnapshot:()=>request('snapshot'),
 saveSaturday:(student_id,course_day,payload)=>request('saturday',{student_id,course_day,payload}),
 reportExam:data=>request('exam',data),adminChange:(action,payload)=>request('admin',{action,payload}),
 accountAction:payload=>request('accounts',payload),
 requestRecovery:async()=>{throw new Error('Die private Vorschau versendet keine Wiederherstellungsnachricht. Echte Anmeldung, MFA und E-Mail-Zustellung bleiben gesondert zu prüfen.');}
};
const app=startPortal({root:document.querySelector('#portal-root'),api,courseDates:globalThis.LCCourseData.dates});
const actors=await request('actors');
for(const actor of actors.actors){const option=document.createElement('option');option.value=actor.key;option.textContent=actor.label;selector.append(option);}
selector.addEventListener('change',async()=>{
 const user=selector.value;
 selector.disabled=true;status.textContent='Testkonto wird gewechselt …';
 try{await app.reset();await request('select',{user});selector.value=user;if(user!=='anonymous')await app.restoreSession();status.textContent='Erfundene Testdaten. Änderungen bleiben nur bis zum Neustart dieser Vorschau erhalten.';}
 catch(error){status.textContent=error.message;}finally{selector.disabled=false;}
});
document.querySelectorAll('a.brand').forEach(a=>a.href='/');
