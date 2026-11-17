// Single-file Supabase Dashboard Edge Function. No production secrets in this file.
// Keep gateway JWT verification ON. No deploy or project is created by this file.
// Pure JavaScript syntax also allows isolated Node tests with injected services.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME=/^[a-z0-9][a-z0-9._-]{2,31}$/;
class AccountError extends Error {
 constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
function validConfig(c){
 try{
  const origin=new URL(c.allowedOrigin),backend=new URL(c.url);
  const permitted=u=>u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname));
  if(!permitted(origin)||origin.origin!==c.allowedOrigin||!permitted(backend)||backend.origin!==c.url) return false;
  return Boolean(c.publishableKey&&c.serviceRoleKey&&/^(?=.{3,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(c.aliasDomain)&&c.adminEmail==='zhlerncoaching@gmail.com');
 }catch{return false;}
}
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!UUID.test(body.request_id||'')||!['create','reset','disable','enable'].includes(body.action))throw new AccountError('ACCOUNT_INPUT_INVALID');
 const keys=body.action==='create'?['action','request_id','username','display_name','role']:['action','request_id','profile_id'];
 if(Object.keys(body).some(k=>!keys.includes(k)))throw new AccountError('ACCOUNT_INPUT_INVALID');
 if(body.action==='create'){
  if(typeof body.username!=='string'||!USERNAME.test(body.username)||body.username.includes('..')||typeof body.display_name!=='string'||!body.display_name.trim()||body.display_name.length>120||!['parent','student','teacher'].includes(body.role))throw new AccountError('ACCOUNT_INPUT_INVALID');
  return {username:body.username,display_name:body.display_name.trim(),role:body.role};
 }
 if(typeof body.profile_id!=='string'||!UUID.test(body.profile_id))throw new AccountError('ACCOUNT_INPUT_INVALID');
 return {profile_id:body.profile_id};
}
async function readBody(request){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new AccountError('ACCOUNT_JSON_REQUIRED',415);
 if(Number(request.headers.get('content-length'))>4096)throw new AccountError('ACCOUNT_INPUT_TOO_LARGE',413);
 const reader=request.body?.getReader();if(!reader)throw new AccountError('ACCOUNT_INPUT_INVALID');
 let length=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();throw new AccountError('ACCOUNT_INPUT_TOO_LARGE',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AccountError('ACCOUNT_INPUT_INVALID');}
}
function newPassword(cryptoApi){
 const bytes=cryptoApi.getRandomValues(new Uint8Array(24));
 // 192 random bits, no modulo bias, no predictable prefix or user-derived part.
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
 let result='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];result+=alphabet[(n>>>18)&63]+alphabet[(n>>>12)&63]+alphabet[(n>>>6)&63]+alphabet[n&63];}return result;
}
export function createRestServices(config,fetchImpl=fetch){
 async function call(path,{token=config.serviceRoleKey,body,method=body===undefined?'GET':'POST'}={}){
  let response;try{response=await fetchImpl(config.url+path,{method,redirect:'error',headers:{apikey:token===config.serviceRoleKey?config.serviceRoleKey:config.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new AccountError('ACCOUNT_BACKEND_UNAVAILABLE',503);}
  let data;try{data=await response.json();}catch{throw new AccountError('ACCOUNT_BACKEND_UNAVAILABLE',503);}
  if(!response.ok){
   const known=['ACCOUNT_ACCESS_DENIED','ACCOUNT_TARGET_DENIED','ACCOUNT_TARGET_BUSY','ACCOUNT_INPUT_INVALID','ACCOUNT_REQUEST_CONFLICT','ACCOUNT_REQUEST_UNAVAILABLE','ACCOUNT_RATE_LIMIT','ACCOUNT_USERNAME_EXISTS'];
   const code=known.find(x=>data?.message===x)||'ACCOUNT_OPERATION_FAILED';
   throw new AccountError(code,code==='ACCOUNT_RATE_LIMIT'?429:response.status===401?401:code.includes('DENIED')?403:409);
  }
  return data;
 }
 return {
  authenticate:token=>call('/auth/v1/user',{token}),
  begin:(token,id,action,payload)=>call('/rest/v1/rpc/begin_portal_account_action',{token,body:{p_request_id:id,p_action:action,p_payload:payload}}),
  prepare:(actor,id)=>call('/rest/v1/rpc/prepare_portal_account_action',{body:{p_actor:actor,p_request_id:id}}),
  finish:(actor,id,success,target)=>call('/rest/v1/rpc/finish_portal_account_action',{body:{p_actor:actor,p_request_id:id,p_success:success,p_target_id:target||null}}),
  createUser:async(email,password)=>{const data=await call('/auth/v1/admin/users',{body:{email,password,email_confirm:true}});return data.user||data;},
  resetPassword:(id,password)=>call(`/auth/v1/admin/users/${id}`,{method:'PUT',body:{password}})
 };
}
export function createAccountHandler({config,services=createRestServices(config),cryptoApi=globalThis.crypto}){
 return async request=>{
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(!validConfig(config))return reply({ok:false,code:'ACCOUNT_NOT_CONFIGURED'},503);
  if(request.headers.get('origin')!==config.allowedOrigin)return reply({ok:false,code:'ACCOUNT_ORIGIN_DENIED'},403);
  headers['Access-Control-Allow-Origin']=config.allowedOrigin;
  if(request.method==='OPTIONS'){
   headers['Access-Control-Allow-Methods']='POST';headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';headers['Access-Control-Max-Age']='600';
   return new Response(null,{status:204,headers});
  }
  if(request.method!=='POST')return reply({ok:false,code:'ACCOUNT_METHOD_DENIED'},405);
  let reservation,createdId;
  try{
   const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
   if(!token||token.length>8192)throw new AccountError('ACCOUNT_ACCESS_DENIED',401);
   const body=await readBody(request),payload=validate(body);
   const user=await services.authenticate(token);
   if(!user||!UUID.test(user.id||'')||user.is_anonymous||!user.email_confirmed_at||user.email?.toLowerCase()!==config.adminEmail)throw new AccountError('ACCOUNT_ACCESS_DENIED',403);
   // This JWT-scoped RPC rechecks designated ID, active state, AAL2, live Auth
   // session, expiry, revocation, strict payload, rate limit and request UUID.
   reservation=await services.begin(token,body.request_id,body.action,payload);
   if(reservation.actor_id!==user.id)throw new AccountError('ACCOUNT_ACCESS_DENIED',403);
   if(reservation.replayed){
    if(reservation.state==='succeeded')return reply({ok:true,action:body.action,profile_id:reservation.profile_id,replayed:true});
    throw new AccountError(reservation.state==='pending'?'ACCOUNT_REQUEST_PENDING':'ACCOUNT_REQUEST_FAILED',409);
   }
   const prepared=await services.prepare(user.id,body.request_id);
   if(prepared.action!==body.action||JSON.stringify(prepared.payload)!==JSON.stringify(payload)){
    // JSON object key order is not a database contract; compare fields explicitly below.
    if(prepared.action!==body.action||Object.keys(payload).some(k=>prepared.payload?.[k]!==payload[k])||Object.keys(prepared.payload||{}).length!==Object.keys(payload).length)throw new AccountError('ACCOUNT_REQUEST_CONFLICT',409);
   }
   let password;
   if(body.action==='create'){
    password=newPassword(cryptoApi);
    const created=await services.createUser(`${payload.username}@${config.aliasDomain}`,password);
    if(!UUID.test(created?.id||''))throw new AccountError('ACCOUNT_OPERATION_FAILED',502);
    createdId=created.id;
   }else{
    if(prepared.profile_id!==payload.profile_id)throw new AccountError('ACCOUNT_TARGET_DENIED',403);
    if(body.action==='reset'){password=newPassword(cryptoApi);await services.resetPassword(payload.profile_id,password);}
   }
   const result=await services.finish(user.id,body.request_id,true,createdId||prepared.profile_id);
   if(!result?.ok)throw new AccountError('ACCOUNT_OPERATION_FAILED',502);
   // Secrets exist only in this fresh, no-store response. Retries never replay them.
   return reply({...result,...(password?{initial_password:password}:{})});
  }catch(error){
   // Every reserved action reaches a durable success/failure audit record. If
   // the database itself is unavailable, pending remains for operator review;
   // it is NEVER automatically repeated and cannot duplicate an Auth write.
   if(reservation&&!reservation.replayed)try{await services.finish(reservation.actor_id,reservation.request_id,false,createdId);}catch{/* Pending is a durable failure boundary; do not log secret-bearing objects. */}
   return reply({ok:false,code:error instanceof AccountError?error.code:'ACCOUNT_OPERATION_FAILED'},error instanceof AccountError?error.status:502);
  }
 };
}

// Node imports stop here. In Supabase, Dashboard stores these environment values
// on the server. The service-role key is never sent to portal-config.js or HTML.
if(globalThis.Deno?.serve){
 const env=name=>Deno.env.get(name)||'';
 const config={url:env('SUPABASE_URL'),publishableKey:env('SUPABASE_ANON_KEY'),serviceRoleKey:env('SUPABASE_SERVICE_ROLE_KEY'),allowedOrigin:env('PORTAL_ALLOWED_ORIGIN'),aliasDomain:env('PORTAL_ALIAS_DOMAIN'),adminEmail:env('PORTAL_ADMIN_EMAIL')};
 Deno.serve(createAccountHandler({config}));
}
