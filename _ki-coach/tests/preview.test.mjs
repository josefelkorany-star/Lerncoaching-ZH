import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {previewServer} from '../preview/server.mjs';
test('Preview serves exact original and limits exposed routes', async () => {
 const server = previewServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin = `http://127.0.0.1:${server.address().port}`;
 try {
  const res = await fetch(origin+'/coach.html');
  assert.equal(res.status,200);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), await fs.readFile(new URL('../original/coach.html',import.meta.url)));
  assert.match(res.headers.get('content-security-policy'),/connect-src 'none'/);
  for (const name of ['/', '/logo.png', '/pruefbericht']) assert.equal((await fetch(origin+name)).status,200,name);
  for (const name of ['/Code.gs','/.clasprc.json','/own-project.json','/original/Code%20(1).gs','/%2e%2e/private']) assert.equal((await fetch(origin+name)).status,404,name);
  assert.equal((await fetch(origin+'/coach.html',{method:'POST',body:'synthetic'})).status,405);
  assert.equal((await fetch(origin+'/coach.html',{method:'HEAD'})).status,200);
  const badHost = await new Promise((resolve,reject)=>{
   const req=http.get(origin+'/coach.html',{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);
  });
  assert.equal(badHost,403);
 } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
