import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CHARACTERS,COMMANDS,SPECIAL_ACTIONS,canCommand,commandFor,lineFor,characterSystem} from '../public/characters.mjs';
import {performStaffScene,mayPlayAmbient} from '../public/staff-scenes.mjs';
import {LANDMARKS,SEATS} from '../public/physics.mjs';
const catalog=JSON.parse(await fs.readFile(new URL('../public/assets/character-actions.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await fs.readFile(new URL('../public/assets/manifest.json',import.meta.url),'utf8'));

test('all 180 actual source actions are available, with correct names and no fake idle fallback entries',async()=>{
  assert.equal(CHARACTERS.dragon.name,'GPT');assert.equal(CHARACTERS.claude.name,'克劳德');assert.equal(CHARACTERS.whale.name,'大肥鱼');
  let count=0;for(const [role,character] of Object.entries(catalog.characters)){
    assert.equal(character.name,CHARACTERS[role].name);assert.equal(character.count,character.actions.length);assert.equal(new Set(character.actions.map(a=>a.id)).size,character.count);assert.ok(character.count>=50);
    for(const action of character.actions){assert.equal(action.src,manifest[role][action.id]);assert.ok(action.src.endsWith('/'+action.id+'.webp'));const file=await fs.readFile(new URL('../public/'+action.src,import.meta.url));assert.ok(file.length>100);}
    count+=character.count;
  }assert.equal(count,180);
});
test('directives follow GPT → 克劳德 → 大肥鱼 and cannot be sent in reverse or across roles',()=>{
  assert.ok(canCommand('dragon','claude'));assert.ok(canCommand('claude','whale'));for(const pair of [['whale','claude'],['whale','dragon'],['claude','dragon'],['dragon','whale']])assert.equal(canCommand(...pair),false);
  for(const cmd of COMMANDS){assert.ok(commandFor(cmd.commander,cmd.id));assert.equal(commandFor(cmd.recipient,cmd.id),null);}
  assert.equal(commandFor('whale','gpt-wipe'),null);assert.equal(commandFor('dragon','constructor'),null);
});
test('ambient actions never replace a chef cooking or an employee walking; cashier may grumble while waiting',()=>{
  assert.equal(mayPlayAmbient('whale',{stage:'cooking'}),false);assert.equal(mayPlayAmbient('claude',{stage:'serve'}),false);assert.equal(mayPlayAmbient('claude',{stage:'cooking'}),true);assert.equal(mayPlayAmbient('dragon',{stage:'cooking'}),true);
  assert.equal(mayPlayAmbient('claude',{walking:true}),false);assert.equal(mayPlayAmbient('whale',{scene:true}),false);assert.equal(mayPlayAmbient('dragon',{previewUntil:20,now:10}),false);
});
test('rice line and staff system identities preserve the requested personalities and actual provider',()=>{
  assert.equal(lineFor('whale','eat',{random:()=>0}),'阿姆阿姆真好吃~');assert.notEqual(lineFor('whale','eat',{previous:'阿姆阿姆真好吃~',random:()=>0}),'阿姆阿姆真好吃~');
  for(const role of Object.keys(CHARACTERS)){const prompt=characterSystem(role);assert.ok(prompt.includes(CHARACTERS[role].name));assert.ok(prompt.includes('DeepSeek'));assert.ok(SPECIAL_ACTIONS[role].length>=4);}
});
function sceneContext(){const calls=[],actors={};for(const role of Object.keys(CHARACTERS))actors[role]={role,el:{classList:{add(){},remove(){}}}};return {calls,actors,signal:new AbortController().signal,pose:(...args)=>calls.push(['pose',...args]),bubble:(...args)=>calls.push(['say',...args]),clearBubble(){},move:async(actor,points)=>calls.push(['move',actor.role,points]),setRole(){},log:(text)=>calls.push(['log',text]),wait:async()=>{},setStage(){},steam(){},floorSpark(){},tableSpark(){}};}
test('GPT table-cleaning directive visits all four safe service positions and returns the cashier',async()=>{
  const c=sceneContext();await performStaffScene('wipe',c);const moves=c.calls.filter(x=>x[0]==='move');assert.ok(c.calls.find(x=>x[0]==='say'&&x[1]==='dragon'&&x[2].includes('擦一擦')));assert.deepEqual(moves.map(x=>x[2][0]),[SEATS[0].serve,SEATS[2].serve,SEATS[3].serve,SEATS[1].serve,LANDMARKS.cashier]);assert.ok(moves.every(x=>x[1]==='claude'));
});
test('cashier directs chef first and the chef acknowledges before kitchen practice begins',async()=>{
  const c=sceneContext();await performStaffScene('practice',c);const says=c.calls.filter(x=>x[0]==='say');assert.equal(says[0][1],'claude');assert.equal(says[1][1],'whale');assert.ok(says[1][2].includes('收到'));assert.ok(c.calls.some(x=>x[0]==='pose'&&x[1]==='whale'&&x[2]==='busy_right'));
});
test('an interrupted directive stops before the subordinate starts walking',async()=>{
  const c=sceneContext();c.wait=async()=>{throw new DOMException('cancelled','AbortError');};await assert.rejects(performStaffScene('wipe',c),{name:'AbortError'});assert.equal(c.calls.filter(x=>x[0]==='move').length,0);
});
