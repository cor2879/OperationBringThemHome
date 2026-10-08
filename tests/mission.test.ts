import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { RescueMission, GUN, ROUTE, MACHINEGUN_POSITION } from '../src/model.ts';
const prisoner=(id:number)=>({id,kind:'prisoner' as const,...ROUTE[2],hp:1,speed:43,waypoint:2,fireTimer:0,alive:true,step:0});
const machinegun=()=>({id:99,kind:'machinegun' as const,...MACHINEGUN_POSITION,hp:3,speed:35,waypoint:0,fireTimer:0,alive:true,step:0,phase:'setup' as const,phaseTimer:1.5});
const advance=(m:RescueMission,seconds:number)=>{for(let i=0;i<Math.round(seconds/.05);i++)m.update(.05);};
test('machine gun telegraphs setup, sweeps a burst, then leaves a reload window',()=>{
  const m=new RescueMission(()=>.5);m.released=12;m.units=[machinegun()];
  advance(m,1);assert.equal(m.bullets.length,0);assert.equal(m.units[0].phase,'setup');
  advance(m,.6);assert.equal(m.units[0].phase,'burst');assert.ok(m.bullets.some(b=>b.side==='enemy'));
  const aim={...m.units[0].aimPoint!};advance(m,.5);assert.ok(m.units[0].aimPoint!.x>aim.x);
  advance(m,2);assert.equal(m.units[0].phase,'reload');assert.equal(m.units[0].aimPoint,undefined);
  m.bullets=[];m.drainEvents();advance(m,3);
  assert.equal(m.units[0].phase,'reload');assert.equal(m.bullets.filter(b=>b.side==='enemy').length,0);
  assert.equal(m.drainEvents().filter(e=>e.kind==='enemyburst').length,0);
  advance(m,2.5);assert.equal(m.units[0].phase,'setup');
});
test('machine gun deployments are delayed and never overlap',()=>{
  const m=new RescueMission(()=>.5);m.released=12;
  advance(m,11);assert.equal(m.units.filter(u=>u.kind==='machinegun').length,0);
  advance(m,2);assert.equal(m.units.filter(u=>u.kind==='machinegun').length,1);
  advance(m,30);assert.equal(m.units.filter(u=>u.kind==='machinegun').length,1);
});
test('destroying a machine gun interrupts its burst',()=>{
  const m=new RescueMission(()=>.5);m.released=12;
  m.units=[{...machinegun(),hp:1,phase:'burst',phaseTimer:1,fireTimer:.2}];
  m.bullets=[{x:175,y:320,vx:0,vy:-400,side:'player',life:1}];m.update(.05);
  assert.equal(m.kills,1);assert.equal(m.units.length,0);advance(m,1);
  assert.equal(m.drainEvents().filter(e=>e.kind==='enemyburst').length,0);
});
test('cover has a reaction delay and shelters only three escapees',()=>{
  const m=new RescueMission(()=>.5);m.released=12;m.commandCover(true);
  m.units=[prisoner(0)];m.update(.05);assert.equal(m.units[0].shelter,undefined);
  for(let i=0;i<8;i++)m.update(.05);
  m.units=[0,1,2,3].map(prisoner);m.update(.05);
  assert.equal(m.units.filter(u=>u.shelter===0).length,3);assert.equal(m.units[3].waypoint,3);
  const x=m.units[0].x;m.update(.05);assert.equal(m.units[0].x,x);
  m.commandCover(false);m.update(.05);assert.equal(m.units[0].shelter,undefined);assert.equal(m.units[0].waypoint,3);
});
test('shelter protects against enemies but does not excuse friendly fire',()=>{
  for(const side of ['enemy','player'] as const){
    const m=new RescueMission(()=>.5);m.units=[{...prisoner(0),shelter:0}];
    m.bullets=[{x:300,y:248,vx:0,vy:-200,side,life:1}];m.update(.05);
    assert.equal(m.lost,side==='enemy'?0:1);
  }
});
test('raider locks a visible aiming tell before shooting',()=>{
  const m=new RescueMission(()=>.5);m.released=12;
  m.units=[{...prisoner(0),speed:0},{id:1,kind:'raider',x:450,y:238,hp:2,speed:0,waypoint:0,fireTimer:.72,alive:true,step:0}];
  m.update(.05);assert.deepEqual(m.units[1].aimPoint,{x:300,y:238});assert.equal(m.bullets.length,0);
  for(let i=0;i<14;i++)m.update(.05);
  assert.equal(m.units[1].aimPoint,undefined);assert.ok(m.bullets.some(b=>b.side==='enemy'));
});
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
  assert.equal(m.drainEvents().find(e=>e.kind==='loss')?.shooter,'player');
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

test('enemy-caused prisoner losses retain the shooter for casualty dialogue',()=>{
  const m=new RescueMission(()=>.5);
  m.units=[{id:0,kind:'prisoner',x:480,y:480,hp:1,speed:0,waypoint:1,fireTimer:0,alive:true,step:0}];
  m.bullets=[{x:480,y:485,vx:0,vy:-200,side:'enemy',life:1}];m.update(.02);
  assert.equal(m.lost,1);assert.equal(m.drainEvents().find(e=>e.kind==='loss')?.shooter,'enemy');
});
