import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
const root=await realpath(path.resolve(process.argv[2]));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method))throw Error('Read only');
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.includes('\\')||pathname.includes(':')||pathname.split('/').some(p=>p.startsWith('.')))throw Error('Invalid path');
    const file=await realpath(path.resolve(root,'.'+(pathname==='/'?'/vorschau.html':pathname)));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||!(await stat(file)).isFile())throw Error('Outside preview');
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch(_){res.writeHead(404);res.end('Not found');}
});
server.listen(4176,'127.0.0.1',()=>console.log('Private matched preview: http://127.0.0.1:4176/vorschau.html'));
