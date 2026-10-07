export type Point={x:number;y:number};
export type Unit=Point & {id:number;kind:'prisoner'|'raider'|'sapper';hp:number;speed:number;waypoint:number;fireTimer:number;alive:boolean;step:number};
export type Bullet=Point & {vx:number;vy:number;side:'player'|'enemy';life:number};
export type MissionEvent={kind:'shot'|'hit'|'rescue'|'loss'|'near'|'enemy'|'reload'|'victory'|'defeat';x:number;y:number;shooter?:'player'|'enemy'};
export const ROUTE:Point[]=[{x:90,y:138},{x:145,y:220},{x:270,y:280},{x:420,y:345},{x:660,y:405},{x:870,y:460}];
export const WALLS=[{x:230,y:188,w:170,h:22},{x:525,y:284,w:150,h:22}];
export const GUN={x:480,y:550};
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
  private releaseTimer=1;private spawnTimer=3;private nextId=0;private nearTimer=0;
  private random:()=>number;
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
    dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.fireCooldown-=dt;this.nearTimer-=dt;
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0)this.ammo=24;}
    this.releaseTimer-=dt;
    if(this.releaseTimer<=0&&this.released<12){this.units.push({id:this.nextId++,kind:'prisoner',...ROUTE[0],hp:1,speed:43,waypoint:1,fireTimer:0,alive:true,step:0});this.released++;this.releaseTimer=5.2;}
    this.spawnTimer-=dt;
    if(this.spawnTimer<=0){
      const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.25:1;
      const sapper=this.random()<.28;
      this.units.push({id:this.nextId++,kind:sapper?'sapper':'raider',x:sapper?30:935,y:sapper?450:120+this.random()*190,hp:2,speed:(sapper?39:30)*d,waypoint:0,fireTimer:1.7+this.random(),alive:true,step:0});
      this.spawnTimer=(4.3-this.time/100+this.random()*1.6)/d;
      if(sapper)this.events.push({kind:'enemy',x:30,y:450});
    }
    for(const u of this.units){
      if(!u.alive)continue;u.step+=dt*u.speed/10;
      let target:Point;
      if(u.kind==='prisoner'){
        target=ROUTE[u.waypoint];
        if(distance(u,target)<7){u.waypoint++;if(u.waypoint>=ROUTE.length){u.alive=false;this.rescued++;this.events.push({kind:'rescue',x:u.x,y:u.y});continue;}target=ROUTE[u.waypoint];}
      }else if(u.kind==='sapper'){
        target=GUN;if(distance(u,GUN)<35){u.alive=false;this.health-=22;this.events.push({kind:'hit',...GUN});continue;}
      }else{
        const candidates=this.units.filter(p=>p.alive&&p.kind==='prisoner');
        target=candidates.sort((a,b)=>distance(a,u)-distance(b,u))[0]||GUN;
        u.fireTimer-=dt;
        if(u.fireTimer<=0&&distance(u,target)<290){
          const spread=this.difficulty==='rookie'?90:this.difficulty==='veteran'?35:65;
          const a=Math.atan2(target.y-u.y+(this.random()-.5)*spread,target.x-u.x+(this.random()-.5)*spread);
          this.bullets.push({x:u.x,y:u.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,side:'enemy',life:2});u.fireTimer=2.5+this.random()*1.7;
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
        if(!u.alive||(b.side==='enemy'&&u.kind!=='prisoner'))continue;
        const d=segmentDistance(u,previous,b);
        if(b.side==='player'&&u.kind==='prisoner'&&d<38&&d>=12&&this.nearTimer<=0){this.nearTimer=7;this.events.push({kind:'near',x:u.x,y:u.y});}
        if(d<12){b.life=0;u.hp--;this.events.push({kind:'hit',x:u.x,y:u.y});if(u.hp<=0){u.alive=false;if(u.kind==='prisoner'){this.lost++;this.events.push({kind:'loss',x:u.x,y:u.y,shooter:b.side});}else this.kills++;}break;}
      }
    }
    this.units=this.units.filter(u=>u.alive);this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-10&&b.x<970&&b.y>-10&&b.y<610);
    this.health=Math.max(0,this.health);
    // Losing your position ends the operation even if the last rescue happens simultaneously.
    if(this.health<=0||this.lost>4||this.time>=120){this.state='lost';this.events.push({kind:'defeat',...GUN});}
    else if(this.rescued>=8){this.state='won';this.events.push({kind:'victory',...GUN});}
  }
  drainEvents(){const events=this.events;this.events=[];return events;}
}
