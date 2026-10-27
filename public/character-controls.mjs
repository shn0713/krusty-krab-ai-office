import {CHARACTERS,SPECIAL_ACTIONS} from './characters.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class CharacterControls {
  constructor({catalog,manifest,onPose,onSpecial,onChat,onResume,isBusy}){
    Object.assign(this,{catalog,manifest,onPose,onSpecial,onChat,onResume,isBusy});this.role=null;this.category='互动';this.lastCategories={};
    this.menu=document.createElement('section');this.menu.className='character-menu';this.menu.id='characterMenu';this.menu.hidden=true;this.menu.setAttribute('role','menu');this.menu.setAttribute('aria-label','角色动作菜单');document.body.append(this.menu);
    this.profile=document.createElement('dialog');this.profile.className='modal character-profile';this.profile.id='characterProfile';document.body.append(this.profile);
    this.menu.addEventListener('click',event=>this.choose(event));
    document.addEventListener('contextmenu',event=>{const target=event.target.closest('[data-chat]');if(!target||!CHARACTERS[target.dataset.chat])return;event.preventDefault();event.stopPropagation();this.anchor=target;this.open(target.dataset.chat,event.clientX,event.clientY);});
    document.addEventListener('pointerdown',event=>{if(!this.menu.hidden&&!this.menu.contains(event.target))this.close(false);if(event.pointerType!=='touch')return;const target=event.target.closest('[data-chat]');if(!target)return;this.touchTimer=setTimeout(()=>{this.suppressClick=true;this.anchor=target;this.open(target.dataset.chat,event.clientX,event.clientY);},650);});
    for(const name of ['pointerup','pointercancel','pointermove'])document.addEventListener(name,()=>clearTimeout(this.touchTimer));
    document.addEventListener('click',event=>{if(this.suppressClick&&event.target.closest('[data-chat]')){this.suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!this.menu.hidden){event.preventDefault();this.close();}if(event.key==='ContextMenu'||(event.key==='F10'&&event.shiftKey)){const target=document.activeElement?.closest('[data-chat]');if(target){event.preventDefault();this.anchor=target;const r=target.getBoundingClientRect();this.open(target.dataset.chat,r.x+r.width/2,r.y+r.height/2);}}});
    window.addEventListener('resize',()=>this.close(false));
    this.profile.addEventListener('click',event=>{const button=event.target.closest('button');if(button?.dataset.profileClose!==undefined)this.profile.close();if(button?.dataset.profileChat){this.profile.close();this.onChat(button.dataset.profileChat);}});
  }
  open(role,x,y){this.role=role;this.pointerX=x;this.pointerY=y;this.category=this.lastCategories[role]||'互动';this.render();this.menu.hidden=false;this.place();this.menu.querySelector('button')?.focus({preventScroll:true});}
  place(){const margin=10;this.menu.style.left=Math.max(margin,Math.min(this.pointerX,innerWidth-this.menu.offsetWidth-margin))+'px';this.menu.style.top=Math.max(margin,Math.min(this.pointerY,innerHeight-this.menu.offsetHeight-margin))+'px';}
  render(){
    const profile=CHARACTERS[this.role],bank=this.catalog.characters[this.role],actions=bank.actions;
    const categories=['互动',...['日常','工作','表情','问候','节日','更多'].filter(c=>actions.some(a=>a.category===c)),'全部'];
    const items=this.category==='互动'?SPECIAL_ACTIONS[this.role]||[]:actions.filter(a=>this.category==='全部'||a.category===this.category);
    this.menu.innerHTML=`<header class="character-menu-head"><img src="${this.manifest[this.role].idle}" alt=""><div><strong>${profile.name}<span>${profile.title.split(' · ')[0]}</span></strong><small>${escape(profile.motto)}</small><p>${bank.count} 组动作 · 右键随时点播</p></div></header><div class="character-menu-tools"><button data-character-profile>角色名片</button><button data-character-chat>和 TA 聊聊</button><button data-character-resume>恢复自动</button></div><nav class="character-menu-tabs" aria-label="动作分类">${categories.map(c=>`<button data-action-category="${c}" class="${this.category===c?'selected':''}" aria-pressed="${this.category===c}">${c}${c==='全部'?'<small>'+bank.count+'</small>':''}</button>`).join('')}</nav><div class="character-menu-actions">${items.map(action=>{const special=this.category==='互动';const disabled=special&&['scene','command'].includes(action.kind)&&this.isBusy();return `<button role="menuitem" ${special?'data-special-action':'data-pose-action'}="${escape(action.id)}" ${disabled?'disabled title="这一单完成后，可安排离岗与指挥剧情"':''}><span>${special?(action.kind==='command'?'↳':'✧'):'·'}</span>${escape(action.label)}</button>`;}).join('')}</div><footer>${this.isBusy()?'表情可即时展示，订单照常处理。':'不点也会随机出现小动作和可爱台词。'}<span>Esc 收起</span></footer>`;
  }
  choose(event){const button=event.target.closest('button');if(!button||button.disabled)return;if(button.dataset.actionCategory){this.category=button.dataset.actionCategory;this.lastCategories[this.role]=this.category;this.render();this.place();return;}const role=this.role;
    if(button.dataset.characterProfile!==undefined){this.close(false);this.showProfile(role);return;}
    if(button.dataset.characterChat!==undefined){this.close(false);this.onChat(role);return;}
    if(button.dataset.characterResume!==undefined){this.close(false);this.onResume(role);return;}
    if(button.dataset.poseAction){const action=this.catalog.characters[role].actions.find(a=>a.id===button.dataset.poseAction);this.close(false);this.onPose(role,action);return;}
    if(button.dataset.specialAction){const action=SPECIAL_ACTIONS[role].find(a=>a.id===button.dataset.specialAction);this.close(false);this.onSpecial(role,action);}
  }
  close(focus=true){this.menu.hidden=true;if(focus&&this.anchor?.isConnected)this.anchor.focus({preventScroll:true});}
  showProfile(role){const p=CHARACTERS[role];this.profile.innerHTML=`<div class="modal-head"><div><span class="eyebrow">OUR LITTLE TEAM</span><h2>${p.name}${p.english!==p.name?' <small class="profile-english">'+p.english+'</small>':''}</h2></div><button data-profile-close class="icon-button" aria-label="关闭角色名片">×</button></div><div class="profile-body"><div class="profile-portrait"><img src="${this.manifest[role].idle}" alt="${p.name}"><span>${p.species}</span></div><div class="profile-information"><div class="profile-role">${p.title}</div><p>${p.personality}</p><dl><dt>工作</dt><dd>${p.duties}</dd><dt>喜欢</dt><dd>${p.likes}</dd><dt>听谁安排</dt><dd>${p.reportsTo}</dd><dt>${role==='whale'?'认真做的事':'可以指挥'}</dt><dd>${p.manages}</dd></dl><blockquote>“${p.motto}”</blockquote><button class="button primary" data-profile-chat="${role}">和${p.name}聊聊 ↗</button></div></div><div class="profile-chain"><strong>GPT</strong><span>安排工作 →</span><strong>克劳德</strong><span>交代厨房 →</span><strong>大肥鱼</strong></div>`;this.profile.showModal();}
}
