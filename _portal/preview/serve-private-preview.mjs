// Separate loopback-only synthetic SQL preview. Never part of the production entrypoint.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dependency} from '../dev-dependencies.mjs';
import {createTestDatabase} from '../db-tests/fixtures.mjs';
import {createAccountHandler} from '../supabase/functions/portal-accounts/index.ts';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function startPreview({root=path.resolve(here,'../..'),port=4187,quiet=false}={}){
 await import(pathToFileURL(path.join(root,'course-data.js')));
 const fixture=await createTestDatabase({PGlite:dependency('@electric-sql/pglite').PGlite,courseDates:globalThis.LCCourseData.dates});
 const sessions=new Map();let queue=Promise.resolve(),origin='';
 const transact=task=>{const job=queue.then(task);queue=job.catch(()=>{});return job;};
 const service=async(sql,args)=>(await fixture.db.transaction(async tx=>{await tx.exec('set local role service_role');return tx.query(sql,args);})).rows[0].data;
 const accountServices={
  authenticate:async key=>{const u=fixture.users[key];return u?{id:u.id,email:key==='admin'?'zhlerncoaching@gmail.com':'synthetic@example.invalid',email_confirmed_at:'2026-01-01',is_anonymous:false}:null;},
  begin:async(key,id,action,payload)=>(await fixture.asUser(key,'select public.begin_portal_account_action($1,$2,$3::jsonb) as data',[id,action,JSON.stringify(payload)])).rows[0].data,
  prepare:(actor,id)=>service('select public.prepare_portal_account_action($1,$2) as data',[actor,id]),
  finish:(actor,id,success,target)=>service('select public.finish_portal_account_action($1,$2,$3,$4) as data',[actor,id,success,target||null]),
  createUser:async()=>{const id=crypto.randomUUID();await fixture.db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[id]);return {id};},
  // Synthetic Auth records have no passwords; only the real handler's SQL effects are exercised.
  resetPassword:async()=>{}
 };
 const staticFiles=new Map(['portal.html','portal.css','portal-ui.js','portal-app.js','portal-model.js','course-data.js','private-preview.js','private-preview.css',
 'assets/portal/fonts/dm-sans.woff','assets/portal/fonts/bebas-neue.woff'].map(p=>['/'+p,path.join(root,p)]));
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff':'font/woff'};
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if(req.headers.host!==new URL(origin).host){json(res,403,{error:'Nur lokale Vorschau zugelassen.'});return;}
  const url=new URL(req.url,origin),route=['/','/index.html'].includes(url.pathname)?'/portal.html':url.pathname;
  if(req.method==='POST'&&req.headers.origin!==origin){json(res,403,{error:'Fremder Aufruf abgewiesen.'});return;}
  let token=String(req.headers.cookie||'').match(/(?:^|;\s*)portal_preview=([a-f0-9]{48})(?:;|$)/)?.[1];
  if(!sessions.has(token)){token=crypto.randomBytes(24).toString('hex');sessions.set(token,'anonymous');res.setHeader('Set-Cookie',`portal_preview=${token}; HttpOnly; SameSite=Strict; Path=/`);}
  try{
   if(req.method==='GET'&&route==='/api/actors'){json(res,200,{actors:Object.entries(fixture.users).map(([key,u])=>({key,label:u.display_name})),current:sessions.get(token)});return;}
   if(req.method==='GET'&&route==='/api/snapshot'){
    const user=sessions.get(token);const result=await transact(()=>fixture.asUser(user,'select public.get_portal_snapshot() as data'));
    json(res,200,result.rows[0].data);return;
   }
   if(req.method==='POST'&&route.startsWith('/api/')){
    let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>24000){json(res,413,{error:'Eingabe zu gross.'});return;}}
    const data=JSON.parse(body||'{}');
    if(route==='/api/select'){
     if(data.user!=='anonymous'&&!Object.hasOwn(fixture.users,data.user)){json(res,400,{error:'Unbekanntes Testkonto.'});return;}
     sessions.set(token,data.user);json(res,200,{ok:true});return;
    }
    if(route==='/api/logout'){sessions.set(token,'anonymous');json(res,200,{ok:true});return;}
    const user=sessions.get(token);let query,args;
    if(route==='/api/accounts'){
     const handler=createAccountHandler({config:{url:'https://synthetic.invalid',publishableKey:'synthetic',serviceRoleKey:'synthetic',allowedOrigin:origin,aliasDomain:'preview.invalid',adminEmail:'zhlerncoaching@gmail.com'},services:accountServices});
     const response=await transact(()=>handler(new Request(origin+'/api/accounts',{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${user}`,'Content-Type':'application/json'},body:JSON.stringify(data)})));
     const answer=await response.json();
     json(res,response.status,response.ok?answer:{error:'Die Test-Kontoaktion konnte nicht bestätigt werden. Prüfe Rolle, Angaben und Kontostand.',code:answer.code});return;
    }
    if(route==='/api/saturday'){query='select public.record_saturday($1,$2,$3::jsonb) as data';args=[data.student_id,data.course_day,JSON.stringify(data.payload)];}
    else if(route==='/api/exam'){query='select public.report_exam($1,$2,$3,$4,$5) as data';args=[data.student_id,data.exam_date,data.subject_id,data.topic,data.exam_id];}
    else if(route==='/api/admin'){query='select public.admin_change($1,$2::jsonb) as data';args=[data.action,JSON.stringify(data.payload)];}
    else {json(res,404,{error:'Nicht verfügbar.'});return;}
    const result=await transact(()=>fixture.asUser(user,query,args));json(res,200,result.rows[0].data);return;
   }
   if(req.method==='GET'&&staticFiles.has(route)){const data=await fs.readFile(staticFiles.get(route));res.writeHead(200,{'Content-Type':mime[path.extname(route)]||'application/octet-stream'});res.end(data);return;}
   json(res,404,{error:'Nicht verfügbar.'});
  }catch(error){
   const denied=error.code==='42501';json(res,denied?403:400,{error:denied?'Für dieses Testkonto nicht freigegeben.':'Die Eingabe konnte nicht gespeichert werden. Bitte Datum, Zuordnung und Werte prüfen.'});
  }
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 origin=`http://127.0.0.1:${server.address().port}`;
 if(!quiet)console.log(`Private Vorschau: ${origin}/ — erfundene Testfamilien, lokale SQL-Datenbank, keine echte Supabase-Anmeldung. Schliessen mit Strg+C.`);
 return {origin,fixture,async close(){await new Promise(r=>server.close(r));await queue;await fixture.db.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await startPreview({port:Number(process.env.PORTAL_PREVIEW_PORT||4187)});
 const stop=async()=>{await app.close();process.exit(0);};process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
