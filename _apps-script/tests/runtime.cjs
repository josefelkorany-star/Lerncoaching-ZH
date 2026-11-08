const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function runtime(options = {}) {
  const state = {now:options.now || '2026-11-08T12:00:00Z', rows:[], writes:[], mails:[], locked:false,
    failSave:false, failFlush:false, failMail:false, failMailStatus:false, readIds:[], hook:null};
  const props = {LC_MODE:'production', LC_SPREADSHEET_ID:'TEST_FIXTURE_PRODUCTION_ID', LC_TEST_SPREADSHEET_ID:'TEST_FIXTURE_ISOLATED_ID',
    LC_SHEET_NAME:'Anmeldungen',LC_NOTIFY_EMAIL:'captured@example.invalid',LC_TOKEN_SECRET:'test-only-secret-never-a-production-credential',...options.props};
  const NativeDate = Date;
  class ClockDate extends NativeDate {
    constructor(...args) {super(...(args.length ? args : [state.now]));}
    static now(){return new NativeDate(state.now).getTime();}
  }
  const sheet = {
    getLastColumn:()=>state.rows[0]?.length || 0,
    getLastRow:()=>state.rows.length,
    getRange(row,column,nRows=1,nColumns=1){
      return {
        getValues(){return Array.from({length:nRows},(_,r)=>Array.from({length:nColumns},(_,c)=>state.rows[row+r-1]?.[column+c-1]??''));},
        setNumberFormat(format){state.writes.push({kind:'format',row,column,nRows,nColumns,format});return this;},
        setValues(values){
          if(state.failSave)throw Error('PRIVATE SPREADSHEET FAILURE');
          if(state.failMailStatus && nRows===1&&nColumns===1)throw Error('PRIVATE MAIL STATUS FAILURE');
          for(let r=0;r<nRows;r++){state.rows[row+r-1]??=[];for(let c=0;c<nColumns;c++)state.rows[row+r-1][column+c-1]=values[r][c];}
          state.writes.push({kind:'values',row,column,nRows,nColumns});
          if(state.hook){const hook=state.hook;state.hook=null;hook();}
          return this;
        },
        setValue(value){return this.setValues([[value]]);}
      };
    }
  };
  const context = vm.createContext({Date:ClockDate,Intl,JSON,Object,Array,String,Number,Math,
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]??null})},
    Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
      computeDigest:(_,value)=>[...crypto.createHash('sha256').update(value).digest()],
      computeHmacSha256Signature:(value,key)=>[...crypto.createHmac('sha256',key).update(value).digest()],
      base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64').replace(/\+/g,'-').replace(/\//g,'_'),
      formatDate(date,zone,format){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));return format==='yyyy-MM-dd'?`${parts.year}-${parts.month}-${parts.day}`:`${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;}
    },
    LockService:{getScriptLock(){let held=false;return {tryLock(){if(state.locked)return false;state.locked=true;held=true;return true;},hasLock:()=>held,releaseLock(){if(held){state.locked=false;held=false;}}};}},
    SpreadsheetApp:{openById(id){state.readIds.push(id);return {getSheetByName:name=>name===props.LC_SHEET_NAME?sheet:null};},flush(){if(state.failFlush){state.failFlush=false;throw Error('PRIVATE FLUSH FAILURE');}}},
    MailApp:{sendEmail(message){if(state.failMail)throw Error('PRIVATE MAIL FAILURE');state.mails.push(message);}},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput(text){return {text,setMimeType(){return this;}};}}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/Code.gs'),'utf8'),context,{filename:'Code.gs'});
  state.rows.push([...context.LC_LEGACY_HEADERS,...context.LC_EXTRA_HEADERS]);
  if(options.legacy)state.rows.push([...options.legacy,...context.LC_EXTRA_HEADERS.map(()=>'')]);
  function payload(changes={}){
    const boot=context.bootstrap_();state.now=new NativeDate(new NativeDate(state.now).getTime()+2000).toISOString();
    return {requestId:boot.requestId,token:boot.token,infoVersion:boot.infoVersion,privacyVersion:boot.privacyVersion,
      name:'TEST Person',level:'Primarschule (3.–6. Kl.)',levelOther:'',offer:'probetag',contact:'TEST Kontakt, test@example.invalid',desiredDate:'2026-11-14',message:'TEST Mathematik',website:'',...changes};
  }
  return {context,state,props,sheet,payload,record:row=>Object.fromEntries(state.rows[0].map((key,i)=>[key,state.rows[row][i]]))};
}
module.exports={runtime};
