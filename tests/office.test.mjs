import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {RestaurantQueue,STAGES} from '../public/workflow.mjs';

test('orders advance in the specified sequence and run one at a time',async()=>{
  const seen=[];const q=new RestaurantQueue({stage:async(stage,task)=>{seen.push([task.prompt,stage]);await new Promise(r=>setTimeout(r,1));if(stage==='cooking')return {result:'result:'+task.prompt};}});
  const a=q.enqueue({prompt:'first'}),b=q.enqueue({prompt:'second'});await q.drain();
  assert.deepEqual(seen,[...STAGES.map(x=>['first',x]),...STAGES.map(x=>['second',x])]);assert.equal(a.result,'result:first');assert.equal(b.status,'completed');
});
test('cancelling a task cannot deliver a late API answer',async()=>{
  let entered;const ready=new Promise(r=>entered=r);let release;const gate=new Promise(r=>release=r);const delivered=[];
  const q=new RestaurantQueue({stage:async(stage,t)=>{if(stage==='cooking'){entered();await gate;return {result:'late response'};}if(stage==='done')delivered.push(t.id);}});
  const a=q.enqueue({prompt:'cancel me'});await ready;q.cancel(a.id);release();await q.drain();assert.equal(a.status,'cancelled');assert.equal(a.result,'');assert.deepEqual(delivered,[]);
});
test('a failed order does not block the next order',async()=>{
  const q=new RestaurantQueue({stage:async(stage,t)=>{if(t.prompt==='fail'&&stage==='cooking')throw new Error('network failed');if(stage==='cooking')return {result:'ok'};}});
  const a=q.enqueue({prompt:'fail'}),b=q.enqueue({prompt:'continue'});await q.drain();assert.equal(a.status,'failed');assert.equal(a.error,'network failed');assert.equal(b.status,'completed');assert.equal(b.result,'ok');
});
test('queued cancellation never creates a resident or calls a role',async()=>{
  let release;const gate=new Promise(r=>release=r);const seen=[];const q=new RestaurantQueue({stage:async(s,t)=>{seen.push(t.prompt);if(t.prompt==='a'&&s==='arrival')await gate;}});q.enqueue({prompt:'a'});const b=q.enqueue({prompt:'b'});q.cancel(b.id);release();await q.drain();assert.equal(b.status,'cancelled');assert.ok(!seen.includes('b'));
});

test('local service protects the credential boundary and reports unavailable API honestly',async t=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'14319',DEEPSEEK_API_KEY:'',DEEPSEEK_KEY_FILE:'nonexistent-test-credential.txt'},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());await once(child.stdout,'data');const base='http://127.0.0.1:14319';
  const status=await(await fetch(base+'/api/status')).json();assert.equal(status.configured,false);assert.deepEqual(status.roles,['claude','whale','dragon']);assert.ok(!JSON.stringify(status).includes('sk-'));
  const balance=await fetch(base+'/api/balance');assert.equal(balance.status,503);const b=await balance.json();assert.equal(b.balances,undefined);assert.ok(b.error);
  const bad=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:'bad',prompt:'test'})});assert.equal(bad.status,400);
  const secret=await fetch(base+'/server.mjs');assert.equal(secret.status,404);
  const cross=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify({agent:'whale',prompt:'test'})});assert.equal(cross.status,403);
  const page=await fetch(base);assert.equal(page.status,200);assert.ok((await page.text()).includes('蟹堡王'));assert.ok(page.headers.get('Content-Security-Policy').includes("connect-src 'self'"));
});
