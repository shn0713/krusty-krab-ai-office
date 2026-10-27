export const ANIMATION_NAMES=['idle','right','left','wave','jump','failed','wait','work','review'];

export class ResidentRoster {
  constructor(residents,random=Math.random){
    if(!Array.isArray(residents)||residents.length<30)throw new Error('居民素材尚未准备完整，需要至少30位不同角色。');
    if(new Set(residents.map(r=>r.id)).size!==residents.length)throw new Error('居民名单存在重复角色。');
    this.residents=residents;this.random=random;this.bag=[];this.lastId=null;this.requestedId=null;
  }
  setNext(id){if(!this.residents.some(r=>r.id===id))return false;this.requestedId=id;return true;}
  refill(){this.bag=[...this.residents];for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag.at(-1)?.id===this.lastId)[this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];}
  next(){
    if(!this.bag.length)this.refill();
    let resident;
    if(this.requestedId){resident=this.residents.find(r=>r.id===this.requestedId);this.bag=this.bag.filter(r=>r.id!==this.requestedId);this.requestedId=null;}
    else resident=this.bag.pop();
    this.lastId=resident.id;return resident;
  }
}

export function animationCell(resident,state,timestamp,frameMs=130){
  const animation=resident.animations[state]||resident.animations.idle;
  return {row:animation.row,column:animation.frames[Math.floor(timestamp/frameMs)%animation.frames.length]};
}
export function atlasPosition(column,row,columns=8,rows=11){return `${column/(columns-1)*100}% ${row/(rows-1)*100}%`;}
