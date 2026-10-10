import {RescueMission,type Point} from './model.ts';
import {sweptDistance} from './defense.ts';
export const EXTRACTION_DURATION=100;
export const EXTRACTION_BOSS_TIME=72;
export type AirEnemy=Point & {id:number;kind:'jeep'|'tank'|'boat'|'fighter'|'gunship'|'aa'|'radar';hp:number;maxHp:number;age:number;fireTimer:number;warning:number;aim:Point;anchor:number;site?:number};
export type AirShot=Point & {vx:number;vy:number;side:'player'|'enemy';rocket:boolean;life:number;damage:number;missile?:boolean};
export type Supply=Point & {kind:'repair'|'rockets'};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export class ExtractionMission extends RescueMission{
  helicopter={x:480,y:450};moveX=0;moveY=0;target:Point|undefined;
  foes:AirEnemy[]=[];shots:AirShot[]=[];supplies:Supply[]=[];rockets=3;rocketCharge=0;rocketCooldown=0;damageFlash=0;invulnerable=0;bossStarted=false;bossCleared=false;score=0;
  private rng:()=>number;private serial=0;private spawnClock=2;private wave=0;private supplyClock=18;private installationClock=8;private installations=0;
  constructor(random:()=>number=Math.random,difficulty:'rookie'|'regular'|'veteran'='regular'){super(random,difficulty);this.rng=random;}
  get remaining(){return Math.max(0,EXTRACTION_DURATION-this.time);}
  override commandCover(_hold:boolean){return false;}
  override reload(){}
  override fire(){if(this.state!=='playing'||this.fireCooldown>0)return;this.fireCooldown=.14;for(const dx of [-10,10])this.shots.push({x:this.helicopter.x+dx,y:this.helicopter.y-28,vx:0,vy:-690,side:'player',rocket:false,life:1,damage:1});this.events.push({kind:'shot',...this.helicopter});}
  rocket(){if(this.state!=='playing'||this.rockets<=0||this.rocketCooldown>0)return;this.rockets--;this.rocketCooldown=.45;this.shots.push({x:this.helicopter.x,y:this.helicopter.y-30,vx:0,vy:-530,side:'player',rocket:true,life:1.5,damage:6});this.events.push({kind:'airrocket',...this.helicopter});}
  private spawn(kind:AirEnemy['kind'],x:number,y=65){const hp=kind==='aa'?14:kind==='radar'?10:kind==='gunship'?44:kind==='tank'?7:kind==='boat'?5:kind==='fighter'?3:2;const e:AirEnemy={id:this.serial++,kind,x,y,hp,maxHp:hp,age:0,fireTimer:1.5+this.rng(),warning:0,aim:{...this.helicopter},anchor:x};this.foes.push(e);return e;}
  private hurt(amount:number){if(this.invulnerable>0)return;this.health=Math.max(0,this.health-amount);this.invulnerable=.28;this.damageFlash=.45;this.events.push({kind:'helidamage',...this.helicopter});}
  private destroy(e:AirEnemy){this.kills++;this.score+=e.kind==='aa'?300:e.kind==='radar'?200:e.kind==='gunship'?1000:e.kind==='tank'?150:100;this.events.push({kind:'vehicledestroyed',x:e.x,y:e.y});if(e.kind==='gunship'){this.bossCleared=true;this.events.push({kind:'airclear',x:e.x,y:e.y});}}
  override update(dt:number){
    if(this.state!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;this.fireCooldown-=dt;this.rocketCooldown=Math.max(0,this.rocketCooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.damageFlash=Math.max(0,this.damageFlash-dt);
    if(this.rockets<3){this.rocketCharge+=dt;if(this.rocketCharge>=8){this.rockets++;this.rocketCharge-=8;}}else this.rocketCharge=0;
    let mx=this.moveX,my=this.moveY;if(mx||my)this.target=undefined;else if(this.target){mx=this.target.x-this.helicopter.x;my=this.target.y-this.helicopter.y;const d=Math.hypot(mx,my);if(d<260*dt){this.helicopter.x=this.target.x;this.helicopter.y=this.target.y;mx=my=0;this.target=undefined;}else{mx/=d;my/=d;}}
    const n=Math.max(1,Math.hypot(mx,my));this.helicopter.x=clamp(this.helicopter.x+mx/n*260*dt,130,830);this.helicopter.y=clamp(this.helicopter.y+my/n*260*dt,240,510);
    const d=this.difficulty==='rookie'?.8:this.difficulty==='veteran'?1.2:1;
    this.spawnClock-=dt;if(this.spawnClock<=0&&this.time<EXTRACTION_BOSS_TIME-3&&this.foes.length<8){
      const kind=(['jeep','fighter','boat','tank','fighter'] as const)[this.wave%5],count=kind==='fighter'?2:1;
      if(this.foes.length+count<=8){for(let i=0;i<count;i++)this.spawn(kind,kind==='boat'?480+Math.sin(this.time*.05)*65:210+((this.wave*137+i*220)%540),65-i*65);
      this.wave++;this.spawnClock=(this.time>35?2.8:3.5)/d;this.events.push({kind:'airwave',x:0,y:0});}
    }
    this.installationClock-=dt;
    if(this.installationClock<=0&&this.time<EXTRACTION_BOSS_TIME-4&&this.foes.filter(e=>e.kind==='aa'||e.kind==='radar').length<4){
      const left=this.installations%2===0,site=this.installations++;
      const battery=this.spawn('aa',left?225:735),radar=this.spawn('radar',left?290:670,-5);
      battery.site=radar.site=site;battery.fireTimer=.1;radar.fireTimer=100;
      this.installationClock=14;this.events.push({kind:'airinstallation',x:battery.x,y:battery.y});
    }
    this.supplyClock-=dt;if(this.supplyClock<=0&&this.time<90){this.supplies.push({x:210+this.rng()*540,y:85,kind:this.time<40||this.time>70?'repair':'rockets'});this.supplyClock=20;}
    if(this.time>=EXTRACTION_BOSS_TIME&&!this.bossStarted){this.bossStarted=true;this.spawn('gunship',480);this.events.push({kind:'airboss',x:480,y:90});}
    for(const e of this.foes){if(e.hp<=0)continue;e.age+=dt;
      const ground=e.kind==='aa'||e.kind==='radar';
      if(ground)e.y+=155*dt;
      else if(e.kind==='gunship'){e.y=Math.min(155,e.y+65*dt);e.x=480+Math.sin(e.age*.8)*210;}
      else{e.y+=(e.kind==='fighter'?92:57)*dt;if(e.kind==='fighter')e.x=e.anchor+Math.sin(e.age*2)*60;}
      const supported=e.kind==='aa'&&this.foes.some(r=>r.hp>0&&r.kind==='radar'&&r.site===e.site&&r.y<570);
      e.fireTimer-=dt;if(e.kind!=='radar'&&e.y>110&&(ground?e.y<530:e.y<this.helicopter.y-45)&&e.fireTimer<=0&&e.warning<=0){
        e.warning=e.kind==='aa'?.55:e.kind==='gunship'?.65:.85;
        e.aim=supported?{x:clamp(this.helicopter.x+mx/n*100,130,830),y:clamp(this.helicopter.y+my/n*100,240,510)}:{...this.helicopter};
      }
      if(e.warning>0){e.warning-=dt;if(e.warning<=0){const a=Math.atan2(e.aim.y-e.y,e.aim.x-e.x),spread=e.kind==='aa'?(supported?[-.15,0,.15]:[-.07,.07]):e.kind==='gunship'?(e.hp<22?[-.24,-.12,0,.12,.24]:[-.16,0,.16]):e.kind==='tank'?[-.08,.08]:[0];for(const offset of spread)this.shots.push({x:e.x,y:e.y+15,vx:Math.cos(a+offset)*(e.kind==='aa'?(supported?360:300):220)*d,vy:Math.sin(a+offset)*(e.kind==='aa'?(supported?360:300):220)*d,side:'enemy',rocket:false,damage:e.kind==='aa'?8:e.kind==='gunship'?8:6,life:3,missile:e.kind==='aa'});e.fireTimer=(e.kind==='aa'?(supported?.95:1.6):e.kind==='gunship'?1.45:2.8)/d;this.events.push({kind:'enemyburst',x:e.x,y:e.y});}}
      if(e.y>570){e.hp=0;continue;}if(!ground&&Math.hypot(e.x-this.helicopter.x,e.y-this.helicopter.y)<35){this.hurt(12);e.hp=0;this.events.push({kind:'vehicledestroyed',x:e.x,y:e.y});}
    }
    for(const s of this.shots){const prev={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)continue;
      if(s.side==='player'){const hit=this.foes.filter(e=>e.hp>0&&sweptDistance(e,prev,s)<(e.kind==='gunship'?43:e.kind==='aa'||e.kind==='radar'?34:e.kind==='fighter'?24:23)).sort((a,b)=>Math.hypot(a.x-prev.x,a.y-prev.y)-Math.hypot(b.x-prev.x,b.y-prev.y))[0];if(hit){s.life=0;const targets=s.rocket?this.foes.filter(e=>e.hp>0&&Math.hypot(e.x-hit.x,e.y-hit.y)<100):[hit];if(s.rocket)this.events.push({kind:'airblast',x:hit.x,y:hit.y});for(const e of targets){e.hp=Math.max(0,e.hp-s.damage);if(e.hp===0)this.destroy(e);else this.events.push({kind:'hit',x:e.x,y:e.y});}}}
      else if(sweptDistance(this.helicopter,prev,s)<17){s.life=0;this.hurt(s.damage);}
    }
    for(const p of this.supplies){p.y+=68*dt;if(Math.hypot(p.x-this.helicopter.x,p.y-this.helicopter.y)<34){if(p.kind==='repair')this.health=Math.min(100,this.health+18);else this.rockets=Math.min(3,this.rockets+2);this.events.push({kind:'airsupply',x:p.x,y:p.y});p.y=650;}}
    this.foes=this.foes.filter(e=>e.hp>0);this.shots=this.shots.filter(s=>s.life>0&&s.y>75&&s.y<580&&s.x>70&&s.x<890);this.supplies=this.supplies.filter(p=>p.y<580);
    if(this.health<=0||this.time>=130){this.state='lost';this.events.push({kind:'defeat',...this.helicopter});}
    else if(this.time>=EXTRACTION_DURATION&&this.bossCleared){this.state='won';this.events.push({kind:'victory',...this.helicopter});}
  }
}
