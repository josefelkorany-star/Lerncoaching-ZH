const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const ADMIN_EMAIL='zhlerncoaching@gmail.com';
export function loginAddress(username,domain){
  return String(username||'').trim().toLowerCase()===ADMIN_EMAIL?ADMIN_EMAIL:usernameAlias(username,domain);
}
// Recovery tokens are consumed only in memory and removed before any application requests.
export function takeRecoveryFragment(location,history){
  const values=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
  if(!values.has('access_token')&&!values.has('refresh_token')&&!values.has('error_description'))return null;
  history.replaceState(null,'',location.pathname+location.search);
  if(values.get('type')!=='recovery'||!values.get('access_token')||!values.get('refresh_token'))return {invalid:true};
  return {access_token:values.get('access_token'),refresh_token:values.get('refresh_token')};
}
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
  if(message.includes('MFA_REQUIRED')){const e=new Error('Für diesen Zugang ist eine Zwei-Faktor-Anmeldung erforderlich.');e.accessDenied=true;e.mfaRequired=true;return e;}
  if(['42501','PGRST301','PGRST302','401','403'].includes(code)||/session|permission|not authorized/i.test(message)){
    const e=new Error('Dieser Zugang ist nicht mehr freigegeben. Bitte neu anmelden oder Josef kontaktieren.');e.accessDenied=true;return e;
  }
  if(['23505','23514','22023','22P02','23503'].includes(code))return new Error('Die Angaben passen nicht zusammen. Bitte Datum, Zuordnung und Werte prüfen.');
  return new Error('Der Vorgang konnte nicht bestätigt werden. Bitte erneut versuchen.');
}
export function createPortalApi(config, createClient) {
  const client=createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false},db:{schema:'public'}});
  let enrollingFactor=null,recovery=false;
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw safeError(error);return data;}
  async function verifyExistingFactor(totp){
    const {data,error}=await client.auth.mfa.listFactors();
    if(error)throw new Error('Die Sicherheitsprüfung ist fehlgeschlagen.');
    const factor=data?.totp?.find(f=>f.status==='verified');
    if(factor){
      if(!/^\d{6}$/.test(String(totp||'')))throw new Error('Bitte zusätzlich den sechsstelligen Sicherheitscode eingeben.');
      const {error:verifyError}=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp});
      if(verifyError)throw new Error('Der Sicherheitscode wurde nicht bestätigt. Bitte erneut versuchen.');
    }
  }
  return {
    async login({username,password,totp}){
      recovery=false;
      const email=loginAddress(username,config.aliasDomain);
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw new Error('Anmeldung nicht möglich. Bitte Zugangsdaten prüfen oder Josef kontaktieren.');
      try {
        await verifyExistingFactor(totp);
        return {ok:true};
      } catch(error) {await client.auth.signOut({scope:'local'});throw error;}
    },
    async logout(){
      recovery=false;const factor=enrollingFactor;enrollingFactor=null;
      try{if(factor)await client.auth.mfa.unenroll({factorId:factor});}catch{/* An unverified factor must never prevent local sign-out. */}
      const {error}=await client.auth.signOut({scope:'local'});if(error)throw new Error('Die Serversitzung konnte nicht beendet werden. Die lokale Ansicht wurde geschlossen.');
    },
    async beginMfa(){
      const {data:factors,error:listError}=await client.auth.mfa.listFactors();
      if(listError||factors?.totp?.some(f=>f.status==='verified'))throw new Error('Bitte mit dem bestehenden Sicherheitscode neu anmelden.');
      for(const factor of factors?.totp||[]){if(factor.status==='unverified'){const {error}=await client.auth.mfa.unenroll({factorId:factor.id});if(error)throw new Error('Die Zwei-Faktor-Einrichtung konnte nicht vorbereitet werden.');}}
      const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Lerncoaching ZH'});
      if(error||!data?.id||!data?.totp?.secret||!data?.totp?.qr_code)throw new Error('Die Zwei-Faktor-Einrichtung konnte nicht gestartet werden.');
      enrollingFactor=data.id;return {secret:data.totp.secret,qr_code:data.totp.qr_code};
    },
    async verifyMfa(code){
      if(!enrollingFactor||!/^\d{6}$/.test(String(code||'')))throw new Error('Bitte den sechsstelligen Sicherheitscode eingeben.');
      const {error}=await client.auth.mfa.challengeAndVerify({factorId:enrollingFactor,code});
      if(error)throw new Error('Der Sicherheitscode wurde nicht bestätigt. Bitte erneut versuchen.');
      enrollingFactor=null;return {ok:true};
    },
    async requestRecovery(){
      const target=new URL(globalThis.location.href);target.hash='';target.search='';
      const {error}=await client.auth.resetPasswordForEmail(ADMIN_EMAIL,{redirectTo:target.href});
      if(error)throw new Error('Die Wiederherstellungsnachricht konnte nicht angefordert werden. Bitte später erneut versuchen.');
      return {ok:true};
    },
    async acceptRecovery(tokens){
      recovery=false;
      try{
        if(!tokens||tokens.invalid)throw new Error();
        const {error}=await client.auth.setSession(tokens);if(error)throw error;
        const {data,error:identityError}=await client.auth.getUser();
        if(identityError||data?.user?.email?.toLowerCase()!==ADMIN_EMAIL||!data.user.email_confirmed_at||data.user.is_anonymous)throw new Error();
        recovery=true;return {ok:true};
      }catch{await client.auth.signOut({scope:'local'});throw new Error('Der Wiederherstellungslink ist nicht gültig. Bitte eine neue Nachricht anfordern.');}
    },
    async completeRecovery({password,totp}){
      if(!recovery)throw new Error('Bitte zuerst den persönlichen Wiederherstellungslink öffnen.');
      if(typeof password!=='string'||password.length<12)throw new Error('Bitte ein neues Passwort mit mindestens zwölf Zeichen wählen.');
      await verifyExistingFactor(totp);
      const {error}=await client.auth.updateUser({password});if(error)throw safeError(error);
      recovery=false;
      const {error:outError}=await client.auth.signOut({scope:'global'});
      if(outError)throw new Error('Passwort geändert; bitte alte Sitzungen durch den Betreiber prüfen lassen.');
      return {ok:true};
    },
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
    adminChange:(action,payload)=>rpc('admin_change',{p_action:action,p_payload:payload}),
    async accountAction(payload){
      const {data,error}=await client.functions.invoke('portal-accounts',{body:payload});
      if(error){
        let code='';try{code=(await error.context?.clone?.().json())?.code||'';}catch{/* Never expose provider error bodies. */}
        const messages={
          ACCOUNT_REQUEST_PENDING:'Dieser Vorgang ist noch ungeklärt. Bitte den Kontostand durch die Betreuung prüfen lassen; keinen neuen Zugang anlegen.',
          ACCOUNT_TARGET_BUSY:'Für dieses Konto läuft bereits ein Vorgang. Bitte dessen Abschluss abwarten; bei unklarem Stand die Betreuung kontaktieren.',
          ACCOUNT_REQUEST_FAILED:'Dieser Vorgang ist beendet und wurde nicht bestätigt. Zuerst den Kontostand prüfen lassen. Für einen bewusst neuen Versuch abmelden und erneut anmelden.',
          ACCOUNT_USERNAME_EXISTS:'Dieser Benutzername ist bereits vergeben oder wird gerade angelegt. Bitte zuerst den bestehenden Kontostand prüfen.',
          ACCOUNT_RATE_LIMIT:'Zu viele Kontoaktionen in kurzer Zeit. Bitte später erneut versuchen.',
          ACCOUNT_INPUT_INVALID:'Bitte Benutzername, Anzeigename und Kontorolle prüfen.',
          ACCOUNT_NOT_CONFIGURED:'Die Kontoverwaltung ist noch nicht vollständig eingerichtet. Bitte die Betreuung kontaktieren.',
          ACCOUNT_OPERATION_FAILED:'Die Kontoaktion wurde nicht bestätigt. Bitte zuerst den Kontostand durch die Betreuung prüfen lassen.',
          ACCOUNT_BACKEND_UNAVAILABLE:'Der Kontodienst ist nicht erreichbar. Bitte den Kontostand prüfen, bevor du einen neuen Vorgang startest.'
        };
        const e=new Error(Object.hasOwn(messages,code)?messages[code]:'Die Kontoverwaltung konnte nicht bestätigt werden. Bei unterbrochener Verbindung darf derselbe Vorgang erneut angefragt werden; bei unklarem Kontostand zuerst die Betreuung kontaktieren.');
        if([401,403].includes(error.context?.status))e.accessDenied=true;throw e;
      }
      if(data?.ok!==true)throw new Error('Die Kontoverwaltung wurde nicht bestätigt.');
      return data;
    }
  };
}
