import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BreakoutMission,BREAKOUT_DURATION,FINAL_PURSUIT_TIME,PURSUIT_ARMOR} from '../src/breakout.ts';
import {GUN,type Unit} from '../src/model.ts';
const advance=(m:BreakoutMission,s:number)=>{for(let i=0;i<Math.ceil(s/.05);i++)m.update(.05);};
const vehicle=(kind:Unit['kind'],x=390,y=300):Unit=>({id:99,kind,x,y,hp:kind==='pursuit'?PURSUIT_ARMOR:kind==='jeep'?3:kind==='friendlytruck'?2:1,speed:0,waypoint:x,fireTimer:0,alive:true,step:0,phase:'advance',phaseTimer:0});
test('pursuit begins with weaving motorcycles and then an armed jeep',()=>{const m=new BreakoutMission(()=>.5);advance(m,4.1);const bike=m.units.find(u=>u.kind==='motorcycle');assert.ok(bike);const x=bike.x;advance(m,.5);assert.notEqual(bike.x,x);m.units=[];advance(m,15.1);assert.ok(m.units.some(u=>u.kind==='jeep'));});
test('friendly vehicles exit safely and count once',()=>{const m=new BreakoutMission();const u=vehicle('friendlytruck',160,460);u.waypoint=260;u.speed=57;m.units=[u];advance(m,.15);assert.equal(m.rescued,1);assert.equal(m.units.length,0);advance(m,.1);assert.equal(m.rescued,1);});
test('friendly fire costs a truck after two swept hits and retains attribution',()=>{const m=new BreakoutMission(),u=vehicle('friendlytruck');m.units=[u];for(let i=0;i<2;i++){m.bullets=[{x:390,y:340,vx:0,vy:-780,side:'player',life:1}];m.update(.05);}assert.equal(m.lost,1);assert.equal(m.drainEvents().find(e=>e.kind==='trafficloss')?.shooter,'player');});
test('enemy bullets hit friendly traffic but do not harm other pursuers',()=>{const m=new BreakoutMission(),u=vehicle('friendlytruck');u.hp=1;m.units=[u];m.bullets=[{x:390,y:275,vx:0,vy:600,side:'enemy',life:1}];m.update(.05);assert.equal(m.lost,1);assert.equal(m.drainEvents().find(e=>e.kind==='trafficloss')?.shooter,'enemy');const n=new BreakoutMission(),j=vehicle('jeep');n.units=[j];n.bullets=[{x:390,y:275,vx:0,vy:600,side:'enemy',life:1}];n.update(.05);assert.equal(j.hp,3);});
test('armor requires eighteen hits and destroying it interrupts its burst',()=>{const m=new BreakoutMission(),u=vehicle('pursuit');u.phase='burst';u.phaseTimer=1.8;u.fireTimer=2;m.units=[u];for(let i=0;i<PURSUIT_ARMOR;i++){m.bullets=[{x:390,y:350,vx:0,vy:-780,side:'player',life:1}];m.update(.05);if(i<PURSUIT_ARMOR-1)assert.equal(u.hp,PURSUIT_ARMOR-1-i);}assert.equal(m.kills,1);assert.equal(m.units.length,0);advance(m,.3);assert.equal(m.bullets.length,0);});
test('pursuers telegraph their shots then burst and reload',()=>{const m=new BreakoutMission(),u=vehicle('jeep');m.units=[u];m.update(.05);assert.equal(u.phase,'setup');assert.deepEqual(u.aimPoint,GUN);advance(m,1);assert.equal(u.phase,'burst');assert.ok(m.bullets.length);advance(m,1);assert.equal(u.phase,'reload');assert.equal(u.aimPoint,undefined);});
test('final chase reuses existing armor instead of overlapping and must be cleared',()=>{const m=new BreakoutMission(),u=vehicle('pursuit');m.units=[u];m.time=FINAL_PURSUIT_TIME-.025;m.update(.05);assert.equal(m.finalStarted,true);assert.equal(m.units.filter(p=>p.kind==='pursuit').length,1);u.hp=1;m.bullets=[{x:390,y:350,vx:0,vy:-780,side:'player',life:1}];m.update(.05);assert.equal(m.finalCleared,true);assert.equal(m.drainEvents().filter(e=>e.kind==='pursuitclear').length,1);m.time=BREAKOUT_DURATION-.025;m.update(.05);assert.equal(m.state,'won');});
test('uncleared final pursuit, zero health or three lost trucks prevent victory',()=>{for(const cause of ['armor','health','traffic']){const m=new BreakoutMission();m.time=BREAKOUT_DURATION;m.finalStarted=true;m.finalCleared=cause!=='armor';if(cause==='health')m.health=0;if(cause==='traffic')m.lost=3;m.update(.05);assert.equal(m.state,'lost',cause);}});
test('empty ammunition reloads, large frame deltas are capped, and results freeze',()=>{const m=new BreakoutMission();m.ammo=0;m.fire();assert.equal(m.reloadTime,1.65);advance(m,1.7);assert.equal(m.ammo,24);const t=m.time;m.update(5);assert.equal(m.time,t+.05);m.state='won';m.update(1);assert.equal(m.time,t+.05);assert.equal(m.commandCover(true),false);});
test('spawn limits hold during a long unattended pursuit',()=>{const m=new BreakoutMission(()=>.5);for(let i=0;i<2950;i++){m.health=100;m.lost=0;m.update(.05);assert.ok(m.units.filter(u=>u.kind!=='friendlytruck'&&u.kind!=='pursuit').length<=5);assert.ok(m.units.filter(u=>u.kind==='friendlytruck').length<=1);assert.ok(m.units.filter(u=>u.kind==='pursuit').length<=1);}});
test('a careful simulated player can reach the checkpoint at every difficulty',()=>{for(const difficulty of ['rookie','regular','veteran'] as const){let seed=21;const m=new BreakoutMission(()=>{seed=seed*16807%2147483647;return seed/2147483647;},difficulty);for(let i=0;i<3200&&m.state==='playing';i++){const target=m.units.filter(u=>u.kind!=='friendlytruck').sort((a,b)=>(m.finalStarted&&a.kind==='pursuit'?-1000:0)+Math.hypot(a.x-GUN.x,a.y-GUN.y)-((m.finalStarted&&b.kind==='pursuit'?-1000:0)+Math.hypot(b.x-GUN.x,b.y-GUN.y)))[0];if(target){const travel=Math.hypot(target.x-GUN.x,target.y-GUN.y)/780;const aimX=target.kind==='motorcycle'?target.waypoint+Math.sin((target.step+travel*target.speed/10)*.9)*38:target.x;const aimY=Math.min(target.kind==='motorcycle'?420:target.kind==='jeep'?355:285,target.y+travel*target.speed);m.angle=Math.atan2(aimY-GUN.y,aimX-GUN.x);const blocked=m.units.some(u=>u.kind==='friendlytruck'&&u.y>target.y&&Math.abs(u.x-(GUN.x+(u.y-GUN.y)*(target.x-GUN.x)/(target.y-GUN.y)))<45);if(!blocked)m.fire();}else if(m.ammo<24)m.reload();m.update(.05);}assert.equal(m.state,'won',`${difficulty}: health ${m.health}, time ${m.time}, lost ${m.lost}`);assert.ok(m.finalCleared);}});

