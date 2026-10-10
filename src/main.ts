import type * as PhaserType from 'phaser';
import { RescueMission, ROUTE, WALLS, SHELTERS, GUN, MISSION_DURATION, type MissionEvent, type Unit } from './model.ts';
import './style.css';
import retroScreamUrl from './audio/retro-scream.ts';
import { TouchControls, touchAngle } from './controls.ts';
import radioClips from './audio/radio-clips.ts';
import { RadioVoice } from './audio/radio.ts';
import { MusicPlayer } from './audio/music.ts';
import extractionMusicUrl from './audio/music/extraction.mp3';
import rescueMusicUrl from './audio/music/rescue.mp3';
import defenseMusicUrl from './audio/music/hold-the-line.mp3';
import breakoutMusicUrl from './audio/music/breakout.mp3';
import confrontationMusicUrl from './audio/music/confrontation.mp3';
import { playDogBark } from './audio/dog.ts';
import { drawBattlefield, drawCharacter, drawPlayerGun } from './art/render.ts';
import {DefenseMission,CONVOY_ETA,BOARDING_TIME} from './defense.ts';
import {drawDefenseField,drawStretcherTeam,drawConvoy,drawArmoredTransport} from './art/defense-render.ts';
import {BreakoutMission,BREAKOUT_DURATION,PURSUIT_ARMOR} from './breakout.ts';
import {drawRoad,drawRoadVehicle,drawConvoyTruck} from './art/breakout-render.ts';
import {KNIFE_RECHARGE,ConfrontationMission,DUEL_LANES} from './confrontation.ts';
import {drawConfrontation} from './art/confrontation-render.ts';
import {ExtractionMission,EXTRACTION_DURATION} from './extraction.ts';
import {drawExtraction} from './art/extraction-render.ts';
const extractionChapter=new URLSearchParams(location.search).get('chapter')==='extraction';
const confrontationChapter=new URLSearchParams(location.search).get('chapter')==='confrontation';
const breakoutChapter=new URLSearchParams(location.search).get('chapter')==='breakout';
const defenseChapter=new URLSearchParams(location.search).get('chapter')==='defense';
declare const Phaser: typeof PhaserType;

