import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {RescueMission,ROUTE,type Unit} from '../src/model.ts';
const prey=():Unit=>({id:99,kind:'prisoner',...ROUTE[2],hp:1,speed:0,waypoint:2,fireTimer:0,alive:true,step:0});
const dog=():Unit=>({id:100,kind:'dog',x:260,y:238,hp:1,speed:72,waypoint:2,fireTimer:0,alive:true,step:0,preyId:99});
const advance=(m:RescueMission,t:number)=>{for(let i=0;i<Math.round(t/.05);i++)m.update(.05);};
test('dogs start after the first two crossings and give a two-second warning',()=>{
  const m=new RescueMission(()=>.5);m.released=2;m.units=[prey()];m.update(.05);
  assert.equal(m.dogInbound,false);m.released=3;m.update(.05);
  assert.equal(m.dogInbound,true);assert.ok(m.drainEvents().some(e=>e.kind==='dogwarning'));
  advance(m,1.9);assert.equal(m.units.some(u=>u.kind==='dog'),false);
  advance(m,.15);assert.equal(m.units.filter(u=>u.kind==='dog').length,1);assert.equal(m.dogInbound,false);
  advance(m,3);assert.equal(m.units.filter(u=>u.kind==='dog').length,1);
});
test('a dog follows route bends rather than cutting across the walls',()=>{
  const m=new RescueMission(()=>.5);m.released=12;m.units=[{...prey(),...ROUTE[3],waypoint:4},{...dog(),...ROUTE[0],waypoint:1}];
  m.update(.05);const hound=m.units.find(u=>u.kind==='dog')!;
  assert.equal(hound.waypoint,1);assert.ok(Math.abs((hound.x-90)/(hound.y-138)-55/82)<.001);
});
test('shelter holds a pursuing dog outside; GO exposes the escapee again',()=>{
  const m=new RescueMission(()=>.5);m.released=12;m.commandCover(true);m.units=[{...prey(),shelter:0},dog()];
  advance(m,2);assert.equal(m.lost,0);assert.equal(m.units.length,2);
  assert.ok(Math.hypot(m.units[1].x-300,m.units[1].y-238)>=32);
  m.commandCover(false);advance(m,1);assert.equal(m.lost,1);
  assert.equal(m.drainEvents().find(e=>e.kind==='loss')?.shooter,'enemy');
});
test('one player hit kills a dog without harming the escapee',()=>{
  const m=new RescueMission(()=>.5);m.released=12;m.units=[prey(),dog()];
  m.bullets=[{x:260,y:258,vx:0,vy:-400,side:'player',life:1}];m.update(.05);
  assert.equal(m.kills,1);assert.equal(m.lost,0);assert.equal(m.units.some(u=>u.kind==='dog'),false);
});
test('dogs and pending warnings leave when their own escapee is gone',()=>{
  const m=new RescueMission(()=>.5);m.released=3;m.units=[prey()];m.update(.05);assert.equal(m.dogInbound,true);
  m.units=[];m.update(.05);assert.equal(m.dogInbound,false);advance(m,.5);assert.equal(m.units.some(u=>u.kind==='dog'),false);
  m.released=12;m.units=[dog(),{...prey(),id:101}];m.update(.05);
  assert.equal(m.units.some(u=>u.kind==='dog'),false);assert.equal(m.lost,0);
});
