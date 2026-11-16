// Server/operator only. Deliberately refuses cloud URLs. Never imported by portal.html.
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import {configFile,username,privatePath,savePrivate,adminRequest} from './local-guard.mjs';
const [command,configPath,identity,outputPath,confirmed]=process.argv.slice(2);
try{
 const c=await configFile(configPath);
 if(['create','reset','first-admin'].includes(command)){
  const destination=privatePath(outputPath);
  try{await fs.access(destination);throw new Error('Private Übergabedatei existiert bereits; eindeutigen neuen Namen verwenden.');}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(command==='create'){
  const login=username(identity);
  if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.alias_domain||'')||c.alias_domain_confirmed!==true)throw new Error('Vom Betreiber kontrollierte Aliasdomain muss separat bestätigt sein.');
  const password=randomBytes(24).toString('base64url');
  const user=await adminRequest(c,'/auth/v1/admin/users',{method:'POST',body:{email:`${login}@${c.alias_domain}`,password,email_confirm:true}});
  const id=user.id||user.user?.id;if(!id)throw new Error('Auth-ID fehlt.');
  await savePrivate(outputPath,{id,username:login,start_password:password,notice:'Sicher einzeln übergeben; danach eigenes Passwort setzen. Profil, Rolle und Kindfreigabe separat durch Admin. Keine öffentlich gespeicherte Kopie.'});
  console.log('Lokales synthetisches Auth-Konto angelegt. Zugangsdaten nur in privater Übergabedatei. Noch kein Lernzugriff.');
 }else if(command==='disable'||command==='reset'){
  if(!/^[0-9a-f-]{36}$/i.test(identity)||confirmed!=='IDENTITY_VERIFIED')throw new Error('Verifizierte Auth-ID und IDENTITY_VERIFIED nach persönlicher Identitätsprüfung erforderlich.');
  const existing=await adminRequest(c,`/rest/v1/profiles?id=eq.${identity}&select=id,role`);
  if(existing?.length!==1||existing[0].role==='admin')throw new Error('Eindeutiges Nicht-Admin-Profil erforderlich. Erstadmin-Recovery gesondert durch Betreiber.');
  await adminRequest(c,`/rest/v1/profiles?id=eq.${identity}`,{method:'PATCH',body:{active:false}});
  if(command==='reset'){
   const password=randomBytes(24).toString('base64url');
   await adminRequest(c,`/auth/v1/admin/users/${identity}`,{method:'PUT',body:{password}});
   await savePrivate(outputPath,{id:identity,start_password:password,notice:'Konto bleibt deaktiviert. Nach sicherer Übergabe durch Admin aktivieren und frisch anmelden. Alte Sitzungen bleiben durch sessions_valid_after ausgeschlossen.'});
  }
  console.log('Lokales Profil deaktiviert; alte Sitzungen sind serverseitig ausgeschlossen. Für Reaktivierung ausdrücklich Admin verwenden.');
 }else if(command==='first-admin'){
  if(!/^[0-9a-f-]{36}$/i.test(identity)||confirmed!=='IDENTITY_VERIFIED'||!c.admin_email)throw new Error('Verifizierte Auth-ID, erreichbare erwartete Admin-Mail und IDENTITY_VERIFIED erforderlich.');
  if(c.alias_domain_confirmed!==true||!c.alias_domain||c.admin_email.toLowerCase()!==`josef@${c.alias_domain.toLowerCase()}`)throw new Error('Erstadmin benötigt den kontrollierten, erreichbaren Login-Alias josef@alias_domain; kein abweichendes Postfach.');
  const result=await adminRequest(c,`/auth/v1/admin/users/${identity}`),u=result.user||result;
  if(u.id!==identity||!u.email_confirmed_at||u.is_anonymous||u.email?.toLowerCase()!==c.admin_email.toLowerCase())throw new Error('Auth-ID und bestätigte Betreiberidentität stimmen nicht überein.');
  await savePrivate(outputPath,{verified_auth_id:identity,sql:`begin;\ninsert into public.profiles(id,username,display_name,role,active,core_team) values('${identity}','josef','Josef','admin',true,true);\ninsert into portal_private.settings(admin_auth_id,require_staff_mfa,enabled) values('${identity}',true,false);\ncommit;`,notice:'Nur vorbereitete SQL. Keine Ausführung. Kein Portalzugriff bis MFA, Wiederherstellungsweg, Rechteprüfung und ausdrücklicher Freigabe von enabled=true.'});
  console.log('Erstadmin-Zuordnung als private, noch nicht ausgeführte SQL vorbereitet.');
 }else throw new Error('Befehl create, disable, reset oder first-admin erforderlich.');
}catch(error){console.error(error.message||'Betreiberaktion fehlgeschlagen.');process.exitCode=1;}
