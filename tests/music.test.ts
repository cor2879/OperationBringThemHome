import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicPlayer} from '../src/audio/music.ts';
function fixture(){
  const audio={loop:false,preload:'',volume:1,src:'',paused:true,plays:0,loads:0,pause(){this.paused=true;},load(){this.loads++;},removeAttribute(){this.src='';},play(){this.paused=false;this.plays++;return Promise.resolve();}};
  return {audio,music:new MusicPlayer(audio as unknown as HTMLAudioElement)};
}
test('music waits for a gesture, changes from title to rescue, and clears silent stages',()=>{
  const {audio,music}=fixture();music.setTrack('extraction');assert.equal(audio.plays,0);
  music.unlock();assert.equal(audio.plays,1);assert.equal(audio.loop,true);
  music.setTrack('rescue');assert.equal(audio.src,'rescue');assert.equal(audio.plays,2);
  music.setTrack('rescue');assert.equal(audio.plays,2);
  music.setTrack(undefined);assert.equal(audio.paused,true);assert.equal(audio.src,'');
});
test('music pauses without losing its track and mute survives track changes',()=>{
  const {audio,music}=fixture();music.setTrack('rescue');music.unlock();
  music.setPaused(true);music.unlock();assert.equal(audio.plays,1);
  music.setPaused(false);assert.equal(audio.plays,2);
  music.setEnabled(false);music.setTrack('extraction');assert.equal(audio.paused,true);
  music.setEnabled(true);assert.equal(audio.src,'extraction');assert.equal(audio.plays,3);
});
test('music ducks for dialogue and recovers smoothly afterwards',()=>{
  const {audio,music}=fixture();music.update(.05,true);assert.ok(audio.volume<.28&&audio.volume>.09);
  for(let i=0;i<100;i++)music.update(.05,true);assert.ok(Math.abs(audio.volume-.09)<.001);
  music.update(.05,false);assert.ok(audio.volume>.09&&audio.volume<.28);
  for(let i=0;i<100;i++)music.update(.05,false);assert.ok(Math.abs(audio.volume-.28)<.001);
});
