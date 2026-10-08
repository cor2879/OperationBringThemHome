import type * as PhaserType from 'phaser';
import { RescueMission, ROUTE, WALLS, SHELTERS, GUN, MISSION_DURATION, type MissionEvent, type Unit } from './model.ts';
import './style.css';
import retroScreamUrl from './audio/retro-scream.ts';
import { TouchControls, touchAngle } from './controls.ts';
import radioClips from './audio/radio-clips.ts';
import { RadioVoice } from './audio/radio.ts';
declare const Phaser: typeof PhaserType;

const $=(id:string)=>document.getElementById(id)!;
const held=new Set<string>();
let firing=false;
const touch=new TouchControls();
const mobileLayout=()=>matchMedia('(pointer:coarse), (max-width:650px)').matches||new URLSearchParams(location.search).get('controls')==='touch';
document.body.classList.toggle('touch-layout',mobileLayout());
function updateTouchCover(){ $('touch-cover').textContent=touch.cover?'GO!':'TAKE COVER';$('touch-cover').setAttribute('aria-pressed',String(touch.cover)); }
const coverPointers=new Set<number>();
let soundOn=true,voiceOn=true;
try{soundOn=localStorage.getItem('obth-sound')!=='off';voiceOn=localStorage.getItem('obth-voice')!=='off';}catch{}
let audio:AudioContext|undefined;
let screamBuffer:AudioBuffer|undefined;
let screamLoading:Promise<void>|undefined;
let activeScream:AudioBufferSourceNode|undefined;
const radioVoice=new RadioVoice(radioClips);radioVoice.setEnabled(voiceOn);
function stopVoice(){radioVoice.stop();}
function flushVoice(){radioVoice.setBlocked(false);}
function unlockAudio(){
  audio??=new AudioContext();if(audio.state==='suspended')void audio.resume();
  void radioVoice.prepare(audio);
  screamLoading??=fetch(retroScreamUrl).then(r=>r.arrayBuffer()).then(bytes=>audio!.decodeAudioData(bytes)).then(buffer=>{screamBuffer=buffer;}).catch(()=>{});
}
function stopScream(){const source=activeScream;activeScream=undefined;if(source){source.onended=null;source.stop();source.disconnect();}radioVoice.setBlocked(false);}
function casualtyScream(){
  if(!soundOn||!audio)return;
  if(!screamBuffer){tone(130,.3,'sawtooth');return;}
  // One voice at a time: clustered casualties should not stack loud samples.
  if(activeScream)return;
  const source=audio.createBufferSource(),gain=audio.createGain();
  source.buffer=screamBuffer;gain.gain.value=.3;
  radioVoice.setBlocked(true);
  source.connect(gain);gain.connect(audio.destination);activeScream=source;
  source.onended=()=>{source.disconnect();gain.disconnect();if(activeScream===source){activeScream=undefined;flushVoice();}};source.start();
}
function tone(frequency:number,duration:number,type:OscillatorType='square',volume=.035){
  if(!soundOn||!audio)return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=frequency;
  g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
  o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
}
function gunSound(){if(!soundOn||!audio)return;tone(95,.055,'sawtooth',.06);tone(650,.024,'square',.018);}
function speak(line:string){
  radioVoice.say(line);
}
type Spark={x:number;y:number;life:number;color:number;vx:number;vy:number};
const overlay=document.createElement('div');overlay.className='briefing';$('game').append(overlay);
overlay.innerHTML='<p class="eyebrow">OPERATION ORDER / SECTOR 07</p><h2>ONE CROSSING AT A TIME.</h2><p>Twelve prisoners. Bring eight home in six minutes.<br>Only one escapee leaves at a time. Protect every crossing.<br>Orange uniforms are friendly. Red helmets are hostile.<br>Hold C / COVER at the next shelter. Release to GO!<br>Green machine-gun reload bars signal an opening.</p><div class="difficulty"><label for="difficulty">AI DIFFICULTY</label><select id="difficulty"><option value="rookie">ROOKIE</option><option value="regular" selected>REGULAR</option><option value="veteran">VETERAN</option></select></div><button id="begin">BEGIN OPERATION →</button><small>Mouse: aim + hold click · Keyboard: A/D + Space<br>Touch: aiming slider + hold FIRE</small>';
let scene:RescueScene;
if(mobileLayout()){
  overlay.querySelector('h2 + p')!.innerHTML='Bring eight of twelve home in six minutes.<br>One escapee at a time. Orange is friendly; red is hostile.<br>Tap TAKE COVER at a shelter; tap GO! to move.<br>Green machine-gun reload bars signal an opening.';
  overlay.querySelector('small')!.textContent='Left thumb: aim slider · Right thumb: hold FIRE / tap COVER';
}
class RescueScene extends Phaser.Scene{
  mission=new RescueMission();started=false;paused=false;
  ink!:PhaserType.GameObjects.Graphics;hud!:PhaserType.GameObjects.Text;machinegunStatus!:PhaserType.GameObjects.Text;escapeeStatus!:PhaserType.GameObjects.Text;
  radio!:PhaserType.GameObjects.Text;radioTime=0;radioCooldown=0;sparks:Spark[]=[];
  aim={x:480,y:220};pointerHeld=false;tick=0;lastState='';
  constructor(){super('Rescue');scene=this;}
  create(){
    const field=this.add.graphics();this.drawField(field);
    this.ink=this.add.graphics();
    this.hud=this.add.text(20,18,'',{fontFamily:'monospace',fontSize:'17px',color:'#e7e8cf',lineSpacing:8}).setDepth(10);
    this.machinegunStatus=this.add.text(23,572,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffbd70'}).setDepth(10).setVisible(false);
    this.escapeeStatus=this.add.text(610,572,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffdb96'}).setDepth(10);
    this.radio=this.add.text(480,86,'',{fontFamily:'monospace',fontSize:'18px',color:'#ffe1a1',backgroundColor:'#101713',padding:{x:14,y:8},align:'center'}).setOrigin(.5).setDepth(10);
    this.input.on('pointerdown',(p:PhaserType.Input.Pointer)=>{
      if(!this.started||this.paused||this.mission.state!=='playing'||mobileLayout())return;
      this.focus();unlockAudio();this.aimAt(p.x,p.y);
      if(!matchMedia('(pointer:coarse)').matches)this.pointerHeld=true;
    });
    this.input.on('pointermove',(p:PhaserType.Input.Pointer)=>{
      if(!this.started||this.paused||mobileLayout())return;
      if(!matchMedia('(pointer:coarse)').matches||p.isDown)this.aimAt(p.x,p.y);
    });
    this.input.on('pointerup',()=>{this.pointerHeld=false;});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','Operation Bring Them Home rescue game');
    this.draw();
  }
  focus(){this.game.canvas.focus({preventScroll:true});}
  aimAt(x:number,y:number){this.aim={x,y};this.mission.angle=Phaser.Math.Clamp(Math.atan2(y-GUN.y,x-GUN.x),-Math.PI+.08,-.08);}
  start(){
    const difficulty=($('difficulty') as HTMLSelectElement|null)?.value||this.mission.difficulty;
    this.mission=new RescueMission(Math.random,difficulty as 'rookie'|'regular'|'veteran');this.started=true;this.paused=false;this.sparks=[];this.pointerHeld=false;held.clear();coverPointers.clear();firing=false;
    touch.reset();updateTouchCover();($('touch-aim') as HTMLInputElement).value='50';
    stopVoice();stopScream();this.lastState='';overlay.hidden=true;$('pause').textContent='PAUSE';this.focus();unlockAudio();this.callout('CONTROL','Prisoners are moving. Cover the route.',true);this.updateStatus();
  }
  callout(speaker:string,line:string,force=false,voiced=true){
    if(!force&&this.radioCooldown>0)return;
    this.radio.setText(speaker+' / '+line);this.radioTime=3.2;this.radioCooldown=5;if(voiced)speak(line);
  }
  setPause(paused:boolean){
    if(!this.started||this.mission.state!=='playing')return;
    this.paused=paused;held.clear();coverPointers.clear();touch.reset();updateTouchCover();this.mission.commandCover(false);firing=false;this.pointerHeld=false;
    if(paused){stopVoice();stopScream();overlay.hidden=false;overlay.innerHTML='<p class="eyebrow">OPERATION ON HOLD</p><h2>PAUSED</h2><p>Your mission is waiting.</p><button id="resume">RESUME OPERATION →</button><button id="restart">RESTART MISSION</button>';}
    else{overlay.hidden=true;this.focus();}
    $('pause').textContent=paused?'RESUME':'PAUSE';this.updateStatus();
  }
  updateStatus(){
    $('mission-status').textContent=!this.started?'AWAITING YOUR COMMAND':this.paused?'OPERATION PAUSED':this.mission.state==='won'?'EXTRACTION COMPLETE':this.mission.state==='lost'?'OPERATION LOST':'COVERING THE ESCAPE';
  }
  handleEvent(e:MissionEvent){
    if(e.kind==='shot'){gunSound();this.burst(e.x+Math.cos(this.mission.angle)*28,e.y+Math.sin(this.mission.angle)*28,0xffd089,3);}
    if(e.kind==='hit')this.burst(e.x,e.y,0xffbf65,7);
    if(e.kind==='rescue'){tone(620,.15,'triangle',.04);this.callout('PRISONER',['We made it! Keep them coming!','One more heading home!','Thank you! Get the others!'][this.mission.rescued%3]);}
    if(e.kind==='near')this.callout('PRISONER',"Easy! We're on your side!");
    if(e.kind==='loss'){
      const friendlyFire=e.shooter==='player';
      // The spoken protest replaces the scream on friendly-fire casualties.
      if(!friendlyFire&&soundOn&&Math.random()<1/6){stopVoice();casualtyScream();}
      this.callout(friendlyFire?'PRISONER':'CONTROL',friendlyFire?"Hey! Don't shoot me!":'We lost one. Watch the orange uniforms.',true);
    }
    if(e.kind==='enemy')this.callout('CONTROL','Sapper on the left. Protect your position.');
    if(e.kind==='machinegun')this.callout('CONTROL','Machine gun on the left. Get them to cover!',true);
    if(e.kind==='enemyreload')this.callout('CONTROL','Machine gun reloading. Move them now!',false);
    if(e.kind==='enemyburst'){tone(100,.05,'sawtooth',.025);this.burst(e.x+18,e.y,0xffd089,3);}
    if(e.kind==='reload'){tone(360,.07);}
  }
  update(_time:number,delta:number){
    const dt=Math.min(delta/1000,.05);this.tick+=dt;
    if(!this.paused){
      this.radioCooldown-=dt;this.radioTime-=dt;if(this.radioTime<=0)this.radio.setText('');
      if(this.started&&this.mission.state==='playing'){
        const cover=held.has('KeyC')||coverPointers.size>0||touch.cover;
        if(this.mission.commandCover(cover))this.callout('SQUAD',cover?'Take cover! Stop at the next shelter!':'Moving! Cover us!',true);
        $('cover').setAttribute('aria-pressed',String(cover));
        $('cover').textContent=cover?'IN COVER · RELEASE TO GO':'HOLD: TAKE COVER';
        const direction=(held.has('KeyD')||held.has('ArrowRight')?1:0)-(held.has('KeyA')||held.has('ArrowLeft')?1:0);
        if(direction){this.mission.angle=Phaser.Math.Clamp(this.mission.angle+direction*1.6*dt,-Math.PI+.08,-.08);this.aim={x:GUN.x+Math.cos(this.mission.angle)*380,y:GUN.y+Math.sin(this.mission.angle)*380};}
        if(held.has('Space')||firing||touch.firing||this.pointerHeld)this.mission.fire();
        this.mission.update(dt);this.mission.drainEvents().forEach(e=>this.handleEvent(e));
        if(this.mission.state!=='playing'&&this.lastState!==this.mission.state){this.lastState=this.mission.state;this.finish();}
      }
      for(const s of this.sparks){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}this.sparks=this.sparks.filter(s=>s.life>0);
    }
    this.draw();
  }
  finish(){
    held.clear();touch.reset();updateTouchCover();firing=false;this.pointerHeld=false;this.updateStatus();
    const won=this.mission.state==='won',m=this.mission;
    this.callout('CONTROL',won?'Extraction confirmed. You brought them home.':'Pull back. The operation is over.',true);
    overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT</p><h2>${won?'THEY ARE COMING HOME.':'OPERATION LOST.'}</h2><p>${won?'Your covering fire made the difference.':m.health<=0?'Your gun position was overrun.':m.lost>4?'Too many prisoners were lost.':'The extraction window closed.'}</p><div class="report"><span><b>${m.rescued}</b>RESCUED</span><span><b>${m.lost}</b>LOST</span><span><b>${m.kills}</b>HOSTILES</span></div><button id="restart">TRY ANOTHER OPERATION →</button><small>${won?'Next up: the helicopter escape.':'Aim ahead of moving targets. Reload between waves.'}</small>`;
  }
  burst(x:number,y:number,color:number,n:number){for(let i=0;i<n;i++)this.sparks.push({x,y,color,life:.2+Math.random()*.2,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100});}
  drawField(g:PhaserType.GameObjects.Graphics){
    g.fillStyle(0x293728);g.fillRect(0,0,960,600);
    // Deterministic field texture: terrain details remain still during combat.
    let seed=47;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<1600;i++){const x=rand()*960,y=rand()*600;g.fillStyle(i%2?0x344431:0x223121,.6);g.fillRect(x,y,2+rand()*5,2);}
    g.fillStyle(0x1c2822);g.fillRect(0,70,180,130);g.fillStyle(0x606958);g.fillRect(15,81,157,13);g.fillRect(15,81,12,116);g.fillRect(15,184,160,13);
    for(let x=32;x<164;x+=12){g.lineStyle(1,0xa1ac8a,.6);g.lineBetween(x,94,x,184);}g.fillStyle(0x111e19);g.fillRect(79,131,104,32);
    this.add.text(30,111,'HOLDING\nCOMPOUND',{fontFamily:'monospace',fontSize:'12px',color:'#a8b398'});
    g.lineStyle(30,0x596047,.5);g.beginPath();g.moveTo(ROUTE[0].x,ROUTE[0].y);ROUTE.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();
    g.lineStyle(2,0xc1b680,.35);
    for(let i=1;i<ROUTE.length;i++){const a=ROUTE[i-1],b=ROUTE[i],d=Math.hypot(b.x-a.x,b.y-a.y);for(let t=0;t<d;t+=24){g.lineBetween(a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d,a.x+(b.x-a.x)*Math.min(t+10,d)/d,a.y+(b.y-a.y)*Math.min(t+10,d)/d);}}
    for(const w of WALLS){g.fillStyle(0x101a16,.5);g.fillRect(w.x+5,w.y+8,w.w,w.h);g.fillStyle(0x92906b);g.fillRect(w.x,w.y,w.w,w.h);for(let x=w.x;x<w.x+w.w;x+=23){g.lineStyle(2,0x5c624a);g.lineBetween(x,w.y,x,w.y+w.h);}}
    this.add.text(255,168,'COVER A',{fontFamily:'monospace',fontSize:'11px',color:'#b7b992'});this.add.text(550,265,'COVER B',{fontFamily:'monospace',fontSize:'11px',color:'#b7b992'});
    SHELTERS.forEach((s,i)=>this.add.text(s.x-32,s.y+29,'SHELTER '+(i?'B':'A'),{fontFamily:'monospace',fontSize:'10px',color:'#d9c08f'}));
    // Extraction truck and perimeter.
    g.fillStyle(0x19261c);g.fillRect(818,431,125,64);g.lineStyle(2,0xa6ba82);g.strokeRect(818,431,125,64);
    g.fillStyle(0x586d43);g.fillRect(862,436,62,45);g.fillStyle(0x6f8551);g.fillRect(925,446,20,35);g.fillStyle(0xa9c5bb);g.fillRect(928,449,13,10);g.fillStyle(0x0c1510);g.fillRect(873,478,13,9);g.fillRect(927,478,13,9);
    this.add.text(824,408,'EXTRACTION →',{fontFamily:'monospace',fontSize:'13px',color:'#c2dca2'});
    // Hostile fortification.
    g.fillStyle(0x1a251e);g.fillRect(830,99,130,148);g.lineStyle(2,0x55614a);g.strokeRect(830,99,130,148);g.fillStyle(0x584d40);g.fillRect(851,124,95,49);g.fillStyle(0x1b2018);g.fillRect(864,133,65,15);
    this.add.text(835,77,'HOSTILE SECTOR',{fontFamily:'monospace',fontSize:'11px',color:'#c29677'});
    // Player gun pit.
    g.fillStyle(0x131d18);g.fillEllipse(480,551,119,68);g.lineStyle(12,0x7a7c58);g.strokeEllipse(480,555,124,64);
    g.fillStyle(0x18241d,.95);g.fillRect(0,0,960,62);g.lineStyle(1,0x7a8e62);g.lineBetween(0,62,960,62);
    // A subtle scanline treatment.
    for(let y=0;y<600;y+=4){g.fillStyle(0x000000,.055);g.fillRect(0,y,960,1);}
  }
  drawUnit(g:PhaserType.GameObjects.Graphics,u:Unit){
    const x=Math.round(u.x),y=Math.round(u.y),step=Math.sin(u.step)>0?2:-2;
    if(u.kind==='machinegun'){
      const color=u.phase==='reload'?0xa9d989:u.phase==='burst'?0xff694c:0xffbd70;
      g.lineStyle(2,color);g.strokeCircle(x,y,21);
      if(u.phase!=='advance'){
        g.fillStyle(0x101b16,.9);g.fillRect(x-31,y-35,62,9);
        const duration=u.phase==='reload'?(this.mission.difficulty==='rookie'?9.5:this.mission.difficulty==='veteran'?7.5:8.5):u.phase==='burst'?2.4:1.5;
        g.fillStyle(color);g.fillRect(x-30,y-34,60*Math.max(0,(u.phaseTimer??0)/duration),7);
        g.lineStyle(3,0x172119);g.lineBetween(x+5,y+2,x+19,y+12);g.lineBetween(x+5,y+2,x-3,y+13);g.lineBetween(x,y,x+25,y);
      }
    }
    if(u.aimPoint){g.lineStyle(1,0xff7654,.55);g.lineBetween(x,y,u.aimPoint.x,u.aimPoint.y);g.lineStyle(2,0xffbd70);g.strokeCircle(x,y,19+Math.sin(this.tick*16)*3);}
    if(u.shelter!==undefined){g.fillStyle(0xe9a153);g.fillRect(x-6,y-3,12,8);g.fillStyle(0xd3b993);g.fillRect(x-3,y-8,6,5);return;}
    g.fillStyle(0x0a130e,.45);g.fillEllipse(x+2,y+10,18,7);
    const uniform=u.kind==='prisoner'?0xe9a153:u.kind==='sapper'?0x866d53:0x6b7856;
    g.fillStyle(0xd3b993);g.fillRect(x-3,y-12,6,5);g.fillStyle(uniform);g.fillRect(x-5,y-6,10,10);g.fillRect(x-8,y-4+step,3,8);g.fillRect(x+5,y-4-step,3,8);
    g.fillStyle(0x242d20);g.fillRect(x-5,y+4,4,7+step);g.fillRect(x+1,y+4,4,7-step);
    if(u.kind!=='prisoner'){g.fillStyle(0xc76648);g.fillRect(x-5,y-14,10,4);g.fillStyle(0x1c241d);g.fillRect(x-7,y-1,14,3);if(u.kind==='sapper'){g.fillStyle(0xc9ac6b);g.fillRect(x-4,y-3,8,5);}}
    if(u.hp===1&&u.kind!=='prisoner'){g.fillStyle(0xdfb270);g.fillRect(x-7,y-19,7,2);}
  }
  draw(){
    const m=this.mission,g=this.ink;g.clear();
    SHELTERS.forEach((s,i)=>{const count=m.units.filter(u=>u.shelter===i).length;g.fillStyle(0x16271e,.9);g.fillRoundedRect(s.x-32,s.y-17,64,34,6);g.lineStyle(2,m.coverOrdered?0xe5aa63:0x8fa67a);g.strokeRoundedRect(s.x-32,s.y-17,64,34,6);for(let slot=0;slot<s.capacity;slot++){g.fillStyle(slot<count?0xe9a153:0x52614a);g.fillRect(s.x-21+slot*17,s.y+19,12,5);}});
    m.units.forEach(u=>this.drawUnit(g,u));
    const escapee=m.units.find(u=>u.kind==='prisoner');
    g.fillStyle(0x101b16,.9);g.fillRect(601,565,345,25);
    this.escapeeStatus.setText(escapee?`ESCAPEE ${String(m.released).padStart(2,'0')}/12 · ${escapee.shelter===undefined?'MOVING':'COVER '+(escapee.shelter===0?'A':'B')}`:m.released<12?'NEXT ESCAPEE · STAND BY':'ALL CROSSINGS COMPLETE');
    const machinegun=m.units.find(u=>u.kind==='machinegun');
    if(machinegun){const phase=machinegun.phase;
      // Persistent instruction stays visible even when another radio line takes priority.
      g.fillStyle(0x101b16,.9);g.fillRect(15,565,345,25);
      const label=phase==='reload'?'MG RELOADING · GO!':phase==='advance'?'MACHINE GUN INBOUND · LEFT':phase==='setup'?'MG SETTING UP · TAKE COVER':'MG FIRING · STAY IN COVER';
      this.machinegunStatus.setText(label).setVisible(true).setColor(phase==='reload'?'#a9d989':'#ffbd70');
    }else this.machinegunStatus.setVisible(false);
    m.bullets.forEach(b=>{g.lineStyle(b.side==='player'?3:2,b.side==='player'?0xffe3a1:0xe47051);g.lineBetween(b.x,b.y,b.x-b.vx*.012,b.y-b.vy*.012);});
    g.fillStyle(0x879071);g.fillCircle(GUN.x,GUN.y,18);g.lineStyle(11,0x222c23);g.lineBetween(GUN.x,GUN.y,GUN.x+Math.cos(m.angle)*38,GUN.y+Math.sin(m.angle)*38);g.lineStyle(5,0xc1b98e);g.lineBetween(GUN.x,GUN.y,GUN.x+Math.cos(m.angle)*40,GUN.y+Math.sin(m.angle)*40);
    g.fillStyle(0xbeab83);g.fillRect(470,546,20,15);g.fillStyle(0x283c27);g.fillRect(474,541,12,8);
    if(this.started&&m.state==='playing'){
      const x=this.aim.x,y=Math.min(this.aim.y,515);g.lineStyle(1,0xf2d69b,.8);g.strokeCircle(x,y,14);g.lineBetween(x-21,y,x-7,y);g.lineBetween(x+7,y,x+21,y);g.lineBetween(x,y-21,x,y-7);g.lineBetween(x,y+7,x,y+21);
    }
    for(const s of this.sparks){g.fillStyle(s.color,Math.min(1,s.life*5));g.fillRect(s.x,s.y,3,3);}
    const remaining=Math.max(0,MISSION_DURATION-Math.floor(m.time)),seconds=String(remaining%60).padStart(2,'0');
    this.hud.setText(`RESCUED ${String(m.rescued).padStart(2,'0')} / 08     LOST ${m.lost} / 04     GUN ${m.health}%     ${Math.floor(remaining/60)}:${seconds}\n${m.reloadTime>0?'RELOADING '+m.reloadTime.toFixed(1)+'s':'AMMO '+String(m.ammo).padStart(2,'0')+' / 24'}     HOSTILES ${m.kills}     ${m.difficulty.toUpperCase()}`);
    // Extraction progress remains visible without reading the HUD.
    for(let i=0;i<8;i++){g.fillStyle(i<m.rescued?0xc8df94:0x40523b);g.fillRect(785+i*19,24,13,18);}
    if(m.reloadTime>0){g.lineStyle(4,0xe5aa63);g.beginPath();g.arc(480,550,26,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-m.reloadTime/1.65));g.strokePath();}
  }
}

if(typeof Phaser==='undefined'){
  overlay.innerHTML='<h2>ENGINE COULD NOT LOAD</h2><p>Check your connection and reload the page.</p>';
}else{
  new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:600,backgroundColor:'#293728',pixelArt:true,antialias:false,scene:RescueScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:3},audio:{noAudio:true}});
}
overlay.addEventListener('click',e=>{
  const id=(e.target as HTMLElement).id;
  if(id==='begin'||id==='restart')scene.start();if(id==='resume')scene.setPause(false);
});
const controlKeys=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyC','KeyR','KeyP','Escape','Enter']);
document.addEventListener('keydown',e=>{
  if(e.target===$('touch-aim'))return;
  if(!scene?.started||scene.mission.state!=='playing'||!controlKeys.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
  e.preventDefault();e.stopPropagation();unlockAudio();held.add(e.code);
  if(!e.repeat){if(e.code==='Space'&&!scene.paused)scene.mission.fire();if(e.code==='KeyR')scene.mission.reload();if(e.code==='KeyP'||e.code==='Escape')scene.setPause(!scene.paused);if(e.code==='Enter'&&scene.paused)scene.setPause(false);}
},true);
document.addEventListener('keyup',e=>{if(!scene?.started||!controlKeys.has(e.code))return;e.preventDefault();e.stopPropagation();held.delete(e.code);},true);
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&scene)scene.pointerHeld=false;});
window.addEventListener('pointercancel',e=>{if(e.pointerType==='mouse'&&scene)scene.pointerHeld=false;});
window.addEventListener('blur',()=>{if(scene?.started)scene.setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene?.started)scene.setPause(true);});
$('touch-fire').addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);touch.firePointers.add(e.pointerId);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('touch-fire').addEventListener(type,e=>touch.firePointers.delete((e as PointerEvent).pointerId)));
$('touch-aim').addEventListener('input',()=>{if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;scene.mission.angle=touchAngle(Number(($('touch-aim') as HTMLInputElement).value));scene.aim={x:GUN.x+Math.cos(scene.mission.angle)*380,y:GUN.y+Math.sin(scene.mission.angle)*380};});
$('touch-aim').addEventListener('pointerdown',()=>unlockAudio());
$('touch-cover').addEventListener('click',()=>{if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();touch.toggleCover();updateTouchCover();});
$('touch-reload').addEventListener('click',()=>scene?.mission.reload());
$('cover').addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);coverPointers.add(e.pointerId);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('cover').addEventListener(type,e=>{coverPointers.delete((e as PointerEvent).pointerId);}));
$('pause').addEventListener('click',()=>{scene?.setPause(!scene.paused);});
function updateToggles(){for(const [id,on] of [['sound',soundOn],['voice',voiceOn]] as const){$(id).textContent=id.toUpperCase()+' '+(on?'ON':'OFF');$(id).setAttribute('aria-pressed',String(on));}}
$('sound').addEventListener('click',()=>{soundOn=!soundOn;if(!soundOn){stopScream();flushVoice();}unlockAudio();try{localStorage.setItem('obth-sound',soundOn?'on':'off');}catch{}updateToggles();});
$('voice').addEventListener('click',()=>{voiceOn=!voiceOn;radioVoice.setEnabled(voiceOn);unlockAudio();if(voiceOn)speak('Radio check. Voice channel online.');try{localStorage.setItem('obth-voice',voiceOn?'on':'off');}catch{}updateToggles();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.cabinet')!.requestFullscreen();scene?.focus();}catch{$('fullscreen').textContent='UNAVAILABLE';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'EXIT FULLSCREEN':'FULLSCREEN';});
updateToggles();
matchMedia('(pointer:coarse), (max-width:650px)').addEventListener('change',()=>{document.body.classList.toggle('touch-layout',mobileLayout());touch.reset();updateTouchCover();if(scene?.started)scene.setPause(true);});
