import test from 'node:test';
import assert from 'node:assert/strict';
import {usernameAlias,validConfiguration,createPortalApi} from '../../portal-api.js';
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