const $=(id:string)=>document.getElementById(id)!;
const held=new Set<string>();
let firing=false;
let flightX=0,flightY=0;
function resetFlight(){flightX=flightY=0;const nub=document.getElementById('flight-nub');if(nub)nub.style.transform='translate(-50%,-50%)';}
const touch=new TouchControls();
const mobileLayout=()=>matchMedia('(pointer:coarse), (max-width:650px)').matches||new URLSearchParams(location.search).get('controls')==='touch';
document.body.classList.toggle('touch-layout',mobileLayout());
function updateTouchCover(){ $('touch-cover').textContent=extractionChapter?'FIRE ROCKET':confrontationChapter?'HOLD DUCK':touch.cover?'GO!':'TAKE COVER';$('touch-cover').setAttribute('aria-pressed',String(touch.cover)); }
const coverPointers=new Set<number>();
let soundOn=true,voiceOn=true,musicOn=true;
try{soundOn=localStorage.getItem('obth-sound')!=='off';voiceOn=localStorage.getItem('obth-voice')!=='off';musicOn=localStorage.getItem('obth-music')!=='off';}catch{}
const musicElement=document.createElement('audio');musicElement.id='soundtrack';musicElement.hidden=true;document.body.append(musicElement);
const music=new MusicPlayer(musicElement);music.setEnabled(musicOn);music.setTrack(extractionMusicUrl);
const stageMusic=extractionChapter?extractionMusicUrl:confrontationChapter?confrontationMusicUrl:breakoutChapter?breakoutMusicUrl:defenseChapter?defenseMusicUrl:rescueMusicUrl;
let audio:AudioContext|undefined;
let screamBuffer:AudioBuffer|undefined;
let screamLoading:Promise<void>|undefined;
let activeScream:AudioBufferSourceNode|undefined;
const radioVoice=new RadioVoice(radioClips);radioVoice.setEnabled(voiceOn);
function stopVoice(){radioVoice.stop();}
function flushVoice(){radioVoice.setBlocked(false);}
function unlockAudio(){
  music.unlock();
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
overlay.innerHTML='<p class="eyebrow">OPERATION ORDER / SECTOR 07</p><h2>ONE CROSSING AT A TIME.</h2><p>Twelve prisoners. Bring eight home in six minutes.<br>Only one escapee leaves at a time. Protect every crossing.<br>Orange uniforms are friendly. Red helmets are hostile.<br>Hold C / COVER at the next shelter. Release to GO!<br>Green bars: reload opening. A bark warns of a dog!</p><div class="difficulty"><label for="difficulty">AI DIFFICULTY</label><select id="difficulty"><option value="rookie">ROOKIE</option><option value="regular" selected>REGULAR</option><option value="veteran">VETERAN</option></select></div><button id="begin">BEGIN OPERATION →</button><small>Mouse: aim + hold click · Keyboard: A/D + Space<br>Touch: aiming slider + hold FIRE</small>';
if(defenseChapter){
  document.body.classList.add('defense-chapter');
  document.querySelector('.mission-stamp')!.innerHTML='CHAPTER 02<br><b>HOLD THE LINE</b><br>PLAYABLE PROTOTYPE';
  overlay.querySelector('h2')!.textContent='HOLD UNTIL RELIEF ARRIVES.';
  overlay.querySelector('h2 + p')!.innerHTML='Hold the outpost for 2½ minutes, then cover boarding.<br>Keep your position intact. Lose fewer than three stretcher teams.<br>Orange uniforms are friendly. Red helmets are hostile.<br>COVER makes medics duck and move slowly; GO speeds them up.<br>Waves approach from left, center and right. Watch the warnings!';
  document.querySelector('.squad-controls span')!.innerHTML='Hold C / COVER: medics duck and move slowly. Release: GO!<br>Orange stretcher teams are friendly. Enemy aiming lines warn of shots.';
  document.querySelector('.intel')!.innerHTML='<p><b>HOLD THE LINE</b><br>The rescued prisoners are waiting inside the outpost. Keep the gun position intact until the convoy arrives, then defend the twelve-second boarding window.</p><p><b>CHOOSE YOUR TARGETS</b><br>Infantry advance into firing range, sappers rush the gate, and gun crews alternate bursts and reloads. Every wave gives a warning before entering from a new direction. Occasional armored transports take eight hits, drop off three infantry, and aim their machine gun at exposed medics or your position. Destroy them before they unload!</p><p><b>PROTECT THE CROSSING</b><br>Stretcher teams carry wounded people from the left shelter to the aid station. COVER shields them from enemy shots while slowing their movement. Your own bullets can still hit them. Losing three teams ends the mission.</p>';
}
if(breakoutChapter){
  document.body.classList.add('breakout-chapter');
  document.querySelector('.mission-stamp')!.innerHTML='CHAPTER 03<br><b>BREAKOUT</b><br>PLAYABLE PROTOTYPE';
  document.querySelector('.cabinet')!.setAttribute('aria-label','Convoy escape mission');
  overlay.querySelector('h2')!.textContent='KEEP THE CONVOY MOVING.';
  overlay.querySelector('h2 + p')!.innerHTML='Reach the bridge checkpoint in 2½ minutes.<br>Protect your truck and destroy the final armored pursuer.<br>Motorcycles arrive in packs; jeeps and armor fire in bursts.<br>Blue-and-cream trucks with orange flags are friendly.<br>Losing three friendly trucks ends the escape.';
  document.querySelector('.intel')!.innerHTML='<p><b>THE BREAKOUT</b><br>Man the rear gun of the rescue truck. Hold off the pursuit for two and a half minutes and clear the final armored vehicle before the bridge checkpoint.</p><p><b>THE PURSUIT</b><br>Motorcycles arrive in packs of two or three and take one hit each. Jeeps take three hits; armored pursuers take eighteen. Red aiming lines warn of incoming shots. Green reload bars give you an opening. Reload your own gun between attacks.</p><p><b>FRIENDLY TRAFFIC</b><br>Blue-and-cream bodies, orange roof panels, and orange flags mark friendly convoy trucks. Let them pass safely before firing through their lane. Friendly fire is enabled; enemy bullets can hit them too. Three trucks lost ends the mission.</p>';
}
if(confrontationChapter){
  document.body.classList.add('confrontation-chapter');
  document.querySelector('.mission-stamp')!.innerHTML='CHAPTER 04<br><b>THE CONFRONTATION</b><br>PLAYABLE PROTOTYPE';
  document.querySelector('.cabinet')!.setAttribute('aria-label','Knife throwing duel');
  overlay.querySelector('h2')!.textContent='ONE LAST GUARD. ONE WAY OUT.';
  overlay.querySelector('h2 + p')!.innerHTML='The convoy is clear. Face the commandant across the fortress gap.<br>Best two out of three rounds. Land five hits to win a round; each round lasts up to two minutes. Each fighter has three knives; one recharges every 2.5 seconds.<br>Move HIGH / MIDDLE / LOW to line up your throw.<br>Hold THROW + up/down to tilt the knife toward the next level.<br>A raised arm and red line warn of his next knife.<br>Duck briefly or change height. Release DUCK to recover stamina.';
  overlay.querySelector('small')!.textContent='W/S or ↑/↓: position · Space: throw · Hold C: duck';
  document.querySelector('.toolbar > span')!.innerHTML='<b>W/S or ↑/↓</b> move &nbsp; <b>SPACE</b> throw &nbsp; <b>C</b> duck &nbsp; <b>P</b> pause<br>Hold Space + up/down for angled throws. Release Space to move.';
  document.querySelector('.touch-aim label')!.textContent='POSITION · HIGH / LOW';
  $('touch-aim').setAttribute('aria-label','Duel position high or low');
  $('touch-fire').textContent='HOLD THROW';$('touch-cover').textContent='HOLD DUCK';$('touch-reload').hidden=true;
  document.querySelector('.intel')!.innerHTML='<p><b>THE CONFRONTATION</b><br>The commandant guards the route to extraction. Face him across three levels of the fortress. Win two out of three rounds to clear the way for the helicopter. Each round resets health, knives, and its two-minute timer.</p><p><b>READ THE WIND-UP</b><br>Knives fly straight or at a slight angle. Hold up/down while throwing to tilt toward another level. He aims up or down from neighboring levels too. His raised arm and angled red line mark an incoming throw; his aim locks during wind-up. Change levels or duck as the knife arrives. He can dodge too, but winding up leaves him exposed.</p><p><b>TIME YOUR RESPONSE</b><br>Each fighter has three knives. Spend them in a burst or save one for an opening; one knife recharges every 2.5 seconds. You can throw while moving between levels; knives launch from your current height. Release DUCK before throwing. Duck stamina lasts just over a second and recovers when released. The slider changes height. Hold THROW while moving the slider for angled knives; release it to move again. Hold DUCK independently. Keyboard: W/S, Space and C.</p>';
}
if(extractionChapter){
  document.body.classList.add('extraction-chapter');
  document.querySelector('.mission-stamp')!.innerHTML='CHAPTER 05<br><b>EXTRACTION</b><br>PLAYABLE PROTOTYPE';
  document.querySelector('.cabinet')!.setAttribute('aria-label','Helicopter extraction shooter');
  overlay.querySelector('h2')!.textContent='GET EVERYONE HOME.';
  overlay.querySelector('h2 + p')!.innerHTML='Fly the attack helicopter down the river to the extraction zone.<br>Move in four directions. Twin cannons fire straight ahead.<br>Destroy convoys, gunboats, enemy aircraft and fortified anti-aircraft sites. Red lines warn of incoming fire.<br>Three rockets blast groups and armor; one recharges every eight seconds.<br>Collect repair and rocket supplies. Destroy the command gunship, then fly clear of the combat zone.';
  overlay.querySelector('small')!.textContent='WASD / arrows: fly · Space: cannons · C or R: rocket · P: pause';
  document.querySelector('.toolbar > span')!.innerHTML='<b>WASD / arrows</b> fly &nbsp; <b>SPACE</b> cannons &nbsp; <b>C / R</b> rocket &nbsp; <b>P</b> pause<br>Or hold click and steer with the mouse. Touch: flight pad + FIRE / ROCKET.';
  document.querySelector('.touch-aim label')!.textContent='FLIGHT PAD · MOVE IN FOUR DIRECTIONS';
  $('touch-aim').hidden=true;$('touch-reload').hidden=true;
  document.querySelector('.touch-aim')!.insertAdjacentHTML('beforeend','<div id="flight-pad" role="group" aria-label="Helicopter flight pad"><span class="flight-axis"></span><span id="flight-nub"></span><span class="flight-hint">DRAG TO FLY</span></div>');
  $('touch-cover').textContent='FIRE ROCKET';
  document.querySelector('.intel')!.innerHTML='<p><b>THE LAST FLIGHT</b><br>Cover the survivors from the air. Follow the river for 100 seconds and destroy the command gunship to escape the combat zone. The helicopter has 100% armor.</p><p><b>WATCH THE WARNINGS</b><br>Ground vehicles and gunboats fire at your last position. Fighter groups and the command gunship lead your movement, and fighters can fire as they pass you. Fortified anti-aircraft batteries fire faster missile salvos, and their radar predicts your movement. Destroy the radar to weaken its linked battery. Red lines show their locked aim. Keep moving, dodge the salvos, and save rockets for heavy targets. The final gunship spreads its fire more widely when damaged.</p><p><b>STAY IN THE AIR</b><br>Green cross crates restore 50% armor. Gold rocket crates add two rockets, up to three. Rockets also recharge every eight seconds and explode across nearby targets. Cannons have unlimited ammunition. Touch: drag the flight pad while holding FIRE, and tap ROCKET.</p>';
}
let scene:RescueScene;
if(mobileLayout()){
  if(!defenseChapter&&!breakoutChapter&&!confrontationChapter&&!extractionChapter)overlay.querySelector('h2 + p')!.innerHTML='Bring eight of twelve home in six minutes.<br>One escapee at a time. Orange is friendly; red is hostile.<br>Tap TAKE COVER at a shelter; tap GO! to move.<br>Green bars: reload opening. A bark warns of a dog!';
  overlay.querySelector('small')!.textContent=extractionChapter?'Left thumb: flight pad · Right thumb: FIRE / ROCKET':confrontationChapter?'Slider: position · Hold THROW + slider: angle · Hold DUCK':breakoutChapter?'Left thumb: aim slider · Right thumb: hold FIRE / tap RELOAD':'Left thumb: aim slider · Right thumb: hold FIRE / tap COVER';
}
class RescueScene extends Phaser.Scene{
  mission:RescueMission=extractionChapter?new ExtractionMission():confrontationChapter?new ConfrontationMission():breakoutChapter?new BreakoutMission():defenseChapter?new DefenseMission():new RescueMission();started=false;paused=false;ready=false;
  truckHealth!:PhaserType.GameObjects.Text;ink!:PhaserType.GameObjects.Graphics;hud!:PhaserType.GameObjects.Text;machinegunStatus!:PhaserType.GameObjects.Text;escapeeStatus!:PhaserType.GameObjects.Text;
  rotorClock=0;duelTaunt=0;radio!:PhaserType.GameObjects.Text;radioTime=0;radioCooldown=0;sparks:Spark[]=[];
  aim={x:480,y:220};pointerHeld=false;tick=0;lastState='';
  constructor(){super('Rescue');scene=this;}
  preload(){
    const begin=$('begin') as HTMLButtonElement;begin.disabled=true;begin.textContent='LOADING FIELD…';
    this.load.image('battlefield',new URL('./art/battlefield-terrain.webp',import.meta.url).href);
  }
  create(){
    this.add.rectangle(480,300,960,600,0x293728);
    if(this.textures.exists('battlefield'))this.add.image(480,300,'battlefield').setDisplaySize(960,600);
    const field=this.add.graphics();this.drawField(field);
    this.ink=this.add.graphics();
    this.hud=this.add.text(20,18,'',{fontFamily:'monospace',fontSize:'17px',color:'#e7e8cf',lineSpacing:8}).setDepth(10);
    this.truckHealth=this.add.text(20,18,'',{fontFamily:'monospace',fontSize:'17px',color:'#e7e8cf'}).setDepth(11).setVisible(breakoutChapter||confrontationChapter);
    this.machinegunStatus=this.add.text(23,572,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffbd70'}).setDepth(10).setVisible(false);
    this.escapeeStatus=this.add.text(610,572,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffdb96'}).setDepth(10);
    this.radio=this.add.text(480,86,'',{fontFamily:'monospace',fontSize:'18px',color:'#ffe1a1',backgroundColor:'#101713',padding:{x:14,y:8},align:'center'}).setOrigin(.5).setDepth(10);
    this.input.on('pointerdown',(p:PhaserType.Input.Pointer)=>{
      if(!this.started||this.paused||this.mission.state!=='playing'||mobileLayout()||confrontationChapter)return;
      this.focus();unlockAudio();this.aimAt(p.x,p.y);
      if(!matchMedia('(pointer:coarse)').matches)this.pointerHeld=true;
    });
    this.input.on('pointermove',(p:PhaserType.Input.Pointer)=>{
      if(!this.started||this.paused||mobileLayout()||confrontationChapter)return;
      if(!matchMedia('(pointer:coarse)').matches||p.isDown)this.aimAt(p.x,p.y);
    });
    this.input.on('pointerup',()=>{this.pointerHeld=false;});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label',extractionChapter?'Extraction helicopter shooter':confrontationChapter?'The Confrontation knife duel':'Operation Bring Them Home rescue game');
    this.draw();
    this.ready=true;const begin=$('begin') as HTMLButtonElement;begin.disabled=false;begin.textContent='BEGIN OPERATION →';
    if(new URLSearchParams(location.search).get('newgame')==='1'&&!extractionChapter&&!confrontationChapter&&!breakoutChapter&&!defenseChapter){const url=new URL(location.href);url.searchParams.delete('newgame');history.replaceState(null,'',url);this.start();}
  }
  focus(){this.game.canvas.focus({preventScroll:true});}
  aimAt(x:number,y:number){if(this.mission instanceof ExtractionMission){this.mission.target={x:Phaser.Math.Clamp(x,130,830),y:Phaser.Math.Clamp(y,240,510)};return;}this.aim={x,y};this.mission.angle=Phaser.Math.Clamp(Math.atan2(y-GUN.y,x-GUN.x),-Math.PI+.08,-.08);}
  start(){
    if(!this.ready)return;
    const difficulty=($('difficulty') as HTMLSelectElement|null)?.value||this.mission.difficulty;
    this.mission=extractionChapter?new ExtractionMission(Math.random,difficulty as 'rookie'|'regular'|'veteran'):confrontationChapter?new ConfrontationMission(Math.random,difficulty as 'rookie'|'regular'|'veteran'):breakoutChapter?new BreakoutMission(Math.random,difficulty as 'rookie'|'regular'|'veteran'):defenseChapter?new DefenseMission(Math.random,difficulty as 'rookie'|'regular'|'veteran'):new RescueMission(Math.random,difficulty as 'rookie'|'regular'|'veteran');this.started=true;this.paused=false;this.sparks=[];this.pointerHeld=false;held.clear();coverPointers.clear();firing=false;
    touch.reset();resetFlight();updateTouchCover();($('touch-aim') as HTMLInputElement).value='50';
    music.setPaused(false);music.setTrack(stageMusic);stopVoice();stopScream();this.lastState='';overlay.hidden=true;$('pause').textContent='PAUSE';this.focus();unlockAudio();this.callout('CONTROL',extractionChapter?'Everyone is aboard. Get us out of here!':confrontationChapter?'The convoy is clear. Finish this and get to the helicopter!':breakoutChapter?'Convoy moving! Keep them off our tail!':defenseChapter?'Hold the outpost. The convoy is on its way.':'Prisoners are moving. Cover the route.',true);this.updateStatus();
  }
  callout(speaker:string,line:string,force=false,voiced=true){
    if(!force&&this.radioCooldown>0)return;
    this.radio.setText(speaker+' / '+line);this.radioTime=3.2;this.radioCooldown=5;if(voiced)speak(line);
  }
  setPause(paused:boolean){
    if(!this.started||this.mission.state!=='playing')return;
    this.paused=paused;music.setPaused(paused);held.clear();coverPointers.clear();touch.reset();resetFlight();updateTouchCover();this.mission.commandCover(false);if(this.mission instanceof ExtractionMission){this.mission.target=undefined;this.mission.moveX=this.mission.moveY=0;}firing=false;this.pointerHeld=false;
    if(paused){stopVoice();stopScream();overlay.hidden=false;overlay.innerHTML='<p class="eyebrow">OPERATION ON HOLD</p><h2>PAUSED</h2><p>Your mission is waiting.</p><button id="resume">RESUME OPERATION →</button><button id="restart">RESTART MISSION</button>';}
    else{overlay.hidden=true;this.focus();}
    $('pause').textContent=paused?'RESUME':'PAUSE';this.updateStatus();
  }
  updateStatus(){
    $('mission-status').textContent=!this.started?'AWAITING YOUR COMMAND':this.paused?'OPERATION PAUSED':this.mission.state==='won'?(extractionChapter?'EVERYONE HOME':confrontationChapter?'COMMANDANT DEFEATED':breakoutChapter?'CHECKPOINT REACHED':'EXTRACTION COMPLETE'):this.mission.state==='lost'?'OPERATION LOST':extractionChapter?(this.mission instanceof ExtractionMission&&this.mission.departing?'FLYING HOME':'FLYING TO EXTRACTION'):confrontationChapter?'FACING THE COMMANDANT':breakoutChapter?'DEFENDING THE CONVOY':defenseChapter?'HOLDING THE OUTPOST':'COVERING THE ESCAPE';
  }
  handleEvent(e:MissionEvent){
    if(e.kind==='duelround'||e.kind==='duelstart'){held.clear();coverPointers.clear();$('touch-cover').setAttribute('aria-pressed','false');touch.reset();firing=false;this.pointerHeld=false;($('touch-aim') as HTMLInputElement).value='50';updateTouchCover();if(e.kind==='duelround')tone(e.shooter==='player'?700:160,.2,'triangle',.04);else this.callout('COMMANDANT',"You can’t hurt meeee!",true);}

    if(e.kind==='airinstallation')tone(185,.2,'square',.025);
    if(e.kind==='airrocket')tone(155,.18,'sawtooth',.035);
    if(e.kind==='airblast')this.burst(e.x,e.y,0xffc278,35);
    if(e.kind==='helidamage'){this.burst(e.x,e.y,0xf5b966,10);tone(75,.12,'sawtooth',.035);}
    if(e.kind==='airsupply')tone(750,.18,'triangle',.04);
    if(e.kind==='airboss')this.callout('CONTROL','Enemy gunship! Use the rockets!',true);
    if(e.kind==='airclear')this.callout('CONTROL',"Congratulations, you've cleared enemy territory. Bring them home!",true);
    if(e.kind==='knifethrow'){tone(e.shooter==='player'?700:420,.08,'triangle',.045);}
    if(e.kind==='duelwarning'){tone(190,.05,'square',.02);}
    if(e.kind==='duelhit'){this.burst(e.x,e.y,0xffbd76,12);tone(90,.14,'sawtooth',.04);const m=this.mission;if(m instanceof ConfrontationMission&&!m.death){if(e.shooter==='player'&&this.radioCooldown<=0)this.callout('COMMANDANT',this.duelTaunt++%2===0?'You will never leave this fortress!':"You can’t hurt meeee!",false);else if(e.shooter==='enemy')this.callout('CONTROL','Stay sharp. Watch his throwing arm.',false);}}
    if(e.kind==='dueldeath'){stopVoice();this.radioTime=0;casualtyScream();}
    if(e.kind==='dueldodge'){tone(500,.07,'triangle',.02);}

    if(e.kind==='bikewarning')this.callout('DRIVER',"Motorcycles! They're gaining on us!");
    if(e.kind==='jeepwarning')this.callout('CONTROL','Armed jeep closing in!');
    if(e.kind==='friendlytraffic')this.callout('DRIVER','Friendly truck! Watch your fire!',true);
    if(e.kind==='pursuitwarning')this.callout('CONTROL','Armored pursuit! Take it out!',true);
    if(e.kind==='bridgewarning')this.callout('DRIVER','Bridge ahead! Almost home!',true);
    if(e.kind==='finalpursuit')this.callout('CONTROL','One last armored pursuer! Clear it before the bridge!',true);
    if(e.kind==='pursuitclear')this.callout('DRIVER','Pursuit cleared! Head for the checkpoint!',true);
    if(e.kind==='trafficclear')tone(620,.1,'triangle');
    if(e.kind==='trafficloss'){this.burst(e.x,e.y,0xffa451,25);this.callout('CONTROL',e.shooter==='player'?"Hey! Don't shoot me!":'Friendly truck hit! Protect the convoy!',true);}
    if(e.kind==='vehicledestroyed'){this.burst(e.x,e.y,0xffa451,20);tone(65,.22,'sawtooth',.045);}
    if(e.kind==='armorwarning')this.callout('CONTROL','Armored transport inbound! Stop the reinforcements!',true);
    if(e.kind==='armordestroyed'){this.burst(e.x,e.y,0xffa451,35);tone(55,.4,'sawtooth',.07);this.callout('CONTROL','Transport destroyed!',true);}
    if(e.kind==='defensewarning')this.callout('CONTROL',['Hostiles approaching from the left!','Hostiles approaching from the center!','Hostiles approaching from the right!'][e.x],true);
    if(e.kind==='medic')this.callout('MEDIC','Wounded coming through! Watch your fire!',true);
    if(e.kind==='convoy')this.callout('CONTROL','Convoy arriving! Cover the boarding!',true);
    if(e.kind==='defensereload')this.callout('CONTROL','Enemy gun reloading. Clear the position.');
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
    if(e.kind==='dogwarning'){if(soundOn&&audio)playDogBark(audio);this.callout('CONTROL','Dog loose! Get to cover!',true);}
    if(e.kind==='reload'){tone(360,.07);}
  }
  update(_time:number,delta:number){
    const dt=Math.min(delta/1000,.05);this.tick+=dt;music.update(dt,radioVoice.speaking||!!activeScream);
    if(!this.paused){
      this.radioCooldown-=dt;this.radioTime-=dt;if(this.radioTime<=0)this.radio.setText('');
      if(this.started&&this.mission.state==='playing'){
        if(this.mission instanceof ExtractionMission){
          const m=this.mission;this.rotorClock-=dt;if(this.rotorClock<=0){tone(46,.1,'triangle',.012);this.rotorClock=.12;}
          m.moveX=(held.has('KeyD')||held.has('ArrowRight')?1:0)-(held.has('KeyA')||held.has('ArrowLeft')?1:0)+flightX;
          m.moveY=(held.has('KeyS')||held.has('ArrowDown')?1:0)-(held.has('KeyW')||held.has('ArrowUp')?1:0)+flightY;
          if(held.has('Space')||firing||touch.firing||this.pointerHeld)m.fire();
        }else if(this.mission instanceof ConfrontationMission){
          const m=this.mission;
          m.commandCover(held.has('KeyC')||coverPointers.size>0||touch.cover);
          const up=held.has('KeyW')||held.has('ArrowUp')||held.has('KeyA'),down=held.has('KeyS')||held.has('ArrowDown')||held.has('KeyD');
          const throwing=held.has('Space')||firing||touch.firing||m.player.windup>0;
          m.throwDirection=throwing&&up!==down?(down?1:-1):touch.firing?Math.sign(Number(($('touch-aim') as HTMLInputElement).value)/50-m.player.lane):0;
          if(!throwing&&up!==down&&Math.abs(m.player.y-DUEL_LANES[m.player.lane])<8)m.setLane(m.player.lane+(up?-1:1));
          if(held.has('Space')||firing||touch.firing)m.fire();
        }else{
        const cover=held.has('KeyC')||coverPointers.size>0||touch.cover;
        if(this.mission.commandCover(cover))this.callout('SQUAD',cover?(defenseChapter?'Medics, heads down!':'Take cover! Stop at the next shelter!'):'Moving! Cover us!',true);
        $('cover').setAttribute('aria-pressed',String(cover));
        $('cover').textContent=cover?(defenseChapter?'MEDICS DUCKING · RELEASE TO GO':'IN COVER · RELEASE TO GO'):'HOLD: TAKE COVER';
        const direction=(held.has('KeyD')||held.has('ArrowRight')?1:0)-(held.has('KeyA')||held.has('ArrowLeft')?1:0);
        if(direction){this.mission.angle=Phaser.Math.Clamp(this.mission.angle+direction*1.6*dt,-Math.PI+.08,-.08);this.aim={x:GUN.x+Math.cos(this.mission.angle)*380,y:GUN.y+Math.sin(this.mission.angle)*380};}
        if(held.has('Space')||firing||touch.firing||this.pointerHeld)this.mission.fire();
        }
        this.mission.update(dt);this.mission.drainEvents().forEach(e=>this.handleEvent(e));
        if(this.mission.state!=='playing'&&this.lastState!==this.mission.state){this.lastState=this.mission.state;this.finish();}
      }
      for(const s of this.sparks){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}this.sparks=this.sparks.filter(s=>s.life>0);
    }
    this.draw();
  }
  finish(){
    held.clear();touch.reset();resetFlight();updateTouchCover();firing=false;this.pointerHeld=false;this.updateStatus();
    const won=this.mission.state==='won',m=this.mission;
    if(m instanceof ExtractionMission){
      this.callout('CONTROL',won?'Everyone is home. Mission accomplished!':'Pull back. The operation is over.',true);
      overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT / CHAPTER 05</p><h2>${won?'THEY ARE HOME.':'THE HELICOPTER WAS LOST.'}</h2><p>${won?'The survivors made it. The five-chapter operation is complete.':m.health<=0?'The helicopter took too much damage.':'The command gunship blocked the escape.'}</p><div class="report"><span><b>${m.score}</b>SCORE</span><span><b>${m.kills}</b>TARGETS CLEARED</span><span><b>${m.health}%</b>ARMOR LEFT</span></div><div class="report-actions"><button id="new-game">New Game</button><button id="restart">FLY AGAIN →</button></div><small>New Game starts a fresh operation from Chapter 1.</small>`;return;
    }
    if(m instanceof ConfrontationMission){
      this.callout('CONTROL',won?'The route is clear. Get to the helicopter!':'Pull back. The operation is over.',true);
      overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT</p><h2>${won?'THE COMMANDANT IS DOWN.':'THE CONFRONTATION WAS LOST.'}</h2><p>${won?'The survivors are waiting. The helicopter is your last way home.':m.player.health<=0?'You were caught by the commandant’s knives.':'Time ran out. The route is still blocked.'}</p><div class="report"><span><b>${m.playerRounds}–${m.enemyRounds}</b>ROUND SCORE</span><span><b>${m.dodges}</b>KNIVES DODGED</span><span><b>${m.player.health}</b>HEALTH LEFT</span></div><button id="restart">DUEL AGAIN →</button><small>${won?'Chapter 05 — Extraction is ready above.':'Watch his raised arm. Release DUCK to recover stamina.'}</small>`;return;
    }
    this.callout('CONTROL',won?(breakoutChapter?'Checkpoint reached. The convoy is safe.':'Extraction confirmed. You brought them home.'):'Pull back. The operation is over.',true);
    if(breakoutChapter){
      overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT</p><h2>${won?'THE CONVOY BROKE THROUGH.':'THE ESCAPE WAS STOPPED.'}</h2><p>${won?'The survivors reached the bridge checkpoint.':m.health<=0?'Your rescue truck was disabled.':m.lost>=3?'Three friendly trucks were lost.':'The final armored pursuer reached the bridge.'}</p><div class="report"><span><b>${m.rescued}</b>TRUCKS SAFE</span><span><b>${m.lost}</b>LOST</span><span><b>${m.kills}</b>PURSUERS</span></div><button id="restart">TRY ANOTHER OPERATION →</button><small>${won?'Chapter 04 — The Confrontation is ready above.':'Let friendly trucks clear your aim. Use enemy reload windows.'}</small>`;return;
    }
    if(defenseChapter){
      overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT</p><h2>${won?'THE CONVOY IS AWAY.':'THE LINE WAS BROKEN.'}</h2><p>${won?'The survivors are heading home. You held the outpost.':m.health<=0?'The gun position was overrun.':'Three stretcher teams were lost.'}</p><div class="report"><span><b>${m.rescued}</b>TEAMS SAFE</span><span><b>${m.lost}</b>TEAMS LOST</span><span><b>${m.kills}</b>HOSTILES</span></div><button id="restart">TRY ANOTHER OPERATION →</button><small>Prioritize sappers. Reload while enemy crews reload.</small>`;return;
    }
    overlay.hidden=false;overlay.innerHTML=`<p class="eyebrow">AFTER ACTION REPORT</p><h2>${won?'THEY ARE COMING HOME.':'OPERATION LOST.'}</h2><p>${won?'Your covering fire made the difference.':m.health<=0?'Your gun position was overrun.':m.lost>4?'Too many prisoners were lost.':'The extraction window closed.'}</p><div class="report"><span><b>${m.rescued}</b>RESCUED</span><span><b>${m.lost}</b>LOST</span><span><b>${m.kills}</b>HOSTILES</span></div><button id="restart">TRY ANOTHER OPERATION →</button><small>${won?'Try Chapter 02: Hold the Line.':'Aim ahead of moving targets. Reload between waves.'}</small>`;
  }
  burst(x:number,y:number,color:number,n:number){for(let i=0;i<n;i++)this.sparks.push({x,y,color,life:.2+Math.random()*.2,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100});}
  drawField(g:PhaserType.GameObjects.Graphics){
    if(breakoutChapter||confrontationChapter||extractionChapter)return;
    if(defenseChapter){
      drawDefenseField(g);
      const label=(x:number,y:number,text:string)=>this.add.text(x,y,text,{fontFamily:'monospace',fontSize:'11px',color:'#e0d6a5',backgroundColor:'#17231c',padding:{x:4,y:3}});
      label(138,322,'CASUALTY SHELTER');label(740,322,'AID STATION');label(420,458,'OUTPOST GATE');label(840,510,'CONVOY →');return;
    }
    drawBattlefield(g);
    const label=(x:number,y:number,text:string,color='#e0d6a5')=>this.add.text(x,y,text,{fontFamily:'monospace',fontSize:'10px',color,backgroundColor:'#17231c',padding:{x:4,y:2}});
    label(28,74,'HOLDING COMPOUND');label(834,78,'HOSTILE SECTOR','#e0aa8a');
    label(249,170,'COVER A');label(549,266,'COVER B');
    SHELTERS.forEach((s,i)=>label(s.x-33,s.y+27,'SHELTER '+(i?'B':'A')));
    label(825,405,'EXTRACTION →','#d2e3a8');
  }
  drawUnit(g:PhaserType.GameObjects.Graphics,u:Unit){
    const x=Math.round(u.x),y=Math.round(u.y);
    if(u.kind==='machinegun'){
      const color=u.phase==='reload'?0xa9d989:u.phase==='burst'?0xff694c:0xffbd70;
      g.lineStyle(2,color,.8);g.strokeCircle(x,y,25);
      if(u.phase!=='advance'){
        g.fillStyle(0x101b16,.9);g.fillRect(x-31,y-38,62,8);
        const duration=defenseChapter?(u.phase==='reload'?8:2):u.phase==='reload'?(this.mission.difficulty==='rookie'?9.5:this.mission.difficulty==='veteran'?7.5:8.5):u.phase==='burst'?2.4:1.5;
        g.fillStyle(color);g.fillRect(x-30,y-37,60*Math.max(0,(u.phaseTimer??0)/duration),6);
      }
    }
    if(u.aimPoint){g.lineStyle(1,0xff7654,.65);g.lineBetween(x,y,u.aimPoint.x,u.aimPoint.y);}
    if(u.kind==='transport')drawArmoredTransport(g,u);else if(defenseChapter&&u.kind==='prisoner')drawStretcherTeam(g,u);else drawCharacter(g,u);
    if(u.hp===1&&u.kind!=='prisoner'&&u.kind!=='dog'){g.fillStyle(0xdfb270);g.fillRect(x-7,y-29,7,2);}
  }
  draw(){
    const m=this.mission,g=this.ink;g.clear();this.radio.setVisible(this.radioTime>0);
    if(m instanceof ExtractionMission){
      drawExtraction(g,m);
      this.hud.setText(`HELICOPTER ${m.health}%       ROCKETS ${m.rockets}/3`).setColor(m.damageFlash>0?'#ff8870':'#e7e8cf');
      this.truckHealth.setVisible(false);
      this.machinegunStatus.setVisible(true).setText(m.departing?'CLEAR OF THE FORTRESS · BRINGING THEM HOME':m.bossCleared?'GUNSHIP DOWN · COMPLETE THE FLIGHT':m.bossStarted?'COMMAND GUNSHIP · CLEAR THE ESCAPE ROUTE':m.foes.some(e=>e.kind==='radar')?'RADAR ACTIVE · CLEAR THE GROUND SITES':`TWIN CANNONS · SCORE ${m.score}`);
      this.escapeeStatus.setText(`HOME ${Math.round(Math.min(1,m.time/EXTRACTION_DURATION)*100)}% · ARMOR ${m.health}%`);
      for(const p of this.sparks){g.fillStyle(p.color,Math.min(1,p.life*5));g.fillRect(p.x,p.y,4,4);}return;
    }
    if(m instanceof ConfrontationMission){
      drawConfrontation(g,m);
      this.hud.setText(`YOU ${m.player.health}/5                   DUCK STAMINA`);
      this.truckHealth.setPosition(666,18).setFontSize(14).setText(`COMMANDANT ${m.opponent.health}/5 · KNIVES ${m.opponent.knifePool}`).setColor(m.opponent.flash>0?'#ff8870':'#e7e8cf');
      this.hud.setColor(m.player.flash>0?'#ff8870':'#e7e8cf');
      this.machinegunStatus.setVisible(true).setText(m.intermission>0?`ROUND ${m.round} ${m.roundWinner==='player'?'WON':'LOST'} · ${m.playerRounds===2||m.enemyRounds===2?'MATCH COMPLETE':`NEXT ROUND IN ${Math.ceil(m.intermission)}s`}`:`KNIVES ${m.player.knifePool}/3 · `+(m.player.knifePool===0?'RECHARGE '+(KNIFE_RECHARGE-m.player.knifeCharge).toFixed(1)+'s':m.player.duck>0?'DUCKING · RELEASE TO RECOVER':m.player.windup>0?'THROWING':m.player.recovery>0?'KNIFE READY IN '+m.player.recovery.toFixed(1)+'s':'SPACE / THROW · READY'));
      const duelSeconds=Math.ceil(m.remaining);
      this.escapeeStatus.setPosition(610,562).setFontSize(12).setText(`ROUND ${m.round}/3 · YOU ${m.playerRounds} : AI ${m.enemyRounds}\nTIME ${Math.floor(duelSeconds/60)}:${String(duelSeconds%60).padStart(2,'0')} · ${m.opponent.windup>0?'KNIFE INCOMING!':'WATCH HIS ARM'}`);
      for(const s of this.sparks){g.fillStyle(s.color,Math.min(1,s.life*5));g.fillRect(s.x,s.y,3,3);}return;
    }
    if(m instanceof BreakoutMission){this.drawBreakout(m,g);return;}
    if(m instanceof DefenseMission){this.drawDefense(m,g);return;}
    SHELTERS.forEach((s,i)=>{
      const occupied=m.units.some(u=>u.shelter===i);
      g.lineStyle(1,m.coverOrdered?0xe5aa63:0x8fa67a,.8);g.strokeRect(s.x-27,s.y-12,54,31);
      g.fillStyle(occupied?0xe9a153:0x52614a);g.fillRect(s.x-6,s.y+21,12,3);
    });
    [...m.units].sort((a,b)=>a.y-b.y).forEach(u=>this.drawUnit(g,u));
    const escapee=m.units.find(u=>u.kind==='prisoner');
    g.fillStyle(0x101b16,.9);g.fillRect(601,565,345,25);
    const dog=m.units.find(u=>u.kind==='dog');
    const pursuit=m.dogInbound?' · DOG INBOUND':dog?(escapee?.shelter===undefined?' · DOG CHASING':' · DOG AT SHELTER'):'';
    this.escapeeStatus.setText(escapee?`ESCAPEE ${String(m.released).padStart(2,'0')}/12${pursuit||' · '+(escapee.shelter===undefined?'MOVING':'COVER '+(escapee.shelter===0?'A':'B'))}`:m.released<12?'NEXT ESCAPEE · STAND BY':'ALL CROSSINGS COMPLETE');
    const machinegun=m.units.find(u=>u.kind==='machinegun');
    if(machinegun){const phase=machinegun.phase;
      // Persistent instruction stays visible even when another radio line takes priority.
      g.fillStyle(0x101b16,.9);g.fillRect(15,565,345,25);
      const label=phase==='reload'?'MG RELOADING · GO!':phase==='advance'?'MACHINE GUN INBOUND · LEFT':phase==='setup'?'MG SETTING UP · TAKE COVER':'MG FIRING · STAY IN COVER';
      this.machinegunStatus.setText(label).setVisible(true).setColor(phase==='reload'?'#a9d989':'#ffbd70');
    }else this.machinegunStatus.setVisible(false);
    m.bullets.forEach(b=>{g.lineStyle(b.side==='player'?3:2,b.side==='player'?0xffe3a1:0xe47051);g.lineBetween(b.x,b.y,b.x-b.vx*.012,b.y-b.vy*.012);});
    drawPlayerGun(g,m.angle);
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
  drawDefense(m:DefenseMission,g:PhaserType.GameObjects.Graphics){
    if(m.convoyArrived)drawConvoy(g,(m.time-CONVOY_ETA)/3);
    if(m.warning){const x=[90,480,870][m.warning.sector];g.lineStyle(3,0xffa35b,.7);g.strokeCircle(x,140,30+Math.sin(this.tick*8)*4);}
    [...m.units].sort((a,b)=>a.y-b.y).forEach(u=>this.drawUnit(g,u));
    m.bullets.forEach(b=>{g.lineStyle(b.side==='player'?3:2,b.side==='player'?0xffe3a1:0xe47051);g.lineBetween(b.x,b.y,b.x-b.vx*.012,b.y-b.vy*.012);});
    drawPlayerGun(g,m.angle);
    if(this.started&&m.state==='playing'){g.lineStyle(1,0xf2d69b,.8);g.strokeCircle(this.aim.x,Math.min(this.aim.y,515),14);}
    for(const s of this.sparks){g.fillStyle(s.color,Math.min(1,s.life*5));g.fillRect(s.x,s.y,3,3);}
    const remaining=Math.ceil(m.convoyArrived?m.boardingRemaining:m.convoyRemaining);
    this.hud.setText(`OUTPOST ${m.health}%     TEAMS SAFE ${m.rescued}     LOST ${m.lost} / 03
${m.reloadTime>0?'RELOADING '+m.reloadTime.toFixed(1)+'s':'AMMO '+m.ammo+' / 24'}     HOSTILES ${m.kills}     ${m.difficulty.toUpperCase()}`);
    this.escapeeStatus.setText(m.convoyArrived?`BOARDING · ${remaining}s`:`CONVOY ETA · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`);
    const crew=m.units.find(u=>u.kind==='machinegun'),armor=m.units.find(u=>u.kind==='transport');
    this.machinegunStatus.setVisible(true).setText(m.armorWarning>0?'ARMORED TRANSPORT INBOUND':armor?`ARMOR ${armor.hp}/8 · ${armor.phase==='unload'?'UNLOADING':armor.phase==='reload'?'RELOADING':armor.phase==='retreat'?'WITHDRAWING':armor.phase==='advance'?'APPROACHING':'GUN ACTIVE'}`:m.warning?['LEFT FLANK INBOUND','CENTER INBOUND','RIGHT FLANK INBOUND'][m.warning.sector]:crew?crew.phase==='reload'?'ENEMY GUN RELOADING':'ENEMY GUN · CLEAR THE CREW':m.coverOrdered?'MEDICS DUCKING · SLOW CROSSING':'WATCH FOR FRIENDLY CROSSINGS').setColor(crew?.phase==='reload'?'#a9d989':'#ffbd70');
    g.fillStyle(0x394b35);g.fillRect(640,45,300,5);g.fillStyle(0xd7b374);g.fillRect(640,45,300*Math.min(1,m.time/(CONVOY_ETA+BOARDING_TIME)),5);
    if(m.reloadTime>0){g.lineStyle(4,0xe5aa63);g.beginPath();g.arc(480,550,26,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-m.reloadTime/1.65));g.strokePath();}
  }

  drawBreakout(m:BreakoutMission,g:PhaserType.GameObjects.Graphics){
    drawRoad(g,m.time);
    [...m.units].sort((a,b)=>a.y-b.y).forEach(u=>{
      if(u.aimPoint){g.lineStyle(1,0xff7757,.65);g.lineBetween(u.x,u.y,u.aimPoint.x,u.aimPoint.y);}
      drawRoadVehicle(g,u);
      if(u.kind!=='friendlytruck'){
        const maximum=u.kind==='pursuit'?PURSUIT_ARMOR:u.kind==='jeep'?3:1;
        g.fillStyle(0x17251d);g.fillRect(u.x-25,u.y-55,50,5);g.fillStyle(0xe4b575);g.fillRect(u.x-25,u.y-55,50*u.hp/maximum,5);
        if(u.phase!=='advance'){const duration=u.phase==='reload'?(u.kind==='pursuit'?6:u.kind==='jeep'?4.5:3.8)/(m.difficulty==='rookie'?.8:m.difficulty==='veteran'?1.2:1):u.phase==='setup'?(u.kind==='pursuit'?1.4:.9):u.kind==='pursuit'?1.8:u.kind==='jeep'?.85:.16;
          g.fillStyle(u.phase==='reload'?0xadd58b:u.phase==='burst'?0xee7254:0xe4b575);g.fillRect(u.x-25,u.y-48,50*Math.max(0,(u.phaseTimer??0)/duration),3);
        }
      }
    });
    m.bullets.forEach(b=>{g.lineStyle(b.side==='player'?3:2,b.side==='player'?0xffe3a1:0xe47051);g.lineBetween(b.x,b.y,b.x-b.vx*.014,b.y-b.vy*.014);});
    drawConvoyTruck(g,m.angle);
    if(m.damageFlash>0){g.lineStyle(4,0xff7254,m.damageFlash/.45);g.strokeRect(GUN.x-35,GUN.y-45,70,91);}
    if(this.started&&m.state==='playing'){g.lineStyle(1,0xf2d69b,.8);g.strokeCircle(this.aim.x,Math.min(this.aim.y,515),14);}
    for(const s of this.sparks){g.fillStyle(s.color,Math.min(1,s.life*5));g.fillRect(s.x,s.y,3,3);}
    const remaining=Math.ceil(m.remaining),armor=m.units.find(u=>u.kind==='pursuit');
    this.truckHealth.setText(`TRUCK ${m.health}%`).setColor(m.damageFlash>0?'#ff5e50':m.health<=24?'#ff947c':'#e7e8cf').setScale(1+.12*Math.sin(Math.PI*m.damageFlash/.45));
    this.hud.setText(`              FRIENDLIES SAFE ${m.rescued}     LOST ${m.lost} / 03
${m.reloadTime>0?'RELOADING '+m.reloadTime.toFixed(1)+'s':'AMMO '+m.ammo+' / 24'}     PURSUERS ${m.kills}     ${m.difficulty.toUpperCase()}`);
    this.escapeeStatus.setText(`CHECKPOINT · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`);
    this.machinegunStatus.setVisible(true).setText(m.finalCleared?'FINAL PURSUIT CLEAR':m.finalStarted?'FINAL PURSUER · CLEAR THE ARMOR':m.armorWarning>0?'ARMORED PURSUIT INBOUND':armor?`ARMOR ${armor.hp}/${PURSUIT_ARMOR} · ${armor.phase==='reload'?'RELOADING':'CLOSING IN'}`:'BLUE + CREAM · FRIENDLY TRAFFIC');
    g.fillStyle(0x3b4d37);g.fillRect(640,45,300,5);g.fillStyle(0xe0b575);g.fillRect(640,45,300*Math.min(1,m.time/BREAKOUT_DURATION),5);
    if(m.reloadTime>0){g.lineStyle(4,0xe5aa63);g.beginPath();g.arc(GUN.x,GUN.y,26,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-m.reloadTime/1.65));g.strokePath();}
  }

}

if(typeof Phaser==='undefined'){
  overlay.innerHTML='<h2>ENGINE COULD NOT LOAD</h2><p>Check your connection and reload the page.</p>';
}else{
  new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:600,backgroundColor:'#293728',pixelArt:true,antialias:false,scene:RescueScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:3},audio:{noAudio:true}});
}
overlay.addEventListener('click',e=>{
  const id=(e.target as HTMLElement).id;
  if(id==='new-game'){stopVoice();stopScream();location.assign('./?newgame=1');return;}
  if(id==='begin'||id==='restart')scene.start();if(id==='resume')scene.setPause(false);
});
const controlKeys=new Set(['KeyW','KeyS','ArrowUp','ArrowDown','KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyC','KeyR','KeyX','KeyP','Escape','Enter']);
document.addEventListener('keydown',e=>{
  if(e.target===$('touch-aim')&&(!confrontationChapter||['ArrowLeft','ArrowRight','Home','End'].includes(e.code)))return;
  if(!scene?.started||scene.mission.state!=='playing'||!controlKeys.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;
  e.preventDefault();e.stopPropagation();unlockAudio();held.add(e.code);
  if(!e.repeat){if(scene.mission instanceof ConfrontationMission&&!scene.paused){if(!held.has('Space')&&!touch.firing&&scene.mission.player.windup<=0&&['KeyW','KeyA','ArrowUp'].includes(e.code))scene.mission.setLane(scene.mission.player.lane-1);if(!held.has('Space')&&!touch.firing&&scene.mission.player.windup<=0&&['KeyS','KeyD','ArrowDown'].includes(e.code))scene.mission.setLane(scene.mission.player.lane+1);}if(e.code==='Space'&&!scene.paused)scene.mission.fire();if((e.code==='KeyR'||e.code==='KeyX'||(e.code==='KeyC'&&extractionChapter))&&!scene.paused){if(scene.mission instanceof ExtractionMission)scene.mission.rocket();else if(e.code==='KeyR')scene.mission.reload();}if(e.code==='KeyP'||e.code==='Escape')scene.setPause(!scene.paused);if(e.code==='Enter'&&scene.paused)scene.setPause(false);}
},true);
document.addEventListener('keyup',e=>{if(!scene?.started||!controlKeys.has(e.code))return;e.preventDefault();e.stopPropagation();held.delete(e.code);},true);
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&scene)scene.pointerHeld=false;});
window.addEventListener('pointercancel',e=>{if(e.pointerType==='mouse'&&scene)scene.pointerHeld=false;});
window.addEventListener('blur',()=>{if(scene?.started)scene.setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene?.started)scene.setPause(true);});
$('touch-fire').addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);touch.firePointers.add(e.pointerId);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('touch-fire').addEventListener(type,e=>{touch.firePointers.delete((e as PointerEvent).pointerId);if(scene?.mission instanceof ConfrontationMission&&!touch.firing)($('touch-aim') as HTMLInputElement).value=String(scene.mission.player.lane*50);}));
$('touch-aim').addEventListener('input',()=>{if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;if(scene.mission instanceof ConfrontationMission){if(touch.firing||scene.mission.player.windup>0)scene.mission.throwDirection=Math.sign(Number(($('touch-aim') as HTMLInputElement).value)/50-scene.mission.player.lane);else scene.mission.setLane(Number(($('touch-aim') as HTMLInputElement).value)/50);return;}scene.mission.angle=touchAngle(Number(($('touch-aim') as HTMLInputElement).value));scene.aim={x:GUN.x+Math.cos(scene.mission.angle)*380,y:GUN.y+Math.sin(scene.mission.angle)*380};});
$('touch-aim').addEventListener('pointerdown',()=>unlockAudio());
$('touch-cover').addEventListener('click',()=>{if(extractionChapter){if(scene?.started&&!scene.paused&&scene.mission instanceof ExtractionMission){unlockAudio();scene.mission.rocket();}return;}if(confrontationChapter)return;if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();touch.toggleCover();updateTouchCover();});
if(confrontationChapter){
  $('touch-cover').addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);coverPointers.add(e.pointerId);$('touch-cover').setAttribute('aria-pressed','true');});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('touch-cover').addEventListener(type,e=>{coverPointers.delete((e as PointerEvent).pointerId);$('touch-cover').setAttribute('aria-pressed','false');}));
}
$('touch-reload').addEventListener('click',()=>scene?.mission.reload());
$('cover').addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing')return;unlockAudio();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);coverPointers.add(e.pointerId);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('cover').addEventListener(type,e=>{coverPointers.delete((e as PointerEvent).pointerId);}));
$('pause').addEventListener('click',()=>{scene?.setPause(!scene.paused);});
function updateToggles(){for(const [id,on] of [['sound',soundOn],['voice',voiceOn],['music',musicOn]] as const){$(id).textContent=id.toUpperCase()+' '+(on?'ON':'OFF');$(id).setAttribute('aria-pressed',String(on));}}
$('sound').addEventListener('click',()=>{soundOn=!soundOn;if(!soundOn){stopScream();flushVoice();}unlockAudio();try{localStorage.setItem('obth-sound',soundOn?'on':'off');}catch{}updateToggles();});
$('music').addEventListener('click',()=>{musicOn=!musicOn;music.setEnabled(musicOn);music.unlock();try{localStorage.setItem('obth-music',musicOn?'on':'off');}catch{}updateToggles();});
document.addEventListener('pointerdown',e=>{if(!scene?.started&&(e.target as HTMLElement).id!=='music')music.unlock();});
window.addEventListener('blur',()=>music.setPaused(true));
window.addEventListener('focus',()=>{if(!scene?.paused&&!document.hidden)music.setPaused(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)music.setPaused(true);else if(!scene?.paused)music.setPaused(false);});
$('voice').addEventListener('click',()=>{voiceOn=!voiceOn;radioVoice.setEnabled(voiceOn);unlockAudio();if(voiceOn)speak('Radio check. Voice channel online.');try{localStorage.setItem('obth-voice',voiceOn?'on':'off');}catch{}updateToggles();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.cabinet')!.requestFullscreen();scene?.focus();}catch{$('fullscreen').textContent='UNAVAILABLE';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'EXIT FULLSCREEN':'FULLSCREEN';});
updateToggles();
matchMedia('(pointer:coarse), (max-width:650px)').addEventListener('change',()=>{document.body.classList.toggle('touch-layout',mobileLayout());touch.reset();resetFlight();updateTouchCover();if(scene?.started)scene.setPause(true);});

if(extractionChapter){
  const pad=$('flight-pad');let pointer:number|undefined;
  const steer=(e:PointerEvent)=>{const r=pad.getBoundingClientRect();flightX=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/(r.width*.4)));flightY=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/(r.height*.4)));if(Math.hypot(flightX,flightY)<.12)flightX=flightY=0;$('flight-nub').style.transform=`translate(calc(-50% + ${flightX*35}px),calc(-50% + ${flightY*35}px))`;};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();if(!scene?.started||scene.paused||scene.mission.state!=='playing'||pointer!==undefined)return;unlockAudio();pointer=e.pointerId;pad.setPointerCapture(pointer);steer(e);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&!scene.paused)steer(e);});
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(kind,e=>{if((e as PointerEvent).pointerId===pointer){pointer=undefined;resetFlight();}});
}
