// Executes the working inline script in a DOM emulation, never in a browser.
// Only test probes are appended in memory; original files are not rewritten.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(process.env.COACH_DEPENDENCY_ROOT?path.resolve(process.env.COACH_DEPENDENCY_ROOT,'package.json'):new URL('../../../.local-dev/portal-tools/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
export const workingHtml=await fs.readFile(new URL('../working/coach.html',import.meta.url),'utf8');
export const inlineScript=workingHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
export function storage(initial={}){const values=new Map(Object.entries(initial));return {values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()};}
export function harness({local=storage(),session=storage(),fetch:fetchImpl,apiUrl='',pdfLib}={}){
 const {document,window:dom}=parseHTML(workingHtml);let active=null,nextTimer=1;
 const timers=new Map(),calls=[],canvases=[],urls=[],images=[],readers=[],windowListeners=new Map();
 Object.defineProperty(document,'activeElement',{configurable:true,get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this;};
 const create=document.createElement.bind(document);
 document.createElement=function(name){const e=create(name);if(name==='canvas'){canvases.push(e);e.getContext=()=>({fillStyle:'',fillRect(){},drawImage(){}});e.toDataURL=(type,quality)=>`data:${type};base64,${btoa(`synthetic ${e.width}x${e.height} ${quality}`)}`;}return e;};
 const setTimer=(fn,delay)=>{const id=nextTimer++;timers.set(id,{fn,delay});return id;};
 class MockImage{constructor(){this.naturalWidth=3000;this.naturalHeight=2000;images.push(this);}set src(_v){setTimer(()=>this.onload?.(),0);}}
 class MockFileReader{constructor(){readers.push(this);}readAsArrayBuffer(file){this.file=file;this.timer=setTimer(()=>{const bytes=file.bytes||new TextEncoder().encode(file.content||'%PDF-1.7\nsynthetic only');this.result=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);this.onload?.();},file.readDelay||0);}abort(){timers.delete(this.timer);this.aborted=true;this.onabort?.();}}
 const sandbox={document,console:{log(){},warn(){},error(){}},navigator:{maxTouchPoints:0},localStorage:local,sessionStorage:session,innerHeight:800,addEventListener(type,handler){if(!windowListeners.has(type))windowListeners.set(type,[]);windowListeners.get(type).push(handler);},setTimeout:setTimer,clearTimeout:id=>timers.delete(id),Image:MockImage,AbortController,URL:{createObjectURL:file=>{urls.push(file);return 'blob:synthetic-only';},revokeObjectURL(){}},fetch:async(url,options)=>{calls.push({url,options,payload:JSON.parse(options.body)});if(!fetchImpl)throw new Error('Online fetch forbidden in working demo tests');return fetchImpl(url,options);}};
 sandbox.window=sandbox;sandbox.FileReader=MockFileReader;sandbox.atob=atob;sandbox.btoa=btoa;sandbox.Uint8Array=Uint8Array;
 sandbox.PDFLib=pdfLib||{PDFDocument:{async load(bytes){if(new TextDecoder().decode(bytes).indexOf('%PDF-')!==0)throw Error('Synthetic invalid PDF');return {getPageCount:()=>1,save:async()=>bytes};}}};
 const probe='window.__coachTest={S:S,KONFIG:KONFIG,FAECHER:FAECHER,api:api,normCode:normCode,zeigeCode:zeigeCode,md:md,chatKey:chatKey,anmelden:anmelden,abmelden:abmelden,speichereChats:speichereChats,speichereSitzung:speichereSitzung,neuerChat:neuerChat,oeffneChat:oeffneChat,aktuellerChat:aktuellerChat,verlaufFuerServer:verlaufFuerServer,senden:senden,nochmals:nochmals,schicke:schicke,meldungsId:meldungsId,bildVorbereiten:bildVorbereiten,oeffne:oeffne,schliesse:schliesse,renderChat:renderChat};\n';
 const configuration=apiUrl===undefined?'':'KONFIG.API_URL='+JSON.stringify(apiUrl)+';\n';
 const code=inlineScript.replace('  start();\n})();',probe+configuration+'  start();\n})();');
 if(code===inlineScript)throw new Error('Original script end changed; review harness before use.');
 vm.runInNewContext(code,sandbox,{filename:'coach-working-inline.js',timeout:1000});
 const coach=sandbox.__coachTest;
 const event=(target,type,props={})=>{const e=new dom.Event(type,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;};
 async function flush(maxDelay=1200){for(let round=0;round<15;round++){for(let n=0;n<6;n++)await Promise.resolve();const runnable=[...timers].filter(([,t])=>t.delay<=maxDelay);if(!runnable.length){if(round>2)break;continue;}for(const [id,t]of runnable){timers.delete(id);t.fn();}}}
 async function login(code='DEMO',{remember=true}={}){document.getElementById('code').value=code;document.getElementById('bleiben').checked=remember;event(document.getElementById('login-form'),'submit');await flush();}
 async function send(text){document.getElementById('eingabe').value=text;event(document.getElementById('composer'),'submit');await flush();}
 const windowEvent=(type,properties={})=>{for(const handler of windowListeners.get(type)||[])handler({type,...properties});};
 return {document,coach,local,session,calls,canvases,urls,images,readers,sandbox,event,flush,login,send,timers,windowEvent};
}
export const copy=value=>JSON.parse(JSON.stringify(value));