test('motorcycle arrivals alternate whole packs of two and three, with staggered lanes',()=>{const m=new BreakoutMission(()=>.5);advance(m,4.1);let bikes=m.units.filter(u=>u.kind==='motorcycle');assert.equal(bikes.length,2);assert.equal(new Set(bikes.map(u=>u.waypoint)).size,2);assert.notEqual(bikes[0].y,bikes[1].y);m.units=[];advance(m,7.6);bikes=m.units.filter(u=>u.kind==='motorcycle');assert.equal(bikes.length,3);assert.equal(new Set(bikes.map(u=>u.waypoint)).size,3);});
test('a motorcycle pack waits for enough capacity instead of arriving one at a time',()=>{const m=new BreakoutMission(()=>.5);m.units=[vehicle('jeep',260),vehicle('jeep',390),vehicle('jeep',570),vehicle('jeep',700)];advance(m,4.1);assert.equal(m.units.filter(u=>u.kind==='motorcycle').length,0);m.units.pop();m.update(.05);assert.equal(m.units.filter(u=>u.kind==='motorcycle').length,2);assert.equal(m.units.length,5);});

test('enemy shots damage the full visible truck body, not only the gun mount',()=>{
  for(const x of [GUN.x-34,GUN.x,GUN.x+34]){
    const m=new BreakoutMission();m.bullets=[{x,y:GUN.y-60,vx:0,vy:600,side:'enemy',life:1}];m.update(.05);
    assert.equal(m.health,94);assert.equal(m.bullets.length,0);assert.equal(m.damageFlash,.45);
    const hit=m.drainEvents().find(e=>e.kind==='hit');assert.equal(hit?.x,x);assert.equal(hit?.y,GUN.y-45);
    advance(m,.5);assert.equal(m.health,94);assert.equal(m.damageFlash,0);
  }
});
test('shots crossing a truck side or rear damage it, while near misses and player fire do not',()=>{
  for(const b of [
    {x:GUN.x-50,y:GUN.y+30,vx:600,vy:0},
    {x:GUN.x+50,y:GUN.y+30,vx:-600,vy:0},
    {x:GUN.x,y:GUN.y+60,vx:0,vy:-600}
  ]){const m=new BreakoutMission();m.bullets=[{...b,side:'enemy',life:1}];m.update(.05);assert.equal(m.health,94);}
  for(const side of ['enemy','player'] as const){const m=new BreakoutMission();m.bullets=[{x:GUN.x+(side==='enemy'?36:0),y:GUN.y-60,vx:0,vy:600,side,life:1}];m.update(.05);assert.equal(m.health,100);assert.equal(m.damageFlash,0);}
});
test('actual enemy bursts damage an unattended truck at every difficulty',()=>{
  for(const difficulty of ['rookie','regular','veteran'] as const){const m=new BreakoutMission(()=>.5,difficulty);advance(m,10);assert.ok(m.health<100,difficulty);}
});
