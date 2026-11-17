// Mocked HTTP/Auth boundary tests, NOT a deployed Supabase Edge/Auth acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountHandler,createRestServices} from '../supabase/functions/portal-accounts/index.ts';
const actor='00000000-0000-4000-8000-000000000001';
const target='00000000-0000-4000-8000-000000000002';
const config={url:'https://synthetic.invalid',publishableKey:'SYNTHETIC_PUBLIC_TEST_ONLY',serviceRoleKey:'SYNTHETIC_SERVER_TEST_ONLY',allowedOrigin:'https://preview.invalid',aliasDomain:'family.invalid',adminEmail:'zhlerncoaching@gmail.com'};
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(overrides={}){
 const rows=new Map(),calls=[],passwords=[];
 const services={
  authenticate:async()=>({id:actor,email:config.adminEmail,email_confirmed_at:'2026-01-01',is_anonymous:false}),
  begin:async(token,request_id,action,payload)=>{
   calls.push('begin');if(rows.has(request_id)){const r=rows.get(request_id);return {...r,replayed:true};}
   const row={actor_id:actor,request_id,action,payload,state:'pending',profile_id:action==='create'?null:payload.profile_id,replayed:false};rows.set(request_id,row);return {...row};
  },
  prepare:async(a,r)=>{calls.push('prepare');const row=rows.get(r);return {action:row.action,profile_id:row.profile_id,payload:row.payload};},
  finish:async(a,r,success,t)=>{calls.push(`finish:${success}`);const row=rows.get(r);row.state=success?'succeeded':'failed';row.profile_id=t||row.profile_id;return {ok:success,action:row.action,profile_id:row.profile_id,username:row.payload.username||'existing.test'};},
  createUser:async(email,password)=>{calls.push('create');passwords.push(password);assert.equal(email,'new.family@family.invalid');return {id:target};},
  resetPassword:async(t,password)=>{calls.push('reset');passwords.push(password);assert.equal(t,target);},
  ...overrides
 };
 const handler=createAccountHandler({config,services});
 const run=(body,{origin=config.allowedOrigin,token='synthetic-jwt',method='POST',contentType='application/json'}={})=>handler(new Request('https://synthetic.invalid/functions/v1/portal-accounts',{method,headers:{Origin:origin,...(token?{Authorization:`Bearer ${token}`}:{ }),'Content-Type':contentType},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
 return {run,calls,rows,passwords,services};
}
const create=(n=1)=>({action:'create',request_id:id(n),username:'new.family',display_name:'Erfundene Testfamilie',role:'parent'});
test('Create emits cryptographic start password only once and no-store response; replay never repeats Auth write',async()=>{
 const e=fixture(),first=await e.run(create()),data=await first.json();
 assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'no-store, private');assert.equal(data.profile_id,target);
 assert.match(data.initial_password,/^[A-Za-z0-9_-]{32}$/);assert.equal(e.passwords[0],data.initial_password);
 const second=await (await e.run(create())).json();assert.equal(second.replayed,true);assert.equal('initial_password'in second,false);assert.equal(e.calls.filter(x=>x==='create').length,1);
 assert.equal(JSON.stringify([...e.rows.values()]).includes(data.initial_password),false);
});
test('Reset is prepared before Auth mutation and final audit; enable and disable do not change Auth password',async()=>{
 const e=fixture();for(const [n,action]of [[1,'reset'],[2,'enable'],[3,'disable']]){
  const data=await (await e.run({action,request_id:id(n),profile_id:target})).json();assert.equal(data.ok,true);assert.equal('initial_password'in data,action==='reset');
 }
 assert.deepEqual(e.calls.slice(0,4),['begin','prepare','reset','finish:true']);assert.equal(e.passwords.length,1);
});
test('Origin is exact, CORS preflight narrow, missing or bad origins never reach authentication',async()=>{
 const e=fixture({authenticate:()=>{throw new Error('must not authenticate');}});
 for(const origin of ['https://preview.invalid.evil.invalid','http://preview.invalid','null','https://other.invalid',''])assert.equal((await e.run(create(),{origin})).status,403);
 const preflight=await e.run(null,{method:'OPTIONS'});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),config.allowedOrigin);assert.equal(preflight.headers.get('access-control-allow-methods'),'POST');
 assert.equal((await e.run(null,{method:'GET'})).status,405);assert.equal((await e.run(create(),{token:''})).status,401);assert.equal(e.calls.length,0);
});
test('Reject oversized body, unexpected fields, admin role, arbitrary IDs and malformed JSON before Auth mutations',async()=>{
 const e=fixture();const invalid=[{...create(),service_role_key:'forbidden'},{...create(),role:'admin'},{...create(),username:'Other'}, {...create(),username:'a..b'}, {...create(),display_name:' '.repeat(121)}, {...create(),request_id:'invalid'}, {action:'reset',request_id:id(1),profile_id:'foreign-path'}, {...create(),action:'delete'},'{bad json'];
 for(const body of invalid){const response=await e.run(body);assert.equal(response.status,400);assert.equal((await response.json()).ok,false);}
 assert.equal((await e.run('x'.repeat(4097))).status,413);assert.equal((await e.run(create(),{contentType:'text/plain'})).status,415);assert.equal(e.calls.length,0);
});
test('Verified owner mailbox and JWT-scoped SQL gate both required; metadata or matching mail alone does not grant access',async()=>{
 for(const user of [{id:actor,email:'foreign@example.invalid',email_confirmed_at:'yes'}, {id:actor,email:config.adminEmail}, {id:actor,email:config.adminEmail,email_confirmed_at:'yes',is_anonymous:true}]){
  const e=fixture({authenticate:async()=>user});assert.equal((await e.run(create())).status,403);assert.equal(e.calls.length,0);
 }
 const e=fixture({begin:async()=>{throw new Error('AAL1, non-admin or expired Auth session');}});assert.equal((await e.run(create())).status,502);assert.equal(e.calls.length,0);assert.equal(e.passwords.length,0);
});
test('Pending or failed UUID is not retried, preparation failure never mutates Auth, failures audited without error detail',async()=>{
 const e=fixture({createUser:async()=>{throw new Error('Synthetic sensitive failure detail must not leak');}});
 const response=await e.run(create());assert.equal(response.status,502);assert.equal((await response.text()).includes('sensitive'),false);assert.equal(e.rows.get(id(1)).state,'failed');assert.ok(e.calls.includes('finish:false'));
 assert.equal((await e.run(create())).status,409);assert.equal(e.calls.filter(x=>x==='prepare').length,1);
 const p=fixture({prepare:async()=>{throw new Error('Admin session revoked');}});assert.equal((await p.run(create())).status,502);assert.equal(p.passwords.length,0);assert.equal(p.rows.get(id(1)).state,'failed');
 const wait=fixture();wait.rows.set(id(1),{actor_id:actor,request_id:id(1),state:'pending'});assert.equal((await wait.run(create())).status,409);assert.equal(wait.passwords.length,0);
});
test('REST adapter separates user token from server secret, rejects redirects and preserves sanitized SQL errors',async()=>{
 const calls=[];const services=createRestServices(config,async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify(url.endsWith('/user')?{id:actor}:{ok:true}),{status:200});});
 await services.authenticate('SYNTHETIC_USER_JWT');await services.begin('SYNTHETIC_USER_JWT',id(1),'disable',{profile_id:target});await services.prepare(actor,id(1));await services.finish(actor,id(1),false);await services.createUser('new.family@family.invalid','SYNTHETIC_RANDOM_VALUE');await services.resetPassword(target,'SYNTHETIC_RANDOM_VALUE');
 for(const [i,{opts}]of calls.entries()){assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,`Bearer ${i<2?'SYNTHETIC_USER_JWT':config.serviceRoleKey}`);assert.equal(opts.headers.apikey,i<2?config.publishableKey:config.serviceRoleKey);}
 const denied=createRestServices(config,async()=>new Response(JSON.stringify({message:'ACCOUNT_TARGET_BUSY',details:'private detail'}),{status:400}));
 await assert.rejects(denied.prepare(actor,id(1)),e=>e.message==='ACCOUNT_TARGET_BUSY'&&!e.message.includes('private'));
});
test('Invalid or absent server configuration fails closed without exposing keys',async()=>{
 for(const change of [{serviceRoleKey:''},{allowedOrigin:'*'},{allowedOrigin:'https://preview.invalid/'},{url:'https://backend.invalid/path'},{adminEmail:'other@example.invalid'}]){
  const handler=createAccountHandler({config:{...config,...change},services:{}});const response=await handler(new Request('https://synthetic.invalid',{headers:{Origin:config.allowedOrigin}}));assert.equal(response.status,503);assert.equal((await response.text()).includes(config.serviceRoleKey),false);
 }
});
