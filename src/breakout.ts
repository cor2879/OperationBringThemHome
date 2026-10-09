import {RescueMission,GUN,type Unit,type Point} from './model.ts';
import {sweptDistance} from './defense.ts';
export const BREAKOUT_DURATION=150;
export const FINAL_PURSUIT_TIME=120;
export const PURSUIT_ARMOR=18;
export const ENEMY_BULLET_DAMAGE=4;
// The whole visible truck body is vulnerable, including its roof and side panels.
export const PLAYER_TRUCK={left:GUN.x-35,right:GUN.x+35,top:GUN.y-45,bottom:GUN.y+46};
function truckImpact(from:Point,to:Point):Point|undefined{
  let enter=0,exit=1;
  for(const [start,end,low,high] of [[from.x,to.x,PLAYER_TRUCK.left,PLAYER_TRUCK.right],[from.y,to.y,PLAYER_TRUCK.top,PLAYER_TRUCK.bottom]]){
    const delta=end-start;
    if(delta===0){if(start<low||start>high)return;continue;}
    const a=(low-start)/delta,b=(high-start)/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit)return;
  }
  return {x:from.x+(to.x-from.x)*enter,y:from.y+(to.y-from.y)*enter};
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class BreakoutMission extends RescueMission{
  private rng:()=>number;private serial=0;private spawnClock=4;private trafficClock=12;private armorClock=52;private bridgeCalled=false;private spawnCount=0;private finalId=-1;
  armorWarning=0;finalStarted=false;finalCleared=false;damageFlash=0;
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){super(random,difficulty);this.rng=random;}
  get remaining(){return Math.max(0,BREAKOUT_DURATION-this.time);}
  override commandCover(_hold:boolean){return false;}
  private add(kind:Unit['kind'],lane:number){const heavy=kind==='pursuit',friendly=kind==='friendlytruck';const u:Unit={id:this.serial++,kind,x:lane,y:90,hp:heavy?PURSUIT_ARMOR:friendly?2:kind==='jeep'?3:1,speed:heavy?34:friendly?57:kind==='jeep'?44:67,waypoint:lane,fireTimer:0,alive:true,step:0,phase:'advance',phaseTimer:0};this.units.push(u);return u;}
  override update(dt:number){
    if(this.state!=='playing')return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.fireCooldown-=dt;this.damageFlash=Math.max(0,this.damageFlash-dt);
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0)this.ammo=24;}
    const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.2:1;
    this.spawnClock-=dt;
    if(this.spawnClock<=0&&this.time<BREAKOUT_DURATION-10){
      const kind=this.spawnCount%3===2?'jeep':'motorcycle';
      const count=kind==='jeep'?1:this.spawnCount%2===0?2:3;
      const active=this.units.filter(u=>u.alive&&u.kind!=='friendlytruck'&&u.kind!=='pursuit').length;
      // Wait for enough room for the whole pack; never turn a group into single riders.
      if(active+count<=5){
        for(let i=0;i<count;i++){
          const lane=[260,390,570,700][(this.spawnCount+i)%4],u=this.add(kind,lane);
          u.speed*=d;u.y=90-i*26;u.step=i*.7;
        }
        this.spawnCount++;this.spawnClock=(this.time>90?5.8:7.5)/d;
        this.events.push({kind:kind==='jeep'?'jeepwarning':'bikewarning',x:0,y:0});
      }
    }
    this.trafficClock-=dt;
    if(this.trafficClock<=0&&this.time<105&&!this.units.some(u=>u.kind==='friendlytruck')){this.add('friendlytruck',this.released++%2?700:260);this.trafficClock=23;this.events.push({kind:'friendlytraffic',x:0,y:0});}
    if(this.time>=FINAL_PURSUIT_TIME-3&&!this.bridgeCalled){this.bridgeCalled=true;this.events.push({kind:'bridgewarning',x:0,y:0});}
    if(this.time>=FINAL_PURSUIT_TIME&&!this.finalStarted){
      this.finalStarted=true;this.armorWarning=0;const u=this.units.find(u=>u.alive&&u.kind==='pursuit')??this.add('pursuit',570);this.finalId=u.id;this.events.push({kind:'finalpursuit',x:u.x,y:u.y});
    }else if(!this.finalStarted&&!this.units.some(u=>u.alive&&u.kind==='pursuit')&&this.time<FINAL_PURSUIT_TIME-15){
      if(this.armorWarning>0){this.armorWarning-=dt;if(this.armorWarning<=0){this.add('pursuit',this.spawnCount%2?390:570);this.armorClock=42;}}
      else{this.armorClock-=dt;if(this.armorClock<=0){this.armorWarning=3;this.events.push({kind:'pursuitwarning',x:0,y:0});}}
    }
    for(const u of this.units){
      if(!u.alive)continue;u.step+=dt*u.speed/10;
      if(u.kind==='friendlytruck'){
        u.y+=u.speed*dt;if(u.y>455)u.x+=(u.waypoint<480?-1:1)*100*dt;
        if(u.x<155||u.x>805){u.alive=false;this.rescued++;this.events.push({kind:'trafficclear',x:u.x,y:u.y});}continue;
      }
      if(u.kind==='motorcycle')u.x=u.waypoint+Math.sin(u.step*.9)*38;
      const station=u.kind==='motorcycle'?420:u.kind==='jeep'?355:285;
      if(u.y<station)u.y=Math.min(station,u.y+u.speed*dt);
      if(u.phase==='advance'&&u.y>=200){u.phase='setup';u.phaseTimer=u.kind==='pursuit'?1.4:.9;u.aimPoint={...GUN};}
      if(u.phase==='advance')continue;
      u.phaseTimer=(u.phaseTimer??0)-dt;
      if(u.phase==='setup'&&u.phaseTimer<=0){u.phase='burst';u.phaseTimer=u.kind==='pursuit'?1.8:u.kind==='jeep'?.85:.16;u.fireTimer=0;}
      if(u.phase==='burst'){
        u.fireTimer-=dt;
        if(u.phaseTimer<=0){u.phase='reload';u.phaseTimer=(u.kind==='pursuit'?6:u.kind==='jeep'?4.5:3.8)/d;u.aimPoint=undefined;}
        else if(u.fireTimer<=0){this.shoot(u);u.fireTimer=u.kind==='pursuit'?.3:.32;}
      }else if(u.phase==='reload'&&u.phaseTimer<=0){u.phase='setup';u.phaseTimer=u.kind==='pursuit'?1.4:.9;u.aimPoint={...GUN};}
    }
    for(const b of this.bullets){
      const previous={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0)continue;
      // Friendly convoy vehicles can intercept either side's fire.
      const targets=this.units.filter(u=>u.alive&&(b.side==='player'||u.kind==='friendlytruck')).filter(u=>sweptDistance(u,previous,b)<(u.kind==='motorcycle'?14:u.kind==='pursuit'?30:25)).sort((a,c)=>distance(a,previous)-distance(c,previous));
      const u=targets[0];if(u){b.life=0;u.hp--;this.events.push({kind:'hit',x:u.x,y:u.y});if(u.hp<=0){u.alive=false;if(u.kind==='friendlytruck'){this.lost++;this.events.push({kind:'trafficloss',x:u.x,y:u.y,shooter:b.side});}else{this.kills++;this.events.push({kind:'vehicledestroyed',x:u.x,y:u.y});if(u.id===this.finalId){this.finalCleared=true;this.events.push({kind:'pursuitclear',x:u.x,y:u.y});}}}continue;}
      const impact=b.side==='enemy'?truckImpact(previous,b):undefined;
      if(impact){b.life=0;this.health-=ENEMY_BULLET_DAMAGE;this.damageFlash=.45;this.events.push({kind:'hit',...impact});}
    }
    this.units=this.units.filter(u=>u.alive);this.bullets=this.bullets.filter(b=>b.life>0&&b.x>=0&&b.x<=960&&b.y>=0&&b.y<=600);this.health=Math.max(0,this.health);
    if(this.health<=0||this.lost>=3||(this.time>=BREAKOUT_DURATION&&!this.finalCleared)){this.state='lost';this.events.push({kind:'defeat',...GUN});}
    else if(this.time>=BREAKOUT_DURATION&&this.finalCleared){this.state='won';this.events.push({kind:'victory',...GUN});}
  }
  private shoot(u:Unit){const spread=this.difficulty==='rookie'?125:this.difficulty==='veteran'?45:85,a=Math.atan2(GUN.y-(u.y+20),GUN.x-u.x+(this.rng()-.5)*spread);this.bullets.push({x:u.x,y:u.y+20,vx:Math.cos(a)*270,vy:Math.sin(a)*270,side:'enemy',life:2.5});this.events.push({kind:'enemyburst',x:u.x,y:u.y});}
}
