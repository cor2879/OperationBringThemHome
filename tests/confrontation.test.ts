import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConfrontationMission,DUEL_LIMIT,DUEL_LANES,throwHeight} from '../src/confrontation.ts';
const advance=(m:ConfrontationMission,s:number)=>{for(let i=0;i<Math.ceil(s/.025);i++)m.update(.025);};
const knife=(m:ConfrontationMission,side:'player'|'enemy',y:number)=>m.knives.push({id:99,side,x:side==='player'?m.opponent.x-25:m.player.x+25,y,vx:side==='player'?650:-550,vy:0,checked:true});
test('throws work during travel and launch from the moving fighter',()=>{for(const lane of [0,2]){const m=new ConfrontationMission(()=>.5);m.setLane(lane);m.update(.05);const start=m.player.y;m.fire();assert.ok(m.player.windup>0);advance(m,.2);assert.notEqual(m.player.y,start,'movement continues during wind-up');assert.equal(m.throws,0);m.update(.025);assert.equal(m.throws,1);const k=m.knives.find(k=>k.side==='player');assert.ok(k);assert.equal(k.y,throwHeight(m.player),'straight knife starts at current height');assert.notEqual(m.player.y,DUEL_LANES[lane],'knife launches before reaching platform');advance(m,.4);assert.equal(m.player.y,DUEL_LANES[lane]);}});
test('three-knife burst exhausts the pool until a knife recharges',()=>{const m=new ConfrontationMission(()=>.1);m.opponent.y=190;m.opponent.lane=0;m.opponent.recovery=100;m.fire();assert.equal(m.player.knifePool,3,'wind-up does not spend a knife');for(let i=0;i<72;i++){m.fire();m.update(.025);}assert.equal(m.throws,3);assert.equal(m.player.knifePool,0);m.fire();assert.equal(m.player.windup,0);advance(m,1.1);assert.equal(m.player.knifePool,1);m.fire();advance(m,.25);assert.equal(m.throws,4);assert.equal(m.player.knifePool,0);});
test('duck dodges a level knife, drains stamina and requires release to recover',()=>{const m=new ConfrontationMission(()=>.5);m.commandCover(true);m.update(.025);knife(m,'enemy',throwHeight(m.player));m.update(.05);assert.equal(m.player.health,5);assert.equal(m.dodges,1);m.fire();assert.equal(m.player.windup,0);advance(m,1.2);assert.equal(m.stamina,0);assert.equal(m.player.duck,0);knife(m,'enemy',throwHeight(m.player));m.update(.05);assert.equal(m.player.health,4);m.commandCover(false);advance(m,.5);assert.ok(m.stamina>0);});
test('swept knives hit once, hurt the correct fighter and interrupt wind-up',()=>{for(const side of ['player','enemy'] as const){const m=new ConfrontationMission(()=>.5),target=side==='player'?m.opponent:m.player;target.windup=.4;knife(m,side,throwHeight(target));m.update(.05);assert.equal(target.health,4);assert.equal(target.windup,0);assert.equal(m.health,side==='enemy'?80:100);assert.equal(m.knives.length,0);assert.ok(target.flash>0);const e=m.drainEvents().find(e=>e.kind==='duelhit');assert.equal(e?.shooter,side);advance(m,.1);assert.equal(target.health,4);}});
test('moving to another height avoids an incoming horizontal knife',()=>{const m=new ConfrontationMission(()=>.5);m.setLane(0);advance(m,.5);knife(m,'enemy',308);m.update(.05);assert.equal(m.player.health,5);});
test('AI telegraphs, throws and recovers rather than firing constantly',()=>{const m=new ConfrontationMission(()=>.5);advance(m,1.6);assert.ok(m.opponent.windup>0);assert.ok(m.drainEvents().some(e=>e.kind==='duelwarning'));assert.equal(m.knives.filter(k=>k.side==='enemy').length,0);advance(m,.8);assert.ok(m.opponent.recovery>0);assert.ok(m.knives.some(k=>k.side==='enemy'));});
test('five hits win a round, two rounds finish the match and final results freeze',()=>{for(const side of ['player','enemy'] as const){const m=new ConfrontationMission(()=>.5);for(let round=0;round<2;round++){for(let i=0;i<5;i++){knife(m,side,throwHeight(m.player));m.update(.05);}if(round===0){assert.equal(m.state,'playing');assert.equal(m.intermission,3);const t=m.time;m.fire();m.setLane(2);m.update(.05);assert.equal(m.time,t);assert.equal(m.player.windup,0);assert.equal(m.player.lane,1);advance(m,3);assert.equal(m.round,2);assert.equal(m.player.health,5);assert.equal(m.opponent.health,5);assert.equal(m.player.knifePool,3);assert.equal(m.opponent.knifePool,3);}}assert.equal(m.state,side==='player'?'won':'lost');const t=m.time;m.update(1);m.fire();m.setLane(2);assert.equal(m.time,t);assert.equal(m.player.lane,1);}});
test('AI can evade a knife during recovery but cannot duck out of its wind-up',()=>{for(const winding of [false,true]){const m=new ConfrontationMission(()=>0);m.opponent.windup=winding?.7:0;m.opponent.recovery=1;m.knives=[{id:3,side:'player',x:600,y:throwHeight(m.opponent),vx:650,vy:0,checked:false}];m.update(.05);assert.equal(m.opponent.duck>0,!winding);}});
test('an attentive simulated player can win at each AI difficulty',()=>{
 for(const difficulty of ['rookie','regular','veteran'] as const){let seed=13;const m=new ConfrontationMission(()=>{seed=seed*16807%2147483647;return seed/2147483647;},difficulty);
  for(let i=0;i<4800&&m.state==='playing';i++){
   m.setLane(m.opponent.lane);
   const danger=m.knives.some(k=>k.side==='enemy'&&k.x>m.player.x-20&&k.x<m.player.x+175&&Math.abs(k.y-(throwHeight(m.player)))<35);
   const unsafe=m.knives.some(k=>k.side==='enemy'&&k.x>m.player.x-20&&k.x<m.player.x+350&&Math.abs(k.y-throwHeight(m.player))<35);
   m.commandCover(danger);if(!danger&&!unsafe)m.fire();m.update(.025);
  }
  assert.equal(m.state,'won',`${difficulty}: ${m.player.health} health, ${m.time}s`);
 }
});

