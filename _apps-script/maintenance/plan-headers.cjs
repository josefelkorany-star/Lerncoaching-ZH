// Read-only migration planner: accepts a JSON array of current header strings.
// Never connects to Google, deletes data or writes a spreadsheet.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/Code.gs'),'utf8'),context);
function plan(headers){
  if(!Array.isArray(headers)||headers.some(x=>typeof x!=='string'))throw Error('Expected header array');
  if(new Set(headers).size!==headers.length)throw Error('Duplicate existing columns: inspect manually');
  context.LC_LEGACY_HEADERS.forEach((value,index)=>{if(headers[index]!==value)throw Error('Legacy column mismatch at '+(index+1));});
  const missing=context.LC_EXTRA_HEADERS.filter(value=>!headers.includes(value));
  return {readOnly:true,preserveColumns:headers.length,appendStartingAtColumn:headers.length+1,appendHeaders:missing,finalHeaders:headers.concat(missing),requiredAction:'Back up the verified sheet and append only these missing header cells. Do not clear, reorder, populate historical consent cells or migrate historical rows.'};
}
if(require.main===module){if(!process.argv[2])throw Error('Usage: node maintenance/plan-headers.cjs private-header-snapshot.json');console.log(JSON.stringify(plan(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}
module.exports={plan};
