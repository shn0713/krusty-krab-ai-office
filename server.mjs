import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {characterSystem} from './public/characters.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public');
const keyFile=process.env.DEEPSEEK_KEY_FILE||path.join(root,'runtime','deepseek-key.txt');
const port=Number(process.env.PORT||4318);
const base='https://api.deepseek.com';
const systems=Object.fromEntries(['claude','whale','dragon'].map(role=>[role,characterSystem(role)]));
let model=process.env.DEEPSEEK_MODEL||null;
let pendingCalls=0;
async function credential(){
  if(process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY.trim();
  try{return (await fs.readFile(keyFile,'utf8')).match(/sk-[A-Za-z0-9_-]{15,}/)?.[0]||null;}catch{return null;}
}
function messageFor(status){return ({400:'任务请求未被接口接受，请换个说法或稍后重试。',401:'密钥未通过验证，请检查原来的密钥文件。',402:'账户余额不足，可以先体验演示一单。',403:'接口暂时拒绝访问，请检查账户状态。',429:'厨房接单太快了，接口限流，请稍后重试。',500:'DeepSeek 暂时遇到问题，请稍后重试。',503:'DeepSeek 暂时繁忙，请稍后重试。'})[status]||'接口暂时无法完成这次请求。';}
async function upstream(endpoint,options={}){
  const key=await credential();
  if(!key) throw Object.assign(new Error('没有找到密钥。请把 DeepSeek 密钥保存在原来指定的文本文件，或设置 DEEPSEEK_API_KEY。'),{status:503});
  let response;
  try{response=await fetch(base+endpoint,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:options.signal||AbortSignal.timeout(150000)});}catch(e){if(e.name==='AbortError')throw e;throw Object.assign(new Error('暂时连不上 DeepSeek，请检查网络后重试。'),{status:502});}
  if(!response.ok)throw Object.assign(new Error(messageFor(response.status)),{status:response.status});
  return response;
}
async function resolveModel(){
  if(model)return model;
  const r=await upstream('/models',{signal:AbortSignal.timeout(20000)});
  const ids=(await r.json()).data?.map(x=>x.id)||[];
  model=['deepseek-flash','deepseek-chat','deepseek-v4-flash','deepseek-v4-pro'].find(x=>ids.includes(x))||ids[0];
  if(!model)throw new Error('账户暂时没有可用模型。');
  return model;
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readBody(req){let value='';for await(const chunk of req){value+=chunk;if(Buffer.byteLength(value)>90000)throw Object.assign(new Error('这份任务太长了，请分成几单。'),{status:413});}try{return JSON.parse(value);}catch{throw Object.assign(new Error('请求格式不正确。'),{status:400});}}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||'';
    if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json(res,403,{error:'仅允许从本机打开。'});
    const url=new URL(req.url,'http://'+host);
    const origin=req.headers.origin;
    if(url.pathname.startsWith('/api/')&&origin&&origin!=='http://'+host)return json(res,403,{error:'请求来源不匹配。'});
    if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{app:'krusty-agent-office-v1',configured:!!await credential(),model:model||'自动选择',provider:'DeepSeek',roles:['claude','whale','dragon']});
    if(url.pathname==='/api/balance'&&req.method==='GET'){
      const r=await upstream('/user/balance',{signal:AbortSignal.timeout(20000)});const d=await r.json();
      return json(res,200,{available:d.is_available,balances:(d.balance_infos||[]).map(x=>({currency:x.currency,total:x.total_balance})),updatedAt:new Date().toISOString()});
    }
    if(url.pathname==='/api/chat'&&req.method==='POST'){
      if(pendingCalls>=4)return json(res,429,{error:'厨房正在忙，请稍后再试。'});
      const body=await readBody(req);
      if(!Object.hasOwn(systems,body.agent)||typeof body.prompt!=='string'||!body.prompt.trim())return json(res,400,{error:'请填写任务，并选择一位员工。'});
      if(body.prompt.length>16000)return json(res,413,{error:'请把任务缩短到 16000 字以内。'});
      const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
      pendingCalls++;
      try{
        const chosen=await resolveModel();
        const history=Array.isArray(body.history)?body.history.slice(-10).filter(x=>['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,16000)})):[];
        const messages=[{role:'system',content:systems[body.agent]},...history,{role:'user',content:body.prompt}];
        const r=await upstream('/chat/completions',{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(150000)]),body:JSON.stringify({model:chosen,messages,max_tokens:body.agent==='claude'&&body.kind==='order'?220:3500,stream:false,thinking:{type:'disabled'}})});
        const d=await r.json();const content=d.choices?.[0]?.message?.content;
        if(typeof content!=='string'||!content.trim())throw new Error('这一单没有收到完整回复，请再试一次。');
        return json(res,200,{content,model:d.model||chosen,usage:d.usage||null,truncated:d.choices?.[0]?.finish_reason==='length'});
      }finally{pendingCalls--;}
    }
    if(url.pathname.startsWith('/api/'))return json(res,404,{error:'未找到这个功能。'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'不支持的操作。'});
    let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{return json(res,400,{error:'地址格式不正确。'});}
    const file=path.resolve(publicRoot,'.'+(decoded==='/'?'/index.html':decoded));
    if(!file.startsWith(publicRoot+path.sep))return json(res,403,{error:'无法访问这个位置。'});
    let data;try{data=await fs.readFile(file);}catch{return json(res,404,{error:'文件未找到。'});}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':url.pathname.includes('/assets/')?'public, max-age=3600':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'self'"});
    res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(e.name==='AbortError'||res.destroyed)return;json(res,e.status||502,{error:e.message||'发生了一点问题，请稍后重试。'});}
});
server.listen(port,'127.0.0.1',()=>console.log('蟹堡王已开门：http://127.0.0.1:'+port));
