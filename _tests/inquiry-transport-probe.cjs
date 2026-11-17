'use strict';
// Diagnostic only. Every network request is aborted before the one SDK call.
const COMMIT_GATE='CODEX RPC-DIAGNOSE READONLY 20261117 7F2A';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted'||process.env.RUNNER_OS!=='Linux'||
  process.env.GITHUB_REPOSITORY!=='josefelkorany-star/Lerncoaching-ZH'||process.env.GITHUB_EVENT_NAME!=='push'||
  process.env.GITHUB_REF!=='refs/heads/codex/anfrage-transport-probe-20261117'||process.env.GITHUB_RUN_ATTEMPT!=='1'||
  process.env.PROBE_PUBLIC_REPOSITORY!=='true'||process.env.PROBE_REVIEW!=='approved-readonly'||!process.env.RUNNER_TEMP){
  throw new Error('CLOUD_READONLY_GUARD');
}
const fs=require('node:fs/promises'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),temp=path.resolve(process.env.RUNNER_TEMP),dependencies=path.resolve(process.env.PROBE_DEPENDENCIES||'');
if(!dependencies.startsWith(temp+path.sep))throw new Error('TEMP_TOOLS_GUARD');
function check(value,code){if(!value)throw new Error(code);}
function log(value){console.log(JSON.stringify(value));}
function googleOrigin(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('-script.googleusercontent.com'));}catch(_){return false;}}

