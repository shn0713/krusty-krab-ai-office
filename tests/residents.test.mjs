import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {ResidentRoster,animationCell,atlasPosition,ANIMATION_NAMES} from '../public/residents.mjs';
const catalog=JSON.parse(await fs.readFile(new URL('../public/assets/residents/catalog.json',import.meta.url),'utf8'));

test('resident bank contains at least 30 distinct named characters and complete downloaded original atlases',async()=>{
  assert.ok(catalog.count>=30);assert.equal(catalog.count,catalog.residents.length);
  assert.equal(new Set(catalog.residents.map(x=>x.id)).size,catalog.count);
  assert.equal(new Set(catalog.residents.map(x=>x.sha256)).size,catalog.count);
  for(const r of catalog.residents){
    assert.ok(r.name&&r.source.includes(catalog.commit));
    const bytes=await fs.readFile(new URL('../public/'+r.sprite,import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),r.sha256);
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.deepEqual([r.width,r.height,r.columns,r.rows,r.frameWidth,r.frameHeight],[1536,2288,8,11,192,208]);
  }
});
test('automatic visitors cover the whole bank before repeating and avoid a repeated cycle boundary',()=>{
  const roster=new ResidentRoster(catalog.residents,()=>.381);let previous;
  for(let cycle=0;cycle<3;cycle++){
    const seen=[];for(let i=0;i<catalog.count;i++){const r=roster.next();assert.notEqual(r.id,previous);seen.push(r.id);previous=r.id;}
    assert.equal(new Set(seen).size,catalog.count);
  }
});
test('gallery invitation selects an actual bank member for the next visitor',()=>{
  const roster=new ResidentRoster(catalog.residents);const selected=catalog.residents.at(-1);
  assert.equal(roster.setNext('not-a-real-character'),false);assert.equal(roster.setNext(selected.id),true);assert.equal(roster.next().id,selected.id);
});
test('all played animation frames are populated source cells, including short rows',()=>{
  let foundShortRow=false;
  for(const resident of catalog.residents)for(const state of ANIMATION_NAMES){
    const animation=resident.animations[state];assert.ok(animation.frames.length>0);if(animation.frames.length<8)foundShortRow=true;
    for(let n=0;n<24;n++){const cell=animationCell(resident,state,n*130);assert.equal(cell.row,animation.row);assert.ok(animation.frames.includes(cell.column));assert.ok(cell.column>=0&&cell.column<8);assert.ok(cell.row>=0&&cell.row<9);}
  }
  assert.ok(foundShortRow,'The bank must not blindly play eight cells for rows with blank trailing frames.');
  assert.equal(atlasPosition(0,0),'0% 0%');assert.equal(atlasPosition(7,10),'100% 100%');
});
