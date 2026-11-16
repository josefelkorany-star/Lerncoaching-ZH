const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export function usernameAlias(username, domain) {
  const name=String(username||'').trim().toLowerCase();
  if(!USERNAME.test(name)||name.includes('..')||!domain||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(domain)) throw new Error('Bitte den vereinbarten Benutzernamen eingeben.');
  return name+'@'+domain.toLowerCase();
}
export function validConfiguration(config, hostname='') {
  if(!config||config.enabled!==true||!config.aliasDomain||!config.publishableKey) return false;
  try {
    usernameAlias('portal-check',config.aliasDomain);
    const u=new URL(config.supabaseUrl);
    const local=['localhost','127.0.0.1','[::1]'];
    if(u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))return false;
    if(u.protocol!=='https:'&&!(u.protocol==='http:'&&local.includes(u.hostname)&&local.includes(hostname)))return false;
    const key=config.publishableKey;
    if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
    // Legacy local-stack anon JWTs are supported; elevated keys never reach the client.
    const parts=key.split('.');
    return parts.length===3&&JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';
  }catch{return false;}
}
function safeError(error){
  const code=String(error?.code||'');
  const message=String(error?.message||'');
  if(message.includes('MFA_REQUIRED')){const e=new Error('Für diesen Zugang ist eine Zwei-Faktor-Anmeldung erforderlich.');e.accessDenied=true;return e;}
  if(['42501','PGRST301','PGRST302','401','403'].includes(code)||/session|permission|not authorized/i.test(message)){
    const e=new Error('Dieser Zugang ist nicht mehr freigegeben. Bitte neu anmelden oder Josef kontaktieren.');e.accessDenied=true;return e;
  }
  if(['23505','23514','22023','22P02','23503'].includes(code))return new Error('Die Angaben passen nicht zusammen. Bitte Datum, Zuordnung und Werte prüfen.');
  return new Error('Der Vorgang konnte nicht bestätigt werden. Bitte erneut versuchen.');
}
export function createPortalApi(config, createClient) {
  const client=createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false},db:{schema:'public'}});
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw safeError(error);return data;}
  return {
    async login({username,password,totp}){
      const email=usernameAlias(username,config.aliasDomain);
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw new Error('Anmeldung nicht möglich. Bitte Zugangsdaten prüfen oder Josef kontaktieren.');
      try {
        const {data:factorData,error:factorError}=await client.auth.mfa.listFactors();
        if(factorError)throw new Error('Die Sicherheitsprüfung ist fehlgeschlagen.');
        const factor=factorData?.totp?.find(f=>f.status==='verified');
        if(factor){
          if(!/^\d{6}$/.test(String(totp||'')))throw new Error('Bitte zusätzlich den sechsstelligen Sicherheitscode eingeben.');
          const {error:verifyError}=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp});
          if(verifyError)throw new Error('Der Sicherheitscode wurde nicht bestätigt. Bitte erneut anmelden.');
        }
        return {ok:true};
      } catch(error) {await client.auth.signOut({scope:'local'});throw error;}
    },
    async logout(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw new Error('Die Serversitzung konnte nicht beendet werden. Die lokale Ansicht wurde geschlossen.');},
    async changePassword(password){
      if(typeof password!=='string'||password.length<12)throw new Error('Bitte ein neues Passwort mit mindestens zwölf Zeichen wählen.');
      const {error}=await client.auth.updateUser({password});if(error)throw safeError(error);
      const {error:outError}=await client.auth.signOut({scope:'global'});if(outError)throw new Error('Passwort geändert; bitte Josef zur Prüfung alter Sitzungen kontaktieren.');
      return {ok:true};
    },
    onSessionEnd(handler){const {data}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')queueMicrotask(handler);});return ()=>data.subscription.unsubscribe();},
    getSnapshot:()=>rpc('get_portal_snapshot'),
    saveSaturday:(studentId,day,payload)=>rpc('record_saturday',{p_student_id:studentId,p_course_day:day,p_payload:payload}),
    reportExam:(data)=>rpc('report_exam',{p_student_id:data.student_id,p_exam_date:data.exam_date,p_subject_id:data.subject_id,p_topic:data.topic,p_exam_id:data.exam_id}),
    adminChange:(action,payload)=>rpc('admin_change',{p_action:action,p_payload:payload})
  };
}
