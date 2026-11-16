import {mountPortal} from './portal-ui.js';
import {deriveStudent,deriveTeam} from './portal-model.js';

export function todayZurich(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
}
const intOrNull=value=>value===''||value==null?null:Number(value);
const boolOrNull=value=>value===''||value==null?null:value===true||value==='true';
export function saturdayPayload(form) {
  return {
    attendance:form.attendance,subject_id:form.subject_id||null,topic:form.topic||'',
    worked_on:form.worked_on||'',went_well:form.went_well||'',next_step:form.next_step||'',
    arrival_review:boolOrNull(form.arrival_review),pause_review:boolOrNull(form.pause_review),
    understanding:intOrNull(form.understanding),effort:intOrNull(form.effort),
    internal_note:form.internal_note||'',parent_note:form.parent_note||'',new_level:intOrNull(form.new_level)
  };
}
export function startPortal({root,api,courseDates,mount=mountPortal,clock=()=>new Date(),uuid=()=>crypto.randomUUID(),pollMilliseconds=30000}) {
  let epoch=0,readVersion=0,snapshot=null,selected=null,signedIn=false,pending=false,refreshing=false,lastRenderedDay=null;
  const examAttempts=new Map();
  function wipe(){epoch++;readVersion++;snapshot=null;selected=null;pending=false;lastRenderedDay=null;examAttempts.clear();ui.clear();}
  function close(message=''){signedIn=false;wipe();ui.showLogin(message);}
  function view(data){
    const today=todayZurich(clock());
    const students=data.students||[];
    if(!['teacher','admin'].includes(data.profile.role)&&!students.some(s=>s.id===selected))selected=students[0]?.id||null;
    if(selected&&!students.some(s=>s.id===selected))selected=null;
    const derived=selected?deriveStudent(data,selected,today,courseDates):{};
    if(['teacher','admin'].includes(data.profile.role))derived.team=deriveTeam(data,today,courseDates);
    return {profile:data.profile,students,selectedStudent:selected,today,courseDays:courseDates,
      derived,admin:data.profile.role==='admin'?{families:data.families||[],profiles:data.profiles||[],students,subjects:data.subjects||[],competencies:data.competencies||[],appointments:data.appointments||[],grants:data.access_grants||[]}:null};
  }
  const scope=data=>JSON.stringify([data?.profile?.id,data?.profile?.role,data?.profile?.core_team,(data?.students||[]).map(s=>s.id).sort()]);
  async function refresh(showLoading=false,background=false){
    if(!signedIn)return;
    const generation=epoch,request=++readVersion;
    if(showLoading)ui.showLoading();
    try{
      const next=await api.getSnapshot();
      if(generation!==epoch||request!==readVersion||!signedIn)return;
      if(!next?.profile?.id)throw new Error('Für dieses Konto ist noch kein Portalzugang zugeordnet. Bitte Josef kontaktieren.');
      const keepEditing=background&&ui.isDirty?.()&&scope(snapshot)===scope(next);
      const day=todayZurich(clock());
      const changed=JSON.stringify(snapshot)!==JSON.stringify(next)||day!==lastRenderedDay;
      snapshot=next;
      if(keepEditing){if(changed)ui.showBackgroundNotice?.('Neue Daten sind verfügbar. Deine Eingabe bleibt erhalten und wird beim Speichern erneut geprüft.');}
      else if(!background||changed){ui.render(view(next));lastRenderedDay=day;}
    }catch(error){
      if(generation!==epoch||request!==readVersion)return;
      close(error.message||'Die Daten konnten nicht freigegeben werden. Bitte neu anmelden.');try{await api.logout();}catch{/* View already discarded. */}
      throw error;
    }
  }
  async function confirmedWrite(action){
    if(!signedIn||pending)throw new Error('Bitte warten oder erneut anmelden.');
    const generation=epoch;pending=true;readVersion++;
    try{
      const answer=await action();
      if(generation!==epoch||!signedIn)throw new Error('Die Ansicht wurde gewechselt. Bitte den gespeicherten Stand neu laden.');
      if(answer?.saved!==true)throw new Error('Das Speichern wurde nicht bestätigt. Bitte erneut versuchen.');
      await refresh();return {ok:true};
    }catch(error){
      if(error.accessDenied&&generation===epoch){close(error.message);try{await api.logout();}catch{}}
      throw error;
    }finally{if(generation===epoch)pending=false;}
  }
  const ui=mount(root,{
    async onLogin(credentials){
      wipe();const generation=epoch;
      try{await api.login(credentials);if(generation!==epoch)return {ok:false};signedIn=true;await refresh(true);return {ok:true};}
      catch(error){if(generation===epoch)close(error.message);throw error;}
    },
    async onLogout(){close();try{await api.logout();}catch(error){ui.showLogin(error.message);}return {ok:true};},
    async onChangePassword({password}){
      if(!signedIn)throw new Error('Bitte zuerst anmelden.');
      try{await api.changePassword(password);close('Passwort geändert. Bitte neu anmelden.');return {ok:true};}
      catch(error){close(error.message);throw error;}
    },
    async onSelectStudent(id){
      if(!signedIn)return;
      if(id&&!snapshot?.students?.some(s=>s.id===id))throw new Error('Für diese Person besteht keine Freigabe.');
      epoch++;readVersion++;snapshot=null;examAttempts.clear();selected=id;pending=false;ui.clear();
      await refresh(true);
    },
    onSaveSaturday:form=>confirmedWrite(()=>api.saveSaturday(form.student_id,form.course_day,saturdayPayload(form))),
    onReportExam(form){
      const key=JSON.stringify([form.student_id,form.exam_date,form.subject_id,form.topic]);
      if(!examAttempts.has(key))examAttempts.set(key,form.exam_id||uuid());
      return confirmedWrite(()=>api.reportExam({...form,exam_id:examAttempts.get(key)}));
    },
    onAdminAction(form){const {action,...payload}=form;return confirmedWrite(()=>api.adminChange(action,payload));}
  });
  const unsubscribe=api.onSessionEnd?.(()=>{if(signedIn)close('Bitte erneut anmelden.');})||(()=>{});
  const backgroundRefresh=()=>{
    if(!signedIn||pending||refreshing||globalThis.document?.hidden)return;
    refreshing=true;refresh(false,true).catch(()=>{}).finally(()=>{refreshing=false;});
  };
  globalThis.addEventListener?.('focus',backgroundRefresh);
  globalThis.document?.addEventListener('visibilitychange',backgroundRefresh);
  const timer=pollMilliseconds>0?setInterval(backgroundRefresh,pollMilliseconds):null;
  timer?.unref?.();
  ui.showLogin();
  return {async restoreSession(){wipe();signedIn=true;await refresh(true);},async reset(){close();try{await api.logout();}catch{}},destroy(){close();unsubscribe();if(timer)clearInterval(timer);globalThis.removeEventListener?.('focus',backgroundRefresh);globalThis.document?.removeEventListener('visibilitychange',backgroundRefresh);}};
}
