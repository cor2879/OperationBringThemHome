import {RescueMission,type Point} from './model.ts';
export const DUEL_LANES=[190,320,450] as const;
export const DUEL_LIMIT=120;
export const KNIFE_POOL=3;
export const KNIFE_RECHARGE=2.5;
export const DUEL_SCALE=.54;
export const KNIFE_TILT=Math.PI/15; // Twelve degrees reaches the next level without a steep arc.
export const throwHeight=(u:Duelist)=>u.y+40-52*DUEL_SCALE;
function intersectsFighter(a:Point,b:Point,u:Duelist){
  let enter=0,exit=1;
  const top=u.y+40-(u.duck>0?28:84)*DUEL_SCALE;
  for(const [start,end,low,high] of [[a.x,b.x,u.x-17*DUEL_SCALE,u.x+17*DUEL_SCALE],[a.y,b.y,top,u.y+40]]){
    const d=end-start;if(d===0){if(start<low||start>high)return false;continue;}
    const first=(low-start)/d,last=(high-start)/d;
    enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));if(enter>exit)return false;
  }
  return true;
}
export type Duelist={x:number;y:number;lane:number;health:number;duck:number;windup:number;recovery:number;flash:number;knifePool:number;knifeCharge:number};
export type Knife=Point & {id:number;side:'player'|'enemy';vx:number;vy:number;checked:boolean};
const moveToward=(value:number,target:number,amount:number)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
export class ConfrontationMission extends RescueMission{
  player:Duelist={x:195,y:320,lane:1,health:5,duck:0,windup:0,recovery:0,flash:0,knifePool:KNIFE_POOL,knifeCharge:0};
  opponent:Duelist={x:765,y:320,lane:1,health:5,duck:0,windup:0,recovery:1.5,flash:0,knifePool:KNIFE_POOL,knifeCharge:0};
  death:{side:'player'|'enemy';x:number;y:number;elapsed:number}|null=null;
  round=1;playerRounds=0;enemyRounds=0;intermission=0;roundWinner:'player'|'enemy'|null=null;
  throwDirection=0;enemyTilt=0;knives:Knife[]=[];stamina=1;duckHeld=false;throws=0;dodges=0;private serial=0;private think=0;private evadeCooldown=0;private randomDuel:()=>number;
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){super(random,difficulty);this.randomDuel=random;}
  get remaining(){return Math.max(0,DUEL_LIMIT-this.time);}
  setLane(lane:number){if(this.state==='playing'&&!this.intermission)this.player.lane=Math.max(0,Math.min(2,Math.round(lane)));}
  override commandCover(hold:boolean){if(this.state==='playing'&&!this.intermission)this.duckHeld=hold;return false;}
  override reload(){}
  override fire(){
    const p=this.player;
    if(this.state!=='playing'||this.intermission>0||(this.duckHeld&&this.stamina>0)||p.duck>0||p.windup>0||p.recovery>0||p.knifePool<=0)return;
    p.windup=.22;
  }
  private launch(side:'player'|'enemy'){
    const p=side==='player'?this.player:this.opponent;
    p.knifePool--;
    const speed=side==='player'?800:this.difficulty==='rookie'?620:this.difficulty==='veteran'?800:720;
    const tilt=side==='player'?Math.sign(this.throwDirection)*KNIFE_TILT:this.enemyTilt;
    this.knives.push({id:this.serial++,side,x:p.x+(side==='player'?24:-24)*DUEL_SCALE,y:throwHeight(p),vx:(side==='player'?1:-1)*speed*Math.cos(tilt),vy:speed*Math.sin(tilt),checked:false});
    p.recovery=side==='player'?.32:this.difficulty==='rookie'?.65:this.difficulty==='veteran'?.4:.5;
    if(side==='player')this.throws++;
    this.events.push({kind:'knifethrow',x:p.x,y:p.y,shooter:side});
  }
  override update(dt:number){
    if(this.state!=='playing')return;dt=Math.max(0,Math.min(.05,dt));
    if(this.intermission>0){if(this.death)this.death.elapsed+=dt;this.intermission=Math.max(0,this.intermission-dt);if(this.intermission===0){if(this.playerRounds===2||this.enemyRounds===2)this.finishMatch();else this.nextRound();}return;}
    this.time+=dt;
    const p=this.player,e=this.opponent;
    for(const u of [p,e]){u.recovery=Math.max(0,u.recovery-dt);u.flash=Math.max(0,u.flash-dt);
      if(u.knifePool<KNIFE_POOL){u.knifeCharge+=dt;if(u.knifeCharge>=KNIFE_RECHARGE){u.knifePool++;u.knifeCharge-=KNIFE_RECHARGE;}}
      if(u.knifePool===KNIFE_POOL)u.knifeCharge=0;
    }
    if(this.duckHeld&&p.windup<=0&&this.stamina>0){p.duck=1;this.stamina=Math.max(0,this.stamina-dt/1.1);}else p.duck=0;
    // Release to recover: holding DUCK forever cannot make the player invulnerable.
    if(!this.duckHeld)this.stamina=Math.min(1,this.stamina+dt*.65);
    if(!p.duck)p.y=moveToward(p.y,DUEL_LANES[p.lane],dt*220);
    e.duck=Math.max(0,e.duck-dt);this.evadeCooldown=Math.max(0,this.evadeCooldown-dt);
    this.think-=dt;
    if(this.think<=0&&e.windup<=0&&e.duck<=0){
      // Sometimes hold a neighboring balcony and attack across levels instead of chasing.
      const flankChance=this.difficulty==='rookie'?.25:this.difficulty==='veteran'?.45:.35;
      const neighbors=[p.lane-1,p.lane+1].filter(lane=>lane>=0&&lane<3);
      const aimLane=this.randomDuel()<flankChance?neighbors[Math.floor(this.randomDuel()*neighbors.length)]:p.lane;
      e.lane=aimLane;this.think=this.difficulty==='rookie'?1.2:this.difficulty==='veteran'?.55:.85;
    }
    if(e.windup<=0&&e.duck<=0)e.y=moveToward(e.y,DUEL_LANES[e.lane],dt*(this.difficulty==='veteran'?220:190));
    if(e.knifePool>0&&e.recovery<=0&&e.windup<=0&&e.duck<=0&&Math.abs(e.y-DUEL_LANES[e.lane])<8){
      // Commit to the visible aim when winding up, so movement can evade it.
      this.enemyTilt=Math.max(-KNIFE_TILT,Math.min(KNIFE_TILT,Math.atan2(throwHeight(p)-throwHeight(e),e.x-24*DUEL_SCALE-p.x)));
      e.windup=this.difficulty==='rookie'?.9:this.difficulty==='veteran'?.5:.7;
      this.events.push({kind:'duelwarning',x:e.x,y:e.y});
    }
    for(const u of [p,e])if(u.windup>0){u.windup-=dt;if(u.windup<=0){u.windup=0;this.launch(u===p?'player':'enemy');}}
    for(const k of this.knives){
      const previous={x:k.x,y:k.y},before=k.x;k.x+=k.vx*dt;k.y+=k.vy*dt;const target=k.side==='player'?e:p;
      if(k.side==='player'&&!k.checked&&e.x-k.x<180&&e.x-k.x>0&&Math.abs(k.y+k.vy*(e.x-k.x)/k.vx-throwHeight(e))<32){
        k.checked=true;
        if(e.windup<=0&&this.evadeCooldown<=0&&this.randomDuel()<(this.difficulty==='rookie'?.15:this.difficulty==='veteran'?.5:.3)){e.duck=.42;this.evadeCooldown=2.2;}
      }
      if(intersectsFighter(previous,k,target)){
        k.x=k.side==='player'?1000:-40;target.health=Math.max(0,target.health-1);target.flash=.45;target.windup=0;target.recovery=Math.max(target.recovery,.6);
        this.health=p.health*20;if(k.side==='player')this.kills++;
        this.events.push({kind:'duelhit',x:target.x,y:k.y,shooter:k.side});
      }else if(k.side==='enemy'&&before>p.x&&k.x<=p.x&&p.duck>0&&Math.abs(k.y-throwHeight(p))<32){this.dodges++;this.events.push({kind:'dueldodge',x:p.x,y:p.y});}
    }
    this.knives=this.knives.filter(k=>k.x>-20&&k.x<980&&k.y>76&&k.y<560);
    if(p.health<=0||this.time>=DUEL_LIMIT)this.endRound('enemy');
    else if(e.health<=0)this.endRound('player');
  }
  private endRound(winner:'player'|'enemy'){
    this.roundWinner=winner;if(winner==='player')this.playerRounds++;else this.enemyRounds++;
    this.knives=[];this.duckHeld=false;this.player.windup=0;this.opponent.windup=0;
    const fallen=this.player.health<=0?'player':this.opponent.health<=0?'enemy':null;
    if(fallen){const u=fallen==='player'?this.player:this.opponent;this.death={side:fallen,x:u.x,y:u.y,elapsed:0};this.events.push({kind:'dueldeath',x:u.x,y:u.y,shooter:fallen});}
    if((this.playerRounds===2||this.enemyRounds===2)&&!this.death){this.finishMatch();return;}
    this.intermission=this.playerRounds===2||this.enemyRounds===2?1.8:3;
    this.events.push({kind:'duelround',x:this.player.x,y:this.player.y,shooter:winner});
  }
  private finishMatch(){
    const won=this.playerRounds===2;this.state=won?'won':'lost';this.events.push({kind:won?'victory':'defeat',x:this.player.x,y:this.player.y});
  }

  private nextRound(){
    this.death=null;this.round++;this.time=0;this.roundWinner=null;this.health=100;this.stamina=1;this.duckHeld=false;this.throwDirection=0;this.enemyTilt=0;this.think=0;this.evadeCooldown=0;
    for(const u of [this.player,this.opponent])Object.assign(u,{y:320,lane:1,health:5,duck:0,windup:0,recovery:u===this.player?0:1.5,flash:0,knifePool:KNIFE_POOL,knifeCharge:0});
    this.events.push({kind:'duelstart',x:this.player.x,y:this.player.y});
  }

}
