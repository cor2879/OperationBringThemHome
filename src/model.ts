export type Point={x:number;y:number};
export type Unit=Point & {id:number;kind:'prisoner'|'raider'|'sapper'|'machinegun'|'dog';hp:number;speed:number;waypoint:number;fireTimer:number;alive:boolean;step:number;shelter?:number;aimPoint?:Point;phase?:'advance'|'setup'|'burst'|'reload';phaseTimer?:number;preyId?:number;facing?:number};
export type Bullet=Point & {vx:number;vy:number;side:'player'|'enemy';life:number};
export type MissionEvent={kind:'shot'|'hit'|'rescue'|'loss'|'near'|'enemy'|'reload'|'victory'|'defeat'|'machinegun'|'enemyburst'|'enemyreload'|'dogwarning';x:number;y:number;shooter?:'player'|'enemy'};
export const ROUTE:Point[]=[{x:90,y:138},{x:145,y:220},{x:300,y:238},{x:420,y:345},{x:600,y:336},{x:870,y:460}];
export const SHELTERS=[{waypoint:2,capacity:1,...ROUTE[2]},{waypoint:4,capacity:1,...ROUTE[4]}];
export const WALLS=[{x:230,y:188,w:170,h:22},{x:525,y:284,w:150,h:22}];
export const GUN={x:480,y:550};
export const MACHINEGUN_POSITION={x:175,y:300};
export const MISSION_DURATION=360;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p:Point,a:Point,b:Point){
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1,dx*dx+dy*dy)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function hitsWall(a:Point,b:Point,w:{x:number;y:number;w:number;h:number}){
  // Slab intersection catches fast bullets that cross a wall between frames.
  let lo=0,hi=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,w.x,w.x+w.w],[a.y,b.y-a.y,w.y,w.y+w.h]]){
    if(Math.abs(delta)<.0001){if(start<min||start>max)return false;continue;}
    const first=(min-start)/delta,last=(max-start)/delta;
    lo=Math.max(lo,Math.min(first,last));hi=Math.min(hi,Math.max(first,last));if(lo>hi)return false;
  }
  return true;
}
export class RescueMission{
  units:Unit[]=[];bullets:Bullet[]=[];events:MissionEvent[]=[];
  time=0;rescued=0;lost=0;released=0;kills=0;health=100;ammo=24;reloadTime=0;fireCooldown=0;angle=-Math.PI/2;state:'playing'|'won'|'lost'='playing';
  private releaseTimer=1;private spawnTimer=3;private nextId=0;private nearTimer=0;private machinegunTimer=12;
  private random:()=>number;
  private dogTimer=0;private dogWarning?:{preyId:number;remaining:number};
  get dogInbound(){return this.dogWarning!==undefined;}
  coverOrdered=false;private commandDelay=0;
  commandCover(hold:boolean){
    if(this.state!=='playing'||hold===this.coverOrdered)return false;
    this.coverOrdered=hold;this.commandDelay=hold?.35:0;
    if(!hold)for(const u of this.units){if(u.shelter!==undefined)u.waypoint++;u.shelter=undefined;}
    return true;
  }
  difficulty:'rookie'|'regular'|'veteran';
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){this.random=random;this.difficulty=difficulty;}
  reload(){if(this.ammo<24&&this.reloadTime<=0&&this.state==='playing'){this.reloadTime=1.65;this.events.push({kind:'reload',...GUN});}}
  fire(){
    if(this.state!=='playing'||this.reloadTime>0||this.fireCooldown>0)return;
    if(this.ammo<=0){this.reload();return;}
    this.ammo--;this.fireCooldown=.105;
    const angle=this.angle+(this.random()-.5)*.025;
    this.bullets.push({x:GUN.x+Math.cos(angle)*25,y:GUN.y+Math.sin(angle)*25,vx:Math.cos(angle)*780,vy:Math.sin(angle)*780,side:'player',life:1.5});
    this.events.push({kind:'shot',...GUN});
  }
  update(dt:number){
    if(this.state!=='playing')return;
    dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.fireCooldown-=dt;this.nearTimer-=dt;this.commandDelay-=dt;
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0)this.ammo=24;}
    // Each rescue is its own crossing. A shelter hold must never release the next person.
    if(!this.units.some(u=>u.alive&&u.kind==='prisoner')){
      this.releaseTimer-=dt;
      if(this.releaseTimer<=0&&this.released<12){this.units.push({id:this.nextId++,kind:'prisoner',...ROUTE[0],hp:1,speed:43,waypoint:1,fireTimer:0,alive:true,step:0});this.released++;this.releaseTimer=1.8;}
    }
    this.dogTimer-=dt;
    const escapee=this.units.find(u=>u.alive&&u.kind==='prisoner');
    if(this.dogWarning){
      this.dogWarning.remaining-=dt;
      if(!escapee||escapee.id!==this.dogWarning.preyId)this.dogWarning=undefined;
      else if(this.dogWarning.remaining<=0){
        this.units.push({id:this.nextId++,kind:'dog',...ROUTE[0],hp:1,speed:this.difficulty==='rookie'?64:this.difficulty==='veteran'?80:72,waypoint:1,fireTimer:0,alive:true,step:0,preyId:escapee.id,facing:1});
        this.dogWarning=undefined;
      }
    }else if(this.released>=3&&escapee&&escapee.waypoint>=2&&this.dogTimer<=0&&!this.units.some(u=>u.alive&&u.kind==='dog')){
      this.dogWarning={preyId:escapee.id,remaining:2};this.dogTimer=35;
      this.events.push({kind:'dogwarning',...ROUTE[0]});
    }
    this.spawnTimer-=dt;
    this.machinegunTimer-=dt;
    if(this.machinegunTimer<=0&&!this.units.some(u=>u.alive&&u.kind==='machinegun')){
      this.units.push({id:this.nextId++,kind:'machinegun',x:35,y:220,hp:3,speed:35,waypoint:0,fireTimer:0,alive:true,step:0,phase:'advance',phaseTimer:0});
      this.machinegunTimer=24;this.events.push({kind:'machinegun',x:35,y:220});
    }
    const hostileLimit=this.difficulty==='rookie'?4:this.difficulty==='veteran'?6:5;
    if(this.spawnTimer<=0&&this.units.filter(u=>u.alive&&(u.kind==='raider'||u.kind==='sapper')).length<hostileLimit){
      const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.25:1;
      const sapper=this.random()<.28;
      this.units.push({id:this.nextId++,kind:sapper?'sapper':'raider',x:sapper?30:935,y:sapper?450:120+this.random()*190,hp:2,speed:(sapper?39:30)*d,waypoint:0,fireTimer:1.7+this.random(),alive:true,step:0});
      // Escalate with crossings, without letting a longer mission create an unlimited army.
      this.spawnTimer=(4.3-Math.max(0,this.released-1)*.12+this.random()*1.6)/d;
      if(sapper)this.events.push({kind:'enemy',x:30,y:450});
    }
    for(const u of this.units){
      if(!u.alive)continue;u.step+=dt*u.speed/10;
      let target:Point;
      if(u.kind==='dog'){
        const prey=this.units.find(p=>p.alive&&p.kind==='prisoner'&&p.id===u.preyId);
        // A pursuit belongs to one crossing; never ambush the next person from downfield.
        if(!prey){u.alive=false;continue;}
        if(prey.shelter!==undefined&&distance(u,prey)<=34)continue;
        if(prey.shelter===undefined&&distance(u,prey)<15){prey.alive=false;u.alive=false;this.lost++;this.events.push({kind:'loss',x:prey.x,y:prey.y,shooter:'enemy'});continue;}
        if(u.waypoint<prey.waypoint&&distance(u,ROUTE[u.waypoint])<6)u.waypoint++;
        target=u.waypoint<prey.waypoint?ROUTE[u.waypoint]:prey;
        const d=distance(u,target),travel=Math.min(d,u.speed*dt,prey.shelter!==undefined&&u.waypoint>=prey.waypoint?Math.max(0,d-33):Infinity);
        u.facing=target.x>=u.x?1:-1;
        u.x+=(target.x-u.x)/Math.max(d,1)*travel;u.y+=(target.y-u.y)/Math.max(d,1)*travel;
        continue;
      }else if(u.kind==='machinegun'){
        if(u.phase==='advance'){
          const d=distance(u,MACHINEGUN_POSITION),travel=Math.min(d,u.speed*dt);
          u.x+=(MACHINEGUN_POSITION.x-u.x)/Math.max(d,1)*travel;u.y+=(MACHINEGUN_POSITION.y-u.y)/Math.max(d,1)*travel;
          if(d<=travel){u.phase='setup';u.phaseTimer=1.5;u.aimPoint={x:340,y:274};}
        }else{
          u.phaseTimer=(u.phaseTimer??0)-dt;
          if(u.phase==='setup'&&u.phaseTimer<=0){u.phase='burst';u.phaseTimer=2.4;u.fireTimer=0;}
          if(u.phase==='burst'){
            // Sweep the exposed crossing, rather than tracking prisoners inside shelters.
            const sweep=Math.max(0,Math.min(1,1-(u.phaseTimer??0)/2.4));
            u.aimPoint={x:340+sweep*115,y:274+sweep*69};u.fireTimer-=dt;
            if((u.phaseTimer??0)<=0){
              u.phase='reload';u.phaseTimer=this.difficulty==='rookie'?9.5:this.difficulty==='veteran'?7.5:8.5;u.aimPoint=undefined;
              this.events.push({kind:'enemyreload',x:u.x,y:u.y});
            }else if(u.fireTimer<=0){
              const a=Math.atan2(u.aimPoint.y-u.y,u.aimPoint.x-u.x);
              this.bullets.push({x:u.x+Math.cos(a)*18,y:u.y+Math.sin(a)*18,vx:Math.cos(a)*260,vy:Math.sin(a)*260,side:'enemy',life:(distance(u,u.aimPoint)+45)/260});
              u.fireTimer=.24;this.events.push({kind:'enemyburst',x:u.x,y:u.y});
            }
          }else if(u.phase==='reload'&&u.phaseTimer<=0){u.phase='setup';u.phaseTimer=1.5;u.aimPoint={x:340,y:274};}
        }
        continue;
      }else if(u.kind==='prisoner'){
        if(u.shelter!==undefined)continue;
        target=ROUTE[u.waypoint];
        if(distance(u,target)<7){
          const shelter=SHELTERS.findIndex(s=>s.waypoint===u.waypoint);
          const occupants=this.units.filter(p=>p.alive&&p.shelter===shelter);
          if(this.coverOrdered&&this.commandDelay<=0&&shelter>=0&&occupants.length<SHELTERS[shelter].capacity){
            u.shelter=shelter;u.x=target.x;u.y=target.y;continue;
          }
          u.waypoint++;if(u.waypoint>=ROUTE.length){u.alive=false;this.rescued++;this.events.push({kind:'rescue',x:u.x,y:u.y});continue;}target=ROUTE[u.waypoint];
        }
      }else if(u.kind==='sapper'){
        target=GUN;if(distance(u,GUN)<35){u.alive=false;this.health-=22;this.events.push({kind:'hit',...GUN});continue;}
      }else{
        const candidates=this.units.filter(p=>p.alive&&p.kind==='prisoner'&&p.shelter===undefined);
        target=candidates.sort((a,b)=>distance(a,u)-distance(b,u))[0]||GUN;
        if(distance(u,target)<290)u.fireTimer-=dt;
        else{u.fireTimer=Math.max(.7,u.fireTimer);u.aimPoint=undefined;}
        if(u.fireTimer<=.7&&!u.aimPoint&&distance(u,target)<290)u.aimPoint={x:target.x,y:target.y};
        if(u.fireTimer<=0&&distance(u,target)<290){
          const spread=this.difficulty==='rookie'?90:this.difficulty==='veteran'?35:65;
          const aim=u.aimPoint||target;
          const a=Math.atan2(aim.y-u.y+(this.random()-.5)*spread,aim.x-u.x+(this.random()-.5)*spread);
          this.bullets.push({x:u.x,y:u.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,side:'enemy',life:2});u.fireTimer=2.5+this.random()*1.7;u.aimPoint=undefined;
        }
      }
      const d=distance(u,target);if(u.kind!=='raider'||d>135){u.x+=(target.x-u.x)/Math.max(d,1)*u.speed*dt;u.y+=(target.y-u.y)/Math.max(d,1)*u.speed*dt;}
    }
    for(const b of this.bullets){
      const previous={x:b.x,y:b.y};
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.life<=0)continue;
      if(WALLS.some(w=>hitsWall(previous,b,w))){b.life=0;this.events.push({kind:'hit',x:b.x,y:b.y});continue;}
      if(b.side==='enemy'&&segmentDistance(GUN,previous,b)<27){b.life=0;this.health-=7;this.events.push({kind:'hit',...GUN});continue;}
      for(const u of this.units){
        if(!u.alive||(b.side==='enemy'&&(u.kind!=='prisoner'||u.shelter!==undefined)))continue;
        const d=segmentDistance(u,previous,b);
        if(b.side==='player'&&u.kind==='prisoner'&&d<38&&d>=12&&this.nearTimer<=0){this.nearTimer=7;this.events.push({kind:'near',x:u.x,y:u.y});}
        if(d<12){b.life=0;u.hp--;this.events.push({kind:'hit',x:u.x,y:u.y});if(u.hp<=0){u.alive=false;if(u.kind==='prisoner'){this.lost++;this.events.push({kind:'loss',x:u.x,y:u.y,shooter:b.side});}else{this.kills++;if(u.kind==='machinegun')this.machinegunTimer=this.difficulty==='rookie'?12:this.difficulty==='veteran'?8:10;}}break;}
      }
    }
    this.units=this.units.filter(u=>u.alive);this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-10&&b.x<970&&b.y>-10&&b.y<610);
    this.health=Math.max(0,this.health);
    // Losing your position ends the operation even if the last rescue happens simultaneously.
    if(this.health<=0||this.lost>4||this.time>=MISSION_DURATION){this.state='lost';this.events.push({kind:'defeat',...GUN});}
    else if(this.rescued>=8){this.state='won';this.events.push({kind:'victory',...GUN});}
  }
  drainEvents(){const events=this.events;this.events=[];return events;}
}
