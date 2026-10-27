// Image-aligned, zero-gravity floor world. Sprites stand on small foot bodies;
// their heads are rendered above the floor and do not define collision bounds.
export const WORLD={width:1600,height:900,cell:10};
export const LANDMARKS={cashier:[46.2,44.5],hatch:[47.4,44.5],order:[51.1,53],aisle:[44,53],officeExit:[36.5,44.2],entrance:[50.5,78],outside:[50.5,97]};
export const SEATS=[
  {id:'tl-right',side:'right',point:[31.7,53.5],approach:[36.5,56.5],serve:[36.7,53.5]},
  {id:'tr-left',side:'left',point:[71.7,56.8],approach:[67,60],serve:[66.8,56.8]},
  {id:'bl-right',side:'right',point:[36.6,73.1],approach:[41.5,73],serve:[42.2,70.8]},
  {id:'br-left',side:'left',point:[67.6,72.3],approach:[62.6,74],serve:[62.5,71.4]}
];
const rect=(x,y,w,h)=>({kind:'rect',x,y,w,h});
const ellipse=(x,y,rx,ry)=>({kind:'ellipse',x,y,rx,ry});
const polygon=points=>({kind:'polygon',points});
const pct=([x,y])=>({x:x*16,y:y*9});
const point=p=>[p.x/16,p.y/9];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hall=[[18,41.1],[82,41.1],[98,73.8],[60,80.3],[40,80.3],[2,73.8]];
const entry=[[43,76],[58,76],[58,100],[43,100]];
const office=[[26.1,30],[37.8,30],[37.8,43.3],[26.1,43.3]];
const kitchen=[[47.5,27],[68.2,27],[68.2,43.3],[47.5,43.3]];
const inPolygon=(p,vertices)=>{let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const barrelVisual=(x,top,rx,bottom)=>({kind:'path',d:`M ${x-rx} ${top+.8} Q ${x} ${top-1.3} ${x+rx} ${top+.8} L ${x+rx*.95} ${bottom-1} Q ${x} ${bottom+1} ${x-rx*.95} ${bottom-1} Z`});

export const FIXTURES=[
  {id:'table-tl',label:'左后餐桌',shape:ellipse(25.2,50.4,5.5,3.0),depth:53,visual:[ellipse(25.2,46.5,6.1,4.0),rect(25.2,50.3,.6,4.5),ellipse(25.2,52.4,1.2,.7)]},
  {id:'table-tr',label:'右后餐桌',shape:ellipse(76.5,52.3,5.8,3.2),depth:56,visual:[ellipse(76.5,48.3,6.2,4.4),rect(76.5,52.8,.7,4.5),ellipse(76.5,55,1.5,.8)]},
  {id:'table-bl',label:'左前餐桌',shape:ellipse(29.5,67.4,6.4,3.3),depth:73.7,visual:[ellipse(29.5,64.3,7.7,4.7),rect(29.5,70,.8,6.8),ellipse(29.5,73,1.8,.9)]},
  {id:'table-br',label:'右前餐桌',shape:ellipse(73.8,67.7,6.5,3.3),depth:74.1,visual:[ellipse(73.8,64.2,7.7,4.7),rect(73.8,70.2,.8,6.8),ellipse(73.8,73.2,1.8,.9)]},
  {id:'tl-left',label:'左后桌左座',shape:ellipse(20.7,53.5,1.9,2.5),depth:56,visual:[barrelVisual(20.7,49.4,1.9,55.6)]},
  {id:'tl-right',label:'左后桌右座',shape:ellipse(31.7,53.5,1.9,2.5),depth:56,visual:[barrelVisual(31.7,49.7,1.9,55.7)]},
  {id:'tl-rear',label:'左后桌后座',shape:ellipse(29.3,46.7,1.6,1.9),depth:48.3,visual:[barrelVisual(29.3,44.1,1.5,48.3)]},
  {id:'tr-left',label:'右后桌左座',shape:ellipse(71.7,56.8,2,2.5),depth:59.2,visual:[barrelVisual(71.7,52.4,2,59)]},
  {id:'tr-right',label:'右后桌右座',shape:ellipse(82.1,57,2,2.5),depth:59.6,visual:[barrelVisual(82.1,52.6,2,59.5)]},
  {id:'tr-rear',label:'右后桌后座',shape:ellipse(79.6,47.4,1.6,1.9),depth:49.6,visual:[barrelVisual(79.6,44.4,1.7,49.6)]},
  {id:'bl-left',label:'左前桌左座',shape:ellipse(23.5,72,2.4,3.0),depth:75,visual:[barrelVisual(23.5,67.7,2.3,74.9)]},
  {id:'bl-right',label:'左前桌右座',shape:ellipse(36.6,73.1,2.4,3.0),depth:76.1,visual:[barrelVisual(36.6,68.5,2.4,76)]},
  {id:'bl-rear',label:'左前桌后座',shape:ellipse(34.4,61.9,2,2.3),depth:64.3,visual:[barrelVisual(34.4,58,2,64.3)]},
  {id:'br-left',label:'右前桌左座',shape:ellipse(67.6,72.3,2.4,3.0),depth:75.5,visual:[barrelVisual(67.6,68.1,2.4,75.5)]},
  {id:'br-right',label:'右前桌右座',shape:ellipse(79.3,72.8,2.4,3.0),depth:76.3,visual:[barrelVisual(79.3,68.4,2.4,76.2)]},
  {id:'br-rear',label:'右前桌后座',shape:ellipse(79.6,61.5,1.9,2.2),depth:64,visual:[barrelVisual(79.6,58,1.9,64)]},
  {id:'boat',label:'船形收银台',shape:polygon([[49,39.4],[56.2,39.4],[55.8,46.4],[52.4,50.2],[49,46.4]]),depth:50.3,visual:[polygon([[48.9,38.3],[56.1,38.3],[56.3,42.5],[55.1,47.2],[52.5,50.2],[50.2,47.1],[48.9,42]])]},
  {id:'office-desk',label:'老板办公桌',shape:rect(30.7,40.25,8.1,1.2)},
  {id:'office-door-leaf',label:'办公室打开的门扇',shape:polygon([[22.6,40.8],[26.1,38.3],[26.7,39.1],[23.1,42.2]])},
  {id:'decor-back-left',label:'左后储物桶',shape:ellipse(18.3,39.6,1.8,2.5),depth:40.6,visual:[barrelVisual(18.3,32.5,1.8,40.5)]},
  {id:'decor-back-right',label:'右后储物桶',shape:ellipse(83.4,42.5,1.8,2.4),depth:43,visual:[barrelVisual(83.4,35,1.8,43)]},
  {id:'decor-back-right-small',label:'右后小桶',shape:ellipse(84.2,44.1,1.5,1.8),depth:44.4,visual:[barrelVisual(84.2,39.7,1.5,44.4)]},
  {id:'decor-left',label:'左侧储物桶',shape:ellipse(7.3,66.3,2.3,2.8),depth:68.3,visual:[barrelVisual(7.3,61.1,2.3,68.3)]},
  {id:'decor-left-front',label:'左前储物桶',shape:ellipse(4.7,71.8,2.4,2.7),depth:73.7,visual:[barrelVisual(4.7,67.5,2.4,73.7)]},
  {id:'decor-right',label:'右侧储物桶',shape:ellipse(89.8,63.5,2.2,3.0),depth:65.4,visual:[barrelVisual(89.8,58.3,2.2,65.4)]},
  {id:'decor-right-front',label:'右前储物桶',shape:ellipse(89.1,66.5,2,2.7),depth:68.5,visual:[barrelVisual(89.1,62.3,2,68.5)]}
];
const WALLS=[
  {id:'wall-rear-left',label:'办公室左侧墙',shape:rect(21.6,41.3,9,1.3)},
  {id:'wall-rear-middle',label:'办公室与厨房前墙（窗口不可通行）',shape:rect(49.65,41.3,23.7,1.3)},
  {id:'wall-rear-right',label:'厨房右侧墙',shape:rect(75.45,41.3,14.9,1.3)},
  {id:'office-divider',label:'办公室隔墙',shape:rect(38.3,35.2,1,10.9)},
  {id:'front-left',label:'正门左侧墙',shape:polygon([[0,72.7],[41.2,78.8],[41.2,91],[0,84]])},
  {id:'front-right',label:'正门右侧墙',shape:polygon([[60.1,78.8],[100,72.7],[100,84],[60.1,91]])},
  {id:'entrance-leaf-left',label:'正门左门扇',shape:polygon([[41.5,83.7],[47.5,94.6],[48,94.2],[42.1,83.3]])},
  {id:'entrance-leaf-right',label:'正门右门扇',shape:polygon([[58.6,83.7],[53.6,94.6],[53,94.2],[58,83.3]])}
];
export const DOORS=[
  {id:'office',name:'老板办公室',center:[32,41.3],shape:rect(32,41.3,11.8,1.3),open:true,stayOpen:true,roles:['dragon','claude']},
  {id:'kitchen',name:'厨房',center:[64.75,41.3],shape:rect(64.75,41.3,6.5,1.3),open:false,roles:['whale','claude','dragon']}
];

class MinHeap {
  constructor(){this.a=[];}
  push(value){let i=this.a.length;this.a.push(value);while(i>0){const p=(i-1)>>1;if(this.a[p].f<=value.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=value;}
  pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(true){let j=i*2+1;if(j>=this.a.length)break;if(j+1<this.a.length&&this.a[j+1].f<this.a[j].f)j++;if(this.a[j].f>=last.f)break;this.a[i]=this.a[j];i=j;}this.a[i]=last;}return first;}
  get length(){return this.a.length;}
}

export class RestaurantPhysics {
  constructor(Matter){
    if(!Matter?.Query)throw new Error('行走保护尚未加载，请刷新页面。');
    this.M=Matter;this.engine=Matter.Engine.create({gravity:{x:0,y:0,scale:0}});this.engine.gravity.scale=0;
    this.fixtures=new Map();this.actors=new Map();this.doors=new Map();this.probes=new Map();this.onDoor=()=>{};this.onRoute=()=>{};
    for(const fixture of [...FIXTURES,...WALLS]){const body=this.makeBody(fixture);this.fixtures.set(fixture.id,{...fixture,body});Matter.Composite.add(this.engine.world,body);}
    for(const definition of DOORS){const door={...definition,roles:[...definition.roles],body:this.makeBody({...definition,label:definition.name})};this.doors.set(door.id,door);if(!door.open)Matter.Composite.add(this.engine.world,door.body);}
  }
  makeBody(fixture){
    const seatIndex=SEATS.findIndex(seat=>seat.id===fixture.id);
    const M=this.M,s=fixture.shape,options={isStatic:true,label:fixture.label||fixture.name||fixture.id,friction:0,restitution:0,slop:.01,collisionFilter:{category:seatIndex<0?2:1<<(seatIndex+2),mask:0xFFFFFFFF}};let body;
    if(s.kind==='rect')body=M.Bodies.rectangle(s.x*16,s.y*9,s.w*16,s.h*9,options);
    else if(s.kind==='ellipse'){body=M.Bodies.circle(s.x*16,s.y*9,1,options,28);M.Body.scale(body,s.rx*16,s.ry*9);}
    else{const vertices=s.points.map(pct);const center=M.Vertices.centre(vertices);body=M.Bodies.fromVertices(center.x,center.y,[vertices],options);}
    body.plugin={fixtureId:fixture.id};return body;
  }
  allowed(point,role,radius=0){
    const areas=[hall,entry];if(role==='dragon'||role==='claude')areas.push(office);if(role==='whale'||role==='claude'||role==='dragon')areas.push(kitchen);
    const sample=p=>areas.some(poly=>inPolygon([p.x/16,p.y/9],poly));if(!sample(point))return false;
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])if(!sample({x:point.x+Math.cos(angle)*radius,y:point.y+Math.sin(angle)*radius}))return false;
    return true;
  }
  context(id,{planning=false,dynamic=true}={}){
    const actor=this.actors.get(id);if(!actor)throw new Error('角色尚未就位。');
    const bodies=[...this.fixtures.values()].filter(x=>x.id!==actor.seat).map(x=>x.body);
    for(const door of this.doors.values())if(!door.open&&!(planning&&door.roles.includes(actor.role)))bodies.push(door.body);
    if(dynamic)for(const other of this.actors.values())if(other.id!==id)bodies.push(other.body);
    return {actor,bodies,planning};
  }
  probe(radius){if(!this.probes.has(radius))this.probes.set(radius,this.M.Bodies.circle(0,0,radius,{isSensor:true},24));return this.probes.get(radius);}
  free(point,context){
    const {actor,bodies}=context;if(!this.allowed(point,actor.role,actor.radius+(context.planning?3:.5)))return false;
    const body=this.probe(actor.radius+(context.planning?2.5:.65));this.M.Body.setPosition(body,point);
    return this.M.Query.collides(body,bodies).every(c=>c.depth<.05);
  }
  segmentFree(from,to,context){
    const length=distance(from,to),steps=Math.max(1,Math.ceil(length/Math.min(3,context.actor.radius/3)));
    for(let i=0;i<=steps;i++){const t=i/steps;if(!this.free({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},context))return false;}return true;
  }
  addActor(id,role,at,{radius=14,stationary=false}={}){
    const pos=pct(at),body=this.M.Bodies.circle(pos.x,pos.y,radius,{label:id,isStatic:stationary,inertia:Infinity,friction:0,frictionAir:1,restitution:0,slop:.01},24);
    const actor={id,role,radius,body,seat:null};this.actors.set(id,actor);
    if(!this.free(pos,this.context(id))){this.actors.delete(id);throw new Error('角色站位与家具重叠：'+id);}
    this.M.Composite.add(this.engine.world,body);return actor;
  }
  removeActor(id){const actor=this.actors.get(id);if(actor){this.M.Composite.remove(this.engine.world,actor.body);this.actors.delete(id);}}
  reserveSeat(id,seatId){if(!SEATS.some(s=>s.id===seatId))throw new Error('没有这个座位。');if([...this.actors.values()].some(a=>a.id!==id&&a.seat===seatId))throw new Error('这个座位已经有人啦。');const actor=this.actors.get(id);actor.seat=seatId;actor.body.collisionFilter.mask=0xFFFFFFFF&~this.fixtures.get(seatId).body.collisionFilter.category;}
  releaseSeat(id){const actor=this.actors.get(id);if(actor){actor.seat=null;actor.body.collisionFilter.mask=0xFFFFFFFF;}}
  setDoor(id,open){const door=this.doors.get(id);if(!door||door.open===open)return;door.open=open;if(open)this.M.Composite.remove(this.engine.world,door.body);else this.M.Composite.add(this.engine.world,door.body);this.onDoor(door);}
  prepareDoors(id,from,to){const actor=this.actors.get(id);for(const door of this.doors.values())if(door.roles.includes(actor.role)&&Math.min(distance(from,pct(door.center)),distance(to,pct(door.center)))<85)this.setDoor(door.id,true);}
  updateDoors(){for(const door of this.doors.values()){if(door.stayOpen||!door.open)continue;const near=[...this.actors.values()].some(a=>distance(a.body.position,pct(door.center))<110);if(!near)this.setDoor(door.id,false);}}
  closest(point,context,maxRadius=65){
    if(this.free(point,context))return point;let best=null,bestDistance=Infinity;
    for(let dx=-maxRadius;dx<=maxRadius;dx+=5)for(let dy=-maxRadius;dy<=maxRadius;dy+=5){const d=Math.hypot(dx,dy);if(d>maxRadius||d>=bestDistance)continue;const p={x:point.x+dx,y:point.y+dy};if(this.free(p,context)){best=p;bestDistance=d;}}
    if(!best)throw new Error('这里没有足够的通行空间。');return best;
  }
  findPath(id,destination){
    const context=this.context(id,{planning:true}),from={...context.actor.body.position},goal=this.closest(pct(destination),context);
    if(!this.free(from,context))throw new Error('当前位置被挡住了，请稍后再试。');
    if(this.segmentFree(from,goal,context)){const points=[point(from),point(goal)];this.onRoute(id,points);return points;}
    const step=WORLD.cell,columns=WORLD.width/step,rows=WORLD.height/step;
    const index=p=>Math.round(p.y/step)*columns+Math.round(p.x/step);
    const at=n=>({x:(n%columns)*step,y:Math.floor(n/columns)*step});
    const passCache=new Map();const pass=n=>{if(n<0||n>=columns*rows)return false;if(!passCache.has(n))passCache.set(n,this.free(at(n),context));return passCache.get(n);};
    const anchor=p=>{let result=null,score=Infinity;const center=index(p);for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const n=center+y*columns+x;if(!pass(n))continue;const target=at(n),d=distance(p,target);if(d<score&&this.segmentFree(p,target,context)){result=n;score=d;}}if(result===null)throw new Error('通道有些拥挤，请稍后再试。');return result;};
    const start=anchor(from),end=anchor(goal),heap=new MinHeap(),cost=new Map([[start,0]]),parents=new Map(),closed=new Set();heap.push({n:start,f:distance(at(start),at(end))});
    let found=false;
    while(heap.length){const item=heap.pop(),n=item.n;if(closed.has(n))continue;if(n===end){found=true;break;}closed.add(n);const p=at(n),col=n%columns,row=Math.floor(n/columns);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=col+dx,ny=row+dy;if(nx<0||nx>=columns||ny<0||ny>=rows)continue;const next=ny*columns+nx;if(closed.has(next)||!pass(next))continue;if(dx&&dy&&(!pass(row*columns+nx)||!pass(ny*columns+col)))continue;
        const q=at(next);if(!this.segmentFree(p,q,context))continue;const g=cost.get(n)+distance(p,q);if(g>=(cost.get(next)??Infinity))continue;parents.set(next,n);cost.set(next,g);heap.push({n:next,f:g+distance(q,at(end))});}
    }
    if(!found)throw new Error('通道被挡住了，请先让前面的伙伴通过。');
    const cells=[];for(let n=end;;n=parents.get(n)){cells.push(at(n));if(n===start)break;}cells.reverse();
    const raw=[from,...cells,goal],smooth=[from];let current=0;
    while(current<raw.length-1){let next=raw.length-1;while(next>current+1&&!this.segmentFree(raw[current],raw[next],context))next--;smooth.push(raw[next]);current=next;}
    const result=smooth.map(point);this.onRoute(id,result);return result;
  }
  advance(id,to,delta=1000/60){
    const actor=this.actors.get(id),from={...actor.body.position},target=pct(to);this.prepareDoors(id,from,target);
    if(!this.segmentFree(from,target,this.context(id)))return null;
    this.M.Body.setPosition(actor.body,target);this.M.Body.setVelocity(actor.body,{x:0,y:0});this.M.Body.setAngularVelocity(actor.body,0);this.M.Engine.update(this.engine,Math.max(1,Math.min(delta,1000/60)));
    return point(actor.body.position);
  }
  overlaps(id){const context=this.context(id);return this.M.Query.collides(context.actor.body,context.bodies).filter(c=>c.depth>.1);}
  outline(){return [...this.fixtures.values(),...[...this.doors.values()].filter(d=>!d.open)].map(f=>({id:f.id,label:f.label||f.name,vertices:f.body.vertices.map(point)}));}
}
