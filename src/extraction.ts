import {RescueMission,type Point} from './model.ts';
import {sweptDistance} from './defense.ts';
import {EXTRACTION_SCROLL_SPEED,extractionRiverX,extractionRoadX,extractionWorldY} from './extraction-terrain.ts';
export const EXTRACTION_DURATION=100;
export const EXTRACTION_BOSS_TIME=72;
export const EXTRACTION_REPAIR_TIMES=[12,34,56,78] as const;
export type AirEnemy=Point & {id:number;kind:'jeep'|'tank'|'boat'|'fighter'|'gunship'|'aa'|'radar';hp:number;maxHp:number;age:number;fireTimer:number;warning:number;aim:Point;anchor:number;site?:number;roadSide?:-1|1};
export type AirShot=Point & {vx:number;vy:number;side:'player'|'enemy';rocket:boolean;life:number;damage:number;missile?:boolean};
export type Supply=Point & {kind:'repair'|'rockets'};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export class ExtractionMission extends RescueMission{
  helicopter={x:480,y:450};moveX=0;moveY=0;target:Point|undefined;
  foes:AirEnemy[]=[];shots:AirShot[]=[];supplies:Supply[]=[];rockets=3;rocketCharge=0;rocketCooldown=0;damageFlash=0;invulnerable=0;bossStarted=false;bossCleared=false;score=0;departing=false;
  private rng:()=>number;private serial=0;private spawnClock=1;private wave=0;private repairIndex=0;private rocketSupplyClock=43;private installationClock=5;private installations=0;
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){super(random,difficulty);this.rng=random;}
  get remaining(){return Math.max(0,EXTRACTION_DURATION-this.time);}
  override commandCover(_hold:boolean){return false;}
  override reload(){}
  override fire(){if(this.state!=='playing'||this.departing||this.fireCooldown>0)return;this.fireCooldown=.14;for(const dx of [-10,10])this.shots.push({x:this.helicopter.x+dx,y:this.helicopter.y-28,vx:0,vy:-690,side:'player',rocket:false,life:1,damage:1});this.events.push({kind:'shot',...this.helicopter});}
  rocket(){if(this.state!=='playing'||this.departing||this.rockets<=0||this.rocketCooldown>0)return;this.rockets--;this.rocketCooldown=.45;this.shots.push({x:this.helicopter.x,y:this.helicopter.y-30,vx:0,vy:-530,side:'player',rocket:true,life:1.5,damage:6});this.events.push({kind:'airrocket',...this.helicopter});}
  private spawn(kind:AirEnemy['kind'],x:number,y=65){const hp=kind==='aa'?12:kind==='radar'?8:kind==='gunship'?56:kind==='tank'?10:kind==='boat'?7:3;const e:AirEnemy={id:this.serial++,kind,x,y,hp,maxHp:hp,age:0,fireTimer:.3+this.rng()*.4,warning:0,aim:{...this.helicopter},anchor:x};if(kind==='jeep'||kind==='tank'){e.roadSide=x<480?-1:1;e.x=extractionRoadX(extractionWorldY(y,this.time),e.roadSide);}else if(kind==='boat')e.x=extractionRiverX(extractionWorldY(y,this.time));this.foes.push(e);return e;}
  private hurt(amount:number){if(this.invulnerable>0)return;this.health=Math.max(0,this.health-amount);this.invulnerable=.28;this.damageFlash=.45;this.events.push({kind:'helidamage',...this.helicopter});}
  private destroy(e:AirEnemy){this.kills++;this.score+=e.kind==='aa'?300:e.kind==='radar'?200:e.kind==='gunship'?1000:e.kind==='tank'?150:100;this.events.push({kind:'vehicledestroyed',x:e.x,y:e.y});if(e.kind==='gunship'){this.bossCleared=true;this.events.push({kind:'airclear',x:e.x,y:e.y});}}
  override update(dt:number){
    if(this.state!=='playing')return;dt=clamp(dt,0,.05);
    if(this.departing){this.time+=dt;this.helicopter.y-=230*dt;this.damageFlash=Math.max(0,this.damageFlash-dt);if(this.helicopter.y<-80){this.state='won';this.events.push({kind:'victory',...this.helicopter});}return;}this.time+=dt;this.fireCooldown-=dt;this.rocketCooldown=Math.max(0,this.rocketCooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.damageFlash=Math.max(0,this.damageFlash-dt);
    if(this.rockets<3){this.rocketCharge+=dt;if(this.rocketCharge>=8){this.rockets++;this.rocketCharge-=8;}}else this.rocketCharge=0;
    let mx=this.moveX,my=this.moveY;if(mx||my)this.target=undefined;else if(this.target){mx=this.target.x-this.helicopter.x;my=this.target.y-this.helicopter.y;const d=Math.hypot(mx,my);if(d<260*dt){this.helicopter.x=this.target.x;this.helicopter.y=this.target.y;mx=my=0;this.target=undefined;}else{mx/=d;my/=d;}}
    const n=Math.max(1,Math.hypot(mx,my));this.helicopter.x=clamp(this.helicopter.x+mx/n*260*dt,130,830);this.helicopter.y=clamp(this.helicopter.y+my/n*260*dt,240,510);
    const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.2:1;
    this.spawnClock-=dt;if(this.spawnClock<=0&&this.time<EXTRACTION_BOSS_TIME-3&&this.foes.length<10){
      const kind=(['fighter','jeep','boat','tank','fighter'] as const)[this.wave%5],count=kind==='fighter'?(this.time>12?3:2):1;
      if(this.foes.length+count<=10){for(let i=0;i<count;i++){const foe=this.spawn(kind,this.wave===0?380+i*200:kind==='boat'?480+Math.sin(this.time*.05)*65:210+((this.wave*137+i*220)%540),kind==='fighter'?140-i*35:65);if(this.wave===0)foe.fireTimer=.25;}
      this.wave++;this.spawnClock=(this.time>25?1.5:1.9)/d;this.events.push({kind:'airwave',x:0,y:0});}
    }
    this.installationClock-=dt;
    if(this.installationClock<=0&&this.time<EXTRACTION_BOSS_TIME-4&&this.foes.filter(e=>e.kind==='aa'||e.kind==='radar').length<4){
      const left=this.installations%2===0,site=this.installations++;
      const bank=left?-1:1,center=extractionRiverX(extractionWorldY(30,this.time));
      const battery=this.spawn('aa',center+bank*255),radar=this.spawn('radar',center+bank*190,-5);
      battery.site=radar.site=site;battery.fireTimer=.1;radar.fireTimer=100;
      this.installationClock=8;this.events.push({kind:'airinstallation',x:battery.x,y:battery.y});
    }
    while(this.repairIndex<EXTRACTION_REPAIR_TIMES.length&&this.time>=EXTRACTION_REPAIR_TIMES[this.repairIndex]){this.supplies.push({x:210+this.rng()*540,y:85,kind:'repair'});this.repairIndex++;}
    this.rocketSupplyClock-=dt;if(this.rocketSupplyClock<=0&&this.time<90){this.supplies.push({x:210+this.rng()*540,y:85,kind:'rockets'});this.rocketSupplyClock+=25;}
    if(this.time>=EXTRACTION_BOSS_TIME&&!this.bossStarted){this.bossStarted=true;this.spawn('gunship',480);this.events.push({kind:'airboss',x:480,y:90});}
    for(const e of this.foes){if(e.hp<=0)continue;e.age+=dt;
      const ground=e.kind==='aa'||e.kind==='radar';
      if(ground)e.y+=EXTRACTION_SCROLL_SPEED*dt;
      else if(e.kind==='gunship'){e.y=Math.min(155,e.y+65*dt);e.x=480+Math.sin(e.age*.8)*210;}
      else{e.y+=(e.kind==='fighter'?92:57)*dt;if(e.kind==='fighter')e.x=e.anchor+Math.sin(e.age*2)*60;else if(e.roadSide)e.x=extractionRoadX(extractionWorldY(e.y,this.time),e.roadSide);else if(e.kind==='boat')e.x=extractionRiverX(extractionWorldY(e.y,this.time));}
      const supported=e.kind==='aa'&&this.foes.some(r=>r.hp>0&&r.kind==='radar'&&r.site===e.site&&r.y<570);
      e.fireTimer-=dt;if(e.kind!=='radar'&&e.y>110&&(ground?e.y<530:e.y<(e.kind==='fighter'?530:this.helicopter.y-45))&&e.fireTimer<=0&&e.warning<=0){
        e.warning=e.kind==='aa'?.55:e.kind==='gunship'?.5:.4;
        const lead=supported?100:e.kind==='fighter'||e.kind==='gunship'?75:0;
        e.aim=lead?{x:clamp(this.helicopter.x+mx/n*lead,130,830),y:clamp(this.helicopter.y+my/n*lead,240,510)}:{...this.helicopter};
      }
      if(e.warning>0){e.warning-=dt;if(e.warning<=0){const a=Math.atan2(e.aim.y-(e.y+15),e.aim.x-e.x),spread=e.kind==='aa'?(supported?[-.15,0,.15]:[-.07,.07]):e.kind==='gunship'?(e.hp<e.maxHp/2?[-.24,-.12,0,.12,.24]:[-.16,0,.16]):e.kind==='tank'?[-.08,.08]:[0];for(const offset of spread)this.shots.push({x:e.x,y:e.y+15,vx:Math.cos(a+offset)*(e.kind==='aa'?(supported?360:300):360)*d,vy:Math.sin(a+offset)*(e.kind==='aa'?(supported?360:300):360)*d,side:'enemy',rocket:false,damage:e.kind==='gunship'?8:6,life:3,missile:e.kind==='aa'});e.fireTimer=(e.kind==='aa'?(supported?.95:1.6):e.kind==='gunship'?.95:1.15)/d;this.events.push({kind:'enemyburst',x:e.x,y:e.y});}}
      if(e.y>570){e.hp=0;continue;}if(!ground&&Math.hypot(e.x-this.helicopter.x,e.y-this.helicopter.y)<35){this.hurt(12);e.hp=0;this.events.push({kind:'vehicledestroyed',x:e.x,y:e.y});}
    }
    for(const s of this.shots){const prev={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)continue;
      if(s.side==='player'){const hit=this.foes.filter(e=>e.hp>0&&sweptDistance(e,prev,s)<(e.kind==='gunship'?43:e.kind==='aa'||e.kind==='radar'?34:e.kind==='fighter'?24:23)).sort((a,b)=>Math.hypot(a.x-prev.x,a.y-prev.y)-Math.hypot(b.x-prev.x,b.y-prev.y))[0];if(hit){s.life=0;const targets=s.rocket?this.foes.filter(e=>e.hp>0&&Math.hypot(e.x-hit.x,e.y-hit.y)<100):[hit];if(s.rocket)this.events.push({kind:'airblast',x:hit.x,y:hit.y});for(const e of targets){e.hp=Math.max(0,e.hp-s.damage);if(e.hp===0)this.destroy(e);else this.events.push({kind:'hit',x:e.x,y:e.y});}}}
      else if(sweptDistance(this.helicopter,prev,s)<17){s.life=0;this.hurt(s.damage);}
    }
    for(const p of this.supplies){p.y+=68*dt;if(Math.hypot(p.x-this.helicopter.x,p.y-this.helicopter.y)<34){if(p.kind==='repair')this.health=Math.min(100,this.health+50);else this.rockets=Math.min(3,this.rockets+2);this.events.push({kind:'airsupply',x:p.x,y:p.y});p.y=650;}}
    this.foes=this.foes.filter(e=>e.hp>0);this.shots=this.shots.filter(s=>s.life>0&&s.y>75&&s.y<580&&s.x>70&&s.x<890);this.supplies=this.supplies.filter(p=>p.y<580);
    if(this.health<=0||this.time>=130){this.state='lost';this.events.push({kind:'defeat',...this.helicopter});}
    else if(this.time>=EXTRACTION_DURATION&&this.bossCleared){this.departing=true;this.target=undefined;this.moveX=this.moveY=0;this.shots=[];this.foes=[];this.supplies=[];}
  }
}
