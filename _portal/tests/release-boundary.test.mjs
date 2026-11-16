import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import vm from 'node:vm';
import config from '../../portal-config.js';
const read=rel=>fs.readFile(new URL('../../'+rel,import.meta.url),'utf8');
test('production portal is disabled, empty and has no private preview imports',async()=>{
 assert.deepEqual(config,{enabled:false,supabaseUrl:'',publishableKey:'',aliasDomain:''});
 const site={};vm.runInNewContext(await read('site-config.js'),site);assert.equal(site.LCSiteConfig.portalEnabled,false);
 const html=await read('portal.html'),main=await read('portal-main.js');assert.match(html,/noindex, nofollow/);assert.ok(!/private-preview|test\.parent|Testkonto|preview-actor/.test(html+main));
 for(const src of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(src[1].startsWith('#'))continue;await fs.access(new URL('../../'+src[1],import.meta.url));}
});
test('same desktop/mobile navigation link is hidden unless explicitly enabled',async()=>{
 const html=await read('index.html'),script=await read('portal-link.js');assert.match(html,/<a[^>]+href="portal.html"[^>]+data-portal-link[^>]+hidden/);
 for(const enabled of [undefined,false,true]){const anchor={hidden:true};vm.runInNewContext(script,{LCSiteConfig:{portalEnabled:enabled},document:{querySelector:()=>anchor}});assert.equal(anchor.hidden,enabled!==true);}
});
test('vendored Supabase bytes match the reviewed pinned artifact',async()=>{
 const bytes=await fs.readFile(new URL('../../assets/portal/supabase-2.119.0.js',import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce');
});
