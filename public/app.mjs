import {RestaurantQueue,STAGES} from './workflow.mjs';
import {ResidentRoster,animationCell,atlasPosition} from './residents.mjs';
import {RestaurantPhysics,LANDMARKS,SEATS} from './physics.mjs';
import {RestaurantWorldView} from './world-view.mjs';
import {CHARACTERS,SPECIAL_ACTIONS,IDLE_FAVORITES,lineFor,pickDifferent,commandFor} from './characters.mjs';
import {CharacterControls} from './character-controls.mjs';
import {performStaffScene,AMBIENT_SCENES,mayPlayAmbient} from './staff-scenes.mjs';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleInfo=CHARACTERS;
const phaseInfo={arrival:['居民进门','客人正从门口走来','↗'],order:['克劳德 接单','正在把需求记在订单上','▤'],seated:['客人入座','客人坐好了，等待开工','♧'],handoff:['转交厨房','克劳德 正通过窗口交代任务','⇄'],cooking:['厨房制作中','大肥鱼正在处理你的任务','♨'],collect:['窗口交餐','结果已完成，克劳德 正在取餐','▱'],serve:['正在送达','克劳德 正端着结果走向客人','↗'],done:['已送到桌边','这份结果，请慢用','✓']};
const settingsKey='krusty-settings-v1',ordersKey='krusty-orders-v1';
function loadJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const settings={speed:1,idleSeconds:60,random:true,...loadJSON(settingsKey,{})};
settings.speed=[1,1.6,2.5].includes(Number(settings.speed))?Number(settings.speed):1;
settings.idleSeconds=[30,60,120].includes(Number(settings.idleSeconds))?Number(settings.idleSeconds):60;
let manifest,actionCatalog,characterControls,residentCatalog,residentRoster,physics,worldView,selectedId=null,tab='current',contextTask=null,configured=false,lastBalance=null,guest=null,seat=null,lastWork=Date.now(),idleWork=null,idleController=null,chatAgent='claude',chatPending=false;
const actors={},speeches={},activity=[],roleStatuses={claude:'读报，等待新订单',whale:'吃白米饭，补充能量',dragon:'在办公室数钱'};
const chats={claude:[],whale:[],dragon:[]};
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify(settings));}catch{toast('浏览器暂时无法保存设置。');}}
function log(text,task){activity.unshift({text,time:Date.now()});activity.splice(10);if(task)task.logs.push({text,time:Date.now()});renderActivity();}
function timeLabel(time){return new Date(time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});}
function renderActivity(){$('#activityFeed').innerHTML=activity.slice(0,5).map(x=>`<div class="activity-item"><span>${html(x.text)}</span><time>${timeLabel(x.time)}</time></div>`).join('');}
function setRole(role,text){roleStatuses[role]=text;renderTeam();}
function renderTeam(){if(!manifest)return;$('#teamRoster').innerHTML=Object.entries(roleInfo).map(([key,r])=>`<button class="team-person" data-chat="${key}" aria-label="和${r.name}聊聊"><span class="team-avatar"><img src="${manifest[key].idle}" alt=""></span><span class="team-copy"><strong>${r.name}<span>${r.title.split(' · ')[0]}</span></strong><small>${html(roleStatuses[key])}</small></span><i class="person-dot"></i><span class="person-arrow">›</span></button>`).join('');}
function sleep(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(signal.reason);const id=setTimeout(done,ms/settings.speed);function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(id);reject(signal.reason);}signal?.addEventListener('abort',abort,{once:true});});}
function position(actor,x,y){actor.x=x;actor.y=y;actor.el.style.left=x+'%';actor.el.style.top=y+'%';actor.el.style.zIndex=Math.round(y*10);actor.el.style.setProperty('--depth',String(actor.role==='whale'||(actor.role==='dragon'&&!actor.el.classList.contains('outside'))?1:.77+y*.0047));worldView?.drawActors();}
function pose(role,name,prop='',preview=false){
  const a=actors[role];if(!a)return;
  if(!preview){clearTimeout(a.previewTimer);a.previewBase=null;a.previewUntil=0;}
  a.poseVersion=(a.poseVersion||0)+1;a.currentPose={name,prop};
  a.el.querySelector('.sprite').src=manifest[role][name]||manifest[role].idle;a.el.dataset.prop=prop;a.el.dataset.action=name;
  a.el.dataset.effect=role==='whale'&&['eat','feast'].includes(name)?'nom':role==='claude'&&['annoyed','puffed','tired','sulk','redhot'].includes(name)?'grumble':name==='hum'?'music':['proud','happy','happy-2'].includes(name)?'proud':['thinking','thinking-2','deepthink'].includes(name)?'think':'';
}
function bubble(actorOrRole,text,ms=3500){const actor=typeof actorOrRole==='string'?actors[actorOrRole]:actorOrRole;if(!actor)return;const key=actor.role||'guest';clearBubble(key);const b=document.createElement('div');b.className='speech'+(key==='dragon'?' boss':'')+(actor.el.dataset.effect==='nom'?' nom':actor.el.dataset.effect==='grumble'?' grumble':'');b.textContent=text;const offset=key==='whale'?11:actor.el.classList.contains('resident')?15:17;b.style.left=actor.x+'%';b.style.top=(actor.y-offset)+'%';$('#stage').append(b);const timer=setTimeout(()=>{b.remove();if(speeches[key]?.el===b)delete speeches[key];},ms/Math.min(settings.speed,1.4));speeches[key]={el:b,timer};}
function clearBubble(key){if(speeches[key]){clearTimeout(speeches[key].timer);speeches[key].el.remove();delete speeches[key];}}
function clearBubbles(){Object.keys(speeches).forEach(clearBubble);}
async function move(actor,points,signal){
  clearBubble(actor.role||'guest');actor.el.classList.add('walking');
  try{for(const destination of points){let arrived=false;for(let retry=0;retry<4&&!arrived;retry++){
    signal?.throwIfAborted();const route=physics.findPath(actor.id,destination);let blocked=false;
    for(const [x,y] of route.slice(1)){
      signal?.throwIfAborted();const startX=actor.x,startY=actor.y;if(actor.resident)actor.direction=x<startX?'left':x>startX?'right':actor.direction||'right';
      const distance=Math.hypot((x-startX)*1.3,y-startY),duration=Math.max(160,distance*70)/settings.speed;
      const ok=await new Promise((resolve,reject)=>{let start,previous,frame;function abort(){cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);reject(signal.reason);}function done(value){signal?.removeEventListener('abort',abort);resolve(value);}function tick(now){if(start===undefined)start=now;const t=Math.min(1,(now-start)/duration),desired=[startX+(x-startX)*t,startY+(y-startY)*t],next=physics.advance(actor.id,desired,previous===undefined?16.67:now-previous);previous=now;if(!next)return done(false);position(actor,...next);if(t<1)frame=requestAnimationFrame(tick);else done(true);}signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();frame=requestAnimationFrame(tick);});
      if(!ok){blocked=true;break;}
    }
    if(!blocked)arrived=true;else await sleep(300,signal);
  }if(!arrived)throw new Error('通道暂时被挡住，请稍后重试。');}}finally{actor.el.classList.remove('walking');physics.updateDoors();}
}
function actorElement(role){const el=document.createElement('button');el.type='button';el.className='actor '+role;el.setAttribute('aria-label','和'+roleInfo[role].name+'聊聊');el.dataset.chat=role;el.innerHTML=`<span class="shadow"></span><span class="body"><img class="sprite" src="${manifest[role].idle}" alt="${roleInfo[role].name}" draggable="false">${role==='dragon'?'':'<img class="employee-hat" src="assets/hat.svg" alt="">'}<img class="held-prop newspaper" src="assets/newspaper.svg" alt=""><img class="held-prop rice" src="assets/rice.svg" alt=""><img class="held-prop tray" src="assets/tray.svg" alt=""><img class="held-prop mop" src="assets/mop.svg" alt=""><img class="held-prop coins" src="assets/coins.svg" alt=""></span>`;el.querySelector('.body').insertAdjacentHTML('beforeend','<img class="held-prop rag" src="assets/rag.svg" alt="">');el.insertAdjacentHTML('beforeend','<span class="action-decor" aria-hidden="true"></span>');$('#actorLayer').append(el);const a={el,role,id:role,x:0,y:0};actors[role]=a;physics.addActor(a.id,role,role==='whale'?[52.8,34]:roleInfo[role].home,{radius:role==='whale'?11:14,stationary:role==='whale'});position(a,...roleInfo[role].home);return a;}
async function makeGuest(){
  const r=residentRoster.next();const image=new Image();image.src=r.sprite;await image.decode();
  const el=document.createElement('div');el.className='actor resident resident-anime';el.dataset.residentId=r.id;el.setAttribute('aria-label',r.name+'，随机进店的Q版居民');
  el.innerHTML='<span class="shadow"></span><span class="body"><span class="resident-sprite" aria-hidden="true"></span><span class="order-ticket">▤</span><img class="table-food" src="assets/tray.svg" alt="已收到餐品"></span><span class="resident-name"></span>';
  el.querySelector('.resident-sprite').style.backgroundImage=`url("${r.sprite}")`;el.querySelector('.resident-name').textContent=r.name;
  const a={el,role:'guest',id:'resident-'+crypto.randomUUID(),name:r.name,resident:r,x:50.4,y:96,state:'idle',direction:'right'};physics.addActor(a.id,'guest',[a.x,a.y],{radius:15});$('#actorLayer').append(el);position(a,a.x,a.y);updateResidentFrame(a);return a;
}
function updateResidentFrame(actor){if(!actor?.resident||!actor.el.isConnected)return;const state=actor.el.classList.contains('walking')?actor.direction:actor.state||'idle';const cell=animationCell(actor.resident,state,performance.now()*settings.speed);const sprite=actor.el.querySelector('.resident-sprite');sprite.style.backgroundPosition=atlasPosition(cell.column,cell.row);sprite.dataset.animation=state;}
let galleryObserver;
function openResidents(){
  $('#residentCount').textContent=residentCatalog.count;const list=$('#residentList');
  if(!list.children.length){
    const families={'genshin-impact':'原神','honkai-star-rail':'崩坏：星穹铁道','honkai-impact-3rd':'崩坏3','zenless-zone-zero':'绝区零'};
    list.innerHTML=residentCatalog.residents.map(r=>`<button class="resident-card" data-resident="${r.id}" aria-label="安排${r.name}下次来访"><span class="resident-card-art"><canvas width="192" height="208" role="img" aria-label="${html(r.name)}的Q版形象"></canvas></span><strong>${html(r.name)}</strong><small>${families[r.family]||'动漫居民'}</small><span class="resident-invite">下次来访 ↗</span></button>`).join('');
    galleryObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;galleryObserver.unobserve(entry.target);const r=residentCatalog.residents.find(r=>r.id===entry.target.dataset.resident);drawResidentPreview(entry.target.querySelector('canvas'),r);}}, {root:$('#residentGalleryScroll'),rootMargin:'200px'});
    for(const card of list.children)galleryObserver.observe(card);
  }
  $('#residentsDialog').showModal();
}
async function drawResidentPreview(canvas,resident){try{const response=await fetch(resident.sprite);if(!response.ok)throw new Error('image missing');const bitmap=await createImageBitmap(await response.blob());canvas.getContext('2d').drawImage(bitmap,resident.previewFrame*192,0,192,208,0,0,192,208);bitmap.close();canvas.dataset.loaded='true';}catch{canvas.closest('.resident-card').classList.add('preview-error');}}
function setIdle(force=false){
  if(!manifest)return;
  for(const [role,info] of Object.entries(roleInfo)){
    const a=actors[role];if(!force&&a.previewUntil>Date.now()&&!engine.active)continue;
    pose(role,info.defaultPose,info.defaultProp);setRole(role,info.idleStatus);
  }
  actors.whale.el.classList.remove('cooking');actors.dragon.el.classList.remove('outside');actors.dragon.el.classList.add('counting');actors.claude.el.classList.remove('cleaning','wiping');$('#steam').classList.remove('on');$('#floorShine').classList.remove('on');$('#handoffFood').classList.remove('on');
}
async function stopIdle(){idleController?.abort();if(idleWork)await idleWork.catch(()=>{});idleController=null;}
async function returnStaff(){const c=actors.claude,d=actors.dragon;if(Math.hypot(c.x-roleInfo.claude.home[0],c.y-roleInfo.claude.home[1])>2){pose('claude','running');await move(c,[LANDMARKS.cashier]);}if(d.el.classList.contains('outside')){pose('dragon','running');await move(d,[roleInfo.dragon.home]);d.el.classList.remove('outside');}setIdle();}
async function requestChat(agent,prompt,signal,{history=[],kind='chat'}={}){const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({agent,prompt,history,kind})});const d=await r.json();if(!r.ok)throw new Error(d.error||'接口没有完成这次请求。');return d;}
const demoPrompt='帮我写一个 20 秒的短视频脚本，主题是三个 AI 在蟹堡王一起开工，轻松有趣。';
function demoResult(prompt){return `## 演示餐品：三个 AI 的开工日常\n\n这是本地预设示例，用来体验进门、接单、制作、交餐和送达。**没有调用 API。**\n\n### 0–5 秒｜叮咚，有客人\n客人推门进来，把一张写着“${prompt.slice(0,80)}${prompt.length>80?'…':''}”的订单交给 克劳德。\n\n克劳德 放下报纸：“收到，这一单我记好了。”\n\n### 5–12 秒｜厨房，开工！\n大肥鱼接过订单，一手翻汉堡，一手整理思路：“稍等，马上就好！”\n\nGPT从账本后抬头：“效率可以，别忘了把结果端稳。”\n\n### 12–20 秒｜结果上桌\n大肥鱼从出餐窗递出餐盘，克劳德 端到客人桌前：“你的结果，请慢用。”\n\n镜头回到厨房，大肥鱼捧起白米饭：“工作做完，开饭！”\n\n**片尾字幕：把想法交给我们，把好结果端给你。**\n\n---\n想完成你自己的任务，请在下方输入内容并点击“下单”。`;}
const engine=new RestaurantQueue({
  change(tasks,active){
    if(!selectedId&&tasks.length)selectedId=tasks[0].id;
    if(active&&tab==='current'&&selectedId!==active.id&&tasks.find(t=>t.id===selectedId)?.status==='queued')selectedId=active.id;
    try{localStorage.setItem(ordersKey,JSON.stringify(tasks.slice(0,60).map(t=>({...t,history:[]}))));}catch{/* The current task still works when local persistence is full. */}
    render();
  },
  async stage(stage,task,signal){
    const claude=actors.claude,whale=actors.whale;
    const [title,desc]=phaseInfo[stage];$('#stageStatus').textContent=title;
    $('#sceneHint').textContent=task.mode==='demo'?'演示一单 · 不调用 API':'正在办理真实任务 · '+(task.prompt.length>30?task.prompt.slice(0,30)+'…':task.prompt);
    if(stage==='arrival'){
      cancelCharacterPreviews();await stopIdle();clearBubbles();setIdle(true);$('#stageStatus').textContent=title;pose('claude','idle');setRole('claude','看见客人了，准备接单');guest=await makeGuest();signal.throwIfAborted();task.resident=guest.name;task.residentId=guest.resident.id;seat=SEATS[Math.floor(Math.random()*SEATS.length)];guest.seatProfile=seat;task.seat=seat.point;
      $('#doorGlow').classList.add('on');log(guest.name+'推门进来了。',task);bubble('claude','欢迎光临！今天想做点什么？',2800);await move(guest,[LANDMARKS.order],signal);$('#doorGlow').classList.remove('on');
    }else if(stage==='order'){
      guest.state='wave';pose('claude','writing');setRole('claude','记录需求，整理任务');bubble(guest,'麻烦帮我办一下这件事。',2800);log(guest.name+'向 克劳德 提交了任务。',task);
      let d;if(task.mode==='demo'){await sleep(2200,signal);d={content:'记录客人的任务，按要求提供可直接使用的完整结果。'};}else d=await requestChat('claude',task.prompt,signal,{kind:'order'});
      bubble('claude','记好了！请先入座。',2400);return {brief:d.content,orderUsage:d.usage};
    }else if(stage==='seated'){
      pose('claude','idle');await move(guest,[seat.approach],signal);physics.reserveSeat(guest.id,seat.id);guest.occupiedSeat=seat.id;guest.el.dataset.side=seat.side;await move(guest,[seat.point],signal);guest.state='wait';guest.el.classList.add('seated');bubble(guest,'好，我在这里等。',2200);log(guest.name+'已经入座，等候结果。',task);await sleep(600,signal);
    }else if(stage==='handoff'){
      pose('whale','listening');pose('claude','delegating');setRole('claude','通过窗口向厨房交代任务');setRole('whale','听 克劳德 交代任务');await move(claude,[LANDMARKS.hatch],signal);bubble('claude','厨房，一份新任务！',2300);await sleep(1100,signal);bubble('whale','收到，马上开工！',2100);log('克劳德 通过出餐窗把需求交给大肥鱼。',task);await sleep(1200,signal);
    }else if(stage==='cooking'){
      pose('whale','busy_right');whale.el.classList.add('cooking');$('#steam').classList.add('on');pose('claude','reading-2','paper');await move(claude,[roleInfo.claude.home],signal);setRole('whale','制作汉堡，也在认真处理任务');setRole('claude','厨房制作中，留意出餐窗口');log('厨房开工，大肥鱼正在生成结果。',task);
      let d;if(task.mode==='demo'){await sleep(4600,signal);d={content:demoResult(task.prompt)};}else d=await requestChat('whale','用户的原始任务：\n'+task.prompt+'\n\n接单员整理的需求（仅供参考，以原始任务为准）：\n'+task.brief,signal,{history:task.history});
      whale.el.classList.remove('cooking');$('#steam').classList.remove('on');pose('whale','happy');bubble('whale','做好啦！克劳德，来取餐！',3200);log('大肥鱼完成了结果，准备窗口交餐。',task);return {result:d.content,usage:d.usage,model:d.model,truncated:d.truncated};
    }else if(stage==='collect'){
      pose('claude','listening');setRole('claude','在出餐窗接过结果');setRole('whale','通过出餐窗递出餐品');await move(claude,[LANDMARKS.hatch],signal);$('#handoffFood').classList.add('on');await sleep(1700,signal);pose('claude','happy','tray');$('#handoffFood').classList.remove('on');bubble('claude','接好了，我来送过去。',2200);log('大肥鱼从窗口把餐品交给了 克劳德。',task);await sleep(900,signal);
    }else if(stage==='serve'){
      pose('claude','idle','tray');setRole('claude','端着结果，绕到客人座位旁');pose('whale','eat','rice');setRole('whale','忙完啦，吃一口白饭');await move(claude,[seat.serve],signal);bubble('claude','你的结果，请慢用！',3300);await sleep(1200,signal);
    }else if(stage==='done'){
      guest.state='wave';guest.el.classList.add('served','eating');pose('claude','happy');bubble(guest,'谢谢，这一单很满意！',3000);log('结果已送到'+guest.name+'的桌边。',task);setRole('claude','已送达，准备回到收银台');await sleep(700,signal);
    }
  },
  async finish(task){
    clearBubbles();$('#steam').classList.remove('on');$('#handoffFood').classList.remove('on');$('#doorGlow').classList.remove('on');actors.whale.el.classList.remove('cooking');
    if(task.status==='failed'){log('这单暂时没能完成：'+task.error,task);toast(task.error);bubble('claude','这单遇到了一点问题，可以重试。',3000);}else if(task.status==='cancelled'){log('这单已取消，员工准备接下一单。',task);}
    pose('claude','running');await move(actors.claude,[LANDMARKS.cashier]);
    if(guest){if(task.status==='completed')await sleep(2000);guest.el.classList.remove('seated','eating');if(guest.occupiedSeat){await move(guest,[guest.seatProfile.approach]);physics.releaseSeat(guest.id);guest.occupiedSeat=null;}await move(guest,[LANDMARKS.outside]);physics.removeActor(guest.id);guest.el.remove();guest=null;}
    setIdle();lastWork=Date.now();$('#stageStatus').textContent='餐厅营业中';$('#sceneHint').textContent='左键聊天 · 右键选择全部动作';if(task.mode!=='demo')refreshBalance(false);
  }
});
function currentTask(){return engine.tasks.find(t=>t.id===selectedId)||engine.active||engine.tasks[0];}
function inlineMarkdown(s){return html(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}
function markdown(text){
  const chunks=String(text).split(/```[^\n]*\n([\s\S]*?)```/g);
  return chunks.map((part,index)=>{if(index%2)return '<pre><code>'+html(part)+'</code></pre>';let list='',out='';const close=()=>{if(list){out+='</'+list+'>';list='';}};for(const line of part.split('\n')){if(/^#{1,6}\s/.test(line)){close();out+='<h3>'+inlineMarkdown(line.replace(/^#{1,6}\s+/,''))+'</h3>';}else if(/^\s*[-*]\s+/.test(line)){if(list!=='ul'){close();list='ul';out+='<ul>';}out+='<li>'+inlineMarkdown(line.replace(/^\s*[-*]\s+/,''))+'</li>';}else if(/^\s*\d+[.)、]\s*/.test(line)){if(list!=='ol'){close();list='ol';out+='<ol>';}out+='<li>'+inlineMarkdown(line.replace(/^\s*\d+[.)、]\s*/,''))+'</li>';}else if(/^\s*---+\s*$/.test(line)){close();out+='<hr>';}else{close();if(line.trim())out+='<p>'+inlineMarkdown(line)+'</p>';}}close();return out;}).join('');
}
function render(){
  const task=currentTask(),active=engine.active;const done=engine.tasks.filter(t=>t.status==='completed').length;
  $('#servedCount').textContent='今日已上菜 '+done+' 单';$('#historyCount').textContent=engine.tasks.length;
  const activeIndex=active?STAGES.indexOf(active.stage):-1;
  const flowSteps=[['arrival','↗','到店'],['order','▤','接单'],['seated','♧','入座'],['cooking','♨','制作'],['collect','▱','交餐'],['done','✓','送达']];
  $('#flow').innerHTML=flowSteps.map(([key,glyph,label],i)=>{const n=STAGES.indexOf(key);let cls=activeIndex===n||(key==='cooking'&&active?.stage==='handoff')||(key==='done'&&active?.stage==='serve')?'active':activeIndex>n?'done':'';return (i?'<span class="step-arrow">›</span>':'')+`<span class="flow-step ${cls}"><i class="step-icon">${cls==='done'?'✓':glyph}</i>${label}</span>`;}).join('');
  if(!task){$('#orderCard').innerHTML=`<div class="mini-label">YOUR NEXT GOOD IDEA <span class="order-mode">随时开工</span></div><div class="empty-plate"><img src="assets/burger.svg" alt=""></div><h3>今天，有什么<br>想交给我们？</h3><p>一个灵感，一份文案，或一个想弄明白的问题。先下单，让伙伴们忙起来。</p><div class="suggestion-row"><button data-example="写一个20秒的短视频脚本，主题是AI在蟹堡王打工，轻松有趣。">短视频脚本 ↗</button><button data-example="帮我的AI餐厅主题短视频想10个有趣的标题。">想个好标题 ↗</button><button data-example="用生活中的例子，解释什么是多智能体协作。">解释一个概念 ↗</button></div>`;
  }else{
    const completed=task.status==='completed',failed=['failed','cancelled','interrupted'].includes(task.status);const p=phaseInfo[task.stage]||['排队中','前面的订单完成后，就轮到你','⋯'];const label=completed?'已送达':task.status==='queued'?'排队中':failed?({failed:'这一单需要重试',cancelled:'订单已取消',interrupted:'订单已中断'})[task.status]:p[0];const elapsed=task.status==='running'?Math.max(0,Math.floor((Date.now()-task.createdAt)/1000))+'秒':timeLabel(task.createdAt);
    $('#orderCard').innerHTML=`<div class="mini-label">ORDER ${String(engine.tasks.length-engine.tasks.indexOf(task)).padStart(3,'0')} <span class="order-mode">${task.mode==='demo'?'演示 · 不调用API':'真实任务'}</span></div><h3>${html(task.prompt)}</h3>${task.brief?'<p>'+html(task.brief)+'</p>':''}<div class="task-state"><span class="state-glyph">${completed?'✓':failed?'!':p[2]}</span><div><strong class="${failed?'failure-state':''}">${label}</strong><small>${elapsed}${task.resident?' · '+html(task.resident):''}</small></div>${['running','queued'].includes(task.status)?'<button class="cancel-link" data-cancel="'+task.id+'">取消</button>':''}</div>${failed?'<p class="order-error">'+html(task.error||'页面关闭时尚未完成，请手动重试。')+'</p><button class="small-button" data-retry="'+task.id+'">重新下单 ↻</button>':!completed?'<div class="live-line"><span style="width:'+Math.max(5,((STAGES.indexOf(task.stage)+1)/STAGES.length*100))+'%"></span></div>':''}`;
  }
  const result=$('#resultCard');if(task?.status==='completed'&&task.result){result.hidden=false;const existing=result.dataset.task;result.dataset.task=task.id;if(existing!==task.id||result.dataset.result!==task.result){result.dataset.result=task.result;result.innerHTML=`<div class="result-head"><strong>✓ ${task.mode==='demo'?'演示餐品已上桌':'你的结果已上桌'}</strong><span>${task.mode==='demo'?'本地示例':task.usage?.total_tokens?task.usage.total_tokens+' tokens':''}</span></div><div class="result-body">${markdown(task.result)}</div>${task.truncated?'<p class="interrupted">回复达到单次长度限制，可以继续追问，让大肥鱼接着写。</p>':''}<div class="result-actions"><button class="small-button" data-copy="${task.id}">复制结果</button><button class="small-button" data-follow="${task.id}">继续追问 ↗</button><button class="small-button" data-export="${task.id}">保存文本</button></div>`;}}else{result.hidden=true;result.dataset.task='';}
  const queued=engine.tasks.filter(t=>t.status==='queued');$('#queueCard').hidden=!queued.length;$('#queueCard').innerHTML=queued.length?`还有 ${queued.length} 单在排队，员工会依次处理。<button data-show-history>查看</button>`:'';
  const states={queued:'排队中',running:'进行中',completed:'已送达',failed:'待重试',cancelled:'已取消',interrupted:'已中断'};
  $('#historyList').innerHTML=engine.tasks.length?engine.tasks.map(t=>`<button class="history-item ${t.id===selectedId?'selected':''}" data-select="${t.id}"><strong>${html(t.prompt.slice(0,95))}${t.prompt.length>95?'…':''}</strong><span><span>${states[t.status]||t.status}${t.mode==='demo'?' · 演示':''}</span><time>${timeLabel(t.createdAt)}</time></span></button>`).join(''):'<div class="history-empty">还没有订单。<br>下一份好结果，从你的第一个想法开始。</div>';
  $('#submitButton').innerHTML=`<img src="assets/burger.svg" alt="">${active?'排队下单':'下单'} <span>↗</span>`;
}
function switchTab(value){tab=value;$$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===value)));$('#currentPanel').hidden=value!=='current';$('#historyPanel').hidden=value!=='history';}
function enqueue(prompt,mode='live',history=[]){if(!prompt.trim())return toast('先写下你想完成的任务。');if(mode==='live'&&!configured)return toast('接口尚未配置好，可以先点“演示一单”体验流程。');if(engine.tasks.filter(t=>['queued','running'].includes(t.status)).length>=6)return toast('先让厨房忙完这几单，最多同时排队六单。');const task=engine.enqueue({prompt:prompt.trim(),mode,history});selectedId=task.id;switchTab('current');render();return task;}
async function refreshBalance(visible=true){try{const r=await fetch('/api/balance');const d=await r.json();if(!r.ok)throw new Error(d.error||'余额暂时未读到');lastBalance=d;const text=d.balances.map(x=>(x.currency==='CNY'?'¥':x.currency==='USD'?'$':x.currency+' ')+Number(x.total).toFixed(2)).join(' / ')||'未提供';$('#balanceValue').textContent=text;$('#officeBalance').textContent=text;$('#balanceButton').title='真实账户余额 · '+new Date(d.updatedAt).toLocaleString('zh-CN');if(visible)toast('已刷新真实账户余额：'+text);return d;}catch(e){$('#balanceValue').textContent='余额暂未读到';$('#officeBalance').textContent='余额待查询';if(visible)toast(e.message);return null;}}
async function checkConnection(){try{const r=await fetch('/api/status');const d=await r.json();configured=!!d.configured;$('#connection').classList.toggle('offline',!configured);$('#connection').innerHTML='<i></i>'+(configured?'DeepSeek 已配置':'DeepSeek 未配置');$('#settingsConnection').textContent=configured?'已找到密钥 · 三位员工共用 DeepSeek':'尚未找到密钥文件';if(configured){const balance=await refreshBalance(false);$('#connection').innerHTML='<i></i>'+(balance?'DeepSeek 已连接':'DeepSeek 待检查');}else{$('#balanceValue').textContent='未连接';$('#officeBalance').textContent='未连接';}}catch{$('#connection').classList.add('offline');$('#connection').innerHTML='<i></i>本地服务未连接';$('#settingsConnection').textContent='本地服务尚未连接';toast('请使用“启动餐厅”打开页面。');}}
let lastSceneKind=null,nextAmbientAt=Date.now()+5500,lastPoseIds={},lastSpoken={},manualSceneVersion=0;
function tableSpark(shape){
  document.querySelectorAll('.table-clean-spark').forEach(el=>el.remove());if(!shape)return;
  const sparkle=document.createElement('div');sparkle.className='table-clean-spark';sparkle.textContent='✧　✦';sparkle.style.left=(shape.x-3)+'%';sparkle.style.top=(shape.y-2)+'%';$('#stage').append(sparkle);
}
async function idleScenario(kind){
  if(engine.active||idleWork)return toast('先把这一单端给客人，再安排离岗的小剧情。');
  idleController=new AbortController();const signal=idleController.signal;lastWork=Date.now();lastSceneKind=kind;
  const operation=(async()=>{try{
    await performStaffScene(kind,{actors,pose,bubble,clearBubble,move,setRole,log,signal,wait:(ms,sig)=>sleep(ms*settings.speed,sig),setStage:text=>$('#stageStatus').textContent=text,steam:on=>$('#steam').classList.toggle('on',on),floorSpark:on=>$('#floorShine').classList.toggle('on',on),tableSpark});
  }catch(error){if(!signal.aborted)log('伙伴先回到岗位：'+error.message);}finally{
    clearBubbles();tableSpark(null);$('#steam').classList.remove('on');$('#floorShine').classList.remove('on');actors.claude.el.classList.remove('wiping','cleaning');actors.whale.el.classList.remove('cooking');await returnStaff();$('#stageStatus').textContent='餐厅营业中';lastWork=Date.now();
  }})();
  idleWork=operation;try{await operation;}finally{idleWork=null;idleController=null;}
}
function restoreCharacterPreview(role){
  const a=actors[role];if(!a)return;const base=a.previewBase;clearTimeout(a.previewTimer);a.previewBase=null;a.previewUntil=0;
  if(base){pose(role,base.pose.name,base.pose.prop);setRole(role,base.status);}else if(!engine.active&&!idleWork){const p=roleInfo[role];pose(role,p.defaultPose,p.defaultProp);setRole(role,p.idleStatus);}
}
function cancelCharacterPreviews(){for(const role of Object.keys(roleInfo))restoreCharacterPreview(role);}
function playCharacterPose(role,action,{manual=true,spoken}={}){
  if(!action||!actors[role])return;const a=actors[role],name=action.pose||action.id;
  const base=a.previewBase||{pose:a.currentPose||{name:roleInfo[role].defaultPose,prop:roleInfo[role].defaultProp},status:roleStatuses[role]};clearTimeout(a.previewTimer);
  a.previewBase=base;a.previewUntil=Date.now()+(manual?8200:5600);pose(role,name,action.prop||'',true);const version=a.poseVersion;
  setRole(role,action.label||'做个可爱的小动作');const text=spoken||lineFor(role,name,{previous:lastSpoken[role]});lastSpoken[role]=text;lastPoseIds[role]=name;bubble(role,text,manual?7600:6500);
  a.previewTimer=setTimeout(()=>{if(a.poseVersion!==version)return;restoreCharacterPreview(role);},manual?8200:5600);
}
async function playCharacterSpecial(role,action){
  if(!action)return;
  if(action.kind==='pose'){const native=actionCatalog.characters[role].actions.find(a=>a.id===action.pose)||{id:action.pose};return playCharacterPose(role,{...native,...action});}
  if(action.kind==='command'&&!commandFor(role,action.id))return toast('这位伙伴没有这项指挥安排。');
  if(engine.active)return toast('这一单完成后，就可以安排离岗和指挥剧情啦。');
  const version=++manualSceneVersion;await stopIdle();if(version!==manualSceneVersion||engine.active)return;cancelCharacterPreviews();idleScenario(action.scene||action.id);
}
function randomIdle(){
  const now=Date.now();if(!settings.random||!actionCatalog||now<nextAmbientAt)return;nextAmbientAt=now+5200+Math.random()*3800;
  const roles=Object.keys(roleInfo).filter(role=>mayPlayAmbient(role,{stage:engine.active?.stage,walking:actors[role].el.classList.contains('walking'),scene:!!idleWork,previewUntil:actors[role].previewUntil,now}));if(!roles.length)return;
  const role=roles[Math.floor(Math.random()*roles.length)],bank=actionCatalog.characters[role].actions;
  const favorites=IDLE_FAVORITES[role].map(id=>bank.find(a=>a.id===id)).filter(Boolean);
  const pool=engine.active&&role==='claude'?bank.filter(a=>['annoyed','puffed','tired','reading-2'].includes(a.id)):Math.random()<.8?favorites:bank;
  const ids=pool.map(a=>a.id),id=pickDifferent(ids,lastPoseIds[role]),action=pool.find(a=>a.id===id);playCharacterPose(role,action,{manual:false});
}
function openChat(role){chatAgent=role;const r=roleInfo[role];let summary=$('#chatDialog .staff-chat-summary');if(!summary){summary=document.createElement('div');summary.className='staff-chat-summary';$('#chatDialog .modal-head').after(summary);}summary.textContent=r.personality+' 听谁安排：'+r.reportsTo+'。';$('#chatName').textContent=r.name;$('#chatRole').textContent=r.title+' · DeepSeek';$('#chatAvatar').src=manifest[role].idle;if(!chats[role].length)chats[role].push({role:'assistant',content:r.greeting});renderChat();$('#chatDialog').showModal();$('#chatInput').focus();}
function renderChat(){$('#chatMessages').innerHTML=chats[chatAgent].map(x=>'<div class="chat-bubble '+(x.role==='user'?'user':'')+(x.error?' error':'')+'">'+html(x.content)+'</div>').join('')+(chatPending?'<div class="chat-bubble pulse-dots">正在想怎么回答</div>':'');$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;$('#chatForm button').disabled=chatPending;}
async function init(){
  manifest=await(await fetch('assets/manifest.json',{cache:'no-cache'})).json();
  actionCatalog=await(await fetch('assets/character-actions.json',{cache:'no-cache'})).json();
  const residentResponse=await fetch('assets/residents/catalog.json',{cache:'no-cache'});if(!residentResponse.ok)throw new Error('居民素材未找到');residentCatalog=await residentResponse.json();residentRoster=new ResidentRoster(residentCatalog.residents);
  $('#residentButtonCount').textContent=residentCatalog.count;
  $('#chatAvatar').src=manifest.claude.idle;
  physics=new RestaurantPhysics(globalThis.Matter);worldView=new RestaurantWorldView($('#stage'),physics);
  Object.keys(roleInfo).forEach(actorElement);setIdle();
  characterControls=new CharacterControls({catalog:actionCatalog,manifest,onPose:playCharacterPose,onSpecial:playCharacterSpecial,onChat:openChat,onResume:restoreCharacterPreview,isBusy:()=>!!engine.active});
  const navigationSettings=document.createElement('div');navigationSettings.className='navigation-settings';navigationSettings.innerHTML='<div class="setting-row"><div><strong>自动绕行保护 · 已开启</strong><small>桌椅、门扇、墙体和小船均有碰撞边界。<br>可显示边界和路线，检查角色怎样通行。</small></div><label class="switch"><input id="navigationToggle" type="checkbox"><span></span><span class="sr-only">显示碰撞边界和路线</span></label></div><button id="navigationTour" class="button secondary">看看自动绕桌</button>';$('#settingsDialog .modal-body').append(navigationSettings);
  $('#navigationToggle').checked=!!settings.showNavigation;worldView.setEnabled(!!settings.showNavigation);$('#navigationToggle').addEventListener('change',e=>{settings.showNavigation=e.target.checked;worldView.setEnabled(settings.showNavigation);saveSettings();});$('#navigationTour').addEventListener('click',()=>{$('#settingsDialog').close();idleScenario('route');});
  const old=loadJSON(ordersKey,[]);if(Array.isArray(old))engine.tasks=old.slice(0,60).filter(t=>t&&typeof t.prompt==='string'&&typeof t.id==='string').map(t=>({...t,logs:Array.isArray(t.logs)?t.logs:[],status:['running','queued'].includes(t.status)?'interrupted':t.status}));
  render();renderTeam();log('餐厅开门了，三位伙伴已就位。');
  $('#speedSelect').value=settings.speed;$('#idleSelect').value=settings.idleSeconds;$('#idleToggle').checked=settings.random;
  $('#speedSelect').addEventListener('change',e=>{settings.speed=Number(e.target.value);saveSettings();});$('#idleSelect').addEventListener('change',e=>{settings.idleSeconds=Number(e.target.value);saveSettings();});$('#idleToggle').addEventListener('change',e=>{settings.random=e.target.checked;saveSettings();lastWork=Date.now();});
  $('#taskForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#taskInput');const t=enqueue(input.value,'live',contextTask?[{role:'user',content:contextTask.prompt},{role:'assistant',content:contextTask.result}]:[]);if(t){input.value='';input.style.height='auto';contextTask=null;$('#contextPill').hidden=true;}});
  $('#taskInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#taskForm').requestSubmit();}});$('#taskInput').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(150,e.target.scrollHeight)+'px';});
  $('#demoButton').addEventListener('click',()=>enqueue($('#taskInput').value.trim()||demoPrompt,'demo'));$('#settingsButton').addEventListener('click',()=>$('#settingsDialog').showModal());$('#aboutButton').addEventListener('click',()=>$('#aboutDialog').showModal());$('#balanceButton').addEventListener('click',()=>refreshBalance(true));$('#refreshConnection').addEventListener('click',async()=>{await checkConnection();toast('连接状态已更新。');});
  $('#residentsButton').addEventListener('click',openResidents);
  $('#patrolDemo').addEventListener('click',()=>{$('#settingsDialog').close();idleScenario('patrol');});$('#cleanDemo').addEventListener('click',()=>{$('#settingsDialog').close();idleScenario('clean');});
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('#contextPill button').addEventListener('click',()=>{contextTask=null;$('#contextPill').hidden=true;});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.resident){if(residentRoster.setNext(b.dataset.resident)){const r=residentCatalog.residents.find(r=>r.id===b.dataset.resident);$('#residentsDialog').close();toast('已安排'+r.name+'下次来访，输入任务或点演示即可迎客。');}return;}
    if(b.dataset.chat)return openChat(b.dataset.chat);
    if(b.dataset.tab)return switchTab(b.dataset.tab);
    if(b.dataset.example){$('#taskInput').value=b.dataset.example;$('#taskInput').focus();return;}
    if(b.hasAttribute('data-show-history'))return switchTab('history');
    if(b.dataset.select){selectedId=b.dataset.select;switchTab('current');render();return;}
    if(b.dataset.cancel){engine.cancel(b.dataset.cancel);return;}
    if(b.dataset.retry){const t=engine.tasks.find(t=>t.id===b.dataset.retry);if(t)enqueue(t.prompt,t.mode,t.history);return;}
    if(b.dataset.copy){const t=engine.tasks.find(t=>t.id===b.dataset.copy);try{await navigator.clipboard.writeText(t.result);toast('结果已复制。');}catch{toast('浏览器不允许自动复制，请选择结果文字复制。');}return;}
    if(b.dataset.follow){const t=engine.tasks.find(t=>t.id===b.dataset.follow);contextTask=t;$('#contextPill span').textContent='继续追问：'+t.prompt.slice(0,25);$('#contextPill').hidden=false;$('#taskInput').focus();return;}
    if(b.dataset.export){const t=engine.tasks.find(t=>t.id===b.dataset.export);const blob=new Blob(['任务：'+t.prompt+'\n\n'+t.result],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='蟹堡王_任务结果_'+new Date().toISOString().slice(0,10)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);return;}
  });
  $('#chatForm').addEventListener('submit',async e=>{e.preventDefault();if(chatPending)return;const input=$('#chatInput'),prompt=input.value.trim();if(!prompt)return;if(!configured)return toast('接口未连接，先体验“演示一单”吧。');const role=chatAgent;const history=chats[role].filter(x=>!x.error).map(({role,content})=>({role,content}));chats[role].push({role:'user',content:prompt});input.value='';chatPending=true;renderChat();try{let extra='';if(role==='dragon'&&lastBalance)extra='\n\n系统当前真实账户余额：'+JSON.stringify(lastBalance.balances);const d=await requestChat(role,prompt+extra,undefined,{history});chats[role].push({role:'assistant',content:d.content});refreshBalance(false);}catch(error){chats[role].push({role:'assistant',content:error.message,error:true});}finally{chatPending=false;renderChat();}});
  setInterval(()=>{if(engine.active)render();if(settings.random&&!engine.active&&!idleWork&&Date.now()-lastWork>settings.idleSeconds*1000)idleScenario(pickDifferent(AMBIENT_SCENES,lastSceneKind));},1000);
  setInterval(randomIdle,1000);
  setInterval(()=>updateResidentFrame(guest),115);
  await checkConnection();
  document.documentElement.dataset.ready='true';
}
init().catch(e=>{console.error('餐厅加载失败',e);toast('餐厅素材暂时没有加载好，请刷新页面。');});
