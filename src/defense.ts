import {RescueMission,GUN,type Unit,type Point} from './model.ts';
export const CONVOY_ETA=150;
export const BOARDING_TIME=12;
export const AID_STATION={x:770,y:410};
export const DEFENSE_GATE={x:480,y:475};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sweptDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1,dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
/** Uses the shared gun, ammunition and event contract, with its own encounter rules. */
export class DefenseMission extends RescueMission{
  private rng:()=>number;private serial=0;private waveClock=4;private medicClock=8;private chatter=0;private armorClock=30;private armorSide=0;
  armorWarning=0;
  wave=0;warning?:{sector:number;remaining:number};convoyArrived=false;
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){super(random,difficulty);this.rng=random;}
  get convoyRemaining(){return Math.max(0,CONVOY_ETA-this.time);}
  get boardingRemaining(){return Math.max(0,CONVOY_ETA+BOARDING_TIME-this.time);}
  override commandCover(hold:boolean){if(this.state!=='playing'||this.coverOrdered===hold)return false;this.coverOrdered=hold;return true;}
  private add(kind:Unit['kind'],x:number,y:number){const u:Unit={id:this.serial++,kind,x,y,hp:kind==='prisoner'?1:kind==='machinegun'?3:2,speed:kind==='prisoner'?55:kind==='sapper'?46:26,waypoint:0,fireTimer:2,alive:true,step:0};this.units.push(u);return u;}
  override update(dt:number){
    if(this.state!=='playing')return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.fireCooldown-=dt;this.chatter-=dt;
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0)this.ammo=24;}
    const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.2:1;
    // Reserve the transport as an occasional threat, with a fresh gap after it leaves.
    if(!this.units.some(u=>u.alive&&u.kind==='transport')&&this.time<CONVOY_ETA-15){
      if(this.armorWarning>0){this.armorWarning-=dt;if(this.armorWarning<=0){
        const side=this.armorSide++%2,u=this.add('transport',side?1010:-50,220);
        u.hp=8;u.speed=65;u.waypoint=side;u.phase='advance';u.cargo=3;u.serviceTime=0;this.armorClock=42;
      }}else{this.armorClock-=dt;if(this.armorClock<=0){this.armorWarning=3;this.events.push({kind:'armorwarning',x:0,y:0});}}
    }
    this.waveClock-=dt;
    if(this.warning){this.warning.remaining-=dt;if(this.warning.remaining<=0){
      const sector=this.warning.sector;this.wave++;const count=this.time>90?3:2;
      for(let i=0;i<count;i++){if(this.units.filter(u=>u.kind!=='prisoner'&&u.alive).length>=7)break;
        const kind=i===0&&this.wave%3===0?'machinegun':i===1&&this.wave%2===0?'sapper':'raider';
        const x=sector===0?45+i*26:sector===2?915-i*26:420+i*100,y=sector===1?115:175+i*30;
        const u=this.add(kind,x,y);u.speed*=d;if(kind==='machinegun'){u.phase='advance';u.phaseTimer=0;}
      }this.warning=undefined;this.waveClock=(this.time>90?9:13)/d;
    }}else if(this.waveClock<=0&&this.time<CONVOY_ETA){this.warning={sector:(this.wave)%3,remaining:2.5};this.events.push({kind:'defensewarning',x:this.warning.sector,y:0});}
    this.medicClock-=dt;
    if(this.medicClock<=0&&this.time<CONVOY_ETA-10&&!this.units.some(u=>u.kind==='prisoner')){this.add('prisoner',180,410);this.released++;this.medicClock=18;this.events.push({kind:'medic',x:180,y:410});}
    if(!this.convoyArrived&&this.time>=CONVOY_ETA){this.convoyArrived=true;this.events.push({kind:'convoy',x:840,y:480});}
    for(const u of this.units){
      if(!u.alive)continue;u.step+=dt*u.speed/10;
      if(u.kind==='prisoner'){
        u.shelter=this.coverOrdered?0:undefined;u.x+=u.speed*dt*(this.coverOrdered?.35:1);
        if(u.x>=AID_STATION.x){u.alive=false;this.rescued++;this.events.push({kind:'rescue',x:u.x,y:u.y});}continue;
      }
      if(u.kind==='transport'){
        if(u.phase==='advance'){
          const destination={x:u.waypoint?670:290,y:220};this.move(u,destination,dt);
          if(distance(u,destination)<3){u.phase='unload';u.phaseTimer=.9;}
        }else if(u.phase==='retreat'){
          this.move(u,{x:u.waypoint?1020:-60,y:220},dt);if(u.x>1005||u.x<-45)u.alive=false;
        }else{
          u.serviceTime=(u.serviceTime??0)+dt;u.phaseTimer=(u.phaseTimer??0)-dt;
          if(u.serviceTime>=26){u.phase='retreat';u.aimPoint=undefined;continue;}
          if(u.phase==='unload'&&u.phaseTimer<=0){
            if(this.units.filter(p=>p.alive&&p.kind!=='prisoner').length<8){
              const n=3-(u.cargo??0);this.add('raider',u.x-32+n*27,u.y+42).speed*=d;u.cargo=(u.cargo??0)-1;u.phaseTimer=.9;
            }
            if(u.cargo===0){u.phase='setup';u.phaseTimer=1.5;u.aimPoint=this.armorTarget(u);}
          }else if(u.phase==='setup'&&u.phaseTimer<=0){u.phase='burst';u.phaseTimer=1.8;u.fireTimer=0;}
          if(u.phase==='burst'){
            u.fireTimer-=dt;
            if(u.phaseTimer<=0){u.phase='reload';u.phaseTimer=6;u.aimPoint=undefined;}
            else if(u.fireTimer<=0){this.shoot(u,u.aimPoint??GUN,300);u.fireTimer=.3;}
          }else if(u.phase==='reload'&&u.phaseTimer<=0){u.phase='setup';u.phaseTimer=1.5;u.aimPoint=this.armorTarget(u);}
        }continue;
      }
      const target=u.kind==='sapper'?DEFENSE_GATE:GUN;
      if(u.kind==='machinegun'){
        const destination={x:u.x<480?220:740,y:280};
        if(u.phase==='advance'){this.move(u,destination,dt);if(distance(u,destination)<5){u.phase='setup';u.phaseTimer=2;u.aimPoint={...GUN};}}
        else{u.phaseTimer=(u.phaseTimer??0)-dt;
          if(u.phase==='setup'&&u.phaseTimer<=0){u.phase='burst';u.phaseTimer=2;u.fireTimer=0;}
          if(u.phase==='burst'){u.fireTimer-=dt;if(u.phaseTimer<=0){u.phase='reload';u.phaseTimer=8;u.aimPoint=undefined;this.events.push({kind:'defensereload',x:u.x,y:u.y});}else if(u.fireTimer<=0){this.shoot(u,GUN,260);u.fireTimer=.35;}}
          else if(u.phase==='reload'&&u.phaseTimer<=0){u.phase='setup';u.phaseTimer=2;u.aimPoint={...GUN};}
        }continue;
      }
      if(u.kind==='sapper'){this.move(u,target,dt);if(distance(u,target)<20){u.alive=false;this.health-=18;this.events.push({kind:'hit',...DEFENSE_GATE});}continue;}
      if(distance(u,GUN)>265)this.move(u,target,dt);
      else{u.fireTimer-=dt;if(u.fireTimer<=.9&&!u.aimPoint)u.aimPoint={...GUN};if(u.fireTimer<=0){this.shoot(u,u.aimPoint??GUN,205);u.fireTimer=3.4/d;u.aimPoint=undefined;}}
    }
    for(const b of this.bullets){const previous={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0)continue;
      // Resolve the nearest hit along the swept bullet, including friendly crossings.
      const hits=this.units.filter(u=>u.alive&&(b.side==='player'||u.kind==='prisoner'&&u.shelter===undefined)).filter(u=>(sweptDistance(u,previous,b)<(u.kind==='transport'?35:u.kind==='machinegun'?18:12)||u.kind==='prisoner'&&sweptDistance({x:u.x+26,y:u.y},previous,b)<12)).sort((a,c)=>distance(previous,a)-distance(previous,c));
      const u=hits[0];if(u){b.life=0;u.hp--;this.events.push({kind:'hit',x:u.x,y:u.y});if(u.hp<=0){u.alive=false;if(u.kind==='prisoner'){this.lost++;this.events.push({kind:'loss',x:u.x,y:u.y,shooter:b.side});}else{this.kills++;if(u.kind==='transport')this.events.push({kind:'armordestroyed',x:u.x,y:u.y});}}continue;}
      if(b.side==='enemy'&&sweptDistance(GUN,previous,b)<25){b.life=0;this.health-=4;this.events.push({kind:'hit',...GUN});}
      if(b.side==='player'&&this.chatter<=0&&this.units.some(u=>u.alive&&u.kind==='prisoner'&&sweptDistance(u,previous,b)<36)){this.chatter=7;this.events.push({kind:'near',x:b.x,y:b.y});}
    }
    this.units=this.units.filter(u=>u.alive);this.bullets=this.bullets.filter(b=>b.life>0&&b.x>=0&&b.x<=960&&b.y>=0&&b.y<=600);this.health=Math.max(0,this.health);
    if(this.health<=0||this.lost>=3){this.state='lost';this.events.push({kind:'defeat',...GUN});}
    else if(this.time>=CONVOY_ETA+BOARDING_TIME){this.state='won';this.events.push({kind:'victory',...GUN});}
  }
  private armorTarget(u:Unit):Point{
    const friendly=this.units.filter(p=>p.alive&&p.kind==='prisoner'&&p.shelter===undefined).sort((a,b)=>distance(u,a)-distance(u,b))[0];
    return friendly?{x:Math.min(AID_STATION.x,friendly.x+13+friendly.speed*2),y:friendly.y}:{...GUN};
  }
  private move(u:Unit,target:Point,dt:number){const dist=distance(u,target),travel=Math.min(dist,u.speed*dt);u.x+=(target.x-u.x)/Math.max(1,dist)*travel;u.y+=(target.y-u.y)/Math.max(1,dist)*travel;}
  private shoot(u:Unit,target:Point,speed:number){const spread=this.difficulty==='rookie'?110:this.difficulty==='veteran'?45:75;const a=Math.atan2(target.y-u.y,target.x-u.x+(this.rng()-.5)*spread);this.bullets.push({x:u.x,y:u.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,side:'enemy',life:3});this.events.push({kind:'enemyburst',x:u.x,y:u.y});}
}