// The output vocabulary contains only fixed keys, types, indexes and booleans.
// Values, lengths, headers, URLs, tokens and unknown key names never leave here.
function safeStructure(raw){
  const knownKeys=new Set(['request','function','functionName','method','parameters','args','params','f.req','at','token','requestId','scriptId','payload','rpc','rpcName','action','user_content_key','lib','c','sid','hl','v','req','appId','userObj','diagnostic']);
  const nodes=[];let budget=100,knownMethodFound=false,syntheticMarkerFound=false;
  function visit(value,where,depth){
    if(--budget<0||depth>10)return;
    if(value===null){nodes.push({path:where,type:'null'});return;}
    if(Array.isArray(value)){nodes.push({path:where,type:'array',items:Math.min(value.length,25)});value.slice(0,25).forEach((item,index)=>visit(item,where+'['+index+']',depth+1));return;}
    if(typeof value==='object'){
      nodes.push({path:where,type:'object'});let n=0;
      for(const [key,item] of Object.entries(value).slice(0,25)){const label=knownKeys.has(key)?key:'unknown-key-'+(++n);visit(item,where+'.'+label,depth+1);}return;
    }
    if(typeof value!=='string'){nodes.push({path:where,type:typeof value});return;}
    const isMethod=value==='doGet',isMarker=value==='CODEX-TRANSPORT-DIAGNOSE-20261117-7F2A';
    knownMethodFound=knownMethodFound||isMethod;syntheticMarkerFound=syntheticMarkerFound||isMarker;
    nodes.push({path:where,type:'string',knownMethod:isMethod,syntheticMarker:isMarker});
    if(value.length>250000)return;
    try{const decoded=JSON.parse(value);if(decoded!==value){visit(decoded,where+'<json>',depth+1);return;}}catch(_){}
    try{
      if(value.includes('=')){
        const entries=[...new URLSearchParams(value).entries()];
        if(entries.length&&entries.some(([key])=>knownKeys.has(key))){visit(entries.map(([key,item])=>({[knownKeys.has(key)?key:'unknown-key']:item})),where+'<form>',depth+1);return;}
      }
    }catch(_){}
    try{const decoded=decodeURIComponent(value);if(decoded!==value){visit(decoded,where+'<uri>',depth+1);return;}}catch(_){}
    if(/^[A-Za-z0-9+/_=-]{24,}$/.test(value)){
      try{const decoded=Buffer.from(value,'base64').toString('utf8');if(decoded!==value&&/^[\[{]/.test(decoded.trim()))visit(decoded,where+'<base64>',depth+1);}catch(_){}
    }
  }
  if(typeof raw!=='string'||raw.length>250000)return{bodyPresent:typeof raw==='string',inspected:false};
  visit(raw,'body',0);
  return{bodyPresent:true,inspected:true,knownMethodFound,syntheticMarkerFound,nodes,truncated:budget<0};
}

let phase='preflight',sdkInvocations=0,blockedAfterGate=0,blockedNonReadBeforeGate=0,allowedAfterGate=0,blockedSockets=0,matchingReadOnlyTransport=0;
async function main(){
  const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  check(event.repository?.private===false&&event.head_commit?.message===COMMIT_GATE,'EVENT_GUARD');
  const index=await fs.readFile(path.join(root,'index.html'),'utf8'),match=index.match(/<iframe[\s\S]*?src="([^"]+)"/);
  check(match&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(match[1]),'TARGET_GUARD');
  const {chromium}=createRequire(path.join(dependencies,'package.json'))('playwright');
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:375,height:1000},serviceWorkers:'block'});
    await context.routeWebSocket('**/*',socket=>{blockedSockets++;socket.close();});
    await context.addInitScript(()=>{
      for(const name of ['WebTransport','RTCPeerConnection','webkitRTCPeerConnection']){
        try{Object.defineProperty(globalThis,name,{value:class{constructor(){throw new Error('CHANNEL_BLOCKED');}},configurable:false,writable:false});}catch(_){}
      }
    });
    let gateClosed=false;
    await context.route('**/*',route=>{
      const request=route.request();
      if(gateClosed){
        blockedAfterGate++;
        const structure=safeStructure(request.postData());
        const matching=structure.knownMethodFound===true&&structure.syntheticMarkerFound===true;
        if(matching)matchingReadOnlyTransport++;
        if(blockedAfterGate<=12||matching){
          const method=['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method())?request.method():'OTHER';
          const kind=['document','script','stylesheet','image','font','xhr','fetch','other'].includes(request.resourceType())?request.resourceType():'OTHER';
          // No request URL, headers or body is logged or written to disk.
          log({blocked:true,afterGate:true,method,kind,structure});
        }
        return route.abort();
      }
      if(!['GET','HEAD'].includes(request.method())){blockedNonReadBeforeGate++;return route.abort();}
      return route.continue();
    });
    phase='loading-readonly';
    const page=await context.newPage();await page.goto(match[1],{waitUntil:'domcontentloaded'});
    let form;
    for(let i=0;i<100&&!form;i++){
      for(const frame of page.frames()){
        if(!googleOrigin(frame.url()))continue;
        if(await frame.locator('#myForm').count()===1&&await frame.locator('#myForm').isVisible()){form=frame;break;}
      }
      if(!form)await new Promise(resolve=>setTimeout(resolve,200));
    }
    check(form,'OLD_FORM_NOT_READY');
    const available=await form.evaluate(()=>Boolean(globalThis.google&&google.script&&google.script.run&&typeof google.script.run.withSuccessHandler==='function'&&typeof google.script.run.withFailureHandler==='function'&&typeof google.script.run.doGet==='function'));
    check(available,'READONLY_SDK_METHOD_UNAVAILABLE');
    log({phase:'readonly-ready',oldFormFound:true,knownReadOnlyMethodAvailable:true,blockedNonReadBeforeGate});
    // This assignment runs in Node before the browser evaluates the SDK call.
    // There is no route.continue branch reachable once this becomes true.
    gateClosed=true;phase='all-network-blocked';
    log({phase,allMethodsAborted:true,webSocketsBlocked:true,serviceWorkersBlocked:true});
    sdkInvocations++;
    const invoked=await form.evaluate(()=>{
      globalThis.__LC_TRANSPORT_DIAGNOSTIC__={invoked:false,success:false,failure:false};
      const state=globalThis.__LC_TRANSPORT_DIAGNOSTIC__;
      const runner=google.script.run.withSuccessHandler(()=>{state.success=true;}).withFailureHandler(()=>{state.failure=true;});
      if(typeof runner.doGet!=='function')return false;
      state.invoked=true;
      // Existing v10 doGet only creates HTML. Every outgoing request is aborted.
      runner.doGet({diagnostic:'CODEX-TRANSPORT-DIAGNOSE-20261117-7F2A'});
      return true;
    });
    check(invoked,'READONLY_SDK_CALL_NOT_CREATED');
    await new Promise(resolve=>setTimeout(resolve,5000));
    const status=await form.evaluate(()=>({invoked:globalThis.__LC_TRANSPORT_DIAGNOSTIC__.invoked,success:globalThis.__LC_TRANSPORT_DIAGNOSTIC__.success,failure:globalThis.__LC_TRANSPORT_DIAGNOSTIC__.failure}));
    check(!status.success,'UNEXPECTED_SDK_SUCCESS');check(matchingReadOnlyTransport>0,'NO_MATCHING_TRANSPORT_OBSERVED');check(sdkInvocations===1&&allowedAfterGate===0,'PROBE_GUARD_FAILED');
    log({result:'READONLY_TRANSPORT_DIAGNOSIS_COMPLETED',sdkInvocations,blockedAfterGate,matchingReadOnlyTransport,allowedAfterGate,blockedSockets,blockedNonReadBeforeGate,callback:status,realInquirySubmitted:false});
    await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{const code=/^[A-Z][A-Z0-9_]+$/.test(error.message||'')?error.message:'PROBE_CHECK_FAILED';log({result:'STOP_NO_RETRY',code,phase,sdkInvocations,blockedAfterGate,matchingReadOnlyTransport,allowedAfterGate,realInquirySubmitted:false});process.exitCode=1;});
