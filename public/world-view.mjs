import {FIXTURES,WORLD} from './physics.mjs';
const NS='http://www.w3.org/2000/svg';
const svgElement=(name,attrs={})=>{const el=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};

export class RestaurantWorldView {
  constructor(stage,physics){
    this.stage=stage;this.physics=physics;this.enabled=false;this.routes=new Map();
    const definition=svgElement('svg',{width:0,height:0,'aria-hidden':'true'});definition.classList.add('world-definitions');const defs=svgElement('defs');definition.append(defs);stage.append(definition);
    for(const fixture of FIXTURES){if(!fixture.visual)continue;const id='fixture-'+fixture.id;const clip=svgElement('clipPath',{id,clipPathUnits:'objectBoundingBox'}),group=svgElement('g',{transform:'scale(0.01)'});
      for(const shape of fixture.visual){let el;if(shape.kind==='ellipse')el=svgElement('ellipse',{cx:shape.x,cy:shape.y,rx:shape.rx,ry:shape.ry});else if(shape.kind==='rect')el=svgElement('rect',{x:shape.x-shape.w/2,y:shape.y-shape.h/2,width:shape.w,height:shape.h});else if(shape.kind==='polygon')el=svgElement('polygon',{points:shape.points.map(p=>p.join(',')).join(' ')});else el=svgElement('path',{d:shape.d});group.append(el);}
      clip.append(group);defs.append(clip);const cover=document.createElement('div');cover.className='scenery fixture-cover';cover.dataset.fixture=fixture.id;cover.setAttribute('aria-hidden','true');cover.style.clipPath=`url(#${id})`;cover.style.zIndex=Math.round(fixture.depth*10);stage.append(cover);
    }
    const rearClip=svgElement('clipPath',{id:'rear-wall-clip',clipPathUnits:'objectBoundingBox'});rearClip.append(svgElement('path',{d:'M .182 .198 H .83 V .416 H .182 Z M .266 .409 V .265 Q .266 .23 .315 .226 Q .372 .226 .372 .265 V .409 Z M .481 .244 H .575 V .356 H .481 Z M .623 .416 V .272 Q .623 .251 .647 .249 Q .672 .251 .672 .272 V .416 Z','clip-rule':'evenodd','fill-rule':'evenodd'}));defs.append(rearClip);const rearWall=document.createElement('div');rearWall.className='scenery fixture-cover rear-wall-cover';rearWall.style.clipPath='url(#rear-wall-clip)';rearWall.style.zIndex='420';rearWall.setAttribute('aria-hidden','true');stage.append(rearWall);
    const kitchen=document.createElement('div');kitchen.className='kitchen-physical-door';kitchen.dataset.door='kitchen';kitchen.dataset.open='false';kitchen.setAttribute('aria-label','厨房门，自动通行');kitchen.innerHTML='<span class="door-opening"></span><span class="door-leaf"></span>';stage.append(kitchen);this.kitchen=kitchen;
    const office=document.createElement('div');office.className='office-threshold';office.dataset.door='office';office.dataset.open='true';office.setAttribute('aria-label','老板办公室门，已打开');stage.append(office);
    this.overlay=svgElement('svg',{viewBox:`0 0 ${WORLD.width} ${WORLD.height}`,'aria-hidden':'true'});this.overlay.classList.add('navigation-overlay');stage.append(this.overlay);
    this.outlines=svgElement('g',{'class':'collision-outlines'});this.routeLayer=svgElement('g',{'class':'walking-routes'});this.actorLayer=svgElement('g',{'class':'foot-bodies'});this.overlay.append(this.outlines,this.routeLayer,this.actorLayer);
    physics.onDoor=door=>{if(door.id==='kitchen')kitchen.dataset.open=String(door.open);this.drawOutlines();};
    physics.onRoute=(id,points)=>{this.routes.set(id,points);this.drawRoutes();};
  }
  setEnabled(enabled){this.enabled=!!enabled;this.stage.classList.toggle('show-navigation',this.enabled);if(this.enabled){this.drawOutlines();this.drawRoutes();this.drawActors();}}
  drawOutlines(){if(!this.enabled)return;this.outlines.replaceChildren();for(const shape of this.physics.outline()){const polygon=svgElement('polygon',{points:shape.vertices.map(([x,y])=>`${x*16},${y*9}`).join(' '),'data-obstacle':shape.id});this.outlines.append(polygon);}}
  drawRoutes(){if(!this.enabled)return;this.routeLayer.replaceChildren();for(const [id,points] of this.routes){if(!this.physics.actors.has(id)){this.routes.delete(id);continue;}this.routeLayer.append(svgElement('polyline',{points:points.map(([x,y])=>`${x*16},${y*9}`).join(' '),'data-route':id}));}}
  drawActors(){if(!this.enabled)return;this.actorLayer.replaceChildren();for(const actor of this.physics.actors.values())this.actorLayer.append(svgElement('circle',{cx:actor.body.position.x,cy:actor.body.position.y,r:actor.radius,'data-foot':actor.id}));}
}
