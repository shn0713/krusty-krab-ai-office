import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {RestaurantPhysics,LANDMARKS,SEATS,WORLD} from '../public/physics.mjs';
const require=createRequire(import.meta.url);
const Matter=require('../public/vendor/matter.js');
function setup(){const p=new RestaurantPhysics(Matter);p.addActor('claude','claude',LANDMARKS.cashier);p.addActor('dragon','dragon',[31,37.6]);p.addActor('whale','whale',[52.8,34],{radius:11,stationary:true});return p;}
function navigate(p,id,to){
  const path=p.findPath(id,to);
  for(let n=1;n<path.length;n++){
    const from=path[n-1],target=path[n];const length=Math.hypot((target[0]-from[0])*16,(target[1]-from[1])*9);const steps=Math.max(1,Math.ceil(length/4));
    for(let i=1;i<=steps;i++){const point=[from[0]+(target[0]-from[0])*i/steps,from[1]+(target[1]-from[1])*i/steps];const actual=p.advance(id,point);assert.ok(actual,`${id} collision while walking to ${to} at ${point}`);assert.equal(p.overlaps(id).length,0,`${id} penetrated a solid fixture`);}
  }
  return path;
}
test('actual Matter.js world contains table, barrel, boat, wall and door collision bodies with zero gravity',()=>{
  const p=setup();assert.equal(Matter.version,'0.20.0');assert.equal(p.engine.gravity.scale,0);
  for(const name of ['table-tl','table-tr','table-bl','table-br','tl-left','tr-right','bl-left','br-right','boat','office-door-leaf','wall-rear-middle','front-left'])assert.ok(p.fixtures.has(name));
  assert.equal(p.doors.get('kitchen').open,false);assert.ok(p.doors.get('office').open);
});
test('high-speed movement cannot cross a tabletop, register, front wall, or another character',()=>{
  const p=setup();p.addActor('guest','guest',[50.4,96],{radius:15});
  for(const target of [[25.2,50.4],[73.8,67.7],[52.4,45],[5,90],[70,35]])assert.equal(p.advance('claude',target,2000),null);
  const before={...p.actors.get('guest').body.position};assert.equal(p.advance('guest',LANDMARKS.cashier,2000),null);assert.deepEqual(p.actors.get('guest').body.position,before);
});
for(const seat of SEATS)test(`complete order, seating and side delivery avoid all solids: ${seat.id}`,()=>{
  const p=setup();p.addActor('guest','guest',[50.4,96],{radius:15});
  navigate(p,'guest',LANDMARKS.order);navigate(p,'guest',seat.approach);p.reserveSeat('guest',seat.id);navigate(p,'guest',seat.point);
  const seated=p.actors.get('guest').body.position;assert.ok(Math.hypot(seated.x-seat.point[0]*16,seated.y-seat.point[1]*9)<1);
  navigate(p,'claude',LANDMARKS.hatch);navigate(p,'claude',seat.serve);navigate(p,'claude',LANDMARKS.cashier);
  navigate(p,'guest',seat.approach);p.releaseSeat('guest');navigate(p,'guest',LANDMARKS.outside);p.removeActor('guest');assert.equal(p.actors.has('guest'),false);
});
test('boss enters and exits through the office door and goes around the desk, then returns',()=>{
  const p=setup();let crossedOfficeDoor=false;const route=navigate(p,'dragon',LANDMARKS.entrance);
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];if((a[1]<41.3&&b[1]>=41.3)||(b[1]<41.3&&a[1]>=41.3)){const t=(41.3-a[1])/(b[1]-a[1]),x=a[0]+(b[0]-a[0])*t;assert.ok(x>26.1&&x<37.8);crossedOfficeDoor=true;}}
  assert.ok(crossedOfficeDoor);navigate(p,'dragon',[31,37.6]);
});
test('kitchen door opens before a staff member crosses, closes after exit; residents cannot enter private rooms',()=>{
  const p=setup();navigate(p,'claude',[64.75,36]);assert.equal(p.doors.get('kitchen').open,true);navigate(p,'claude',LANDMARKS.aisle);p.updateDoors();assert.equal(p.doors.get('kitchen').open,false);
  p.addActor('guest','guest',[50.4,96],{radius:15});assert.equal(p.allowed({x:31*16,y:37.6*9},'guest',15),false);assert.equal(p.advance('guest',[31,37.6]),null);
});
test('cleaning and the full four-table tour use traversable segments',()=>{
  const p=setup();for(const point of [[50,65],[55,64],LANDMARKS.cashier,SEATS[0].serve,SEATS[2].serve,SEATS[3].serve,SEATS[1].serve,LANDMARKS.cashier])navigate(p,'claude',point);
});
