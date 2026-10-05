import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { RescueMission, GUN, ROUTE } from '../src/model.ts';
test('prisoners reach extraction and eight rescues end the mission',()=>{
  const m=new RescueMission(()=>.5,'rookie');m.rescued=7;m.released=12;
  m.units=[{id:0,kind:'prisoner',...ROUTE.at(-1)!,hp:1,speed:43,waypoint:5,fireTimer:0,alive:true,step:0}];
  m.update(.02);assert.equal(m.rescued,8);assert.equal(m.state,'won');
});
test('friendly fire costs a prisoner; five losses fail the operation',()=>{
  const m=new RescueMission(()=>.5);m.lost=4;
  m.units=[{id:0,kind:'prisoner',x:480,y:480,hp:1,speed:0,waypoint:1,fireTimer:0,alive:true,step:0}];
  m.bullets=[{x:480,y:485,vx:0,vy:-200,side:'player',life:1}];m.update(.02);
  assert.equal(m.lost,5);assert.equal(m.state,'lost');
});
test('reload blocks firing and restores the clip after its timer',()=>{
  const m=new RescueMission(()=>.5);m.ammo=2;m.reload();m.fire();assert.equal(m.ammo,2);assert.equal(m.bullets.length,0);
  for(let i=0;i<34;i++)m.update(.05);assert.equal(m.ammo,24);m.fire();assert.equal(m.ammo,23);
});
test('sapper overruns gun and defeats the player at zero health',()=>{
  const m=new RescueMission(()=>.5);m.health=20;
  m.units=[{id:0,kind:'sapper',...GUN,hp:2,speed:40,waypoint:0,fireTimer:0,alive:true,step:0}];m.update(.02);
  assert.equal(m.health,0);assert.equal(m.state,'lost');
});
test('simulation freezes after a result and caps large frame deltas',()=>{
  const m=new RescueMission(()=>.5);m.update(10);assert.equal(m.time,.05);m.state='won';m.update(.05);assert.equal(m.time,.05);
});
test('fast bullets hit targets between frames instead of passing through',()=>{
  const m=new RescueMission(()=>.5);
  m.units=[{id:0,kind:'sapper',x:480,y:480,hp:1,speed:0,waypoint:0,fireTimer:0,alive:true,step:0}];
  m.bullets=[{x:480,y:500,vx:0,vy:-780,side:'player',life:1}];m.update(.05);assert.equal(m.kills,1);
});
test('cover blocks bullets crossing an entire wall in one frame',()=>{
  const m=new RescueMission(()=>.5);
  m.bullets=[{x:260,y:220,vx:0,vy:-780,side:'player',life:1}];m.update(.05);assert.equal(m.bullets.length,0);
});