test('throw direction can change during wind-up and launches upward, straight or downward',()=>{
 for(const direction of [-1,0,1]){const m=new ConfrontationMission(()=>.5);m.fire();m.throwDirection=direction;advance(m,.25);const k=m.knives.find(k=>k.side==='player');assert.ok(k);assert.equal(Math.sign(k.vy),direction);assert.equal(m.player.y,320);assert.ok(Math.hypot(k.vx,k.vy)>649);}
});
test('angled knives reach an adjacent platform and use swept collision on the smaller fighter',()=>{
 for(const direction of [-1,1]){const m=new ConfrontationMission(()=>.5);m.opponent.lane=1+direction;m.opponent.y=DUEL_LANES[m.opponent.lane];m.opponent.windup=3;m.throwDirection=direction;m.fire();advance(m,1.1);assert.equal(m.opponent.health,4);}
 const m=new ConfrontationMission(()=>.5);knife(m,'enemy',m.player.y-30);m.update(.05);assert.equal(m.player.health,5,'a shot above the smaller head misses');
});

test('AI aims in both vertical directions and commits to its telegraphed angle',()=>{
 for(const lane of [0,2]){const m=new ConfrontationMission(()=>.1,'rookie');m.player.lane=lane;m.player.y=DUEL_LANES[lane];m.opponent.recovery=0;m.update(.025);assert.ok(m.opponent.windup>0);const tilt=m.enemyTilt;assert.equal(Math.sign(tilt),lane===0?-1:1);assert.ok(Math.abs(tilt)<=Math.PI/15);m.setLane(1);advance(m,1);const k=m.knives.find(k=>k.side==='enemy');assert.ok(k);assert.equal(Math.sign(k.vy),Math.sign(tilt));assert.equal(m.enemyTilt,tilt);}
});
test('AI chooses neighboring balconies and its angled knives can hit across levels',()=>{
 const flanking=new ConfrontationMission(()=>.1);flanking.update(.025);assert.notEqual(flanking.opponent.lane,flanking.player.lane);
 for(const lane of [0,2]){const m=new ConfrontationMission(()=>.1,'rookie');m.player.lane=lane;m.player.y=DUEL_LANES[lane];m.opponent.recovery=0;m.update(.025);advance(m,2.2);assert.equal(m.player.health,4);}
});

test('both reserves recharge one knife at a time, cap at three and freeze after a result',()=>{const m=new ConfrontationMission(()=>.5);m.opponent.recovery=100;advance(m,3);assert.equal(m.player.knifeCharge,0);m.player.knifePool=0;m.opponent.knifePool=0;advance(m,2.4);assert.equal(m.player.knifePool,0);assert.equal(m.opponent.knifePool,0);advance(m,.15);assert.equal(m.player.knifePool,1);assert.equal(m.opponent.knifePool,1);advance(m,5);assert.equal(m.player.knifePool,3);assert.equal(m.opponent.knifePool,3);assert.equal(m.player.knifeCharge,0);m.player.knifePool=0;m.state='lost';advance(m,3);assert.equal(m.player.knifePool,0);assert.equal(m.player.knifeCharge,0);});
test('AI cannot wind up with an empty reserve and spends a replenished knife on launch',()=>{const m=new ConfrontationMission(()=>.5);m.opponent.recovery=0;m.opponent.knifePool=0;advance(m,2.4);assert.equal(m.opponent.windup,0);advance(m,.15);assert.ok(m.opponent.windup>0);assert.equal(m.opponent.knifePool,1);advance(m,.7);assert.equal(m.opponent.knifePool,0);assert.ok(m.knives.some(k=>k.side==='enemy'));});

test('a split match reaches round three and only the second round win ends it',()=>{const m=new ConfrontationMission(()=>.5);for(const side of ['enemy','player','player'] as const){for(let i=0;i<5;i++){knife(m,side,throwHeight(m.player));m.update(.05);}if(m.state==='playing')advance(m,3.05);}assert.equal(m.round,3);assert.equal(m.playerRounds,2);assert.equal(m.enemyRounds,1);assert.equal(m.state,'won');});
test('timeouts award a round to the AI and reset the next round timer',()=>{const m=new ConfrontationMission(()=>.5);m.time=DUEL_LIMIT-.025;m.update(.05);assert.equal(m.enemyRounds,1);assert.equal(m.state,'playing');advance(m,3.05);assert.equal(m.round,2);assert.ok(m.time<.1);m.time=DUEL_LIMIT-.025;m.update(.05);assert.equal(m.enemyRounds,2);assert.equal(m.state,'lost');});
