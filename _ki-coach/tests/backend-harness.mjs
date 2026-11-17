// Synthetic Google/Claude boundary only. Executes the supplied source without editing it.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
export const source=await fs.readFile(new URL('../original/Code%20(1).gs',import.meta.url),'utf8');
export function createBackend(options={}){
 const clock={now:Date.parse(options.now||'2026-11-17T12:00:00Z')};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
 const props=new Map(),cache=new Map(),sheets=new Map(),requests=[],mail=[],errors=[],alerts=[],dialogs=[],triggers=[],locks=[];
 const fail={append:new Set(),mail:false,properties:false};
 const clone=x=>Array.isArray(x)?x.map(clone):x;
 function sheet(name,initial=[]){
  const b={name,rows:clone(initial),getName:()=>name,getLastRow(){let n=this.rows.length;while(n&&!this.rows[n-1]?.some(x=>x!==''&&x!==undefined&&x!==null))n--;return n;},
   getRange(row,col,height=1,width=1){const range={getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>b.rows[row+r-1]?.[col+c-1]??'')),setValues(values){for(let r=0;r<height;r++){b.rows[row+r-1]??=[];for(let c=0;c<width;c++)b.rows[row+r-1][col+c-1]=values[r][c];}return range;},setValue(value){return this.setValues([[value]]);}};
    for(const m of ['insertCheckboxes','setNumberFormat','setDataValidation','setNote','setWrap','setFontWeight','setFontSize','setBackground','setFontColor'])range[m]=()=>range;
    return range;},appendRow(values){if(fail.append.has(name))throw new Error('Synthetic sheet failure');this.rows.push(clone(values));return this;},deleteRows(start,n){this.rows.splice(start-1,n);},clear(){this.rows=[];return this;},setColumnWidth(){return this;},setFrozenRows(){return this;}};
  sheets.set(name,b);return b;
 }
 const ss={getId:()=> 'SYNTHETIC_COACH_SHEET',getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>sheet(name),getSheets:()=>[...sheets.values()],deleteSheet:b=>sheets.delete(b.name)};
 const properties={getProperty:key=>props.get(key)??null,setProperty(key,value){if(fail.properties)throw new Error('Synthetic properties failure');props.set(key,String(value));return this;},setProperties(values){if(fail.properties)throw new Error('Synthetic properties failure');for(const[k,v]of Object.entries(values))props.set(k,String(v));return this;},getProperties:()=>Object.fromEntries(props),deleteProperty:key=>props.delete(key)};
 const ui={Button:{OK:'OK',CANCEL:'CANCEL'},ButtonSet:{OK:'OK',OK_CANCEL:'OK_CANCEL'},alert:(...v)=>alerts.push(v),prompt:()=>({getSelectedButton:()=> 'CANCEL',getResponseText:()=>''}),showModalDialog:html=>dialogs.push(html),createMenu(){const m={addItem(){return m;},addSeparator(){return m;},addToUi(){return m;}};return m;}};
 const normalResponse=()=>({status:200,body:{content:[{type:'text',text:'Welche Angaben kennst du bereits?'}],usage:{input_tokens:100,output_tokens:20},stop_reason:'end_turn'}});
 let fetchImpl=options.fetch||normalResponse;
 const environment={console:{error:(...a)=>errors.push(a.join(' ')),log:()=>{}},Date:ClockDate,JSON,Math,Error,Number,String,Array,Object,isFinite,
  PropertiesService:{getScriptProperties:()=>properties},CacheService:{getScriptCache:()=>({get:key=>{const hit=cache.get(key);return hit&&hit.until>clock.now?hit.value:null;},put:(key,value,seconds)=>cache.set(key,{value,until:clock.now+seconds*1000})})},
  LockService:{getScriptLock:()=>({waitLock:ms=>locks.push(['wait',ms]),releaseLock:()=>locks.push(['release'])})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a,value)=>[...crypto.createHash('sha256').update(value).digest()],sleep:ms=>{clock.now+=ms;},formatDate:(date,zone,format)=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return format.replace('yyyy',p.year).replace('MM',p.month).replace('dd',p.day).replace('HH',p.hour).replace('mm',p.minute);}},
  SpreadsheetApp:{openById:id=>{if(id!==ss.getId())throw new Error('Unexpected spreadsheet');return ss;},getActiveSpreadsheet:()=>ss,getUi:()=>ui,newDataValidation:()=>{const d={requireValueInList:()=>d,setAllowInvalid:()=>d,build:()=>({})};return d;}},
  ScriptApp:{getProjectTriggers:()=>triggers.map(n=>({getHandlerFunction:()=>n})),newTrigger:name=>{const t={timeBased:()=>t,everyDays:()=>t,atHour:()=>t,create:()=>triggers.push(name)};return t;}},
  Session:{getEffectiveUser:()=>({getEmail:()=> 'operator@example.invalid'})},MailApp:{sendEmail(...args){if(fail.mail)throw new Error('Synthetic mail failure');mail.push(args);}},
  HtmlService:{createHtmlOutput:html=>{const h={html,setWidth:()=>h,setHeight:()=>h};return h;}},
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
  UrlFetchApp:{fetch(url,params){const input={url,params,body:JSON.parse(params.payload)};requests.push(input);const reply=fetchImpl(input,requests.length);if(reply instanceof Error)throw reply;return {getResponseCode:()=>reply.status,getContentText:()=>typeof reply.body==='string'?reply.body:JSON.stringify(reply.body)};}}
 };
 const context=vm.createContext(environment);new vm.Script(source,{filename:'Code (1).gs'}).runInContext(context);
 const settings=changes=>{const b=sheets.get(context.BLATT.EINSTELLUNGEN);for(const[key,value]of Object.entries(changes)){const def=context.EINSTELLUNGEN.find(x=>x[0]===key);if(!def)throw new Error('Unknown setting '+key);const row=b.rows.find(x=>x[0]===def[1]);if(row)row[1]=value;else b.rows.push([def[1],value]);}};
 context.einrichten();
 // Sentinel only; no external request leaves this harness.
 props.set('ANTHROPIC_API_KEY','SYNTHETIC_NON_SECRET');
 const addUser=(code='LC-ABCD-EFGH',patch={})=>{const n={name:'Testkind Birke',role:'Schüler',stage:'5. Primar',active:true,budget:'',daily:'',...patch};sheets.get('Zugänge').rows.push([n.name,n.role,n.stage,code,n.active,n.budget,n.daily,'','','','']);return code;};
 const student=addUser(),teacher=addUser('LC-JKLM-NPQR',{name:'Testlehrperson Linde',role:'Lehrperson',stage:'Team'});
 const post=body=>JSON.parse(context.doPost({postData:{contents:typeof body==='string'?body:JSON.stringify(body)}}).text);
 const chat=(patch={})=>post({aktion:'chat',code:student,fach:'Mathematik',nachrichten:[{rolle:'user',text:'Wie beginne ich diese Aufgabe?'}],...patch});
 return {context,clock,props,cache,sheets,ss,ui,requests,mail,errors,alerts,dialogs,triggers,locks,fail,settings,addUser,student,teacher,post,chat,setFetch(fn){fetchImpl=fn;},normalResponse,advance(ms=4000){clock.now+=ms;}};
}
