import test from 'node:test';
import assert from 'node:assert/strict';
import {usernameAlias,loginAddress,ADMIN_EMAIL,takeRecoveryFragment,validConfiguration,createPortalApi} from '../../portal-api.js';
const config={enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test',aliasDomain:'portal.example.org'};
test('username mapping is canonical and rejects addresses/path characters',()=>{
 assert.equal(usernameAlias('  Nora.Test  ',config.aliasDomain),'nora.test@portal.example.org');for(const name of ['x','a@b.ch','a/b','a..b','<script>'])assert.throws(()=>usernameAlias(name,config.aliasDomain));
});
test('configuration fails closed; elevated keys and insecure remote endpoints rejected',()=>{
 const jwt=role=>'a.'+btoa(JSON.stringify({role}))+'.b';assert.equal(validConfiguration(config),true);
 for(const patch of [{enabled:false},{publishableKey:''},{publishableKey:'sb_secret_test'},{publishableKey:jwt('service_role')},{supabaseUrl:'http://example.org'},{supabaseUrl:'https://user:pass@example.org'},{supabaseUrl:'https://example.org/path'}])assert.equal(validConfiguration({...config,...patch}),false);
 assert.equal(validConfiguration({...config,publishableKey:jwt('anon'),supabaseUrl:'http://127.0.0.1:54321'},'127.0.0.1'),true);
 assert.equal(validConfiguration({...config,supabaseUrl:'http://127.0.0.1:54321'},'example.org'),false);
});
function harness(factors=[]){let options,args,loggedOut=0,updates=[];const client={auth:{signInWithPassword:async a=>{args=a;return{};},signOut:async()=>{loggedOut++;return{};},updateUser:async a=>{updates.push(a);return{};},mfa:{listFactors:async()=>({data:{totp:factors}}),challengeAndVerify:async()=>({})}},rpc:async()=>({data:{saved:true}})};const api=createPortalApi(config,(_u,_k,o)=>{options=o;return client;});return{api,client,get options(){return options;},get args(){return args;},get loggedOut(){return loggedOut;},updates};}
test('auth is memory-only, URL session detection disabled, alias login used',async()=>{const h=harness();await h.api.login({username:'Nora.Test',password:'synthetic-only'});assert.equal(h.options.auth.persistSession,false);assert.equal(h.options.auth.detectSessionInUrl,false);assert.equal(h.args.email,'nora.test@portal.example.org');});
test('MFA factor cannot silently fall back to password-only session',async()=>{const h=harness([{id:'factor',status:'verified'}]);await assert.rejects(h.api.login({username:'nora',password:'synthetic'}),/Sicherheitscode/);assert.equal(h.loggedOut,1);await h.api.login({username:'nora',password:'synthetic',totp:'123456'});});
test('own password change rejects short value and signs out all sessions',async()=>{const h=harness();await assert.rejects(h.api.changePassword('short'));assert.equal(h.updates.length,0);await h.api.changePassword('synthetic-only-long');assert.equal(h.updates.length,1);assert.equal(h.loggedOut,1);});
test('RPC errors do not leak database details or user payload',async()=>{const h=harness();h.client.rpc=async()=>({error:{code:'XX000',message:'private SQL data'}});await assert.rejects(h.api.getSnapshot(),e=>!e.message.includes('private SQL'));});

test('only designated admin uses a real email; families retain canonical usernames',async()=>{
 assert.equal(loginAddress(' ZHLERNCOACHING@gmail.com ',config.aliasDomain),ADMIN_EMAIL);
 assert.equal(loginAddress('milo',config.aliasDomain),'milo@portal.example.org');
 assert.throws(()=>loginAddress('other@gmail.com',config.aliasDomain));
 const h=harness();await h.api.login({username:ADMIN_EMAIL,password:'synthetic'});assert.equal(h.args.email,ADMIN_EMAIL);
});

test('MFA enrollment requires a valid six-digit confirmation and clears unverified setup on cancel',async()=>{
 const h=harness();let enrolled=0,removed=[],verified=[];
 h.client.auth.mfa.enroll=async()=>{enrolled++;return {data:{id:'new-factor',totp:{secret:'SYNTHETIC',qr_code:'<svg></svg>'}}};};
 h.client.auth.mfa.unenroll=async p=>{removed.push(p.factorId);return{};};
 h.client.auth.mfa.challengeAndVerify=async p=>{verified.push(p);return{};};
 const setup=await h.api.beginMfa();assert.equal(setup.secret,'SYNTHETIC');assert.equal(enrolled,1);
 await assert.rejects(h.api.verifyMfa('12'));assert.equal(verified.length,0);
 await h.api.verifyMfa('123456');await h.api.logout();assert.deepEqual(removed,[]);
 await h.api.beginMfa();await h.api.logout();assert.deepEqual(removed,['new-factor']);
});

test('MFA-required database rejection is distinguished without exposing SQL details',async()=>{
 const h=harness();h.client.rpc=async()=>({error:{code:'42501',message:'MFA_REQUIRED'}});
 await assert.rejects(h.api.getSnapshot(),e=>e.mfaRequired===true&&e.accessDenied===true);
});

test('failed removal of an unfinished MFA factor cannot prevent local sign-out',async()=>{
 const h=harness();h.client.auth.mfa.enroll=async()=>({data:{id:'unfinished',totp:{secret:'SYNTHETIC',qr_code:'<svg></svg>'}}});
 h.client.auth.mfa.unenroll=async()=>{throw new Error('offline');};await h.api.beginMfa();await h.api.logout();assert.equal(h.loggedOut,1);
});

test('recovery tokens are removed from URL even for malformed/rejected links',()=>{
 let replacement;const history={replaceState:(_a,_b,u)=>replacement=u};
 const location={pathname:'/portal.html',search:'',hash:'#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh'};
 assert.deepEqual(takeRecoveryFragment(location,history),{access_token:'synthetic-access',refresh_token:'synthetic-refresh'});assert.equal(replacement,'/portal.html');
 assert.deepEqual(takeRecoveryFragment({...location,hash:'#access_token=invalid'},history),{invalid:true});
 assert.equal(takeRecoveryFragment({...location,hash:'#normal-anchor'},history),null);
});

test('admin recovery checks server identity, requires existing MFA and globally signs out',async()=>{
 const h=harness([{id:'factor',status:'verified'}]);let verifiedUser='other@example.org';
 h.client.auth.setSession=async()=>({});h.client.auth.getUser=async()=>({data:{user:{email:verifiedUser,email_confirmed_at:'2026-11-17',is_anonymous:false}}});
 await assert.rejects(h.api.completeRecovery({password:'synthetic-long-password'}),/persönlichen/);
 await assert.rejects(h.api.acceptRecovery({access_token:'fake',refresh_token:'fake'}),/nicht gültig/);assert.equal(h.loggedOut,1);
 verifiedUser=ADMIN_EMAIL;await h.api.acceptRecovery({access_token:'fake',refresh_token:'fake'});
 await assert.rejects(h.api.completeRecovery({password:'synthetic-long-password'}),/Sicherheitscode/);assert.equal(h.updates.length,0);
 await h.api.completeRecovery({password:'synthetic-long-password',totp:'123456'});assert.equal(h.updates.length,1);assert.equal(h.loggedOut,2);
 await assert.rejects(h.api.completeRecovery({password:'synthetic-long-password',totp:'123456'}),/persönlichen/);
});

test('recovery request sends only the fixed admin address and a clean same-page redirect',async()=>{
 const h=harness();const prior=globalThis.location;globalThis.location={href:'https://preview.example.org/portal.html?anything=private#fragment'};
 let args;h.client.auth.resetPasswordForEmail=async(...p)=>{args=p;return{};};
 try{await h.api.requestRecovery();assert.deepEqual(args,[ADMIN_EMAIL,{redirectTo:'https://preview.example.org/portal.html'}]);}finally{globalThis.location=prior;}
});

test('account operations invoke the Edge function; access failures clear private views without secret errors',async()=>{
 const h=harness();let request;h.client.functions={invoke:async(name,options)=>{request={name,options};return {data:{ok:true,initial_password:'synthetic-once'}};}};
 const payload={action:'create',request_id:'synthetic-id',username:'nora'};
 assert.equal((await h.api.accountAction(payload)).initial_password,'synthetic-once');assert.deepEqual(request,{name:'portal-accounts',options:{body:payload}});
 h.client.functions.invoke=async()=>({error:{context:{status:403},message:'private-service-key'}});
 await assert.rejects(h.api.accountAction(payload),e=>e.accessDenied&&!e.message.includes('private-service-key'));
});

test('failed and pending account requests explain the safe next step without blindly repeating failed UUIDs',async()=>{
 const h=harness();for(const [code,expected]of [['ACCOUNT_REQUEST_FAILED',/abmelden und erneut anmelden/],['ACCOUNT_REQUEST_PENDING',/keinen neuen Zugang/],['ACCOUNT_TARGET_BUSY',/Abschluss abwarten/],['toString',/nicht bestätigt/],['__proto__',/nicht bestätigt/]]){
  h.client.functions={invoke:async()=>({error:{context:new Response(JSON.stringify({code,details:'private-sensitive-data'}),{status:409})}})};
  await assert.rejects(h.api.accountAction({}),e=>expected.test(e.message)&&!e.message.includes('private-sensitive'));
 }
});
